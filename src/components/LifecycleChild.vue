<script setup lang="ts">
import {
  onActivated,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onDeactivated,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
} from 'vue'

/**
 * 生命周期演示子组件：把每个钩子的执行顺序通过 props 传进来的函数上报给父组件。
 * 注意：<script setup> 里没有 beforeCreate / created，因为 setup 本身就发生在
 * 它们对应的阶段（beforeCreate 之前开始，created 之前结束）。
 */
const props = defineProps<{
  label: string
  log: (msg: string) => void
}>()

const count = ref(0)
const el = ref<HTMLElement | null>(null)

props.log(`[${props.label}] setup() 执行（此时还没有 DOM）`)

onBeforeMount(() => props.log(`[${props.label}] onBeforeMount`))
onMounted(() => {
  props.log(`[${props.label}] onMounted（DOM 已就绪，offsetHeight=${el.value?.offsetHeight}）`)
})
onBeforeUpdate(() => props.log(`[${props.label}] onBeforeUpdate（数据变了，DOM 还没更新）`))
onUpdated(() => props.log(`[${props.label}] onUpdated（DOM 已更新，count=${count.value}）`))
onBeforeUnmount(() => props.log(`[${props.label}] onBeforeUnmount（还能访问 DOM）`))
onUnmounted(() => props.log(`[${props.label}] onUnmounted（清理定时器/事件监听）`))

// 下面两个只在被 <KeepAlive> 包裹时才会触发
onActivated(() => props.log(`[${props.label}] onActivated（被 KeepAlive 缓存后重新显示）`))
onDeactivated(() => props.log(`[${props.label}] onDeactivated（被 KeepAlive 缓存并隐藏）`))

defineExpose({
  // defineExpose：暴露给父组件通过模板 ref 访问（默认 setup 是封闭的）
  reset: () => (count.value = 0),
  count,
})
</script>

<template>
  <div ref="el" class="child">
    <strong>{{ label }}</strong>
    <div class="row" style="margin-top: 6px">
      <button @click="count++">子组件 count++（{{ count }}）</button>
      <span class="kv">这个组件内部状态会被 KeepAlive 保留</span>
    </div>
  </div>
</template>

<style scoped>
.child {
  border: 1px dashed var(--c-primary);
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 10px;
}
</style>
