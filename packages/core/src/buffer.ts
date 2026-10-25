export interface Position { row: number; col: number }

export function splitText(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  return lines.length ? lines : ['']
}

export function joinText(lines: string[]): string {
  return lines.length ? lines.join('\n') : ''
}

export function clampRow(lines: string[], row: number): number {
  if (lines.length === 0) return 0
  return Math.max(0, Math.min(Math.trunc(row), lines.length - 1))
}

export function clampCol(line: string, col: number, insert = false): number {
  const max = insert ? line.length : Math.max(0, line.length - 1)
  return Math.max(0, Math.min(Math.trunc(col), max))
}

export function clampPosition(lines: string[], pos: Position, insert = false): Position {
  const row = clampRow(lines, pos.row)
  return { row, col: clampCol(lines[row] ?? '', pos.col, insert) }
}

export function normalizeBuffer(lines: string[]): string[] {
  if (lines.length === 0) return ['']
  return lines.map((line) => line.replace(/\r/g, ''))
}

export function positionToOffset(lines: string[], pos: Position): number {
  const row = clampRow(lines, pos.row)
  let offset = 0
  for (let i = 0; i < row; i++) offset += (lines[i] ?? '').length + 1
  return offset + clampCol(lines[row] ?? '', pos.col, true)
}

export function offsetToPosition(lines: string[], offset: number): Position {
  let rest = Math.max(0, Math.trunc(offset))
  for (let row = 0; row < lines.length; row++) {
    const length = lines[row].length
    if (rest <= length) return { row, col: rest }
    rest -= length + 1
  }
  const row = Math.max(0, lines.length - 1)
  return { row, col: lines[row]?.length ?? 0 }
}
