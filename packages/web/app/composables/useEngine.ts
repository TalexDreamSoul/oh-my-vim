import { ref } from 'vue'
import { VimEngine, parseLevel, checkWin, type Level, type EngineState } from '@oh-my-vim/core'

export interface LevelProgress { strokes: number; gold: boolean; silver: boolean }

const SPECIAL_CARD_KEYS = new Set([
  'Esc', 'Enter', 'Backspace', 'Tab', 'Space',
  'Left', 'Right', 'Up', 'Down',
  'C-r', 'C-v', 'C-u', 'C-c',
])

function cardSequence(input: string): string {
  return SPECIAL_CARD_KEYS.has(input) ? `<${input}>` : input
}

export function useEngine(level: Level) {
  const engine = new VimEngine({ lines: level.setup.buffer, cursor: level.setup.cursor })
  const state = ref<EngineState>(engine.state)
  const won = ref(false)
  const syntax = ref(engine.pendingSyntax)
  const solutionExpectsNormal = level.solution.includes('<Esc>')

  function syncState(): void {
    state.value = engine.state
    syntax.value = engine.pendingSyntax
    const verdict = checkWin(level, state.value)
    if (verdict.ok && (!solutionExpectsNormal || state.value.mode === 'NORMAL') && !won.value) {
      won.value = true
      const strokes = state.value.keystrokes
      const gold = strokes <= level.solution.length
      const silver = strokes <= Math.round(level.solution.length * 1.5)
      saveProgress(level, strokes, gold, silver)
    }
  }

  function send(input: string): void {
    // Cards may represent one key (h), a chord (C-v), or a short phrase (dd).
    // Replay keeps all three forms faithful while still counting each stroke.
    engine.replay(cardSequence(input))
    syncState()
  }

  return { engine, state, syntax, won, send }
}

export function saveProgress(level: Level, strokes: number, gold: boolean, silver: boolean): void {
  if (!import.meta.client) return
  const key = 'oh-my-vim/progress'
  const all: Record<string, LevelProgress> = JSON.parse(localStorage.getItem(key) || '{}')
  const prev = all[level.id ?? level.title]
  if (!prev || strokes < prev.strokes) {
    all[level.id ?? level.title] = { strokes, gold, silver }
    localStorage.setItem(key, JSON.stringify(all))
  }
}

export async function loadLevel(id: string): Promise<Level> {
  const res = await fetch(`/levels/${id}`)
  if (!res.ok) throw new Error('关卡不存在')
  return { ...parseLevel(await res.text()), id }
}
