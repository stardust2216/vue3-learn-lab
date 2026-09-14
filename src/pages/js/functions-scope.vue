<script setup lang="ts">
import { computed, ref } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 2. 函数与作用域
 *
 *   ① 函数声明 vs 函数表达式：提升行为的差异
 *   ② 参数：默认值（惰性求值 / 引用前面的参数）、剩余参数 vs arguments
 *   ③ 函数也是对象 + 高阶函数（once / memoize）
 *   ④ 作用域链与词法作用域、块级作用域、提升的实际表现
 *   ⑤ IIFE、柯里化、偏函数、纯函数与副作用
 *   ⑥ 速查表：提升规则 + 常见坑
 *
 * 说明：本页的断言在组件初始化时求值，凡是「声明的提升」这类必须在同一作用域
 * 里才能观察到的行为，统一用 probeExpr()（new Function）隔离出来做探测。
 * ========================================================================== */

/** 在独立函数里求值一段表达式：用来观察「提升 / TDZ」这类作用域行为 */
function probeExpr(src: string): unknown {
  try {
    // eslint-disable-next-line no-new-func
    return new Function('"use strict"; return (' + src + ')')()
  } catch (e) {
    return (e as Error).name
  }
}

/** only-once：第一次调用执行并缓存结果，之后永远返回缓存值 */
function once<T>(fn: () => T): () => T {
  const box: { done: boolean; value?: T } = { done: false }
  return () => {
    if (!box.done) {
      box.done = true
      box.value = fn()
    }
    return box.value as T
  }
}

/** memoize：同样的入参只计算一次 */
function memoize<A extends string | number, R>(fn: (a: A) => R): (a: A) => R {
  const cache = new Map<A, R>()
  return (a: A) => {
    if (!cache.has(a)) cache.set(a, fn(a))
    return cache.get(a) as R
  }
}

// ---------------------------------------------------------------------------
// ① 函数声明 vs 函数表达式
// ---------------------------------------------------------------------------
const assertsDeclareFn = [
  {
    expr: '函数声明的提升：声明前就能调用',
    actual: probeExpr('(function(){ return typeof h; function h() {} })()'),
    expected: 'function',
    note: '函数声明被「整体提升」，包括函数体',
  },
  {
    expr: '用 var 的函数表达式：提升的只是变量，值是 undefined',
    actual: probeExpr('(function(){ try { return typeof e1 } catch (err) { return err.name } var e1 = function(){} })()'),
    expected: 'undefined',
  },
  {
    expr: '提前调用 var 函数表达式 → 不是「未定义」而是「不是函数」',
    actual: probeExpr('(function(){ try { early() } catch (err) { return err.name } var early = function(){} })()'),
    expected: 'TypeError',
    note: 'undefined 被当成函数调用 → TypeError: early is not a function',
  },
  {
    expr: '用 const/let 的函数表达式：TDZ 里访问直接 ReferenceError',
    actual: probeExpr('(function(){ try { return typeof e2 } catch (err) { return err.name } const e2 = function(){} })()'),
    expected: 'ReferenceError',
  },
  {
    expr: '函数声明优先于同名的 var',
    actual: probeExpr('(function(){ var x; function x(){} return typeof x })()'),
    expected: 'function',
    note: '同名时函数声明会覆盖 var 的 undefined',
  },
  {
    expr: '匿名函数表达式的 name 是空串',
    actual: (function () {}).name,
    expected: '',
  },
  {
    expr: '命名函数表达式的 name',
    actual: (function inner() {}).name,
    expected: 'inner',
  },
  {
    expr: "变量赋值时推断出 name：const f = () => {}",
    actual: (() => {
      const f = () => {}
      return f.name
    })(),
    expected: 'f',
    note: '有名字，递归和调试都更友好',
  },
  { expr: '箭头函数的 length（形参个数）', actual: (() => {}).length, expected: 0 },
  { expr: '两个形参的 length', actual: ((a: number, b: number) => a + b).length, expected: 2 },
  {
    expr: '有默认值的参数不计入 length',
    actual: ((a: number, b = 1) => a + b).length,
    expected: 1,
  },
  {
    expr: '剩余参数不计入 length',
    actual: ((...rest: number[]) => rest.length).length,
    expected: 0,
  },
]

