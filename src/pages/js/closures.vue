<script setup lang="ts">
import { computed, ref } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 3. 闭包与 this  ← JS 的核心难点，这一页做得最细
 *
 *   ① 闭包的定义与形成条件：计数器 / 私有变量 / 模块模式
 *   ② 闭包实战：once / memoize / 防抖节流的骨架
 *   ③ 循环里 var vs let 的经典陷阱（含 IIFE 老写法）
 *   ④ 闭包与内存：为什么可能泄漏、怎么释放
 *   ⑤ this 的四种绑定：默认 / 隐式 / 显式 / new（带交互实验台）
 *   ⑥ 箭头函数的 this、bind 手写实现、速查表
 *
 * 前提：本页代码运行在严格模式（ESM 模块 + new Function 都自带 "use strict"），
 * 所以「独立调用一个普通函数」时 this 是 undefined，而不是 window。
 * ========================================================================== */

// ---------------------------------------------------------------------------
// ① 闭包：计数器 + 私有变量
// ---------------------------------------------------------------------------
function makeCounter(start = 0) {
  let n = start
  return {
    inc: () => ++n,
    dec: () => --n,
    value: () => n,
  }
}

const assertsClosure = [
  {
    expr: '计数器：n 被「关」在闭包里，调用之间保持状态',
    actual: (() => {
      function make() {
        let n = 0
        return () => ++n
      }
      const c = make()
      c()
      c()
      return c()
    })(),
    expected: 3,
  },
  {
    expr: '两次调用外层函数 → 两个互不干扰的闭包',
    actual: (() => {
      function make() {
        let n = 0
        return () => ++n
      }
      const a = make()
      const b = make()
      a()
      a()
      return `${a()},${b()}`
    })(),
    expected: '3,1',
  },
  {
    expr: '闭包捕获的是「变量」本身，不是当时的快照',
    actual: (() => {
      let n = 0
      const read = () => n
      n = 42
      return read()
    })(),
    expected: 42,
    note: '所以闭包和外部共享同一个变量（这点在 ④ 讲内存时很关键）',
  },
  {
    expr: '私有变量：外部拿不到 count',
    actual: (() => {
      function counter() {
        let count = 0
        return { inc: () => ++count }
      }
      const c = counter()
      c.inc()
      return typeof (c as unknown as { count?: unknown }).count
    })(),
    expected: 'undefined',
  },
  {
    expr: '多个方法共享同一个私有变量（reset 会真的重置）',
    actual: (() => {
      function counter() {
        let count = 0
        return {
          inc: () => ++count,
          reset: () => (count = 0),
          get: () => count,
        }
      }
      const c = counter()
      c.inc()
      c.inc()
      c.reset()
      return c.get()
    })(),
    expected: 0,
  },
  {
    expr: '形成闭包的最小条件：内层函数引用了外层作用域的变量',
    actual: (() => {
      const outer = 'x'
      const inner = () => outer
      return inner()
    })(),
    expected: 'x',
    note: '只要「定义时能访问到」，就算外层函数的这次调用已经结束，变量依然活着',
  },
  {
    expr: 'IIFE + 闭包 = 模块模式：只暴露想暴露的',
    actual: (() => {
      const mod = (() => {
        let secret = 1
        return { get: () => secret, add: () => ++secret }
      })()
      mod.add()
      return mod.get()
    })(),
    expected: 2,
  },
  {
    expr: '函数返回函数，且新函数记住参数（工厂函数）',
    actual: (() => {
      function times(n: number) {
        return (x: number) => x * n
      }
      const triple = times(3)
      return `${triple(2)},${times(10)(2)}`
    })(),
    expected: '6,20',
  },
]

const runClosure = `console.log('=== 闭包的最小形态：内层函数 + 外层变量 ===')
function makeGreeter(greeting) {
  return function (name) {            // 这个内层函数就是闭包
    return greeting + '，' + name     // 用到了外层的 greeting，于是它被「记住」了
  }
}
const sayHi = makeGreeter('你好')
const sayYo = makeGreeter('哟')
console.log(sayHi('小明'), '/', sayYo('小红'))
console.log('makeGreeter 早就执行结束了，但 greeting 依然活着')

console.log('')
console.log('=== 计数器：状态藏在闭包里，外部改不了 ===')
function makeCounter() {
  let n = 0                           // 私有
  return {
    inc: () => ++n,
    dec: () => --n,
    value: () => n,
  }
}
const c1 = makeCounter()
const c2 = makeCounter()              // 每次调用都是全新的 n
c1.inc(); c1.inc(); c1.inc(); c1.dec()
c2.inc()
console.log('c1 =', c1.value(), '/ c2 =', c2.value())
console.log('能从外面读到 n 吗？', typeof c1.n)

console.log('')
console.log('=== 模块模式：只暴露该暴露的（IIFE 时代的主流写法）===')
const counterModule = (function () {
  let count = 0
  function step() { count += 1 }      // step 是私有的
  return {
    add(n) { for (let i = 0; i < n; i++) step() },
    get count() { return count },
  }
})()
counterModule.add(3)
console.log('count =', counterModule.count, '/ step 暴露了吗？', typeof counterModule.step)

console.log('')
console.log('=== 闭包捕获的是变量，不是快照 ===')
function readAfterChange() {
  let v = 1
  const read = () => v
  v = 99                              // 改完再读
  return read()
}
console.log('结果是', readAfterChange(), '（不是 1）')`

// ---------------------------------------------------------------------------
// ② 闭包实战：once / memoize / 防抖节流骨架
// ---------------------------------------------------------------------------
function once<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
  let done = false
  let result: ReturnType<T> | undefined
  return (...args: Parameters<T>) => {
    if (!done) {
      done = true
      result = fn(...args)
    }
    return result as ReturnType<T>
  }
}

