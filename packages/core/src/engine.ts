import { clampCol, clampPosition, clampRow, offsetToPosition, positionToOffset } from './buffer.js'
import { normalizeKey, tokenizeKeys } from './keys.js'
import { getMotion, getTextObject, type MotionResult, type TextObjectResult } from './motions.js'
import type { EngineState, Mode, PendingCommand, Snapshot, SyntaxChunk, Operator } from './types.js'

interface VisualSelection { row: number; col: number }
interface Clip { text: string; linewise: boolean }

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function blankPending(): PendingCommand {
  return { count: null, operator: null, register: null, awaiting: null }
}

export class VimEngine {
  private data: EngineState
  private visualAnchor: VisualSelection | null = null
  private commandLine = ''
  private commandPrefix = ''
  private clipKinds: Record<string, boolean> = {}
  private awaitingRegister = false
  private redoSnapshot: Snapshot | null = null

  constructor(init: { lines: string[]; cursor?: { row: number; col: number } }) {
    const lines = init.lines.length ? init.lines.map((line) => String(line).replace(/\r/g, '')) : ['']
    const cursor = clampPosition(lines, init.cursor ?? { row: 0, col: 0 })
    this.data = {
      buffer: lines,
      cursor,
      mode: 'NORMAL',
      pending: null,
      registers: { '': '' },
      marks: {},
      lastFind: null,
      lastSearch: null,
      undo: { stack: [], pointer: 0 },
      keystrokes: 0,
    }
  }

  get state(): EngineState {
    return clone(this.data)
  }

  get pendingSyntax(): SyntaxChunk[] {
    const pending = this.data.pending
    if (!pending) return []
    const chunks: SyntaxChunk[] = []
    if (pending.count !== null) chunks.push({ text: String(pending.count), kind: 'count' })
    if (pending.register) chunks.push({ text: `"${pending.register}`, kind: 'register' })
    if (pending.operator) chunks.push({ text: pending.operator, kind: 'operator' })
    if (pending.awaiting === 'char') chunks.push({ text: '…', kind: 'char' })
    else if (pending.awaiting) chunks.push({ text: '…', kind: 'motion' })
    return chunks
  }

  sendMany(keys: string[]): EngineState {
    for (const key of keys) this.send(key)
    return this.state
  }

  replay(sequence: string): EngineState {
    try {
      return this.sendMany(tokenizeKeys(sequence))
    } catch {
      return this.state
    }
  }

  send(rawKey: string): EngineState {
    try {
      const key = normalizeKey(rawKey)
      this.data.keystrokes++
      if (!key) return this.state
      if (this.data.mode === 'CMDLINE') this.handleCommandLine(key)
      else if (this.data.mode === 'INSERT') this.handleInsert(key)
      else if (this.data.mode === 'REPLACE') this.handleReplace(key)
      else if (this.data.mode === 'VISUAL' || this.data.mode === 'VLINE' || this.data.mode === 'VBLOCK') this.handleVisual(key)
      else this.handleNormal(key)
    } catch {
      this.data.pending = null
      this.data.message = '无效输入'
      this.ensureValid()
    }
    return this.state
  }

  private ensureValid(): void {
    if (!this.data.buffer.length) this.data.buffer = ['']
    this.data.cursor.row = clampRow(this.data.buffer, this.data.cursor.row)
    this.data.cursor.col = clampCol(this.data.buffer[this.data.cursor.row] ?? '', this.data.cursor.col, this.data.mode === 'INSERT' || this.data.mode === 'REPLACE')
    if (!this.data.registers['']) this.data.registers[''] = ''
  }

  private snapshot(): Snapshot {
    return {
      buffer: [...this.data.buffer],
      cursor: { ...this.data.cursor },
      mode: this.data.mode,
      registers: clone(this.data.registers),
      marks: clone(this.data.marks),
      keystrokes: this.data.keystrokes,
    }
  }

  private restore(snapshot: Snapshot): void {
    const keystrokes = this.data.keystrokes
    this.data.buffer = [...snapshot.buffer]
    this.data.cursor = { ...snapshot.cursor }
    this.data.mode = 'NORMAL'
    this.data.registers = clone(snapshot.registers)
    this.data.marks = clone(snapshot.marks)
    this.data.pending = null
    this.data.keystrokes = keystrokes
    this.ensureValid()
  }