const runDeclareFn = `console.log('=== 1) 函数声明：整体提升，声明之前就能调用 ===')
console.log('先调用，后声明：', declHoisted())

function declHoisted() {
  return '我是函数声明，被整体提升了'
}

console.log('')
console.log('=== 2) 函数表达式（var）：只有变量提升，值是 undefined ===')
try {
  exprVar()
} catch (e) {
  console.log('提前调用 →', e.name + ': ' + e.message)
}
var exprVar = function () {
  return '我是 var 函数表达式'
}
console.log('声明之后调用：', exprVar())

console.log('')
console.log('=== 3) 函数表达式（const/let）：TDZ 直接抛错 ===')
try {
  exprConst()
} catch (e) {
  console.log('提前调用 →', e.name + ': ' + e.message)
}
const exprConst = function () {
  return '我是 const 函数表达式'
}
console.log('声明之后调用：', exprConst())

console.log('')
console.log('=== 4) 命名函数表达式的名字只在自己内部可见 ===')
const named = function inner() {
  return typeof inner          // 内部：函数自己
}
console.log('内部 typeof inner =', named())
console.log('外部 typeof inner =', typeof inner)   // 'undefined'

console.log('')
console.log('=== 5) 递归里为什么要用函数声明 / 命名函数表达式 ===')
function countdown(n) {
  console.log('倒计时', n)
  if (n > 1) countdown(n - 1)   // 用声明的名字递归，最稳
}
countdown(3)`

// ---------------------------------------------------------------------------
// ② 参数：默认值、剩余参数、arguments
// ---------------------------------------------------------------------------
const argChoice = ref('none')
const defaultCalls = ref(0)
const defaultResult = ref('点右边的按钮试一次')
const defaultLog = ref<string[]>([])

/** 默认值表达式是「惰性」的：只有真的需要用到默认值时才会求值 */
function callDefaultDemo() {
  const f = (x: any = '默认#' + ++defaultCalls.value) => x
  let arg: any
  let passArg = true
  switch (argChoice.value) {
    case 'undefined':
      arg = undefined
      break
    case 'null':
      arg = null
      break
    case 'zero':
      arg = 0
      break
    case 'empty':
      arg = ''
      break
    default:
      passArg = false
  }
  const v = passArg ? f(arg) : f()
  const shown = typeof v === 'string' ? `'${v}'` : String(v)
  defaultResult.value = `返回 ${shown}（默认值总共求值了 ${defaultCalls.value} 次）`
  defaultLog.value.unshift(`传 ${argChoice.value} → ${defaultResult.value}`)
}

const assertsParams = [
  {
    expr: '默认值只在实参是 undefined 时生效（传 null 不生效）',
    actual: ((x: any = 'default') => String(x))(null),
    expected: 'null',
    note: '这是最常见的误解：null 是「有值」，不会触发默认值',
  },
  {
    expr: '不传参数 → 用默认值',
    actual: ((x: any = 'default') => String(x))(),
    expected: 'default',
  },
  {
    expr: "显式传 undefined → 也会用默认值",
    actual: ((x: any = 'default') => String(x))(undefined),
    expected: 'default',
  },
  {
    expr: "传空串 '' → 空串是有效值，不用默认值",
    actual: ((x: any = 'default') => String(x))(''),
    expected: '',
  },
  {
    expr: '默认值默认表达式惰性求值：两次调用求值两次',
    actual: (() => {
      let n = 0
      const f = (x: number = ++n) => x
      const a = f()
      const b = f()
      return `${a},${b},求值次数=${n}`
    })(),
    expected: '1,2,求值次数=2',
    note: '每次调用都会重新执行默认值表达式，不是只在定义时算一次',
  },
  {
    expr: '默认值可以引用前面的参数：b = a * 2',
    actual: ((a: number, b: number = a * 2) => b)(3),
    expected: 6,
  },
  {
    expr: '默认值不能引用「后面」的参数（那时它还在 TDZ 里）',
    actual: probeExpr(
      '(function(){ const f = (a = b, b = 2) => a; try { return String(f()) } catch (e) { return e.name } })()',
    ),
    expected: 'ReferenceError',
    note: '参数是从左往右初始化的，所以前面能用后面不行',
  },
  {
    expr: 'arguments.length 数的是「实参个数」，不是形参个数',
    actual: (() => {
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      function f(a = 1, b = 2) {
        return `${arguments.length}/${f.length}`
      }
      return f(10)
    })(),
    expected: '1/0',
    note: 'f.length 是 0（默认值参数起始处就截断了），实参只传了 1 个',
  },
  {
    expr: '剩余参数是真数组，可以直接用数组方法',
    actual: (() => {
      const f = (...xs: number[]) => xs.filter((x) => x > 1).length
      return f(1, 2, 3)
    })(),
    expected: 2,
  },
  {
    expr: 'arguments 是「类数组」：Array.isArray 为 false',
    actual: (() => {
      function f() {
        return Array.isArray(arguments)
      }
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      return f(1, 2)
    })(),
    expected: false,
    note: '它只有 length 和下标，没有 map/filter，要用 Array.from 转换',
  },
  {
    expr: 'arguments 上没有 forEach',
    actual: (() => {
      function f() {
        return typeof (arguments as unknown as { forEach?: unknown }).forEach
      }
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      return f(1)
    })(),
    expected: 'undefined',
  },
  {
    expr: '箭头函数没有自己的 arguments，用的是外层的',
    actual: probeExpr('(function(){ const f = () => arguments.length; return f() })(1,2,3)'),
    expected: 3,
  },
  {
    expr: '严格模式下 arguments 不与形参联动（本页就是严格模式）',
    actual: (() => {
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      function f(a: number) {
        a = 99
        return arguments[0]
      }
      return f(1)
    })(),
    expected: 1,
    note: '非严格模式（老脚本）里这里会是 99，这也是 arguments 不可靠的原因之一',
  },
  {
    expr: '解构参数 + 默认值：({ a = 1, b = 2 } = {})',
    actual: (({ a = 1, b = 2 } = {}) => a + b)(),
    expected: 3,
  },
]

