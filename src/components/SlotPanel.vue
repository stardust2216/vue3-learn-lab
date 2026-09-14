<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * 插槽演示子组件。四种插槽一次展示：
 * ① 默认插槽（无 name）
 * ② 具名插槽 <slot name="header">
 * ③ 作用域插槽：把子组件内部数据通过 slot props 传给父组件
 * ④ 动态插槽名：<slot :name="dynamicName">
 *
 * 另外：$slots 可以判断父组件有没有传某个插槽（用于「没有就不渲染这块 UI」）。
 * useSlots() 是它的组合式 API 写法。
 */
const props = defineProps<{ dynamicName?: string }>()
const items = ref([
  { id: 1, name: '键盘', price: 399 },
  { id: 2, name: '鼠标', price: 129 },
  { id: 3, name: '显示器', price: 1299 },
])

// 简单版：用 v-if + $slots 判断插槽是否被提供
const hasFooter = computed(() => true)
</script>

<template>
  <div class="panel">
    <!-- ① + ②：具名插槽 + 默认插槽，父组件不传时显示 fallback 内容 -->
    <header class="panel-head">
      <slot name="header">
        <b>默认标题（父组件没传 #header 时显示）</b>
      </slot>
      <slot name="actions" />
    </header>

    <div class="panel-body">
      <slot>
        <p class="hint">默认插槽的 fallback：父组件什么都不传时显示这段文字。</p>
      </slot>
    </div>

    <!-- ③ 作用域插槽：子组件把自己的 items 暴露给父组件渲染 -->
    <ul class="panel-list">
      <li v-for="item in items" :key="item.id">
        <slot name="row" :item="item" :index="item.id" :highlight="item.price > 500">
          <!-- fallback 也用到了作用域变量 -->
          <span>{{ item.name }} —— ¥{{ item.price }}</span>
        </slot>
      </li>
    </ul>

    <!-- ④ 动态插槽名：父组件用 #[名字] 决定内容塞到哪里 -->
    <div class="panel-dyn">
      <slot :name="props.dynamicName ?? 'info'">动态插槽 fallback</slot>
    </div>

    <footer v-if="hasFooter" class="panel-foot">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.panel {
  border: 1px solid var(--c-primary);
  border-radius: 10px;
  overflow: hidden;
  background: var(--c-surface-2);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(66, 184, 131, 0.14);
}
.panel-head > :first-child {
  flex: 1;
}
.panel-body {
  padding: 10px 12px;
}
.panel-list {
  list-style: none;
  margin: 0;
  padding: 0 12px 8px;
}
.panel-list li {
  padding: 4px 0;
  border-bottom: 1px dashed var(--c-border);
  font-size: 13px;
}
.panel-dyn {
  padding: 8px 12px;
  border-top: 1px dashed var(--c-border);
}
.panel-foot {
  padding: 8px 12px;
  background: var(--c-surface);
  font-size: 12.5px;
  color: var(--c-text-dim);
}
</style>