function memoize<A extends string | number, R>(fn: (a: A) => R): (a: A) => R {
  const cache = new Map<A, R>()
  return (a: A) => {
    if (!cache.has(a)) cache.set(a, fn(a))
    return cache.get(a) as R
  }
}

const assertsPatterns = [
  {
    expr: 'once：调用 3 次，原函数只跑 1 次',
    actual: (() => {
      let runs = 0
      const init = once(() => ++runs)
      init()
      init()
      init()
      return runs
    })(),
    expected: 1,
  },
  {
    expr: 'once：后续调用拿到的还是第一次的返回值',
    actual: (() => {
      let runs = 0
      const init = once((tag: string) => `${tag}#${++runs}`)
      const a = init('a')
      const b = init('b')
      return `${a}/${b}`
    })(),
    expected: 'a#1/a#1',
    note: '第二次传的 "b" 被完全忽略',
  },
  {
    expr: 'memoize：同样的入参只计算一次',
    actual: (() => {
      let runs = 0
      const square = memoize((n: number) => {
        runs++
        return n * n
      })
      square(4)
      square(4)
      square(5)
      square(4)
      return `结果=${square(4)},计算次数=${runs}`
    })(),
    expected: '结果=16,计算次数=2',
  },
  {
    expr: 'memoize + 递归 = 记忆化斐波那契（fib(25) 也是瞬间）',
    actual: (() => {
      let runs = 0
      const cache = new Map<number, number>()
      const fib = (n: number): number => {
        if (n < 2) return n
        const hit = cache.get(n)
        if (hit !== undefined) return hit
        runs++
        const r = fib(n - 1) + fib(n - 2)
        cache.set(n, r)
        return r
      }
      return `${fib(25)}/${runs}`
    })(),
    expected: '75025/24',
  },
  {
    expr: '防抖 debounce 的骨架：闭包里保存 timer（只判断结构）',
    actual: (() => {
      function debounce(fn: (s: string) => void, delay: number) {
        let timer: number | undefined
        return (s: string) => {
          if (timer !== undefined) clearTimeout(timer)
          timer = window.setTimeout(() => fn(s), delay)
          return '已排队'
        }
      }
      const d = debounce(() => {}, 100)
      return typeof d === 'function' ? 'debounce 返回了一个闭包函数' : '异常'
    })(),
    expected: 'debounce 返回了一个闭包函数',
  },
  {
    expr: '每次调用 debounce 都会生成独立的 timer 变量',
    actual: (() => {
      function makeBox() {
        let called = 0
        return () => ++called
      }
      const a = makeBox()
      const b = makeBox()
      a()
      a()
      a()
      return `${a()},${b()}`
    })(),
    expected: '4,1',
  },
  {
    expr: '闭包做「一次性令牌」：只允许通过一次',
    actual: (() => {
      function makeGate() {
        let opened = false
        return () => {
          if (opened) return '拒绝'
          opened = true
          return '通过'
        }
      }
      const gate = makeGate()
      return `${gate()},${gate()},${gate()}`
    })(),
    expected: '通过,拒绝,拒绝',
  },
]

const runPatterns = `console.log('=== once：只执行一次 ===')
function once(fn) {
  let done = false
  let result
  return function (...args) {
    if (!done) {
      done = true
      result = fn.apply(this, args)
    }
    return result
  }
}
let initCount = 0
const init = once(() => {
  initCount++
  return '初始化完成（原函数真实执行 ' + initCount + ' 次）'
})
console.log(init())
console.log(init())
console.log(init())

console.log('')
console.log('=== memoize：用空间换时间 ===')
function memoize(fn) {
  const cache = new Map()          // 这个 Map 被内层函数一直记着
  return function (key) {
    if (!cache.has(key)) cache.set(key, fn(key))
    return cache.get(key)
  }
}
let computeCount = 0
const slowSquare = memoize((n) => {
  computeCount++                   // 假装这里有很贵的计算
  return n * n
})
console.log(slowSquare(4), slowSquare(4), slowSquare(4), '/ 真实计算次数 =', computeCount)

console.log('')
console.log('=== 防抖 debounce 的骨架（闭包保存 timer）===')
function debounce(fn, delay) {
  let timer = null                 // 每次调用 debounce 都会新建一个 timer
  return function (...args) {
    clearTimeout(timer)            // 把上一次还没触发的定时器取消
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}
function throttle(fn, gap) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= gap) {       // 距离上次执行够久了才执行
      last = now
      fn.apply(this, args)
    }
  }
}
console.log('debounce 返回：', typeof debounce(() => {}, 100))
console.log('throttle 返回：', typeof throttle(() => {}, 100))
console.log('（Vue 里滚动的节流、搜索框的防抖，本质都是「闭包保存一个变量」）')

console.log('')
console.log('=== 一次性令牌：闭包做状态机 ===')
function makeGate() {
  let opened = false
  return function () {
    if (opened) return '拒绝'
    opened = true
    return '通过'
  }
}
const gate = makeGate()
console.log(gate(), gate(), gate())`