const runParams = `console.log('=== 默认值只在 undefined 时生效 ===')
const greet = (name = '陌生人') => '你好，' + name
console.log(greet())
console.log(greet(undefined))
console.log(greet(null))      // null 被当成有效值
console.log(greet(''))

console.log('')
console.log('=== 默认值是惰性求值的（每次调用都可能重新算） ===')
let calls = 0
const lazy = (x = ++calls) => x
console.log('lazy() =', lazy(), '/ lazy() =', lazy(), '/ 求值次数 =', calls)

console.log('')
console.log('=== 默认值可以引用前面的参数 ===')
const box = (w, h = w) => w * h          // 正方形只传一个参数
console.log('box(3) =', box(3), '/ box(3, 4) =', box(3, 4))

console.log('')
console.log('=== 剩余参数 vs arguments ===')
function withRest(first, ...rest) {
  console.log('first =', first, '/ 剩余参数 =', rest, '/ 是真数组吗？', Array.isArray(rest))
  return rest.map((x) => x * 2)          // 真数组可以直接 map
}
console.log('结果 =', withRest(1, 2, 3))

function withArguments() {
  console.log('arguments =', arguments, '/ 是真数组吗？', Array.isArray(arguments))
  console.log('它连 forEach 都没有：', typeof arguments.forEach)
  console.log('转成真数组后：', Array.from(arguments).map((x) => x * 2))
}
withArguments(1, 2, 3)

console.log('')
console.log('=== 箭头函数没有自己的 arguments ===')
function outer() {
  const arrow = () => arguments.length    // 拿到的是 outer 的 arguments
  return arrow()
}
console.log('outer(1,2,3) 里箭头函数读到 arguments.length =', outer(1, 2, 3))

console.log('')
console.log('=== 严格模式下 arguments 不与形参联动 ===')
function strictArgs(a) {
  a = 99
  return 'a = ' + a + ' / arguments[0] = ' + arguments[0]
}
console.log(strictArgs(1), ' ← 注意 arguments[0] 还是 1')`

// ---------------------------------------------------------------------------
// ③ 函数也是对象 + 高阶函数
// ---------------------------------------------------------------------------
const fibN = ref('25')
const fibStats = computed(() => {
  const n = Math.max(0, Math.min(28, Math.floor(Number(fibN.value) || 0)))
  let plainCalls = 0
  const plain = (k: number): number => {
    plainCalls++
    return k < 2 ? k : plain(k - 1) + plain(k - 2)
  }
  const value = plain(n)

  let memoCalls = 0
  const cache = new Map<number, number>()
  const fast = (k: number): number => {
    if (k < 2) return k
    const hit = cache.get(k)
    if (hit !== undefined) return hit
    memoCalls++
    const r = fast(k - 1) + fast(k - 2)
    cache.set(k, r)
    return r
  }
  const fastValue = fast(n)
  return { n, value, fastValue, plainCalls, memoCalls }
})

