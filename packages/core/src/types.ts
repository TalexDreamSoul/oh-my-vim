export type Mode = 'NORMAL' | 'INSERT' | 'REPLACE' | 'VISUAL' | 'VLINE' | 'VBLOCK' | 'CMDLINE'

export type Operator = 'd' | 'c' | 'y'

export interface PendingCommand {
  count: number | null
  operator: Operator | null
  register: string | null
  awaiting: 'motion' | 'textobj-i' | 'textobj-a' | 'char' | null
}

export interface Snapshot {
  buffer: string[]
  cursor: { row: number; col: number }
  mode: Mode
  registers: Record<string, string>
  marks: Record<string, { row: number; col: number }>
  keystrokes: number
}

export interface EngineState {
  buffer: string[]
  cursor: { row: number; col: number }
  mode: Mode
  pending: PendingCommand | null
  registers: Record<string, string>
  marks: Record<string, { row: number; col: number }>
  lastFind: { cmd: string; char: string } | null
  lastSearch: string | null
  undo: { stack: Snapshot[]; pointer: number }
  keystrokes: number
  message?: string
}

export type SyntaxChunkKind = 'count' | 'operator' | 'motion' | 'register' | 'char'

export interface SyntaxChunk {
  text: string
  kind: SyntaxChunkKind
}
