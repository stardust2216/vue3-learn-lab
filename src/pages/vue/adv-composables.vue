<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import {
  useCounter,
  useDebouncedRef,
  useFetch,
  useLocalStorage,
  useMouse,
  useWindowSize,
} from '@/composables'

/* ============================================================================
 * 12. 组合式函数（Composables）
 *
 * Vue 3 最重要的「代码组织方式」：用函数把「状态 + 逻辑 + 生命周期」打包复用。
 * 它取代了 Vue 2 的 mixin：
 *   - 来源清晰（谁提供的一眼可见，mixin 会糊在一起）
 *   - 没有命名冲突（可以重命名解构）
 *   - 类型友好（mixin 几乎没有类型推导）
 * ========================================================================== */

// ---------- ① useCounter：状态 + 行为一起复用 ----------
const counterA = useCounter(0, 1)
const counterB = useCounter(100, 10)

// ---------- ② useMouse：全局事件 + 自动清理 ----------
const { x, y } = useMouse()

// ---------- ③ useLocalStorage：刷新页面数据还在 ----------
const { state: note, write: writeNote } = useLocalStorage('vue3-lab-note', '把学习笔记写在这里，刷新页面不会丢')

// ---------- ④ useDebouncedRef：原始输入 vs 防抖后的值 ----------
const rawKeyword = ref('')
const debouncedKeyword = useDebouncedRef(rawKeyword, 600)
const allSkills = [
  'ref 与 reactive',
  'computed 缓存',
  'watch 与 watchEffect',
  'provide / inject',
  '组合式函数',
  '自定义指令',
  'Pinia',
  '路由守卫',
]
const matched = computed(() =>
  debouncedKeyword.value.trim()
    ? allSkills.filter((s) => s.includes(debouncedKeyword.value.trim()))
    : allSkills,
)

// ---------- ⑤ useFetch：把请求的 loading / error / 竞态一次封装好 ----------
const apiUrl = ref('https://api.github.com/repos/vuejs/core')
const { data: repo, loading, error, execute } = useFetch<{
  full_name: string
  stargazers_count: number
  description: string
}>(apiUrl.value)
function reload() {
  // 重新执行（真实项目里 url 变化时更该用 watch 触发）
  execute()
}
function switchToBroken() {
  apiUrl.value = 'https://api.github.com/repos/this-org-does-not-exist/nope'
}

// ---------- ⑥ useWindowSize：组合式函数之间互相组合 ----------
const { width, height, isMobile } = useWindowSize()

// ---------- ⑦ 在组合式函数里用组合式函数：自己写一个 useOnline ----------
const online = ref(navigator.onLine)
window.addEventListener('online', () => (online.value = true))
window.addEventListener('offline', () => (online.value = false))
</script>

<template>
  <div>
    <h1>12. 组合式函数 Composables</h1>
    <p class="lead">
      判断标准很简单：<strong>一段逻辑需要响应式状态 + 可能要注册生命周期</strong>，就该抽成
      <code>useXxx()</code>。抽出来后组件里只剩「描述 UI 和串联逻辑」，测试也可以直接对函数做。
    </p>

    <BaseCard title="① useCounter：一个函数，多处复用互不干扰" hint="两个计数器是两个独立状态（工厂函数的意义）。" tone="ok">
      <div class="grid2">
        <div>
          <p class="kv">counterA（初始 0，步长 1）= {{ counterA.count }}</p>
          <div class="row">
            <button @click="counterA.inc()">+1</button>
            <button @click="counterA.dec()">-1</button>
            <button @click="counterA.reset()">reset</button>
          </div>
        </div>
        <div>
          <p class="kv">counterB（初始 100，步长 10）= {{ counterB.count }}</p>
          <div class="row">
            <button @click="counterB.inc()">+10</button>
            <button @click="counterB.dec()">-10</button>
            <button @click="counterB.reset()">reset</button>
          </div>
        </div>
      </div>
      <pre class="code" style="margin-top: 10px">
export function useCounter(initial = 0, step = 1) {
  const count = ref(initial)                 // 每次调用都是一份新状态
  const inc = () =&gt; (count.value += step)
  const dec = () =&gt; (count.value -= step)
  const reset = () =&gt; (count.value = initial)
  return { count, inc, dec, reset }
}</pre
      >
    </BaseCard>

    <BaseCard title="② useMouse：在组合式函数里注册/清理全局事件" hint="鼠标在本页移动即可。">
      <div class="row">
        <span class="tag pass">x = {{ x }}</span>
        <span class="tag info">y = {{ y }}</span>
        <span class="kv">组件卸载时 onBeforeUnmount 会自动 removeEventListener</span>
      </div>
      <pre class="code" style="margin-top: 10px">