// ---------------------------------------------------------------------------
// ③ 循环里的 var vs let（本页重点）
// ---------------------------------------------------------------------------
const assertsLoop = [
  {
    expr: 'var 版：三个闭包共用同一个 i → 3,3,3',
    actual: (() => {
      const fns: (() => number)[] = []
      for (var i = 0; i < 3; i++) fns.push(() => i)
      return fns.map((f) => f()).join(',')
    })(),
    expected: '3,3,3',
    note: '闭包在循环结束后才被调用，此时 i 已经是 3',
  },
  {
    expr: 'let 版：每次迭代都是新的绑定 → 0,1,2',
    actual: (() => {
      const fns: (() => number)[] = []
      for (let i = 0; i < 3; i++) fns.push(() => i)
      return fns.map((f) => f()).join(',')
    })(),
    expected: '0,1,2',
    note: '规范规定 for + let 每轮迭代创建一个新绑定，并在末尾把值复制过去',
  },
  {
    expr: 'IIFE 版（ES6 之前的修法）：把当前 i 当参数传进去',
    actual: (() => {
      const fns: (() => number)[] = []
      for (var i = 0; i < 3; i++) {
        ((j: number) => {
          fns.push(() => j)
        })(i)
      }
      return fns.map((f) => f()).join(',')
    })(),
    expected: '0,1,2',
  },
  {
    expr: '循环体里立刻求值 → var 也没问题',
    actual: (() => {
      const out: number[] = []
      for (var i = 0; i < 3; i++) out.push(i)
      return out.join(',')
    })(),
    expected: '0,1,2',
    note: '陷阱只在「把闭包存起来、循环结束后再调用」时出现',
  },
  {
    expr: 'forEach 的回调形参是「每次调用一份」，天然没问题',
    actual: (() => {
      const fns: (() => number)[] = []
      ;[0, 1, 2].forEach((i) => fns.push(() => i))
      return fns.map((f) => f()).join(',')
    })(),
    expected: '0,1,2',
  },
  {
    expr: 'while + var 同样中招',
    actual: (() => {
      const fns: (() => number)[] = []
      var k = 0
      while (k < 3) {
        fns.push(() => k)
        k++
      }
      return fns.map((f) => f()).join(',')
    })(),
    expected: '3,3,3',
  },
  {
    expr: '真实 bug 的样子：用 var 记住数组下标 → tasks[3] 是 undefined',
    actual: (() => {
      const tasks = ['A', 'B', 'C']
      const handlers: (() => string)[] = []
      for (var t = 0; t < tasks.length; t++) {
        handlers.push(() => '处理 ' + tasks[t])
      }
      return handlers.map((h) => h()).join('|')
    })(),
    expected: '处理 undefined|处理 undefined|处理 undefined',
  },
  {
    expr: '换成 let 立刻恢复正常',
    actual: (() => {
      const tasks = ['A', 'B', 'C']
      const handlers: (() => string)[] = []
      for (let t = 0; t < tasks.length; t++) {
        handlers.push(() => '处理 ' + tasks[t])
      }
      return handlers.map((h) => h()).join('|')
    })(),
    expected: '处理 A|处理 B|处理 C',
  },
]

const runLoop = `console.log('=== var + 闭包：三个回调全都打印 3 ===')
var fnsVar = []
for (var i = 0; i < 3; i++) {
  fnsVar.push(function () { return i })
}
console.log('var 版结果：', fnsVar.map(function (f) { return f() }))

console.log('')
console.log('=== let + 闭包：各自记住自己的值 ===')
var fnsLet = []
for (let j = 0; j < 3; j++) {
  fnsLet.push(function () { return j })
}
console.log('let 版结果：', fnsLet.map(function (f) { return f() }))

console.log('')
console.log('=== ES6 之前的修法：IIFE 把当前值「当场存下来」 ===')
var fnsIife = []
for (var k = 0; k < 3; k++) {
  ;(function (n) {
    fnsIife.push(function () { return n })   // n 是每次调用 IIFE 的新形参
  })(k)
}
console.log('IIFE 版结果：', fnsIife.map(function (f) { return f() }))

console.log('')
console.log('=== 为什么 var 是 3？===')
console.log('var i 在整个函数里只有「一个绑定」，三个闭包共享它；')
console.log('循环结束时 i === 3，所以之后调用谁都读 3。')
console.log('let j 每轮迭代创建一个新绑定，所以三个闭包各读各的。')

console.log('')
console.log('=== 真实项目里的样子：给列表项绑事件 / 发请求 ===')
var tasks = ['A', 'B', 'C']
var broken = []
for (var t = 0; t < tasks.length; t++) {
  broken.push(function () {
    return '处理 ' + tasks[t]        // t 已经是 3 → tasks[3] 是 undefined
  })
}
console.log('var 版：', broken.map(function (h) { return h() }))

var fixed = []
for (let t2 = 0; t2 < tasks.length; t2++) {
  fixed.push(function () {
    return '处理 ' + tasks[t2]
  })
}
console.log('let 版：', fixed.map(function (h) { return h() }))

console.log('')
console.log('=== 这也解释了 setTimeout 那道经典面试题 ===')
console.log('for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)) → 3 3 3')
console.log('for (let i = 0; i < 3; i++) setTimeout(() => console.log(i)) → 0 1 2')
console.log('（本卡片里的闭包版本和 setTimeout 版本完全是同一个原因）')`

// ---------------------------------------------------------------------------
// ④ 闭包与内存
// ---------------------------------------------------------------------------
const assertsMemory = [
  {
    expr: '闭包捕获的是变量：外部把它置 null，闭包立刻看得到',
    actual: (() => {
      let obj: { n: number } | null = { n: 42 }
      const read = () => obj?.n
      const before = read()
      obj = null
      return `${before},${read()}`
    })(),
    expected: '42,undefined',
    note: '所以「把引用置 null」确实能帮闭包释放它引用的大对象',
  },
  {
    expr: '闭包让局部变量「活得比函数调用更久」',
    actual: (() => {
      const get = (() => {
        const v = 'alive'
        return () => v
      })()
      return get()
    })(),
    expected: 'alive',
    note: '这就是状态能保留的原因，也是「可能泄漏」的原因',
  },
  {
    expr: '惰性释放：不需要大对象时主动置 null',
    actual: (() => {
      let cache: number[] | null = new Array(3).fill(7)
      const size = () => cache?.length ?? 0
      const before = size()
      cache = null
      return `${before},${size()}`
    })(),
    expected: '3,0',
  },
  {
    expr: '闭包只引用它真正用到的变量（现代引擎会优化，不会整包捕获）',
    actual: (() => {
      function make() {
        const used = 'used'
        const unused = 'unused'
        void unused
        return () => used
      }
      return make()()
    })(),
    expected: 'used',
    note: '但「在同一个闭包里引用了大对象」时，大对象确实会被留住',
  },
  {
    expr: '每个闭包各持一份状态：循环里创建 3 个闭包 = 3 份内存',
    actual: (() => {
      const readers: (() => number)[] = []
      for (let i = 0; i < 3; i++) {
        readers.push(() => i)
      }
      return readers.length
    })(),
    expected: 3,
  },
]