  private beginEdit(): void {
    const stack = this.data.undo.stack.slice(0, this.data.undo.pointer)
    stack.push(this.snapshot())
    this.data.undo = { stack, pointer: stack.length }
    this.redoSnapshot = null
  }

  private finishEdit(): void {
    this.ensureValid()
    this.data.pending = null
    this.data.message = undefined
  }

  private handleInsert(key: string): void {
    if (key === 'Esc') {
      this.data.mode = 'NORMAL'
      this.data.cursor.col = Math.max(0, this.data.cursor.col - 1)
      this.finishEdit()
      return
    }
    if (key === 'Enter') {
      this.beginEdit()
      const line = this.data.buffer[this.data.cursor.row] ?? ''
      this.data.buffer.splice(this.data.cursor.row, 1, line.slice(0, this.data.cursor.col), line.slice(this.data.cursor.col))
      this.data.cursor.row++
      this.data.cursor.col = 0
      return
    }
    if (key === 'Backspace') {
      this.beginEdit()
      if (this.data.cursor.col > 0) {
        const line = this.data.buffer[this.data.cursor.row]
        this.data.buffer[this.data.cursor.row] = line.slice(0, this.data.cursor.col - 1) + line.slice(this.data.cursor.col)
        this.data.cursor.col--
      } else if (this.data.cursor.row > 0) {
        const previous = this.data.buffer[this.data.cursor.row - 1]
        const line = this.data.buffer.splice(this.data.cursor.row, 1)[0]
        this.data.cursor.row--
        this.data.cursor.col = previous.length
        this.data.buffer[this.data.cursor.row] = previous + line
      }
      return
    }
    const move = getMotion(this.data.buffer, this.data.cursor, key, 1)
    if (move && ['h', 'j', 'k', 'l', 'Left', 'Right', 'Up', 'Down'].includes(key)) {
      this.data.cursor = move.position
      return
    }
    if (key.length !== 1 || key.charCodeAt(0) < 32) return
    this.beginEdit()
    const line = this.data.buffer[this.data.cursor.row] ?? ''
    this.data.buffer[this.data.cursor.row] = line.slice(0, this.data.cursor.col) + key + line.slice(this.data.cursor.col)
    this.data.cursor.col++
  }

  private handleReplace(key: string): void {
    if (key === 'Esc') {
      this.data.mode = 'NORMAL'
      this.data.cursor.col = Math.max(0, this.data.cursor.col - 1)
      this.finishEdit()
      return
    }
    const move = getMotion(this.data.buffer, this.data.cursor, key, 1)
    if (move && ['h', 'j', 'k', 'l', 'Left', 'Right', 'Up', 'Down'].includes(key)) {
      this.data.cursor = move.position
      return
    }
    if (key.length !== 1 || key.charCodeAt(0) < 32) return
    this.beginEdit()
    const line = this.data.buffer[this.data.cursor.row] ?? ''
    if (this.data.cursor.col >= line.length) this.data.buffer[this.data.cursor.row] = line + key
    else this.data.buffer[this.data.cursor.row] = line.slice(0, this.data.cursor.col) + key + line.slice(this.data.cursor.col + 1)
    this.data.cursor.col = Math.min(this.data.cursor.col + 1, Math.max(0, this.data.buffer[this.data.cursor.row].length - 1))
  }

