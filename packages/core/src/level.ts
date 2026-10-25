import type { EngineState } from './types.js'

export interface LevelSetup {
  buffer: string[]
  cursor: { row: number; col: number }
}

export type WinAssert =
  | { kind: 'buffer'; value: string[] }
  | { kind: 'cursor'; row: number; col: number }
  | { kind: 'keystrokes'; value: number }

export interface Level {
  id?: string
  title: string
  chapter: number
  cards?: string[]
  description: string
  setup: LevelSetup
  win: WinAssert[]
  solution: string
  congrats?: string
}

export class LevelParseError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(`${field}: ${message}`)
    this.name = 'LevelParseError'
    this.field = field
  }
}

function decodeValue(raw: string, field: string): string {
  const value = raw.trim()
  if (value === '"') return value
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  if (value.startsWith('"') || value.endsWith('"')) throw new LevelParseError(field, '引号不完整')
  return value
}

function required(fields: Map<string, string>, name: string): string {
  const value = fields.get(name)
  if (value === undefined || value.trim() === '') throw new LevelParseError(name, '缺少必填字段')
  return value
}

function parseCursor(raw: string): { row: number; col: number } {
  const match = raw.trim().match(/^(\d+)\s*,\s*(\d+)$/)
  if (!match) throw new LevelParseError('setup.cursor', '应为 row,col')
  return { row: Number(match[1]), col: Number(match[2]) }
}

function parseWin(lines: string[]): WinAssert[] {
  const assertions: WinAssert[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const buffer = line.match(/^buffer\s*==\s*(.+)$/)
    if (buffer) {
      assertions.push({ kind: 'buffer', value: decodeValue(buffer[1], 'win.buffer').split('\n') })
      continue
    }
    const cursor = line.match(/^cursor\s*==\s*(\d+)\s*,\s*(\d+)$/)
    if (cursor) {
      assertions.push({ kind: 'cursor', row: Number(cursor[1]), col: Number(cursor[2]) })
      continue
    }
    const strokes = line.match(/^keystrokes\s*<=\s*(\d+)$/)
    if (strokes) {
      assertions.push({ kind: 'keystrokes', value: Number(strokes[1]) })
      continue
    }
    throw new LevelParseError('win', `无法识别断言: ${line}`)
  }
  if (assertions.length === 0) throw new LevelParseError('win', '至少需要一条断言')
  return assertions
}

export function parseLevel(source: string): Level {
  const sections = new Map<string, string[]>()
  let section = ''
  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trimEnd()
    const header = line.match(/^\[([^\]]+)\]\s*$/)
    if (header) {
      section = header[1].trim().toLowerCase()
      if (!sections.has(section)) sections.set(section, [])
      continue
    }
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const list = sections.get(section) ?? []
    list.push(line)
    sections.set(section, list)
  }

  const root = new Map<string, string>()
  for (const line of sections.get('') ?? []) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.*)$/)
    if (!match) throw new LevelParseError('root', `无法解析字段: ${line}`)
    root.set(match[1].toLowerCase(), match[2])
  }

  const title = decodeValue(required(root, 'title'), 'title')
  const chapterRaw = required(root, 'chapter')
  if (!/^\d+$/.test(chapterRaw.trim())) throw new LevelParseError('chapter', '必须是数字')
  const chapter = Number(chapterRaw)
  if (chapter < 1) throw new LevelParseError('chapter', '必须大于等于 1')

  const cardsRaw = root.get('cards')
  const cards = cardsRaw === undefined
    ? undefined
    : cardsRaw.split(',').map((card) => decodeValue(card.trim(), 'cards')).filter(Boolean)

  const descriptionLines = sections.get('description') ?? []
  if (descriptionLines.length === 0) throw new LevelParseError('description', '缺少教学正文')
  const description = descriptionLines.join('\n')

  const setupLines = new Map<string, string>()
  for (const line of sections.get('setup') ?? []) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.*)$/)
    if (!match) throw new LevelParseError('setup', `无法解析字段: ${line}`)
    setupLines.set(match[1].toLowerCase(), match[2])
  }
  const bufferRaw = decodeValue(required(setupLines, 'buffer'), 'setup.buffer')
  if (/[^\t\n\r\x20-\x7e]/.test(bufferRaw)) throw new LevelParseError('setup.buffer', 'v1 buffer 仅允许 ASCII')
  const setup = {
    buffer: bufferRaw.split('\n'),
    cursor: parseCursor(decodeValue(required(setupLines, 'cursor'), 'setup.cursor')),
  }

  const solutionLines = sections.get('solution') ?? []
  if (solutionLines.length === 0) throw new LevelParseError('solution', '缺少已知解')
  const solution = solutionLines.join('\n').trim()
  if (!solution) throw new LevelParseError('solution', '不能为空')

  const level: Level = {
    title,
    chapter,
    ...(cards ? { cards } : {}),
    description,
    setup,
    win: parseWin(sections.get('win') ?? []),
    solution,
  }
  const congratsLines = sections.get('congrats')
  if (congratsLines && congratsLines.length) level.congrats = congratsLines.join('\n')
  return level
}

export function checkWin(level: Level, state: EngineState): { ok: boolean; failed: string[] } {
  const failed: string[] = []
  for (const assertion of level.win) {
    if (assertion.kind === 'buffer') {
      if (state.buffer.length !== assertion.value.length || state.buffer.some((line, index) => line !== assertion.value[index])) {
        failed.push(`buffer != ${JSON.stringify(assertion.value)}`)
      }
    } else if (assertion.kind === 'cursor') {
      if (state.cursor.row !== assertion.row || state.cursor.col !== assertion.col) failed.push(`cursor != ${assertion.row},${assertion.col}`)
    } else if (state.keystrokes > assertion.value) {
      failed.push(`keystrokes > ${assertion.value}`)
    }
  }
  return { ok: failed.length === 0, failed }
}
