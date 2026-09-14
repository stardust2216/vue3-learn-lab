<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ---- 演示数据提取到此处：模板属性里不适合写长表达式（引号/花括号会被 HTML 属性语法干扰）---- */
const asserts1 = [
        { expr: 'new TypeError("x") instanceof Error', actual: new TypeError('x') instanceof Error, expected: true, note: '所有内置错误都继承 Error' },
        { expr: 'new Error("x").name', actual: new Error('x').name, expected: 'Error' },
        { expr: 'new RangeError("x").name', actual: new RangeError('x').name, expected: 'RangeError' },
        // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
        { expr: 'throw 一个字符串的话 instanceof Error', actual: 'oops' instanceof Error, expected: false, note: '所以永远 throw new Error(...)，不要 throw 字符串' },
        { expr: '(function(){ try { null.x } catch (e) { return e.name } })()', actual: (function () { try { (null as unknown as { x: number }).x } catch (e) { return (e as Error).name } return '' })(), expected: 'TypeError' },
        { expr: '(function(){ try { return (0, eval)("no_such_var") } catch (e) { return e.name } })()', actual: (function () { try { return (0, eval)('no_such_var') } catch (e) { return (e as Error).name } })(), expected: 'ReferenceError', note: '间接 eval 里读未声明变量 → ReferenceError' },
        { expr: '(function(){ class E extends Error { constructor(m, o) { super(m, o); this.name = "E" } } return new E("m", { cause: 1 }).cause })()', actual: (function () { class E extends Error { constructor(m: string, o?: { cause?: unknown }) { super(m, o); this.name = 'E' } } return new E('m', { cause: 1 }).cause })(), expected: 1, note: 'ES2022 的 cause 用来保留原始错误' },
        { expr: 'new Error("x").stack 的类型', actual: typeof new Error('x').stack, expected: 'string', note: 'stack 不是标准属性，但所有引擎都实现' },
        { expr: '(function(){ class E extends Error {} return new E() instanceof Error })()', actual: (function () { class E extends Error {} return new E() instanceof Error })(), expected: true },
      ]

/* ============================================================================
 * 10. 模块与错误处理
 *
 * 模块解决「代码怎么组织」，错误处理解决「出错时怎么不炸」。
 * 两者在本项目里有直接对应：
 *   · 模块：src/router/index.ts 用 import.meta.glob 懒加载页面；vite 靠 ESM 做 tree shaking
 *   · 错误：src/main.ts 的 app.config.errorHandler 是全局兜底，路由还有 router.onError
 * ========================================================================== */

// ==================== ① 动态 import 演示 ====================
const dynLog = ref<string[]>([])
const dynRunning = ref(false)
const dynLoaded = ref(0)

function pushDyn(line: string) {
  dynLog.value = [...dynLog.value, line].slice(-7)
}

/** 静态 import 会在页面加载时就执行；动态 import 是「用到才下载」 */
async function dynImportVue() {
  dynRunning.value = true
  pushDyn('import("vue") 开始（第一次会真的走网络/模块加载）…')
  const t0 = performance.now()
  try {
    const mod = await import('vue') // 这是真正的动态 import，返回 Promise
    dynLoaded.value++
    pushDyn(`✅ 拿到模块，耗时 ${Math.round(performance.now() - t0)}ms`)
    pushDyn(`   Object.keys(mod).length = ${Object.keys(mod).length}（默认导出在 mod.default）`)
    // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
    pushDyn(`   mod.default ? ${typeof mod.default} / 具名导出 ref ? ${typeof (mod as { ref?: unknown }).ref}`)
  } catch (e) {
    pushDyn(`❌ 加载失败：${(e as Error).message}`)
  } finally {
    dynRunning.value = false
  }
}

async function dynImportMissing() {
  dynRunning.value = true
  pushDyn('import("./not-a-real-module.ts") 开始…')
  const t0 = performance.now()
  // 用一个常量承载路径，并加 @vite-ignore：这样 Vite 不会在构建期去解析这个不存在的模块
  const missing = './not-a-real-module.ts'
  try {
    // 变量形式的 import 说明符 —— 注意：这种写法 Vite 无法在构建期静态分析，
    // 所以运行时会走浏览器的动态加载，失败时的报错文案和静态 import 不同（这正是要演示的点）
    await import(/* @vite-ignore */ missing)
    pushDyn('（意外成功）')
  } catch (e) {
    const err = e as Error
    const kind = err.message.includes('Failed to fetch dynamically imported module')
      ? '网络/文件不存在（Vite 的原生报错文案）'
      : err.name
    pushDyn(`❌ 失败类型：${kind}`)
    pushDyn(`   耗时 ${Math.round(performance.now() - t0)}ms，message = ${err.message.slice(0, 70)}…`)
    pushDyn('👉 所以路由懒加载必须配 router.onError / errorComponent，否则用户看到白屏')
  } finally {
    dynRunning.value = false
  }
}

