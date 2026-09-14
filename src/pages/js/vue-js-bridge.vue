<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 12. 与 Vue 的桥梁
 *
 * 这一页把前面 11 页的 JS 知识接到 Vue 3 的响应式实现上：
 *   ① 用 Proxy + WeakMap + effect 手写 30 行 mini reactive
 *   ② 为什么是 Proxy 而不是 defineProperty
 *   ③ ref 为什么必须 .value（以及 reactive 里为什么不用）
 *   ④ 响应式丢失的 JS 层面原因：解构即取值、引用被替换
 *   ⑤ 数组方法为什么能触发更新、shallowRef 什么时候用
 *   ⑥ 闭包 = 组合式函数的状态私有化（对应 src/composables/index.ts）
 * ========================================================================== */

// ==================== ① 手写迷你 reactive（20 行核心） ====================
/** 正在收集依赖的副作用函数（Vue 内部叫 activeEffect） */
let activeEffect: (() => void) | null = null
/** 每个「响应式对象」一张依赖表：属性名 → 用到它的副作用集合 */
const depsMap = new WeakMap<object, Map<string | symbol, Set<() => void>>>()

function track(target: object, key: string | symbol) {
  if (!activeEffect) return // 没有副作用在跑 → 不是「依赖收集时机」
  let deps = depsMap.get(target)
  if (!deps) depsMap.set(target, (deps = new Map()))
  let set = deps.get(key)
  if (!set) deps.set(key, (set = new Set()))
  set.add(activeEffect) // 记住「谁用了我」
}

function trigger(target: object, key: string | symbol) {
  const deps = depsMap.get(target)
  if (!deps) return
  const set = deps.get(key)
  if (!set) return
  for (const fn of [...set]) fn() // 通知「用到我的」全部重跑
}

function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(t, key, receiver) {
      track(t, key) // 读的时候收集依赖
      return Reflect.get(t, key, receiver)
    },
    set(t, key, value, receiver) {
      const old = (t as Record<string | symbol, unknown>)[key]
      const ok = Reflect.set(t, key, value, receiver)
      if (!Object.is(old, value)) trigger(t, key) // 只有真的变了才通知
      return ok
    },
    deleteProperty(t, key) {
      const had = Object.prototype.hasOwnProperty.call(t, key)
      const ok = Reflect.deleteProperty(t, key)
      if (had) trigger(t, key)
      return ok
    },
  })
}

function effect(fn: () => void) {
  const run = () => {
    activeEffect = run
    try {
      fn()
    } finally {
      activeEffect = null // 一定要还原，否则依赖会串台
    }
  }
  run() // 立刻跑一次，顺便收集依赖
  return run
}

// ---------- 交互演示：用 mini reactive 驱动页面 ----------
const state = reactive({ count: 0, label: '次数' })
const doubled = ref(0)
const effectRuns = ref(0)
const manualRender = ref('') // 只做展示，不要让 effect 依赖它

const stopMini = effect(() => {
  // 这个函数里【读到了】state.count 与 state.label，所以它俩变化时本函数会重跑
  effectRuns.value++
  doubled.value = state.count * 2
  manualRender.value = `${state.label} = ${state.count}，翻倍 = ${state.count * 2}`
})

/** 对照：一个没有被 Proxy 包过的普通对象，改它没有任何反应 */
const plain = { count: 0 }
const plainRuns = ref(0)
effect(() => {
  plainRuns.value++
  void plain.count // 读的是普通对象 → track 根本不会记录
})

function countUp() {
  state.count += 1
}
function upPlain() {
  plain.count += 1 // 改了，但不会触发任何 effect
}
function stopEffect() {
  stopMini()
}

// ---------- 演示：追踪表内容 ----------
const trackedKeys = ref<string[]>([])
function inspectDeps() {
  // depsMap 是我们自己的 WeakMap，可以直接读出来看（Vue 内部没有暴露这个能力）
  const table = depsMap.get(state as object)
  trackedKeys.value = table ? [...table.entries()].map(([k, set]) => `"${String(k)}" ← ${set.size} 个 effect`) : []
}

// ==================== ② ref 的等价实现 ====================
const r1 = ref(0)
const r2 = ref(5)
const refSum = ref(0)
const refProbe = shallowRef(0)

const stopRef = effect(() => {
  refSum.value = r1.value + r2.value
  refProbe.value = refSum.value
})

function bumpR1() {
  r1.value += 1
}
function bumpR2() {
  r2.value += 1
}

// ==================== ③ 响应式丢失 ====================
interface DemoUser {
  name: string
  age: number
  profile: { city: string; nickname: string }
}
const user = reactive<DemoUser>({
  name: '小明',
  age: 18,
  profile: { city: '杭州', nickname: 'vue-fan' },
})
const lostLog = ref<string[]>([])
const renderCount = ref(0)

function llog(line: string) {
  lostLog.value = [line, ...lostLog.value].slice(0, 7)
}

// 「渲染」= 一个读取了 user.name 的 effect
effect(() => {
  renderCount.value++
  void user.name
})

