<script setup lang="ts">
import DeepChild from './DeepChild.vue'

/**
 * 中间层：它不认识任何 props / emit / inject，
 * 只是把孙组件渲染出来 —— 这正是 provide / inject 存在的意义：
 * 让跨层级通信不必经过中间层。
 */
</script>

<template>
  <div class="middle">
    <p class="kv">我是中间层 MiddleLayer：没有 props、没有 emit、没有 inject，只是渲染子组件 ↓</p>
    <DeepChild />
  </div>
</template>

<style scoped>
.middle {
  border: 1px solid var(--c-border);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--c-surface);
}
p {
  margin: 0 0 4px;
  font-size: 12.5px;
}
</style>