const runMemory = `console.log('=== 闭包会让变量「活得比函数调用更久」 ===')
function makeHandler() {
  const bigData = new Array(5).fill('x')   // 假装这是很大的数据（几十 MB）
  let used = 0
  return function handler() {
    used++
    return '第 ' + used + ' 次调用，数据长度 ' + bigData.length
  }
}
const handler = makeHandler()
console.log(handler())
console.log(handler())
console.log('makeHandler 早就返回了，但 bigData 依然在内存里 —— 因为 handler 还引用着它')

console.log('')
console.log('=== 释放办法①：不再需要时把闭包本身置空 ===')
console.log('handler = null  之后，没人再引用这个闭包，')
console.log('它内部捕获的 bigData 也就可以被 GC 回收了。')

console.log('')
console.log('=== 释放办法②：把外层变量置空 ===')
let cache = { data: new Array(3).fill('hit') }
const readCache = () => (cache ? cache.data.length : '（已释放）')
console.log('读缓存：', readCache())
cache = null
console.log('置空后再读：', readCache())
console.log('注意：这里能被释放，是因为闭包捕获的是「变量 cache」，不是那个对象')

console.log('')
console.log('=== 最容易踩的泄漏：注册了却不注销 ===')
console.log('window.addEventListener("resize", handler) 之后忘了 removeEventListener，')
console.log('handler 闭包会一直活到页面卸载 —— 大屏项目里常见的内存增长就是它。')
console.log('Vue 里对应的是 onMounted 注册、onBeforeUnmount 清理：')
console.log('  onMounted(() => window.addEventListener("resize", onResize))')
console.log('  onBeforeUnmount(() => window.removeEventListener("resize", onResize))')
console.log('setInterval / setTimeout 同理，必须 clear。')`

// ---------------------------------------------------------------------------
// ⑤ this 的四种绑定（+ 交互实验台）
// ---------------------------------------------------------------------------
/** 用来展示 this 的示例对象：who 用了 this?.name，方便观察 this 丢没丢 */
function describe(fn: () => unknown): string {
  try {
    const v = fn()
    if (v === undefined) return 'undefined（this 上没有 name）'
    return String(v)
  } catch (e) {
    return `${(e as Error).name}（this 是 undefined）`
  }
}

const thisName = ref('小明')
const thisMode = ref('implicit')
const thisModes = [
  { key: 'implicit', label: 'o.who()（隐式绑定）' },
  { key: 'plain', label: 'const f = o.who; f()（丢失 this）' },
  { key: 'call', label: 'who.call(o)（显式绑定）' },
  { key: 'bind', label: 'who.bind(o)()（硬绑定）' },
  { key: 'arrow', label: '箭头函数被取出后调用（继承外层）' },
] as const

const thisResult = computed(() => {
  const name = thisName.value
  const o = {
    name,
    who(this: any) {
      return this?.name
    },
  }
  const who = o.who
  switch (thisMode.value) {
    case 'plain':
      return describe(() => who())
    case 'call':
      return describe(() => who.call(o))
    case 'bind':
      return describe(() => who.bind(o)())
    case 'arrow': {
      const holder = {
        name,
        make() {
          const inner = () => this.name // 箭头函数继承 make 的 this
          return inner
        },
      }
      const detached = holder.make()
      return describe(() => detached())
    }
    default:
      return describe(() => o.who())
  }
})

const assertsThis = [
  {
    expr: '默认绑定：独立调用 → 严格模式下 this 是 undefined',
    actual: (() => {
      function who(this: any) {
        return this
      }
      return who()
    })(),
    expected: undefined,
    note: '非严格模式下会是 window（这就是老代码里 var that = this 的来源）',
  },
  {
    expr: '隐式绑定：o.who() → this 是 o',
    actual: (() => {
      const o = {
        name: 'obj',
        who() {
          return this.name
        },
      }
      return o.who()
    })(),
    expected: 'obj',
  },
  {
    expr: '隐式丢失：const f = o.who; f() → this 没了',
    actual: (() => {
      const o = {
        name: 'obj',
        who(this: any) {
          return this?.name
        },
      }
      const f = o.who
      return String(f())
    })(),
    expected: 'undefined',
    note: '经典场景：setTimeout(o.who)、回调里直接写 o.who',
  },
  {
    expr: '显式绑定 call',
    actual: (() => {
      function who(this: any) {
        return this.name
      }
      return who.call({ name: 'call' })
    })(),
    expected: 'call',
  },
  {
    expr: '显式绑定 apply（参数用数组传）',
    actual: (() => {
      function add(this: any, a: number, b: number) {
        return a + b + this.base
      }
      return add.apply({ base: 10 }, [1, 2])
    })(),
    expected: 13,
  },
  {
    expr: 'bind 返回新函数，this 被永久固定',
    actual: (() => {
      function who(this: any) {
        return this.name
      }
      const bound = who.bind({ name: 'bind' })
      return bound.call({ name: 'other' })
    })(),
    expected: 'bind',
    note: 'bind 之后 call / apply 都改不了它',
  },
  {
    expr: 'bind 预置参数（偏函数）',
    actual: (() => {
      function introduce(this: any, city: string, job: string) {
        return `${this.name}在${city}做${job}`
      }
      const inHangzhou = introduce.bind({ name: '小明' }, '杭州')
      return inHangzhou('前端')
    })(),
    expected: '小明在杭州做前端',
  },
  {
    expr: 'new 绑定优先级最高：bind 的 this 会被忽略',
    actual: (() => {
      function Person(this: any, name: string) {
        this.name = name
      }
      const BoundPerson = Person.bind({ name: '被 bind 的对象' })
      const p = new (BoundPerson as any)('new 出来的')
      return p.name
    })(),
    expected: 'new 出来的',
    note: '优先级：new > call/apply/bind > o.method() > 默认',
  },
]

