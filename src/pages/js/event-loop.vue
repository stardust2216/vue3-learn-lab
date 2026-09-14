<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 8. 事件循环与微任务
 *
 * 这一页的核心目标：让「执行顺序」看得见。
 *  · 交互：按顺序点按钮排队任务，右边日志就是真实的执行顺序；
 *  · runnable：直接跑经典题，亲眼看输出；
 *  · 顺序规则只有两条：
 *      1) 同步代码跑完 → 清空【所有】微任务 → 取【一个】宏任务 → 再清空微任务 …
 *      2) 微任务优先级恒高于宏任务；微任务里再产生微任务，会在同一轮里被全部跑完。
 * ========================================================================== */

// ==================== ① 交互式任务队列 ====================
interface LogItem {
  tag: string
  text: string
}
const liveLog = shallowRef<LogItem[]>([])
const pending = ref(0)
let seq = 0

function write(tag: string, text: string) {
  liveLog.value = [...liveLog.value, { tag, text: text || `#${++seq}` }].slice(-14)
}

function addSync() {
  const n = ++seq
  write('sync', `同步代码 #${n}（立刻执行）`)
}
function addMicro(fn: 'then' | 'queue') {
  const n = ++seq
  pending.value++
  const done = () => {
    write('micro', `微任务 #${n}（${fn === 'then' ? 'Promise.then' : 'queueMicrotask'}）`)
    pending.value--
  }
  if (fn === 'then') Promise.resolve().then(done)
  else queueMicrotask(done)
}
function addMacro(fn: 'timeout' | 'message') {
  const n = ++seq
  pending.value++
  const done = () => {
    write('macro', `宏任务 #${n}（${fn === 'timeout' ? 'setTimeout 0' : 'MessageChannel'}）`)
    pending.value--
  }
  if (fn === 'timeout') window.setTimeout(done, 0)
  else {
    const ch = new MessageChannel()
    ch.port1.onmessage = () => {
      done()
      ch.port1.close()
    }
    ch.port2.postMessage(null)
  }
}
function clearLog() {
  liveLog.value = []
  seq = 0
  pending.value = 0
}

// ==================== ② await 与 then 的等价（真实日志） ====================
const orderLog = ref<string[]>([])
const comparing = ref(false)
function record(hero: string) {
  return (label: string) => {
    orderLog.value = [...orderLog.value, `${hero} ${label}`]
  }
}
function runCompare() {
  orderLog.value = []
  comparing.value = true
  const a = record('A(await)')
  const b = record('B(then)')

  a('① 同步：asyncA 开始')
  b('① 同步：thenB 开始')

  // A：await 之后 = 微任务；注意这里用的 await Promise.resolve()，
  //    和下面的 Promise.resolve().then 是【完全一样】的机制，只是写法不同
  void (async function asyncA() {
    a('② await 之前（同步部分）')
    await Promise.resolve()
    a('③ await 之后（微任务）')
    await Promise.resolve()
    a('⑤ 第二个 await 之后（又一个微任务）')
  })()

  // B：then 链，注册时机与 A 的 await 完全对应
  Promise.resolve()
    .then(() => b('③ then 回调（微任务）'))
    .then(() => b('⑤ 第二个 then（微任务）'))

  a('② 同步结束（此刻微任务队列里有两个任务：A 的 await 续体、B 的 then 回调）')
  window.setTimeout(() => {
    record('C(setTimeout)')('⑥ 宏任务：到这里说明所有微任务都清空了')
    comparing.value = false
  }, 0)
}

// ==================== ③ 微任务饿死渲染 ====================
const starveCount = ref(0)
const starvePhase = ref('空闲')
const starvePasses = ref(0)
const barWidth = ref(0)

function syncBlock() {
  // 纯同步长任务：主线程被占满，下面的进度条【一次都不会重绘】
  starvePasses.value = 0
  const t0 = performance.now()
  for (let i = 0; i < 12_000_000; i++) {
    // 故意什么都不做，只吃 CPU
  }
  starvePasses.value = Math.round(performance.now() - t0)
  starvePhase.value = `同步阻塞结束（约 ${starvePasses.value}ms），期间页面完全无响应`
}

