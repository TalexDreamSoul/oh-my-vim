import { VimEngine, type EngineState } from '@oh-my-vim/core';
import type { VimInput } from './vim.js';

export interface CoreResult {
  buffer: string[];
  cursor: { row: number; col: number };
  error?: string;
  skipped?: string;
}

/** Adapt the documented VimEngine API to the fidelity runner's result shape. */
export function runCore(input: VimInput): CoreResult {
  try {
    const engine = new VimEngine({ lines: [...input.buffer], cursor: { ...input.cursor } });
    const state = engine.replay(input.keys) as EngineState;
    return {
      buffer: [...state.buffer],
      cursor: { row: state.cursor.row, col: state.cursor.col },
    };
  } catch (error) {
    return {
      buffer: [],
      cursor: { row: 0, col: 0 },
      error: `core 执行失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