const assertsHigher = [
  {
    expr: '函数可以挂属性（它本来就是对象）',
    actual: (() => {
      const f: (() => void) & { tag?: string } = () => {}
      f.tag = 'counter'
      return f.tag
    })(),
    expected: 'counter',
  },
  { expr: '函数 instanceof Function', actual: (() => {}) instanceof Function, expected: true },
  { expr: '函数 instanceof Object', actual: (() => {}) instanceof Object, expected: true },
  {
    expr: '函数当参数传进去（高阶函数）',
    actual: ((fn: (n: number) => number) => fn(2))((n) => n * 3),
    expected: 6,
  },
  {
    expr: '函数当返回值（工厂函数）',
    actual: ((n: number) => (m: number) => n + m)(1)(2),
    expected: 3,
  },
  {
    expr: '数组方法全是高阶函数：map 接收一个函数',
    actual: [1, 2, 3].map((n) => n * n).join(','),
    expected: '1,4,9',
  },
  {
    expr: 'once：连续调用 3 次，原函数只执行 1 次',
    actual: (() => {
      let runs = 0
      const init = once(() => ++runs)
      init()
      init()
      init()
      return runs
    })(),
    expected: 1,
    note: '典型用途：只初始化一次的单例、只提示一次的弹窗',
  },
  {
    expr: 'once：返回值是第一次的结果',
    actual: (() => {
      let runs = 0
      const init = once(() => `第${++runs}次`)
      const a = init()
      const b = init()
      return `${a}/${b}`
    })(),
    expected: '第1次/第1次',
  },
  {
    expr: 'memoize：重复入参不重复计算',
    actual: (() => {
      let runs = 0
      const slow = memoize((n: number) => {
        runs++
        return n * n
      })
      slow(4)
      slow(4)
      slow(5)
      return `结果=${slow(4)}/计算次数=${runs}`
    })(),
    expected: '结果=16/计算次数=2',
  },
  {
    expr: 'fib(20)：带 memo 只需计算 19 次',
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
      const v = fib(20)
      return `${v}/${runs}`
    })(),
    expected: '6765/19',
    note: '不带 memo 的 fib(20) 要调用约 2 万次（下面可交互对比）',
  },
]

const runHigher = `console.log('=== 函数是「一等公民」：能赋值、能传参、能挂属性、能返回 ===')
function tag(fn) {
  fn.calls = 0                       // 给函数挂个属性，完全合法
  return fn
}
const tracked = tag(() => 'ok')
tracked()
console.log('函数上的自定义属性 calls =', tracked.calls, '/ 函数名 =', tracked.name)

console.log('')
console.log('=== 高阶函数：把「行为」当参数传进去 ===')
const nums = [1, 2, 3, 4, 5]
console.log('filter(是偶数) =', nums.filter((n) => n % 2 === 0))
console.log('map(平方) =', nums.map((n) => n * n))
const repeat = (times, action) => {    // action 是一个函数
  for (let i = 0; i < times; i++) action(i)
}
repeat(3, (i) => console.log('  第', i, '次执行回调'))

console.log('')
console.log('=== once：只执行一次 ===')
function once(fn) {
  let done = false
  let result
  return function () {
    if (!done) {
      done = true
      result = fn.apply(this, arguments)
    }
    return result
  }
}
let runs = 0
const init = once(() => { runs++; return '初始化完成 #' + runs })
console.log(init())
console.log(init())
console.log(init(), ' ← 原函数实际只跑了 ' + runs + ' 次')

console.log('')
console.log('=== memoize：空间换时间 ===')
function memoize(fn) {
  const cache = new Map()
  return function (key) {
    if (!cache.has(key)) cache.set(key, fn(key))
    return cache.get(key)
  }
}
let count = 0
const slowSquare = memoize((n) => {
  count++                              // 假装这里有很贵的计算 / 请求
  return n * n
})
console.log(slowSquare(4), slowSquare(4), slowSquare(5), ' ← 只真的算了', count, '次')

console.log('')
console.log('=== 经典对比：朴素递归 vs 记忆化 ===')
function plainFib(n) {
  return n < 2 ? n : plainFib(n - 1) + plainFib(n - 2)
}
const memoFib = memoize(function fib(n) {
  return n < 2 ? n : memoFib(n - 1) + memoFib(n - 2)
})
console.log('plainFib(20) =', plainFib(20))
console.log('memoFib(20) =', memoFib(20))
console.log('（把 n 改成 27 以上，朴素版会明显卡住，记忆化版本瞬间出结果）')`

