import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

/* ============================================================================
 * 组合式函数（Composables）—— 进阶核心：把「有状态的逻辑」抽出来复用
 *
 * 命名约定：useXxx；返回值用对象（可按需解构）或数组（必须重命名）。
 * 硬性规则：只能在 setup 顶层同步调用（内部依赖 onMounted / onBeforeUnmount），
 *          所以不要在 if / 循环 / await 之后调用。
 * ========================================================================== */

/** 1）计数器：最基础的组合式函数，演示「状态 + 行为」一起复用 */
export function useCounter(initial = 0, step = 1) {
  const count = ref(initial)
  const inc = () => (count.value += step)
  const dec = () => (count.value -= step)
  const reset = () => (count.value = initial)
  return { count, inc, dec, reset }
}

/** 2）鼠标位置：演示「在组合式函数里注册 / 清理全局事件」 */
export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  const update = (e: MouseEvent) => {
    x.value = e.clientX
    y.value = e.clientY
  }
  onMounted(() => window.addEventListener('mousemove', update))
  onBeforeUnmount(() => window.removeEventListener('mousemove', update))
  return { x, y }
}

/** 3）本地存储：演示「副作用 + 惰性读取 + 自动同步」 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const raw = localStorage.getItem(key)
  const state = ref<T>(raw ? (JSON.parse(raw) as T) : defaultValue) as Ref<T>
  const write = (value: T) => {
    state.value = value
    localStorage.setItem(key, JSON.stringify(value))
  }
  return { state, write }
}

/**
 * 4）防抖 ref：演示「泛型 + 定时器清理 + 卸载时自动解绑」
 * 用法：const kw = ref(''); const debounced = useDebouncedRef(kw, 300)
 */
export function useDebouncedRef<T>(source: Ref<T>, delay = 300) {
  const debounced = ref(source.value) as Ref<T>
  let timer: number | undefined
  const stop = watch(source, (val) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => (debounced.value = val), delay)
  })
  onBeforeUnmount(() => {
    stop()
    window.clearTimeout(timer)
  })
  return debounced
}

/** 6）窗口尺寸：演示组合式函数可以互相组合使用 */
export function useWindowSize() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)
  const onResize = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }
  onMounted(() => window.addEventListener('resize', onResize))
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))
  const isMobile = computed(() => width.value < 768)
  return { width, height, isMobile }
}

export interface User {
  id: number
  name: string
  email: string
}

/**
 * 5）数据请求：真实项目里最常用的组合式函数形态。
 * 返回 loading / error / data / execute，并处理「组件已卸载后不再赋值」的竞态问题。
 */
export function useFetch<T>(url: string) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<string | null>(null)
  const loading = ref(false)
  let aborted = false

  async function execute() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as T
      if (!aborted) data.value = json
      return json
    } catch (e) {
      if (!aborted) error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      if (!aborted) loading.value = false
    }
  }

  onMounted(execute)
  onBeforeUnmount(() => (aborted = true))

  return { data, error, loading, execute }
}
