# `@oh-my-vim/fidelity`

保真对拍工具把同一条按键序列分别交给系统 Vim 和 `@oh-my-vim/core`，比较终态 buffer 与光标。它不修改工作区中的源码；每条用例都会输出 `PASS`、`FAIL` 或 `SKIP`，失败时同时打印 expected、Vim 和 core 的结果。

## 运行

在仓库根目录执行：

```bash
pnpm -C tools/fidelity install
pnpm -C tools/fidelity run fidelity
# 只跑某个文件
pnpm -C tools/fidelity run fidelity -- -u cases/basic.txt
```

本地需要可执行的 `vim`。Vim 使用 `-u NONE -i NONE -n --not-a-term -s` 启动，不读取用户配置；core 使用 `VimEngine` 的构造器和 `replay()` API。core 尚未能加载或单例抛出异常时，会在对应条目中明确标记 `SKIP`/`FAIL`，不会让整批用例崩溃。

## 用例格式

每个 `cases/*.txt` 文件一行一例，空行和以 `#` 开头的行会忽略：

```text
buffer|cursor|keys|expected_buffer|expected_cursor
```

- `buffer`、`expected_buffer` 是单行文字；多行用字面量 `\\n` 表示换行（例如 `one\\ntwo`）。制表符同理使用 `\\t`。
- `cursor` 和 `expected_cursor` 为 `row,col`，均为 **0 基**。
- `keys` 是 Vim 按键串，特殊键使用契约记号，例如 `<Esc>`、`<Enter>`、`<C-r>`、`<C-v>`。
- 字段之间使用 `|` 分隔，因此用例文字本身不应包含未转义的 `|`。

期望值同时用于验证两个引擎，并额外检查 Vim 与 core 的终态彼此一致。允许失败用例存在（例如两个实现仍在收敛中的边界语义），但报告必须保持可读并继续跑完整批次。
