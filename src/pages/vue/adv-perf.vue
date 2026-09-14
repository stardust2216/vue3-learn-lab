<script setup lang="ts">
import { computed, markRaw, onUpdated, reactive, ref, shallowRef, triggerRef } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import VirtualList from '@/components/VirtualList.vue'

/* ============================================================================
 * 18. 性能优化与响应式进阶
 *
 * 优化的顺序永远是：先量（DevTools Performance / Vue Devtools），再改。
 * 高频手段：
 *   ① 减少响应式开销：shallowRef / shallowReactive / markRaw
 *   ② 减少渲染：computed 缓存、v-once / v-memo、虚拟滚动
 *   ③ 减少包体积：路由懒加载、异步组件、按需引入
 *   ④ 减少无关更新：拆分组件、稳定 props、列表稳定 key
 * ========================================================================== */

// ---------- ① shallowRef：只追踪 .value 的整体替换，不追踪深层属性 ----------
let renderCount = 0

const normalObj = ref({ deep: { count: 0 } })
const shallowObj = shallowRef({ deep: { count: 0 } })

// onUpdated：本组件每完成一次 DOM 更新就 +1，用来直观感受「有没有触发渲染」
onUpdated(() => {
  renderCount++
})

function mutateDeepNormal() {
  normalObj.value.deep.count++
}
function mutateDeepShallow() {
  shallowObj.value.deep.count++ // ❌ 不会触发界面更新（值确实变了）
}
function replaceShallow() {
  shallowObj.value = { deep: { count: shallowObj.value.deep.count + 1 } } // ✅ 整体替换才会更新
}
function forceShallowUpdate() {
  triggerRef(shallowObj) // 手动强制触发（知道自己在干什么时才用）
}

// ---------- ② markRaw：让对象永远不被转成响应式 ----------
const chartInstance = markRaw({
  type: 'echarts-like',
  init() {
    return '已初始化的大对象（不要让它进入响应式系统）'
  },
})
const wrapped = reactive({ chart: chartInstance, name: '普通字段' })
const isChartReactive = ref(false)
function checkRaw() {
  // __v_skip 是 markRaw 打的标记；用 isReactive 判断整个对象也不为 true
  isChartReactive.value = !!(wrapped.chart as unknown as { __v_skip?: boolean }).__v_skip
}

// ---------- ③ v-memo：跳过子树 diff ----------
const rows = ref(
  Array.from({ length: 500 }, (_, i) => ({ id: i + 1, label: `行 ${i + 1}`, score: (i * 37) % 100 })),
)
const selectedId = ref<number | null>(null)
const memoEnabled = ref(true)
const renderTicks = ref(0)
function toggleSelect(id: number) {
  selectedId.value = selectedId.value === id ? null : id
  renderTicks.value++
}

// ---------- ④ computed 缓存 vs 模板里调用方法 ----------
const stats = ref({ a: 1, b: 2 })
let heavyCalls = 0
function heavyCompute() {
  heavyCalls++
  // 模拟重计算
  let sum = 0
  for (let i = 0; i < 2000; i++) sum += i
  return stats.value.a + stats.value.b + (sum % 7)
}
const heavyComputed = computed(() => heavyCompute())
const unrelated = ref(0)

// ---------- ⑤ 大列表：响应式开销对比 ----------
const bigListReactive = ref(Array.from({ length: 2000 }, (_, i) => ({ id: i, v: i })))
const makeRawList = () => Array.from({ length: 2000 }, (_, i) => markRaw({ id: i, v: i }))
const bigListRaw = shallowRef(makeRawList())
const listNote = ref('')

function rebuildReactive() {
  const t0 = performance.now()
  bigListReactive.value = Array.from({ length: 2000 }, (_, i) => ({ id: i, v: Math.random() }))
  listNote.value = `ref([...]) 创建 2000 个响应式对象耗时约 ${(performance.now() - t0).toFixed(2)}ms`
}
function rebuildRaw() {
  const t0 = performance.now()
  bigListRaw.value = makeRawList()
  listNote.value = `shallowRef(markRaw 数组) 创建 2000 个对象耗时约 ${(performance.now() - t0).toFixed(2)}ms`
}
</script>