// 坑 1：解构 = 当场把值拷贝出来，等于读了一次就再也不看了
const { name: destructuredName } = user
function changeName() {
  user.name = user.name === '小明' ? '小红' : '小明'
  llog(`user.name 改成了 ${user.name}；渲染 effect 跑了 ${renderCount.value} 次；但解构出来的 destructuredName 还是 "${destructuredName}"`)
}

// 坑 2：整体替换引用 → 交出去的那个 Proxy 还在盯着旧对象
function replaceWholeObject() {
  user.profile = { city: '上海', nickname: 'vue-fan-2' }
  llog(`替换 user.profile 引用后：user.profile.city = ${user.profile.city}（顶层属性变了，effect 会触发）`)
}
function mutateOldReference() {
  const old = { city: '北京', nickname: 'old' }
  const proxied = reactive(old)
  old.city = '广州' // ❌ 改原始对象（不是 Proxy）
  llog(`改原始对象后 proxied.city = ${proxied.city}（还是"北京"！Proxy 只管穿过它的读写）`)
}

// ==================== ④ 数组与响应式 ====================
const list = ref<number[]>([1, 2, 3])
const listRender = ref(0)
const listStrategy = ref('还没操作')
const arrayLog = ref<string[]>([])

effect(() => {
  listRender.value++
  void list.value.length // 只要读了 length，任何长度变化都会触发
})

function arrPush() {
  list.value.push(Math.floor(Math.random() * 90) + 10)
  listStrategy.value = 'push：写 index + 写 length → 两个都被 track 过，所以能触发'
  arrayLog.value = [`push 后 length = ${list.value.length}，渲染 effect 累计 ${listRender.value} 次`, ...arrayLog.value].slice(0, 5)
}
function arrReplace() {
  const next = [...list.value]
  next[0] = Math.floor(Math.random() * 90) + 10
  list.value = next
  listStrategy.value = '整体替换：直接改 .value，一次触发，最省事'
  arrayLog.value = [`整体替换后：[${list.value.join(', ')}]，渲染 effect 累计 ${listRender.value} 次`, ...arrayLog.value].slice(0, 5)
}
function arrMutateInPlace() {
  const raw = list.value
  raw[1] = 999 // 注意：list.value 是【响应式代理】，所以这样写其实也能触发
  listStrategy.value = '就地改下标：在 Vue 3 里可以（因为 value 返回的是 Proxy）'
  arrayLog.value = [`就地改下标后：${JSON.stringify(list.value)}，渲染 effect 累计 ${listRender.value} 次`, ...arrayLog.value].slice(0, 5)
}

// ==================== ⑤ 闭包 = 状态私有化 ====================
/** 组合式函数的最小骨架：闭包就是「私有 state + 公开方法」 */
function useMiniCounter(initial = 0, step = 1) {
  const count = ref(initial) // ← 这个变量只活在本函数的闭包里
  const inc = () => (count.value += step)
  const dec = () => (count.value -= step)
  const reset = () => (count.value = initial)
  return { count, inc, dec, reset }
}

const counterA = useMiniCounter(0, 1)
const counterB = useMiniCounter(100, 10)
const closureLog = ref<string[]>([])

function bumpA() {
  counterA.inc()
  closureLog.value = [`A 的 inc（step=1）→ ${counterA.count.value}`, ...closureLog.value].slice(0, 5)
}
function bumpB() {
  counterB.inc()
  closureLog.value = [`B 的 inc（step=10）→ ${counterB.count.value}`, ...closureLog.value].slice(0, 5)
}
function peekInternals() {
  // 外部完全拿不到 count 这个 ref 的初始配置，只能通过返回值操作 —— 这就是封装
  closureLog.value = [
    `A = ${counterA.count.value}（initial 0, step 1）｜ B = ${counterB.count.value}（initial 100, step 10）`,
    ...closureLog.value,
  ].slice(0, 5)
}

onBeforeUnmount(() => {
  stopRef()
  stopMini()
})
</script>

<template>
  <div>
    <h1>12. 与 Vue 的桥梁</h1>
    <p class="lead">
      Vue 3 的响应式 = <strong>Proxy 拦截读写（第 9 页的原型与属性查找）+ WeakMap 存依赖表 + 闭包保存 effect（第 3 页）</strong>。
      这一页把那 20 行核心代码摊开跑给你看，再解释三件每天都在踩的事：
      <code>ref</code> 为什么要 <code>.value</code>、解构为什么会丢响应式、<code>shallowRef</code> 什么时候救命。
    </p>

    <!-- ============ 卡片 1：手写 mini reactive ============ -->
    <JsCard
      title="① 手写迷你 reactive：track / trigger + effect（真的能响应）"
      hint="点「count++」看页面上数字自己变；点「改普通对象」看什么都不会发生。"
      tone="ok"
    >
      <div class="row">
        <button class="primary" @click="countUp">state.count++ （响应式）</button>
        <button @click="upPlain">plain.count++ （普通对象）</button>
        <button @click="inspectDeps">查看依赖表</button>
        <button class="danger" @click="stopEffect">停止 effect（模拟组件卸载）</button>
      </div>
      <div class="row" style="margin-top: 8px">
        <span class="tag pass">{{ manualRender }}</span>
        <span class="tag">effect 运行次数 = {{ effectRuns }}</span>
        <span class="tag warn">普通对象 effect 运行次数 = {{ plainRuns }}</span>
      </div>
      <p class="kv" style="margin-top: 6px">
        {{ trackedKeys.join(' ｜ ') || '（点「查看依赖表」看看谁依赖了 state 的哪些属性）' }}
      </p>
      <pre class="code" style="margin-top: 10px">// ===== 这就是响应式的全部核心（约 30 行，去掉了边界处理）=====
