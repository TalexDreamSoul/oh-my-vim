# 可视化设计契约（packages/web）

外壳的目标：把 core 的每一步中间状态画出来，让「为什么这样按」可见。

## 布局（关卡页）

```text
+----------------------------------------------------------+
| 模式环   [描述/教学文案区 Markdown 渲染]                    |
| (NORMAL 环形高亮，        +--------------------------+    |
|  模式切换时动画)          |  字符网格编辑器            |    |
|                          |  (buffer + cursor + 高亮)  |    |
|  语法条                   +--------------------------+
|  [数词3][动词d][名词w]     键帽卡牌区 (可点击/可拖)
|  实时拆解，未完成变灰      寄存器/标记 HUD
+----------------------------------------------------------+
| 终端区（真实按键回显 + : 命令）     golf 计分: 击键 N        |
+----------------------------------------------------------+
```

## 组件清单

| 组件 | 职责 | 数据源（core 导出） |
|---|---|---|
| `ModeRing.vue` | 模式环形图，当前模式高亮 + 切换动画 | `state.mode`, `pending` |
| `VimGrid.vue` | 字符网格：buffer、光标、选区/操作范围高亮 | `state.buffer/cursor/pending` |
| `SyntaxBar.vue` | 语法条：按键流拆成 [数词][动词][名词] 色块，awaiting 阶段灰色呼吸 | `engine.pendingSyntax()` |
| `KeyCards.vue` | 键帽卡牌：本关白名单键，点击=send(key) | level.cards |
| `HudPanel.vue` | 寄存器 + marks 实时值 | state.registers/marks |
| `TermEcho.vue` | 按键回显、: 命令行、message | state.message, keystrokes |
| `GolfScore.vue` | 击键数 vs 金线（solution 长度）vs 银线 | keystrokes, solution |

## 交互契约

- 真键盘：keydown → `engine.send(key)`；`preventDefault` 一切游戏白名单键，避免浏览器滚动等
- 卡牌点击 → `engine.send(key)`；无卡牌关卡仍可用真键盘
- 通关检测：每次 send 后 `checkWin(level, state)`，ok → 触发 congrats + 计分落 localStorage（`oh-my-vim/progress/<levelId>`）
- golf：金线 = `solution.length`，银线 = `solution.length * 1.5`（四舍五入）；HUD 展示两者
- 进度持久化：localStorage `oh-my-vim/progress` JSON：`{ [levelId]: { strokes, gold, silver } }`

## 视觉基调

- UnoCSS presetUno + presetIcons；深色为主、支持 light
- 字符网格用等宽字体（JetBrains Mono 系 fallback），buffer cell 尺寸 24px
- 语法条色块：数词紫、动词红、名词蓝、文本对象绿（与 README 教学文案呼应）

## 路由

- `/` 首页：章节列表 + 进度
- `/play/<chapter>/<level>` 关卡页
- `/play/<chapter>/<level>/done` 或页内弹层显示 congrats（v1 用弹层，简单）

## 技术约束

- Nuxt 4（nuxt ^4.x）+ @unocss/nuxt，SSR 关闭（`ssr: false`，纯客户端游戏），静态预渲染首页即可
- core 通过 workspace 协议引入：`"oh-my-vim-core": "workspace:*"`，构建用 Vite 正常打包
- 部署：`nuxt build`（或 `nuxi generate`）→ `.output/public` → CF Pages，root dir `packages/web`，build cmd `pnpm build`
