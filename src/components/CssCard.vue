<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * CSS 实验台的演示卡片（类比 Vue 部分的 BaseCard）：
 *  - 上方：hint 说明
 *  - 中间：默认插槽，放真实演示（样式来自本页 <style scoped>）
 *  - 下方：「查看源码」折叠区，展示的 CSS 从页面真实样式里提取（见 lib/cssSource.ts）
 *  - 右侧：#extra 具名插槽，放控制器（滑块 / 下拉 / 开关）
 *
 * 走 `copyable` 时会多一个「复制」按钮：把 HTML 结构 + CSS 一起拷进剪贴板，
 * 方便直接粘到自己的项目里仿写。
 *
 * 用法：
 *   <CssCard title="主按钮" :source="css.rules('.btn-primary')" html="<button class=&quot;btn-primary&quot;>…</button>" copyable>
 *     <button class="btn-primary">…</button>
 *   </CssCard>
 */
const props = withDefaults(
  defineProps<{
    title: string
    hint?: string
    /** 要展示的 CSS 源码（一般传 css.rules('.xxx')） */
    source?: string
    /** 额外展示的 HTML 结构片段（注意用 &quot; 转义双引号） */
    html?: string
    tone?: 'default' | 'ok' | 'warn' | 'danger'
    /** 源码默认展开 */
    open?: boolean
    /** 显示「复制」按钮（复制 结构 + 样式） */
    copyable?: boolean
  }>(),
  { hint: '', source: '', html: '', tone: 'default', open: false, copyable: false },
)

const copied = ref(false)
const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard

/** 复制内容：先结构、后样式，直接可粘贴使用 */
const copyText = computed(() => {
  const parts: string[] = []
  if (props.html) parts.push(`<!-- HTML -->\n${props.html}`)
  if (props.source) parts.push(`/* CSS */\n${props.source}`)
  return parts.join('\n\n')
})

async function copy() {
  try {
    await navigator.clipboard.writeText(copyText.value)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1600)
  } catch {
    copied.value = false
  }
}
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

    <details v-if="source || html" class="code-wrap" :open="open">
      <summary>
        <span>查看源码{{ html ? '（结构 + 样式）' : '（CSS）' }} · 可直接仿写</span>
        <button v-if="copyable" class="copy-btn" type="button" @click.prevent.stop="copy">
          {{ copied ? '已复制 ✓' : canCopy ? '复制' : '请手动选中' }}
        </button>
      </summary>
      <pre v-if="html" class="code html-block">{{ html }}</pre>
      <pre v-if="source" class="code css-block">{{ source }}</pre>
    </details>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--c-text-dim);
  user-select: none;
}
.code-wrap summary:hover {
  color: var(--c-primary-dark);
}
.copy-btn {
  margin-left: auto;
  padding: 2px 10px;
  font-size: 11.5px;
  border-radius: 999px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  color: var(--c-text);
}
.copy-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary-dark);
}
.code-wrap pre {
  margin-top: 8px;
}
.html-block {
  background: #2b2a24;
  color: #d7c9a7;
}
.card.ok {
  border-left: 3px solid var(--c-primary);
}
.card.warn {
  border-left: 3px solid var(--c-warn);
}
.card.danger {
  border-left: 3px solid var(--c-danger);
}
</style>