  private handleNormal(key: string): void {
    const pending = this.data.pending
    if (pending?.awaiting === 'char') {
      if (this.awaitingRegister) {
        this.awaitingRegister = false
        if (/^[A-Za-z]$/.test(key)) this.data.pending = { ...pending, register: key, awaiting: null }
        else {
          this.data.pending = null
          this.data.message = '无效寄存器'
        }
        return
      }
      if (pending.operator === 'd' || pending.operator === 'c' || pending.operator === 'y') {
        this.data.pending = null
        if (pending.operator === 'd' && key === 'd') this.deleteLines(pending.register, pending.count ?? 1)
        else if (pending.operator === 'c' && key === 'c') this.changeLines(pending.register, pending.count ?? 1)
        else if (pending.operator === 'y' && key === 'y') this.yankLines(pending.register, pending.count ?? 1)
        return
      }
      this.data.pending = null
      if (pending.operator === 'r') this.replaceChar(key)
      else if (pending.operator === 'f' || pending.operator === 'F' || pending.operator === 't' || pending.operator === 'T') this.findChar(pending.operator, key, pending.count ?? 1)
      else if (pending.operator === 'm') this.setMark(key)
      else if (pending.operator === "'") this.gotoMark(key, true)
      else if (pending.operator === '`') this.gotoMark(key, false)
      return
    }
    if (pending?.register && pending.operator === null && pending.awaiting === null) {
      if (key === 'd' || key === 'c' || key === 'y') {
        this.data.pending = { ...pending, operator: key }
        return
      }
      if (key === 'x') {
        this.data.pending = null
        this.simpleDelete('x')
        return
      }
      this.data.pending = { ...pending, awaiting: 'motion' }
      this.handleNormal(key)
      return
    }
    if (pending?.awaiting === 'textobj-i' || pending?.awaiting === 'textobj-a') {
      const kind = pending.awaiting === 'textobj-i' ? 'i' : 'a'
      this.data.pending = null
      const object = getTextObject(this.data.buffer, this.data.cursor, kind, key)
      if (!object || !pending.operator) {
        this.data.message = '无效文本对象'
        return
      }
      this.applyOperator(pending.operator, object, pending.register)
      return
    }
    if (pending?.awaiting === 'motion') {
      if (pending.operator === null && key === 'g') {
        this.data.pending = { ...pending, awaiting: null }
        this.applyMotion('gg', pending.count ?? 1)
        return
      }
      if (['f', 'F', 't', 'T'].includes(key)) {
        this.data.pending = { ...pending, operator: key as Operator, awaiting: 'char' }
        return
      }
      const motion = getMotion(this.data.buffer, this.data.cursor, key, pending.count ?? 1)
      if (motion && pending.operator) this.applyOperator(pending.operator, this.motionObject(motion), pending.register, key)
      else if (motion) {
        this.applyMotion(key, pending.count ?? 1)
        this.data.pending = null
      } else {
        this.data.pending = null
        this.data.message = '无效动作'
      }
      return
    }
    if (pending?.operator && pending.operator !== null && key === 'i') {
      this.data.pending = { ...pending, awaiting: 'textobj-i' }
      return
    }
    if (pending?.operator && pending.operator !== null && key === 'a') {
      this.data.pending = { ...pending, awaiting: 'textobj-a' }
      return
    }
    if (pending?.operator && pending.operator !== null) {
      if (pending.awaiting === null && /^[1-9]$/.test(key)) {
        this.data.pending = { ...pending, count: Number(key) }
        return
      }
      if (pending.awaiting === 'motion' && /^[1-9]$/.test(key)) {
        this.data.pending = { ...pending, count: (pending.count ?? 1) * 10 + Number(key) }
        return
      }
      if (pending.awaiting === null && key === pending.operator) {
        const op = pending.operator
        this.data.pending = null
        if (op === 'd') this.deleteLines(pending.register, pending.count ?? 1)
        else if (op === 'c') this.changeLines(pending.register, pending.count ?? 1)
        else this.yankLines(pending.register, pending.count ?? 1)
        return
      }
      if (pending.awaiting === null) this.data.pending = { ...pending, awaiting: 'motion' }
      this.handleNormal(key)
      return
    }
    if (pending && pending.count !== null) {
      if (/^[1-9]$/.test(key)) {
        this.data.pending = { ...pending, count: pending.count * 10 + Number(key) }
        return
      }
      if (key === 'd' || key === 'c' || key === 'y') {
        this.data.pending = { ...pending, operator: key, awaiting: null }
        return
      }
      this.data.pending = { ...pending, awaiting: 'motion' }
      this.handleNormal(key)
      return
    }
    if (/^[1-9]$/.test(key)) {
      this.data.pending = { ...blankPending(), count: Number(key) }
      return
    }
    if (key === '0') {
      this.applyMotion('0', 1)
      return
    }
    if (key === '"') {
      this.awaitingRegister = true
      this.data.pending = { ...blankPending(), awaiting: 'char' }
      return
    }
    if (key === 'd' || key === 'c' || key === 'y') {
      this.data.pending = { ...blankPending(), operator: key, awaiting: null }
      return
    }
    if (['f', 'F', 't', 'T', 'r', 'm', "'", '`'].includes(key)) {
      this.data.pending = { ...blankPending(), operator: key as Operator, awaiting: 'char' }
      return
    }
    if (key === 'g') {
      this.data.pending = { ...blankPending(), awaiting: 'motion' }
      return
    }
    if (key === ':') {
      this.data.mode = 'CMDLINE'
      this.commandLine = ''
      this.commandPrefix = ':'
      return
    }
    if (key === '/') {
      this.data.mode = 'CMDLINE'
      this.commandLine = ''
      this.commandPrefix = '/'
      return
    }
    if (key === '*') {
      this.searchCurrentWord()
      return
    }
    if (key === 'n' || key === 'N') {
      this.repeatSearch(key === 'n')
      return
    }
    if (key === ';' || key === ',') {
      this.repeatFind(key === ';')
      return
    }
    if (key === 'i' || key === 'a' || key === 'I' || key === 'A') {
      this.data.mode = 'INSERT'
      if (key === 'a') this.data.cursor.col = Math.min(this.data.cursor.col + 1, this.data.buffer[this.data.cursor.row].length)
      if (key === 'I') this.data.cursor.col = 0
      if (key === 'A') this.data.cursor.col = this.data.buffer[this.data.cursor.row].length
      return
    }
    if (key === 'o' || key === 'O') {
      this.beginEdit()
      const row = this.data.cursor.row + (key === 'o' ? 1 : 0)
      this.data.buffer.splice(row, 0, '')
      this.data.cursor = { row, col: 0 }
      this.data.mode = 'INSERT'
      return
    }
    if (key === 'R') {
      this.data.mode = 'REPLACE'
      return
    }
    if (key === 'C') {
      this.changeToEnd()
      return
    }
    if (key === 'x' || key === 'X' || key === 's' || key === 'S') {
      this.simpleDelete(key)
      return
    }
    if (key === 'p' || key === 'P') {
      this.put(key === 'p')
      return
    }
    if (key === 'u') {
      this.undo()
      return
    }
    if (key === '<C-r>') {
      this.redo()
      return
    }
    if (key === '~') {
      this.toggleCase()
      return
    }
    if (key === 'v' || key === 'V' || key === '<C-v>') {
      this.visualAnchor = { ...this.data.cursor }
      this.data.mode = key === 'v' ? 'VISUAL' : key === 'V' ? 'VLINE' : 'VBLOCK'
      return
    }
    const motion = getMotion(this.data.buffer, this.data.cursor, key, 1)
    if (motion) this.applyMotion(key, 1)
  }

