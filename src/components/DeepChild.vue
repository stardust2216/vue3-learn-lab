<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { CounterKey, ThemeKey } from './injectionKeys'

/**
 * 孙组件（或者任意深度的后代）：不需要知道中间隔了多少层，直接 inject。
 * 第二个参数是默认值：没有祖先 provide 时就返回它，避免 undefined 崩溃。
 */
const themeCtx = inject(ThemeKey) // 可能为 undefined
const counter = inject(CounterKey, {
  // 默认值：一个「孤儿」上下文，保证组件单独使用时也能跑
  count: ref(0),
  increment: () => console.warn('没有祖先提供 CounterContext'),
  reset: () => {},
})

const level = computed(() => (themeCtx ? '找到祖先提供的 ThemeContext ✅' : '没找到，用默认值 ⚠️'))
</script>

<template>
  <div class="deep">
    <p><b>孙组件 DeepChild</b>（中间没有经过任何 props / emit）</p>
    <p class="kv">{{ level }}</p>

    <div class="row" style="margin-top: 6px">
      <span class="tag">theme = {{ themeCtx?.theme.value ?? 'light（默认）' }}</span>
      <button @click="themeCtx?.toggle()">在孙组件里切换主题</button>
      <span class="tag info">primary = {{ themeCtx?.primary.value ?? '默认色' }}</span>
    </div>

    <div class="row" style="margin-top: 6px">
      <span class="tag pass">counter.count = {{ counter.count.value }}</span>
      <button @click="counter.increment(2)">+2</button>
      <button @click="counter.reset()">reset</button>
    </div>
  </div>
</template>

<style scoped>
.deep {
  border: 1px dashed var(--c-info);
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.08);
}
p {
  margin: 2px 0;
  font-size: 13px;
}
</style>
