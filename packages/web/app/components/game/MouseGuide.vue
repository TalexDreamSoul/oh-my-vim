<script setup lang="ts">
const props = defineProps<{
  lines: string[]
  selectedIndex: number | null
  hint: string
}>()

const emit = defineEmits<{
  pick: [character: string, index: number]
  clear: []
}>()

function displayCharacter(character: string): string {
  return character === ' ' ? '·' : character
}
</script>

<template>
  <section class="gesture-panel" aria-label="鼠标操作区">
    <div class="gesture-heading">
      <div>
        <span class="section-label">MOUSE PLAYGROUND</span>
        <h2>直接动文本</h2>
      </div>
      <span class="mouse-only"><span class="click-dot" aria-hidden="true"></span>不用键盘</span>
    </div>
    <p class="gesture-intro">点击字符定位，拖动一段文字进行选择，双击字符删除。需要插入时，先点目标文字，再点编辑器里的落点。</p>

    <div class="gesture-steps" aria-label="鼠标动作说明">
      <div><strong>01</strong><span>点击字符<small>移动光标</small></span></div>
      <div><strong>02</strong><span>拖动文字<small>进入选择</small></span></div>
      <div><strong>03</strong><span>双击字符<small>直接删除</small></span></div>
    </div>

    <div class="target-tray">
      <div class="target-heading"><span class="section-label">目标 buffer</span><span>先选要放入的字符</span></div>
      <div v-for="(line, lineIndex) in props.lines" :key="lineIndex" class="target-line">
        <button
          v-for="(character, index) in (line || ' ')"
          :key="`${lineIndex}-${index}`"
          class="target-character"
          :class="{ selected: props.selectedIndex === lineIndex * 1000 + index }"
          type="button"
          :aria-label="`目标字符 ${displayCharacter(character)}`"
          @click="emit('pick', character, lineIndex * 1000 + index)"
        >{{ displayCharacter(character) }}</button>
      </div>
    </div>

    <div class="gesture-status" :class="{ armed: props.selectedIndex !== null }">
      <span class="status-led" aria-hidden="true"></span>
      <span>{{ props.hint }}</span>
      <button v-if="props.selectedIndex !== null" type="button" @click="emit('clear')">清除</button>
    </div>
  </section>
</template>