const runThis = `console.log('=== 1) 默认绑定：独立调用（严格模式下 this 是 undefined）===')
function showThis() {
  console.log('this =', this)
}
showThis()

console.log('')
console.log('=== 2) 隐式绑定：谁调用，this 就是谁 ===')
const user = {
  name: '小明',
  greet() {
    return '我是 ' + this.name
  },
}
console.log(user.greet())

console.log('')
console.log('=== 3) 隐式丢失：把方法「摘出来」单独调用 ===')
const detached = user.greet
try {
  console.log(detached())
} catch (e) {
  console.log('直接调用 →', e.name + ': ' + e.message)
}
function runCallback(cb) { return cb() }        // 模拟「把方法当回调传进去」
try {
  console.log(runCallback(user.greet))
} catch (e) {
  console.log('当回调传进去 →', e.name)
}
console.log('修法一（bind）：', runCallback(user.greet.bind(user)))
console.log('修法二（箭头包装）：', runCallback(() => user.greet()))

console.log('')
console.log('=== 4) 显式绑定：call / apply / bind ===')
function introduce(city, job) {
  return this.name + ' 在 ' + city + ' 做 ' + job
}
console.log('call ：', introduce.call(user, '杭州', '前端'))
console.log('apply：', introduce.apply(user, ['杭州', '前端']))
const boundIntro = introduce.bind(user, '杭州')      // 预置第一个参数
console.log('bind ：', boundIntro('前端'))
console.log('bind 之后硬改 this 也没用：', boundIntro.call({ name: '别人' }, '前端'))

console.log('')
console.log('=== 5) new 绑定：优先级最高 ===')
function Person(name) {
  this.name = name
}
const BoundPerson = Person.bind({ name: '被 bind 的对象' })
console.log('new BoundPerson("小红").name =', new BoundPerson('小红').name)
console.log('（new 时 bind 的 this 被忽略，create 出来的新对象说了算）')

console.log('')
console.log('=== 6) 丢失 this 的三种标准修法 ===')
const store = { value: 42, read() { return this.value } }
const raw = store.read
console.log('1) 直接调用 →', (function () { try { return raw() } catch (e) { return e.name } })())
console.log('2) bind 修法 →', raw.bind(store)())
console.log('3) 箭头包装 →', (() => store.read())())

console.log('')
console.log('=== 7) 嵌套的普通函数不会继承外层 this ===')
const nested = {
  label: '外层',
  normal() {
    function inner() { return this && this.label }
    return inner()                       // 这里的 this 不是 nested
  },
  arrow() {
    const inner = () => this.label        // 箭头函数继承 arrow 的 this
    return inner()
  },
}
console.log('普通内层函数：', nested.normal())
console.log('箭头内层函数：', nested.arrow())`

// ---------------------------------------------------------------------------
// ⑥ 箭头函数、手写 bind
// ---------------------------------------------------------------------------
/** bind 的最小实现思路：用 apply 把 this 和预置参数一起固定下来 */
function myBind<T extends (...args: any[]) => any>(
  fn: T,
  ctx: any,
  ...preset: any[]
): (...args: any[]) => ReturnType<T> {
  return (...args: any[]) => fn.apply(ctx, [...preset, ...args]) as ReturnType<T>
}

/** call 的最小实现 */
function myCall<T extends (...args: any[]) => any>(fn: T, ctx: any, ...args: any[]): ReturnType<T> {
  return fn.apply(ctx, args) as ReturnType<T>
}

const assertsArrowBind = [
  {
    expr: '箭头函数继承外层 this（对象方法里定义箭头，箭头拿到的是方法里的 this）',
    actual: (() => {
      const o = {
        name: 'obj',
        who() {
          const inner = () => this.name
          return inner()
        },
      }
      return o.who()
    })(),
    expected: 'obj',
  },
  {
    expr: '对比：内层写普通函数，this 就丢了',
    actual: (() => {
      const o = {
        name: 'obj',
        outer(this: any) {
          function inner(this: any) {
            return this?.name
          }
          return String(inner())
        },
      }
      return o.outer()
    })(),
    expected: 'undefined',
  },
  {
    expr: '箭头函数不能被 new',
    actual: (() => {
      try {
        new ((() => {}) as any)()
        return '居然成功了'
      } catch (e) {
        return (e as Error).name
      }
    })(),
    expected: 'TypeError',
    note: 'is not a constructor',
  },
  {
    expr: '箭头函数没有 prototype（普通函数有）',
    actual: (() => {
      const arrow = () => {}
      function normal() {}
      return `${arrow.hasOwnProperty('prototype')}/${normal.hasOwnProperty('prototype')}`
    })(),
    expected: 'false/true',
  },
  {
    expr: '箭头函数没有自己的 arguments',
    actual: (() => {
      function outer(this: any) {
        const inner = () => arguments.length
        return inner()
      }
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      return outer(1, 2, 3)
    })(),
    expected: 3,
    note: '拿到的是外层函数的 arguments',
  },
  {
    expr: 'myBind：手写 bind 的第一步（固定 this）',
    actual: myBind(function (this: any) {
      return this.name
    }, { name: 'myBind 的 ctx' })(),
    expected: 'myBind 的 ctx',
  },
  {
    expr: 'myBind：预置参数',
    actual: myBind((a: number, b: number) => a + b, null, 1)(2),
    expected: 3,
  },
  {
    expr: 'myBind：绑定后再 call 也改不了 this',
    actual: (() => {
      const bound = myBind(function (this: any) {
        return this.name
      }, { name: 'fixed' })
      return bound.call({ name: 'other' })
    })(),
    expected: 'fixed',
  },
  {
    expr: 'myCall：等同于 fn.call(ctx, ...args)',
    actual: myCall(
      function (this: any, suffix: string) {
        return this.name + suffix
      },
      { name: 'ctx' },
      '!',
    ),
    expected: 'ctx!',
  },
  {
    expr: 'myCall / myBind 的原型都在 Function.prototype 上（原理就是 apply）',
    actual: typeof Function.prototype.apply,
    expected: 'function',
  },
]

