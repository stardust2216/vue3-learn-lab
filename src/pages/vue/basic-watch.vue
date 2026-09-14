<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch, watchEffect } from 'vue'
import BaseCard from '@/components/BaseCard.vue'

/* ============================================================================
 * 4. 侦听器：watch / watchEffect
 *
 * watch：
 *   watch(source, (newVal, oldVal) => {}, { immediate, deep, flush, once })
 *   惰性（不 immediate 就不立即执行）；能拿到新旧值；回调在数据变化「之后」批量执行
 * watchEffect：
 *   立即执行一次；自动收集依赖（用到谁就听谁）；拿不到旧值；适合「副作用随依赖自动重建」
 *
 * flush 时机：'pre'（默认，组件更新前）/ 'post'（组件更新后，能拿到新 DOM）/ 'sync'（同步，慎用）
 * ========================================================================== */

// ---------- ① 侦听 ref ----------
const keyword = ref('')
const kwLog = ref<string[]>([])

// 停止侦听：watch 返回 stop 函数
const stopKeyword = watch(keyword, (nv, ov) => {
  kwLog.value.unshift(`ref: "${ov}" → "${nv}"`)
})

// ---------- ② 侦听 getter（返回基本类型）：最推荐的写法，依赖明确 ----------
const user = reactive({ name: '小明', age: 18, address: { city: '杭州' } })
const nameLog = ref<string[]>([])
watch(
  () => user.name,
  (nv, ov) => nameLog.value.unshift(`name: ${ov} → ${nv}`),
)

// ---------- ③ deep：侦听整个 reactive 对象（嵌套变化也触发） ----------
const deepLog = ref<string[]>([])
const deepState = reactive({ profile: { nickname: 'vue-fan', level: 1 }, tags: ['a'] })
watch(
  deepState, // 直接侦听 reactive 对象 → 自动 deep，且不需要 .value
  () => {
    deepLog.value.unshift(`deep 触发：${JSON.stringify(deepState)}`)
  },
  { deep: true },
)

// 对照：侦听 getter 返回「普通对象」时，默认是浅比较，需要显式 deep: true
const shallowObj = reactive({ nested: { n: 0 } })
const shallowLabel = ref('浅侦听：只关心 nested 引用是否变化')
watch(
  () => shallowObj.nested,
  () => (shallowLabel.value = `浅侦听触发（第 ${++shallowCount} 次）`),
)
let shallowCount = 0
const deepNestedLabel = ref('deep 侦听：嵌套属性变化也会触发')
let deepNestedCount = 0
watch(
  () => shallowObj.nested,
  () => (deepNestedLabel.value = `deep 侦听触发（第 ${++deepNestedCount} 次）`),
  { deep: true },
)

// ---------- ④ immediate：立即执行一次（常见于「初始化 + 后续变化」都要跑） ----------
const searchKeyword = ref('vue')
const searchResult = ref<string[]>([])
watch(
  searchKeyword,
  (nv) => {
    // 模拟同步搜索（真实项目会防抖 + 请求，见第 12 页 useDebouncedRef）
    const all = ['vue3 响应式', 'vue3 组合式 API', 'vue-router 守卫', 'pinia store', 'vite 配置']
    searchResult.value = all.filter((s) => s.includes(nv))
  },
  { immediate: true },
)

// ---------- ⑤ 多源侦听 + 数组形式 ----------
const sourceLog = ref<string[]>([])
watch([keyword, () => user.age], ([kw, age], [oldKw, oldAge]) => {
  sourceLog.value.unshift(`数组源 → kw: ${oldKw}⇒${kw} / age: ${oldAge}⇒${age}`)
})

// ---------- ⑥ flush：'post' 适合「依赖更新后 DOM」的逻辑 ----------
const boxText = ref('初始内容')
const boxHeight = ref(0)
const boxEl = ref<HTMLElement | null>(null)
watch(
  boxText,
  () => {
    // flush: 'post' 时，DOM 已经更新，可以安全测量
    boxHeight.value = boxEl.value?.offsetHeight ?? 0
  },
  { flush: 'post' },
)

// ---------- ⑦ 清理副作用：竞态问题的标准解法 ----------
const query = ref('')
const asyncResult = ref('（等待输入）')
const requestLog = ref<string[]>([])
watch(query, async (nv, _ov, onCleanup) => {
  const id = ++requestId
  let cancelled = false
  onCleanup(() => {
    cancelled = true
    requestLog.value.unshift(`请求 #${id} 被取消（cleanup 执行了）`)
  })
  asyncResult.value = `请求 #${id} 中…`
  await new Promise((r) => setTimeout(r, 800))
  if (cancelled) return
  asyncResult.value = `请求 #${id} 返回："${nv}"`
})
let requestId = 0

