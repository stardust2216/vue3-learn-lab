<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 11. DOM 与事件
 *
 * 这一页的演示全部是「真的在操作 DOM」：
 *   · 事件流演示：三层嵌套 div，亲眼看到捕获（从外到内）→ 目标 → 冒泡（从内到外）
 *   · 事件委托：一个容器只挂一个监听，就能管住里面所有（包括后来新增的）元素
 *   · 防抖/节流：同一个输入框，三个计数器对比原始触发 vs debounce vs throttle
 * ========================================================================== */

// ==================== ① 事件流：三层嵌套 ====================
interface FlowLog {
  phase: 'capture' | 'target' | 'bubble'
  label: string
  detail: string
}
const flowLog = shallowRef<FlowLog[]>([])
const flowEnabled = ref(true)
const stopAtMiddle = ref(false)
const eventCount = ref(0)

const outerEl = ref<HTMLElement | null>(null)
const middleEl = ref<HTMLElement | null>(null)
const innerEl = ref<HTMLElement | null>(null)

function addFlow(phase: FlowLog['phase'], label: string, detail: string) {
  flowLog.value = [...flowLog.value, { phase, label, detail }].slice(-12)
}

/** 三个阶段各挂一个监听：capture 版挂在捕获阶段，另一个挂冒泡阶段 */
const captureHandler = (e: Event) => {
  const t = e.target as HTMLElement
  addFlow('capture', `${(e.currentTarget as HTMLElement).dataset.name ?? '?'} 的【捕获】监听`, `target = ${t.dataset.name ?? t.tagName}`)
}
const bubbleHandler = (e: Event) => {
  const t = e.target as HTMLElement
  const name = (e.currentTarget as HTMLElement).dataset.name ?? '?'
  if (name === 'middle' && stopAtMiddle.value) {
    e.stopPropagation() // 冒泡到这里就停，外层再也收不到
    addFlow('bubble', `${name} 的【冒泡】监听`, '执行了 stopPropagation()，外层不会再收到')
    return
  }
  addFlow('bubble', `${name} 的【冒泡】监听`, `target = ${t.dataset.name ?? t.tagName}`)
}
const targetHandler = (e: Event) => {
  const t = e.target as HTMLElement
  addFlow('target', `inner 的【目标阶段】监听`, `target === currentTarget ? ${t === e.currentTarget}`)
}

function bindFlow() {
  outerEl.value?.addEventListener('click', captureHandler, true)
  middleEl.value?.addEventListener('click', captureHandler, true)
  innerEl.value?.addEventListener('click', captureHandler, true)
  outerEl.value?.addEventListener('click', bubbleHandler)
  middleEl.value?.addEventListener('click', bubbleHandler)
  innerEl.value?.addEventListener('click', bubbleHandler)
  // 目标元素上再挂一个「只跑一次」的监听，用来对比 once
  innerEl.value?.addEventListener('click', targetHandler, { once: true })
}

function onFlowClick() {
  eventCount.value++
  if (!flowEnabled.value) {
    flowLog.value = []
    addFlow('bubble', '（观察已关闭）', '打开右上角的开关再点，否则只有这一条')
  }
}

function clearFlow() {
  flowLog.value = []
  eventCount.value = 0
}

function rebindFlow() {
  unbindFlow()
  bindFlow()
  flowLog.value = []
  addFlow('bubble', '已重新绑定', '注意：once 的监听只有在重新绑定后才会再生效')
}

function unbindFlow() {
  outerEl.value?.removeEventListener('click', captureHandler, true)
  middleEl.value?.removeEventListener('click', captureHandler, true)
  innerEl.value?.removeEventListener('click', captureHandler, true)
  outerEl.value?.removeEventListener('click', bubbleHandler)
  middleEl.value?.removeEventListener('click', bubbleHandler)
  innerEl.value?.removeEventListener('click', bubbleHandler)
  innerEl.value?.removeEventListener('click', targetHandler)
}

// ==================== ② 键盘 / 表单 / 鼠标事件 ====================
const keyInfo = ref('（把焦点放进输入框再按键）')
const formEmail = ref('')
const formMsg = ref('')
const mouseInfo = ref('（把鼠标移到下面的框里）')

function onKeydown(e: KeyboardEvent) {
  keyInfo.value = `keydown: key=${e.key} code=${e.code} ctrl=${e.ctrlKey} shift=${e.shiftKey} repeat=${e.repeat}`
  // 常见的组合键拦截：Ctrl+Enter 提交
  if (e.key === 'Enter' && e.ctrlKey) {
    keyInfo.value += ' → 拦截 Ctrl+Enter（提交）'
  }
}
function onKeyup(e: KeyboardEvent) {
  keyInfo.value += ` | keyup: ${e.key}`
}
function onFormSubmit(e: Event) {
  e.preventDefault() // 阻止默认的「整页刷新」提交
  formMsg.value = `已提交（阻止了默认行为，页面没有刷新）：email = ${formEmail.value}`
}
function onMouseMove(e: MouseEvent) {
  mouseInfo.value = `clientX/Y = ${e.clientX}/${e.clientY}` // 相对视口
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  mouseInfo.value += ` ｜ offsetX/Y = ${Math.round(e.clientX - rect.left)}/${Math.round(e.clientY - rect.top)}（相对元素）`
}
function onMouseEnter(e: MouseEvent) {
  mouseInfo.value = `mouseenter 触发（不冒泡；mouseover 会冒泡）｜ buttons=${e.buttons}`
}

