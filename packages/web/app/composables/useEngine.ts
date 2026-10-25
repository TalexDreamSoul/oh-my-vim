import { ref } from 'vue'
import { VimEngine, parseLevel, checkWin, type Level, type EngineState } from '@oh-my-vim/core'

export interface LevelProgress { strokes: number; gold: boolean; silver: boolean }

export function useEngine(level: Level) {
  const engine = new VimEngine({ lines: level.setup.buffer, cursor: level.setup.cursor })
  const state = ref<EngineState>(engine.state)
  const won = ref(false)
  const syntax = ref(engine.pendingSyntax)

  function send(key: string) {
    state.value = engine.send(key)
    syntax.value = engine.pendingSyntax
    const verdict = checkWin(level, state.value)
    if (verdict.ok && !won.value) {
      won.value = true
      const strokes = state.value.keystrokes
      const gold = strokes <= level.solution.length
      const silver = strokes <= Math.round(level.solution.length * 1.5)
      saveProgress(level, strokes, gold, silver)
    }
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