const runArrowBind = `console.log('=== 1) 箭头函数的 this 来自「定义位置」 ===')
const obj = {
  label: '外层对象',
  arrow: () => (typeof this !== 'undefined' && this ? this.label : '不是 obj（箭头函数不看调用者）'),
  normal() { return this.label },
  nested() {
    const inner = () => this.label      // 继承 nested 的 this
    return inner()
  },
}
console.log('普通方法：', obj.normal())
console.log('对象里的箭头函数：', obj.arrow())
console.log('方法内部定义的箭头函数：', obj.nested())

console.log('')
console.log('=== 2) 箭头函数被「取出来」单独调用也没事（this 早被固定）===')
const getLabel = (function () {
  const self = { label: '被记住的 this' }
  return { make() { const f = () => this.label; return f } }
})()
console.log('构造失败的例子太绕，换个直观的：')
function makeGetter() {
  const ctx = { label: '闭包里的对象' }
  return () => ctx.label        // 这里干脆不用 this，用闭包变量
}
console.log('箭头 + 闭包变量：', makeGetter()())

console.log('')
console.log('=== 3) 箭头函数的三个「没有」 ===')
const arrow = () => {}
console.log('没有 prototype：', arrow.hasOwnProperty('prototype'))
try {
  new arrow()
} catch (e) {
  console.log('不能 new →', e.name + ': ' + e.message)
}
function withArgs() {
  const inner = () => arguments.length   // 没有自己的 arguments
  return inner()
}
console.log('没有自己的 arguments（拿到外层的）：', withArgs(1, 2, 3))

console.log('')
console.log('=== 4) 手写 bind：bind 的本质就是 apply ===')
function myBind(fn, ctx, ...preset) {
  return function (...args) {
    return fn.apply(ctx, [...preset, ...args])
  }
}
function greet(city, job) {
  return this.name + ' 在 ' + city + ' 做 ' + job
}
const boundGreet = myBind(greet, { name: '小明' }, '杭州')
console.log(boundGreet('前端'))
console.log('绑定后硬改 this：', boundGreet.call({ name: '别人' }, '前端'))

console.log('')
console.log('=== 5) 真正实现完整的 bind 还要处理 new ===')
console.log('关键点：new 调用时 this 是新建对象（this instanceof bound 为 true），')
console.log('此时不能用传入的 ctx，并且要让新对象继承原函数的 prototype。')
function fullBind(fn, ctx, ...preset) {
  function bound(...args) {
    const realThis = this instanceof bound ? this : ctx
    return fn.apply(realThis, [...preset, ...args])
  }
  if (fn.prototype) bound.prototype = Object.create(fn.prototype)
  return bound
}
function Person(name) { this.name = name }
Person.prototype.say = function () { return '我是 ' + this.name }
const BoundPerson = fullBind(Person, { name: '被忽略的 ctx' })
const p = new BoundPerson('小红')
console.log('new 之后 name =', p.name, '/ 原型方法可用：', p.say())`

// ---------------------------------------------------------------------------
// 交互卡片用到的状态
// ---------------------------------------------------------------------------
let counterA = makeCounter(0)
const counterB = makeCounter(100)
const counterAValue = ref(0)
const counterBValue = ref(100)
function bump(which: 'a' | 'b', dir: 'inc' | 'dec') {
  const c = which === 'a' ? counterA : counterB
  if (dir === 'inc') c.inc()
  else c.dec()
  counterAValue.value = counterA.value()
  counterBValue.value = counterB.value()
}
function recreateA() {
  counterA = makeCounter(Math.floor(Math.random() * 90) + 10)
  counterAValue.value = counterA.value()
}
</script>