  private motionObject(motion: MotionResult): TextObjectResult {
    return { start: { ...this.data.cursor }, end: { ...motion.position }, inclusive: motion.inclusive }
  }

  private applyMotion(key: string, count: number): void {
    const motion = getMotion(this.data.buffer, this.data.cursor, key, count)
    if (motion) this.data.cursor = motion.position
  }

  private applyOperator(operator: Operator, object: TextObjectResult, register: string | null, motionKey?: string): void {
    if (object.linewise) {
      const startRow = Math.min(object.start.row, object.end.row)
      const endRow = Math.max(object.start.row, object.end.row)
      const amount = Math.min(this.data.buffer.length - startRow, endRow - startRow + 1)
      const text = this.data.buffer.slice(startRow, startRow + amount).join('\n') + '\n'
      if (operator === 'y') {
        this.storeRegister(register, text, true)
        this.data.cursor = { row: startRow, col: 0 }
        this.finishEdit()
        return
      }
      this.beginEdit()
      this.storeRegister(register, text, true)
      if (this.data.buffer.length === amount) this.data.buffer[0] = ''
      else this.data.buffer.splice(startRow, amount)
      this.data.cursor = { row: Math.min(startRow, this.data.buffer.length - 1), col: 0 }
      if (operator === 'c') this.data.mode = 'INSERT'
      this.finishEdit()
      return
    }
    const startOffset = positionToOffset(this.data.buffer, object.start)
    const motionEnd = motionKey === 'w' && object.end.col === (this.data.buffer[object.end.row] ?? '').length - 1
    const endOffset = positionToOffset(this.data.buffer, object.end) + (object.inclusive || motionEnd ? 1 : 0)
    const start = Math.min(startOffset, endOffset)
    const end = Math.max(startOffset, endOffset)
    if (operator === 'y') {
      const text = this.joinRange(start, end)
      this.storeRegister(register, text, !!object.linewise)
      this.data.cursor = clampPosition(this.data.buffer, object.start)
      this.finishEdit()
      return
    }
    this.beginEdit()
    const text = this.joinRange(start, end)
    this.storeRegister(register, text, !!object.linewise)
    this.replaceRange(start, end, '')
    const position = offsetToPosition(this.data.buffer, start)
    this.data.cursor = clampPosition(this.data.buffer, position)
    if (operator === 'c') this.data.mode = 'INSERT'
    this.finishEdit()
  }

