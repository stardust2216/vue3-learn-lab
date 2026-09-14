<script setup lang="ts">
import { ref } from 'vue'

/**
 * 样式隔离演示子组件。
 * 关键点：子组件的根元素会同时带上父组件的 data-v-xxx 和作用域 id，
 * 所以父组件可以直接用 scoped 样式选中「子组件根元素」。
 */
const accent = ref('#42b883')
const size = ref(14)

defineExpose({ accent, size })
</script>

<template>
  <!-- 子组件根元素：父组件的 .child-root 样式能生效 -->
  <div class="child-root">
    <p>我是子组件，我自己的 scoped 样式只作用于我内部的元素。</p>

    <!-- 父组件想改这里的 p，必须用 :deep() -->
    <div class="inner">
      <p class="deep-target">子组件内部的 .deep-target（父组件只能用 :deep(.deep-target) 改我）</p>
    </div>

    <!-- 作用域插槽内容：父组件想给它写样式要用 :slotted() -->
    <div class="slot-host">
      <slot name="extra">默认插槽内容（由父组件提供）</slot>
    </div>

    <!-- v-bind() in CSS：把响应式变量写进 CSS -->
    <p class="dynamic" :style="{ fontSize: size + 'px' }">
      v-bind() 动态样式：颜色跟随父组件传下来的 ref
    </p>
  </div>
</template>

<style scoped>
.child-root {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 10px 12px;
}
.child-root p {
  margin: 4px 0;
}
.inner {
  background: var(--c-surface-2);
  border-radius: 6px;
  padding: 6px 8px;
}
.slot-host {
  margin-top: 6px;
}

/* 这个 class 只能在子组件内部生效（因为被编译成了 .dynamic[data-v-子组件id]） */
.dynamic {
  color: v-bind(accent); /* CSS 里直接使用 setup 的响应式变量 */
  font-weight: 600;
}
</style>