<template>
  <div>
    <h1>3. 闭包与 this</h1>
    <p class="lead">
      <strong>闭包 = 函数 + 它能访问到的外层变量</strong>（捕获的是变量本身，不是快照），所以状态能被「藏」起来并长期保留；
      <strong>this 只看「怎么调用的」</strong>（除了箭头函数，它看「定义在哪」）。优先级：
      <strong>new &gt; call/apply/bind &gt; obj.method() &gt; 默认</strong>。
    </p>

    <JsCard
      title="① 闭包的定义与形成条件"
      hint="两个条件：① 有内层函数；② 内层函数引用了外层作用域的变量。外层函数执行完，这些变量依然活着。"
      :asserts="assertsClosure"
      :runnable="runClosure"
    >
      <p class="fs-note">
        闭包不是什么高级语法，它就是 JS <strong>词法作用域 + 函数是对象</strong> 的必然结果：
        函数被创建时，会记住它「出生」时的作用域，这个作用域链一直挂着，于是变量无法被回收。
      </p>
      <div class="fs-grid">
        <div>
          <p class="fs-sub">闭包的三大用途</p>
          <ul class="fs-list">
            <li>私有状态：计数器、缓存、状态机</li>
            <li>把「状态 + 行为」打包成一个函数返回</li>
            <li>回调里记住上下文（事件、定时器、请求）</li>
          </ul>
        </div>
        <div>
          <p class="fs-sub">判断有没有闭包</p>
          <ul class="fs-list">
            <li>外层函数里定义的变量</li>
            <li>被内层函数引用</li>
            <li>内层函数「逃」到了外层函数之外（被返回 / 被注册为回调）</li>
          </ul>
        </div>
      </div>
    </JsCard>

    <JsCard
      title="② 闭包实战：once / memoize / 防抖节流"
      hint="左边的计数器演示：两个计数器各有各的 n，互不影响 —— 这就是「闭包 = 私有一份状态」。"
      :asserts="assertsPatterns"
      :runnable="runPatterns"
      tone="ok"
    >
      <template #extra>
        <button @click="bump('a', 'inc')">A +1</button>
        <button @click="bump('a', 'dec')">A -1</button>
        <button @click="bump('b', 'inc')">B +1</button>
        <button @click="recreateA">重新创建 A</button>
      </template>
      <p class="fs-result">
        计数器 A（makeCounter(0)）= <strong>{{ counterAValue }}</strong> ｜ 计数器 B（makeCounter(100)）=
        <strong>{{ counterBValue }}</strong>
      </p>
      <pre class="code fs-code">function once(fn) {
  let done = false          // 被闭包记住
  let result
  return function (...args) {
    if (!done) {
      done = true
      result = fn.apply(this, args)
    }
    return result
  }
}

function memoize(fn) {
  const cache = new Map()   // 被闭包记住
  return function (key) {
    if (!cache.has(key)) cache.set(key, fn(key))
    return cache.get(key)
  }
}

function debounce(fn, delay) {
  let timer = null          // 被闭包记住
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}</pre>
      <p class="fs-note">
        这三个函数的共同点：<strong>把「要记住的东西」放在外层函数的变量里，用内层函数操作它</strong>。
        点击「重新创建 A」会生成一个全新的闭包，A 的值会重置到新的随机起点 —— 而 B 完全不受影响。
      </p>
    </JsCard>

    <JsCard
      title="③ 循环里 var vs let 的经典陷阱 ★"
      hint="面试必考、项目里天天踩：闭包 + var 会拿到循环结束后的最终值，换成 let 立刻正确。"
      :asserts="assertsLoop"
      :runnable="runLoop"
      tone="danger"
    >
      <table class="fs-table">
        <thead>
          <tr>
            <th>写法</th>
            <th>闭包数量 / 绑定数量</th>
            <th>三个回调的输出</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>for (var i = 0; i &lt; 3; i++) fns.push(() =&gt; i)</code></td>
            <td>1 个 i（函数作用域），3 个闭包共享它</td>
            <td><strong>3, 3, 3</strong></td>
          </tr>
          <tr>
            <td><code>for (let i = 0; i &lt; 3; i++) fns.push(() =&gt; i)</code></td>
            <td>每轮迭代一个新 i（3 个绑定）</td>
            <td><strong>0, 1, 2</strong></td>
          </tr>
          <tr>
            <td>IIFE：<code>((j) =&gt; fns.push(() =&gt; j))(i)</code></td>
            <td>每个 IIFE 调用产生一个新的 j</td>
            <td><strong>0, 1, 2</strong></td>
          </tr>
          <tr>
            <td><code>[0,1,2].forEach((i) =&gt; fns.push(() =&gt; i))</code></td>
            <td>回调形参每次调用一份</td>
            <td><strong>0, 1, 2</strong></td>
          </tr>
        </tbody>
      </table>
      <p class="fs-note">
        记住一句话：<strong>陷阱只在「先存闭包、循环结束后再调用」时出现</strong>。
        如果在循环体里立刻调用（<code>console.log(i)</code>、<code>arr.push(i)</code>），var 也没问题。
        对应的经典面试题就是 <code>for (var i...) setTimeout(() =&gt; console.log(i))</code> 输出 3 3 3。
      </p>
    </JsCard>

    <JsCard
      title="④ 闭包与内存：为什么会泄漏、怎么释放"
      hint="闭包本身不泄漏 —— 泄漏是「你不再需要它，却还有引用」。修法只有两种：断开引用，或者别把它长期注册在全局。"
      :asserts="assertsMemory"
      :runnable="runMemory"
    >
      <table class="fs-table">
        <thead>
          <tr>
            <th>泄露场景</th>
            <th>为什么会留住内存</th>
            <th>修法</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>注册了监听 / 定时器没注销</td>
            <td>全局对象持有回调 → 回调的整个闭包都活着</td>
            <td>removeEventListener / clearInterval（Vue 里放 onBeforeUnmount）</td>
          </tr>
          <tr>
            <td>闭包里引用了巨大的数据</td>
            <td>大对象被闭包的变量引用着</td>
            <td>用完把变量置 <code>null</code>，或不要把大对象放进闭包</td>
          </tr>
          <tr>
            <td>缓存 Map 只增不减</td>
            <td>memoize 的缓存永不释放</td>
            <td>用 <code>WeakMap</code>（键是对象时随对象回收）或加上限</td>
          </tr>
          <tr>
            <td>闭包把 DOM 节点存在变量里</td>
            <td>节点被移除后依然被引用，无法回收</td>
            <td>移除节点时同步清掉引用</td>
          </tr>
        </tbody>
      </table>
      <p class="fs-note">
        面试常考：<strong>「闭包一定会内存泄漏吗？」</strong>——不会。
        现代引擎会做逃逸分析，只保留真正被引用的变量；泄漏的前提是「引用关系没有被断开」。
      </p>
    </JsCard>

    <JsCard
      title="⑤ this 的四种绑定 ★"
      hint="this 是「调用时」决定的运行时上下文：看函数左边有没有点、有没有 call/apply/bind、有没有 new。"
      :asserts="assertsThis"
      :runnable="runThis"
      tone="warn"
    >
      <template #extra>
        <input v-model="thisName" class="fs-mini" placeholder="name" />
        <select v-model="thisMode" class="fs-select">
          <option v-for="m in thisModes" :key="m.key" :value="m.key">{{ m.label }}</option>
        </select>
      </template>
      <p class="fs-result">
        o = &#123; name: '{{ thisName }}', who() &#123; return this?.name &#125; &#125; ｜
        {{ thisModes.find((m) => m.key === thisMode)?.label }} → <strong>{{ thisResult }}</strong>
      </p>
      <table class="fs-table">
        <thead>
          <tr>
            <th>优先级</th>
            <th>绑定方式</th>
            <th>写法</th>
            <th>this 指向</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1（最高）</td>
            <td>new 绑定</td>
            <td><code>new Foo()</code></td>
            <td>新创建的对象（bind 的 this 被忽略）</td>
          </tr>
          <tr>
            <td>2</td>
            <td>显式绑定</td>
            <td><code>fn.call(o)</code> / <code>fn.apply(o)</code> / <code>fn.bind(o)</code></td>
            <td>传入的第一个参数</td>
          </tr>
          <tr>
            <td>3</td>
            <td>隐式绑定</td>
            <td><code>o.fn()</code></td>
            <td>点号左边的对象</td>
          </tr>
          <tr>
            <td>4（最低）</td>
            <td>默认绑定</td>
            <td><code>fn()</code></td>
            <td>严格模式 undefined；非严格模式 window</td>
          </tr>
          <tr>
            <td>—</td>
            <td>箭头函数</td>
            <td><code>() =&gt; this</code></td>
            <td>不参与上面四条，直接取定义位置外层的 this</td>
          </tr>
        </tbody>
      </table>
      <p class="fs-note">
        最有价值的实践结论：<strong>丢失 this 的两个高发地是「回调」和「定时器」</strong> ——
        <code>setTimeout(o.method, 100)</code>、<code>arr.map(o.method)</code> 都会丢；
        用 <code>o.method.bind(o)</code> 或箭头函数包装即可。
      </p>
    </JsCard>

    <JsCard
      title="⑥ 箭头函数的 this、手写 bind、坑清单"
      hint="箭头函数不是「简写的 function」，它没有 this / arguments / prototype，也不能 new —— 这三点必须记牢。"
      :asserts="assertsArrowBind"
      :runnable="runArrowBind"
    >
      <pre class="code fs-code">// bind 的最小实现（只会演示 apply 的思路）
