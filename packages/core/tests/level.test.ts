import test from 'node:test'
import assert from 'node:assert/strict'
import { checkWin, LevelParseError, parseLevel } from '../src/level.js'
import type { EngineState } from '../src/types.js'

const source = `title = 多行测试
chapter = 2
cards = d, w, 3

[description]
教学正文

[setup]
buffer = "one\\ntwo"
cursor = 1,1

[win]
buffer == "one\\ntwo"
cursor == 1,1
keystrokes <= 4

[solution]
2w

[congrats]
完成`

test('parseLevel parses fields and escaped multiline buffers', () => {
  const level = parseLevel(source)
  assert.equal(level.title, '多行测试')
  assert.equal(level.chapter, 2)
  assert.deepEqual(level.cards, ['d', 'w', '3'])
  assert.equal(level.description, '教学正文')
  assert.deepEqual(level.setup.buffer, ['one', 'two'])
  assert.deepEqual(level.setup.cursor, { row: 1, col: 1 })
  assert.equal(level.solution, '2w')
  assert.equal(level.congrats, '完成')
  assert.equal(level.win.length, 3)
})

test('parseLevel reports missing fields', () => {
  assert.throws(() => parseLevel('[description]\ntext'), (error: unknown) => error instanceof LevelParseError && error.field === 'title')
  assert.throws(() => parseLevel('title = x\nchapter = 1\n[description]\nx\n[setup]\nbuffer = "x"\ncursor = 0,0\n[solution]\nx'), (error: unknown) => error instanceof LevelParseError && error.field === 'win')
})

function state(overrides: Partial<EngineState> = {}): EngineState {
  return {
    buffer: ['one', 'two'], cursor: { row: 1, col: 1 }, mode: 'NORMAL', pending: null,
    registers: { '': '' }, marks: {}, lastFind: null, lastSearch: null,
    undo: { stack: [], pointer: 0 }, keystrokes: 2, ...overrides,
  }
}

test('checkWin reports passing and failing assertions', () => {
  const level = parseLevel(source)
  assert.deepEqual(checkWin(level, state()), { ok: true, failed: [] })
  const failed = checkWin(level, state({ cursor: { row: 0, col: 0 } }))
  assert.equal(failed.ok, false)
  assert.equal(failed.failed.length, 1)
})
