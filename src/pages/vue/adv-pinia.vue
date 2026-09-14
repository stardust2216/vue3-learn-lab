<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BaseCard from '@/components/BaseCard.vue'
import { useCounterStore, useTodoStore } from '@/stores/counter'

/* ============================================================================
 * 15. 状态管理 Pinia
 *
 * 三个概念：
 *   state    → ref / reactive（数据）
 *   getters  → computed（派生数据，有缓存）
 *   actions  → 普通函数（改 state 的唯一入口，可以是异步的）
 *
 * 为什么用 Pinia 而不是自己 export 一个 ref？
 *   ① 跨组件共享同一个实例，天然是全局单例
 *   ② devtools 时间旅行、$patch 批量修改、$subscribe 订阅
 *   ③ SSR 安全（每个请求一份实例）、支持插件（持久化）
 * ========================================================================== */

const counter = useCounterStore()
const todos = useTodoStore()

// ---------- ① storeToRefs：解构 state/getters 的正确方式 ----------
// 直接 const { count } = counter 会丢响应式（和 reactive 解构同理），
// storeToRefs 只把 state/getters 转成 ref，actions 保持原样。
const { count, double, isPositive, summary, history } = storeToRefs(counter)
const { filter, stats, filtered } = storeToRefs(todos)

// ---------- ② 直接修改 state（Pinia 允许，但复杂逻辑请放 action） ----------
function mutateDirectly() {
  counter.count += 5
}

// ---------- ③ $patch：一次修改多个字段（性能更好，devtools 里是一条记录） ----------
function patchState() {
  counter.$patch({ count: 0, history: [] })
  counter.$patch((state) => {
    state.count = 42
    state.history.push(42)
  })
}

// ---------- ④ $reset：注意 Setup Store 需要我们自己在 action 里实现 ----------
function resetStore() {
  counter.$resetAll()
}

// ---------- ⑤ action 演示 ----------
const asyncResult = ref<string>('')
async function runAsyncAction() {
  asyncResult.value = '等待中…'
  const v = await counter.incrementAsync(700)
  asyncResult.value = `await incrementAsync() 返回 ${v}`
}

// ---------- ⑥ 跨 store 调用 ----------
const newTodo = ref('')
function addTodo() {
  todos.addAndCount(newTodo.value)
  newTodo.value = ''
}

// ---------- ⑦ $subscribe：订阅 state 变化（用于持久化 / 埋点） ----------
const subscribeLog = ref<string[]>([])
counter.$subscribe((mutation, state) => {
  subscribeLog.value.unshift(`[${mutation.type}] count=${state.count}（store id: ${mutation.storeId}）`)
})
// 取消订阅：const stop = counter.$subscribe(...); stop()

// ---------- ⑧ $onAction：监听 action 调用 ----------
const actionLog = ref<string[]>([])
counter.$onAction(({ name, args, after, onError }) => {
  actionLog.value.unshift(`→ 调用 action: ${name}(${args.join(', ')})`)
  after((result) => actionLog.value.unshift(`← ${name} 执行完成，返回 ${result}`))
  onError((e) => actionLog.value.unshift(`✗ ${name} 出错：${e}`))
})

// ---------- ⑨ 组合式写法：把 store 包进组合式函数（推荐的项目组织方式） ----------
function useCartSummary() {
  const items = ref(0)
  const localTotal = computed(() => items.value * 99)
  return { items, localTotal }
}
const cart = useCartSummary()
</script>

<template>
  <div>
    <h1>15. 状态管理 Pinia</h1>
    <p class="lead">
      Pinia 是 Vue 3 官方推荐的状态管理库（Vuex 的继任者）。
      它的核心卖点：<strong>类型推导完整、没有 mutation、支持组合式写法</strong>。
      注意顶栏那个 <code>counter.count</code>，它就是同一个 store 实例。
    </p>

    <BaseCard title="① storeToRefs 解构（新手第一大坑）" hint="直接解构 store 会丢响应式，必须用 storeToRefs 包一层。" tone="warn">
      <div class="row">
        <span class="tag pass">count = {{ count }}</span>
        <span class="tag info">double（getter）= {{ double }}</span>
        <span class="tag" :class="isPositive ? 'pass' : 'warn'">isPositive = {{ isPositive }}</span>
        <span class="kv">{{ summary }}</span>
      </div>

      <pre class="code" style="margin-top: 10px">
// ❌ 丢响应式：count 变成普通数字快照
const { count } = counter

// ✅ 正确：storeToRefs 只对 state / getters 生效，actions 保持函数
const { count, double } = storeToRefs(counter)
const { increment } = counter        // action 直接取即可</pre
      >
    </BaseCard>

    <BaseCard title="② state / getters / actions 全量演示" hint="注意顶栏的 count 会同步变化——这就是全局共享。">
      <div class="row">
        <button class="primary" @click="counter.increment()">increment()</button>
        <button @click="counter.increment(10)">increment(10) 带参数</button>
        <button @click="counter.decrement()">decrement()</button>
        <button @click="mutateDirectly">直接改 counter.count += 5</button>
        <button @click="patchState">$patch 批量改（count=42）</button>
        <button class="danger" @click="resetStore">$resetAll()</button>
        <button @click="runAsyncAction">异步 action</button>
        <span class="kv">{{ asyncResult }}</span>
      </div>

      <p class="kv" style="margin-top: 10px">history（reactive 数组）= {{ history.slice(-8) }}</p>

      <pre class="code" style="margin-top: 10px">