// ==================== ③ 事件委托：可增删列表 ====================
interface Todo {
  id: number
  text: string
  done: boolean
}
const todos = ref<Todo[]>([
  { id: 1, text: '读 .authoring-spec.md', done: true },
  { id: 2, text: '写第 11 页 DOM 与事件', done: false },
  { id: 3, text: '跑 vue-tsc 自检', done: false },
])
const newTodo = ref('')
const filter = ref<'all' | 'done' | 'todo'>('all')
const delegateLog = ref<string[]>([])
const listEl = ref<HTMLElement | null>(null)

function dlog(line: string) {
  delegateLog.value = [line, ...delegateLog.value].slice(0, 6)
}

/** 只挂一个监听：靠 closest 找到真正被点的东西，再靠 dataset 判断该做什么 */
function onListClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  // closest 会沿着「元素 → 父元素 → …」找最近的匹配元素
  const row = target.closest('[data-role="row"]') as HTMLElement | null
  if (!row) {
    dlog(`点在空白处（target = ${target.className || target.tagName}），什么也不做`)
    return
  }
  const id = Number(row.dataset.id)
  if (target.matches('[data-action="del"]')) {
    todos.value = todos.value.filter((t) => t.id !== id)
    dlog(`删除 #${id}（target=${target.tagName.toLowerCase()} → closest 找到行）`)
    return
  }
  if (target.matches('[data-action="toggle"]')) {
    const t = todos.value.find((x) => x.id === id)
    if (t) t.done = !t.done
    dlog(`切换 #${id} 完成状态（一个监听管住了所有行）`)
    return
  }
  dlog(`点在第 ${id} 行上（target=${target.tagName.toLowerCase()}，currentTarget=ul）`)
}

function addTodo() {
  const text = newTodo.value.trim()
  if (!text) {
    dlog('输入为空，没有新增')
    return
  }
  const id = Math.max(0, ...todos.value.map((t) => t.id)) + 1
  todos.value = [...todos.value, { id, text, done: false }]
  newTodo.value = ''
  dlog(`新增 #${id}：${text}（注意：新元素不需要重新绑事件）`)
}

function onListMouseover(e: MouseEvent) {
  const target = e.target as HTMLElement
  listEl.value?.querySelectorAll('[data-role="row"]').forEach((el) => el.classList.remove('do-hover'))
  target.closest('[data-role="row"]')?.classList.add('do-hover')
}

// ==================== ④ 防抖 / 节流 ====================
const rawCount = ref(0)
const debouncedCount = ref(0)
const throttledCount = ref(0)
const typedText = ref('')
const debounceLast = ref('（还没执行）')

function debounce<T extends (...args: never[]) => void>(fn: T, wait = 300) {
  let timer: number | undefined
  return function debounced(this: unknown, ...args: Parameters<T>) {
    window.clearTimeout(timer) // 关键：每次触发都把上一次的定时器干掉
    timer = window.setTimeout(() => fn.apply(this, args), wait)
  }
}

function throttle<T extends (...args: never[]) => void>(fn: T, wait = 400) {
  let last = 0
  let timer: number | undefined
  return function throttled(this: unknown, ...args: Parameters<T>) {
    const now = Date.now()
    const remain = wait - (now - last)
    if (remain <= 0) {
      last = now
      fn.apply(this, args)
    } else if (timer === undefined) {
      // 补一次「尾部调用」，保证最后一次输入不会被丢掉
      timer = window.setTimeout(() => {
        last = Date.now()
        timer = undefined
        fn.apply(this, args)
      }, remain)
    }
  }
}

const onDebounced = debounce((v: string) => {
  debouncedCount.value++
  debounceLast.value = `debounce 执行：收到了 "${v}"（停止输入 300ms 后才跑）`
}, 300)
// @ts-expect-error 教学演示：这里故意是 TS 眼里的错误（TS6133）

const onThrottled = throttle((v: string) => {
  throttledCount.value++
}, 400)

function onType(e: Event) {
  const v = (e.target as HTMLInputElement).value
  typedText.value = v
  rawCount.value++
  onDebounced(v)
  onThrottled(v)
}
function resetCounters() {
  rawCount.value = 0
  debouncedCount.value = 0
  throttledCount.value = 0
  debounceLast.value = '（还没执行）'
  typedText.value = ''
}

onBeforeUnmount(() => {
  unbindFlow()
})
</script>

