<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 演示 props 的各种形态。这里故意同时使用「类型声明」和「运行时声明」，
 * 只为对照讲解 —— 真实项目里二选一（推荐只用类型声明 + withDefaults）。
 */

// ① 类型声明（<script setup lang="ts"> 推荐）：编译期生成运行时校验
interface Props {
  title: string
  count?: number
  tags?: string[]
  status?: 'draft' | 'published' | 'archived'
  meta?: { author: string; version: number }
}

// withDefaults 给可选 prop 提供默认值（对象/数组默认值必须是工厂函数返回）
const props = withDefaults(defineProps<Props>(), {
  count: 0,
  tags: () => [],
  status: 'draft',
  meta: () => ({ author: '匿名', version: 1 }),
})

// ② 计算 props（不要在子组件里直接修改 props！）
const isPublished = computed(() => props.status === 'published')
const tagText = computed(() => (props.tags.length ? props.tags.join(' / ') : '（无标签）'))

// ③ props 变化可以 watch（父组件改了 prop 会触发）
const changeLog = ref<string[]>([])
watch(
  () => props.count,
  (nv, ov) => changeLog.value.unshift(`count: ${ov} → ${nv}`),
)

/**
 * ④ 单向数据流的正确姿势：
 * 子组件想「改」数据，不能改 prop，而是 emit 事件让父组件改。
 *
 * 注意：一个 SFC 里 defineEmits 只能调用一次（类型声明和运行时声明不能同时写），
 * 想加运行时校验就用「运行时声明」那一种（见下面注释里的写法）。
 */
const emit = defineEmits<{
  /** 类型声明 emit：IDE 有提示，事件名和参数都受约束 */
  (e: 'update-status', status: NonNullable<Props['status']>): void
  (e: 'increment', payload: { step: number; reason: string }): void
  (e: 'notify', message: string): void
  (e: 'runtime-log'): void
}>()

function publish() {
  emit('update-status', 'published')
  emit('notify', `《${props.title}》已发布`)
}
function bump() {
  emit('increment', { step: 1, reason: '子组件 +1 按钮' })
}

function fireRuntimeEvent() {
  emit('runtime-log')
  emit('notify', '上面这个事件在真实项目里会配合运行时校验函数')
}
</script>

<template>
  <div class="child">
    <h4>子组件 PropsChild</h4>

    <p class="kv">
      title = "{{ title }}" ｜ count = {{ count }} ｜ status = {{ status }}
      <span class="tag" :class="isPublished ? 'pass' : 'warn'">{{ status }}</span>
    </p>
    <p class="kv">tags（默认值工厂函数）= {{ tagText }}</p>
    <p class="kv">meta（对象默认值）= {{ meta }}</p>

    <div class="row" style="margin-top: 8px">
      <button class="primary" @click="bump">emit('increment', {step, reason})</button>
      <button @click="publish" :disabled="isPublished">emit('update-status', 'published')</button>
      <button @click="fireRuntimeEvent">第 4 个事件（runtime-log）</button>
    </div>

    <pre class="code" style="margin-top: 8px">{{ changeLog.slice(0, 3).join('\n') || '（父组件改 count 时这里会记录）' }}</pre>

    <p class="hint" style="margin-top: 8px">
      注意：<b>不要</b>写 <code>props.count++</code>。如果只是想要「本地可变副本」，
      用 <code>const local = ref(props.count)</code> + watch 同步 —— 但要先想清楚是不是设计错了。
    </p>
  </div>
</template>

<style scoped>
.child {
  border: 1px solid var(--c-primary);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--c-surface-2);
}
h4 {
  margin: 0 0 6px;
  font-size: 14px;
}
</style>
