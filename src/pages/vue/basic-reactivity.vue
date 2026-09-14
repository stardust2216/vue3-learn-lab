<script setup lang="ts">
import { computed, isReactive, isReadonly, isRef, reactive, readonly, ref, toRef, toRefs } from 'vue'
import BaseCard from '@/components/BaseCard.vue'

/* ============================================================================
 * 2. 响应式基础（Reactivity Fundamentals）—— 全篇最重要的概念
 *
 * ref(x)      → 返回一个「带 .value 的包装对象」，适合基础类型，也可以装对象
 * reactive(x) → 返回对象的 Proxy，直接用 obj.a，不能装基础类型、不能整体替换
 * 底层统一：都是 Vue 的响应式系统（Vue 3 用 Proxy 重写，不再需要 Vue.set）
 * ========================================================================== */

// ---------- ① ref：脚本里 .value，模板里自动解包 ----------
const count = ref(0)
const name = ref('张三')
const objRef = ref({ nested: { deep: 1 } })

// 说明：为什么模板里不用写 .value？编译时若 ref 是 setup 顶层变量，Vue 会自动加 .value
const autoUnwrapDemo = computed(() => `模板里直接写 {{ count }}，脚本里必须写 count.value`)

// ---------- ② reactive：只能用于对象/数组/Map/Set ----------
const state = reactive({
  user: { name: '李四', age: 20, tags: ['vue'] },
  list: [1, 2, 3],
  nested: { a: { b: { c: 0 } } }, // 深层也是响应式的（深代理）
})

// ---------- ③ 解构陷阱：reactive 解构会丢响应式 ----------
const { user } = state // ❌ user 是普通对象快照，后续 state.user 替换不会同步
const { name: userName } = toRefs(state.user) // ✅ toRefs：每个属性都变成 ref
const ageRef = toRef(state.user, 'age') // ✅ toRef：单个属性转 ref，双向联动

// ---------- ④ readonly：只读代理，改它会警告，适合传数据给子组件 ----------
const original = reactive({ counter: 0 })
const readOnlyCopy = readonly(original)
function tryMutateReadonly() {
  try {
    // @ts-expect-error 演示：只读代理禁止修改
    readOnlyCopy.counter++
  } catch (e) {
    console.warn('修改 readonly 失败：', (e as Error).message)
  }
}

// ---------- ⑤ 响应式工具函数：判断与转换 ----------
const flags = computed(() => ({
  isRefCount: isRef(count),
  isReactiveState: isReactive(state),
  isReadonlyCopy: isReadonly(readOnlyCopy),
  isReadonlyOriginal: isReadonly(original),
}))

// ---------- ⑥ 数组/对象的响应式更新方式 ----------
function replaceWholeArray() {
  state.list = [9, 9, 9] // 整体替换：reactive 对象可以，因为改的是它的属性
}
function mutateArray() {
  state.list.push(state.list.length + 1) // 数组变异方法都可以
  state.list[0] = -1 // 索引赋值也可以（Proxy 的功劳，Vue 2 不行）
}
function addNewKey() {
  // Vue 3 直接加新属性即可响应（Vue 2 需要 Vue.set）
  ;(state.user as any).email = `u${Date.now()}@demo.com`
}
function deleteKey() {
  delete (state.user as any).email
}

// ---------- ⑦ ref 装对象时，替换整个对象是响应式的；reactive 不能整体替换 ----------
function replaceObjRef() {
  objRef.value = { nested: { deep: Math.floor(Math.random() * 100) } }
}
</script>

<template>
  <div>
    <h1>2. 响应式基础</h1>
    <p class="lead">
      一句话总结：<code>ref</code> 用于任意值（脚本里要 <code>.value</code>），
      <code>reactive</code> 只用于对象/数组（不用 <code>.value</code>，但不能整体替换）。
      组合式 API 里 <strong>优先用 ref</strong>，团队协作更统一。
    </p>

    <BaseCard title="① ref 与模板自动解包" hint="脚本里 count.value，模板里 {{ count }}。">
      <div class="row">
        <button @click="count++">count++</button>
        <button @click="count--">count--</button>
        <span class="tag pass">count = {{ count }}</span>
        <span class="kv">脚本里的写法：count.value = {{ count * 1 }}</span>
      </div>
      <div class="row" style="margin-top: 8px">
        <input v-model="name" />
        <span class="tag info">name = {{ name }}</span>
      </div>
      <p class="hint" style="margin-top: 8px">{{ autoUnwrapDemo }}</p>
      <p class="hint">
        例外：ref 放在「数组 / Map」里不会自动解包，模板里要显式写 <code>arr[0].value</code>。
      </p>
    </BaseCard>

    <BaseCard title="② reactive 对象：深层响应式" hint="改任意层级都会触发更新（递归 Proxy）。">
      <div class="grid2">
        <div>
          <div class="row">
            <label>年龄 <input type="number" v-model.number="state.user.age" style="width: 70px" /></label>
            <label>昵称 <input v-model="state.user.name" style="width: 120px" /></label>
          </div>
          <div class="row" style="margin-top: 8px">
            <input type="number" v-model.number="state.nested.a.b.c" style="width: 70px" />
            <span class="kv">深层 c = {{ state.nested.a.b.c }}</span>
          </div>
        </div>
        <div>
          <pre class="code">state.user = {{ state.user }}
