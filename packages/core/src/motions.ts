import type { Position } from './buffer.js'
import { clampCol, clampRow } from './buffer.js'

export interface MotionResult {
  position: Position
  inclusive: boolean
  linewise?: boolean
}

export interface TextObjectResult {
  start: Position
  end: Position
  inclusive: boolean
  linewise?: boolean
}

function isWord(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_]/.test(ch)
}

function lineEnd(lines: string[], row: number): number {
  return Math.max(0, (lines[row] ?? '').length - 1)
}

function nextWord(lines: string[], from: Position): Position {
  let row = from.row
  let col = from.col
  const lastRow = lines.length - 1
  while (row <= lastRow) {
    const line = lines[row] ?? ''
    if (col < line.length && isWord(line[col])) {
      while (col < line.length && isWord(line[col])) col++
    }
    while (col < line.length && !isWord(line[col])) col++
    if (col < line.length) return { row, col }
    row++
    col = 0
  }
  return { row: lastRow, col: lineEnd(lines, lastRow) }
}

function previousWord(lines: string[], from: Position): Position {
  let row = from.row
  let col = Math.min(from.col, lineEnd(lines, row))
  while (row >= 0) {
    const line = lines[row] ?? ''
    if (col > 0) col--
    while (col > 0 && !isWord(line[col])) col--
    while (col > 0 && isWord(line[col - 1])) col--
    if (isWord(line[col])) return { row, col }
    if (row === 0) return { row: 0, col: 0 }
    row--
    col = (lines[row] ?? '').length
  }
  return { row: 0, col: 0 }
}

function wordEnd(lines: string[], from: Position): Position {
  let row = from.row
  let col = from.col
  while (row < lines.length) {
    const line = lines[row] ?? ''
    if (col >= line.length) {
      row++
      col = 0
      continue
    }
    const word = isWord(line[col])
    while (col + 1 < line.length && isWord(line[col + 1]) === word) col++
    return { row, col }
  }
  const last = lines.length - 1
  return { row: last, col: lineEnd(lines, last) }
}

function repeatMotion(lines: string[], pos: Position, key: string, count: number): Position {
  let current = { ...pos }
  for (let i = 0; i < count; i++) {
    if (key === 'w') current = nextWord(lines, current)
    else if (key === 'b') current = previousWord(lines, current)
    else if (key === 'e') current = wordEnd(lines, current)
  }
  return current
}

export function getMotion(lines: string[], cursor: Position, key: string, count = 1): MotionResult | null {
  if (!lines.length) return { position: { row: 0, col: 0 }, inclusive: false }
  const pos = { row: clampRow(lines, cursor.row), col: clampCol(lines[clampRow(lines, cursor.row)] ?? '', cursor.col) }
  const n = Math.max(1, Math.trunc(count))
  if (key === 'h' || key === 'Left') return { position: { row: pos.row, col: Math.max(0, pos.col - n) }, inclusive: true }
  if (key === '$') return { position: { row: pos.row, col: lineEnd(lines, pos.row) }, inclusive: true }
  if (key === 'l' || key === 'Right') return { position: { row: pos.row, col: Math.min(lineEnd(lines, pos.row), pos.col + n) }, inclusive: true }
  if (key === 'j' || key === 'Down') return { position: { row: Math.min(lines.length - 1, pos.row + n), col: clampCol(lines[Math.min(lines.length - 1, pos.row + n)] ?? '', pos.col) }, inclusive: true }
  if (key === 'k' || key === 'Up') return { position: { row: Math.max(0, pos.row - n), col: clampCol(lines[Math.max(0, pos.row - n)] ?? '', pos.col) }, inclusive: true }
  if (key === '0') return { position: { row: pos.row, col: 0 }, inclusive: true }
  if (key === '^') {
    const match = (lines[pos.row] ?? '').search(/\S/)
    return { position: { row: pos.row, col: match < 0 ? 0 : match }, inclusive: true }
  }
  if (key === 'w' || key === 'b' || key === 'e') {
    return { position: repeatMotion(lines, pos, key, n), inclusive: key === 'e' || key === 'b' }
  }
  if (key === 'G') return { position: { row: n > 1 ? Math.min(lines.length - 1, n - 1) : lines.length - 1, col: 0 }, inclusive: true }
  if (key === 'gg') return { position: { row: n > 1 ? Math.min(lines.length - 1, n - 1) : 0, col: 0 }, inclusive: true }
  if (key === '{') return { position: { row: Math.max(0, pos.row - n), col: 0 }, inclusive: true }
  if (key === '}') return { position: { row: Math.min(lines.length - 1, pos.row + n), col: 0 }, inclusive: true }
  return null
}

function matchingQuote(line: string, col: number, quote: string): { start: number; end: number } | null {
  let start = line.lastIndexOf(quote, col)
  let end = line.indexOf(quote, Math.max(col + 1, start + 1))
  if (start < 0 || end < 0) {
    start = line.indexOf(quote, col)
    end = start < 0 ? -1 : line.indexOf(quote, start + 1)
  }
  return start >= 0 && end > start ? { start, end } : null
}

export function getTextObject(lines: string[], cursor: Position, kind: 'i' | 'a', object: string): TextObjectResult | null {
  const row = clampRow(lines, cursor.row)
  const line = lines[row] ?? ''
  const col = clampCol(line, cursor.col)
  if (object === 'p') {
    let start = row
    while (start > 0 && lines[start - 1].trim() !== '') start--
    let end = row
    while (end + 1 < lines.length && lines[end + 1].trim() !== '') end++
    if (kind === 'a') {
      if (end + 1 < lines.length) end++
      else if (start > 0) start--
    }
    return { start: { row: start, col: 0 }, end: { row: end, col: lineEnd(lines, end) }, inclusive: true, linewise: true }
  }
  if (object === '"') {
    const pair = matchingQuote(line, col, '"')
    if (!pair) return null
    return { start: { row, col: kind === 'i' ? pair.start + 1 : pair.start }, end: { row, col: kind === 'i' ? pair.end - 1 : pair.end }, inclusive: true }
  }
  if (object === '(' || object === ')') {
    let open = line.lastIndexOf('(', col)
    let close = line.indexOf(')', Math.max(col, open + 1))
    if (open < 0 || close < 0) {
      open = line.indexOf('(', col)
      close = open < 0 ? -1 : line.indexOf(')', open + 1)
    }
    if (open < 0 || close < 0 || col < open || col > close) return null
    let start = open
    let end = close
    if (kind === 'i') {
      start++
      end--
      while (start <= end && /\s/.test(line[start] ?? '')) start++
      while (end >= start && /\s/.test(line[end] ?? '')) end--
    }
    return { start: { row, col: start }, end: { row, col: end }, inclusive: true }
  }
  if (object === 'w') {
    let start = col
    while (start > 0 && isWord(line[start - 1]) === isWord(line[col]) && /\S/.test(line[start - 1] ?? '')) start--
    let end = col
    while (end + 1 < line.length && isWord(line[end + 1]) === isWord(line[col])) end++
    if (kind === 'a') {
      while (end + 1 < line.length && /\s/.test(line[end + 1])) end++
      if (start > 0 && /\s/.test(line[start - 1] ?? '')) start--
    }
    return { start: { row, col: start }, end: { row, col: end }, inclusive: true }
  }
  return null
}