// ==================== ② 自定义错误类 + cause ====================
class ApiError extends Error {
  readonly status: number
  readonly url: string
  constructor(message: string, status: number, url: string, options?: { cause?: unknown }) {
    // 先调 super 才能用 this；把 cause 交给标准 Error（ES2022）
    super(message, options)
    this.name = 'ApiError'
    this.status = status
    this.url = url
  }
}
class ValidationError extends Error {
  readonly fields: Record<string, string>
  constructor(fields: Record<string, string>) {
    super(`校验失败：${Object.keys(fields).join(', ')}`)
    this.name = 'ValidationError'
    this.fields = fields
  }
}

const guardResult = ref('（点按钮看结果）')
const guardRunning = ref(false)

function reportError(e: unknown): string {
  // 判别错误类型的三种姿势：instanceof / name / 结构化字段
  if (e instanceof ValidationError) return `表单错误，字段：${Object.keys(e.fields).join(', ')}`
  if (e instanceof ApiError) return `API 错误 ${e.status} @ ${e.url} → ${e.message}`
  if (e instanceof TypeError) return `类型错误（通常是代码 bug，不该给用户看）`
  if (e instanceof Error) return `其他错误：${e.name}: ${e.message}`
  return `甚至可能 throw 的不是 Error：${String(e)}`
}

async function runGuardDemo() {
  guardRunning.value = true
  guardResult.value = '运行中…'
  const lines: string[] = []
  try {
    const q = 'ok'
    // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
    if (q === 'bad') throw new Error('unreachable')
    // 场景 1：网络层错误 → 包成 ApiError，并保留原始 cause
    const t0 = performance.now()
    await (async () => {
      try {
        await new Promise((_, rej) => window.setTimeout(() => rej(new Error('Failed to fetch')), 30))
      } catch (e) {
        throw new ApiError('获取用户资料失败', 502, '/api/user/1', { cause: e })
      }
    })()
    lines.push(`不该走到这里（${Math.round(performance.now() - t0)}ms）`)
  } catch (e) {
    lines.push(`① 捕获到：${reportError(e)}`)
    if (e instanceof ApiError) {
      lines.push(`② e.name = ${e.name}（自己改的，比 instanceof 更适合跨包判断）`)
      lines.push(`③ e.cause = ${(e.cause as Error)?.message}（原始错误没丢，链式排查靠它）`)
      lines.push(`④ e.stack 第一行 = ${(e.stack ?? '').split('\n')[0]}`)
      lines.push(`⑤ Error.captureStackTrace 不是标准，标准是 new Error(msg, { cause }) 与 e.stack`)
    }
  }
  // 场景 2：表单校验错误，用结构化字段承载信息
  try {
    throw new ValidationError({ email: '格式不对', age: '必须 ≥ 18' })
  } catch (e) {
    lines.push(`⑥ ${reportError(e)}`)
    lines.push(`⑦ 自定义错误的价值：调用方能【按类型分流】，而不是解析 message 字符串`)
  }
  guardResult.value = lines.join('\n')
  guardRunning.value = false
}

// ==================== ③ 全局兜底演示 ====================
const globalLog = shallowRef<string[]>([])
const badRenderCount = ref(0)
const showBadComponent = ref(false)

function gpush(line: string) {
  globalLog.value = [`${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ${line}`, ...globalLog.value].slice(0, 8)
}

function onWindowError(ev: ErrorEvent) {
  gpush(`window.onerror：${ev.message}（来源 ${ev.filename?.split('/').pop() ?? '?'}:${ev.lineno}）`)
  ev.preventDefault() // 阻止默认的控制台打印（演示用，生产中一般交给上报）
}
function onWindowRejection(ev: PromiseRejectionEvent) {
  gpush(`unhandledrejection：${(ev.reason as Error)?.message ?? String(ev.reason)}`)
  ev.preventDefault()
}
window.addEventListener('error', onWindowError)
window.addEventListener('unhandledrejection', onWindowRejection)

