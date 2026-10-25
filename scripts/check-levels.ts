/**
 * 关卡可解性校验（CI 真值）：
 * 对每个关卡回放 [solution]，用引擎终态跑 win 断言；并校验 golf 金线 = solution 长度。
 * 用法：pnpm check:levels   （在仓库根目录）
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VimEngine } from '@oh-my-vim/core'
import { checkWin } from '@oh-my-vim/core/level'
import { parseLevels } from '@oh-my-vim/core/levels-node'

const LEVELS_DIR = join(import.meta.dirname, '..', 'levels')

function fail(msg: string): never {
  console.error(`\x1b[31m[levels] ${msg}\x1b[0m`)
  process.exit(1)
}


const levels = parseLevels(LEVELS_DIR)
if (levels.length < 15) fail(`only ${levels.length} levels, expected >= 15`)

// sequence 必须覆盖所有关卡且无重复
const seqRaw = readFileSync(join(LEVELS_DIR, 'sequence'), 'utf8').trim().split(/\s+/)
const ids = new Set(levels.map((l) => l.id))
const seqSet = new Set(seqRaw)
for (const id of ids) if (!id || !seqSet.has(id)) fail(`level ${id ?? '(missing id)'} missing from levels/sequence`)
if (seqSet.size !== seqRaw.length) fail(`levels/sequence has duplicates`)


let total = 0
for (const level of levels) {
  const engine = new VimEngine({
    lines: level.setup.buffer,
    cursor: level.setup.cursor,
  })
  engine.replay(level.solution)
  const state = engine.state
  const { ok: won, failed } = checkWin(level, state)
  if (!won) fail(`level ${level.id} solution does not pass win: ${failed.join('; ')}\n  buffer=${JSON.stringify(state.buffer)}`)
  const strokeLimit = level.win.find((w) => w.kind === 'keystrokes')
  if (strokeLimit && state.keystrokes > strokeLimit.value) {
    fail(`level ${level.id} solution uses ${state.keystrokes} keystrokes but win requires <= ${strokeLimit.value}`)
  }
  total++
}

console.log(`\x1b[32m[levels] ${total}/${levels.length} levels solvable, sequence OK\x1b[0m`)
