<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ---- 演示数据提取到此处：模板属性里不适合写长表达式（引号/花括号会被 HTML 属性语法干扰）---- */
const asserts1 = [
        { expr: 'typeof Promise.resolve(1).then', actual: typeof Promise.resolve(1).then, expected: 'function', note: 'then 是原型方法' },
        { expr: 'Promise.resolve(1) instanceof Promise', actual: Promise.resolve(1) instanceof Promise, expected: true },
        { expr: 'Promise.prototype.then === Promise.resolve(1).then', actual: Promise.prototype.then === Promise.resolve(1).then, expected: true },
        { expr: 'Promise.resolve(1).then(v => v) === Promise.resolve(1)', actual: Promise.resolve(1).then((v) => v) === Promise.resolve(1), expected: false, note: '每次 then 都返回【新的】Promise' },
        { expr: 'new Promise(r => r(1)).finally', actual: typeof new Promise((r) => r(1)).finally, expected: 'function', note: 'finally 是 ES2018 加的' },
      ]

const asserts2 = [
        { expr: 'async function f(){}; f() instanceof Promise', actual: (async function () {})() instanceof Promise, expected: true, note: '没写 return 也是 Promise<undefined>' },
        { expr: 'typeof (async () => 1)', actual: typeof (async () => 1), expected: 'function' },
        { expr: '(async () => 1)() instanceof Promise', actual: (async () => 1)() instanceof Promise, expected: true },
        { expr: 'async () => { throw new Error("x") } 的返回类型', actual: (async () => { throw new Error('x') })() instanceof Promise, expected: true, note: 'async 里的 throw = 返回 rejected Promise' },
        { expr: '(async () => await 1)() instanceof Promise', actual: (async () => await 1)() instanceof Promise, expected: true, note: 'await 不改变外面返回的是 Promise' },
      ]

/* ============================================================================
 * 7. Promise 与 async/await
 *
 * 这一页把异步的两件事分开看：
 *   ① Promise 本身（状态机 + 组合器）——「一件事的三种结局」
 *   ② async/await（语法糖 + 并发/串行）——「怎么把多件事组织起来」
 * 交互演示都走 v-for 渲染「Promise 每毫秒（10ms 粒度）的状态快照」，
 * 让你亲眼看状态从 pending 走到 fulfilled / rejected，而且只能走一次。
 * ========================================================================== */

// ==================== ① 状态机演示 ====================
interface Snapshot {
  t: number
  label: string
}
const timeline = shallowRef<Snapshot[]>([])
const isRunning = ref(false)
const log = shallowRef<string[]>([])

function push(msg: string) {
  log.value = [`${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ${msg}`, ...log.value].slice(0, 8)
}

/** 用「快照函数」在若干时间点读取一个 Promise 的可观察状态 */
function snapshot(p: Promise<unknown>, at: number[], onDone?: () => void) {
  const start = performance.now()
  const label = ref('pending')
  p.then(
    (v) => (label.value = `fulfilled(${JSON.stringify(v)})`),
    (e) => (label.value = `rejected(${(e as Error).message})`),
  ).finally(() => {
    for (const ms of at) {
      window.setTimeout(() => {
        timeline.value = [...timeline.value, { t: Math.round(performance.now() - start), label: label.value }]
      }, ms)
    }
    window.setTimeout(() => {
      timeline.value = [...timeline.value, { t: Math.round(performance.now() - start), label: label.value }]
      push(`快照结束，最终状态 = ${label.value}`)
      onDone?.()
    }, Math.max(...at) + 5)
  })
}

function showTheeState() {
  timeline.value = []
  push('开始观察 p = Promise.resolve(1)（下一轮微任务就会 fulfilled）')
  snapshot(Promise.resolve(1), [0, 1, 2], () => {})
}

function demoResolve() {
  timeline.value = []
  isRunning.value = true
  const p = new Promise<number>((resolve) => window.setTimeout(() => resolve(42), 60))
  push('p = new Promise(resolve => setTimeout(() => resolve(42), 60))')
  snapshot(p, [0, 20, 50, 90, 150], () => (isRunning.value = false))
}

function demoReject() {
  timeline.value = []
  isRunning.value = true
  const p = new Promise<number>((_, reject) => window.setTimeout(() => reject(new Error('接口 500')), 60))
  push('p = new Promise((_, reject) => setTimeout(() => reject(new Error("接口 500")), 60))')
  // 注意：这里用 p.then(...) 已经处理了拒绝，不会再有 unhandledrejection
  snapshot(p, [0, 20, 50, 90, 150], () => (isRunning.value = false))
}