// ---------------------------------------------------------------------------
// ④ 作用域链与词法作用域
// ---------------------------------------------------------------------------
const assertsScope = [
  {
    expr: '词法作用域：f 在哪定义，就认哪个 x（和谁调用它无关）',
    actual: (() => {
      const x = 'outer'
      function f() {
        return x
      }
      function g() {
        const x = 'inner'
        void x
        return f()
      }
      return g()
    })(),
    expected: 'outer',
    note: '作用域在「定义时」就确定了，这叫词法作用域（lexical scope）',
  },
  {
    expr: '作用域链：内层找不到就往外层找',
    actual: (() => {
      const a = 1
      return (() => {
        const b = 2
        return (() => a + b)()
      })()
    })(),
    expected: 3,
  },
  {
    expr: '块级作用域：if/for 的 {} 也是作用域（let/const）',
    actual: (() => {
      let r = ''
      {
        const inner = 'block'
        r = inner
      }
      return r
    })(),
    expected: 'block',
  },
  {
    expr: 'for + let：每次迭代都是新的绑定',
    actual: (() => {
      const fns: (() => number)[] = []
      for (let i = 0; i < 3; i++) fns.push(() => i)
      return fns.map((f) => f()).join(',')
    })(),
    expected: '0,1,2',
  },
  {
    expr: 'for + var：三个闭包共用同一个 i（经典陷阱，详见第 3 页）',
    actual: (() => {
      const fns: (() => number)[] = []
      for (var i = 0; i < 3; i++) fns.push(() => i)
      return fns.map((f) => f()).join(',')
    })(),
    expected: '3,3,3',
  },
  {
    expr: '函数声明被整体提升：typeof 在声明前就是 function',
    actual: probeExpr('(function(){ return typeof h; function h() {} })()'),
    expected: 'function',
  },
  {
    expr: 'var 提升后是 undefined（不报错，最坑）',
    actual: probeExpr('(function(){ try { return typeof v } catch (e) { return e.name } var v = 1 })()'),
    expected: 'undefined',
  },
  {
    expr: 'let 提升但不初始化：访问落在 TDZ 里报错',
    actual: probeExpr('(function(){ try { return typeof l } catch (e) { return e.name } let l = 1 })()'),
    expected: 'ReferenceError',
  },
  {
    expr: '在函数内部声明的变量不会泄露到外面',
    actual: (() => {
      function f() {
        const secret = 'inside'
        return secret
      }
      f()
      return typeof (globalThis as unknown as { secret?: unknown }).secret
    })(),
    expected: 'undefined',
  },
  {
    expr: '没有声明就赋值 → 在严格模式下抛错',
    actual: probeExpr('(function(){ try { notDeclared = 1; return "ok" } catch (e) { return e.name } })()'),
    expected: 'ReferenceError',
    note: '非严格模式会悄悄创建全局变量，这是历史遗留的污染来源',
  },
]

const runScope = `console.log('=== 词法作用域：看「定义位置」，不看「调用位置」 ===')
const x = 'outer'
function readX() {
  return x
}
function callFromInner() {
  const x = 'inner'
  return readX()          // 虽然是在 inner 里调用的，但 readX 定义在 outer
}
console.log('callFromInner() 返回：', callFromInner())

console.log('')
console.log('=== 作用域链：一层层往外找 ===')
const level1 = 'L1'
function outerFn() {
  const level2 = 'L2'
  function innerFn() {
    const level3 = 'L3'
    return [level1, level2, level3].join(' + ')
  }
  return innerFn()
}
console.log(outerFn())

console.log('')
console.log('=== 块级作用域 ===')
{
  const onlyHere = '只在块里'
  console.log('块里能读到：', onlyHere)
}
try {
  console.log(onlyHere)
} catch (e) {
  console.log('块外读不到 →', e.name + ': ' + e.message)
}

console.log('')
console.log('=== 提升的三种表现 ===')
function hoisting() {
  console.log('函数声明：', typeof declaredLater)     // function
  console.log('var 变量：', typeof varLater)          // undefined
  try {
    console.log('let 变量：', letLater)
  } catch (e) {
    console.log('let 变量 →', e.name, '（TDZ）')
  }
  function declaredLater() {}
  var varLater = 1
  let letLater = 1
}
hoisting()

console.log('')
console.log('=== 严格模式：不给未声明的变量赋值 ===')
try {
  notDeclaredAnywhere = 1
} catch (e) {
  console.log('未声明就赋值 →', e.name + ': ' + e.message)
}`

// ---------------------------------------------------------------------------
// ⑤ IIFE / 柯里化 / 偏函数 / 纯函数
// ---------------------------------------------------------------------------
/** 简化版 curry：把 f(a, b) 变成 f(a)(b) */
function curry2<A, B, R>(fn: (a: A, b: B) => R): (a: A) => (b: B) => R {
  return (a: A) => (b: B) => fn(a, b)
}

