import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { runCore, type CoreResult } from './core.js';
import { runVim, type VimInput, type VimResult } from './vim.js';

interface Case {
  file: string;
  line: number;
  buffer: string[];
  cursor: { row: number; col: number };
  keys: string;
  expectedBuffer: string[];
  expectedCursor: { row: number; col: number };
}

function decode(value: string): string {
  return value.replaceAll('\\n', '\n').replaceAll('\\t', '\t').replaceAll('\\\\', '\\');
}

function parseCursor(value: string): { row: number; col: number } {
  const match = /^\s*(-?\d+)\s*,\s*(-?\d+)\s*$/.exec(value);
  if (!match) throw new Error(`光标格式无效: ${value}`);
  return { row: Number(match[1]), col: Number(match[2]) };
}

function parseCase(line: string, file: string, lineNumber: number): Case {
  const fields = line.split('|');
  if (fields.length !== 5) throw new Error(`需要 5 个 | 分隔字段，实际 ${fields.length}`);
  const cursor = parseCursor(fields[1]);
  const expectedCursor = parseCursor(fields[4]);
  return {
    file,
    line: lineNumber,
    buffer: decode(fields[0]).split('\n'),
    cursor,
    keys: fields[2],
    expectedBuffer: decode(fields[3]).split('\n'),
    expectedCursor,
  };
}

function readCases(path: string): { cases: Case[]; errors: string[] } {
  const cases: Case[] = [];
  const errors: string[] = [];
  const files = existsSync(path) ? readdirSync(path).filter((name) => name.endsWith('.txt')).sort() : [];
  for (const name of files) {
    const file = resolve(path, name);
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const source = line;
      if (!source.trim() || source.trim().startsWith('#')) return;
      try {
        cases.push(parseCase(source, file, index + 1));
      } catch (error) {
        errors.push(`${basename(file)}:${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }
  return { cases, errors };
}

function same(a: { buffer: string[]; cursor: { row: number; col: number } }, b: { buffer: string[]; cursor: { row: number; col: number } }): boolean {
  return JSON.stringify(a.buffer) === JSON.stringify(b.buffer) && JSON.stringify(a.cursor) === JSON.stringify(b.cursor);
}

function formatResult(result: { buffer: string[]; cursor: { row: number; col: number } }): string {
  return `buffer=${JSON.stringify(result.buffer)} cursor=${result.cursor.row},${result.cursor.col}`;
}

function reportFailure(testCase: Case, vim: VimResult, core: CoreResult): void {
  console.log(`  expected: ${formatResult({ buffer: testCase.expectedBuffer, cursor: testCase.expectedCursor })}`);
  console.log(`  vim:      ${vim.error ?? formatResult(vim)}`);
  console.log(`  core:     ${core.error ?? core.skipped ?? formatResult(core)}`);
}

async function main(): Promise<void> {
  const requested = process.argv.indexOf('-u');
  const path = requested !== -1 && process.argv[requested + 1]
    ? resolve(process.cwd(), process.argv[requested + 1])
    : resolve(process.cwd(), 'cases');
  const input = existsSync(path) && path.endsWith('.txt')
    ? { cases: readCases(resolve(path, '..')).cases.filter((item) => item.file === path), errors: [] }
    : readCases(path);
  let passed = 0;
  let failed = input.errors.length;
  let skipped = 0;
  for (const error of input.errors) console.log(`[FAIL] ${error}`);
  for (const testCase of input.cases) {
    const payload: VimInput = { buffer: testCase.buffer, cursor: testCase.cursor, keys: testCase.keys };
    const vim = runVim(payload);
    const core = runCore(payload);
    if (vim.skipped || core.skipped) {
      skipped += 1;
      console.log(`[SKIP] ${basename(testCase.file)}:${testCase.line} ${testCase.keys}`);
      if (vim.skipped) console.log(`  vim:  ${vim.skipped}`);
      if (core.skipped) console.log(`  core: ${core.skipped}`);
      continue;
    }
    const expected = { buffer: testCase.expectedBuffer, cursor: testCase.expectedCursor };
    const ok = !vim.error && !core.error && same(vim, expected) && same(core, expected) && same(vim, core);
    if (ok) {
      passed += 1;
      console.log(`[PASS] ${basename(testCase.file)}:${testCase.line} ${testCase.keys}`);
    } else {
      failed += 1;
      console.log(`[FAIL] ${basename(testCase.file)}:${testCase.line} ${testCase.keys}`);
      reportFailure(testCase, vim, core);
    }
  }
  console.log(`\n汇总: ${passed} PASS, ${failed} FAIL, ${skipped} SKIP, 共 ${input.cases.length} 条用例`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`保真工具异常: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
