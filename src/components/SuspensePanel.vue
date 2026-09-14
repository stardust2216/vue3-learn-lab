<script setup lang="ts">
import { ref } from 'vue'

/**
 * Suspense 演示组件：<script setup> 里使用「顶层 await」。
 *
 * 顶层 await 会让这个组件变成异步组件（async setup），
 * 必须由 <Suspense> 包裹，否则父组件渲染会报错。
 * 好处：不需要自己维护 loading 状态 —— 数据没回来时不渲染，Suspense 显示 fallback。
 */
const props = defineProps<{ delay?: number; fail?: boolean }>()

await new Promise((r) => setTimeout(r, props.delay ?? 1200))
if (props.fail) throw new Error('模拟：远程数据加载失败')

// 模拟请求回来的数据
const user = ref({ name: '异步用户', score: 88, fetchedAt: new Date().toLocaleTimeString() })
</script>

<template>
  <div class="susp">
    <p><b>Suspense 内容已就绪 ✅</b></p>
    <p class="kv">name = {{ user.name }} ｜ score = {{ user.score }}</p>
    <p class="kv">数据获取时间：{{ user.fetchedAt }}</p>
    <p class="hint">
      注意：在 await 之前不能访问 DOM / 注册生命周期钩子；onMounted 会在数据就绪、组件真正挂载后才执行。
    </p>
  </div>
</template>

<style scoped>
.susp {
  border: 1px solid var(--c-info);
  border-radius: 10px;
  padding: 12px 14px;
  background: rgba(59, 130, 246, 0.08);
}
p {
  margin: 2px 0;
}
</style>