let activeEffect = null                       // 当前正在跑的副作用
const depsMap = new WeakMap()                 // 对象 → Map(属性 → Set(effect))

function track(target, key) &#123;
  if (!activeEffect) return                   // 只有「在 effect 里读」才算依赖
  let deps = depsMap.get(target)
  if (!deps) depsMap.set(target, (deps = new Map()))
  let set = deps.get(key)
  if (!set) deps.set(key, (set = new Set()))
  set.add(activeEffect)                       // 记录：这个属性被谁用到了
&#125;

function trigger(target, key) &#123;
  const set = depsMap.get(target)?.get(key)
  if (set) for (const fn of [...set]) fn()    // 通知所有用过它的 effect 重跑
&#125;

function reactive(target) &#123;
  return new Proxy(target, &#123;
    get(t, key, receiver) &#123;
      track(t, key)                           // ← 读：收集依赖
      return Reflect.get(t, key, receiver)
    &#125;,
    set(t, key, value, receiver) &#123;
      const old = t[key]
      const ok = Reflect.set(t, key, value, receiver)
      if (!Object.is(old, value)) trigger(t, key)   // ← 写：触发更新
      return ok
    &#125;,
  &#125;)
&#125;

function effect(fn) &#123;
  const run = () =&gt; &#123;
    activeEffect = run
    try &#123; fn() &#125; finally &#123; activeEffect = null &#125;   // 必须 finally 还原
  &#125;
  run()                                       // 立即执行一次，顺便收集依赖
  return run
&#125;

// 组件渲染函数就是一个 effect：读到了哪些响应式数据，就订阅了哪些数据。
// 数据一变 → trigger → 重新执行渲染 effect → 生成新的虚拟 DOM → 打补丁。</pre>
      <div class="pc-grid" style="margin-top: 10px">
        <pre class="code">// 真实 Vue 在这 30 行上加了什么？
// 1) 依赖层级：Vue 用 targetMap → depsMap → dep，
//    每个 dep 还带 computed / watch 的标记（flags），区分「谁在等谁」
// 2) 调度器（scheduler）：effect 不立刻跑，而是推进队列，
//    在微任务里批量 flush —— 所以同一轮改 3 次只渲染 1 次
// 3) 嵌套 effect（组件套组件）：用一个 effect 栈保存父级，
//    跑完子 effect 要恢复父级（本页用单变量 activeEffect，嵌套就会错）
// 4) 分支切换：每次重跑前先清空旧依赖（cleanup），
//    否则 if (flag) &#123; a &#125; else &#123; b &#125; 里永远同时依赖 a 和 b
// 5) 深度递归：对象套对象时对每一层都 reactive（lazy 代理）</pre>
        <pre class="code">// 为什么依赖表用 WeakMap 而不是普通对象/Map？
const cache = new WeakMap()
let obj = &#123; a: 1 &#125;
cache.set(obj, 'meta')
obj = null
// WeakMap 的键是【弱引用】：
// 对象被回收后，这条记录会自动消失，不需要手动 delete
// 而 Map 会强引用住键 → 组件卸载了，它对应的代理对象和依赖表还在内存里 = 泄漏

// 同理：Vue 内部给「原始对象 ↔ 代理对象」做了 WeakMap 双向缓存
// （reactive(raw) === reactive(raw)，不会每次都包一层新 Proxy）

// 顺带回答一个高频问题：为什么不用 Map？
// Map 的键可以是任意值（包括原始值），但它的强引用会让缓存永远不释放；
// WeakMap 的键只能是对象，换来的是「垃圾回收友好」。
// 这也是本项目 / 面试里「WeakMap 有什么用」的标准答案之一。</pre>
      </div>
    </JsCard>

    <!-- ============ 卡片 2：为什么 Proxy ============ -->
    <JsCard
      title="② 为什么从 defineProperty 换成 Proxy"
      hint="左侧是 Vue 2 的拦截方式，右侧是 Vue 3；表格里是「换掉之后修好了什么」。"
    >
      <div class="pc-grid">
        <pre class="code">// ---------- Vue 2：Object.defineProperty ----------
function defineReactive(obj, key, val) &#123;
  const dep = []                      // 这个属性的订阅者
  Object.defineProperty(obj, key, &#123;
    enumerable: true,
    configurable: true,
    get() &#123; dep.push(activeEffect); return val &#125;,
    set(next) &#123; if (next !== val) &#123; val = next; dep.forEach((fn) =&gt; fn()) &#125; &#125;,
  &#125;)
&#125;

// 初始化时必须【递归遍历所有属性】逐个转换
function observe(obj) &#123;
  for (const key of Object.keys(obj)) defineReactive(obj, key, obj[key])  // 深递归，启动慢
  return obj
&#125;
// ❌ 数组下标改不了（defineProperty 拦不到 arr[0] = x，Vue 2 只能重写 7 个数组方法）
// ❌ 新增/删除属性拦不到（必须 Vue.set / Vue.delete）
// ❌ 必须一开始就遍历完，大对象/大数组初始化成本高
// ❌ 无法知道「读的是哪个属性」以外的语义（in / delete / 遍历都拦不到）</pre>
        <pre class="code">// ---------- Vue 3：Proxy ----------
const p = new Proxy(raw, &#123;
  get(target, key, receiver) &#123; track(target, key); return Reflect.get(target, key, receiver) &#125;,
  set(target, key, value, receiver) &#123;
    const old = target[key]
    const ok = Reflect.set(target, key, value, receiver)
    if (!Object.is(old, value)) trigger(target, key)
    return ok
  &#125;,
  has(target, key) &#123; track(target, key); return Reflect.has(target, key) &#125;,            // in
  deleteProperty(target, key) &#123; trigger(target, key); return Reflect.deleteProperty(target, key) &#125;,
  ownKeys(target) &#123; track(target, ITERATE_KEY); return Reflect.ownKeys(target) &#125;,      // 遍历
&#125;)
// ✅ 新增 / 删除属性天然可拦截（不需要 Vue.set）
// ✅ 数组下标、length、push 都能拦（数组就是普通对象）
// ✅ 惰性代理：只有真正访问到嵌套对象时才包一层（大对象初始化更快）
// ✅ 能拦截的操作有 13 种（defineProperty / getPrototypeOf / has ... 见规范）

// ⚠️ 代价：Proxy 不支持 IE（Vue 3 因此放弃了 IE11）；
//    且每次读写都要走一层 trap，单次访问比 defineProperty 慢一点点
//    —— 但省掉了「递归初始化」，整体通常更快。</pre>
      </div>
      <table class="vj-table" style="margin-top: 10px">
        <thead>
          <tr>
            <th>场景</th>
            <th>defineProperty（Vue 2）</th>
            <th>Proxy（Vue 3）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>arr[0] = 1</code></td>
            <td>拦不到（要靠重写数组方法）</td>
            <td>✅ 拦得到（set trap）</td>
          </tr>
          <tr>
            <td><code>arr.length = 0</code></td>
            <td>拦不到</td>
            <td>✅ 拦得到</td>
          </tr>
          <tr>
            <td><code>obj.newKey = 1</code></td>
            <td>拦不到（Vue.set 才行）</td>
            <td>✅ 拦得到</td>
          </tr>
          <tr>
            <td><code>delete obj.key</code></td>
            <td>拦不到（Vue.delete 才行）</td>
            <td>✅ 拦得到 deleteProperty</td>
          </tr>
          <tr>
            <td><code>'key' in obj</code> / <code>for...in</code></td>
            <td>拦不到</td>
            <td>✅ has / ownKeys trap</td>
          </tr>
          <tr>
            <td>初始化 10000 个属性的对象</td>
            <td>必须深度递归，卡启动</td>
            <td>惰性：用到哪一层代理哪一层</td>
          </tr>
          <tr>
            <td>浏览器兼容性</td>
            <td>IE9+</td>
            <td>不支持 IE（可用 @vue/compat 降级）</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        一句话：<strong>defineProperty 是「给每个属性装一个探针」，Proxy 是「给整个对象套一层壳」</strong>；
        壳能看见的操作更多，而且不用提前拆开对象。
      </p>
    </JsCard>

    <!-- ============ 卡片 3：ref 为什么 .value ============ -->
    <JsCard
      title="③ ref 为什么要 .value（可运行验证 + 交互）"
      hint="点按钮试试：迷你 reactive 驱动 ref，两个 ref 相加也会自动更新。"
    >
      <div class="row">
        <button class="primary" @click="bumpR1">r1.value++ （当前 {{ r1 }}）</button>
        <button @click="bumpR2">r2.value++ （当前 {{ r2 }}）</button>
        <span class="tag pass">r1 + r2 = {{ refSum }}（由 effect 自动算）</span>
      </div>
      <div class="pc-grid" style="margin-top: 10px">
        <pre class="code">// ref 的本质：一个「带 get/set 的包装对象」
class RefImpl &#123;
  constructor(value) &#123;
    this._value = value
  &#125;
  get value() &#123;
    track(this, 'value')      // 读 .value 时收集依赖
    return this._value
  &#125;
  set value(next) &#123;
    if (Object.is(next, this._value)) return
    this._value = next
    trigger(this, 'value')    // 写 .value 时触发更新
  &#125;
&#125;
const count = new RefImpl(0)
count.value++                 // 必须经过 get/set，才能被拦截

// ---------- 为什么不能像 reactive 那样直接写？ ----------
// 因为【原始值是拦不住的】：
let n = 0
// 没有任何办法监听「n 被重新赋值」这件事 ——
// Proxy 只能包裹对象，defineProperty 只能定义在对象上。
// 所以必须把值装进一个对象，用「访问对象的属性」这个动作来承载拦截。
// 这就是 count.value 存在的唯一原因（不是设计失误，是语言限制）。

// ---------- 为什么模板里不用写 .value？----------
// Vue 的模板编译会【自动解包】顶层 ref：
//   &#123;&#123; count &#125;&#125;        →  _ctx.count.value
//   @click="count++"   →  _ctx.count.value++
// 但在 &lt;script&gt; 里、在数组/集合里、在普通对象里，都必须自己写 .value
// （reactive 对象的属性会自动解包：reactive(&#123; c: count &#125;).c 就是数字）</pre>
        <pre class="code">// ---------- reactive vs ref：什么时候用哪个 ----------
// ref：任意类型（原始值、对象、数组），模板里自动解包
//      场景：单个基本类型、会被整体替换的值（列表、接口返回）
// reactive：只能接对象/数组，返回 Proxy，属性直接访问
//      场景：一组相关的状态（表单、状态机）

const form = reactive(&#123; name: '', age: 0 &#125;)   // form.name 直接用
const list = ref([])                          // list.value.push(x) 更明确

// ❌ 最常见的翻车：把 reactive 对象解构
const &#123; name &#125; = form                       // name 是普通字符串，永久失去响应式
// ✅ 用 toRefs / toRef 保持引用
const &#123; name: nameRef &#125; = toRefs(form)      // nameRef.value 仍然响应
// （Vue 3.5 之前 toRefs 很常用；现在更推荐直接用 ref + 组合式函数）

// ⚠️ ref 里装对象时，内部会被 reactive 包一层（深响应）
const obj = ref(&#123; a: &#123; b: 1 &#125; &#125;)
obj.value.a.b = 2          // ✅ 能触发（深层也是 Proxy）

// ---- 交互演示的可运行版：ref 与 reactive 的等价关系 ----
const count = ref(1)
console.log('ref 在模板外必须 .value：', count.value)
console.log('ref 本身是对象：', typeof count, Object.keys(count))   // object ['value']
console.log('reactive 的等价物：', reactive(&#123; value: 1 &#125;))         // 也是 get/set 拦截
console.log('isRef / isReactive 判断：', isRef(count), isReactive(form))</pre>
      </div>
      <JsCard
        title="runnable：三行看清 ref 的结构与解包规则"
        runnable="// 手写一个最小 Ref 类，看看 .value 到底藏在哪
class Ref &#123;
  constructor(v) &#123; this._value = v &#125;
  get value() &#123; console.log('  （有人读了 .value）'); return this._value &#125;
  set value(v) &#123; console.log('  （有人写了 .value）'); this._value = v &#125;
&#125;
const c = new Ref(1)
console.log('Ref 实例的键：' + JSON.stringify(Object.keys(c)))   // ['_value']
console.log('typeof c = ' + typeof c + '（是对象，不是数字）')
const n1 = c.value        // 触发 get
c.value = n1 + 1          // 触发 set
console.log('c.value = ' + c.value)

// 原始值为什么拦不住：下面这行没有任何办法被监听
let raw = 0
raw = 1                   // 就是一次普通赋值，没有 setter 可挂
console.log('raw = ' + raw + '（没有任何机制能观察它）')"
      />
    </JsCard>

    <!-- ============ 卡片 4：响应式丢失 ============ -->
    <JsCard
      title="④ 响应式丢失的 JS 层面原因：解构即取值、引用被替换"
      hint="点按钮：改名后看「解构出来的变量」和「渲染 effect 的次数」；再试试直接改原始对象。"
      tone="warn"
    >
      <div class="row">
        <button class="primary" @click="changeName">user.name 改名</button>
        <button @click="replaceWholeObject">替换 user.profile 引用</button>
        <button class="danger" @click="mutateOldReference">改「原始对象」（绕过 Proxy）</button>
        <input v-model="user.name" placeholder="输入框直接双向绑定（还是响应式的）" />
      </div>
      <div class="row" style="margin-top: 8px">
        <span class="tag">渲染 effect 累计：{{ renderCount }}</span>
        <span class="tag info">解构出来的 destructuredName = "{{ destructuredName }}"（永远是初始值）</span>
        <span class="tag pass">user.name = {{ user.name }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ lostLog.join('\n') || '（点按钮观察：谁跟着变，谁不变）' }}</pre>
      <div class="pc-grid" style="margin-top: 10px">
        <pre class="code">// ---------- 陷阱 1：解构 = 当场「读一次」并拷贝值 ----------
const user = reactive(&#123; name: '小明', age: 18 &#125;)

// 这一行等价于：const name = user.name
// 也就是【触发了一次 get】拿到当时的字符串 '小明'，此后再无联系
const &#123; name &#125; = user
user.name = '小红'
console.log(name)            // '小明'（普通字符串，不会变）
console.log(user.name)       // '小红'

// 更隐蔽的版本：把响应式对象当普通对象传给函数
function logName(&#123; name &#125;) &#123; console.log(name) &#125;   // 参数解构，拿到的是快照
// 正确做法：传整个对象（或者用 toRefs 传 ref）

// 为什么？因为 JS 里「对象属性」和「变量」是两种东西：
//   对象属性可以被 get/set 拦截（Proxy/defineProperty）
//   局部变量不能（没有语言级的钩子）
// 解构的动作本身就是「把属性读出来存进变量」——拦截在那一刻就结束了。

// 陷阱 1 的三种解法：
//   ① 不解构：user.name 直接用（组合式 API 里最常见的写法）
//   ② toRefs(user)：把每个属性变成 ref，{ name } 里就是 ref 对象
//   ③ 组合式函数返回 ref（本项目的 useCounter 就是返回 &#123; count &#125; 这个 ref）</pre>
        <pre class="code">// ---------- 陷阱 2：引用被替换 ----------
let profile = reactive(&#123; city: '杭州' &#125;)

// ❌ 把原始对象交出去之后，改原始对象不会通知任何人
const raw = &#123; city: '杭州' &#125;
const p2 = reactive(raw)
raw.city = '上海'             // 绕过 Proxy 直接改
console.log(p2.city)          // '杭州'（代理读的是 raw 的当前值？这里其实会变成上海）
// ⚠️ 注意细节：Proxy 的 get 是「透传」到原始对象的，
//    所以读 p2.city 其实读的是 raw.city → 会看到 '上海'，
//    但【不会触发 trigger】，因为写入没有经过 set trap！
//    → 现象是「数据变了但视图不更新」，比完全不同步更难查。

// ---------- 陷阱 2 的常见真实形态 ----------
// ① 从响应式对象里取出嵌套对象，之后只改这个引用
const nested = user.profile       // 它其实是 Proxy（Vue 会缓存），OK
const copy = &#123; ...user.profile &#125; // ❌ 浅拷贝出一份普通对象，改它没反应

// ② 把数组元素存进普通变量再改
const first = list.value[0]
first.name = 'x'                  // 如果元素是对象，它仍是 Proxy → OK
list.value[0] = &#123; name: 'x' &#125;    // 整体替换 → OK（走 set trap）

// ③ 用 JSON.parse(JSON.stringify(x)) 深拷贝 → 得到纯普通对象
const clone = JSON.parse(JSON.stringify(user))   // ❌ 完全脱离响应式

// 结论：响应式只覆盖「穿过代理对象的读写」，任何一次「拷出去」都会断开链路。</pre>
      </div>
    </JsCard>

    <!-- ============ 卡片 5：数组 + shallowRef ============ -->
    <JsCard
      title="⑤ 数组方法为什么能触发更新、shallowRef 什么时候用"
      hint="三个按钮做同一件事（往列表里加数据），看「渲染 effect 累计次数」的差别。"
    >
      <div class="row">
        <button class="primary" @click="arrPush">list.value.push(...)</button>
        <button @click="arrReplace">整体替换 list.value = [...next]</button>
        <button @click="arrMutateInPlace">就地改下标 list.value[1] = 999</button>
      </div>
      <div class="row" style="margin-top: 8px">
        <span class="tag pass">[{{ list.join(', ') }}]</span>
        <span class="tag">渲染 effect 累计：{{ listRender }}</span>
      </div>
      <p class="kv" style="margin-top: 6px">{{ listStrategy }}</p>
      <pre class="code" style="margin-top: 10px">{{ arrayLog.join('\n') || '（点按钮看累计次数）' }}</pre>
      <div class="pc-grid" style="margin-top: 10px">
        <pre class="code">// ---------- push 为什么能触发更新？----------
// 数组本身就是对象，push 内部做的事可以粗略理解为：
//   arr[arr.length] = newItem        → 触发 set trap（index 被 track 过？没有）
//   arr.length = arr.length + 1      → 触发 set trap（length 被 track 过吗？）

// 关键：渲染时只要读了 length（v-for 一定读了），
//       或者读了某个被改的 index，就会被 track 到。
//       → 于是 push 触发的 trigger 正好命中这些依赖。

const list = ref([1, 2, 3])
effect(() =&gt; &#123;
  console.log('渲染：length =', list.value.length)   // 这里读了 length
&#125;)
list.value.push(4)      // ✅ 触发（length 变了）
list.value[0] = 99      // ✅ 触发（index 0 被 set；若渲染时读过它就会被通知）
list.value.length = 0   // ✅ 触发

// Vue 2 时代必须重写 push/pop/shift/unshift/splice/sort/reverse 这 7 个方法，
// 因为 defineProperty 根本拦不到 arr[0] / arr.length。
// Vue 3 的 Proxy 天然能拦，所以【数组方法不需要特殊处理】了 ——
// 但为了兼容「读 length」这种依赖，内部仍然对 length / 迭代键做了特殊 track。</pre>
        <pre class="code">// ---------- shallowRef / shallowReactive：只关心第一层 ----------
// ref(大对象) 会把整个对象递归变成 Proxy：每个属性都建依赖，成本高
const big = ref(await fetchHugeList())     // ❌ 几千条数据全变 Proxy

// shallowRef：只有 .value 整体替换才触发，内部属性改动不触发
const big2 = shallowRef(hugeList)          // ✅ 省掉全部深层代理
big2.value[0].name = 'x'                   // 不触发（性能换来的代价）
big2.value = newList                       // ✅ 触发

// 什么时候必须用 shallowRef？
//  1) 存第三方实例：ECharts / 地图 / 富文本编辑器 / WebGL 对象
//     这些实例绝不能被 Proxy 包（会有循环引用、内部 this 绑定错乱、
//     甚至直接报错），而且它们的变化由库自己管理，不需要 Vue 侦听
//  2) 大列表 / 大表格：只做整体替换，不需要逐项响应
//  3) 只读数据（配置、常量）：永远不变，没必要建依赖

const chart = shallowRef(null)
onMounted(() =&gt; &#123;
  chart.value = echarts.init(el.value)     // ✅ 实例不进 Proxy
&#125;)
// 需要手动触发更新时：triggerRef(chart)

// 同理还有 shallowReactive（只代理第一层属性）、
// markRaw（永久标记「不要代理这个对象」）。</pre>
      </div>
    </JsCard>

    <!-- ============ 卡片 6：闭包与组合式函数 ============ -->
    <JsCard
      title="⑥ 闭包 = 组合式函数的状态私有化"
      hint="同一个 useMiniCounter 调用两次，两套完全独立的闭包状态；外部拿不到内部变量。"
      tone="ok"
    >
      <div class="row">
        <button class="primary" @click="bumpA">counterA.inc()（step 1）</button>
        <button @click="bumpB">counterB.inc()（step 10）</button>
        <button @click="peekInternals">查看两个实例</button>
      </div>
      <div class="row" style="margin-top: 8px">
        <span class="tag pass">A = {{ counterA.count.value }}</span>
        <span class="tag info">B = {{ counterB.count.value }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ closureLog.join('\n') || '（点按钮：两个实例互不影响）' }}</pre>
      <pre class="code" style="margin-top: 10px">// ---------- 组合式函数的骨架就是「闭包」 ----------
function useCounter(initial = 0, step = 1) &#123;
  const count = ref(initial)      // ← 被闭包捕获，外部不可见
  let timer                      // ← 同理，连"存在"都不暴露
  const inc = () =&gt; (count.value += step)
  const dec = () =&gt; (count.value -= step)
  const reset = () =&gt; (count.value = initial)
  // 返回的只是"能力"，不是"内部状态"
  return &#123; count, inc, dec, reset &#125;
&#125;

// 每次调用都会创建一套全新的词法环境：
const a = useCounter(0, 1)
const b = useCounter(100, 10)
a.inc()        // a.count = 1；b.count 还是 100
// step / initial 也被一起"锁"进了各自的闭包 —— 这就是"状态私有化"的本质：
// 不是靠 class 的 #private，而是靠【函数作用域 + 返回引用】

// ---------- 闭包在本项目里的真实落点 ----------
// src/composables/index.ts
//   useCounter      → 闭包持有 count 与 step
//   useMouse        → 闭包持有 x / y ref 和 update 函数（addEventListener 只能引用同一个函数才能解绑）
//   useLocalStorage → 闭包持有 key 与惰性读取的初值
//   useDebouncedRef → 闭包持有 timer（这就是防抖能跨多次调用记住状态的原因）
//   useFetch        → 闭包持有 aborted 标志（组件卸载后不再赋值 = 解决竞态）
//
// 每一个 useXxx 都是一次「作用域隔离 + 返回受控接口」，
// 所以它能被复用 N 次而互不打架 —— 这正是 Vue 3 组合式 API 的设计基石。</pre>
      <div class="pc-grid" style="margin-top: 10px">
        <pre class="code">// 闭包还会带来一个必须注意的坑：内存
function useHeavy() &#123;
  const bigData = new Array(1e6).fill(0)     // 10MB
  const tick = ref(0)
  const inc = () =&gt; tick.value++
  return &#123; tick, inc &#125;                       // bigData 没有被返回…
&#125;
// 但 inc 的闭包里【引用了整个词法环境】吗？
// 引擎会做逃逸分析，通常只保留真正被引用的变量 → bigData 可被回收。
// 反过来，如果 inc 里用到了 bigData，它就会被永久持有，直到 inc 被释放。

// 组件卸载时，watch / computed / effect 都会被自动停掉，
// 但【你自己注册的定时器、全局事件、第三方实例】不会 ——
// 所以组合式函数里几乎总有一个 onBeforeUnmount 做清理。
// 这也是 useMouse / useDebouncedRef / useFetch 都写了 onBeforeUnmount 的原因。</pre>
        <pre class="code">// 用闭包解释两个 Vue 里常见的"为什么"
// 1) 为什么 watch 的回调里能拿到最新的值，却拿不到上一轮的局部变量？
//    → 每轮回调是一次新的函数调用，局部变量不复用；
//      想跨轮保存状态，就必须放到外层作用域（闭包）或 ref 里。

// 2) 为什么"在 setup 里创建的函数"不会随组件卸载自动清理？
//    → 闭包只是持有了引用；解绑需要显式 removeEventListener / clearTimeout。
//      Vue 只自动清理它自己创建的东西（watch/effect/渲染 effect）。

// 一个能自检的小技巧：打开 DevTools 的 Memory 面板拍两次快照，
// 反复挂载/卸载组件，看 Detached DOM / 关键对象数量是否持续上涨。</pre>
      </div>
    </JsCard>

    <!-- ============ 卡片 7：对照表 ============ -->
    <JsCard title="⑦ 对照表：这些 JS 知识在本项目哪个文件里用到" tone="danger">
      <table class="vj-table">
        <thead>
          <tr>
            <th>JS 知识（对应本实验台页码）</th>
            <th>本项目的落点</th>
            <th>怎么打开看</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>闭包与作用域（3）</td>
            <td><code>src/composables/index.ts</code> 的 <code>useCounter</code> / <code>useDebouncedRef</code></td>
            <td>看 <code>timer</code> 与 <code>count</code> 如何被闭包保存、又被返回的方法操作</td>
          </tr>
          <tr>
            <td>Proxy 与响应式（12）</td>
            <td><code>src/pages/vue/basic-reactivity.vue</code>、<code>src/stores/counter.ts</code>（Pinia 内部就是 reactive）</td>
            <td>在 DevTools 里展开一个 reactive 对象，能看到 Vue 的 <code>[[Target]]</code> / <code>[[Handler]]</code> 内部槽</td>
          </tr>
          <tr>
            <td>原型链与对象描述符（9）</td>
            <td><code>props</code> 校验、路由 <code>meta</code>、Pinia options、自定义指令对象 <code>&#123; mounted, updated &#125;</code></td>
            <td><code>src/directives/index.ts</code>：指令就是用「对象描述符 + 生命周期钩子」表达的</td>
          </tr>
          <tr>
            <td>Promise / async（7）</td>
            <td><code>useFetch</code>（<code>src/composables/index.ts</code>）、<code>basic-watch.vue</code> 的竞态清理</td>
            <td>搜 <code>onCleanup</code> 与 <code>await fetch</code></td>
          </tr>
          <tr>
            <td>事件循环与微任务（8）</td>
            <td><code>nextTick</code> 的使用、<code>watch</code> 的 <code>flush: 'post'</code>、<code>basic-watch.vue</code> 的 DOM 测量</td>
            <td>看 ⑥ 那张卡片：为什么改完数据要 <code>await nextTick()</code> 才能读到新 DOM</td>
          </tr>
          <tr>
            <td>ESM 与动态 import（10）</td>
            <td><code>src/router/index.ts</code> 的 <code>import.meta.glob</code> 与 <code>() =&gt; import(...)</code></td>
            <td>路由表就是「懒加载清单」；<code>router.onError</code> 是它的错误兜底</td>
          </tr>
          <tr>
            <td>错误处理与全局兜底（10）</td>
            <td><code>src/main.ts</code> 的 <code>app.config.errorHandler</code>；<code>useFetch</code> 的 <code>try/catch/finally</code></td>
            <td>组件里抛错时会走到 main.ts，控制台能看到 <code>[全局 errorHandler]</code></td>
          </tr>
          <tr>
            <td>DOM 与事件（11）</td>
            <td><code>useMouse</code> / <code>useWindowSize</code>（原生 addEventListener + 卸载时解绑）</td>
            <td>对比 Vue 模板里的 <code>@click</code>：一个是命令式，一个是声明式</td>
          </tr>
          <tr>
            <td>数组方法（4 与 ⑤）</td>
            <td><code>todos.value.push(...)</code>、<code>list.value = list.value.filter(...)</code></td>
            <td>Vue 3 里 push / 下标赋值都能触发；但「整体替换」更容易推理，也更省依赖</td>
          </tr>
          <tr>
            <td>严格模式与模块语义（10）</td>
            <td>所有 <code>&lt;script setup&gt;</code>、<code>.ts</code> 文件</td>
            <td>ESM 默认严格模式，所以 <code>this</code> 在模块顶层是 <code>undefined</code>，别指望它指向 window</td>
          </tr>
        </tbody>
      </table>
      <ul class="vj-notes">
        <li>
          <strong>最后一句总结</strong>：Vue 3 的响应式并没有魔法 ——
          <strong>Proxy 拦读写、track/trigger 记依赖、闭包装 effect、微任务批量更新</strong>，
          四块积木全部来自前 11 页的 JS 基础。理解了这四块，你就能解释
          「为什么解构会丢响应式」「为什么 push 能更新」「为什么 nextTick 能等到 DOM」这类问题，
          而不是死记 API。
        </li>
        <li>
          <strong>建议的阅读顺序</strong>：回到 <code>src/pages/js/</code> 从第 1 页顺着看到这里 →
          再去 <code>src/pages/vue/basic-reactivity.vue</code> 看真实实现 → 最后读
          <code>src/composables/index.ts</code>，你会发现每一行都能对应上一个具体知识点。
        </li>
      </ul>
    </JsCard>
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
.pc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 10px;
}
.vj-table {
  font-size: 12.5px;
}
.vj-notes {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.8;
}
.vj-notes strong {
  color: var(--c-text);
}
</style>