/** 状态不可逆：先 resolve 再 reject，reject 完全无效（也不会产生未处理拒绝） */
function demoIrreversible() {
  timeline.value = []
  isRunning.value = true
  const p = new Promise<string>((resolve, reject) => {
    resolve('第一次就定了')
    reject(new Error('这次 reject 会被忽略'))
  })
  push('executor 里先 resolve("第一次就定了") 再 reject(new Error(...))')
  snapshot(p, [0, 5, 15], () => (isRunning.value = false))
}

/** executor 同步执行：new 的那一行就能看到同步日志 */
function demoExecutorSync() {
  log.value = []
  push('同步 begin')
  const p = new Promise<number>((resolve) => {
    push('executor 里的同步代码（我在 new 这一行就跑完了）')
    resolve(7)
  })
  push('同步 end（此时 p 已经 fulfilled，但 then 回调还没跑）')
  p.then((v) => push(`then 回调（微任务）：收到 ${v}`))
  push('then 注册之后又执行了一行同步代码')
}

// ==================== ② 链式调用日志 ====================
const chainLog = shallowRef<string[]>([])
function demoChain() {
  chainLog.value = []
  const pushChain = (s: string) => (chainLog.value = [...chainLog.value, s])

  Promise.resolve(1)
    .then((v) => {
      pushChain(`① then(v=${v}) → 返回 v+1（普通值会被 Promise.resolve 包一层）`)
      return v + 1
    })
    .then((v) => {
      pushChain(`② then(v=${v}) → 返回一个 Promise（前面的 then 会等它）`)
      return new Promise<number>((r) => window.setTimeout(() => r(v * 10), 40))
    })
    .then((v) => {
      pushChain(`③ then(v=${v}) → 抛出错误（下面最近的 catch 接住）`)
      throw new Error(`boom ${v}`)
    })
    .catch((e: Error) => {
      pushChain(`④ catch(e.message="${e.message}") → 返回一个值，链条恢复为 fulfilled`)
      return 'recovered'
    })
    .finally(() => {
      pushChain('⑤ finally()：无论成功失败都执行，不接收参数、不改结果')
    })
    .then((v) => pushChain(`⑥ 最后的 then(v=${v})，证明 catch 之后链条还能继续`))
}

// ==================== ③ 组合器演示 ====================
const comboTab = ref<'all' | 'allSettled' | 'race' | 'any'>('all')
const comboResult = ref('（点上面按钮跑一次）')
const comboRunning = ref(false)

/** 三个固定任务的 promise 工厂：慢成功 / 快成功 / 必失败 */
function tasks() {
  const ok = (v: string, ms: number) => new Promise<string>((r) => window.setTimeout(() => r(v), ms))
  const bad = (msg: string, ms: number) => new Promise<string>((_, j) => window.setTimeout(() => j(new Error(msg)), ms))
  return { slow: () => ok('slow', 90), fast: () => ok('fast', 20), fail: () => bad('fail', 40) }
}

async function runCombo(kind: typeof comboTab.value) {
  comboTab.value = kind
  comboRunning.value = true
  comboResult.value = '运行中…（注意：失败的那个任务即使没被用到也已经开始了）'
  const t = tasks()
  try {
    if (kind === 'all') {
      comboResult.value = `Promise.all → ${JSON.stringify(await Promise.all([t.slow(), t.fast(), t.fail()]))}`
    } else if (kind === 'allSettled') {
      const r = await Promise.allSettled([t.slow(), t.fast(), t.fail()])
      comboResult.value = `Promise.allSettled → ${r.map((x) => (x.status === 'fulfilled' ? `✅${x.value}` : `❌${x.reason.message}`)).join(' , ')}（永不 reject）`
    } else if (kind === 'race') {
      comboResult.value = `Promise.race → ${JSON.stringify(await Promise.race([t.slow(), t.fast(), t.fail()]))}（第一个【settled】的说了算）`
    } else {
      comboResult.value = `Promise.any → ${JSON.stringify(await Promise.any([t.slow(), t.fast(), t.fail()]))}（第一个【 fulfilled】的说了算）`
    }
  } catch (e) {
    const err = e as Error
    comboResult.value = `${kind} 抛出了错误：${err.name}: ${err.message}${
      err instanceof AggregateError ? `，errors=[${err.errors.map((x: Error) => x.message).join(', ')}]` : ''
    }`
  } finally {
    comboRunning.value = false
  }
}

