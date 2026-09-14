<script setup lang="ts">
/**
 * 演示卡片：本项目所有页面复用的小组件。
 * 同时它本身就是「组件通信」的活教材：
 * - props：title / hint / code / tone
 * - 默认插槽：放演示 UI
 * - 具名插槽 extra：放额外的按钮/说明（父组件可以按需提供）
 */
withDefaults(
  defineProps<{
    title: string
    hint?: string
    /** 代码字符串。用插值 {{ code }} 输出，所以代码里可以放心写 {{ }} 和 v-if */
    code?: string
    tone?: 'default' | 'ok' | 'warn'
  }>(),
  { hint: '', code: '', tone: 'default' },
)
</script>

<template>
  <section class="card" :class="tone">
    <header class="head">
      <h3>{{ title }}</h3>
      <slot name="extra" />
    </header>
    <p v-if="hint" class="hint">{{ hint }}</p>

    <div class="demo">
      <slot />
    </div>

    <details v-if="code" class="code-wrap">
      <summary>查看代码</summary>
      <pre class="code">{{ code }}</pre>
    </details>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.head h3 {
  flex: 1;
  margin-bottom: 0;
  font-size: 15px;
}
.demo {
  margin-top: 10px;
}
.code-wrap {
  margin-top: 12px;
}
.code-wrap summary {
  cursor: pointer;
  font-size: 12.5px;
  color: var(--c-text-dim);
  user-select: none;
}
.code-wrap summary:hover {
  color: var(--c-primary-dark);
}
.code-wrap pre {
  margin-top: 8px;
}
.card.ok {
  border-left: 3px solid var(--c-primary);
}
.card.warn {
  border-left: 3px solid var(--c-warn);
}
</style>