const assertsStyle = [
  {
    expr: 'IIFE：定义完立刻执行，变量不外泄',
    actual: (function (n: number) {
      return n * 2
    })(21),
    expected: 42,
  },
  {
    expr: 'IIFE 里的变量外面看不到',
    actual: probeExpr('(function(){ (function(){ var hidden = 1 })(); return typeof hidden })()'),
    expected: 'undefined',
  },
  {
    expr: '柯里化：f(a)(b)',
    actual: curry2((a: number, b: number) => a * b)(3)(4),
    expected: 12,
  },
  {
    expr: '柯里化后可以先固定一个参数，复用多次',
    actual: (() => {
      const mul = curry2((a: number, b: number) => a * b)
      const double = mul(2)
      return `${double(5)},${double(6)}`
    })(),
    expected: '10,12',
  },
  {
    expr: '偏函数：bind 预置参数',
    actual: ((a: number, b: number) => a + b).bind(null, 1)(2),
    expected: 3,
    note: 'bind 的第二个参数开始就是「预置实参」',
  },
  {
    expr: '偏函数：预置的参数不能被后续调用覆盖',
    // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
    actual: ((a: number, b: number) => `${a}-${b}`).bind(null, 'fixed')('later'),
    expected: 'fixed-later',
  },
  {
    expr: '纯函数：同样的输入永远同样的输出',
    actual: (() => {
      const add = (a: number, b: number) => a + b
      return `${add(1, 2)}/${add(1, 2)}`
    })(),
    expected: '3/3',
  },
  {
    expr: '非纯函数（有副作用）：两次调用结果不一样',
    actual: (() => {
      let total = 0
      const impure = (n: number) => {
        total += n
        return total
      }
      return `${impure(1)}/${impure(1)}`
    })(),
    expected: '1/2',
    note: '同样的入参得到不同结果 → 不可预测，难测试',
  },
  {
    expr: '纯函数不修改入参（对比：直接改对象的写法）',
    actual: (() => {
      const pure = (arr: number[]) => [...arr, 9]
      const origin = [1]
      pure(origin)
      return origin.length
    })(),
    expected: 1,
  },
  {
    expr: '数组排序这类「就地修改」是典型的副作用',
    actual: (() => {
      const arr = [3, 1, 2]
      arr.sort()
      return arr.join(',')
    })(),
    expected: '1,2,3',
    note: 'sort 会改原数组；想保持纯函数用 toSorted（见第 4 页）',
  },
]

const runStyle = `console.log('=== IIFE：过去用来「造一个私有作用域」 ===')
var counter = (function () {
  var count = 0                 // 外面访问不到，只暴露下面两个方法
  return {
    inc: function () { return ++count },
    get: function () { return count },
  }
})()
counter.inc()
counter.inc()
console.log('计数 =', counter.get(), '/ 直接访问 count =', typeof counter.count)

console.log('')
console.log('=== 柯里化 curry：多参数函数变单参数链 ===')
function curry2(fn) {
  return (a) => (b) => fn(a, b)
}
const mul = curry2((a, b) => a * b)
console.log('mul(3)(4) =', mul(3)(4))
const double = mul(2)          // 固定第一个参数，得到一个可复用的函数
console.log('double(5) =', double(5), '/ double(8) =', double(8))

console.log('')
console.log('=== 偏函数 partial：bind 只能预置「前面的」参数 ===')
// 所以设计函数时，把「想被固定的参数」放前面
function padding(len, char, text) {
  return String(text).padStart(len, char)
}
const pad6 = padding.bind(null, 6, '0')     // 预置 len 和 char
console.log('pad6("42") =', pad6('42'))
console.log('pad6("7") =', pad6('7'))
console.log('完整调用 padding(6, "0", "42") =', padding(6, '0', '42'))

console.log('')
console.log('=== 纯函数 vs 副作用 ===')
let total = 0
function impureAdd(n) {         // 副作用：修改了外部变量
  total += n
  return total
}
console.log('impureAdd(1) =', impureAdd(1), '/ impureAdd(1) =', impureAdd(1), ' ← 同样入参，不同结果')

const pureAdd = (a, b) => a + b
console.log('pureAdd(1, 1) =', pureAdd(1, 1), '/ pureAdd(1, 1) =', pureAdd(1, 1))

console.log('')
console.log('=== 把副作用「推」到边界：先算纯的，再统一写 ===')
const cart = [{ price: 10, qty: 2 }, { price: 5, qty: 3 }]
const sum = (items) => items.reduce((s, it) => s + it.price * it.qty, 0)
const withTax = (amount) => Math.round(amount * 1.06 * 100) / 100
console.log('小计 =', sum(cart), '/ 含税 =', withTax(sum(cart)))`

// ---------------------------------------------------------------------------
// ⑥ 速查表用不到额外状态
// ---------------------------------------------------------------------------
</script>