// ==================== ④ 并发 vs 串行：真实耗时 ====================
const seqMs = ref<number | null>(null)
const parMs = ref<number | null>(null)
const seqLog = shallowRef<string[]>([])
const racing = ref(false)

function delay(ms: number, v: string, fail = false) {
  return new Promise<string>((res, rej) =>
    window.setTimeout(() => (fail ? rej(new Error(`任务 ${v} 失败`)) : res(`任务 ${v} 成功`)), ms),
  )
}

async function runSerial() {
  const t0 = performance.now()
  const out: string[] = []
  for (const ms of [80, 80, 80]) {
    out.push(await delay(ms, `${ms}ms`)) // 每一次都「等完再开下一个」
  }
  seqMs.value = Math.round(performance.now() - t0)
  seqLog.value = out
}

async function runParallel() {
  const t0 = performance.now()
  const out = await Promise.all([delay(80, '80ms#1'), delay(80, '80ms#2'), delay(80, '80ms#3')])
  parMs.value = Math.round(performance.now() - t0)
  seqLog.value = out
}

/** 只要一个失败，all 立刻整体失败 —— 但其余任务仍在后台跑完（不会取消） */
async function runAllFail() {
  const t0 = performance.now()
  try {
    await Promise.all([delay(60, 'A'), delay(20, 'B', true), delay(120, 'C')])
  } catch (e) {
    seqLog.value = [`Promise.all 在 ${Math.round(performance.now() - t0)}ms 就抛错了：${(e as Error).message}`]
    seqLog.value = [...seqLog.value, '注意：A / C 并没有被取消，它们还在跑（Promise 没有「取消」这个能力）']
    return
  }
}

// ==================== ⑤ 统一错误处理（含竞态） ====================
const raceQuery = ref('vue')
const raceStatus = ref('（待请求）')
const raceLog = shallowRef<string[]>([])
let reqId = 0
const destroyed = ref(false)

/** 全局兜底：捕获「忘了 catch」的 promise（与第 10 页的 unhandledrejection 呼应） */
function onUnhandled(ev: PromiseRejectionEvent) {
  push(`⚠️ unhandledrejection：${(ev.reason as Error)?.message ?? ev.reason}`)
}
window.addEventListener('unhandledrejection', onUnhandled)

/** 故意制造一个没人 catch 的 promise，让上面的兜底日志说话 */
function fireAndForget() {
  push('发起一个没有 catch 的请求（真实项目里这就是白屏事故的源头）')
  delay(30, 'X', true) // ← 没有 .catch / await / return
}

async function requestWithGuard(q: string) {
  const id = ++reqId
  destroyed.value = false
  raceStatus.value = `#${id} 请求中…(${q})`
  try {
    await delay(id === 1 || q.length >= 3 ? 220 : 60, q)
    // 竞态守卫：只有「我还是最新一次请求」才允许写入结果
    if (destroyed.value || id !== reqId) throw new Error('stale')
    raceStatus.value = `#${id} 成功：${q}`
    raceLog.value = [`#${id} 写入结果`, ...raceLog.value].slice(0, 5)
  } catch (e) {
    const msg = (e as Error).message
    if (msg === 'stale') {
      raceLog.value = [`#${id} 过期响应被丢弃（不是错误，是竞态）`, ...raceLog.value].slice(0, 5)
      return
    }
    raceStatus.value = `#${id} 失败：${msg}`
    raceLog.value = [`#${id} 失败：${msg}`, ...raceLog.value].slice(0, 5)
  }
}

/** 旧请求还没回来就发新请求：模拟「快速输入」 */
function fireRace() {
  racing.value = true
  void requestWithGuard('旧请求').finally(() => (racing.value = false))
  window.setTimeout(() => void requestWithGuard('新请求'), 40)
  push('连续发起两个请求：旧请求慢（220ms）→ 新请求快（60ms）→ 旧请求回来时已被丢弃')
}

onBeforeUnmount(() => {
  window.removeEventListener('unhandledrejection', onUnhandled)
  // 组件卸载后不允许再写入状态（真实项目的 requestWithGuard 都带这一条）
  destroyed.value = true
  reqId++
})

