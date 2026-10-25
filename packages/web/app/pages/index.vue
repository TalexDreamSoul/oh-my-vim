<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { LevelProgress } from '~/composables/useEngine'

const chapters = ref<Record<string, { id: string; title: string; progress?: LevelProgress }[]>>({})

onMounted(async () => {
  try {
    const seq = await fetch('/levels/sequence').then((r) => r.text())
    const ids = seq.trim().split(/\s+/)
    const saved: Record<string, LevelProgress> = JSON.parse(localStorage.getItem('oh-my-vim/progress') || '{}')
    for (const id of ids) {
      const source = await fetch(`/levels/${id}`).then((r) => r.text())
      const title = source.match(/^title\s*=\s*(.*)$/m)?.[1] ?? id
      const chapter = source.match(/^chapter\s*=\s*(\d+)/m)?.[1] ?? id.split('/')[0]
      ;(chapters.value[chapter] ??= []).push({ id, title, progress: saved[id] })
    }
  } catch {
    /* 首页降级：留空章节列表 */
  }
})
</script>

<template>
  <main class="wrap">
    <header class="hero">
      <h1>Oh My Vim</h1>
      <p>把 Vim 的按键语法画出来，用关卡和最少击键学会真 Vim。</p>
    </header>
    <section v-for="(items, ch) in chapters" :key="ch" class="chapter">
      <h2>第 {{ ch }} 章</h2>
      <NuxtLink
        v-for="l in items"
        :key="l.id"
        :to="`/play/${l.id}`"
        class="level"
      >
        <span class="name">{{ l.title }}</span>
        <span v-if="l.progress" class="badge" :class="{ gold: l.progress.gold }">
          {{ l.progress.gold ? '🥇' : l.progress.silver ? '🥈' : '✓' }} {{ l.progress.strokes }} 键
        </span>
      </NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.wrap { max-width: 900px; margin: auto; padding: 32px 24px; display: grid; gap: 22px; }
.hero h1 { margin: 0; font-size: 2rem; }
.hero p { color: #94a3b8; margin: 6px 0 0; }
.chapter { display: grid; gap: 8px; }
.chapter h2 { font-size: 1rem; color: #a78bfa; margin: 0 0 4px; }
.level { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1px solid #334155; border-radius: 10px; text-decoration: none; color: #e2e8f0; background: #0f172a; }
.level:hover { border-color: #7c3aed; transform: translateX(4px); }
.badge { color: #fbbf24; font-size: 0.85rem; }
.badge.gold { color: #fde047; }
</style>