<template>
  <div>
    <h1>18. 性能优化与响应式进阶</h1>
    <p class="lead">
      先记住结论：<strong>90% 的性能问题来自「不必要的响应式深度」和「不必要的重渲染」</strong>，
      剩下 10% 才是包体积和网络。
    </p>

    <BaseCard title="① shallowRef：只关心整体替换" hint="点两个按钮，观察界面对比（值都在变，但只有 normal 会更新界面）。" tone="warn">
      <div class="grid2">
        <div>
          <p class="kv">normalObj.deep.count = {{ normalObj.deep.count }}</p>
          <p class="kv">shallowObj.deep.count = {{ shallowObj.deep.count }}</p>
          <div class="row">
            <button @click="mutateDeepNormal">改 normalObj 深层</button>
            <button @click="mutateDeepShallow">改 shallowObj 深层（界面不更新）</button>
            <button @click="replaceShallow">整体替换 shallowObj</button>
            <button @click="forceShallowUpdate">triggerRef 强制更新</button>
          </div>
        </div>
        <div>
          <p class="hint">适用场景：</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px">
            <li>大数组 / 大对象，只做「整体替换」</li>
            <li>第三方实例（图表、地图、编辑器）</li>
            <li>不可变数据流（每次返回新对象）</li>
          </ul>
          <p class="kv" style="margin-top: 6px">本组件渲染次数：{{ renderCount }}</p>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">
const list = shallowRef&lt;Item[]&gt;([])
list.value[0].name = 'x'      // ❌ 不触发更新
list.value = [...list.value]  // ✅ 整体替换（不可变更新）

