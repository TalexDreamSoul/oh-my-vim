<script setup lang="ts">
import type { EngineState } from '@oh-my-vim/core'

defineProps<{ state: EngineState }>()
</script>

<template>
<section class="editor-shell" aria-label="Vim 编辑缓冲区">
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
        >{{ char === ' ' ? '·' : char }}</span>
      </span>
    </div>
  </div>
  <footer class="editor-footer">
    <span><i class="status-dot" aria-hidden="true"></i>缓冲区已连接</span>
    <span>用右侧卡牌继续</span>
  </footer>
</section>
</template>
