<script setup lang="ts">
import { loadLevel, useEngine } from '~/composables/useEngine'
import type { Level } from '@oh-my-vim/core'
import ModeRing from '~/components/game/ModeRing.vue'
import SyntaxBar from '~/components/game/SyntaxBar.vue'
import VimGrid from '~/components/game/VimGrid.vue'
import KeyCards from '~/components/game/KeyCards.vue'
import HudPanel from '~/components/game/HudPanel.vue'
import TermEcho from '~/components/game/TermEcho.vue'
import GolfScore from '~/components/game/GolfScore.vue'

const route = useRoute()
const level = ref<Level | null>(null)
const error = ref('')
let game: ReturnType<typeof useEngine> | null = null
let ready = false

onMounted(async () => {
  try {
    level.value = await loadLevel(`${route.params.chapter}/${route.params.level}`)
    game = useEngine(level.value)
    ready = true
    window.addEventListener('keydown', onKey)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const ARROW_TO_KEY: Record<string, string> = {
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
}

function onKey(e: KeyboardEvent) {
  if (!game.value) return
  if (e.ctrlKey || e.metaKey || e.altKey) {
    if (e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault()
      game.value.send('<C-r>')
    }
    return
  }
  let key: string
  if (e.key in ARROW_TO_KEY) key = ARROW_TO_KEY[e.key]
  else if (e.key === 'Escape') key = 'Esc'
  else if (e.key === 'Enter') key = 'Enter'
  else if (e.key === 'Backspace') key = 'Backspace'
  else if (e.key === 'Tab') key = 'Tab'
  else if (e.key === ' ') key = 'Space'
  else if (e.key.length === 1) key = e.key
  else return
  e.preventDefault()
  game.send(key)
}
</script>

<template>
  <main v-if="level && ready" class="play" tabindex="0" @keydown="onKey">
    <nav class="top">
      <NuxtLink to="/">← 章节</NuxtLink>
      <h1>{{ level.title }}</h1>
    </nav>
    <p class="desc">{{ level.description }}</p>
    <ModeRing :state="game.state.value" />
    <SyntaxBar :chunks="game.syntax.value" />
    <VimGrid :state="game.state.value" />
    <KeyCards :cards="level.cards ?? undefined" @send="game.send" />
    <div class="row">
      <HudPanel :state="game.state.value" />
      <div class="col">
        <TermEcho :state="game.state.value" />
        <GolfScore :strokes="game.state.value.keystrokes" :solution="level.solution" />
      </div>
    </div>
    <div v-if="game.won.value" class="modal">
      <h2>恭喜通关！🎉</h2>
      <p class="congrats">{{ level.congrats }}</p>
      <div class="modal-actions">
        <button class="ghost" @click="game.won.value = false">再练一遍</button>
        <NuxtLink class="next" to="/">下一关 →</NuxtLink>
      </div>
    </div>
  </main>
  <main v-else class="play loading">
    <p>{{ error || '正在加载…' }}</p>
    <NuxtLink to="/">← 返回章节</NuxtLink>
  </main>
</template>

<style scoped>
.play {
  max-width: 1000px;
  margin: auto;
  padding: 24px;
  display: grid;
  gap: 14px;
}

.top { display: flex; align-items: center; gap: 16px; }
.top h1 { font-size: 1.2rem; margin: 0; }
.top a { color: #a78bfa; }

.desc { white-space: pre-wrap; color: #cbd5e1; margin: 0; }

.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.col { display: grid; gap: 12px; align-content: start; }

.modal {
  position: fixed;
  inset: 25%;
  background: #312e81;
  border-radius: 20px;
  padding: 35px;
  text-align: center;
  z-index: 10;
  box-shadow: 0 20px 60px #000a;
}

.modal-actions { display: flex; gap: 16px; justify-content: center; margin-top: 18px; }
.ghost { background: transparent; border: 1px solid #a5b4fc; color: #c7d2fe; padding: 8px 18px; border-radius: 8px; cursor: pointer; }
.next { background: #7c3aed; color: #fff; padding: 8px 18px; border-radius: 8px; text-decoration: none; }
</style>
