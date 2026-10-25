<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { Level } from '@oh-my-vim/core'
import ModeRing from '~/components/game/ModeRing.vue'
import SyntaxBar from '~/components/game/SyntaxBar.vue'
import VimGrid from '~/components/game/VimGrid.vue'
import MouseGuide from '~/components/game/MouseGuide.vue'
import HudPanel from '~/components/game/HudPanel.vue'
import TermEcho from '~/components/game/TermEcho.vue'
import GolfScore from '~/components/game/GolfScore.vue'
import { loadLevel, useEngine } from '~/composables/useEngine'

type Cell = { row: number; col: number }

const route = useRoute()
const level = ref<Level | null>(null)
const sequenceIds = ref<string[]>([])
const nextId = ref('')
const currentIndex = ref(0)
const loading = ref(true)
const error = ref('')
const game = shallowRef<ReturnType<typeof useEngine> | null>(null)
const pendingChar = ref('')
const selectedTargetIndex = ref<number | null>(null)
const interactionHint = ref('点击字符定位；拖动文字选择；双击字符删除')

const chapterNumber = computed(() => String(route.params.chapter).padStart(2, '0'))
const lessonNumber = computed(() => String(currentIndex.value + 1).padStart(2, '0'))
const totalLevels = computed(() => sequenceIds.value.length || 15)
const progressWidth = computed(() => `${Math.max(8, ((currentIndex.value + 1) / totalLevels.value) * 100)}%`)
const nextHref = computed(() => nextId.value ? `/play/${nextId.value}` : '/')
const isLast = computed(() => !nextId.value)
const targetBuffer = computed(() => {
  const assertion = level.value?.win.find((item) => item.kind === 'buffer')
  return assertion?.kind === 'buffer' ? assertion.value : level.value?.setup.buffer ?? []
})

function startGame(): void {
  if (level.value) {
    game.value = useEngine(level.value)
    pendingChar.value = ''
    selectedTargetIndex.value = null
    interactionHint.value = '点击字符定位；拖动文字选择；双击字符删除'
  }
}

function movementSequence(from: Cell, to: Cell): string {
  const keys: string[] = []
  const vertical = to.row - from.row
  const horizontal = to.col - from.col
  if (vertical > 0) keys.push(...Array.from({ length: vertical }, () => 'j'))
  if (vertical < 0) keys.push(...Array.from({ length: -vertical }, () => 'k'))
  if (horizontal > 0) keys.push(...Array.from({ length: horizontal }, () => 'l'))
  if (horizontal < 0) keys.push(...Array.from({ length: -horizontal }, () => 'h'))
  return keys.join('')
}

function normalPrefix(): string {
  return game.value?.state.value.mode === 'NORMAL' ? '' : '<Esc>'
}

function moveTo(cell: Cell): void {
  const state = game.value?.state.value
  if (!state) return
  const sequence = normalPrefix() + movementSequence(state.cursor, cell)
  if (sequence) game.value?.send(sequence)
  interactionHint.value = `光标已定位到第 ${cell.row + 1} 行第 ${cell.col + 1} 列`
}

function pickTargetCharacter(character: string, index: number): void {
  pendingChar.value = character
  selectedTargetIndex.value = index
  interactionHint.value = `已选中「${character === ' ' ? '空格' : character}」，点击编辑器里的落点`
}

function clearTargetCharacter(): void {
  pendingChar.value = ''
  selectedTargetIndex.value = null
  interactionHint.value = '点击字符定位；拖动文字选择；双击字符删除'
}

function placeEditorCell(row: number, col: number): void {
  const state = game.value?.state.value
  if (!state) return
  if (pendingChar.value) {
    const inserted = pendingChar.value === ' ' ? ' ' : pendingChar.value
    game.value?.send(`${normalPrefix()}${movementSequence(state.cursor, { row, col })}i${inserted}<Esc>`)
    interactionHint.value = `已把「${inserted === ' ' ? '空格' : inserted}」放入第 ${row + 1} 行`
    clearTargetCharacter()
    return
  }
  moveTo({ row, col })
}

