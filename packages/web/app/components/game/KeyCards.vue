<script setup lang="ts">
type CardInfo = { title: string; hint: string; tone: string }

const props = defineProps<{ cards?: string[]; mode?: string }>()
const emit = defineEmits<{ send: [key: string] }>()

const CARD_INFO: Record<string, CardInfo> = {
  h: { title: '向左移动', hint: '退一格', tone: 'move' },
  j: { title: '向下移动', hint: '下一行', tone: 'move' },
  k: { title: '向上移动', hint: '上一行', tone: 'move' },
  l: { title: '向右移动', hint: '进一格', tone: 'move' },
  w: { title: '下个词', hint: '跳到词首', tone: 'move' },
  b: { title: '上个词', hint: '回到词首', tone: 'move' },
  e: { title: '词尾', hint: '停在词末', tone: 'move' },
  '0': { title: '行首', hint: '回到第一个字符', tone: 'move' },
  '$': { title: '行尾', hint: '跳到最后一格', tone: 'move' },
  '^': { title: '第一个字', hint: '跳过空白', tone: 'move' },
  gg: { title: '文件开头', hint: '回到第一行', tone: 'move' },
  G: { title: '文件结尾', hint: '跳到最后一行', tone: 'move' },
  i: { title: '插入文字', hint: '光标前开始写', tone: 'insert' },
  a: { title: '追加文字', hint: '光标后开始写', tone: 'insert' },
  I: { title: '行首插入', hint: '从行首开始写', tone: 'insert' },
  A: { title: '行尾追加', hint: '从行尾开始写', tone: 'insert' },
  o: { title: '新开一行', hint: '向下插入', tone: 'insert' },
  O: { title: '上开一行', hint: '向上插入', tone: 'insert' },
  Esc: { title: '回到普通模式', hint: '结束输入', tone: 'escape' },
  x: { title: '删除字符', hint: '删掉光标下', tone: 'edit' },
  X: { title: '反向删除', hint: '删掉光标前', tone: 'edit' },
  dd: { title: '删除整行', hint: '删除当前行', tone: 'edit' },
  d: { title: '删除动词', hint: '等待一个范围', tone: 'edit' },
  c: { title: '改变动词', hint: '删除并进入插入', tone: 'edit' },
  r: { title: '替换字符', hint: '替换当前字符', tone: 'edit' },
  R: { title: '连续替换', hint: '进入替换模式', tone: 'edit' },
  s: { title: '替换并插入', hint: '删掉当前字符', tone: 'edit' },
  S: { title: '替换整行', hint: '删行并开始写', tone: 'edit' },
  y: { title: '复制动词', hint: '等待一个范围', tone: 'edit' },
  yy: { title: '复制整行', hint: '放入寄存器', tone: 'edit' },
  p: { title: '向后粘贴', hint: '放到光标后', tone: 'edit' },
  P: { title: '向前粘贴', hint: '放到光标前', tone: 'edit' },
  v: { title: '字符选择', hint: '进入可视模式', tone: 'select' },
  V: { title: '整行选择', hint: '选择当前行', tone: 'select' },
  'C-v': { title: '矩形选择', hint: '进入块选择', tone: 'select' },
  f: { title: '查找字符', hint: '向后搜索', tone: 'search' },
  F: { title: '反向查找', hint: '向前搜索', tone: 'search' },
  t: { title: '停在字符前', hint: '向后搜索', tone: 'search' },
  T: { title: '反向停靠', hint: '向前搜索', tone: 'search' },
  '/': { title: '搜索', hint: '输入目标文字', tone: 'search' },
  n: { title: '下个匹配', hint: '继续向后找', tone: 'search' },
  N: { title: '上个匹配', hint: '反向查找', tone: 'search' },
  '*': { title: '搜索当前词', hint: '查找同名词', tone: 'search' },
  ':': { title: '命令行', hint: '输入 Ex 命令', tone: 'command' },
  '%': { title: '跳到配对', hint: '括号间跳转', tone: 'move' },
  Enter: { title: '确认命令', hint: '提交当前输入', tone: 'command' },
}

const fallback = (key: string): CardInfo => ({ title: key.length === 1 ? `输入字符 ${key}` : 'Vim 动作', hint: key.length === 1 ? '写入当前 buffer' : '点击试试看', tone: 'insert' })
const infoFor = (key: string) => {
  if (props.mode === 'INSERT' && key.length === 1) return { title: `输入字符 ${key}`, hint: '写入当前 buffer', tone: 'insert' }
  return CARD_INFO[key] || fallback(key)
}
const displayKey = (key: string) => key.startsWith('C-') ? `⌃ ${key.slice(2)}` : key
</script>

<template>
<section class="command-deck" aria-label="可点击的 Vim 动作卡牌">
  <div class="deck-heading">
    <div>
      <span class="section-label">动作卡牌</span>
      <h2>点一下，马上看到结果</h2>
    </div>
    <span class="click-only"><span class="click-dot" aria-hidden="true"></span>不用键盘</span>
  </div>
  <p class="deck-intro">每张卡既是一个动作，也是一个小提示。按课程需要自由组合。</p>
  <div class="card-stack">
    <button
      v-for="(key, index) in cards || []"
      :key="`${key}-${index}`"
      class="command-card"
      :class="`tone-${infoFor(key).tone}`"
      type="button"
      :aria-label="`${key}：${infoFor(key).title}，${infoFor(key).hint}`"
      @click="emit('send', key)"
    >
      <span class="card-topline"><kbd>{{ displayKey(key) }}</kbd><span class="card-index">{{ String(index + 1).padStart(2, '0') }}</span></span>
      <strong>{{ infoFor(key).title }}</strong>
      <span>{{ infoFor(key).hint }}</span>
    </button>
  </div>
</section>
</template>
