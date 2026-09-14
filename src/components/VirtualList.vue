<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * 虚拟滚动简化版：只渲染「可视区 + 上下缓冲」的行。
 * 原理：容器高度固定 + 内容区用 padding/transform 撑出总高度，滚动时只替换可视窗口内的数据。
 * 真实项目里可以直接用 vue-virtual-scroller / @tanstack/vue-virtual，
 * 但理解这个 30 行的版本，就理解了所有虚拟滚动库。
 */
const props = withDefaults(
  defineProps<{
    total?: number
    rowHeight?: number
    buffer?: number
    viewportHeight?: number
  }>(),
  { total: 10000, rowHeight: 28, buffer: 4, viewportHeight: 260 },
)

const scrollTop = ref(0)

const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - props.buffer),
)
const visibleCount = computed(() => Math.ceil(props.viewportHeight / props.rowHeight) + props.buffer * 2)
const endIndex = computed(() => Math.min(props.total, startIndex.value + visibleCount.value))
const visibleRows = computed(() =>
  Array.from({ length: endIndex.value - startIndex.value }, (_, i) => startIndex.value + i + 1),
)
const offsetY = computed(() => startIndex.value * props.rowHeight)
const totalHeight = computed(() => props.total * props.rowHeight)

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}
</script>

<template>
  <div>
    <div
      class="viewport"
      :style="{ height: viewportHeight + 'px' }"
      @scroll.passive="onScroll"
    >
      <!-- 内层：总高度撑满，让滚动条表现正确 -->
      <div :style="{ height: totalHeight + 'px', position: 'relative' }">
        <!-- 只渲染可视区的行，用 translateY 定位 -->
        <div :style="{ transform: `translateY(${offsetY}px)` }">
          <div
            v-for="n in visibleRows"
            :key="n"
            class="vrow"
            :style="{ height: rowHeight + 'px' }"
            :class="{ odd: n % 2 === 1 }"
          >
            第 {{ n }} 行（共 {{ total }} 行）
          </div>
        </div>
      </div>
    </div>

    <p class="kv" style="margin-top: 8px">
      当前渲染：第 {{ startIndex + 1 }} ~ {{ endIndex }} 行（DOM 里只有
      {{ endIndex - startIndex }} 个节点，而不是 {{ total }} 个）
    </p>
  </div>
</template>

<style scoped>
.viewport {
  overflow-y: auto;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-surface);
  contain: strict; /* 提示浏览器隔离布局/绘制，进一步提速 */
}
.vrow {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12.5px;
  font-family: var(--mono);
  color: var(--c-text-dim);
}
.vrow.odd {
  background: var(--c-surface-2);
}
</style>
