import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

export interface Todo {
  id: number
  text: string
  done: boolean
}

/**
 * Pinia Store —— 推荐用「Setup Store」写法：和写组合式函数完全一致。
 *
 * 对比 Options Store 的 state/getters/actions，Setup Store 的优势：
 * 1. 类型推导天然准确，不需要额外声明返回类型；
 * 2. 可以和组合式函数一样用 watch / computed / 其他 store；
 * 3. 代码组织更自由（按功能分组而不是按 state/getters/actions 分层）。
 */
export const useCounterStore = defineStore('counter', () => {
  // ---- state：ref / reactive ----
  const count = ref(0)
  const history = reactive<number[]>([])
  /** 当前登录用户角色：v-permission 自定义指令会读它（第 13 页） */
  const role = ref<'admin' | 'editor' | 'guest'>('admin')
  function setRole(r: 'admin' | 'editor' | 'guest') {
    role.value = r
  }

  // ---- getters：computed ----
  const double = computed(() => count.value * 2)
  const isPositive = computed(() => count.value > 0)
  const summary = computed(() => `count=${count.value}, double=${double.value}`)

  // ---- actions：普通函数 ----
  function increment(step = 1) {
    count.value += step
    history.push(count.value)
  }
  function decrement() {
    count.value -= 1
    history.push(count.value)
  }
  function reset() {
    count.value = 0
    history.length = 0
  }
  /** 异步 action：组件里可以直接 await */
  async function incrementAsync(delay = 600) {
    await new Promise((r) => setTimeout(r, delay))
    increment()
    return count.value
  }

  /** 用 $reset 需要这种手写版本（Setup Store 默认没有 $reset） */
  function $resetAll() {
    reset()
  }

  return {
    // 只把需要暴露给组件的返回出去（没返回的就是 store 私有状态）
    count,
    history,
    role,
    setRole,
    double,
    isPositive,
    summary,
    increment,
    decrement,
    reset,
    incrementAsync,
    $resetAll,
  }
})

/**
 * 第二个 Store：演示 Store 之间互相调用 + 跨组件共享状态。
 * 这个 todo store 在「15. Pinia」和「12. Composables」页都会用到。
 */
export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([])
  const filter = ref<'all' | 'active' | 'done'>('all')
  let seed = 0

  const filtered = computed(() => {
    if (filter.value === 'active') return todos.value.filter((t) => !t.done)
    if (filter.value === 'done') return todos.value.filter((t) => t.done)
    return todos.value
  })
  const stats = computed(() => ({
    total: todos.value.length,
    done: todos.value.filter((t) => t.done).length,
  }))

  function add(text: string) {
    const value = text.trim()
    if (!value) return
    todos.value.push({ id: ++seed, text: value, done: false })
  }
  function toggle(id: number) {
    const todo = todos.value.find((t) => t.id === id)
    if (todo) todo.done = !todo.done
  }
  function remove(id: number) {
    todos.value = todos.value.filter((t) => t.id !== id)
  }

  /** 演示跨 store 调用：todo 变化时联动 counter */
  const counter = useCounterStore()
  function addAndCount(text: string) {
    add(text)
    counter.increment(0) // 只是打个卡，演示可以这样调用别的 store
  }

  return { todos, filter, filtered, stats, add, toggle, remove, addAndCount }
})