function throwInEvent() {
  // 真实事件回调里抛出的错误 → 冒泡到 window.onerror（普通的 try/catch 抓不到，因为不在同一栈帧）
  window.setTimeout(() => {
    throw new Error('事件回调里抛的错（没人 catch）')
  }, 0)
  gpush('已安排一个「会在回调里抛错」的定时器，请观察下面的全局日志')
}
function rejectWithoutCatch() {
  Promise.reject(new Error('这个 Promise 没有任何 catch')) // 故意不处理
  gpush('已创建一个没有 catch 的 rejected Promise')
}
/** 组件的渲染错误：在 Vue 里会被 app.config.errorHandler 接住（main.ts 里配的） */
const BrokenCard = {
  name: 'BrokenCard',
  setup() {
    throw new Error('组件 setup 里抛出的错误（会被 Vue 的 errorHandler 接住）')
  },
  template: '<p>（永远渲染不出来）</p>',
}
function breakRender() {
  showBadComponent.value = true
  badRenderCount.value++
}

// ==================== ④ 严格模式对比 ====================
const sloppyReport = ref<string[]>([])
const strictReport = ref<string[]>([])
// @ts-expect-error 教学演示：这里故意是 TS 眼里的错误（TS2358）

type LooseFn = (this: unknown) => unknown

function collectSloppy() {
  const out: string[] = []
  // 非严格模式下的函数：this 会被【装箱】成对象，未声明赋值会创建全局变量
  const sloppy = new Function(`
    const rec = arguments[0]
    rec.push('this 的类型：' + Object.prototype.toString.call(this))
    rec.push('this 是全局对象吗：' + (this === globalThis))
    undeclaredVar = 1
    rec.push('未声明赋值 undeclaredVar 成功，globalThis.undeclaredVar = ' + globalThis.undeclaredVar)
  `) as unknown as (rec: string[]) => void
  try {
    sloppy.call(undefined, out)
  } catch (e) {
    out.push(`抛错：${(e as Error).name}: ${(e as Error).message}`)
  }
  sloppyReport.value = out
}

function collectStrict() {
  const out: string[] = []
  // 顶部加 "use strict" 之后：this 就是 undefined，未声明赋值直接 ReferenceError
  try {
    const strict = new Function(`
      "use strict"
      const rec = arguments[0]
      rec.push('this 的值：' + String(this))
      rec.push('this === undefined 吗：' + (this === undefined))
      try {
        undeclaredVar2 = 1
      } catch (e) {
        rec.push('未声明赋值抛错：' + e.name + ': ' + e.message)
      }
    `) as unknown as (rec: string[]) => void
    strict.call(undefined, out)
  } catch (e) {
    out.push(`抛错：${(e as Error).name}: ${(e as Error).message}`)
  }
  strictReport.value = out
}

// ==================== ⑤ 异步 try/catch 边界 ====================
const asyncGap = ref<string[]>([])
function runAsyncGap() {
  const lines: string[] = []
  // ① 同步 throw：能捕获
  try {
    throw new Error('同步 throw')
  } catch (e) {
    lines.push(`✅ 同步 throw 被捕获：${(e as Error).message}`)
  }
  // ② 没 await 的 rejected Promise：catch 不到
  try {
    Promise.reject(new Error('没 await 的拒绝'))
    lines.push('❌ 没 await 的 Promise.reject 没有进入 catch（它去了 unhandledrejection）')
  } catch {
    lines.push('（不会执行）')
  }
  // ③ await 之后：能捕获
  void (async () => {
    try {
      await Promise.reject(new Error('await 过的拒绝'))
      lines.push('（不会执行）')
    } catch (e) {
      lines.push(`✅ await 过的拒绝被捕获：${(e as Error).message}`)
    }
    // ④ 回调里的错误：catch 不到
    try {
      window.setTimeout(() => {
        throw new Error('定时器回调里的错')
      }, 0)
      lines.push('❌ 回调里的 throw 不会进入这个 catch（栈已经不同了）')
    } catch {
      lines.push('（不会执行）')
    }
    lines.push('👉 结论：try/catch 只覆盖「当前这段同步代码」和「被 await 的 Promise」')
    asyncGap.value = [...lines]
  })()
}