  private joinRange(start: number, end: number): string {
    const full = this.data.buffer.join('\n')
    return full.slice(start, end)
  }

  private replaceRange(start: number, end: number, replacement: string): void {
    const full = this.data.buffer.join('\n')
    const result = full.slice(0, start) + replacement + full.slice(end)
    this.data.buffer = result.split('\n')
  }

  private storeRegister(name: string | null, text: string, linewise: boolean): void {
    const key = name ?? ''
    this.data.registers[key] = text
    this.clipKinds[key] = linewise
    if (key !== '') {
      this.data.registers[''] = text
      this.clipKinds[''] = linewise
    }
  }

  private deleteLines(register: string | null, count = 1): void {
    this.beginEdit()
    const row = this.data.cursor.row
    const amount = Math.max(1, Math.min(Math.trunc(count), this.data.buffer.length - row))
    const text = this.data.buffer.slice(row, row + amount).join('\n') + '\n'
    this.storeRegister(register, text, true)
    if (this.data.buffer.length === amount) this.data.buffer[0] = ''
    else this.data.buffer.splice(row, amount)
    this.data.cursor.row = Math.min(row, this.data.buffer.length - 1)
    this.data.cursor.col = clampCol(this.data.buffer[this.data.cursor.row], this.data.cursor.col)
    this.finishEdit()
  }

  private changeLines(register: string | null, count = 1): void {
    this.beginEdit()
    const row = this.data.cursor.row
    const amount = Math.max(1, Math.min(Math.trunc(count), this.data.buffer.length - row))
    const text = this.data.buffer.slice(row, row + amount).join('\n') + '\n'
    this.storeRegister(register, text, true)
    this.data.buffer[row] = ''
    if (amount > 1) this.data.buffer.splice(row + 1, amount - 1)
    this.data.cursor = { row, col: 0 }
    this.data.mode = 'INSERT'
    this.finishEdit()
  }

  private yankLines(register: string | null, count = 1): void {
    const row = this.data.cursor.row
    const amount = Math.max(1, Math.min(Math.trunc(count), this.data.buffer.length - row))
    const text = this.data.buffer.slice(row, row + amount).join('\n') + '\n'
    this.storeRegister(register, text, true)
    this.finishEdit()
  }

  private simpleDelete(key: string): void {
    if (key === 'S') {
      this.beginEdit()
      this.storeRegister(null, this.data.buffer[this.data.cursor.row] + '\n', true)
      this.data.buffer[this.data.cursor.row] = ''
      this.data.cursor.col = 0
      this.data.mode = 'INSERT'
      this.finishEdit()
      return
    }
    if (key === 's') {
      this.simpleDelete('x')
      this.data.mode = 'INSERT'
      return
    }
    this.beginEdit()
    const row = this.data.cursor.row
    const line = this.data.buffer[row] ?? ''
    const col = key === 'X' ? Math.max(0, this.data.cursor.col - 1) : this.data.cursor.col
    if (line.length) {
      this.storeRegister(null, line[col] ?? '', false)
      this.data.buffer[row] = line.slice(0, col) + line.slice(col + 1)
      this.data.cursor.col = Math.min(col, Math.max(0, this.data.buffer[row].length - 1))
    }
    this.finishEdit()
  }