// ---------- ⑧ watchEffect：自动收集依赖 ----------
const a = ref(1)
const b = ref(2)
const effectLog = ref<string[]>([])
const stopEffect = watchEffect((onCleanup) => {
  // 只用到 a，所以只依赖 a；b 变化不会触发
  effectLog.value.unshift(`watchEffect: a=${a.value}（依赖 a）`)
  onCleanup(() => effectLog.value.unshift('watchEffect cleanup（下次执行前 / 停止时）'))
})
const effectStopped = ref(false)
function stopTheEffect() {
  stopEffect()
  effectStopped.value = true
}

// ---------- ⑨ 停止侦听 ----------
const stopDemoLog = ref<string[]>([])
const stopDemoVal = ref(0)
const isStopped = ref(false)
// 这里不用 const 包住 stop 函数，而是存到 ref 里，方便按钮随时调用
const stopDemoWatch = ref<(() => void) | null>(null)
stopDemoWatch.value = watch(stopDemoVal, (nv) => stopDemoLog.value.unshift(`收到 ${nv}`))
function stopIt() {
  stopDemoWatch.value?.()
  stopDemoWatch.value = null
  isStopped.value = true
}

// 组件卸载时，watch/watchEffect 会自动停止；这里的定时器演示手动清理
const timerTick = ref(0)
const timer = window.setInterval(() => timerTick.value++, 1000)
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div>
    <h1>4. 侦听器 watch / watchEffect</h1>
    <p class="lead">
      一句话选型：<strong>「数据变了要做事（尤其是异步/副作用）」用 watch</strong>；
      <strong>「这件事依赖哪些数据，就让 Vue 自己收集」用 watchEffect</strong>；
      只是「推导新值」用 computed，别用 watch。
    </p>

    <BaseCard title="① 侦听 ref / 停止侦听" hint="watch 返回 stop 函数，调用后不再收到通知。">
      <div class="row">
        <input v-model="keyword" placeholder="随便输点什么" />
        <button @click="stopKeyword()">停止侦听 keyword</button>
        <span class="kv">当前：{{ keyword }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ kwLog.join('\n') || '（还没有记录）' }}</pre>
      <p class="hint" style="margin-top: 8px">
        组件卸载时 Vue 会自动停止所有侦听器，所以「忘记 stop」通常不会内存泄漏；但手动 stop 常用于
        「只关心第一次变化」的场景。
      </p>
    </BaseCard>

    <BaseCard title="② 侦听 getter（推荐写法）" hint="依赖精确到属性，只有 name 变化才触发。">
      <div class="row">
        <input v-model="user.name" />
        <input type="number" v-model.number="user.age" style="width: 80px" />
        <span class="kv">改 age 不会出现在下面的日志里（因为没侦听它）</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ nameLog.join('\n') || '（还没有记录）' }}</pre>
    </BaseCard>

    <BaseCard
      title="③ deep：侦听嵌套对象"
      hint="侦听 reactive 对象本身 → 默认就是深侦听；侦听 getter 返回的普通对象 → 必须显式 deep: true。"
      tone="warn"
    >
      <div class="grid2">
        <div>
          <div class="row">
            <input v-model="deepState.profile.nickname" />
            <button @click="deepState.profile.level++">level++（嵌套）</button>
            <button @click="deepState.tags.push('tag' + deepState.tags.length)">tags.push</button>
          </div>
          <p class="hint" style="margin-top: 8px">deep 侦听 reactive 对象的日志：</p>
          <pre class="code">{{ deepLog.slice(0, 3).join('\n') || '（还没有记录）' }}</pre>
        </div>
        <div>
          <div class="row">
            <button @click="shallowObj.nested.n++">shallowObj.nested.n++</button>
            <button @click="shallowObj.nested = { n: 100 }">替换 nested 引用</button>
          </div>
          <p class="hint" style="margin-top: 8px">{{ shallowLabel }}</p>
          <p class="hint">{{ deepNestedLabel }}</p>
          <p class="hint">
            结论：改 <code>n</code>（深层）只触发 deep 版；替换 <code>nested</code>（浅层）两个都触发。
          </p>
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        性能提醒：deep 会遍历整个对象建立依赖，大列表/大对象慎用。优先侦听具体字段（getter）。
      </p>
    </BaseCard>

    <BaseCard title="④ immediate：立即执行一次" hint="检索场景的标准写法：进入页面先搜一次，之后随输入变化再搜。">
      <div class="row">
        <input v-model="searchKeyword" placeholder="试试输入 router / pinia" />
        <span class="kv">搜索结果：{{ searchResult.length }} 条</span>
      </div>
      <ul style="margin: 8px 0 0; padding-left: 18px">
        <li v-for="s in searchResult" :key="s">{{ s }}</li>
      </ul>
    </BaseCard>

    <BaseCard title="⑤ 多源侦听（数组源）" hint="watch([a, b], ([newA, newB], [oldA, oldB]) => {})">
      <div class="row">
        <input v-model="keyword" placeholder="keyword（与 ① 共用）" />
        <button @click="user.age++">user.age++</button>
      </div>
      <pre class="code" style="margin-top: 10px">{{ sourceLog.slice(0, 4).join('\n') || '（还没有记录）' }}</pre>
    </BaseCard>

    <BaseCard title="⑥ flush: 'post'：在 DOM 更新后执行" hint="需要读取更新后的布局/尺寸时用它。">
      <div class="row">
        <button @click="boxText = '短'">变短</button>
        <button @click="boxText = '很长的一段文字'.repeat(6)">变长</button>
        <span class="kv">测量到的高度：{{ boxHeight }}px</span>
      </div>
      <div ref="boxEl" class="measure" :style="{ maxWidth: boxText.length > 20 ? '160px' : '400px' }">
        {{ boxText }}
      </div>
      <p class="hint" style="margin-top: 8px">
        flush 三档：<code>pre</code>（默认，更新 DOM 前，此时读 offsetHeight 拿到旧值）、
        <code>post</code>（更新后，拿新值）、<code>sync</code>（同步触发，性能差，几乎不用）。
      </p>
    </BaseCard>

    <BaseCard
      title="⑦ 清理副作用：解决异步竞态"
      hint="快速连续输入时，旧请求会被 cleanup 标记为取消，最终只显示最后一次的结果。"
      tone="ok"
    >
      <div class="row">
        <input v-model="query" placeholder="快速连续输入，如 a→ab→abc" />
        <span class="tag pass">{{ asyncResult }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ requestLog.slice(0, 5).join('\n') || '（还没有记录）' }}</pre>
    </BaseCard>

    <BaseCard title="⑧ watchEffect：自动收集依赖 + cleanup" hint="只用到 a，所以 b 怎么变都不会触发。">
      <div class="row">
        <button @click="a++">a++（会触发）</button>
        <button @click="b++">b++（不会触发）</button>
        <button class="danger" @click="stopTheEffect" :disabled="effectStopped">停止 watchEffect</button>
        <span class="kv">a={{ a }}, b={{ b }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ effectLog.slice(0, 6).join('\n') }}</pre>
      <p class="hint" style="margin-top: 8px">
        watchEffect 的依赖是「运行时动态」的：如果把 <code>b.value</code> 也写进回调，它就会开始依赖 b。
      </p>
    </BaseCard>

    <BaseCard title="⑨ 对照总结表">
      <table>
        <thead>
          <tr>
            <th>对比项</th>
            <th>watch</th>
            <th>watchEffect</th>
            <th>computed</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>执行时机</td>
            <td>惰性，变化后才执行（可 immediate）</td>
            <td>立即执行一次，之后依赖变化就执行</td>
            <td>被读取时按需计算（有缓存）</td>
          </tr>
          <tr>
            <td>依赖来源</td>
            <td>显式指定</td>
            <td>自动收集</td>
            <td>自动收集</td>
          </tr>
          <tr>
            <td>能否拿旧值</td>
            <td>能（newVal / oldVal）</td>
            <td>不能</td>
            <td>不适用</td>
          </tr>
          <tr>
            <td>返回值</td>
            <td>stop 函数</td>
            <td>stop 函数</td>
            <td>只读（或可写）ref</td>
          </tr>
          <tr>
            <td>典型用途</td>
            <td>请求、埋点、本地存储同步、校验</td>
            <td>依赖多且动态的副作用（如自动重建图表）</td>
            <td>派生展示数据</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 10px">
        特性检测小贴士：<code>once: true</code>（3.4+）只触发一次；<code>onWatcherCleanup()</code>
        是 setup 里注册 cleanup 的另一种写法；<code>watchPostEffect / watchSyncEffect</code> 是
        watchEffect 的 flush 简写。
      </p>
      <p class="kv" style="margin-top: 6px">本页定时器 tick = {{ timerTick }}（组件卸载时会自动清理）</p>
    </BaseCard>

    <BaseCard title="⑩ 停止侦听的独立演示" hint="停止后按钮点击不再产生日志。">
      <div class="row">
        <button @click="stopDemoVal++">stopDemoVal++（{{ stopDemoVal }}）</button>
        <button class="danger" @click="stopIt" :disabled="isStopped">停止侦听</button>
        <span class="tag" :class="isStopped ? 'warn' : 'pass'">{{ isStopped ? '已停止' : '侦听中' }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ stopDemoLog.slice(0, 5).join('\n') || '（还没有记录）' }}</pre>
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
.measure {
  margin-top: 10px;
  padding: 10px;
  border: 1px dashed var(--c-primary);
  border-radius: 8px;
  transition: max-width 0.2s;
}
</style>