onBeforeUnmount(() => {
  window.removeEventListener('error', onWindowError)
  window.removeEventListener('unhandledrejection', onWindowRejection)
})

const globalHint = computed(() =>
  globalLog.value.length
    ? '全局兜底已经收到错误 —— 生产环境这里就是 Sentry 上报的入口'
    : '还没有错误进来，点上面的按钮制造一个',
)
</script>

<template>
  <div>
    <h1>10. 模块与错误处理</h1>
    <p class="lead">
      ESM 是<strong>静态</strong>的（import 写在顶层、编译期就能分析依赖，所以能 tree shaking），
      <code>import()</code> 是<strong>动态</strong>的（返回 Promise，用于懒加载 —— 本项目的路由就是这么做的）。
      错误处理的关键只有一句：<strong>try/catch 抓不到「没 await 的 Promise」和「回调里抛的错」</strong>，
      那部分必须靠全局兜底。
    </p>

    <!-- ============ 卡片 1：ESM 语法 ============ -->
    <JsCard
      title="① ESM 的 import / export 全量速查"
      hint="左边是能力清单，右边是「默认导出 vs 具名导出」为什么会影响 tree shaking。"
    >
      <div class="pc-grid">
        <pre class="code">// ---------- 具名导出（推荐）----------
export const PI = 3.14
export function add(a, b) { return a + b }
export class Point {}
const hidden = 1
export { hidden as renamed }          // 重命名导出

// 导入时必须用同名（或自己再改名）
import { PI, add as plus } from './math.js'
import * as math from './math.js'        // 命名空间对象
console.log(math.PI, math.default)       // 有 default 时它也在命名空间里

// ---------- 默认导出（一个模块只能一个）----------
export default function hello() {}       // 导入方可随便取名
// import whatever from './hello.js'     // 名字和导出名无关

// 同时有默认和具名
import hello, { PI as pi } from './mix.js'

// ---------- 转口（再导出）----------
export { foo } from './a.js'
export * from './b.js'                   // 转发 b 的【所有具名导出】（不含 default）
export * as ns from './c.js'             // 转成命名空间对象再导出

// ---------- 只执行副作用 ----------
import './styles/global.css'             // 没有绑定，只为执行模块代码

// ---------- 动态导入（返回 Promise）----------
const mod = await import('./heavy.js')   // 顶层 await（只在 ESM 里可用）
const { default: Comp } = await import('./Comp.vue')</pre>
        <pre class="code">// 为什么 tree shaking 偏爱「具名导出」？
// 打包器必须能【静态】看出你用了哪些名字。

// ✅ 可静态分析：没用到的 square 会被摇掉
export function add(a, b) { return a + b }
export function square(n) { return n * n }

// import { add } from './math.js'   → 只有 add 进包

// ❌ 默认导出一个对象：属性是运行时才确定的
export default {
  add(a, b) { return a + b },
  square(n) { return n * n },
}
// import math from './math.js'; math.add(1, 2)
// 打包器只能保守地把整个对象留下

// ❌ 有副作用也必须留下
console.log('模块加载时的副作用')
window.__INIT__ = true

// package.json 的 "sideEffects": false 是告诉打包器：
// 「这个包里的模块只要没被 import 就都能删」，这是库作者给下游最大的礼物。

// 顺带一提：CommonJS 的 require 是运行时求值，
// module.exports 是个普通对象 → 打包器很难判断哪个属性被用到，
// 这就是 ESM 让产物更小的根本原因（不是语法好看）。</pre>
      </div>
      <ul class="me-notes">
        <li><strong>ESM 与 CommonJS 的核心差异</strong>：ESM 的绑定是「活的引用」（导出方改了值，导入方看到新值），CommonJS 是「值的拷贝」。</li>
        <li><strong>顶层 await 只在 ESM</strong> 里合法（Node 的 .mjs / type: module、浏览器 &lt;script type="module">、Vite 的源码）。</li>
        <li>ESM 必须写完整路径（浏览器里 <code>'./a.js'</code> 不能省扩展名）；CommonJS 可以省略。</li>
        <li><strong>模块默认就是严格模式</strong>，不需要写 <code>'use strict'</code>（见 ④）。</li>
      </ul>
    </JsCard>

    <!-- ============ 卡片 2：动态 import ============ -->
    <JsCard
      title="② 动态 import()：返回 Promise 的懒加载"
      hint="点第一个按钮真的去加载 vue 模块；点第二个制造一次真实失败，看错误长什么样。"
      tone="ok"
    >
      <div class="row">
        <button class="primary" :disabled="dynRunning" @click="dynImportVue">await import('vue')</button>
        <button class="danger" :disabled="dynRunning" @click="dynImportMissing">import 一个不存在的模块</button>
        <span class="kv">成功次数：{{ dynLoaded }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ dynLog.join('\n') || '（点按钮看真实日志）' }}</pre>
      <div class="pc-grid" style="margin-top: 10px">
        <pre class="code">// 静态 import：页面一加载就下载并执行
