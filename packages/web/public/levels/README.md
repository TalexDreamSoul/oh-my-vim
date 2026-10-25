# 关卡贡献指南

每个关卡是一个无扩展名 ini 文件，路径就是关卡 ID，例如 `levels/2/2.1` 对应 `2/2.1`。请先阅读 [`docs/LEVELS.md`](../docs/LEVELS.md)，严格保留 `title`、`chapter`、`[description]`、`[setup]`、`[win]`、`[solution]` 等字段格式。

## 编写约定

- `setup.buffer` 只能使用 ASCII；多行写成 `\n` 转义，最多三行；`cursor` 使用从 0 开始的 `row,col`。
- `description` 用中文解释动词、数词、名词（动作范围）如何组合；`solution` 必须是可直接回放的真实按键序列，不要写不确定的命令。
- `[win]` 至少包含精确的 `buffer == "..."` 和 `keystrokes <= N`。金线按 solution 的按键数计算，再给不超过 1.5 倍的容错；需要时也可断言光标。
- 普通关卡列出 `cards` 白名单；挑战关可以省略。新增关卡后，把相同的 `chapter/file` ID 加到 `levels/sequence`，不要重复。

## 提交前检查

在仓库根目录运行：

```sh
pnpm check:levels
```

该检查会按 solution 回放每一关，并验证最终 buffer、光标（如有）和按键上限。请同时手动从 setup 模拟 solution，确认文案描述的每一步与实际结果一致。