function myBind(fn, ctx, ...preset) {
  return function (...args) {
    return fn.apply(ctx, [...preset, ...args])
  }
}

// 完整版还要考虑 new：new 调用时必须忽略 ctx，并继承原函数的 prototype
Function.prototype.myBind = function (ctx, ...preset) {
  const fn = this
  function bound(...args) {
    const realThis = this instanceof bound ? this : ctx
    return fn.apply(realThis, [...preset, ...args])
  }
  if (fn.prototype) bound.prototype = Object.create(fn.prototype)
  return bound
}</pre>
      <p class="fs-sub">常见坑清单</p>
      <ol class="fs-list fs-list--big">
        <li>
          <strong>把方法当回调传出去</strong>：<code>setTimeout(o.method, 100)</code> /
          <code>arr.forEach(o.method)</code> 里 this 会变成 undefined → 用 bind 或箭头包装。
        </li>
        <li>
          <strong>嵌套普通函数以为能继承 this</strong>：<code>o.outer()</code> 里再写
          <code>function inner() &#123; this &#125;</code>，inner 的 this 是 undefined；
          换成箭头函数才会继承。
        </li>
        <li>
          <strong>用箭头函数写对象方法</strong>：<code>&#123; name: 'a', who: () =&gt; this.name &#125;</code>
          拿不到对象自己 —— 箭头函数不看调用者。
        </li>
        <li>
          <strong>想用箭头函数当构造函数</strong>：<code>new (() =&gt; &#123;&#125;)()</code> 直接
          <code>TypeError: not a constructor</code>，它也没有 prototype。
        </li>
        <li>
          <strong>bind 之后再 bind / call</strong>：第一次 bind 已经锁死，后续全部无效（这是特性，不是 bug）。
        </li>
        <li>
          <strong>循环里用 var 造闭包</strong>：全部拿到最后的值，见 ③。
        </li>
        <li>
          <strong>Vue 的 Options API 里 this 指组件实例</strong>，普通回调里会丢 → 写
          <code>methods</code> 时用箭头函数定义内部回调；<code>&lt;script setup&gt;</code> 里没有 this，
          也就没有这类烦恼，这也是组合式 API 更好用的原因之一。
        </li>
      </ol>
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
.fs-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.7;
}
.fs-table {
  margin-top: 10px;
  font-size: 12.5px;
}
.fs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 10px;
}
.fs-sub {
  margin: 12px 0 6px;
  font-weight: 600;
  font-size: 12.5px;
}
.fs-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.8;
}
.fs-list--big {
  font-size: 13px;
  line-height: 1.9;
}
.fs-mini {
  width: 120px;
}
.fs-select {
  max-width: 260px;
}
.fs-result {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-family: var(--mono);
  font-size: 12.5px;
}
.fs-code {
  margin: 0;
  background: #282c34;
  color: #abb2bf;
  padding: 12px 14px;
  border-radius: 8px;
  overflow: auto;
  line-height: 1.55;
  font-size: 12.5px;
}
</style>