function yieldToBrowser() {
  const t0 = performance.now()
  while (performance.now() - t0 < 30) {
    /* 每片只忙 30ms */
  }
}

function microStarve() {
  starvePhase.value = '微任务饥饿中：日志已经在涨，但进度条不会动'
  const start = performance.now()
  const bomb = () => {
    if (performance.now() - start < 800) {
      starveCount.value++
      queueMicrotask(bomb) // 微任务里再造微任务 → 渲染永远轮不上
    } else {
      starvePhase.value = `微任务饥饿结束（${starveCount.value} 轮），现在才轮到渲染/定时器`
    }
  }
  queueMicrotask(bomb)
}

function sliceTask() {
  starvePhase.value = '分片执行中（每片 30ms，片与片之间让出主线程）'
  barWidth.value = 0
  starveCount.value = 0
  const total = 6
  let i = 0
  const next = () => {
    if (i >= total) {
      starvePhase.value = '分片完成：6 片之间浏览器都能插空渲染 / 响应点击'
      return
    }
    i++
    starveCount.value = i
    barWidth.value = Math.round((i / total) * 100)
    yieldToBrowser() // 本片只忙 30ms
    window.setTimeout(next, 0) // 让出一轮宏任务，浏览器有机会绘制
  }
  next()
}

onBeforeUnmount(() => {
  starvePhase.value = '已离开页面'
})
</script>

<template>
  <div>
    <h1>8. 事件循环与微任务</h1>
    <p class="lead">
      执行顺序只有一条主规则：<strong>同步代码 → 清空所有微任务 → 取一个宏任务 → 再清空所有微任务 → …</strong>。
      所以 「Promise.then 永远早于 setTimeout」；而 <code>await x</code> 后面的代码<strong>就是写在 then 回调里的代码</strong>。
      点下面的按钮亲手排队，看日志里的真实顺序。
    </p>

    <!-- ============ 卡片 1：交互式队列 ============ -->
    <JsCard
      title="① 亲手排队：同步 / 微任务 / 宏任务"
      hint="随便点（可以连点几个再点同步），日志按真实执行顺序追加，颜色就是任务类型。"
      tone="ok"
    >
      <div class="row">
        <button class="primary" @click="addSync">+ 同步代码</button>
        <button @click="addMicro('then')">+ Promise.then（微）</button>
        <button @click="addMicro('queue')">+ queueMicrotask（微）</button>
        <button @click="addMacro('timeout')">+ setTimeout 0（宏）</button>
        <button @click="addMacro('message')">+ MessageChannel（宏）</button>
        <button class="danger" @click="clearLog">清空</button>
        <span class="kv">已排队未执行：{{ pending }}</span>
      </div>
      <ul class="el-log" style="margin-top: 10px">
        <li v-for="(l, i) in liveLog" :key="i" :class="'el-' + l.tag">
          <span class="el-badge">{{ l.tag }}</span>{{ l.text }}
        </li>
        <li v-if="!liveLog.length" class="el-empty">（还没有日志）</li>
      </ul>
      <p class="hint" style="margin-top: 8px">
        观察三件事：① 点「同步代码」永远立刻出现；② 连点 5 个微任务再点 1 个宏任务，
        宏任务一定排在所有微任务后面；③ 点完一批按钮后不再操作，你会看到 pending 逐渐归零。
      </p>
      <table class="el-table" style="margin-top: 10px">
        <thead>
          <tr>
            <th>队列</th>
            <th>成员</th>
            <th>一轮里处理几个</th>
            <th>谁先执行</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>调用栈 call stack</td>
            <td>当前正在执行的同步函数</td>
            <td>—</td>
            <td>最优先（同步代码不走队列）</td>
          </tr>
          <tr>
            <td>微任务 microtask</td>
            <td>Promise.then/catch/finally、await 之后的代码、queueMicrotask、MutationObserver</td>
            <td><strong>全部</strong>（清空为止，包括新加的）</td>
            <td>每轮宏任务之后、渲染之前</td>
          </tr>
          <tr>
            <td>宏任务 macrotask</td>
            <td>setTimeout/setInterval、MessageChannel、I/O、用户交互回调</td>
            <td>每轮<strong>只取一个</strong></td>
            <td>微任务全部清空之后</td>
          </tr>
          <tr>
            <td>渲染 render</td>
            <td>样式计算 / 布局 / 绘制</td>
            <td>由浏览器决定（大约 60Hz 一次）</td>
            <td>微任务清空后、下一个宏任务前</td>
          </tr>
        </tbody>
      </table>
    </JsCard>

    <!-- ============ 卡片 2：执行顺序经典题 ============ -->
    <JsCard
      title="② 执行顺序经典题（点「运行」看真实输出）"
      hint="面试出现频率最高的题：同步 → 微任务 → 宏任务。先自己猜顺序，再点运行对答案。"
    >
      <div class="row">
        <span class="kv">交互版（每行都标了它属于哪一类）：</span>
        <button class="primary" :disabled="comparing" @click="runCompare">运行 A/B 对照</button>
      </div>
      <pre class="code" style="margin-top: 10px">{{ orderLog.join('\n') || '（点按钮：A 组用 await，B 组用 then，看它们的节奏是否一致）' }}</pre>
      <p class="hint" style="margin-top: 8px">
        结论：<strong>A(await) 和 B(then) 完全同节奏地交错出现</strong>——
        因为它们都是微任务，按「注册顺序」排队，谁也没有特权；<code>a()</code> 先注册就先进队列，
        B 的 <code>.then()</code> 后注册就排在后面。<code>await x</code> 就是
        <code>x.then(后面的代码)</code> 的语法糖，这一点在输出顺序上被直接证明了。
      </p>
      <JsCard
        title="只读题面：先猜顺序，再看注释里的答案"
        hint="同一套规则的另一道题：这一次 await 出现在 Promise.then 之前，注意队列顺序的变化。"
        tone="default"
        code="console.log('1 同步开始')

