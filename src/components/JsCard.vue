<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'

/**
 * JavaScript 实验台的演示卡片：
 *  - 「断言列表」：把一段代码的运行结果和期望值并排显示 ✅/❌（JS 学习最直观的验证方式）
 *  - 「可运行代码块」：点「运行」用 new Function 就地执行，输出/错误直接显示在卡片里
 *
 * 注意：playground 用的是 new Function，仅适合学习演示；
 * 真实项目里绝不要执行不可信字符串（等价于 eval，有 XSS 风险）。
 */

export interface Assertion {
  /** 断言说明，例如 `'1' + 1` */
  expr: string
  /** 实际值 */
  actual: unknown
  /** 期望值 */
  expected: unknown
  /** 补充说明 */
  note?: string
}

const props = withDefaults(
  defineProps<{
    title: string
    hint?: string
    /** 断言列表（结果与期望对比） */
    asserts?: Assertion[]
    /** 可运行代码（点「运行」在卡片内执行） */
    runnable?: string
    /** 只展示、不运行的代码 */
    code?: string
    tone?: 'default' | 'ok' | 'warn' | 'danger'
  }>(),
  { hint: '', asserts: () => [], runnable: '', code: '', tone: 'default' },
)

/** 值序列化：字符串带引号，方便看清类型（'1' vs 1） */
function show(v: unknown) {
  if (typeof v === 'string') return `'${v}'`
  if (v === undefined) return 'undefined'
  if (v === null) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v)
  if (typeof v === 'symbol') return v.toString()
  if (typeof v === 'function') return `ƒ ${v.name || 'anonymous'}()`
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

const results = computed(() =>
  props.asserts.map((a) => ({
    ...a,
    actualText: show(a.actual),
    expectedText: show(a.expected),
    pass: Object.is(a.actual, a.expected),
  })),
)

// ---------- 可运行代码块 ----------
const logs = shallowRef<{ type: 'log' | 'error'; text: string }[]>([])
const running = ref(false)
const ranTimes = ref(0)

function run() {
  running.value = true
  const collected: { type: 'log' | 'error'; text: string }[] = []
  const printf = (...args: unknown[]) =>
    collected.push({ type: 'log', text: args.map((a) => (typeof a === 'string' ? a : show(a))).join(' ') })
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('console', `"use strict";\n${props.runnable}`)
    fn({ log: printf, error: (...a: unknown[]) => collected.push({ type: 'error', text: a.map(String).join(' ') }) })
  } catch (e) {
    collected.push({ type: 'error', text: `${(e as Error).name}: ${(e as Error).message}` })
  }
  logs.value = collected
  ranTimes.value++
  running.value = false
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

    <!-- 断言区 -->
    <ul v-if="results.length" class="asserts">
      <li v-for="(r, i) in results" :key="i" :class="{ fail: !r.pass }">
        <span class="mark">{{ r.pass ? '✅' : '❌' }}</span>
        <code class="expr">{{ r.expr }}</code>
        <span class="arrow">→</span>
        <code class="val">{{ r.actualText }}</code>
        <span v-if="!r.pass" class="exp">（期望 {{ r.expectedText }}）</span>
        <span v-if="r.note" class="note">{{ r.note }}</span>
      </li>
    </ul>

    <!-- 只读代码块 -->
    <pre v-if="code" class="code" style="margin-top: 10px">{{ code }}</pre>

    <!-- 可运行代码块 -->
    <div v-if="runnable" class="runner">
      <div class="runner-bar">
        <button class="primary" :disabled="running" @click="run">▶ 运行</button>
        <span class="kv">已运行 {{ ranTimes }} 次</span>
        <span class="kv">输出 {{ logs.length }} 条</span>
      </div>
      <pre class="code js-code">{{ runnable }}</pre>
      <pre v-if="ranTimes" class="output">{{ logs.length ? logs.map((l) => (l.type === 'error' ? '✗ ' : '› ') + l.text).join('\n') : '(没有输出)' }}</pre>
    </div>
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
.asserts {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  font-size: 12.5px;
}
.asserts li {
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
  padding: 4px 8px;
  border-bottom: 1px dashed var(--c-border);
}
.asserts li:last-child {
  border-bottom: none;
}
.asserts li.fail {
  background: rgba(229, 83, 75, 0.09);
}
.mark {
  font-size: 12px;
}
.expr {
  font-family: var(--mono);
  background: var(--c-surface-2);
  padding: 1px 6px;
  border-radius: 5px;
  color: var(--c-text);
}
.arrow {
  color: var(--c-text-dim);
}
.val {
  font-family: var(--mono);
  color: var(--c-primary-dark);
  font-weight: 600;
}
.fail .val {
  color: var(--c-danger);
}
.exp {
  color: var(--c-text-dim);
  font-size: 12px;
}
.note {
  color: var(--c-text-dim);
  font-size: 12px;
}
.runner {
  margin-top: 12px;
}
.runner-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.js-code {
  background: #1f2430;
}
.output {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  background: var(--c-surface-2);
  font-family: var(--mono);
  font-size: 12.5px;
  white-space: pre-wrap;
  line-height: 1.55;
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