import HeavyChart from './HeavyChart.vue'

// 动态 import：用到才下载（代码分割点）
const { default: HeavyChart } = await import('./HeavyChart.vue')

// 典型场景 1：路由懒加载（本项目 src/router/index.ts）
component: () => import('@/pages/vue/adv-perf.vue')
// 路由配置里接受「返回 Promise 的函数」，导航时才真正加载

// 典型场景 2：按需加载大依赖
async function exportExcel() {
  const XLSX = await import('xlsx')     // 只有点「导出」的用户才下载这几百 KB
  return XLSX.utils.book_new()
}</pre>
        <pre class="code">// 动态 import 的错误必须自己接住，否则就是白屏
async function safeLoad() {
  try {
    const mod = await import('./maybe-missing.js')
    return mod
  } catch (e) {
    // 常见原因：网络断开 / 部署后文件名变了（chunk hash 变化）/ 用户停留在旧版本
    console.error('模块加载失败', e)
    return null
  }
}

// Vue Router 层面的兜底（本项目已经配了）：
// router.onError((err) => console.error('[router.onError] 路由懒加载失败', err))
// 真实项目还会监听 vite:preloadError，然后提示「有新版本，刷新一下」

// 注意：import() 里如果写的是【变量】，Vite 无法预分析：
//   const p = './pages/' + name + '.vue'
//   await import(p)        // ← 打包结果不可预测，要么用 import.meta.glob，要么加 /* @vite-ignore */
// 本项目用的是 import.meta.glob('@/pages/js/*.vue') 这种「编译期就确定范围」的写法。</pre>
      </div>
    </JsCard>

    <!-- ============ 卡片 3：错误类型与自定义错误 ============ -->
    <JsCard
      title="③ 错误类型、自定义错误类与 cause"
      hint="点按钮跑一个完整的「网络错误 → 包装成 ApiError → 分流处理」流程，包含 cause 链。"
      :asserts="asserts1"
    >
      <div class="row">
        <button class="primary" :disabled="guardRunning" @click="runGuardDemo">跑一遍错误包装 + 分流处理</button>
      </div>
      <pre class="code" style="margin-top: 10px">{{ guardResult }}</pre>
      <pre class="code" style="margin-top: 10px">// 自定义错误类的标准写法（继承 Error，修 name，保留 cause）
class ApiError extends Error {
  constructor(message, status, url, options) {
    super(message, options)      // ES2022：第二个参数 { cause } 由引擎挂到 e.cause 上
    this.name = 'ApiError'       // 不改的话 e.name 会是 'Error'，日志里认不出来
    this.status = status         // 结构化字段：让上层能按状态码分流
    this.url = url
  }
}

// 使用：把底层错误「翻译」成业务错误，同时保留原始原因
try {
  await fetchUser(id)
} catch (e) {
  throw new ApiError('获取用户资料失败', 502, '/api/user', { cause: e })
}

