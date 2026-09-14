<script setup lang="ts">
import { ref } from 'vue'

/** 一个「体积较大」的组件，用于演示异步加载时的 loading / error / delay 状态 */
const loadedAt = ref(new Date().toLocaleTimeString())
const props = defineProps<{ message?: string }>()
</script>

<template>
  <div class="lazy">
    <p><b>异步组件已加载 ✅</b>（{{ loadedAt }}）</p>
    <p class="kv">{{ props.message ?? '我是通过 defineAsyncComponent 动态 import 进来的' }}</p>
    <p class="hint">
      在网络面板里能看到一个新的 js chunk 被请求 —— 这就是「按需加载」的价值：
      首屏不需要它的用户永远不用下载。
    </p>
  </div>
</template>

<style scoped>
.lazy {
  border: 1px solid var(--c-primary);
  border-radius: 10px;
  padding: 12px 14px;
  background: rgba(66, 184, 131, 0.08);
}
p {
  margin: 2px 0;
}
</style>