const verdict = computed(() =>
  seqMs.value === null || parMs.value === null
    ? '先点上面两个按钮，对比耗时'
    : `串行 ${seqMs.value}ms vs 并发 ${parMs.value}ms（省下约 ${seqMs.value - parMs.value}ms）`,
)
</script>

<template>
  <div>
    <h1>7. Promise 与 async/await</h1>
    <p class="lead">
      <strong>Promise 是一个「只能敲定一次」的状态机（pending → fulfilled / rejected），</strong>
      async/await 只是它的语法糖；真正决定项目性能的，是<strong>你把多个 await 写成了串行还是并发</strong>。
      三件事一定要分清：<code>all</code>（全成功才算成功）、<code>allSettled</code>（全都有结果）、
      <code>race</code>（第一个敲定的）、<code>any</code>（第一个成功的）。
    </p>

    <!-- ============ 卡片 1：状态机 ============ -->
    <JsCard
      title="① Promise 的三种状态与不可逆性"
      hint="点按钮观察快照：pending 可以停留很久，但一旦 fulfilled / rejected 就永远定型，之后的 resolve/reject 全部无效。"
    >
      <div class="row">
        <button class="primary" :disabled="isRunning" @click="demoResolve">new Promise → 60ms 后 resolve(42)</button>
        <button class="danger" :disabled="isRunning" @click="demoReject">new Promise → 60ms 后 reject(Error)</button>
        <button :disabled="isRunning" @click="demoIrreversible">先 resolve 再 reject（不逆）</button>
        <button :disabled="isRunning" @click="showTheeState">Promise.resolve(1) 的即时状态</button>
      </div>
      <table class="ap-table" style="margin-top: 10px">
        <thead>
          <tr>
            <th>观察时刻</th>
            <th>读到的状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in timeline" :key="i">
            <td>{{ s.t }} ms</td>
            <td><code>{{ s.label }}</code></td>
          </tr>
          <tr v-if="!timeline.length">
            <td colspan="2">（点上面的按钮开始采样）</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        状态读法：<code>p.then</code> 里能拿到值 = fulfilled；<code>p.catch</code> 里能拿到错误 = rejected；
        两个都不走 = 还停在 pending。<strong>没有同步 API 能读 Promise 的状态</strong>（这正是它「不可窥探」的设计）。
      </p>
      <ul class="ap-notes">
        <li>pending：还没敲定，可以无限久（网络差的时候能停几十秒）。</li>
        <li>fulfilled：成功，带一个 value；rejected：失败，带一个 reason（通常是 Error）。</li>
        <li>
          <strong>不可逆</strong>：executor 里写两次 <code>resolve</code>、先 resolve 后 reject，第二次及以后的调用都是空操作。
        </li>
        <li>Promise 内部如果抛异常，等于自动 reject（所以 executor 里不用手写 try/catch 包自己）。</li>
      </ul>
      <pre class="code" style="margin-top: 10px">const p = new Promise((resolve, reject) => {
  resolve('第一次就定了')
  reject(new Error('会被忽略'))   // ← 状态已锁定，这行没有任何效果
})</pre>
    </JsCard>

    <!-- ============ 卡片 2：executor 同步执行 + then/catch/finally ============ -->
    <JsCard
      title="② executor 是同步的，then 回调是异步的"
      hint="最容易记混的一点：new Promise(fn) 里的 fn 立刻执行；而 then/catch/finally 的回调永远晚于当前同步代码（微任务）。"
      :asserts="asserts1"
    >
      <div class="row">
        <button class="primary" @click="demoExecutorSync">打印「executor 同步 / then 异步」的顺序日志</button>
        <button @click="demoChain">跑一遍 then → then → then → catch → finally 链</button>
      </div>
      <div class="grid2" style="margin-top: 10px">
        <div>
          <p class="hint">顺序日志：</p>
          <pre class="code">{{ log.join('\n') || '（点按钮产生日志）' }}</pre>
        </div>
        <div>
          <p class="hint">链式调用日志（每一步都等上一步）：</p>
          <pre class="code">{{ chainLog.join('\n') || '（点上面第二个按钮）' }}</pre>
        </div>
      </div>
      <ul class="ap-notes">
        <li><strong>返回值穿透</strong>：<code>.then(v => v)</code> 什么都返回就穿透原值；返回普通值会被包成 resolved Promise；返回 Promise 则会「等它」。</li>
        <li><strong>错误穿透</strong>：中途 throw / reject 会一路跳到最近的 <code>.catch</code>，中间的 then 直接被跳过。</li>
        <li><code>.finally(fn)</code> 不接收参数、不改结果，适合关 loading、清定时器；<code>fn</code> 里 return 的 Promise 会被等待。</li>
        <li>链尾没有 <code>catch</code> 且发生拒绝 → 浏览器报 <code>UnhandledPromiseRejection</code>（见 ⑤ 的兜底）。</li>
      </ul>
    </JsCard>

    <!-- ============ 卡片 3：四个组合器 ============ -->
    <JsCard
      title="③ all / allSettled / race / any 的差异（可现场验证）"
      hint="三个任务固定：slow(90ms 成功) / fast(20ms 成功) / fail(40ms 失败)。逐个点，看返回值和抛错分别是什么。"
      tone="ok"
    >
      <div class="row">
        <button :class="{ primary: comboTab === 'all' }" :disabled="comboRunning" @click="runCombo('all')">Promise.all</button>
        <button :class="{ primary: comboTab === 'allSettled' }" :disabled="comboRunning" @click="runCombo('allSettled')">Promise.allSettled</button>
        <button :class="{ primary: comboTab === 'race' }" :disabled="comboRunning" @click="runCombo('race')">Promise.race</button>
        <button :class="{ primary: comboTab === 'any' }" :disabled="comboRunning" @click="runCombo('any')">Promise.any</button>
      </div>
      <pre class="code ap-result">{{ comboResult }}</pre>
      <table class="ap-table" style="margin-top: 10px">
        <thead>
          <tr>
            <th>方法</th>
            <th>什么时候决定结果</th>
            <th>返回值</th>
            <th>失败条件</th>
            <th>典型用途</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>all</code></td>
            <td>全部 fulfilled</td>
            <td>值的数组，<strong>顺序与传入顺序一致</strong>（不是完成顺序）</td>
            <td>任意一个 rejected → 整体立刻 rejected</td>
            <td>首屏要一次拿齐的多个接口（少一个就渲染不了）</td>
          </tr>
          <tr>
            <td><code>allSettled</code></td>
            <td>全部敲定（无论成败）</td>
            <td><code>[{status:'fulfilled',value}, {status:'rejected',reason}]</code></td>
            <td><strong>永远不 reject</strong></td>
            <td>批量操作/部分容错：失败的单独提示，成功的照常用</td>
          </tr>
          <tr>
            <td><code>race</code></td>
            <td>第一个 settled（成功或失败都算）</td>
            <td>那一个的结果或错误</td>
            <td>第一个敲定的是 rejected</td>
            <td>超时控制（和 withTimeout 配合）、多镜像取最快</td>
          </tr>
          <tr>
            <td><code>any</code></td>
            <td>第一个 fulfilled</td>
            <td>第一个成功的值</td>
            <td>全部失败 → <code>AggregateError</code>（<code>.errors</code> 是错误数组）</td>
            <td>多源兜底：只要有一个源能用就行</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        共同点：<strong>数组里的 Promise 在你调用方法之前就已经全部启动了</strong>，
        <code>all</code> 提前失败也不会取消其余任务（Promise 没有取消能力，要取消得用 AbortController）。
      </p>
    </JsCard>

    <!-- ============ 卡片 4：async/await 的本质 ============ -->
    <JsCard
      title="④ async 函数总是返回 Promise，await 等于 then + 展开"
      hint="await 做的事：把后面表达式的值用 Promise.resolve 包一层，等它敲定；成功时「展开」出值，失败时把错误抛在当前这一行。"
      :asserts="asserts2"
      code="// 等价改写：async/await 与 then 是同一件事