// 上层按类型分流，而不是去解析 message 字符串
function report(e) {
  if (e instanceof ValidationError) return showFormErrors(e.fields)
  if (e instanceof ApiError) return toast(`${e.status}：${e.message}`)
  if (e instanceof TypeError) return report2Sentry(e)   // 代码 bug，用户看不懂
  throw e                                              // 不认识的错误继续往上抛
}</pre>
      <ul class="me-notes">
        <li><strong>常见错误类型</strong>：<code>Error</code>（基类）、<code>TypeError</code>（类型/调用方式不对）、<code>ReferenceError</code>（变量不存在）、<code>SyntaxError</code>（解析阶段，try/catch 抓不到 <code>eval</code> 之外的语法错误）、<code>RangeError</code>（数值越界，如 <code>new Array(-1)</code>）、<code>URIError</code>、<code>AggregateError</code>（<code>Promise.any</code> 失败时）。</li>
        <li><code>e.stack</code> 是排查主力（第一行是 message，之后是调用栈）；跨域脚本的 stack 会被裁剪成 <code>Script error.</code>，需要给 CDN 加 <code>crossorigin</code>。</li>
        <li>自定义错误时 <strong>extends Error</strong> 是必须的，否则 <code>instanceof Error</code> 为 false，全局兜底和上报工具都会漏掉它。</li>
      </ul>
    </JsCard>

    <!-- ============ 卡片 4：全局兜底 ============ -->
    <JsCard
      title="④ 全局兜底：onerror / unhandledrejection / Vue 的 errorHandler"
      hint="点按钮制造三类错误，观察日志——它们都绕过了普通的 try/catch。"
      tone="danger"
    >
      <div class="row">
        <button class="danger" @click="throwInEvent">定时器回调里 throw</button>
        <button class="danger" @click="rejectWithoutCatch">没有 catch 的 Promise.reject</button>
        <button @click="breakRender">挂载一个 setup 就抛错的组件（手动报告第 {{ badRenderCount }} 次）</button>
        <span class="kv">{{ globalHint }}</span>
      </div>
      <div class="me-broken">
        <BrokenCard v-if="showBadComponent" />
        <span v-else class="kv">
          点第三个按钮，会在下面挂载一个 render 就抛错的组件：错误会被 src/main.ts 的
          app.config.errorHandler 接住，请打开 DevTools 看 <code>[全局 errorHandler]</code> 那条日志。
        </span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ globalLog.join('\n') || '（点按钮看全局日志）' }}</pre>
      <pre class="code" style="margin-top: 10px">// ---------- 浏览器侧的三层兜底 ----------
// 1) 同步/回调里抛出的、没人接的错误（含资源加载失败、事件回调）
window.addEventListener('error', (ev) => {
  report({ type: 'window.onerror', message: ev.message, file: ev.filename, line: ev.lineno })
})

// 2) 没有 catch 的 Promise（最容易漏，占比往往最高）
window.addEventListener('unhandledrejection', (ev) => {
  report({ type: 'unhandledrejection', reason: ev.reason })
  ev.preventDefault()          // 可选：阻止控制台的默认报错
})

// 3) Vue 自己的边界（本项目 src/main.ts 里就挂了这个）
app.config.errorHandler = (err, instance, info) => {
  // info 告诉你错误发生在哪个阶段：'render' / 'setup' / 'watcher' / 'event handler'
  console.error('[vue errorHandler]', info, err)
}

