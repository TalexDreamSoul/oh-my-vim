<script setup lang="ts">
import type { EngineState } from '@oh-my-vim/core'

defineProps<{ state: EngineState }>()

const modes = [
  { id: 'NORMAL', label: '普通', hint: '移动与命令' },
  { id: 'INSERT', label: '插入', hint: '写入文字' },
  { id: 'VISUAL', label: '可视', hint: '选择范围' },
  { id: 'CMDLINE', label: '命令', hint: '执行指令' },
]
</script>

<template>
<aside class="mode-panel" aria-label="当前 Vim 模式">
  <div class="section-label">当前模式</div>
  <div class="mode-list">
    <div v-for="mode in modes" :key="mode.id" class="mode-item" :class="{ active: state.mode === mode.id }">
      <span class="mode-light" aria-hidden="true"></span>
      <span class="mode-name">{{ mode.label }}</span>
      <span class="mode-id">{{ mode.id }}</span>
      <span class="mode-hint">{{ mode.hint }}</span>
    </div>
  </div>
</aside>
</template>