<template>
  <div>
    <h1>2. 函数与作用域</h1>
    <p class="lead">
      <strong>函数声明会整体提升，函数表达式只提升变量</strong>（var 得到 undefined，let/const 落在
      TDZ）；作用域在<strong>定义时</strong>就确定（词法作用域），和谁调用无关；函数本身是对象，所以能传参、挂属性、当返回值 ——
      这就是「高阶函数」的基础。
    </p>

    <JsCard
      title="① 函数声明 vs 函数表达式：提升的差异"
      hint="这是「有时候能调用，有时候报错」这类灵异 bug 的根源，两种写法必须分清。"
      :asserts="assertsDeclareFn"
      :runnable="runDeclareFn"
    >
      <table class="fs-table">
        <thead>
          <tr>
            <th>写法</th>
            <th>提升行为</th>
            <th>声明前调用</th>
            <th>典型错误</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>function f() {}</code></td>
            <td>整体提升（含函数体）</td>
            <td>正常可用</td>
            <td>无</td>
          </tr>
          <tr>
            <td><code>var f = function () {}</code></td>
            <td>只提升 var 变量名</td>
            <td>报 TypeError</td>
            <td>f is not a function</td>
          </tr>
          <tr>
            <td><code>let / const f = function () {}</code></td>
            <td>提升但不初始化（TDZ）</td>
            <td>报 ReferenceError</td>
            <td>Cannot access 'f' before initialization</td>
          </tr>
          <tr>
            <td><code>const f = () =&gt; {}</code></td>
            <td>同 let/const</td>
            <td>报 ReferenceError</td>
            <td>同上</td>
          </tr>
          <tr>
            <td><code>class C {}</code></td>
            <td>提升但不初始化（TDZ）</td>
            <td>报 ReferenceError</td>
            <td>Cannot access 'C' before initialization</td>
          </tr>
        </tbody>
      </table>
      <p class="fs-note">
        工程建议：<strong>工具函数用函数声明（可读性 + 提升能力），需要条件定义或当值传递时用函数表达式</strong>；
        永远不要在声明之前调用一个函数表达式。
      </p>
    </JsCard>

    <JsCard
      title="② 参数：默认值、剩余参数、arguments"
      hint="默认值只在实参是 undefined 时生效；默认值表达式是惰性的，每次调用都可能重新求值。"
      :asserts="assertsParams"
      :runnable="runParams"
      tone="ok"
    >
      <template #extra>
        <select v-model="argChoice" class="fs-mini">
          <option value="none">不传参数</option>
          <option value="undefined">传 undefined</option>
          <option value="null">传 null</option>
          <option value="zero">传 0</option>
          <option value="empty">传 ''</option>
        </select>
        <button class="primary" @click="callDefaultDemo">调用 f()</button>
      </template>
      <p class="fs-result">f(x = '默认#' + ++n) → {{ defaultResult }}</p>
      <pre class="code fs-log">{{ defaultLog.slice(0, 6).join('\n') || '（还没有记录）' }}</pre>
      <div class="fs-grid">
        <div>
          <p class="fs-sub">剩余参数 <code>...rest</code></p>
          <ul class="fs-list">
            <li>是真数组，能直接用 map / filter / reduce</li>
            <li>只能是最后一个参数</li>
            <li>不计入 <code>fn.length</code></li>
          </ul>
        </div>
        <div>
          <p class="fs-sub">arguments（老写法）</p>
          <ul class="fs-list">
            <li>类数组：只有 length 和下标，没有数组方法</li>
            <li>箭头函数里没有它（取到的是外层的）</li>
            <li>严格模式下不与形参联动，<strong>新代码不要用</strong></li>
          </ul>
        </div>
      </div>
    </JsCard>

    <JsCard
      title="③ 函数也是对象 + 高阶函数（once / memoize）"
      hint="「把函数当参数」是 JS 最有价值的特性：数组方法、事件回调、Promise、Vue 组合式函数全靠它。"
      :asserts="assertsHigher"
      :runnable="runHigher"
    >
      <template #extra>
        <span class="kv">fib(</span>
        <input v-model="fibN" type="number" min="0" max="28" class="fs-num" />
        <span class="kv">)</span>
      </template>
      <p class="fs-result">
        fib({{ fibStats.n }}) = {{ fibStats.value }} ｜ 朴素递归调用
        <strong>{{ fibStats.plainCalls }}</strong> 次 ｜ 记忆化只计算
        <strong>{{ fibStats.memoCalls }}</strong> 次（结果 {{ fibStats.fastValue }}）
      </p>
      <pre class="code fs-code">// once：只执行一次，后续直接返回第一次的结果
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