// 还有两个常被忽略的：
// app.config.warnHandler          —— 处理 Vue 的 warning
// router.onError(cb)              —— 路由懒加载失败（本项目已配）</pre>
      <p class="hint" style="margin-top: 8px">
        <strong>为什么这些错误绕过了 try/catch？</strong>因为 try/catch 是<strong>词法</strong>的：
        它只能捕获「在它这块代码的调用栈里同步抛出」的错误，以及「被它 await 的 Promise 的拒绝」。
        定时器回调、事件回调、没 await 的 Promise 都是<strong>在新的栈帧里执行</strong>的，控制流早就离开了 try 块。
      </p>
      <p class="hint">
        所以真正的工程做法是：<strong>可预期的错误用 try/catch 就地处理</strong>（网络失败、校验失败），
        <strong>不可预期的交给全局兜底 + 上报</strong>（代码 bug），两者是一套组合拳。
      </p>
    </JsCard>

    <!-- ============ 卡片 5：严格模式 ============ -->
    <JsCard
      title="⑤ 严格模式：'use strict' 到底改变了什么"
      hint="两个按钮用同一段逻辑，唯一区别是有没有 'use strict'，看 this 和未声明赋值的差别。"
      tone="warn"
    >
      <div class="row">
        <button @click="collectSloppy">非严格模式跑一遍</button>
        <button class="primary" @click="collectStrict">严格模式跑一遍</button>
      </div>
      <div class="pc-grid" style="margin-top: 10px">
        <div>
          <p class="hint">非严格（sloppy）：</p>
          <pre class="code">{{ sloppyReport.join('\n') || '（点按钮）' }}</pre>
        </div>
        <div>
          <p class="hint">严格（"use strict"）：</p>
          <pre class="code">{{ strictReport.join('\n') || '（点按钮）' }}</pre>
        </div>
      </div>
      <table class="me-table" style="margin-top: 10px">
        <thead>
          <tr>
            <th>行为</th>
            <th>非严格模式</th>
            <th>严格模式</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>独立函数里的 <code>this</code></td>
            <td>全局对象（被装箱）</td>
            <td><code>undefined</code>（所以能立刻发现「this 丢了」）</td>
          </tr>
          <tr>
            <td>给未声明的变量赋值</td>
            <td>静默创建全局变量</td>
            <td>抛 <code>ReferenceError</code></td>
          </tr>
          <tr>
            <td>删除不可删除的属性</td>
            <td>静默失败（返回 false）</td>
            <td>抛 <code>TypeError</code></td>
          </tr>
          <tr>
            <td>重复的参数名 <code>function f(a, a)</code></td>
            <td>允许</td>
            <td><code>SyntaxError</code></td>
          </tr>
          <tr>
            <td>八进制字面量 <code>010</code></td>
            <td>允许（等于 8）</td>
            <td><code>SyntaxError</code></td>
          </tr>
          <tr>
            <td>给只读 / getter-only 属性赋值</td>
            <td>静默失败</td>
            <td>抛 <code>TypeError</code></td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        <strong>本项目的实际情况</strong>：所有源码都是 ESM（<code>&lt;script setup></code> / .ts 模块），
        而<strong>模块与 class 内部默认就是严格模式</strong>，
        所以 <code>'use strict'</code> 在业务代码里基本不需要手写；
        但 <code>new Function()</code> 这种动态代码默认是 sloppy，本页的演示就得手动加（JsCard 内部也是这么做的）。
      </p>
    </JsCard>

    <!-- ============ 卡片 6：异步边界 + runnable ============ -->
    <JsCard
      title="⑥ 异步代码里 try/catch 的边界（可运行验证）"
      hint="点按钮得到结论，再点下面每个 runnable 看真实输出。"
      tone="danger"
    >
      <div class="row">
        <button class="primary" @click="runAsyncGap">跑一遍边界检查</button>
      </div>
      <pre class="code" style="margin-top: 10px">{{ asyncGap.join('\n') || '（点按钮）' }}</pre>
      <div class="me-stack">
        <JsCard
          title="① 同步 throw 能抓到，Promise.reject 抓不到"
          runnable="try {
  throw new Error('同步错误')
} catch (e) {
  console.log('A 捕获同步 throw：' + e.message)
}

try {
  Promise.reject(new Error('没 await 的拒绝'))
  console.log('B 这行会执行（reject 是异步通知，不是同步抛出）')
} catch (e) {
  console.log('B 永远不会到这里 —— 它跑去了 unhandledrejection')
}

// 正确写法之一：显式返回 / await
async function ok1() {
  try {
    await Promise.reject(new Error('await 过的拒绝'))
  } catch (e) {
    console.log('C 捕获到了：' + e.message)
  }
}
ok1()

// 正确写法之二：挂在 then 的第二个参数 / catch 上
Promise.reject(new Error('链式 catch')).catch((e) => console.log('D 捕获到了：' + e.message))"
        />
        <JsCard
          title="② throw 字符串 vs throw Error，以及 finally 的执行时机"
          runnable="// 永远 throw Error 的子类：字符串没有 stack、没有类型
try {
  throw '我是一个字符串'
} catch (e) {
  console.log('A 捕获到的类型：' + typeof e + '，instanceof Error？' + (e instanceof Error))
  console.log('A 想取 stack：' + e.stack)   // undefined，排查时欲哭无泪
}

// finally：无论是否 return / throw 都会执行，且 return 也拦不住它
function demo() {
  try {
    console.log('B try 里 return 之前')
    return 'try 的返回值'
  } finally {
    console.log('C finally 一定执行（连 return 都拦不住）')
  }
}
console.log('D demo() = ' + demo())

// finally 里的 return 会【吃掉】异常 —— 这是最危险的用法
function dangerous() {
  try {
    throw new Error('本来要抛出去的错误')
  } finally {
    return 'finally 的 return 把异常吞了'
  }
}
console.log('E dangerous() = ' + dangerous() + '（没有报错！错误被静默吞掉）')"
        />
        <JsCard
          title="③ 错误的 stack 长什么样（排查靠它）"
          runnable="function inner() {
  throw new Error('出错了')
}
function outer() {
  inner()
}
try {
  outer()
} catch (e) {
  console.log(e.name + ': ' + e.message)
  console.log('stack 的第一行：' + e.stack.split('\\n')[0])
  console.log('栈帧数量：' + e.stack.split('\\n').length)
  console.log('（真实项目里这段 stack 就是 Sentry 的原始数据）')
}