export function useMouse() {
  const x = ref(0), y = ref(0)
  const update = (e: MouseEvent) =&gt; { x.value = e.clientX; y.value = e.clientY }
  onMounted(() =&gt; window.addEventListener('mousemove', update))
  onBeforeUnmount(() =&gt; window.removeEventListener('mousemove', update))  // 关键：对称清理
  return { x, y }
}</pre
      >
    </BaseCard>

    <BaseCard title="③ useLocalStorage：副作用封装 + 惰性读取" hint="修改内容后刷新页面（F5），内容依然在。">
      <textarea
        :value="note"
        @input="writeNote(($event.target as HTMLTextAreaElement).value)"
        rows="2"
        style="width: 100%"
      ></textarea>
      <p class="kv" style="margin-top: 6px">localStorage['vue3-lab-note'] 当前长度：{{ note.length }}</p>
    </BaseCard>

    <BaseCard
      title="④ useDebouncedRef：延迟 600ms，输入时列表不会立刻过滤"
      hint="对比「原始输入」和「防抖后的值」，这就是搜索框的正确打开方式。"
    >
      <div class="row">
        <input v-model="rawKeyword" placeholder="输入关键字试试（ref / watch / 组合）" />
        <span class="tag warn">原始：{{ rawKeyword }}</span>
        <span class="tag pass">防抖后：{{ debouncedKeyword }}</span>
      </div>
      <ul style="margin: 8px 0 0; padding-left: 18px">
        <li v-for="s in matched" :key="s">{{ s }}</li>
      </ul>
      <p class="hint" style="margin-top: 8px">
        真实项目里还可以再抽一层 <code>useDebouncedFn(fn, delay)</code>，
        或者直接用 <code>watch</code> + 定时器；重点是<strong>清理逻辑跟状态封装在一起</strong>。
      </p>
    </BaseCard>

    <BaseCard title="⑤ useFetch：loading / error / 卸载保护 一次封装" hint="点「请求一个不存在的仓库」看错误态。">
      <div class="row">
        <button class="primary" @click="reload">重新请求 GitHub API</button>
        <button @click="switchToBroken">请求一个不存在的仓库</button>
        <span class="tag" :class="loading ? 'warn' : error ? 'danger' : 'pass'">
          {{ loading ? 'loading…' : error ? 'error' : 'idle/ok' }}
        </span>
      </div>

      <div v-if="repo" style="margin-top: 10px">
        <p class="kv">full_name: {{ repo.full_name }}</p>
        <p class="kv">stars: ⭐ {{ repo.stargazers_count.toLocaleString() }}</p>
        <p class="hint">{{ repo.description }}</p>
      </div>
      <p v-if="error" class="err">请求失败：{{ error }}（网络/代理不通时就会走到这里）</p>

      <pre class="code" style="margin-top: 10px">
export function useFetch&lt;T&gt;(url: string) {
  const data = ref&lt;T | null&gt;(null)
  const error = ref&lt;string | null&gt;(null)
  const loading = ref(false)
  let aborted = false
  async function execute() {
    loading.value = true; error.value = null
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!aborted) data.value = json          // 组件已卸载就不再写状态
    } catch (e) { if (!aborted) error.value = String(e) }
    finally { if (!aborted) loading.value = false }
  }
  onMounted(execute)
  onBeforeUnmount(() =&gt; (aborted = true))
  return { data, error, loading, execute }
}</pre
      >
    </BaseCard>

    <BaseCard title="⑥ useWindowSize：组合式函数之间可以互相调用" hint="拖动窗口大小 / 缩放到 <768px。">
      <div class="row">
        <span class="tag">宽 {{ width }}</span>
        <span class="tag">高 {{ height }}</span>
        <span class="tag" :class="isMobile ? 'warn' : 'pass'">{{ isMobile ? '移动端布局' : '桌面布局' }}</span>
        <span class="tag" :class="online ? 'pass' : 'danger'">{{ online ? '在线' : '离线' }}</span>
      </div>
    </BaseCard>

    <BaseCard title="⑦ 写组合式函数的 6 条规范" tone="warn">
      <ol style="margin: 0; padding-left: 20px">
        <li>命名统一 <code>useXxx</code>，文件放 <code>src/composables/</code>，一个函数一个文件（大了就拆分）。</li>
        <li>返回 <b>ref 对象</b>（保持响应式），不要返回解构后的普通值；用对象返回便于按需取。</li>
        <li>内部用到的生命周期钩子 = 必须在 <code>setup</code> 顶层同步调用，不要在 <code>await</code> 之后调用。</li>
        <li>副作用要成对出现：在 useXxx 里 <code>addEventListener</code>，就在同一个函数里清理。</li>
        <li>不要在里面偷偷用全局单例（除非叫 <code>useXxxStore</code>）；要共享状态就交给 Pinia。</li>
        <li>接受 <code>ref</code> 参数时要考虑「传入的是 ref 还是普通值」——用 <code>toValue()</code>（3.3+）统一处理。</li>
      </ol>
      <pre class="code" style="margin-top: 10px">
// toValue 的用法：既能传值，也能传 ref / getter
import { toValue, type MaybeRefOrGetter } from 'vue'
export function useGreeting(name: MaybeRefOrGetter&lt;string&gt;) {
  return computed(() =&gt; `Hello, ${toValue(name)}`)
}
useGreeting('world')              // 传普通值
useGreeting(nameRef)              // 传 ref
useGreeting(() =&gt; user.value.name) // 传 getter</pre
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
.err {
  color: var(--c-danger);
  font-size: 13px;
}
</style>