// shallowReactive：只追踪第一层属性
const state = shallowReactive({ a: 1, nested: { b: 2 } })
state.a = 2          // ✅
state.nested.b = 3   // ❌</pre
      >
    </BaseCard>

    <BaseCard title="② markRaw：把不该响应式的对象排除在外" hint="第三方实例、大常量、纯函数对象，加了 markRaw 能省下大量 Proxy 开销。">
      <div class="row">
        <button @click="checkRaw">检查 markRaw 标记</button>
        <span class="tag" :class="isChartReactive ? 'pass' : 'warn'">
          {{ isChartReactive ? '已被 markRaw 跳过响应式 ✅' : '（点按钮检查）' }}
        </span>
        <span class="kv">{{ chartInstance.init() }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">
import { markRaw, reactive } from 'vue'

const chart = markRaw(new ECharts(el))     // 永远不会被 proxy 化
const state = reactive({ chart, data: [] }) // chart 不进响应式系统，data 照常

// 注意：markRaw 之后对该对象的修改不会触发更新 —— 这通常是好事（第三方库自己管渲染）</pre
      >
    </BaseCard>

    <BaseCard title="③ v-memo：500 行列表，只有选中态变化" hint="点某一行：v-memo 打开时，未选中行的 diff 被跳过。">
      <div class="row">
        <label class="kv"><input type="checkbox" v-model="memoEnabled" /> 启用 v-memo</label>
        <span class="kv">选中：{{ selectedId ?? '（无）' }}</span>
        <span class="kv">交互次数：{{ renderTicks }}</span>
      </div>

      <div class="memolist">
        <template v-if="memoEnabled">
          <div
            v-for="row in rows"
            :key="row.id"
            v-memo="[row.id, row.score, selectedId === row.id]"
            class="memorow"
            :class="{ sel: selectedId === row.id }"
            @click="toggleSelect(row.id)"
          >
            {{ row.label }} ｜ 分数 {{ row.score }}
          </div>
        </template>
        <template v-else>
          <div
            v-for="row in rows"
            :key="row.id"
            class="memorow"
            :class="{ sel: selectedId === row.id }"
            @click="toggleSelect(row.id)"
          >
            {{ row.label }} ｜ 分数 {{ row.score }}
          </div>
        </template>
      </div>
      <p class="hint" style="margin-top: 8px">
        在 Performance 面板录制，对比开关 v-memo 时的 scripting 时间。注意：v-memo
        只跳过<strong>虚拟 DOM 的 diff</strong>，列表本身的渲染开销还是有的 —— 所以更彻底的方案是虚拟滚动（见下）。
      </p>
    </BaseCard>

    <BaseCard title="④ 虚拟滚动：只渲染可视区（1 万行实测）" hint="滚动它，DOM 节点数始终只有几十个。" tone="ok">
      <VirtualList :total="10000" :row-height="28" :viewport-height="260" />
      <pre class="code" style="margin-top: 10px">
// 原理（完整实现见 src/components/VirtualList.vue）
const start = Math.floor(scrollTop / rowHeight) - buffer
const end = start + Math.ceil(viewportHeight / rowHeight) + buffer * 2
const visible = all.slice(start, end)
// 容器高度 = 总行数 * 行高；可视行用 translateY(start * rowHeight) 定位</pre
      >
    </BaseCard>

    <BaseCard title="⑤ computed 缓存 vs 模板里调用方法" hint="点「改 unrelated」：computed 不重算，方法每次渲染都跑。">
      <div class="row">
        <button @click="unrelated++">改 unrelated（{{ unrelated }}）</button>
        <button @click="stats.a++">改 stats.a（{{ stats.a }}）</button>
        <span class="kv">heavy 计算次数：{{ heavyCalls }}</span>
        <span class="tag pass">computed 结果：{{ heavyComputed }}</span>
      </div>
      <p class="hint" style="margin-top: 8px">
        只在模板里用一次、且依赖频繁变化的「重计算」，用 computed（有缓存）；
        反之如果依赖每次渲染都变（比如依赖 $event），缓存也没意义。
      </p>
    </BaseCard>

    <BaseCard title="⑥ 大列表的响应式开销实测">
      <div class="row">
        <button @click="rebuildReactive">用 ref 创建 2000 个响应式对象</button>
        <button @click="rebuildRaw">用 shallowRef + markRaw 创建</button>
        <span class="kv">{{ listNote || '（点按钮看耗时对比）' }}</span>
      </div>
      <p class="hint" style="margin-top: 8px">
        结论：数据量大、且不需要深层响应式时，<code>shallowRef</code> + <code>markRaw</code>
        能把初始化开销从「O(属性数)」降到「O(1)」。表格组件、日志流、地图点位数据都适用。
      </p>
    </BaseCard>

    <BaseCard title="⑦ 性能优化清单（按性价比排序）" tone="ok">
      <ol style="margin: 0; padding-left: 20px">
        <li><b>懒加载 + 分包</b>：路由级 <code>() =&gt; import()</code>、异步组件、按需引入 UI 库。</li>
        <li><b>列表用稳定 key，长列表上虚拟滚动</b>（1 万行以上收益巨大）。</li>
        <li><b>拆分组件，让更新范围变小</b>：状态放在真正使用它的最小组件里。</li>
        <li><b>用 computed 预计算</b>，模板里保持 <code>{{ }}</code> 简单。</li>
        <li><b>shallowRef / markRaw / shallowReactive</b>：大数据、第三方实例。</li>
        <li><b>v-once / v-memo</b>：纯静态内容与大列表。</li>
        <li><b>避免在渲染函数里创建大对象/数组</b>（每次渲染都新建 → 触发子组件更新）。</li>
        <li><b>图片懒加载 + 合适的尺寸</b>，该用 CDN/缓存的走 CDN。</li>
        <li><b>用 KeepAlive 缓存来回切换的页面</b>（但要处理 onActivated 刷新时机）。</li>
        <li><b>别过早优化</b>：先看 Performance / Vue Devtools 的组件渲染次数。</li>
      </ol>
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
.memolist {
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  margin-top: 8px;
}
.memorow {
  padding: 4px 10px;
  border-bottom: 1px solid var(--c-border);
  font-size: 12.5px;
  cursor: pointer;
}
.memorow.sel {
  background: rgba(66, 184, 131, 0.18);
}
</style>
