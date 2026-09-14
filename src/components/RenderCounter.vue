<script setup lang="ts">
import { onUpdated, ref } from 'vue'

/**
 * 渲染计数器（独立子组件）。
 *
 * ⚠️ 这里有一个非常值得记住的坑：
 * onUpdated 里如果去改「会渲染到模板上的响应式数据」，就会变成
 *   渲染 → 改状态 → 又需要渲染 → onUpdated 再次触发 → …
 * 无限递归，Vue 会抛 "Maximum recursive updates exceeded"（本组件最初就是这么写错的）。
 *
 * 正确做法：渲染次数用「非响应式」变量累计，父组件需要展示时通过 defineExpose
 * 暴露的方法主动读取（或自己在 DevTools 里看）。
 */
const props = withDefaults(defineProps<{ label?: string; value?: number }>(), {
  label: '子组件',
  value: 0,
})

let renderTimes = 0 // ✅ 非响应式：写它不会触发重新渲染
const mountTime = new Date().toLocaleTimeString()
const reportedTimes = ref<number | null>(null) // 只由「主动上报」按钮写入

onUpdated(() => {
  renderTimes++
})

/** 暴露给父组件：读取已渲染次数（命令式，不参与响应式追踪） */
function report() {
  reportedTimes.value = renderTimes
  return renderTimes
}

defineExpose({ report, renderTimes: () => renderTimes })
</script>

<template>
  <div class="render-counter">
    <p class="kv">
      {{ props.label }}：挂载于 {{ mountTime }} ｜ 收到 value = <b>{{ props.value }}</b>
    </p>
    <p class="kv">
      父组件重渲染过 <b>{{ reportedTimes ?? '?' }}</b> 次（点右边按钮读取计数器）
      <button style="margin-left: 8px" @click="report()">读取</button>
    </p>
  </div>
</template>

<style scoped>
.render-counter {
  border: 1px dashed var(--c-info);
  border-radius: 8px;
  padding: 8px 10px;
  background: rgba(59, 130, 246, 0.07);
}
p {
  font-size: 12.5px;
  margin: 2px 0;
}
</style>