  private put(after: boolean): void {
    const text = this.data.registers[''] ?? ''
    if (!text) return
    this.beginEdit()
    if (this.clipKinds['']) {
      const lines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n')
      const row = this.data.cursor.row + (after ? 1 : 0)
      this.data.buffer.splice(row, 0, ...lines)
      this.data.cursor = { row, col: 0 }
    } else {
      const offset = positionToOffset(this.data.buffer, this.data.cursor) + (after ? 1 : 0)
      this.replaceRange(offset, offset, text)
      this.data.cursor = clampPosition(this.data.buffer, offsetToPosition(this.data.buffer, offset + Math.max(0, text.length - 1)))
    }
    this.finishEdit()
  }

  private replaceChar(key: string): void {
    if (key.length !== 1) return
    this.beginEdit()
    const line = this.data.buffer[this.data.cursor.row]
    if (line.length) this.data.buffer[this.data.cursor.row] = line.slice(0, this.data.cursor.col) + key + line.slice(this.data.cursor.col + 1)
    this.finishEdit()
  }

  private toggleCase(): void {
    const line = this.data.buffer[this.data.cursor.row]
    const char = line[this.data.cursor.col]
    if (!char || !/[A-Za-z]/.test(char)) return
    this.beginEdit()
    const next = char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()
    this.data.buffer[this.data.cursor.row] = line.slice(0, this.data.cursor.col) + next + line.slice(this.data.cursor.col + 1)
    this.finishEdit()
  }

  private changeToEnd(): void {
    const row = this.data.cursor.row
    const col = this.data.cursor.col
    this.beginEdit()
    this.storeRegister(null, (this.data.buffer[row] ?? '').slice(col), false)
    this.data.buffer[row] = (this.data.buffer[row] ?? '').slice(0, col)
    this.data.cursor.col = col
    this.data.mode = 'INSERT'
    this.finishEdit()
  }

  private findChar(cmd: string, char: string, count: number): void {
    if (char.length !== 1) return
    this.data.lastFind = { cmd, char }
    let row = this.data.cursor.row
    let col = this.data.cursor.col
    for (let i = 0; i < count; i++) {
      const line = this.data.buffer[row] ?? ''
      const step = cmd === 'F' || cmd === 'T' ? -1 : 1
      const begin = col + (step > 0 ? 1 : -1)
      const index = step > 0 ? line.indexOf(char, begin) : line.lastIndexOf(char, begin)
      if (index < 0) return
      col = index
      if (cmd === 't') col = Math.max(0, index - 1)
      if (cmd === 'T') col = Math.min(line.length - 1, index + 1)
    }
    this.data.cursor = { row, col }
  }

  private repeatFind(forward: boolean): void {
    const last = this.data.lastFind
    if (!last) return
    let cmd = last.cmd
    if (!forward) cmd = cmd === 'f' ? 'F' : cmd === 'F' ? 'f' : cmd === 't' ? 'T' : 't'
    this.findChar(cmd, last.char, 1)
  }

  private setMark(char: string): void {
    if (/^[A-Za-z]$/.test(char)) this.data.marks[char] = { ...this.data.cursor }
  }

  private gotoMark(char: string, linewise: boolean): void {
    const mark = this.data.marks[char]
    if (!mark) return
    this.data.cursor = linewise ? { row: mark.row, col: 0 } : clampPosition(this.data.buffer, mark)
  }

  private searchCurrentWord(): void {
    const line = this.data.buffer[this.data.cursor.row] ?? ''
    const char = line[this.data.cursor.col] ?? ''
    if (!/[A-Za-z0-9_]/.test(char)) return
    let start = this.data.cursor.col
    let end = this.data.cursor.col + 1
    while (start > 0 && /[A-Za-z0-9_]/.test(line[start - 1] ?? '')) start--
    while (end < line.length && /[A-Za-z0-9_]/.test(line[end] ?? '')) end++
    this.data.lastSearch = line.slice(start, end)
    this.repeatSearch(true)
  }