<template>
  <div>
    <h1>11. DOM 与事件</h1>
    <p class="lead">
      事件流只有三个阶段：<strong>捕获（从 window 往下）→ 目标 → 冒泡（从目标往上）</strong>；
      而 <code>event.target</code> 是「真正被点的那个」、<code>event.currentTarget</code> 是「当前正在执行监听的那个」。
      掌握这两句话，就掌握了事件委托；掌握了事件委托，就再也不用给列表的每一行绑事件了。
    </p>

    <!-- ============ 卡片 1：查询与创建 ============ -->
    <JsCard
      title="① 查询 / 创建 / 插入 / 删除：DOM API 速查"
      hint="下面所有 API 都是真实存在的原生方法；右侧是「性能与安全」的取舍。"
    >
      <div class="pc-grid">
        <pre class="code">// ---------- 查询 ----------
document.querySelector('.card')          // 第一个匹配（返回 Element | null）
document.querySelectorAll('.card')       // 全部匹配 → NodeList（静态快照，不是活的）
document.getElementById('app')           // 只按 id，最快
document.getElementsByClassName('card')  // HTMLCollection（【活的】，会随 DOM 变化）
document.getElementsByTagName('div')

const el = document.querySelector('.card')
el.closest('.panel')        // 从自己开始【往上】找最近的祖先（含自己）
el.matches('.card.active')  // 自己是否匹配选择器 → boolean
el.contains(other)          // other 是否是自己或后代

// ⚠️ querySelectorAll 返回的 NodeList 是【静态】的：
//    之后新增的元素不会自动出现在里面
// ⚠️ getElementsByClassName 返回的是【活的】HTMLCollection：
//    一边遍历一边改 DOM 容易死循环
// ⚠️ NodeList 有 forEach，HTMLCollection 没有（要 [...list] 转数组）

// ---------- 创建与插入 ----------
const li = document.createElement('li')
li.textContent = '新条目'                  // 安全：按文本处理
li.classList.add('item')
li.dataset.id = '7'                        // → &lt;li data-id="7"&gt;

parent.append(li)          // 插到末尾（可一次传多个节点/字符串）
parent.prepend(li)         // 插到最前
parent.before(li); parent.after(li)          // 插到自己前后（同级）
row.replaceWith(li)        // 替换
child.remove()             // 删除自己（现代 API，不用再找 parentNode）

// 一次插入一大段 HTML 结构（比循环 append 快，但只适合可信 HTML）
list.insertAdjacentHTML('beforeend', '&lt;li class="item"&gt;A&lt;/li&gt;')
// 四个位置：'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'

// ---------- 读写属性 / class / 样式 ----------
el.id = 'x'                     // 属性与 property 大多数时候同步
el.setAttribute('data-x', '1')
const v = el.getAttribute('data-x')        // 字符串，没有就是 null
el.removeAttribute('data-x')
el.dataset.x                               // 读 data-* 的推荐方式（注意驼峰：data-user-id → dataset.userId）

el.classList.add('a', 'b')
el.classList.remove('a')
el.classList.toggle('active')              // 有就删、没有就加
el.classList.replace('a', 'b')
el.classList.contains('active')            // → boolean（推荐用它，而不是 startsWith 拼字符串）

el.style.color = 'red'                     // 写【行内样式】；短横线要转驼峰
getComputedStyle(el).width                 // 读【最终生效】的样式（布局后才有真实值）</pre>
        <pre class="code">// ---------- textContent vs innerHTML vs innerText ----------
const box = document.querySelector('.box')

box.textContent = '&lt;b&gt;不解析&lt;/b&gt;'
// 结果：页面上原样显示 &lt;b&gt;不解析&lt;/b&gt;
// ✅ 安全（不会执行 HTML/脚本）✅ 快（不触发 HTML 解析）
// ⚠️ 读的时候会拿到【隐藏元素】的文字（display:none 的内容也在）

box.innerHTML = '&lt;b&gt;会解析&lt;/b&gt;'
// 结果：加粗的「会解析」
// ✅ 能一次插入结构 ⚠️ 慢（要走 HTML 解析器）
// ❌ 危险：用户输入直接进 innerHTML = XSS
//    （&lt;img src=x onerror=alert(1)&gt; 会执行）
// ⚠️ 它还会【销毁并重建】所有子节点的事件监听与状态

box.innerText             // 受 CSS 影响的「渲染后的文本」
// ✅ 会忽略 display:none 的内容、会带上换行
// ❌ 读写都会触发【强制重排/重绘】（为了知道真实渲染结果），性能最差

// 记忆口诀：
//   写用户输入 → textContent（或框架的插值）
//   写可信模板 → innerHTML（或 insertAdjacentHTML）
//   读可见文本 → innerText（但要用在节流后的逻辑里，别放进动画循环）

// ---------- 批量改 DOM 的正确姿势 ----------
// ❌ 每次 append 都可能触发一次布局
// for (let i = 0; i &lt; 1000; i++) list.append(makeItem(i))

