<script setup lang="ts">
interface SyntaxChunk { text?: string; value?: string; key?: string; kind: string }

defineProps<{ chunks: SyntaxChunk[] }>()
</script>

<template>
<section class="syntax-panel" aria-label="Vim 命令轨迹">
  <div class="syntax-heading">
    <span class="section-label">命令轨迹</span>
    <span class="syntax-help">鼠标动作会在这里显示成 Vim 语法</span>
  </div>
  <div class="syntax-line">
    <span v-if="!chunks.length" class="syntax-empty">等待下一次鼠标动作…</span>
    <span v-for="(chunk, index) in chunks" v-else :key="`${chunk.kind}-${index}`" class="syntax-token" :class="`is-${chunk.kind}`">
      {{ chunk.text || chunk.value || chunk.key }}
    </span>
  </div>
</section>
</template>
