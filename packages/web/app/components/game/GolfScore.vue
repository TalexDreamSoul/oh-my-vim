<script setup lang="ts">
import { computed } from 'vue'

type Props = { strokes: number; solution: string }
const props = defineProps<Props>()
const goldLine = computed(() => props.solution.length)
const silverLine = computed(() => Math.round(props.solution.length * 1.5))
const progress = computed(() => Math.min(100, Math.round((props.strokes / Math.max(silverLine.value, 1)) * 100)))
</script>

<template>
<section class="golf-panel" aria-label="击键计分">
  <div class="golf-heading"><span class="section-label">本关计分</span><span class="golf-flag">GOLF MODE</span></div>
  <div class="golf-values">
    <div><strong>{{ props.strokes }}</strong><span>当前点击</span></div>
    <div><strong class="gold-text">{{ goldLine }}</strong><span>金线</span></div>
    <div><strong class="silver-text">{{ silverLine }}</strong><span>银线</span></div>
  </div>
  <div class="golf-meter" aria-hidden="true"><span :style="{ width: `${progress}%` }"></span></div>
</section>
</template>