// ✅ 用 DocumentFragment 攒起来，一次插入
const frag = document.createDocumentFragment()
for (let i = 0; i &lt; 1000; i++) frag.append(makeItem(i))
list.append(frag)

// ✅ 或者先脱离文档、改完再挂回去
const clone = list.cloneNode(false)      // false = 不复制子节点
// …往 clone 里填内容…
list.replaceWith(clone)</pre>
      </div>
      <ul class="de-notes">
        <li>
          <strong>强制同步布局（layout thrashing）</strong>：先写样式、再立刻读 <code>offsetHeight</code>、再写……每读一次都会强制浏览器立刻重排。
          正确姿势是「读阶段」和「写阶段」分开，读的结果先存到变量里。
        </li>
        <li><strong>现代替代</strong>：能用 <code>classList</code> 就别拼 <code>className</code> 字符串；能用 <code>dataset</code> 就别手写 <code>getAttribute('data-x')</code>。</li>
      </ul>
    </JsCard>

    <!-- ============ 卡片 2：事件流 ============ -->
    <JsCard
      title="② 事件流三阶段：捕获 → 目标 → 冒泡（点盒子看真实顺序）"
      hint="三层嵌套：外层 outer → 中间 middle → 内层 inner。点哪一层，日志就记下真实执行顺序。"
      tone="ok"
    >
      <div class="row">
        <label class="de-check">
          <input type="checkbox" v-model="flowEnabled" />
          打开观察
        </label>
        <label class="de-check">
          <input type="checkbox" v-model="stopAtMiddle" />
          在 middle 的冒泡阶段 stopPropagation
        </label>
        <button @click="rebindFlow">重置（重新绑定，恢复 once）</button>
        <button class="danger" @click="clearFlow">清空日志</button>
        <span class="kv">点击次数：{{ eventCount }}</span>
      </div>
      <div ref="outerEl" class="de-outer" data-name="outer" @click="onFlowClick">
        <span class="de-tag">outer（捕获监听 + 冒泡监听）</span>
        <div ref="middleEl" class="de-middle" data-name="middle">
          <span class="de-tag">middle</span>
          <div ref="innerEl" class="de-inner" data-name="inner">
            <span class="de-tag">inner（还有一次性的目标阶段监听）</span>
            <span>点我 👆（点哪一层都行）</span>
          </div>
        </div>
      </div>
      <ul class="de-log" style="margin-top: 10px">
        <li v-for="(l, i) in flowLog" :key="i" :class="'de-' + l.phase">
          <span class="de-badge">{{ l.phase }}</span>{{ l.label }} —— {{ l.detail }}
        </li>
        <li v-if="!flowLog.length" class="de-empty">（点上面的盒子开始）</li>
      </ul>
      <p class="hint" style="margin-top: 8px">
        预期顺序（点 inner）：<code>outer 捕获 → middle 捕获 → inner 捕获 → inner 目标 → inner 冒泡 → middle 冒泡 → outer 冒泡</code>。
        勾上 stopPropagation 后，<strong>outer 的冒泡监听会消失</strong>——这就是「阻止冒泡」的作用；
        而 <strong>捕获阶段的监听不受影响</strong>（它在冒泡之前就已经跑完了）。
      </p>
      <pre class="code" style="margin-top: 10px">// 三阶段 + options 的完整写法