setTimeout(() =&gt; console.log('2 setTimeout（宏任务）'), 0)

Promise.resolve().then(() =&gt; console.log('3 then（微任务）'))

queueMicrotask(() =&gt; console.log('4 queueMicrotask（微任务）'))

;(async () =&gt; &#123;
  console.log('5 async 函数体前半段（同步！）')
  await null                                  // ← 这一句在同步阶段执行，续体入队
  console.log('6 await 之后（微任务）')
&#125;)()

console.log('7 同步结束')

/* 真实输出顺序：
   1 同步开始
   5 async 函数体前半段（同步！）   ← async 函数在【被调用的那一刻】同步执行到第一个 await
   7 同步结束
   6 await 之后（微任务）           ← 【先入队先执行】await 的续体比下面的 then 先注册
   3 then（微任务）
   4 queueMicrotask（微任务）
   2 setTimeout（宏任务）           ← 微任务全部清空后才轮到宏任务
*/"
      />
    </JsCard>

    <!-- ============ 卡片 3：可运行实验 ============ -->
    <JsCard
      title="③ 可运行实验：三道必考题现场验证"
      hint="下面每一段都是独立可运行片段（new Function 里没有顶层 await、没有 import）。点「运行」看输出。"
      tone="ok"
    >
      <div class="el-stack">
        <div class="el-item">
          <p class="hint">实验 1：async 函数体是同步执行的，await 之后才是微任务</p>
          <JsCard
            title="① 完整顺序：1 → A → 2 → D → E → C → F"
            runnable="async function boom() &#123;
  console.log('A 进入 async 函数（同步执行到这里）')
  await null                                  // 这一句执行时，续体【立刻】入微任务队列
  console.log('D await 之后（微任务）')
  await null
  console.log('E 再一个 await 之后（微任务）')
&#125;

console.log('1 同步开始')
boom()                                        // 调用只启动它，不会等到结束
Promise.resolve().then(() => console.log('C then 微任务'))
setTimeout(() => console.log('F setTimeout 宏任务'), 0)
console.log('2 同步结束')

// 真实顺序：1 → A → 2 → D → E → C → F
// 关键点一：'A' 在同步阶段就打印，说明 async 函数不是「整体异步」的。
// 关键点二：D 排在 C 前面。因为 boom() 执行到 await null 时就注册了续体，
//           而 C 的 then 是下一行才注册的 —— 同一个微任务队列，先入队先执行。
// 关键点三：E 排在 C 前面，说明「D 阶段新产生的微任务」会在本轮被继续清空，
//           直到队列空才轮到宏任务 F。"
          />
        </div>

        <div class="el-item">
          <p class="hint">实验 2：微任务里再造微任务 —— 宏任务只能干等</p>
          <JsCard
            title="② 微任务一轮全清空，宏任务一轮只取一个"
            runnable="setTimeout(() => console.log('宏任务：我以为我是第一个'), 0)

let n = 0
function loop() &#123;
  n++
  if (n <= 3) &#123;
    console.log('微任务第 ' + n + ' 轮')
    queueMicrotask(loop)      // 微任务里注册微任务，本轮继续跑
  &#125;
&#125;
queueMicrotask(loop)

Promise.resolve().then(() => console.log('微任务：then'))
console.log('同步代码最先')

// 预期：同步代码最先 → 微任务第1轮 → 微任务：then → 微任务第2轮 → 第3轮 → 宏任务最后
// 注意：微任务队列「先入队先执行」，所以 then 夹在第 1、2 轮之间；
//       而宏任务要等微任务队列彻底空了才轮得到。
// 把 n <= 3 改成 n <= 1000000，就是「微任务饿死渲染」的真实事故现场。"
          />
        </div>

        <div class="el-item">
          <p class="hint">实验 3：await 永远要让出控制权（即使值已经就绪）</p>
          <JsCard
            title="③ await 后面的一行不会同步执行"
            runnable="async function f() &#123;
  console.log('f 开始')
  await 1                    // 非 Promise 值也会被包成 Promise.resolve(1)
  console.log('await 1 之后（微任务）')
&#125;
f()
console.log('同步结束')

async function g() &#123;
  const p = Promise.resolve('已就绪')      // 这个 Promise 此刻就是 fulfilled
  console.log('g: await 之前，p 已 fulfilled')
  const v = await p
  console.log('g: await 之后拿到 ' + v + '（仍然要等一轮微任务）')
&#125;
g()

// 结论：await 没有「同步捷径」。哪怕值已经就绪、哪怕不是 Promise，
//       后面的代码一律作为微任务执行 —— 这就是「await 之后 = then 回调」的准确含义。"
          />
        </div>
      </div>
    </JsCard>

    <!-- ============ 卡片 4：卡顿与分片 ============ -->
    <JsCard
      title="④ 页面为什么会卡：长任务、渲染时机与切片"
      hint="点「同步阻塞」和「微任务饥饿」，你会看到计数器在涨而进度条纹丝不动 —— 那就是主线程被独占的样子。"
      tone="warn"
    >
      <div class="row">
        <button class="danger" @click="syncBlock">同步长任务（约 1.2 亿次循环）</button>
        <button class="danger" @click="microStarve">微任务饥饿 800ms</button>
        <button class="primary" @click="sliceTask">分片执行（每片 30ms）</button>
      </div>
      <p class="kv" style="margin-top: 10px">{{ starvePhase }}</p>
      <div class="el-bar">
        <div class="el-bar-inner" :style="{ width: Math.max(barWidth, 2) + '%' }"></div>
      </div>
      <div class="row" style="margin-top: 6px">
        <span class="kv">进度：{{ barWidth }}%（分片模式才会逐步前进）</span>
        <span class="kv">计数：{{ starveCount }}</span>
        <span class="kv">同步耗时：{{ starvePasses }}ms</span>
      </div>
      <pre class="code" style="margin-top: 10px">/* 浏览器一帧的预算 ≈ 16.7ms（60Hz）。一帧里要干的事：
   处理任务（同步/微任务） → requestAnimationFrame 回调 → 样式/布局/绘制 → 提交合成

   只要「一个任务」跑超过一帧，这帧就丢：掉帧 → 点击无响应 → 输入卡顿。
   两种典型的长任务：
     1) 同步长循环（上面的「同步阻塞」）：谁都插不进去
     2) 微任务递归（上面的「微任务饥饿」）：同步和微任务之间【永远不渲染】，
        因为渲染发生在「微任务队列清空之后」

   注意：setTimeout 分片能让页面喘气，但每片之间至少隔 4ms（HTML 规范的最短间隔），
   所以它不是零成本；现代替代方案：
     · scheduler.yield()（新 API，能插到队列最前，比 setTimeout 更快恢复）
     · requestIdleCallback(cb)（只在浏览器空闲时跑，适合埋点/预计算这类可延迟工作）
*/</pre>
      <p class="hint" style="margin-top: 8px">
        <code>requestAnimationFrame(cb)</code> 的回调在<strong>下一帧渲染之前</strong>执行，
        所以它拿到的时间戳可以用来做动画；而 <code>setTimeout(cb, 16)</code> 只是「至少 16ms 后进宏任务」，
        两者完全不是一回事。
      </p>
    </JsCard>

    <!-- ============ 卡片 5：rAF 与渲染时机 ============ -->
    <JsCard
      title="⑤ requestAnimationFrame 与渲染时机"
      hint="rAF 回调和微任务、宏任务的相对位置：同步 → 微任务 → rAF（渲染前）→ 布局绘制 → 下一个宏任务。"
    >
      <JsCard
        title="跑一次看真实顺序"
        runnable="console.log('1 同步')
Promise.resolve().then(() => console.log('2 微任务 then'))
queueMicrotask(() => console.log('3 微任务 queueMicrotask'))
requestAnimationFrame(() => console.log('4 rAF（本帧渲染之前）'))
setTimeout(() => console.log('5 setTimeout 宏任务'), 0)
requestAnimationFrame(() => console.log('6 第二个 rAF（同帧，按注册顺序）'))
console.log('7 同步结束')

// 通常输出：1 → 7 → 2 → 3 → 4 → 6 → 5
// 说明：rAF 回调排在微任务之后、宏任务之前；
//       想「读到刚改的 DOM 尺寸」用它，而不是 setTimeout(0)。"
      />
      <table class="el-table" style="margin-top: 10px">
        <thead>
          <tr>
            <th>场景</th>
            <th>用什么</th>
            <th>为什么</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>动画、滚动跟随</td>
            <td><code>requestAnimationFrame</code></td>
            <td>与浏览器刷新节奏对齐，不会比刷新更快也不会撕裂</td>
          </tr>
          <tr>
            <td>读取刚写入 DOM 的尺寸/位置</td>
            <td>先改样式，再在 rAF 里读（Vue 里是 <code>nextTick</code> / <code>flush: 'post'</code>）</td>
            <td>此时布局已更新，且不会强制同步布局（避免 layout thrashing）</td>
          </tr>
          <tr>
            <td>可延迟的后台计算、上报</td>
            <td><code>requestIdleCallback</code></td>
            <td>只在空闲时间跑，最高优先级任务不受影响</td>
          </tr>
          <tr>
            <td>把长任务切片</td>
            <td><code>setTimeout</code> 分片 / <code>scheduler.yield()</code></td>
            <td>让出主线程，让渲染和输入有机会插进来</td>
          </tr>
          <tr>
            <td>「等 DOM 更新完再操作」</td>
            <td>Vue 的 <code>await nextTick()</code></td>
            <td>Vue 的更新也是微任务，nextTick 就是等这批微任务跑完</td>
          </tr>
        </tbody>
      </table>
    </JsCard>

    <!-- ============ 卡片 6：常见坑 ============ -->
    <JsCard title="⑥ 常见坑清单（面试 + 实战）" tone="danger">
      <table class="el-table">
        <thead>
          <tr>
            <th>坑</th>
            <th>真相</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>「setTimeout(fn, 0) 会立刻执行」</td>
            <td>不会。它至少要等当前同步代码 + <strong>所有微任务</strong>跑完；嵌套 5 层后最短间隔还会被钳到 4ms</td>
          </tr>
          <tr>
            <td>「async 函数整体是异步的」</td>
            <td>函数体在<strong>调用时就同步执行</strong>到第一个 await，只有 await 之后的部分才是微任务</td>
          </tr>
          <tr>
            <td>「两个 then 的回调同时开始」</td>
            <td>微任务仍然<strong>逐个执行</strong>，只是它们之间的同步代码不会插进来</td>
          </tr>
          <tr>
            <td>「Promise 里的代码也是异步的」</td>
            <td><code>new Promise(executor)</code> 的 executor 是<strong>同步</strong>执行的</td>
          </tr>
          <tr>
            <td>「用 setTimeout 修 UI 卡顿就够了」</td>
            <td>如果长任务本身在同步循环里，切片的粒度要足够小（几毫秒~几十毫秒），否则照样掉帧</td>
          </tr>
          <tr>
            <td>「微任务多了不影响渲染」</td>
            <td>渲染发生在微任务清空之后；微任务无限递归 = 页面永久冻死（比死循环还难发现，因为它不报错）</td>
          </tr>
          <tr>
            <td>「requestAnimationFrame 写在循环里没问题」</td>
            <td>页面切到后台时 rAF 会暂停（好事），但如果你用它做计时逻辑，回来后时间会跳变，要用时间戳而不是帧计数</td>
          </tr>
          <tr>
            <td>「MutationObserver 和 setTimeout 差不多」</td>
            <td>MutationObserver 的回调是<strong>微任务</strong>，在本次 DOM 变更后立刻批量触发，早于渲染</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 10px">
        一句话总结：<strong>同步代码先跑光，微任务一轮全清空，宏任务一轮只取一个；渲染夹在「微任务清空」和「下一个宏任务」之间，
        所以任何抢着不让微任务队列结束的代码都会让页面卡住。</strong>
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
.el-log {
  list-style: none;
  margin: 0;
  padding: 0;
  font-family: var(--mono);
  font-size: 12.5px;
  min-height: 40px;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  padding: 6px 8px;
}
.el-log li {
  padding: 2px 0;
  border-bottom: 1px dashed var(--c-border);
}
.el-log li:last-child {
  border-bottom: none;
}
.el-empty {
  color: var(--c-text-dim);
}
.el-badge {
  display: inline-block;
  min-width: 52px;
  margin-right: 8px;
  padding: 0 6px;
  border-radius: 5px;
  font-size: 11px;
  text-align: center;
  background: var(--c-surface-2);
  color: var(--c-text-dim);
}
.el-sync {
  color: var(--c-text);
}
.el-sync .el-badge {
  background: rgba(66, 184, 131, 0.18);
  color: var(--c-primary-dark);
}
.el-micro .el-badge {
  background: rgba(59, 130, 246, 0.16);
  color: var(--c-info);
}
.el-macro .el-badge {
  background: rgba(210, 153, 34, 0.18);
  color: var(--c-warn);
}
.el-table {
  font-size: 12.5px;
}
.el-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.el-item {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--c-surface);
}
.el-item > .hint {
  margin-bottom: 6px;
}
.el-item :deep(.card) {
  margin-bottom: 0;
  box-shadow: none;
  border: 1px dashed var(--c-border);
}
.el-bar {
  margin-top: 8px;
  height: 14px;
  border-radius: 999px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  overflow: hidden;
}
.el-bar-inner {
  height: 100%;
  background: var(--c-primary);
  transition: width 0.15s linear;
}
</style>
