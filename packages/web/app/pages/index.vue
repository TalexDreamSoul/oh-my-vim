<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { LevelProgress } from '~/composables/useEngine'

type LevelItem = { id: string; title: string; progress?: LevelProgress }
const chapters = ref<Record<string, LevelItem[]>>({})
const loading = ref(true)

const firstLevel = computed(() => Object.values(chapters.value)[0]?.[0]?.id || '1/1.1')
const completedCount = computed(() => Object.values(chapters.value).flat().filter((item) => item.progress).length)
const totalCount = computed(() => Object.values(chapters.value).flat().length || 15)

onMounted(async () => {
  try {
    const sequence = await fetch('/levels/sequence').then((res) => res.text())
    const ids = sequence.trim().split(/\s+/).filter(Boolean)
    const saved: Record<string, LevelProgress> = JSON.parse(localStorage.getItem('oh-my-vim/progress') || '{}')
    for (const id of ids) {
      const source = await fetch(`/levels/${id}`).then((res) => res.text())
      const title = source.match(/^title\s*=\s*(.*)$/m)?.[1] ?? id
      const chapter = source.match(/^chapter\s*=\s*(\d+)/m)?.[1] ?? id.split('/')[0]
      ;(chapters.value[chapter] ??= []).push({ id, title, progress: saved[id] })
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="home-shell">
    <header class="home-bar">
      <NuxtLink to="/" class="brand-mark"><span>OH MY</span><strong>VIM</strong></NuxtLink>
      <span class="home-tagline">VISUAL VIM LESSONS</span>
      <span class="home-utility">点击卡牌学习 · 不用键盘</span>
    </header>

    <section class="home-hero">
      <div class="hero-copy">
        <span class="hero-kicker"><i></i> 一个可以点开的 Vim 游乐场</span>
        <h1>把 Vim 变成<br><em>动作卡牌。</em></h1>
        <p>别背命令。把动作点出来，看光标移动、模式切换、文字改变——每一次点击都对应真实 Vim 语法。</p>
        <div class="hero-actions">
          <NuxtLink class="hero-button" :to="`/play/${firstLevel}`">开始第一关 <span>→</span></NuxtLink>
          <span class="hero-note"><b></b>全程鼠标 / 触摸操作</span>
        </div>
      </div>

      <div class="hero-stage" aria-label="Vim 动作卡牌预览">
        <div class="stage-spark spark-one">✦</div>
        <div class="stage-spark spark-two">✦</div>
        <div class="demo-window">
          <div class="demo-bar"><span class="demo-lights"><i></i><i></i><i></i></span><span>lesson-buffer.txt</span><span>VIM</span></div>
          <div class="demo-code">
            <span class="demo-line"><b>01</b><span><mark>c</mark>at</span></span>
            <span class="demo-line"><b>02</b><span class="muted-line">点击一张卡，看看会发生什么</span></span>
            <span class="demo-line"><b>03</b><span>·</span></span>
          </div>
          <div class="demo-status"><span><i></i>NORMAL</span><span>点击动作卡继续</span></div>
        </div>
        <div class="demo-card card-coral"><kbd>h</kbd><span>向左移动</span></div>
        <div class="demo-card card-yellow"><kbd>i</kbd><span>开始写入</span></div>
        <div class="demo-card card-blue"><kbd>Esc</kbd><span>回到普通模式</span></div>
      </div>
    </section>

    <section class="curriculum" aria-labelledby="curriculum-title">
      <header class="curriculum-heading">
        <div><span class="hero-kicker"><i></i> 学习路线</span><h2 id="curriculum-title">从移动，到组合语法</h2></div>
        <div class="curriculum-progress"><strong>{{ completedCount }}</strong><span>/ {{ totalCount }} 关已探索</span></div>
      </header>

      <div v-if="loading" class="curriculum-loading">正在整理动作卡牌…</div>
      <div v-else class="chapter-list">
        <section v-for="(items, chapter) in chapters" :key="chapter" class="chapter-row">
          <div class="chapter-heading">
            <span class="chapter-number">0{{ chapter }}</span>
            <div><span>CHAPTER {{ chapter }}</span><h3>{{ items[0]?.title?.split('：')[0] || `第 ${chapter} 章` }}</h3></div>
          </div>
          <div class="level-grid">
            <NuxtLink v-for="(item, index) in items" :key="item.id" :to="`/play/${item.id}`" class="level-tile">
              <span class="tile-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="tile-copy"><strong>{{ item.title }}</strong><small>{{ item.progress ? `${item.progress.strokes} 次点击完成` : '点击进入练习' }}</small></span>
              <span v-if="item.progress" class="tile-badge" :class="{ gold: item.progress.gold }">{{ item.progress.gold ? '金' : item.progress.silver ? '银' : '✓' }}</span>
              <span v-else class="tile-arrow" aria-hidden="true">↗</span>
            </NuxtLink>
          </div>
        </section>
      </div>
    </section>

    <footer class="home-footer"><span>OH MY VIM / 2026</span><span>把命令变成动作，把动作变成直觉。</span></footer>
  </main>
</template>

<style scoped>
.home-shell { min-height: 100dvh; padding: 22px clamp(18px, 5vw, 84px) 34px; position: relative; overflow: hidden; }
.home-shell::after { content: ''; position: absolute; top: 320px; left: -90px; width: 210px; height: 70px; background: var(--accent-blue); opacity: 0.11; transform: rotate(25deg); pointer-events: none; }
.home-bar, .home-hero, .curriculum, .home-footer { width: min(1280px, 100%); margin-inline: auto; position: relative; z-index: 1; }
.home-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.home-tagline { color: var(--muted); font-size: 10px; letter-spacing: 0.14em; }
.home-utility { color: var(--ink-soft); font-size: 12px; }
.home-hero { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: clamp(30px, 7vw, 120px); align-items: center; padding: clamp(72px, 11vw, 140px) 0 110px; }
.hero-copy { max-width: 530px; }
.hero-kicker { display: inline-flex; align-items: center; gap: 8px; color: var(--accent-yellow); font-size: 11px; font-weight: 750; letter-spacing: 0.06em; }
.hero-kicker i { width: 8px; height: 8px; display: inline-block; background: var(--accent-coral); border-radius: 50%; }
.hero-copy h1 { margin: 18px 0 20px; color: var(--ink); font-size: clamp(45px, 6vw, 82px); line-height: 0.98; letter-spacing: -0.07em; text-wrap: balance; }
.hero-copy h1 em { color: var(--accent-coral); font-style: normal; }
.hero-copy p { max-width: 48ch; margin: 0; color: var(--muted); font-size: 16px; line-height: 1.75; }
.hero-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 18px; margin-top: 28px; }
.hero-button { display: inline-flex; align-items: center; gap: 20px; min-height: 48px; padding: 0 18px 0 20px; color: var(--ink-dark); background: var(--accent-coral); border-radius: 10px; font-size: 14px; font-weight: 800; text-decoration: none; transition: transform 160ms ease-out, background 160ms ease-out; }
.hero-button span { font-size: 20px; line-height: 0; }
.hero-button:hover { background: var(--accent-yellow); transform: translateY(-2px); }
.hero-note { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; }
.hero-note b { width: 7px; height: 7px; background: var(--accent-yellow); border-radius: 50%; }

.hero-stage { min-height: 440px; position: relative; display: grid; place-items: center; }
.hero-stage::before { content: ''; position: absolute; width: 80%; height: 76%; background: var(--plum); transform: rotate(-4deg); opacity: 0.7; }
.demo-window { width: min(480px, 90%); position: relative; z-index: 1; border: 1px solid var(--line-strong); border-radius: 14px; overflow: hidden; background: var(--surface-deep); box-shadow: 12px 14px 0 rgba(5, 4, 9, 0.35); transform: rotate(2deg); }
.demo-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; color: var(--muted); background: var(--surface-raised); font-family: var(--font-mono); font-size: 10px; }
.demo-lights { display: flex; gap: 5px; }.demo-lights i { width: 7px; height: 7px; background: var(--accent-coral); border-radius: 50%; }.demo-lights i:nth-child(2) { background: var(--accent-yellow); }.demo-lights i:nth-child(3) { background: var(--accent-blue); }
.demo-code { min-height: 220px; padding: 26px 22px; font-family: var(--font-mono); font-size: 14px; line-height: 2.1; }.demo-line { display: flex; gap: 18px; }.demo-line b { color: #756b86; font-size: 11px; font-weight: 500; }.demo-line mark { padding: 1px 4px; color: var(--ink-dark); background: var(--accent-yellow); }.muted-line { color: #756b86; }
.demo-status { display: flex; justify-content: space-between; padding: 10px 14px; color: var(--muted); border-top: 1px solid var(--line); font-family: var(--font-mono); font-size: 10px; }.demo-status span:first-child { color: var(--accent-yellow); }.demo-status i { display: inline-block; width: 6px; height: 6px; margin-right: 6px; background: var(--accent-yellow); border-radius: 50%; }
.demo-card { position: absolute; z-index: 2; display: grid; gap: 6px; width: 128px; padding: 12px; border: 2px solid var(--ink-dark); color: var(--ink-dark); box-shadow: 5px 6px 0 rgba(8, 5, 12, 0.45); transform: rotate(-8deg); }.demo-card kbd { font-family: var(--font-mono); font-size: 24px; font-weight: 900; }.demo-card span { font-size: 11px; font-weight: 800; }.card-coral { top: 55px; left: 2%; background: var(--accent-coral); }.card-yellow { right: 1%; bottom: 76px; background: var(--accent-yellow); transform: rotate(8deg); }.card-blue { bottom: 22px; left: 11%; color: var(--ink); background: var(--accent-blue); transform: rotate(-3deg); }.stage-spark { position: absolute; z-index: 3; color: var(--accent-yellow); font-size: 36px; }.spark-one { top: 34px; right: 15%; transform: rotate(12deg); }.spark-two { bottom: 30px; right: 7%; color: var(--accent-blue); font-size: 24px; }

.curriculum { padding-bottom: 52px; }.curriculum-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }.curriculum-heading h2 { margin: 11px 0 0; color: var(--ink); font-size: 32px; letter-spacing: -0.05em; }.curriculum-progress { display: flex; align-items: baseline; gap: 6px; color: var(--muted); font-size: 12px; }.curriculum-progress strong { color: var(--accent-yellow); font-family: var(--font-mono); font-size: 24px; }.curriculum-loading { padding: 36px 0; color: var(--muted); }.chapter-row { display: grid; grid-template-columns: 180px 1fr; gap: 26px; padding: 24px 0; border-bottom: 1px solid var(--line); }.chapter-heading { display: flex; gap: 12px; }.chapter-number { color: var(--accent-coral); font-family: var(--font-mono); font-size: 24px; font-weight: 800; }.chapter-heading span:not(.chapter-number) { color: var(--muted); font-size: 10px; letter-spacing: 0.1em; }.chapter-heading h3 { margin: 5px 0 0; color: var(--ink); font-size: 16px; letter-spacing: -0.02em; }.level-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }.level-tile { min-height: 110px; display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: start; padding: 14px; color: var(--ink); border: 1px solid var(--line); border-radius: 10px; background: var(--surface); text-decoration: none; transition: border-color 160ms ease-out, transform 160ms ease-out, background 160ms ease-out; }.level-tile:hover { border-color: var(--accent-coral); background: var(--surface-raised); transform: translateY(-3px); }.tile-number { color: var(--muted); font-family: var(--font-mono); font-size: 11px; }.tile-copy { display: grid; gap: 8px; }.tile-copy strong { font-size: 13px; line-height: 1.35; }.tile-copy small { color: var(--muted); font-size: 11px; }.tile-arrow, .tile-badge { color: var(--accent-yellow); font-family: var(--font-mono); font-size: 12px; }.tile-badge.gold { color: var(--accent-coral); }.home-footer { display: flex; justify-content: space-between; gap: 16px; padding-top: 18px; color: var(--muted); font-family: var(--font-mono); font-size: 10px; }

@media (max-width: 900px) { .home-hero { grid-template-columns: 1fr; padding-top: 76px; }.hero-stage { min-height: 390px; max-width: 620px; }.chapter-row { grid-template-columns: 1fr; gap: 16px; }.level-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 620px) { .home-shell { padding-inline: 14px; }.home-tagline { display: none; }.home-utility { font-size: 10px; }.home-hero { padding: 58px 0 64px; }.hero-copy h1 { font-size: 50px; }.hero-copy p { font-size: 14px; }.hero-stage { min-height: 320px; transform: scale(0.9); transform-origin: center; margin-inline: -18px; }.demo-window { width: 92%; }.level-grid { grid-template-columns: 1fr; }.level-tile { min-height: 78px; align-items: center; }.curriculum-heading { align-items: start; flex-direction: column; }.curriculum-heading h2 { font-size: 27px; }.home-footer { flex-direction: column; }.win-card { padding: 26px 20px; } }
@media (prefers-reduced-motion: reduce) { .hero-button, .level-tile { transition: none; } }
</style>
