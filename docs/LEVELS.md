# 关卡格式 v1（ini）

每关一个无扩展名 ini 文件，路径即 ID：`levels/<chapter>/<level>`。镜像 oh-my-git 的 levels 目录约定，降低社区贡献门槛。

```ini
title = 动词 + 名词：d3w 删三个词
chapter = 1
cards = d, w, 3

[description]
Vim 的命令是一门语言：d 是动词「删」，w 是名词「一个词」，3 是数词「三次」。
把光标移到句首，试试 d3w。

[setup]
buffer = "the quick brown fox jumps over the lazy dog"
cursor = 0,0

[win]
buffer == "fox jumps over the lazy dog"
keystrokes <= 10

[solution]
d3w

[congrats]
注意 d3w 和 3dw 是等价的：Vim 里数词放动词前后都行。
```

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 关卡标题（中文） |
| `chapter` | ✅ | 章节号 1..N |
| `cards` | ❌ | 键帽卡牌白名单，逗号分隔（`d, w, 3`）；省略 = 该关禁用卡牌（挑战/徽章关） |
| `[description]` | ✅ | 教学正文（Markdown） |
| `[setup]` `buffer` | ✅ | 初始 buffer，双引号包裹；多行用 `\n` 转义（`"line1\nline2"`）；v1 仅 ASCII 内容 |
| `[setup]` `cursor` | ✅ | 初始光标 `row,col`（0 基） |
| `[win]` | ✅ | 断言块，每行一条：`buffer == "…"`（同样支持 `\n` 转义多行比较）、`cursor == r,c`、`keystrokes <= N` |
| `[solution]` | ✅ | 已知解按键序列（golf 金线依据；CI 可解性校验用） |
| `[congrats]` | ❌ | 通关彩蛋文案 |

## v1 明确不做（防蔓延）

- 不做 buffer 指针/分支等高级断言（`marks ==`、`register[a-z] ==` 留到 v2）
- 不做水平滚动/长行折叠
- 不做输入时校验 `solution` 必须通关——CI 跑「solution → 引擎回放 → win 断言」作为关卡可解性的**唯一**真值
- buffer v1 仅限 ASCII（规避 Vim 列号的字节/字符歧义），中文只出现在标题与教学文案；单行关卡为主，多行关卡不超过 3 行（章节 3/4 用）

## 解析器契约

浏览器安全入口 `packages/core/src/level.ts` 导出：
```ts
parseLevel(source: string): Level          // 抛 LevelParseError 时必须给出字段名
checkWin(level, result): { ok: boolean; failed: string[] }  // 回放 solution/玩家按键后判胜
```
Node/CI 内容工具从 `packages/core/src/levels-node.ts` 导出 `parseLevels(dir)`，按 `(chapter, 文件名自然排序)` 读取目录；不要从浏览器入口引入 `node:fs`。
`levels/sequence` 是保留文件（非目录），内容为以空格分隔的关卡 ID 有序列表，定义闯关顺序。