  private repeatSearch(forward: boolean): void {
    const query = this.data.lastSearch
    if (!query) return
    const delta = forward ? 1 : -1
    let row = this.data.cursor.row
    let col = this.data.cursor.col
    for (let loops = 0; loops < this.data.buffer.length; loops++) {
      const line = this.data.buffer[row] ?? ''
      const index = delta > 0 ? line.indexOf(query, col + 1) : line.lastIndexOf(query, col - 1)
      if (index >= 0) {
        this.data.cursor = { row, col: index }
        return
      }
      row = (row + delta + this.data.buffer.length) % this.data.buffer.length
      col = delta > 0 ? -1 : (this.data.buffer[row]?.length ?? 0)
    }
  }

  private handleVisual(key: string): void {
    if (key === 'Esc') {
      this.data.mode = 'NORMAL'
      this.visualAnchor = null
      return
    }
    if (key === 'd' || key === 'x' || key === 'c' || key === 'y') {
      const anchor = this.visualAnchor ?? this.data.cursor
      const end = this.data.cursor
      const startOffset = positionToOffset(this.data.buffer, anchor)
      const endOffset = positionToOffset(this.data.buffer, end)
      const object: TextObjectResult = { start: anchor, end, inclusive: true, linewise: this.data.mode === 'VLINE' }
      if (startOffset > endOffset) { object.start = end; object.end = anchor }
      this.data.mode = 'NORMAL'
      this.visualAnchor = null
      this.applyOperator(key === 'x' ? 'd' : key as Operator, object, null)
      return
    }
    const motion = getMotion(this.data.buffer, this.data.cursor, key, 1)
    if (motion) this.data.cursor = motion.position
  }

  private handleCommandLine(key: string): void {
    if (key === 'Esc') {
      this.data.mode = 'NORMAL'
      this.commandLine = ''
      this.commandPrefix = ''
      return
    }
    if (key === 'Backspace') {
      this.commandLine = this.commandLine.slice(0, -1)
      return
    }
    if (key === 'Enter') {
      const command = this.commandLine
      const prefix = this.commandPrefix
      this.data.mode = 'NORMAL'
      this.commandLine = ''
      this.commandPrefix = ''
      if (prefix === '/') this.executeSearch(command)
      else this.executeCommand(command)
      return
    }
    if (key.length === 1 && key.charCodeAt(0) >= 32) this.commandLine += key
  }

  private executeSearch(query: string): void {
    if (!query) return
    this.data.lastSearch = query
    const row = this.data.cursor.row
    const start = this.data.cursor.col + 1
    const index = (this.data.buffer[row] ?? '').indexOf(query, start)
    if (index >= 0) this.data.cursor.col = index
    else this.repeatSearch(true)
  }

  private executeCommand(command: string): void {
    if (command === 'w' || command === 'q' || command === 'wq' || command === 'q!') {
      this.data.message = command === 'w' ? '已写入' : '已执行 ' + command
      return
    }
    const substitute = command.match(/^%s\/([^/]*)\/([^/]*)\/g$/)
    if (substitute) {
      const [, pattern, replacement] = substitute
      this.beginEdit()
      this.data.buffer = this.data.buffer.map((line) => line.split(pattern).join(replacement))
      this.finishEdit()
      this.data.message = `已替换 ${pattern}`
      return
    }
    this.data.message = `未知命令: ${command}`
  }

  private undo(): void {
    const { stack, pointer } = this.data.undo
    if (pointer <= 0) return
    this.redoSnapshot = this.snapshot()
    this.restore(stack[pointer - 1])
    this.data.undo.pointer = pointer - 1
  }

  private redo(): void {
    const { stack, pointer } = this.data.undo
    if (this.redoSnapshot) {
      const snapshot = this.redoSnapshot
      this.redoSnapshot = null
      this.restore(snapshot)
      this.data.undo.pointer = Math.min(stack.length, pointer + 1)
      return
    }
    if (pointer >= stack.length) return
    this.restore(stack[pointer])
    this.data.undo.pointer = pointer + 1
  }
}