// 被包装过的错误用 cause 串起来，排查时能一路看到最底层原因
try {
  try {
    JSON.parse('{坏 JSON}')
  } catch (e) {
    throw new Error('解析配置失败', { cause: e })
  }
} catch (e) {
  console.log('外层：' + e.message)
  console.log('cause：' + e.cause.name + ': ' + e.cause.message)
}"
        />
      </div>
    </JsCard>

    <!-- ============ 卡片 7：速查表 ============ -->
    <JsCard title="⑦ 速查表与常见坑" tone="danger">
      <table class="me-table">
        <thead>
          <tr>
            <th>场景</th>
            <th>正确做法</th>
            <th>错误做法（会漏错误 / 白屏）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>请求失败</td>
            <td><code>try { await api() } catch</code> 或 <code>.catch()</code></td>
            <td><code>try { api() } catch</code>（没 await）</td>
          </tr>
          <tr>
            <td>并发多个请求</td>
            <td><code>Promise.allSettled</code> + 按 status 分流</td>
            <td><code>Promise.all</code> 后不 catch，一个失败全盘皆输</td>
          </tr>
          <tr>
            <td>回调 / 定时器里的错误</td>
            <td><code>window.onerror</code> + 上报</td>
            <td>以为外层 try/catch 能兜住</td>
          </tr>
          <tr>
            <td>抛出错误</td>
            <td><code>throw new Error('...')</code> / 自定义子类</td>
            <td><code>throw '字符串'</code> / <code>throw { code: 1 }</code>（没有 stack）</td>
          </tr>
          <tr>
            <td>错误信息分层</td>
            <td>底层错误 <code>{ cause: e }</code> 包一层业务错误</td>
            <td>拼 message 字符串，把原始栈丢掉</td>
          </tr>
          <tr>
            <td><code>finally</code> 返回</td>
            <td>只做清理（关 loading、清定时器）</td>
            <td>在 finally 里 <code>return</code>，静默吞掉异常</td>
          </tr>
          <tr>
            <td>路由懒加载失败</td>
            <td><code>router.onError</code> + 提示刷新 + <code>vite:preloadError</code></td>
            <td>什么都不做，用户看到白屏且无法自救</td>
          </tr>
          <tr>
            <td>判断错误类型</td>
            <td><code>instanceof</code> 自定义类；跨包时看 <code>e.name</code>/字段</td>
            <td>用 <code>e.message.includes('xxx')</code> 判断（文案一改就崩）</td>
          </tr>
        </tbody>
      </table>
      <ul class="me-notes">
        <li>
          <strong>防御式编程小结</strong>：可预期的错误<strong>就地处理并给出可操作提示</strong>；
          不可预期的错误<strong>让程序快速失败</strong>（不要吞掉）并上报。
          用 <code>assert</code> 式断言把「不该发生的情况」显式化：
          <code>function assert(cond, msg) { if (!cond) throw new Error('断言失败：' + msg) }</code>。
        </li>
        <li>
          注意区分「断言」和「校验」：断言保护<strong>开发者</strong>（内部不变量，生产环境可以去掉），
          校验保护<strong>用户</strong>（输入边界，永远要做）。本页的 <code>JsCard</code> 里那些 ✅/❌ 就是断言。
        </li>
        <li>
          <strong>与本项目的呼应</strong>：<code>src/main.ts</code> 里的 <code>app.config.errorHandler</code> 是第 3 层兜底，
          <code>src/router/index.ts</code> 的 <code>router.onError</code> 管懒加载失败，
          <code>src/composables/index.ts</code> 的 <code>useFetch</code> 把 <code>try/catch/finally</code> 和
          「卸载后不再赋值」写在一起——这就是一页里讲的全部内容在项目里的落点。
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
.me-table {
  font-size: 12.5px;
}
.me-notes {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.8;
}
.me-notes strong {
  color: var(--c-text);
}
.me-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}
.me-broken {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px dashed var(--c-danger);
  border-radius: 8px;
  background: rgba(229, 83, 75, 0.06);
  font-size: 12.5px;
}
.me-stack :deep(.card) {
  margin-bottom: 0;
  box-shadow: none;
  border: 1px dashed var(--c-border);
}
</style>
