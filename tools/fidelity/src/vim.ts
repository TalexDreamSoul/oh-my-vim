import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface VimInput {
  buffer: string[];
  cursor: { row: number; col: number };
  keys: string;
}

export interface VimResult {
  buffer: string[];
  cursor: { row: number; col: number };
  error?: string;
  skipped?: string;
}

/** Convert a fidelity key sequence to a Vimscript expression string. */
function vimString(keys: string): string {
  let out = '';
  for (let i = 0; i < keys.length;) {
    if (keys[i] === '<') {
      const end = keys.indexOf('>', i + 1);
      if (end !== -1) {
        const name = keys.slice(i + 1, end);
        // These are the notation names accepted by the core contract and Vim.
        if (/^(?:Esc|CR|Enter|C-[A-Za-z]|Tab|BS|Space|Up|Down|Left|Right)$/.test(name)) {
          out += `\\<${name === 'Enter' ? 'CR' : name}>`;
          i = end + 1;
          continue;
        }
      }
    }
    const ch = keys[i++];
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else out += ch;
  }
  return `"${out}"`;
}

function replayScript(keys: string): string[] {
  return keys.split(/(<C-r>|u(?=$|<C-r>))/).filter((part) => part.length > 0).map((part) => {
    if (part === '<C-r>') return 'later 1f';
    return `execute 'normal! ' . ${vimString(part)}`;
  });
}

function vimPath(path: string): string {
  // A single-quoted Vimscript string only needs apostrophes doubled.
  return `'${path.replaceAll("'", "''")}'`;
}

function oracleKeys(keys: string): string {
  // q/wq/q! terminate Vim before the export commands; they are state-neutral,
  // so replace only a terminal quit with an equivalent command for capture.
  return keys.replace(/:(?:wq|q!|q)<Enter>$/, ':echo quit<Enter>');
}

function readBuffer(path: string): string[] {
  let text = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
  // Vim writes a line terminator even when the initial buffer had none.
  if (text.endsWith('\n')) text = text.slice(0, -1);
  return text.length === 0 ? [''] : text.split('\n');
}

/** Run the system Vim in a clean, noninteractive process. */
export function runVim(input: VimInput): VimResult {
  const dir = mkdtempSync(join(tmpdir(), 'oh-my-vim-fidelity-'));
  const source = join(dir, 'input.txt');
  const script = join(dir, 'keys.vim');
  const output = join(dir, 'out.txt');
  const cursor = join(dir, 'cur.txt');
  try {
    writeFileSync(source, input.buffer.join('\n'), 'utf8');
    const scriptText = [
      'set nomore',
      `call cursor(${input.cursor.row + 1}, ${input.cursor.col + 1})`,
      // Execute unmapped normal-mode chunks. Vim's normal! does not expose
      // Ctrl-R reliably in a -S script, so translate that token to :redo.
      ...replayScript(oracleKeys(input.keys)),
      `execute 'silent! write! ' . fnameescape(${vimPath(output)})`,
      `call writefile([line('.') . ',' . col('.')], ${vimPath(cursor)})`,
      'qa!',
      ''
    ].join('\n')
    writeFileSync(script, scriptText, 'utf8');
    try {
      execFileSync('vim', ['-u', 'NONE', '-i', 'NONE', '-n', '--not-a-term', '-S', script, source], {
        cwd: dir,
        stdio: 'pipe',
        timeout: 30_000,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { buffer: [], cursor: { row: 0, col: 0 }, error: `vim 执行失败: ${detail}` };
    }
    const curText = readFileSync(cursor, 'utf8').trim();
    const [rowText, colText] = curText.split(',');
    const row = Number(rowText) - 1;
    const col = Number(colText) - 1;
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0) {
      return { buffer: [], cursor: { row: 0, col: 0 }, error: `vim 光标输出无效: ${curText}` };
    }
    return { buffer: readBuffer(output), cursor: { row, col } };
  } catch (error) {
    return { buffer: [], cursor: { row: 0, col: 0 }, error: error instanceof Error ? error.message : String(error) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