export const useCounterStore = defineStore('counter', () =&gt; {
  // state
  const count = ref(0)
  const history = reactive&lt;number[]&gt;([])
  // getters
  const double = computed(() =&gt; count.value * 2)
  // actions（同步 / 异步都可以，直接 return 结果）
  function increment(step = 1) { count.value += step; history.push(count.value) }
  async function incrementAsync(delay = 600) {
    await new Promise((r) =&gt; setTimeout(r, delay))
    increment()
    return count.value
  }
  return { count, history, double, increment, incrementAsync }
})</pre
      >
    </BaseCard>

    <BaseCard title="③ 第二个 store：待办清单（跨组件共享同一份数据）" hint="切换过滤条件，add/toggle/remove 都是 action。">
      <div class="row">
        <input v-model="newTodo" placeholder="新待办，回车添加" @keyup.enter="addTodo" />
        <button class="primary" @click="addTodo">add</button>
        <button :class="{ primary: filter === 'all' }" @click="filter = 'all'">全部</button>
        <button :class="{ primary: filter === 'active' }" @click="filter = 'active'">未完成</button>
        <button :class="{ primary: filter === 'done' }" @click="filter = 'done'">已完成</button>
        <span class="kv">{{ stats.done }}/{{ stats.total }}</span>
      </div>
      <ul style="margin: 10px 0 0; padding-left: 18px">
        <li v-for="t in filtered" :key="t.id">
          <label><input type="checkbox" :checked="t.done" @change="todos.toggle(t.id)" /> {{ t.text }}</label>
          <button style="margin-left: 8px" @click="todos.remove(t.id)">删除</button>
        </li>
      </ul>
    </BaseCard>

    <BaseCard title="④ $subscribe / $onAction：插件与持久化的基础" hint="点上面的按钮，观察两个日志。">
      <div class="grid2">
        <div>
          <p class="hint">$subscribe（监听 state 变化）</p>
          <pre class="code">{{ subscribeLog.slice(0, 4).join('\n') || '（暂无变化）' }}</pre>
        </div>
        <div>
          <p class="hint">$onAction（监听 action 调用 / 结果 / 错误）</p>
          <pre class="code">{{ actionLog.slice(0, 4).join('\n') || '（还没有 action 调用）' }}</pre>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">
// 持久化插件（核心思路，10 行就能实现 localStorage 持久化）
pinia.use(({ store }) =&gt; {
  const saved = localStorage.getItem(store.$id)
  if (saved) store.$patch(JSON.parse(saved))
  store.$subscribe((_m, state) =&gt; localStorage.setItem(store.$id, JSON.stringify(state)))
})</pre
      >
    </BaseCard>

    <BaseCard title="⑤ Setup Store vs Options Store" tone="ok">
      <pre class="code">
// ✅ Setup Store（本模板采用）：和写组合式函数一样，类型推导最好
export const useX = defineStore('x', () =&gt; {
  const n = ref(0)
  const double = computed(() =&gt; n.value * 2)
  function inc() { n.value++ }
  return { n, double, inc }        // 没 return 的就是私有状态
})

// Options Store：结构固定，但不方便用别的组合式函数
export const useY = defineStore('y', {
  state: () =&gt; ({ n: 0 }),
  getters: { double: (s) =&gt; s.n * 2, other: (s) =&gt; s.double + 1, useOther(state) { ... } },
  actions: { inc() { this.n++ } },   // 注意：这里必须用 this
})</pre
      >
      <p class="hint" style="margin-top: 8px">
        两者的 <code>state/getters/actions</code> 概念一一对应；Setup Store 的
        <code>computed</code> 就是 getter，普通函数就是 action。
        <code>$reset()</code> 只有 Options Store 自带，Setup Store 需要自己写一个 reset action。
      </p>
    </BaseCard>

    <BaseCard title="⑥ 项目组织建议">
      <ul style="margin: 0; padding-left: 20px">
        <li>
          <b>什么时候该放 store</b>：多个页面/组件都要读写、需要跨路由保留、需要被 devtools 追踪。
          只在一个组件里用的状态，用 <code>ref</code> 就好。
        </li>
        <li>
          <b>一个 store 管一件事</b>：<code>useUserStore</code> / <code>useCartStore</code>，
          不要做「一个巨大的 appStore」。
        </li>
        <li>
          <b>业务逻辑放 action，组件只负责调用</b>：这样组件薄、逻辑可复用、可单独测试。
        </li>
        <li>
          <b>组件里别直接改 state</b>（虽然 Pinia 允许）：统一走 action，
          方便加日志、校验、联动（本模板的 addAndCount 就是跨 store 联动示例）。
        </li>
        <li>
          <b>解构必须用 storeToRefs</b>；组合式函数里可以随意 <code>store.xxx</code>。
        </li>
      </ul>
      <p class="kv" style="margin-top: 10px">
        本地组件状态演示（与 store 无关）：购物车 items = {{ cart.items }}，合计 = {{ cart.localTotal }}
      </p>
    </BaseCard>
  </div>
</template>

<style scoped>
h1 {
  font-size: 22px;
}
.lead {
  color: var(--c-text-dim);
  margin-top: -4px;
}
code {
  background: var(--c-surface-2);
  padding: 1px 5px;
  border-radius: 5px;
}
</style>