el.addEventListener('click', handler, &#123;
  capture: true,    // 在捕获阶段触发（默认 false = 冒泡阶段）
  once: true,       // 只触发一次后自动解绑（本页 inner 上那个目标阶段监听就是）
  passive: true,    // 承诺「不调用 preventDefault」，浏览器可以立即滚动（滚动性能优化）
  signal: ac.signal // 传 AbortSignal 可以一次性解绑一批监听（现代清理方式）
&#125;)

// 什么时候需要 capture？
//  · 想在「默认行为 / 子元素处理之前」先看一眼（例如全局埋点、点击外部关闭弹窗）
//  · 想在捕获阶段就 stopPropagation，把事件「截胡」在到达目标之前
// 注意：passive: true 时调用 preventDefault 会被忽略并在控制台警告（滚动事件上很常见）

// target vs currentTarget（最容易搞混的一对）
outer.addEventListener('click', (e) =&gt; &#123;
  e.target        // 真正被点的元素（可能是很深的子元素），事件结束后会变成 null
  e.currentTarget // 绑定监听的元素（就是 outer），永远等于 this
&#125;)

// 阻止默认 vs 阻止冒泡（两件事，别混）
e.preventDefault()     // 不执行浏览器默认行为（跳转链接、提交表单、勾选复选框）
e.stopPropagation()    // 不让事件继续往上传给祖先（不影响默认行为）
return false           // ⚠️ 在 addEventListener 里【无效】（只有在 HTML 属性 onclick 里才等价于两者）</pre>
    </JsCard>

    <!-- ============ 卡片 3：事件委托 ============ -->
    <JsCard
      title="③ 事件委托：一个监听管住整个列表"
      hint="试试「新增」之后再点新条目——新元素没有单独绑过事件，但一样能响应。"
    >
      <div class="row">
        <input v-model="newTodo" placeholder="输入待办，回车或点新增" @keyup.enter="addTodo" />
        <button class="primary" @click="addTodo">新增</button>
        <span class="kv">显示：</span>
        <select v-model="filter">
          <option value="all">全部</option>
          <option value="todo">未完成</option>
          <option value="done">已完成</option>
        </select>
      </div>
      <ul
        ref="listEl"
        class="de-list"
        data-role="list"
        @click="onListClick"
        @mouseover="onListMouseover"
      >
        <li
          v-for="t in todos"
          v-show="filter === 'all' || (filter === 'done' ? t.done : !t.done)"
          :key="t.id"
          class="de-row"
          data-role="row"
          :data-id="t.id"
        >
          <input type="checkbox" :checked="t.done" data-action="toggle" />
          <span class="de-text" :class="{ 'de-done': t.done }">{{ t.text }}</span>
          <button class="danger" data-action="del">删除</button>
        </li>
        <li v-if="!todos.length" class="de-empty">（列表空了，新增一个试试）</li>
      </ul>
      <pre class="code" style="margin-top: 10px">{{ delegateLog.join('\n') || '（点列表里的复选框/删除按钮/空白处，观察日志）' }}</pre>
      <div class="pc-grid" style="margin-top: 10px">
        <pre class="code">// ✅ 事件委托：只在容器上挂一个监听
list.addEventListener('click', (e) =&gt; &#123;
  const row = e.target.closest('[data-role="row"]')   // 1) 找到所属的行
  if (!row) return                                    // 2) 点在空白处就忽略
  const id = Number(row.dataset.id)
  if (e.target.matches('[data-action="del"]')) &#123;      // 3) 再判断点了哪个按钮
    return remove(id)
  &#125;
  if (e.target.matches('[data-action="toggle"]')) &#123;
    return toggle(id)
  &#125;
  select(id)                                          // 4) 兜底：点整行 = 选中
&#125;)

// 新增的元素【不需要】重新绑定 —— 因为监听在祖先身上
// 删除元素也【不需要】解绑 —— 因为从来没绑过（不会内存泄漏）

// ❌ 逐个绑定：每行 2 个监听，1000 行 = 2000 个监听
rows.forEach((row) =&gt; &#123;
  row.querySelector('.del').addEventListener('click', onDel)
  row.querySelector('.toggle').addEventListener('click', onToggle)
&#125;)
//  · 内存与初始化时间随行数线性增长
//  · 新增行必须记得再绑一次（忘了就「点了没反应」）
//  · 删除行时必须解绑，否则旧行被闭包引用着，泄漏</pre>
        <pre class="code">// 委托的三个必备条件
// 1) 事件会冒泡（click / input / change 都会；
//    ❌ 不冒泡的有：focus / blur / mouseenter / mouseleave / scroll(元素上)）
//    → 需要它们时用捕获阶段（capture: true）或者 focusin/focusout
// 2) 能定位到「哪个子元素」（closest + dataset / matches）
// 3) 容器在绑定时已经存在（动态创建容器时要等它挂上去）

// 「点击外部关闭下拉」也是同一套思路
document.addEventListener('click', (e) =&gt; &#123;
  if (!e.target.closest('.dropdown')) closeAll()
&#125;)

// 与本项目（Vue）的对照：
//  · Vue 的 @click 是【绑在元素上】的语法糖，但 Vue 内部其实用了
//    「事件委托 + 缓存」的优化（同一个事件类型在同一个元素上只挂一个 invoker）
//  · .stop / .prevent / .once / .capture / .self / .passive 这些修饰符
//    就是上面那些原生 options 的写法（见 ⑤）</pre>
      </div>
    </JsCard>

    <!-- ============ 卡片 4：防抖节流 ============ -->
    <JsCard
      title="④ 防抖与节流：手写实现 + 计数器对比"
      hint="在下面输入框里快速打字：raw 每次都涨；debounce 只在停手后涨一次；throttle 每 400ms 涨一次。"
      tone="warn"
    >
      <div class="row">
        <input :value="typedText" placeholder="快速连续输入，例如 vuevuevue" @input="onType" style="width: 260px" />
        <button @click="resetCounters">重置计数</button>
      </div>
      <div class="row" style="margin-top: 8px">
        <span class="tag">原始触发 raw = {{ rawCount }}</span>
        <span class="tag pass">debounce(300ms) = {{ debouncedCount }}</span>
        <span class="tag info">throttle(400ms) = {{ throttledCount }}</span>
      </div>
      <p class="kv" style="margin-top: 6px">当前输入："{{ typedText }}" ｜ {{ debounceLast }}</p>
      <div class="pc-grid" style="margin-top: 10px">
        <pre class="code">// ---------- 防抖 debounce：等你停下来再做 ----------
function debounce(fn, wait = 300) &#123;
  let timer
  return function (...args) &#123;
    clearTimeout(timer)                  // 每次触发都重置计时
    timer = setTimeout(() =&gt; fn.apply(this, args), wait)
  &#125;
&#125;
// 适合：搜索联想、窗口 resize 后重算布局、表单自动保存
// 特点：连续触发期间【一次都不执行】，最后一次之后 wait 毫秒执行一次
// 常见需求：immediate/leading 选项 —— 让第一次立刻执行（如按钮防重复点击）

// ---------- 节流 throttle：固定频率做 ----------
function throttle(fn, wait = 400) &#123;
  let last = 0, timer
  return function (...args) &#123;
    const now = Date.now()
    const remain = wait - (now - last)
    if (remain &lt;= 0) &#123;          // 距离上次执行够久了 → 立刻执行
      last = now
      fn.apply(this, args)
    &#125; else if (timer === undefined) &#123;
      timer = setTimeout(() =&gt; &#123;   // 保证尾部那次不丢
        last = Date.now(); timer = undefined
        fn.apply(this, args)
      &#125;, remain)
    &#125;
  &#125;
&#125;
// 适合：滚动、鼠标移动、拖拽、高频上报
// 特点：连续触发期间【按固定间隔执行】，不会一次都不执行</pre>
        <pre class="code">// 一张表记住区别
//          触发期间的行为          最后一次会不会执行
// debounce  一次都不执行（一直重置）   会（等 wait 之后）
// throttle  每 wait 执行一次          会（尾部补一次）
//
// 用哪个？问自己：「中间过程重要还是最终结果重要」
//   搜索框 → 只关心最终输入 → debounce
//   滚动进度条 → 过程要连续 → throttle
//
// 还要想清楚「谁在等」：
//   debounce 的 wait 是「静默期」，输入很快的人可能一直不触发（要配 leading 或 maxWait）
//   throttle 的 wait 决定刷新率上限（60fps → 约 16ms；上报 → 1000ms 就够）

// ---------- 清理：定时器一定要能取消 ----------
// 本页在 onBeforeUnmount 里解绑了事件；真实项目里 debounce 还应返回 cancel：
function debounce2(fn, wait) &#123;
  let timer
  const wrapped = (...args) =&gt; &#123;
    clearTimeout(timer)
    timer = setTimeout(() =&gt; fn(...args), wait)
  &#125;
  wrapped.cancel = () =&gt; clearTimeout(timer)   // 组件卸载 / 参数变化时调用
  return wrapped
&#125;</pre>
      </div>
    </JsCard>

    <!-- ============ 卡片 5：鼠标/键盘/表单 + runnable ============ -->
    <JsCard
      title="⑤ 键盘 / 鼠标 / 表单事件要点（现场试）"
      hint="输入框里按键、把鼠标移到色块上、提交表单，看事件对象的真实字段。"
    >
      <div class="row">
        <input
          placeholder="焦点放这里，按几个键（试试 Ctrl+Enter / 长按）"
          style="width: 300px"
          @keydown="onKeydown"
          @keyup="onKeyup"
        />
      </div>
      <p class="kv" style="margin-top: 6px">{{ keyInfo }}</p>
      <form class="row" style="margin-top: 10px" @submit="onFormSubmit">
        <input v-model="formEmail" type="text" placeholder="邮箱（随便输）" />
        <button class="primary" type="submit">提交（会 preventDefault）</button>
        <span class="kv">{{ formMsg }}</span>
      </form>
      <div class="de-mouse" @mousemove="onMouseMove" @mouseenter="onMouseEnter">
        鼠标移进来 / 移动（mouseenter 不冒泡，mousemove 高频 → 真实项目要节流）
      </div>
      <p class="kv" style="margin-top: 6px">{{ mouseInfo }}</p>
      <div class="me-stack" style="margin-top: 12px">
        <JsCard
          title="runnable：事件对象里到底有什么"
          runnable="// 用一个自建事件 + 一个真实派发来看事件对象的结构
const btn = document.createElement('button')
btn.textContent = '我是临时按钮'
document.body.append(btn)

btn.addEventListener('click', (e) => &#123;
  console.log('type = ' + e.type)
  console.log('target === currentTarget ? ' + (e.target === e.currentTarget))
  console.log('bubbles = ' + e.bubbles + ' / cancelable = ' + e.cancelable)
  console.log('isTrusted（脚本派发的为 false）= ' + e.isTrusted)
  console.log('eventPhase: 1=捕获 2=目标 3=冒泡 → ' + e.eventPhase)
  btn.remove()      // 用完清理，别污染页面
&#125;, &#123; once: true &#125;)

btn.click()          // 脚本触发（顺序与真实点击一致，但 isTrusted=false）"
        />
        <JsCard
          title="runnable：三个事件阶段 + once + preventDefault"
          runnable="const outer = document.createElement('div')
const inner = document.createElement('div')
outer.append(inner)
document.body.append(outer)

const order = []
outer.addEventListener('click', () => order.push('outer 捕获'), true)
outer.addEventListener('click', () => order.push('outer 冒泡'))
inner.addEventListener('click', () => order.push('inner 目标（冒泡阶段）'))
inner.addEventListener('click', () => order.push('inner 捕获阶段（目标元素上也会先跑捕获）'), true)

inner.click()
console.log('执行顺序：' + order.join(' → '))
// 预期：outer 捕获 → inner 捕获阶段 → inner 目标（冒泡阶段）→ outer 冒泡
// 注意：目标元素上，捕获监听和冒泡监听【都会执行】，且捕获在前 —— 这是规范定义的行为。

// once 与 preventDefault
const a = document.createElement('a')
a.href = 'https://example.com'
a.textContent = '链接'
document.body.append(a)
a.addEventListener('click', (e) => &#123;
  e.preventDefault()        // 阻止跳转
  console.log('链接点击被 preventDefault 拦下了，href = ' + a.href)
&#125;)
a.click()
a.remove(); outer.remove()"
        />
      </div>
      <table class="de-table" style="margin-top: 10px">
        <thead>
          <tr>
            <th>事件</th>
            <th>是否冒泡</th>
            <th>要点</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>click</code> / <code>dblclick</code></td>
            <td>冒泡</td>
            <td><code>button</code> 能区分左右中键（0/1/2）</td>
          </tr>
          <tr>
            <td><code>mouseenter/mouseleave</code></td>
            <td><strong>不冒泡</strong></td>
            <td>进入/离开自身时各触发一次，不因子元素而反复触发</td>
          </tr>
          <tr>
            <td><code>mouseover/mouseout</code></td>
            <td>冒泡</td>
            <td>穿过子元素也会触发（<code>relatedTarget</code> 表示从哪来/到哪去）</td>
          </tr>
          <tr>
            <td><code>focus</code> / <code>blur</code></td>
            <td><strong>不冒泡</strong></td>
            <td>需要委托就用 <code>focusin</code> / <code>focusout</code>（会冒泡）</td>
          </tr>
          <tr>
            <td><code>input</code> / <code>change</code></td>
            <td>冒泡</td>
            <td><code>input</code> 每次输入都触发；<code>change</code> 在失焦/回车后触发一次；IME 输入法期间要小心（用 <code>compositionstart/end</code> 处理中文）</td>
          </tr>
          <tr>
            <td><code>scroll</code></td>
            <td>元素上不冒泡（document 上可捕获）</td>
            <td>高频 → 必须节流；<code>passive: true</code> 提升滚动性能</td>
          </tr>
          <tr>
            <td><code>keydown</code> / <code>keyup</code></td>
            <td>冒泡</td>
            <td>用 <code>e.key</code>（'Enter'）判断语义，<code>e.code</code>（'KeyA'）判断物理位置；<code>e.repeat</code> 区分长按</td>
          </tr>
        </tbody>
      </table>
    </JsCard>

    <!-- ============ 卡片 6：Vue 对照 + 速查 ============ -->
    <JsCard title="⑥ 在 Vue 里这些还需要吗？（对照表 + 常见坑）" tone="danger">
      <table class="de-table">
        <thead>
          <tr>
            <th>原生做法</th>
            <th>Vue 里对应什么</th>
            <th>还需要手写吗</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>querySelector</code> + 手动改文本</td>
            <td><code>v-text</code> / <code>&#123;&#123; msg &#125;&#125;</code>（自动用 textContent 语义，安全）</td>
            <td>不需要；要说「更新后要读 DOM」用 <code>ref</code> + <code>nextTick</code></td>
          </tr>
          <tr>
            <td><code>createElement</code> + <code>append</code> 渲染列表</td>
            <td><code>v-for</code> + <code>:key</code>（Vue 内部做最小化 DOM 补丁）</td>
            <td>不需要；只有做富文本编辑器/图表时才手动操作 DOM</td>
          </tr>
          <tr>
            <td><code>el.classList.toggle('active')</code></td>
            <td><code>:class="&#123; active: isActive &#125;"</code></td>
            <td>不需要；但记住类名要出现在模板里（scoped 样式才生效）</td>
          </tr>
          <tr>
            <td><code>addEventListener('click', fn)</code></td>
            <td><code>@click="fn"</code></td>
            <td>不需要；组件卸载时 Vue 自动解绑</td>
          </tr>
          <tr>
            <td><code>e.preventDefault()</code> / <code>stopPropagation()</code></td>
            <td><code>@submit.prevent</code> / <code>@click.stop</code></td>
            <td>不需要；修饰符还有 <code>.once</code> <code>.self</code> <code>.capture</code> <code>.passive</code></td>
          </tr>
          <tr>
            <td>滚动/鼠标高频监听 + 手动节流</td>
            <td><code>@scroll.throttle</code>（需要自行实现或借助工具库）；本项目用 <code>useMouse()</code> 组合式函数包装</td>
            <td>仍要自己写节流逻辑，只是封装在 composable 里（见 <code>src/composables/index.ts</code>）</td>
          </tr>
          <tr>
            <td><code>el.focus()</code> / 测量尺寸</td>
            <td><code>ref</code> + <code>onMounted</code> / <code>nextTick</code></td>
            <td>需要——这正是模板 ref 存在的意义</td>
          </tr>
          <tr>
            <td>事件委托</td>
            <td>Vue 的 <code>@click</code> 绑在元素上，但你可以在父元素上用 <code>@click</code> + <code>e.target.closest()</code> 自己委托</td>
            <td>长列表（上千行）时自己委托仍然值得</td>
          </tr>
        </tbody>
      </table>
      <ul class="de-notes">
        <li><strong>坑 1：<code>innerHTML</code> 拼接用户输入。</strong>XSS 的经典入口；Vue 的插值和 <code>v-bind</code> 默认都做了转义，只有 <code>v-html</code> 例外，所以要像对待 <code>eval</code> 一样对待它。</li>
        <li><strong>坑 2：把 <code>e.target</code> 存起来异步用。</strong>事件对象会被复用/置空，要取的值请当场存进变量（<code>const id = e.target.dataset.id</code>）。</li>
        <li><strong>坑 3：在 <code>scroll</code> / <code>mousemove</code> 里同步读布局。</strong>配合节流还不够，读写要分离，否则每帧都在强制重排。</li>
        <li><strong>坑 4：<code>mouseenter</code> 上做委托。</strong>它不冒泡，委托必然收不到；换 <code>mouseover</code> 或加 <code>capture: true</code>。</li>
        <li><strong>坑 5：忘了 <code>passive: true</code>。</strong>在移动端滚动容器上监听 <code>touchstart</code> 而不加 passive，浏览器必须等你跑完才敢滚，体感立刻变卡。</li>
        <li><strong>坑 6：真实 DOM 与虚拟 DOM 打架。</strong>在 Vue 里手动 <code>append</code> 到受 <code>v-for</code> 管理的容器，下一次更新时会被 Vue 清掉；要操作就操作一块 Vue 不管理的区域（或 <code>v-html</code> 之外的自定义容器）。</li>
      </ul>
      <p class="hint" style="margin-top: 10px">
        一句话总结：<strong>DOM API 是「命令式」的（自己找元素、自己改、自己清理），
        Vue 的模板是「声明式」的（描述结果，框架负责改 DOM）；
        但只要涉及「焦点、测量、第三方库、超长列表」，底层知识仍然是你的唯一退路。</strong>
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
.pc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 10px;
}
.de-outer,
.de-middle,
.de-inner {
  border: 2px dashed var(--c-border);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
}
.de-outer {
  background: rgba(66, 184, 131, 0.08);
  border-color: var(--c-primary);
}
.de-middle {
  margin-top: 8px;
  background: rgba(59, 130, 246, 0.08);
  border-color: var(--c-info);
}
.de-inner {
  margin-top: 8px;
  background: rgba(210, 153, 34, 0.12);
  border-color: var(--c-warn);
}
.de-tag {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--c-text-dim);
  margin-right: 8px;
}
.de-log {
  list-style: none;
  margin: 0;
  padding: 6px 8px;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  font-family: var(--mono);
  font-size: 12.5px;
  min-height: 40px;
}
.de-log li {
  padding: 2px 0;
  border-bottom: 1px dashed var(--c-border);
}
.de-log li:last-child {
  border-bottom: none;
}
.de-empty {
  color: var(--c-text-dim);
}
.de-badge {
  display: inline-block;
  min-width: 62px;
  margin-right: 8px;
  padding: 0 6px;
  border-radius: 5px;
  font-size: 11px;
  text-align: center;
  background: var(--c-surface-2);
  color: var(--c-text-dim);
}
.de-capture .de-badge {
  background: rgba(59, 130, 246, 0.16);
  color: var(--c-info);
}
.de-target .de-badge {
  background: rgba(210, 153, 34, 0.18);
  color: var(--c-warn);
}
.de-bubble .de-badge {
  background: rgba(66, 184, 131, 0.18);
  color: var(--c-primary-dark);
}
.de-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--c-text-dim);
}
.de-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 6px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  min-height: 44px;
}
.de-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  border-bottom: 1px dashed var(--c-border);
}
.de-row:last-child {
  border-bottom: none;
}
.de-row.do-hover {
  background: var(--c-surface-2);
}
.de-text {
  flex: 1;
}
.de-done {
  text-decoration: line-through;
  color: var(--c-text-dim);
}
.de-mouse {
  margin-top: 10px;
  padding: 14px;
  border-radius: 8px;
  border: 1px dashed var(--c-info);
  background: rgba(59, 130, 246, 0.06);
  font-size: 12.5px;
  color: var(--c-text-dim);
}
.de-table {
  font-size: 12.5px;
}
.de-notes {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.8;
}
.de-notes strong {
  color: var(--c-text);
}
.me-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.me-stack :deep(.card) {
  margin-bottom: 0;
  box-shadow: none;
  border: 1px dashed var(--c-border);
}
</style>
