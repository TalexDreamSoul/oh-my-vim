<script setup lang="ts">
import type { EngineState } from '@oh-my-vim/core'

defineProps<{ state: EngineState }>()

function formatJson(value: Record<string, string>): string {
  return JSON.stringify(value, null, 2)
}
</script>

<template>
<section class="state-panel" aria-label="Vim 状态">
  <div class="state-block">
    <div class="state-title"><span class="state-icon">"</span>寄存器</div>
    <pre>{{ formatJson(state.registers) }}</pre>
  </div>
  <div class="state-block">
    <div class="state-title"><span class="state-icon">✦</span>标记</div>
    <pre>{{ formatJson(state.marks) }}</pre>
  </div>
</section>
</template>