state.nested = {{ state.nested }}</pre>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      title="③ 解构陷阱：reactive 解构就丢响应式"
      hint="这是新手第一大坑。解决办法：toRefs（整个对象）或 toRef（单个属性）。"
      tone="warn"
    >
      <div class="grid2">
        <div>
          <p class="hint">三种取值方式同时展示，改上面的姓名/年龄观察差异：</p>
          <ul style="margin: 0; padding-left: 18px">
            <li>state.user.name（原始）→ <b>{{ state.user.name }}</b> ✅</li>
            <li>解构 user.name（快照）→ <b>{{ user.name }}</b> ❌ 永远不更新</li>
            <li>...toRefs(name) → <b>{{ userName }}</b> ✅ 是 ref，双向联动</li>
            <li>toRef(age) → <b>{{ ageRef }}</b> ✅ 单个属性转 ref</li>
          </ul>
          <div class="row" style="margin-top: 8px">
            <button @click="userName = '改成 ToRefs 名字'">改 toRefs 的 name</button>
            <button @click="ageRef++">ageRef++（会同步回 state）</button>
          </div>
        </div>
        <pre class="code">const state = reactive({ user: { name: '李四', age: 20 } })

const { user } = state                 // ❌ 普通对象，丢响应式
const { name } = toRefs(state.user)    // ✅ ref，双向
const age = toRef(state.user, 'age')   // ✅ ref，双向</pre>
      </div>
    </BaseCard>

    <BaseCard
      title="④ readonly 与判断工具"
      hint="readonly 常用于把 store/配置传给子组件，防止子组件误改父级状态。"
    >
      <div class="row">
        <button @click="original.counter++">original.counter++（可改）</button>
        <button class="danger" @click="tryMutateReadonly">尝试改 readonly 副本</button>
        <span class="kv">original.counter = {{ original.counter }}</span>
        <span class="kv">readonly 副本 = {{ readOnlyCopy.counter }}</span>
      </div>
      <p class="hint" style="margin-top: 8px">
        isRef(count)=<b>{{ flags.isRefCount }}</b> ·
        isReactive(state)=<b>{{ flags.isReactiveState }}</b> ·
        isReadonly(副本)=<b>{{ flags.isReadonlyCopy }}</b> ·
        isReadonly(原对象)=<b>{{ flags.isReadonlyOriginal }}</b>
      </p>
      <p class="hint">控制台会打印一行警告：Set operation on key "counter" failed: target is readonly。</p>
    </BaseCard>

    <BaseCard title="⑤ 数组与对象的更新方式" hint="Vue 3 用 Proxy：索引赋值、加/删属性都响应式。">
      <div class="grid2">
        <div>
          <div class="row">
            <button @click="mutateArray">push + 索引赋值</button>
            <button @click="replaceWholeArray">整体替换数组</button>
            <button @click="state.list = []">清空</button>
          </div>
          <div class="row" style="margin-top: 8px">
            <button @click="addNewKey">给 user 加 email 属性</button>
            <button @click="deleteKey">delete email</button>
          </div>
          <p class="kv" style="margin-top: 8px">list = {{ state.list }}</p>
          <p class="kv">user = {{ state.user }}</p>
        </div>
        <div>
          <p class="hint">ref 装对象时，替换 <code>.value</code> 也响应式：</p>
          <button @click="replaceObjRef">objRef.value = 新对象</button>
          <p class="kv" style="margin-top: 6px">objRef = {{ objRef }}</p>
          <p class="hint" style="margin-top: 8px">
            reactive 不能整体替换（<code>state = {...}</code> 会丢引用），但 ref 可以 —— 这也是
            「优先用 ref」的原因之一。
          </p>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="⑥ 响应式原理一分钟版" hint="理解它，就能明白上面所有「坑」为什么是坑。">
      <pre class="code">
ref(x) → RefImpl { get value() { track() }, set value(v) { trigger() } }
reactive(x) → new Proxy(x, { get() { track() }, set() { trigger() } })

track：渲染副作用（effect）读取数据时，把「谁读了我」记进依赖表
trigger：数据被修改时，通知依赖表里的副作用重新执行（重新渲染 / 重跑 watch）

因此：
- 只有「被读过的」属性才会被追踪 → 新增的深层属性首次被读后同样被追踪
- 解构 = 提前读了一次并丢掉代理 → 后续修改无法通知到那个普通变量
- readonly / shallowRef 等都是在这套机制上加不同策略</pre
      >
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
