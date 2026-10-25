<script setup lang="ts">
import { ref } from 'vue'
import type { EngineState } from '@oh-my-vim/core'

defineProps<{ state: EngineState }>()

const emit = defineEmits<{
  place: [row: number, col: number]
  remove: [row: number, col: number]
  select: [start: { row: number; col: number }, end: { row: number; col: number }]
}>()

const dragStart = ref<{ row: number; col: number } | null>(null)
const suppressClick = ref(false)

function beginDrag(row: number, col: number): void {
  dragStart.value = { row, col }
}

function finishDrag(row: number, col: number): void {
  if (!dragStart.value) return
  const start = dragStart.value
  dragStart.value = null
  if (start.row === row && start.col === col) return
  suppressClick.value = true
  emit('select', start, { row, col })
  window.setTimeout(() => { suppressClick.value = false }, 0)
}

function place(row: number, col: number): void {
  if (suppressClick.value) return
  emit('place', row, col)
}
</script>

<template>
  <section class="editor-shell" aria-label="可直接操作的 Vim 编辑缓冲区">
    <header class="editor-toolbar">
      <div class="file-name"><span class="file-dot" aria-hidden="true"></span><span>lesson-buffer.txt</span></div>
      <div class="editor-toolbar-right"><span>UTF-8</span><span>VIM</span></div>
    </header>
    <div class="editor-body">
      <div v-for="(line, row) in state.buffer" :key="row" class="editor-line">
        <span class="line-number">{{ String(row + 1).padStart(2, '0') }}</span>
        <span class="line-content">
          <span v-if="!line && state.cursor.row === row" class="cursor empty-cursor">·</span>
          <span
            v-for="(char, col) in (line || ' ')"
            :key="col"
            class="editor-char"
            :class="{ cursor: state.cursor.row === row && state.cursor.col === col }"
            role="gridcell"
            tabindex="-1"
            :aria-label="`第 ${row + 1} 行第 ${col + 1} 列，${char === ' ' ? '空格' : char}`"
            @pointerdown.stop="beginDrag(row, col)"
            @pointerup.stop="finishDrag(row, col)"
            @click.stop="place(row, col)"
            @dblclick.stop.prevent="emit('remove', row, col)"
          >{{ char === ' ' ? '·' : char }}</span>
        </span>
      </div>
    </div>
    <footer class="editor-footer">
      <span><i class="status-dot" aria-hidden="true"></i>缓冲区已连接</span>
      <span>点击定位 · 拖动选择 · 双击删除</span>
    </footer>
  </section>
</template>