function removeEditorCell(row: number, col: number): void {
  const state = game.value?.state.value
  if (!state) return
  game.value?.send(`${normalPrefix()}${movementSequence(state.cursor, { row, col })}x`)
  interactionHint.value = `已移除第 ${row + 1} 行的字符`
}

function selectEditorRange(start: Cell, end: Cell): void {
  const state = game.value?.state.value
  if (!state) return
  game.value?.send(`${normalPrefix()}${movementSequence(state.cursor, start)}v${movementSequence(start, end)}`)
  interactionHint.value = `已选择第 ${start.row + 1} 行到第 ${end.row + 1} 行的范围`
}

function closeWin(): void {
  if (game.value) game.value.won.value = false
}

onMounted(async () => {
  try {
    const id = `${String(route.params.chapter)}/${String(route.params.level)}`
    level.value = await loadLevel(id)
    const sequence = await fetch('/levels/sequence').then((res) => res.text())
    sequenceIds.value = sequence.trim().split(/\s+/).filter(Boolean)
    currentIndex.value = Math.max(0, sequenceIds.value.indexOf(id))
    nextId.value = sequenceIds.value[currentIndex.value + 1] ?? ''
    startGame()
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : '关卡加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main v-if="level && game" class="play-shell">
    <header class="app-bar">
      <NuxtLink to="/" class="brand-mark" aria-label="返回 Oh My Vim 首页">
        <span>OH MY</span><strong>VIM</strong>
      </NuxtLink>
      <div class="breadcrumb">
        <span>第 {{ chapterNumber }} 章</span><i>/</i><span>练习 {{ lessonNumber }} / {{ totalLevels }}</span>
      </div>
      <NuxtLink to="/" class="exit-link">返回课程 <span aria-hidden="true">↗</span></NuxtLink>
    </header>

    <div class="game-layout">
      <aside class="lesson-rail">
        <div class="rail-kicker">VIM / PLAYGROUND</div>
        <div class="lesson-count"><strong>{{ lessonNumber }}</strong><span>of {{ String(totalLevels).padStart(2, '0') }}</span></div>
        <div class="lesson-progress"><span :style="{ width: progressWidth }"></span></div>
        <h1>{{ level.title }}</h1>
        <p class="lesson-description">{{ level.description }}</p>

        <div class="mission-card">
          <span class="mission-label">本关目标</span>
          <strong>让 buffer 变成你想要的样子</strong>
          <p>直接在编辑器里点、拖、双击，系统会把你的动作翻译成 Vim 语法。</p>
        </div>

        <div class="click-note"><span class="click-dot" aria-hidden="true"></span><span>只用鼠标 / 触摸<br>不用实体键盘</span></div>
        <ModeRing :state="game.state.value" />
      </aside>

      <section class="workspace" aria-label="Vim 学习工作台">
        <div class="workspace-heading">
          <div>
            <span class="workspace-kicker">LIVE BUFFER</span>
            <h2>直接在文本上操作</h2>
          </div>
          <TermEcho :state="game.state.value" />
        </div>
        <SyntaxBar :chunks="game.syntax.value" />
        <VimGrid
          :state="game.state.value"
          @place="placeEditorCell"
          @remove="removeEditorCell"
          @select="selectEditorRange"
        />
        <div class="workspace-lower">
          <HudPanel :state="game.state.value" />
          <GolfScore :strokes="game.state.value.keystrokes" :solution="level.solution" />
        </div>
      </section>

      <MouseGuide
        :lines="targetBuffer"
        :selected-index="selectedTargetIndex"
        :hint="interactionHint"
        @pick="pickTargetCharacter"
        @clear="clearTargetCharacter"
      />
    </div>

    <div v-if="game.won.value" class="win-overlay" role="presentation" @click.self="closeWin">
      <article class="win-card" role="dialog" aria-modal="true" aria-labelledby="win-title">
        <div class="win-mark" aria-hidden="true">✓</div>
        <span class="section-label">LESSON COMPLETE</span>
        <h2 id="win-title">这一关，已经在手里。</h2>
        <p>{{ level.congrats }}</p>
        <div class="win-stats">
          <div><strong>{{ game.state.value.keystrokes }}</strong><span>次点击</span></div>
          <div><strong>{{ game.state.value.mode }}</strong><span>结束模式</span></div>
          <div><strong>{{ lessonNumber }}</strong><span>当前练习</span></div>
        </div>
        <div class="win-actions">
          <button type="button" class="button secondary" @click="startGame">再玩一遍</button>
          <NuxtLink class="button primary" :to="nextHref">{{ isLast ? '回到课程' : '下一关 →' }}</NuxtLink>
        </div>
      </article>
    </div>
  </main>

  <main v-else class="loading-shell">
    <span class="brand-mark"><span>OH MY</span><strong>VIM</strong></span>
    <p>{{ error || '正在准备你的练习场…' }}</p>
    <NuxtLink to="/">返回课程</NuxtLink>
  </main>
</template>

<style scoped>
.play-shell {
  min-height: 100dvh;
  padding: 22px clamp(18px, 4vw, 64px) 56px;
  position: relative;
  overflow: hidden;
}

.play-shell::before {
  content: '';
  position: absolute;
  width: 300px;
  height: 110px;
  top: 150px;
  right: -100px;
  background: var(--accent-yellow);
  opacity: 0.14;
  transform: rotate(-12deg);
  pointer-events: none;
}

.app-bar,
.game-layout {
  width: min(1460px, 100%);
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 44px;
}

.brand-mark {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  color: var(--ink);
  text-decoration: none;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.brand-mark strong {
  color: var(--accent-coral);
  font-size: 19px;
  letter-spacing: -0.04em;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.breadcrumb i { color: var(--line-strong); font-style: normal; }
.exit-link { color: var(--muted); font-size: 12px; text-decoration: none; }
.exit-link:hover { color: var(--ink); }

.game-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(420px, 1.7fr) minmax(260px, 0.95fr);
  gap: 18px;
  align-items: start;
  margin-top: 28px;
}

.lesson-rail,
.workspace,
.gesture-panel {
  min-width: 0;
  border: 1px solid var(--line);
  background: var(--surface);
}

.lesson-rail {
  padding: 25px 22px 22px;
  border-radius: 18px;
  position: sticky;
  top: 20px;
}

.rail-kicker,
.workspace-kicker,
.mission-label,
.section-label {
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.lesson-count {
  display: flex;
  align-items: end;
  gap: 7px;
  margin-top: 26px;
}

.lesson-count strong {
  color: var(--accent-yellow);
  font-family: var(--font-mono);
  font-size: 44px;
  line-height: 0.9;
  letter-spacing: -0.08em;
}

.lesson-count span { color: var(--muted); font-family: var(--font-mono); font-size: 12px; padding-bottom: 3px; }
.lesson-progress { height: 4px; margin: 14px 0 24px; background: var(--line); overflow: hidden; }
.lesson-progress span { display: block; height: 100%; background: var(--accent-coral); transition: width 250ms ease-out; }
.lesson-rail h1 { max-width: 15ch; margin: 0; color: var(--ink); font-size: 25px; line-height: 1.12; letter-spacing: -0.04em; text-wrap: balance; }
.lesson-description { margin: 14px 0 20px; color: var(--muted); font-size: 13px; line-height: 1.75; white-space: pre-wrap; }

.mission-card {
  padding: 15px;
  background: var(--surface-raised);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.mission-card strong { display: block; margin-top: 8px; color: var(--ink); font-size: 14px; line-height: 1.35; }
.mission-card p { margin: 8px 0 0; color: var(--muted); font-size: 12px; line-height: 1.55; }
.click-note { display: flex; gap: 9px; align-items: center; margin: 20px 0 23px; color: var(--ink-soft); font-size: 12px; line-height: 1.4; }
.click-dot { display: inline-block; width: 8px; height: 8px; flex: 0 0 auto; background: var(--accent-yellow); border-radius: 50%; box-shadow: 0 0 0 4px rgba(242, 211, 79, 0.12); }

.workspace { padding: 20px; border-radius: 18px; background: var(--surface-deep); }
.workspace-heading { display: flex; justify-content: space-between; align-items: start; gap: 18px; margin-bottom: 16px; }
.workspace-heading h2 { margin: 6px 0 0; color: var(--ink); font-size: 18px; letter-spacing: -0.03em; }
.workspace-heading :deep(.term-echo) { min-width: 190px; }
.workspace-lower { display: grid; grid-template-columns: minmax(170px, 0.9fr) minmax(220px, 1.1fr); gap: 12px; margin-top: 12px; }

.win-overlay { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 24px; background: rgba(13, 10, 21, 0.76); }
.win-card { width: min(470px, 100%); padding: 34px; border: 1px solid var(--line-strong); border-radius: 18px; background: var(--surface-bright); text-align: center; box-shadow: 0 8px 0 rgba(0, 0, 0, 0.25); }
.win-mark { display: grid; place-items: center; width: 48px; height: 48px; margin: 0 auto 18px; color: var(--ink-dark); background: var(--accent-yellow); border-radius: 12px; font-size: 28px; font-weight: 900; transform: rotate(-5deg); }
.win-card h2 { margin: 12px 0 8px; color: var(--ink); font-size: 28px; letter-spacing: -0.05em; }
.win-card p { margin: 0; color: var(--muted); line-height: 1.6; }
.win-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 24px 0; }
.win-stats div { padding: 12px 8px; background: var(--surface-raised); border-radius: 10px; }
.win-stats strong { display: block; color: var(--accent-yellow); font-family: var(--font-mono); font-size: 18px; }
.win-stats span { display: block; margin-top: 4px; color: var(--muted); font-size: 10px; }
.win-actions { display: flex; justify-content: center; gap: 10px; }
.button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 16px; border-radius: 9px; font-size: 13px; font-weight: 750; text-decoration: none; cursor: pointer; transition: transform 160ms ease-out, background 160ms ease-out; }
.button:hover { transform: translateY(-2px); }
.button.primary { color: var(--ink-dark); background: var(--accent-coral); }
.button.secondary { color: var(--ink); background: var(--surface-raised); border: 1px solid var(--line-strong); }

.loading-shell { min-height: 100dvh; display: grid; place-content: center; justify-items: center; gap: 14px; color: var(--muted); }
.loading-shell a { color: var(--accent-yellow); }

@media (max-width: 1120px) {
  .game-layout { grid-template-columns: minmax(190px, 0.75fr) minmax(0, 1.65fr); }
  .gesture-panel { grid-column: 1 / -1; }
}

@media (max-width: 760px) {
  .play-shell { padding: 16px 14px 36px; }
  .app-bar { align-items: flex-start; }
  .breadcrumb { display: none; }
  .game-layout { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
  .lesson-rail, .workspace, .gesture-panel { width: 100%; }
  .lesson-rail { position: static; padding: 20px; }
  .lesson-rail h1 { max-width: none; font-size: 24px; }
  .lesson-rail :deep(.mode-panel) { margin-top: 20px; }
  .workspace { padding: 14px; }
  .workspace-heading { display: block; }
  .workspace-heading :deep(.term-echo) { margin-top: 13px; }
  .workspace-lower { grid-template-columns: 1fr; }
  .win-card { padding: 26px 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .lesson-progress span, .button { transition: none; }
}
</style>
