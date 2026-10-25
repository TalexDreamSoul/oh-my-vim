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
| `[setup]` `buffer` | ✅ | 初始 buffer，双引号包裹的单行文本（v1 不做多行，详见下文） |
| `[setup]` `cursor` | ✅ | 初始光标 `row,col`（0 基） |
| `[win]` | ✅ | 断言块，每行一条，支持 `buffer ==`、`cursor == r,c`、`keystrokes <= N` |
| `[solution]` | ✅ | 已知解按键序列（golf 金线依据；CI 可解性校验用） |
| `[congrats]` | ❌ | 通关彩蛋文案 |

## v1 明确不做（防蔓延）

- 不做 buffer 指针/分支等高级断言（`marks ==`、`register[a-z] ==` 留到 v2）
- 不做水平滚动/长行折叠
- 不做输入时校验 `solution` 必须通关——CI 跑「solution → 引擎回放 → win 断言」作为关卡可解性的**唯一**真值
- 多行 buffer v1.1 再开（`buffer` 换用 `\n` 转义的多行字段），首批关卡单行为主，最多加少量双行关卡在低层关卡白名单校验中保证

## 解析器契约

由 `packages/core/src/level.ts` 导出：
```ts
parseLevel(source: string): Level          // 抛 LevelParseError 时必须给出字段名
parseLevels(dir: string): Level[]          // 按 (chapter, 文件名自然排序) 排序
checkWin(level, result): { ok: boolean; failed: string[] }  // 回放 solution/玩家按键后判胜
```
`levels/sequence` 是保留文件（非目录），内容为以空格分隔的关卡 ID 有序列表，定义闯关顺序。
