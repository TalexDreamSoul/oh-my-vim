<script setup lang="ts">
import type { EngineState } from '@oh-my-vim/core'

defineProps<{ state: EngineState }>()
</script>

<template>
<div class="term-echo" role="status" aria-live="polite">
  <span class="term-led" aria-hidden="true"></span>
  <span class="term-message">{{ state.message || '等待你的下一步' }}</span>
  <span class="term-keys">{{ state.keystrokes }} 次点击</span>
</div>
</template>
