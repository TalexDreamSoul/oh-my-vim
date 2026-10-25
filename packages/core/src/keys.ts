/** Fixed key names accepted by VimEngine.send/replay. */
export const KEY_NAMES = {
  Esc: 'Esc',
  Enter: 'Enter',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Space: 'Space',
  CtrlR: '<C-r>',
  CtrlV: '<C-v>',
  CtrlC: '<C-c>',
  CtrlU: '<C-u>',
  Left: 'Left',
  Right: 'Right',
  Up: 'Up',
  Down: 'Down',
} as const

export const SPECIAL_KEYS: Record<string, string> = {
  '<Esc>': 'Esc',
  Esc: 'Esc',
  '<CR>': 'Enter',
  '<Enter>': 'Enter',
  Enter: 'Enter',
  '<BS>': 'Backspace',
  '<Backspace>': 'Backspace',
  Backspace: 'Backspace',
  '<Tab>': 'Tab',
  Tab: 'Tab',
  '<Space>': ' ',
  Space: ' ',
  '<C-r>': '<C-r>',
  'C-r': '<C-r>',
  '<C-v>': '<C-v>',
  'C-v': '<C-v>',
  '<C-u>': '<C-u>',
  'C-u': '<C-u>',
  '<Left>': 'Left',
  '<Right>': 'Right',
  '<Up>': 'Up',
  '<Down>': 'Down',
}

export function normalizeKey(key: string): string {
  return SPECIAL_KEYS[key] ?? key
}

/** Split a replay string into ordinary keys and angle-bracket key notation. */
export function tokenizeKeys(sequence: string): string[] {
  const out: string[] = []
  for (let i = 0; i < sequence.length;) {
    if (sequence[i] === '<') {
      const end = sequence.indexOf('>', i + 1)
      if (end >= 0) {
        out.push(normalizeKey(sequence.slice(i, end + 1)))
        i = end + 1
        continue
      }
    }
    const cp = sequence.codePointAt(i)
    if (cp === undefined) break
    const ch = String.fromCodePoint(cp)
    out.push(normalizeKey(ch))
    i += ch.length
  }
  return out
}