async function getUser(id) {
  const res = await fetch(`/api/user/${id}`)   // = fetch(...).then(res => ...)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)  // = return Promise.reject(...)
  return res.json()                                  // return 值会成为外层 Promise 的 value
}

// 上面这段完全等价于：
function getUser2(id) {
  return fetch(`/api/user/${id}`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
}"
    >
      <ul class="ap-notes">
        <li><strong>async 一定返回 Promise</strong>：return 普通值会被包起来；throw 等于 reject。</li>
        <li><strong>await 只能用在 async 函数或 ESM 顶层</strong>（顶层 await 见第 10 页）。</li>
        <li><code>await</code> 只在<strong>成功路径</strong>是「取值」；<strong>失败路径</strong>是把错误 throw 到当前行，所以才需要 try/catch。</li>
        <li>await 一个「非 Promise 值」也合法：<code>await 1</code> 就是 <code>Promise.resolve(1)</code>，但会多让出一轮微任务。</li>
        <li>面试常考：<code>async</code> 函数里 <code>return await p</code> 和 <code>return p</code> 在外面看结果一样，但前者多一次微任务、并且能在这里被 try/catch 捕获（项目里通常直接 <code>return p</code>）。</li>
      </ul>
      <p class="hint" style="margin-top: 8px">
        <code>try/catch</code> 只能捕获 <strong>被 await 的那个 Promise</strong> 的拒绝。下面这段是经典漏网之鱼：
      </p>
      <pre class="code" style="margin-top: 6px">try {
  fetch('/api')            // ← 没有 await！错误不会抛在这里
  setTimeout(() => { throw new Error('定时器里的错') }, 0)  // ← 也不在这里
  Promise.reject(new Error('没 await 的拒绝'))               // ← 也不在这里
} catch (e) {
  // 只有「await 过的 Promise 被拒绝」或「同步 throw」才会进这里
  console.log('catch 到：', e)
}</pre>
    </JsCard>

    <!-- ============ 卡片 5：并发 vs 串行 ============ -->
    <JsCard
      title="⑤ 并发 vs 串行：await 写在循环里到底有多慢"
      hint="三个「各 80ms」的请求：循环里 await = 240ms+；Promise.all = 80ms+。项目里这一处写法差别就是首屏时间。"
      tone="warn"
    >
      <div class="row">
        <button class="danger" @click="runSerial">串行：for 循环里 await（慢）</button>
        <button class="primary" @click="runParallel">并发：Promise.all（快）</button>
        <button @click="runAllFail">all 里有一个失败会怎样</button>
      </div>
      <p class="kv" style="margin-top: 10px">{{ verdict }}</p>
      <pre class="code" style="margin-top: 10px">{{ seqLog.join('\n') || '（点上面按钮看结果）' }}</pre>
      <div class="ap-two">
        <pre class="code">// ❌ 串行：三次请求首尾相接，总耗时 = 80+80+80
const out = []
for (const id of [1, 2, 3]) {
  out.push(await api(id))       // 每次都等完才开下一个
}

// ✅ 并发：三个请求同时发出，总耗时 ≈ max(80,80,80)
const out = await Promise.all([api(1), api(2), api(3)])</pre>
        <pre class="code">// 但并发不是无脑用：这两处【必须】串行
// 1) 后一个依赖前一个的结果
const user = await api('/user')
const orders = await api(`/orders?uid=${user.id}`)

// 2) 有顺序/限流的写操作（先建后删）
await api('/create'); await api('/delete')

// 需要限流时用并发控制（见下一张卡片）</pre>
      </div>
      <p class="hint" style="margin-top: 8px">
        <code>for await (const x of asyncIterable)</code> 也是串行的；反过来，
        <code>arr.map(async fn)</code> 会立刻并发，但返回的是 <code>Promise[]</code>，
        要配合 <code>Promise.all</code> 才等得到结果（忘了包 all 是新手最常犯的错）。
      </p>
    </JsCard>

    <!-- ============ 卡片 6：错误处理最佳实践 + 并发控制 ============ -->
    <JsCard
      title="⑥ 错误处理最佳实践与并发控制（withTimeout）"
      hint="点按钮：先制造一个「没人 catch」的 Promise 看全局兜底，再模拟「旧请求回来晚了」的竞态。"
      tone="warn"
    >
      <div class="row">
        <button @click="fireAndForget">发起一个没有 catch 的请求</button>
        <button class="primary" :disabled="racing" @click="fireRace">模拟竞态：旧请求回来晚了</button>
        <input v-model="raceQuery" placeholder="输入关键字（≥3 个字会走慢请求）" />
        <span class="tag" :class="racing ? 'warn' : 'info'">{{ raceStatus }}</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ raceLog.join('\n') || '（点按钮查看：过期响应如何被丢弃）' }}</pre>
      <p class="hint" style="margin-top: 8px">
        统一兜底的三层：① 每个请求自己 <code>try/catch</code> 并转成用户能懂的错误；
        ② 兜不住的交给 <code>window.addEventListener('unhandledrejection')</code> 上报（真实项目还会上报 Sentry）；
        ③ 组件层不再各自处理，错误状态集中渲染。第 10 页会把这三层展开。
      </p>
      <pre class="code" style="margin-top: 10px">/**
 * withTimeout：给任意 Promise 加超时。思路 = Promise.race(p, 定时炸弹)
 * 关键是【清理定时器】，否则请求成功后定时器还在跑（虽然不致命，但属于坏习惯）。
 */
