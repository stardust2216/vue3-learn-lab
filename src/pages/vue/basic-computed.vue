<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import RenderCounter from '@/components/RenderCounter.vue'

/* ============================================================================
 * 3. 计算属性 computed
 * - 有缓存：依赖不变时多次访问只算一次（这是它和 methods 的本质区别）
 * - 依赖响应式数据，自动追踪
 * - 默认只读；传 get/set 可以做「可写计算属性」
 * ========================================================================== */

const firstName = ref('张')
const lastName = ref('三')
const age = ref(20)

// ---------- ① 只读 computed ----------
const fullName = computed(() => `${firstName.value}${lastName.value}`)
const isAdult = computed(() => age.value >= 18)
const label = computed(() => (isAdult.value ? '成年人' : '未成年人'))

// computed 里也可以做数组过滤/排序（非常常见）
const todos = ref([
  { id: 1, text: '学 ref', done: true },
  { id: 2, text: '学 computed', done: false },
  { id: 3, text: '学 watch', done: false },
])
const filter = ref<'all' | 'done' | 'todo'>('all')
const visibleTodos = computed(() =>
  todos.value.filter((t) => (filter.value === 'all' ? true : filter.value === 'done' ? t.done : !t.done)),
)
const remainCount = computed(() => todos.value.filter((t) => !t.done).length)

// ---------- ② 可写 computed：get / set ----------
const fullNameWritable = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set(v: string) {
    const [f = '', l = ''] = v.split(' ')
    firstName.value = f
    lastName.value = l
  },
})

// ---------- ③ 与方法对比：用计数器直观证明「缓存」 ----------
// 两条重要规则（本页的坑就在这）：
//  1) computed 的 getter 必须是纯函数：不能在里面对响应式数据做「写」操作；
//  2) 也不要在渲染期间（模板表达式 / 渲染钩子）修改响应式状态，否则会
//     「渲染 → 改状态 → 再渲染」无限递归，Vue 会直接抛 Maximum recursive updates。
// 所以「求值次数」用普通变量（非响应式）统计，需要展示时再手动同步到 ref。
const computedCalls = ref(0)
let computedCallsRaw = 0
const base = ref(1)
const recompute = ref(0) // 点「强制重渲染」+1：让父组件重渲染，但传给子组件的 props 没变
const unrelated = ref(0)

// 方法：写在模板里就是「每次渲染都调用」
function methodSquare() {
  return base.value * base.value
}

// computed：依赖 base 不变时直接返回缓存值，只有依赖变化才重新求值
const computedSquare = computed(() => {
  computedCallsRaw++
  return base.value * base.value
})

/** 由按钮触发：把累计的求值次数同步到界面（避免在 getter 里写响应式状态） */
function syncStats() {
  computedCalls.value = computedCallsRaw
}
</script>

<template>
  <div>
    <h1>3. 计算属性 computed</h1>
    <p class="lead">
      什么时候用：<strong>从已有响应式数据「推导」出新数据</strong>。有缓存、无副作用、声明式。
      记住三条：不要在 computed 里改数据、不要写异步、不要依赖非响应式的东西。
    </p>

    <BaseCard title="① 只读 computed：声明式派生数据" hint="依赖 firstName / lastName / age，改它们即可看到全联动。">
      <div class="row">
        <input v-model="firstName" style="width: 70px" />
        <input v-model="lastName" style="width: 70px" />
        <input type="number" v-model.number="age" style="width: 70px" />
      </div>
      <div class="row" style="margin-top: 8px">
        <span class="tag pass">fullName = {{ fullName }}</span>
        <span class="tag info">isAdult = {{ isAdult }}</span>
        <span class="tag">{{ label }}</span>
      </div>
    </BaseCard>

    <BaseCard title="② 列表派生：过滤 + 统计" hint="最常见的真实场景：原始列表 → 过滤后列表 / 统计信息。">
      <div class="row">
        <button :class="{ primary: filter === 'all' }" @click="filter = 'all'">全部</button>
        <button :class="{ primary: filter === 'done' }" @click="filter = 'done'">已完成</button>
        <button :class="{ primary: filter === 'todo' }" @click="filter = 'todo'">未完成</button>
        <span class="kv">剩余 {{ remainCount }} 项</span>
      </div>
      <ul style="margin: 10px 0 0; padding-left: 18px">
        <li v-for="t in visibleTodos" :key="t.id">
          <label><input type="checkbox" v-model="t.done" /> {{ t.text }}</label>
        </li>
      </ul>
      <p class="hint" style="margin-top: 8px">
        注意：过滤逻辑写在 computed 里，模板只写 <code>v-for="t in visibleTodos"</code>。
        模板里越少逻辑，越好维护。
      </p>
    </BaseCard>

    <BaseCard title="③ 可写 computed（get / set）" hint="需要「改派生值 → 反向改源数据」时使用。">
      <div class="row">
        <input v-model="fullNameWritable" placeholder="输入「姓 名」，带空格" style="width: 200px" />
        <span class="kv">上面的改动会写回 firstName / lastName</span>
      </div>
      <pre class="code" style="margin-top: 10px">
