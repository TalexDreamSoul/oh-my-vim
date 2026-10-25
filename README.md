# Oh My Vim — 中文 Vim 可视化学习游戏

面向中文学习者的 Vim 教学项目：把 Vim 的「按键语法」画出来，用关卡和最少击键计分（golf 化）教会你真 Vim。

- 在线玩：<https://ohmyvim.pages.dev>（CF Pages）
- 免费、开源、纯静态部署（Cloudflare Pages）
- 中文优先；英文文档随后跟进

## 项目构成

| 目录 | 说明 |
|---|---|
| `packages/core` | 纯 TypeScript Vim 教学内核（无 DOM 依赖） |
| `packages/web` | Nuxt 4 + UnoCSS 可视化游戏外壳 |
| `tools/fidelity` | 保真对拍基建：core vs `vim -u NONE` |
| `levels/` | ini 格式关卡（5 章 15 关起步） |
| `docs/` | 契约文档：内核 API、关卡格式、可视化设计 |

## 快速开始

```bash
pnpm install
pnpm -r test        # 内核单测 + 关卡可解性
pnpm fidelity       # 对拍：>=50 条用例 vs vim -u NONE
pnpm build          # 构建 web
pnpm dev            # 本地开发 http://localhost:3000
```

## 教学设计

Vim 命令是一门语言：**动词**（d 删、c 改、y 复制）+ **名词**（w 词、$ 行尾、i" 引号内）+ **数词**（3 三次）。
游戏把每次按键实时拆解成语法条，配合模式环、键帽卡牌、寄存器/标记 HUD，让「为什么这样按」看得见。

## 与其他项目的关系

本项目玩法与教学思路受 **Oh My Git!**（可视化 Git 学习游戏）与 Vim Adventures 启发，但：
- 与 Vim Adventures 无任何组织、维护、发布、品牌、赞助或支持关系；
- 与原 Oh My Git! 项目无组织、维护、发布、品牌、赞助或支持关系；
- 仓库中的 Issue、PR、Release、部署和路线图只服务于本项目。

## 贡献

欢迎提交 Issue 或 Pull Request：新关卡请先阅读 `docs/LEVELS.md`（关卡格式）与 `levels/README.md`，CI 会自动校验关卡可解性。

## 许可证

AGPL-3.0。见 `LICENSE`。