function withTimeout(promise, ms, label = '请求') {
  let timer
  const bomb = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}超时（${ms}ms）`)), ms)
  })
  // finally 保证无论成败都清掉定时器
  return Promise.race([promise, bomb]).finally(() => clearTimeout(timer))
}

// 用法（真实项目里还要配合 AbortController 真正取消请求）
const data = await withTimeout(fetch('/api/slow').then((r) => r.json()), 3000)</pre>
      <pre class="code" style="margin-top: 10px">/**
 * withTimeout 的两个细节：
 *  1) 用 Promise.race 而不是「包一层 new Promise」，这样原始 promise 的 resolve 值原样透出；
 *  2) .finally(clearTimeout) 不能省 —— 否则「先成功」的情况会留下一个悬空定时器。
 *     反向验证：把 finally 去掉，在超时分支里手动 clearTimeout，效果一样但容易漏。
 *
 * 如果要「限制同时并发数」（比如一次最多 5 个请求），思路是：
 *  用一个 set 保存正在跑的任务 + 一个等待队列，
 *  每完成一个就从队列头部取下一个补位（这就是 p-limit 这类库的全部原理）。
 */</pre>
      <p class="hint" style="margin-top: 8px">
        <strong>项目天天用</strong>：本项目 <code>src/composables/index.ts</code> 的 <code>useFetch</code>
        就是「统一 catch + finally 关 loading + 卸载后不再赋值（防竞态）」的标准形态，
        可以打开对照着看。
      </p>
    </JsCard>

    <JsCard title="⑦ 速查表与常见坑" tone="danger">
      <table class="ap-table">
        <thead>
          <tr>
            <th>写法</th>
            <th>会发生什么</th>
            <th>正确姿势</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>arr.map(async (x) => await f(x))</code></td>
            <td>拿到的是 <code>Promise[]</code>，不 await 就等于没等</td>
            <td><code>await Promise.all(arr.map(...))</code></td>
          </tr>
          <tr>
            <td><code>try { fetch() } catch</code></td>
            <td>没 await，网络错误根本进不了 catch</td>
            <td><code>await fetch()</code>，或 <code>.catch()</code></td>
          </tr>
          <tr>
            <td><code>new Promise(async (resolve) => {...})</code></td>
            <td>async executor 里的错误会被吞掉（不会 reject 外层）</td>
            <td>executor 里不要用 async；直接 <code>async function</code></td>
          </tr>
          <tr>
            <td><code>p.then(fn)</code> 后 <code>fn</code> 里 throw</td>
            <td>不会消失，而是变成新 Promise 的拒绝</td>
            <td>链尾补 <code>.catch()</code></td>
          </tr>
          <tr>
            <td><code>await</code> 写在 for 循环里</td>
            <td>退化成串行，耗时相加</td>
            <td>无依赖就用 <code>Promise.all</code></td>
          </tr>
          <tr>
            <td><code>Promise.all([...])</code> 用于「部分失败可接受」</td>
            <td>一个失败全盘皆输，其他结果拿不到</td>
            <td>换成 <code>allSettled</code> 并逐个判 status</td>
          </tr>
          <tr>
            <td><code>Promise.race</code> 当超时用但不清定时器</td>
            <td>请求早已成功，定时器仍在计时</td>
            <td><code>.finally(() => clearTimeout(t))</code></td>
          </tr>
          <tr>
            <td>快速切换参数时后发请求先返回</td>
            <td>旧响应覆盖新结果（竞态）</td>
            <td>请求序号守卫 / <code>AbortController</code>（见 ⑥）</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 10px">
        一句话总结：<strong>Promise 负责「一件事的三种结局」，组合器负责「多件事怎么合」，async/await 负责「怎么写得像同步」，
        而 try/catch 只管得住被 await 的那一个。</strong>
      </p>
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
.ap-table {
  font-size: 12.5px;
}
.ap-notes {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.75;
}
.ap-notes li {
  margin-bottom: 4px;
}
.ap-notes strong {
  color: var(--c-text);
}
.ap-result {
  margin-top: 10px;
  background: #1f2430;
}
.ap-two {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
  margin-top: 10px;
}
</style>