const fullName = computed({
  get: () => firstName.value + ' ' + lastName.value,
  set: (v) => { const [f, l] = v.split(' '); firstName.value = f; lastName.value = l },
})</pre
      >
    </BaseCard>

    <BaseCard
      title="④ 缓存实测：computed vs method"
      hint="点「改 unrelated」：父组件重渲染了，方法会再跑一次，但 computed 求值次数不变（用了缓存）。"
      tone="ok"
    >
      <div class="row">
        <span class="kv">base = {{ base }}</span>
        <span class="kv">unrelated = {{ unrelated }}</span>
        <button @click="base++">改 base（computed 会重算）</button>
        <button @click="unrelated++; syncStats()">改 unrelated（computed 不该重算）</button>
        <button class="primary" @click="recompute++; syncStats()">
          强制重渲染（{{ recompute }}）
        </button>
      </div>
      <div class="grid2" style="margin-top: 10px">
        <div>
          <p class="kv">computed 累计求值次数：<b>{{ computedCalls }}</b>（点按钮手动同步显示）</p>
          <p class="kv">平方值：method={{ methodSquare() }} / computed={{ computedSquare }}</p>
          <RenderCounter label="子组件" :value="base * base" />
        </div>
        <div>
          <p class="hint">
            观察方法：点「改 unrelated」让父组件重渲染 —— 模板里的 <code>methodSquare()</code>
            每次渲染都会执行，而 <code>computedSquare</code> 只在 <b>base 变化</b> 时才重新计算，
            其余时候直接返回缓存值（所以求值次数不动）。
          </p>
          <p class="hint">
            子组件只接收 <code>base * base</code> 这个值作为 prop，所以 unrelated 变化时它<strong>不会</strong>
            重新渲染（计数停在 0）；而如果直接把一个每次渲染都新建的对象传给子组件，
            它就会每次都被更新。这就是「稳定 props + computed 预计算」的威力。
          </p>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="⑤ computed 的常见误区" tone="warn">
      <table>
        <thead>
          <tr>
            <th>误区</th>
            <th>说明</th>
            <th>正确做法</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>在 computed 里改其他状态</td>
            <td>违反「纯函数」，会造成难以追踪的循环更新</td>
            <td>改用 watch，或在事件处理函数里改</td>
          </tr>
          <tr>
            <td>用 computed 发请求</td>
            <td>computed 需要同步返回值，异步拿到的是 Promise</td>
            <td>用 watch + async，或组合式函数（第 12 页）</td>
          </tr>
          <tr>
            <td>依赖了非响应式变量</td>
            <td>不会触发重算（比如普通 let 变量）</td>
            <td>把它变成 ref/reactive，或改为函数调用</td>
          </tr>
          <tr>
            <td>computed 里 return 数组后直接 push</td>
            <td>返回的是新数组，push 改的是缓存值，语义混乱</td>
            <td>要改源数据就改源 ref，别改 computed 结果</td>
          </tr>
        </tbody>
      </table>
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