// memoize：同样的入参不重复计算（空间换时间）
function memoize(fn) {
  const cache = new Map()
  return function (key) {
    if (!cache.has(key)) cache.set(key, fn(key))
    return cache.get(key)
  }
}</pre>
      <p class="fs-note">
        工程提醒：<code>memoize</code> 的 <code>Map</code> 会一直变大 —— 真实项目要加容量上限或用
        <code>WeakMap</code>（键是对象时，对象被回收缓存也会跟着释放，见第 6 页）。
      </p>
    </JsCard>

    <JsCard
      title="④ 作用域链与词法作用域"
      hint="变量查找只看「代码写在哪」，不看「谁调用的它」—— 想通这一点，闭包、this、Vue 的 setup 作用域都会顺。"
      :asserts="assertsScope"
      :runnable="runScope"
    >
      <div class="fs-grid">
        <div>
          <p class="fs-sub">查找顺序</p>
          <ol class="fs-list">
            <li>当前函数自己的变量 / 形参</li>
            <li>外层函数的作用域</li>
            <li>再外层……直到全局</li>
            <li>都没有 → ReferenceError（读取）或创建全局变量（非严格模式赋值）</li>
          </ol>
        </div>
        <div>
          <p class="fs-sub">提升的三种结果</p>
          <ul class="fs-list">
            <li><code>function f(){}</code> → 提升即可用</li>
            <li><code>var v</code> → 提升为 undefined</li>
            <li><code>let/const/class</code> → 提升但不可访问（TDZ）</li>
          </ul>
        </div>
      </div>
      <p class="fs-note">
        面试常考：<strong>「作用域链的最顶端是全局作用域；模块（ESM）里的顶层作用域也是模块作用域，不是 window」</strong>。
        本项目所有页面都是 ESM 模块，所以代码默认就是严格模式。
      </p>
    </JsCard>

    <JsCard
      title="⑤ IIFE、柯里化、偏函数、纯函数与副作用"
      hint="IIFE 是 ES6 之前「造私有作用域」的唯一手段；现在模块 + 块级作用域已经取代了它的多数用途。"
      :asserts="assertsStyle"
      :runnable="runStyle"
      tone="warn"
    >
      <table class="fs-table">
        <thead>
          <tr>
            <th>概念</th>
            <th>一句话定义</th>
            <th>项目里的样子</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>IIFE</td>
            <td>定义完立刻执行的函数表达式</td>
            <td>老库的私有作用域；现在被模块替代</td>
          </tr>
          <tr>
            <td>柯里化 curry</td>
            <td><code>f(a, b)</code> → <code>f(a)(b)</code></td>
            <td>预置配置、复用函数（如 <code>mul(2)</code>）</td>
          </tr>
          <tr>
            <td>偏函数 partial</td>
            <td>先固定部分参数，得到新函数</td>
            <td><code>fn.bind(null, 固定值)</code></td>
          </tr>
          <tr>
            <td>纯函数</td>
            <td>同入参同输出 + 无副作用</td>
            <td>computed 里的计算、可测试的工具函数</td>
          </tr>
          <tr>
            <td>副作用</td>
            <td>改了外部状态（DOM、全局变量、网络）</td>
            <td>请求、写 localStorage、改 DOM —— 要集中在边界</td>
          </tr>
        </tbody>
      </table>
    </JsCard>

    <JsCard
      title="⑥ 常见坑清单（这一页的错都很有代表性）"
      hint="遇到「函数明明是写对的却不生效」，先按这张表排查。"
      tone="danger"
    >
      <ol class="fs-list fs-list--big">
        <li>
          <strong>提前调用函数表达式</strong>：<code>var f = function(){}</code> 写在后面，前面调用报
          <code>TypeError: f is not a function</code>（而不是未定义），因为提升后是 undefined。
        </li>
        <li>
          <strong>以为传 null 会走默认值</strong>：<code>f(null)</code> 不会用默认值，只有
          <code>undefined</code>（含不传、显式 undefined）才会。要兼容 null 得写
          <code>x = x ?? 默认值</code>。
        </li>
        <li>
          <strong>箭头函数带花括号忘了 return</strong>：<code>() =&gt; { value: 1 }</code>
          返回的是 undefined（<code>{}</code> 被当成函数体），返回对象要写 <code>() =&gt; ({ value: 1 })</code>。
        </li>
        <li>
          <strong>在函数里改引用类型的参数</strong>：改属性会影响调用方（同一个对象），但给参数重新赋值不会。
        </li>
        <li>
          <strong>用 arguments 做新逻辑</strong>：它不是真数组、在箭头函数里失效、严格模式下不与形参联动，一律改用
          <code>...rest</code>。
        </li>
        <li>
          <strong>IIFE 前面缺分号</strong>：上一行没写 <code>;</code> 时，
          <code>(function(){})()</code> 会被拼到上一行后面当成函数调用，报出莫名其妙的错误。
        </li>
        <li>
          <strong>依赖「函数调用时的作用域」</strong>：JS 是词法作用域，函数内的变量只由定义位置决定，别指望调用者能影响它。
        </li>
      </ol>
      <pre class="code fs-code">// 坑 3 的可运行写法
const ok = () =&gt; ({ value: 1 })   // 想返回对象字面量 → 用小括号包起来
const bad = () =&gt; { value: 1 }    // 这是函数体，返回 undefined</pre>
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
  margin: 0 0 6px;
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
  max-width: 150px;
}
.fs-num {
  width: 80px;
}
.fs-result {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-family: var(--mono);
  font-size: 12.5px;
}
.fs-log,
.fs-code {
  margin-top: 10px;
}
.fs-code {
  background: #282c34;
  color: #abb2bf;
  padding: 12px 14px;
  border-radius: 8px;
  overflow: auto;
  line-height: 1.55;
  font-size: 12.5px;
}
</style>
