# Core API 契约（packages/core）

纯 TypeScript、零运行时依赖、不依赖 DOM/Node API（除了 level.ts 的 fs 读目录仅限 Node 端工具使用，浏览器端用 `parseLevel(source)`）。
目标：按键流 → 编辑变换，且**每一步中间状态可导出**供可视化层渲染。

## 顶层类型

```ts
type Mode = 'NORMAL' | 'INSERT' | 'REPLACE' | 'VISUAL' | 'VLINE' | 'VBLOCK' | 'CMDLINE'

interface EngineState {
  buffer: string[]              // 行数组；行内 \t 按 1 列计（v1 不做 tabstop 渲染差）
  cursor: { row: number; col: number }
  mode: Mode
  pending: PendingCommand | null   // 正在组装的命令（含 count/operator/motion 的进度）
  registers: Record<string, string> // " 无名 + "a-"z；数字寄存器 v1 不做
  marks: Record<string, { row: number; col: number }>
  lastFind: { cmd: string; char: string } | null  // ; , 重复用
  lastSearch: string | null                     // n N 重复用
  undo: { stack: Snapshot[]; pointer: number }   // 线性 undo；分支树 v1 不做
  keystrokes: number             // golf 计分
  message?: string               // : 命令回显等
}

interface PendingCommand {
  count: number | null           // 数词，null = 未给（默认 1）
  operator: 'd' | 'c' | 'y' | null
  register: string | null        // "a 指定，null = 无名
  awaiting: 'motion' | 'textobj-i' | 'textobj-a' | 'char' | null
}
```

## 引擎 API

```ts
class VimEngine {
  constructor(init: { lines: string[]; cursor?: { row: number; col: number } })
  get state(): EngineState            // 只读快照（返回深拷贝，供可视化）
  get pendingSyntax(): SyntaxChunk[] // 语法条：已按下的键拆成 [数词][动词][名词] 色块
  send(key: string): EngineState      // 单键输入，返回新快照；不合法输入不抛错、no-op + message
  sendMany(keys: string[]): EngineState
  replay(seq: string): EngineState    // 解析 "d3w" 这类转义串（支持 <Esc> <C-r> 等记号）
}
```

### send() 语义

- `key` 是**单键**（'h'、'Esc'、'<C-r>'）；组合键用固定记号表（文档化于 `src/keys.ts`）。
- CMDLINE 模式：`:` 进入，字母数字累积，`Enter` 执行（支持 `w` `q` `wq` `q!` `%s/a/b/g` 的极小子集），`Esc` 取消。
- 错误（如 `d` 后直接按 `d` 自身等待 motion）统一 no-op 或按 Vim 真实行为处理，绝不让引擎抛异常——**可视化层永远拿到合法状态**。

## v1 命令集（保真对拍范围 = 此列表）

- 移动：h j k l w b e 0 $ ^ gg G { } f{char} F{char} t{char} T{char} ; ,
- 动词：d c y p P x X s S r{char} ~ u C-r
- 数词：0-9 前缀（0 除外，0 是行首）
- 文本对象：iw aw i" a" i( a( i) a) ip ap
- Visual：v V C-v（VBLOCK 编辑仅支持整列 x/r，v1 有限支持）
- 插入：i a o O I A + Esc；插入模式下方向键移动光标（v1 简化：同 NORMAL 移动）
- 命令行：:w :q :wq :q! :%s/pat/rep/g（pat 无正则，纯字面量）
- 其他：. 重复 v1 不做；q 宏 v1 不做（第 10 章关卡后置）

## 保真对拍（tools/fidelity）

```bash
pnpm fidelity          # 全部用例
pnpm fidelity -- -u cases/xxx.txt   # 单条
```

用例格式（一行式，`|` 分隔）：
```
buffer|cursor|keys|expected_buffer|expected_cursor
the quick brown fox|0,0|d3w|brown fox|0,0
```

- 驱动 `vim -u NONE -i NONE -n --not-a-term -s <scriptfile>`，用 `:redir` 或 `-c 'w! file'` 导出终态 buffer + 光标（`-c 'call writefile([line(".") . "," . col(".")], "cur")'`）
- core 侧同输入回放，逐行 diff；**断点即失败**，报告中给出 core/vim 双方输出
- 用例 ≥50 条，覆盖 v1 命令集每条至少 1 条 + 组合（count×motion、operator×textobj）≥15 条
- CI 中：ubuntu runner 有 vim，直接跑；本地 macOS vim 9.1 同样能跑

## 单测约定

- `packages/core/tests/*.test.ts`，node:test + tsx 跑（不引 vitest，保 CI 轻）
- 断言引擎语义（光标语义、count 组合、寄存器读写、undo 深度）
- 对拍属于 tools/fidelity，不算单测
