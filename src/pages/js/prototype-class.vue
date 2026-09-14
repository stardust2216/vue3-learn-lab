<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ---- 演示数据提取到此处：模板属性里不适合写长表达式（引号/花括号会被 HTML 属性语法干扰）---- */
const asserts1 = [
        { expr: '(function () { const F = function () {}; return F.prototype.constructor === F })()', actual: (function () { const F = function () {}; return F.prototype.constructor === F })(), expected: true, note: '引擎自动建立的「反向指针」' },
        { expr: '(function F(){}).prototype === (function F(){}).prototype', actual: (function F () {}).prototype === (function F () {}).prototype, expected: false, note: '两个分开写的函数字面量是两个不同的函数' },
        { expr: 'Object.getPrototypeOf({}) === Object.prototype', actual: Object.getPrototypeOf({}) === Object.prototype, expected: true },
        { expr: 'Object.getPrototypeOf(Object.prototype)', actual: Object.getPrototypeOf(Object.prototype), expected: null, note: '链的终点是 null' },
        // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
        { expr: 'Object.prototype.__proto__', actual: Object.prototype.__proto__, expected: null },
        // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
        { expr: '({a:1}).__proto__ === Object.prototype', actual: ({ a: 1 }).__proto__ === Object.prototype, expected: true, note: '__proto__ 是 Object.prototype 上的访问器' },
        { expr: 'Object.getPrototypeOf(Object.create(null))', actual: Object.getPrototypeOf(Object.create(null)), expected: null, note: '没有原型 = 没有 toString/hasOwnProperty，适合做纯字典' },
        { expr: 'typeof Object.create(null).toString', actual: typeof Object.create(null).toString, expected: 'undefined' },
        { expr: '(function F(){}).hasOwnProperty("prototype")', actual: (function F() {}).hasOwnProperty('prototype'), expected: true, note: '只有函数有 prototype 属性' },
        { expr: 'typeof Function.prototype', actual: typeof Function.prototype, expected: 'function', note: 'Function.prototype 本身是个函数（唯一特例）' },
        // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
        { expr: '[].__proto__ === Array.prototype', actual: [].__proto__ === Array.prototype, expected: true },
        // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
        { expr: 'Array.prototype.__proto__ === Object.prototype', actual: Array.prototype.__proto__ === Object.prototype, expected: true, note: '数组链：arr → Array.prototype → Object.prototype → null' },
        { expr: 'Object.hasOwn(new (class A {})(), "constructor")', actual: Object.hasOwn(new (class A {})(), 'constructor'), expected: false, note: 'constructor 在原型上，不是实例自有属性' },
      ]

/* ============================================================================
 * 9. 原型链与 Class
 *
 * 一条主线：JS 的「继承」不是复制，而是【沿着 __proto__ 一条链往上找】。
 *   · 每个对象都有 [[Prototype]]（用 Object.getPrototypeOf 读，__proto__ 是它的 getter/setter）
 *   · 每个函数都有 prototype 属性（只有被 new 调用时才用得上，作为新对象的 [[Prototype]]）
 *   · class 只是「构造函数 + 原型方法 + 严格模式」的语法糖，语义更严但没有变出新机制
 * ========================================================================== */

// ==================== ① 原型链查找演示 ====================
interface ChainNode {
  depth: number
  label: string
  own: string
}
const lookupKey = ref('say')
const chainNodes = shallowRef<ChainNode[]>([])
const lookupPath = ref<string[]>([])
const lookupResult = ref('')

/** 建一条三层原型链：grand → parent → child（child 是最终被查询的对象） */
function buildChain() {
  const grand = { level: 3, tag: 'grand（顶层）' }
  const parent = Object.create(grand)
  parent.level = 2
  parent.tag = 'parent（中间层）'
  const child = Object.create(parent)
  child.level = 1
  child.tag = 'child（最底层）'
  return { grand, parent, child }
}

function runLookup() {
  const { grand, parent, child } = buildChain()
  const key = lookupKey.value.trim() || 'level'

  // 手动模拟 [[Get]]：从 child 开始，一层层往上找「自有属性」
  const path: string[] = []
  const nodes: ChainNode[] = []
  let cur: object | null = child
  let depth = 0
  let hit = ''
  while (cur) {
    const own = Object.prototype.hasOwnProperty.call(cur, key)
    const label =
      cur === child ? 'child' : cur === parent ? 'parent' : cur === grand ? 'grand' : 'Object.prototype'
    nodes.push({ depth, label, own: own ? `✅ 自有属性 ${key}` : '— 没有，继续往上' })
    path.push(label)
    if (own) {
      hit = label
      break
    }
    cur = Object.getPrototypeOf(cur)
    depth++
  }
  chainNodes.value = nodes
  lookupPath.value = path
  lookupResult.value = hit
    ? `找到：${key} 来自 ${hit}（沿途跳过了 ${path.length - 1} 层）`
    : `整条链（含 Object.prototype）都没有 ${key} → 结果是 undefined`
}

/** 展示「整条链长什么样」，顺便把 Object.prototype 的终点画出来 */
function traceChain() {
  const { child } = buildChain()
  const names: string[] = []
  let cur: object | null = child
  while (cur) {
    if (cur === Object.prototype) names.push('Object.prototype')
    else names.push((cur as { tag?: string }).tag ?? '（匿名）')
    cur = Object.getPrototypeOf(cur)
  }
  names.push('null（链的终点，返回 undefined 而不是报错）')
  lookupPath.value = names
  lookupResult.value = '这就是 [[Prototype]] 链：child → parent → grand → Object.prototype → null'
  chainNodes.value = []
}

// ==================== ② class 交互演示 ====================
class Counter {
  /** 静态属性（ES2022 起支持，等价于 Counter.tag = '计数器'） */
  static tag = '计数器'
  /** 私有字段：只能在类体内部访问，# 是语法的一部分，不是命名习惯 */
  #history: number[] = []
  /** 公开类字段：每个实例都有一份（在构造函数体执行前初始化） */
  v = 0

  constructor(start = 0) {
    this.v = start
  }
  /** 实例方法：定义在 Counter.prototype 上，所有实例共享同一个函数 */
  inc(step = 1) {
    if (!Number.isFinite(step)) throw new TypeError('step 必须是有限数字')
    this.v += step
    this.#history.push(this.v)
    return this.v
  }
  dec(step = 1) {
    return this.inc(-step)
  }
  reset() {
    this.v = 0
    this.#history = []
  }
  /** getter：像属性一样读，但是函数调用 */
  get label() {
    // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
    return this.v > 0 ? `正数(${this.v})` : this.v < 0 ? `负数(${this.v})` : '零'
  }
  /** setter：赋值时触发，可以做校验/联动 */
  set label(next: 'positive' | 'negative' | 'zero') {
    this.v = next === 'positive' ? Math.abs(this.v) : next === 'negative' ? -Math.abs(this.v) : 0
  }
  /** 私有方法：外部调用会直接 SyntaxError / TypeError */
  #snapshot() {
    return [...this.#history]
  }
  get history() {
    return this.#snapshot()
  }
  static describe() {
    return `我是 ${Counter.tag}`
  }
}

const counter = new Counter(1)
const counterV = ref(counter.v)
const counterHistory = ref<number[]>([])
const guardMsg = ref('')
function syncCounter() {
  counterV.value = counter.v
  counterHistory.value = counter.history
}
function doInc(n = 1) {
  guardMsg.value = ''
  counter.inc(n)
  syncCounter()
}
function doDec() {
  guardMsg.value = ''
  counter.dec()
  syncCounter()
}
function doReset() {
  counter.reset()
  guardMsg.value = ''
  syncCounter()
}
function doSetLabel(kind: 'positive' | 'negative' | 'zero') {
  guardMsg.value = ''
  counter.label = kind
  syncCounter()
}
function doBadStep() {
  try {
    counter.inc(Number('abc')) // NaN，被 inc 里的校验拦下
  } catch (e) {
    guardMsg.value = `${(e as Error).name}: ${(e as Error).message}（错误类型是 TypeError，见第 10 页）`
  }
}

// ==================== ③ new 做了四件事 ====================
const returnKind = ref<'primitive' | 'object'>('primitive')
const newResult = computed(() => {
  function Person(this: { name?: string; age?: number }, name: string, age: number) {
    this.name = name
    this.age = age
    if (returnKind.value === 'object') {
      return { name: '我是构造函数返回的对象', age: 0 }
    }
    return 123 as unknown as void // 返回原始值 → 被忽略，依然返回 this
  }
  const inst = new (Person as unknown as new (n: string, a: number) => { name?: string; age?: number })('小明', 18)
  return inst
})

// ==================== ④ 手写继承（不用 class） ====================
const inheritLog = ref<string[]>([])
// @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
function runInheritDemo() {
  const logs: string[] = []
  function Animal(this: Record<string, unknown>, name: string) {
    this.name = name
    logs.push(`Animal 构造函数执行，this.name = ${name}`)
  }
  Animal.prototype.speak = function speak(this: { name: string }) {
    return `${this.name} 发出声音`
  }
  function Dog(this: Record<string, unknown>, name: string) {
    Animal.call(this, name) // ① 借用父构造函数：初始化实例自有属性
    logs.push('Dog 构造函数执行（已经先调用了 Animal.call）')
  }
  // ② 关键一步：把 Dog.prototype 的 [[Prototype]] 指向 Animal.prototype
  Dog.prototype = Object.create(Animal.prototype)
  // ③ 修补 constructor（否则 dog.constructor 会指向 Animal）
  Dog.prototype.constructor = Dog
  // ④ 子类自己的方法
  Dog.prototype.speak = function speak(this: { name: string }) {
    return `${this.name} 汪汪叫`
  }

  const d = new (Dog as unknown as new (n: string) => { name: string; speak: () => string })('旺财')
  logs.push(`d.speak() → ${d.speak()}`)
  logs.push(`d instanceof Dog → ${d instanceof (Dog as unknown as new () => object)}`)
  logs.push(`d instanceof Animal → ${d instanceof Animal}`)
  logs.push(`d.constructor.name → ${(d as { constructor: { name: string } }).constructor.name}`)
  logs.push('链：d → Dog.prototype → Animal.prototype → Object.prototype → null')
  inheritLog.value = logs
}
</script>

<template>
  <div>
    <h1>9. 原型链与 Class</h1>
    <p class="lead">
      JS 没有「类继承」，只有<strong>一条沿着 <code>[[Prototype]]</code> 往上找的链</strong>：
      读属性时先在对象自己身上找，找不到就交给它的原型，直到 <code>null</code>。
      <code>class</code> 只是把「构造函数 + 原型方法 + 继承」包装得更规范，<strong>底层机制一模一样</strong>，
      但多了几条硬规矩（不提升、默认严格模式、必须用 <code>new</code> 调用）。
    </p>

    <!-- ============ 卡片 1：三个概念 + 查找过程 ============ -->
    <JsCard
      title="① prototype / __proto__ / getPrototypeOf 的区别与查找过程"
      hint="输入一个属性名，看它从哪一层被找到（这就是 [[Get]] 的真实过程）。"
      tone="ok"
    >
      <div class="row">
        <input v-model="lookupKey" placeholder="试试 say / level / tag / toString / 不存在" style="width: 200px" />
        <button class="primary" @click="runLookup">按名字查找</button>
        <button @click="traceChain">打印整条链</button>
      </div>
      <table class="pc-table" style="margin-top: 10px">
        <thead>
          <tr>
            <th>层级</th>
            <th>对象</th>
            <th>这一层的检查结果</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in chainNodes" :key="n.depth">
            <td>{{ n.depth }}</td>
            <td><code>{{ n.label }}</code></td>
            <td>{{ n.own }}</td>
          </tr>
          <tr v-if="!chainNodes.length">
            <td colspan="3">（点「按名字查找」开始）</td>
          </tr>
        </tbody>
      </table>
      <p class="kv" style="margin-top: 8px">{{ lookupResult }}</p>
      <pre class="code" style="margin-top: 10px">{{ lookupPath.join('  →  ') || '（点上面按钮）' }}</pre>
      <p class="hint" style="margin-top: 8px">
        注意：查找是<strong>逐步向上</strong>的，每层只做一次「自有属性」判断，
        所以链越长读得越慢（虽然现代引擎有内联缓存优化）。
        <code>in</code> 运算符也是同样的查找，但它<strong>会查整条链</strong>。
      </p>
      <div class="pc-grid">
        <pre class="code">// 三个东西别搞混
function F() {}
const f = new F()

// 1) F.prototype —— 只有【函数】有这个属性
//    它是「将来被 new 出来的实例」的原型对象
console.log(typeof F.prototype)          // 'object'
console.log(new F().__proto__ === F.prototype)  // true

// 2) f.__proto__ —— 每个对象都有（继承自 Object.prototype）
//    是 [[Prototype]] 的历史遗留访问器（getter/setter）
console.log(f.__proto__ === F.prototype)  // true
console.log(Object.prototype.__proto__)   // null（链的终点）

// 3) Object.getPrototypeOf(f) —— 标准、推荐、只读
console.log(Object.getPrototypeOf(f) === F.prototype)  // true

// 4) 顺带记住：只有函数有 prototype，
//    但【所有对象】都有 [[Prototype]]（函数也是对象，所以函数也有 __proto__）
//    F.__proto__ === Function.prototype
</pre>
        <pre class="code">// 手写一条链，观察「找不到就往上」的行为
const grand = { level: 3, who: 'grand' }
const parent = Object.create(grand)   // parent 的原型是 grand
parent.level = 2

const child = Object.create(parent)   // child 的原型是 parent
child.level = 1

console.log(child.level)    // 1  ← 自有属性最先命中
delete child.level
console.log(child.level)    // 2  ← 落到 parent
delete parent.level
console.log(child.level)    // 3  ← 再落到 grand

console.log(child.who)      // 'grand'（child/parent 都没有）
console.log(child.toString) // ƒ toString()  ← 一路找到 Object.prototype
console.log(child.missing)  // undefined（到 null 也没找到，不报错）

// 「遮蔽（shadowing）」：底层属性能盖住上层同名属性，
// 但不会修改上层 —— 这也是「原型是共享的」带来的双刃剑。
</pre>
      </div>
    </JsCard>

    <!-- ============ 卡片 2：new 到底做了什么 ============ -->
    <JsCard
      title="② new 做的四件事（以及返回值为啥会被忽略）"
      hint="切换「构造函数返回什么」，观察 new 的结果：返回原始值 → 被忽略；返回对象 → 顶替 this。"
      tone="warn"
    >
      <div class="row">
        <button :class="{ primary: returnKind === 'primitive' }" @click="returnKind = 'primitive'">
          return 123（原始值）
        </button>
        <button :class="{ primary: returnKind === 'object' }" @click="returnKind = 'object'">
          return {...}（对象）
        </button>
        <span class="kv">new Person('小明', 18) 的结果：</span>
      </div>
      <pre class="code" style="margin-top: 10px">{{ JSON.stringify(newResult, null, 2) }}</pre>
      <p class="hint" style="margin-top: 8px">
        当前结论：<strong>{{ returnKind === 'primitive' ? '返回原始值被忽略，拿到的是 this（name/age 都在）' : '返回对象顶替了 this，姓名变成了返回对象里的那个' }}</strong>
      </p>
      <ol class="pc-steps">
        <li>创建一个新对象 <code>{}</code>（更准确说是 <code>Object.create(F.prototype)</code>）。</li>
        <li>把函数里的 <code>this</code> 指向这个新对象。</li>
        <li>执行构造函数体（于是 <code>this.xxx = ...</code> 都写在了新对象上）。</li>
        <li>
          <strong>返回规则</strong>：构造函数显式返回一个<strong>对象</strong> → 用那个对象；
          返回<strong>原始值</strong>（或什么都不返回）→ 忽略，返回第 1 步的新对象。
        </li>
      </ol>
      <pre class="code" style="margin-top: 10px">// 手写一个 myNew，把这四件事摊开（面试常让写）
function myNew(Ctor, ...args) {
  // 1) 新对象的原型指向构造函数的 prototype
  const obj = Object.create(Ctor.prototype)
  // 2) 以 obj 为 this 执行构造函数
  const ret = Ctor.apply(obj, args)
  // 3+4) 只有返回「对象/函数」才顶替，返回原始值忽略
  return ret !== null &amp;&amp; (typeof ret === 'object' || typeof ret === 'function') ? ret : obj
}

// 验证：myNew(Person, '小明', 18) 与 new Person('小明', 18) 结果一致
</pre>
      <p class="hint" style="margin-top: 8px">
        另外：<code>new.target</code> 在构造函数里能判断「是不是被 new 调用的」，
        <code>class</code> 不用 new 直接调用会直接抛 <code>TypeError</code>（普通函数不会）。
      </p>
    </JsCard>

    <!-- ============ 卡片 3：class 语法 ============ -->
    <JsCard
      title="③ class 语法：字段 / 方法 / getter / static / 私有 #"
      hint="点按钮操作同一个 Counter 实例：实例方法改状态、getter 读、setter 写、静态成员属于类本身。"
    >
      <div class="row">
        <button class="primary" @click="doInc(1)">inc()</button>
        <button @click="doInc(5)">inc(5)</button>
        <button @click="doDec()">dec()</button>
        <button @click="doSetLabel('negative')">label = 'negative'（setter）</button>
        <button @click="doReset()">reset()</button>
        <button class="danger" @click="doBadStep">inc(NaN) → 抛 TypeError</button>
      </div>
      <div class="row" style="margin-top: 8px">
        <span class="tag info">counter.v = {{ counterV }}</span>
        <span class="tag">get label → {{ counterV > 0 ? '正数' : counterV < 0 ? '负数' : '零' }}</span>
        <span class="tag">static Counter.describe() → {{ Counter.describe() }}</span>
        <span class="tag warn">#history = [{{ counterHistory.join(', ') }}]</span>
      </div>
      <p class="hint" style="margin-top: 8px">{{ guardMsg || '提示：#history 只能通过 getter 读，外部写 counter.#history 是语法错误。' }}</p>
      <pre class="code" style="margin-top: 10px">class Counter {
  static tag = '计数器'                    // 静态字段：挂在 Counter 自己身上
  #history = []                           // 私有字段：外部完全访问不到
  v = 0                                   // 实例字段：每个实例一份

  constructor(start = 0) {
    this.v = start                        // class 里没有变量提升，必须 super 后才能用 this
  }

  inc(step = 1) { this.v += step; this.#history.push(this.v); return this.v }  // → Counter.prototype.inc
  get label() { return this.v > 0 ? '正数' : '零/负' }                        // → 原型上的 getter
  set label(kind) { this.v = kind === 'positive' ? Math.abs(this.v) : -Math.abs(this.v) }
  #snapshot() { return [...this.#history] }   // 私有方法
  get history() { return this.#snapshot() }    // 用公开 getter 暴露只读视图
  static describe() { return `我是 ${Counter.tag}` }   // 静态方法：this 指向类
}

const c = new Counter(1)
console.log(Object.keys(c))                        // ['v']  ← #history 根本不在键里
console.log(Object.getOwnPropertyNames(Counter.prototype))
// ['constructor', 'inc', 'dec', 'reset', 'label', 'history']  ← 方法都在原型上
console.log(Object.hasOwn(Counter.prototype, 'inc'))  // true
console.log(c.#history)                            // SyntaxError（类外访问私有字段）</pre>
    </JsCard>

    <!-- ============ 卡片 4：extends / super / instanceof ============ -->
    <JsCard
      title="④ extends 与 super：class 继承的对应关系"
      hint="class 继承 == 上面那四步手写继承，只是语法上帮你做完了；super 在构造函数里必须先于 this。"
    >
      <div class="pc-grid">
        <pre class="code">class Animal {
  constructor(name) {
    this.name = name                 // 实例自有属性
  }
  speak() { return `${this.name} 发出声音` }   // Animal.prototype.speak
  static create(name) { return new this(name) } // 静态方法里 this = 当前类
}

class Dog extends Animal {
  // 不写 constructor 时，等价于 constructor(...args) { super(...args) }
  speak() {
    return super.speak() + '：汪汪'   // super.speak() = 沿原型链找父类方法
  }
}

const d = new Dog('旺财')
console.log(d.name)                      // '旺财'（来自 Animal 构造函数）
console.log(d.speak())                   // '旺财 发出声音：汪汪'
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype)  // true
console.log(Object.getPrototypeOf(Dog) === Animal)                       // true（静态成员也继承）
console.log(d instanceof Dog, d instanceof Animal, d instanceof Object)  // true true true
console.log(Animal.create('喵').speak())  // 静态方法里的 this 指向调用它的类</pre>
        <pre class="code">// ① super 的两个用法，别搞混
class Sub extends Base {
  constructor() {
    super()          // 调用父类构造函数（必须在使用 this 之前）
    this.x = 1
  }
  method() {
    super.method()   // 访问父类原型上的方法（不是构造函数的调用）
  }
}

// 为什么 super() 必须在 this 之前？
// 因为子类实例的「初始化」是父类构造函数做的：
// 父类没跑完，this 还没被创建出来。
// 子类构造函数里 super() 之前访问 this → ReferenceError

// ② instanceof 的判定依据（不是看构造函数名字！）
// a instanceof B  等价于  B.prototype 是否出现在 a 的原型链上
function fake(proto, obj) {
  let cur = Object.getPrototypeOf(obj)
  while (cur) {
    if (cur === proto) return true
    cur = Object.getPrototypeOf(cur)
  }
  return false
}
console.log(fake(Animal.prototype, new Dog('x')))   // true

// ③ 想自定义 instanceof，用静态方法 Symbol.hasInstance
class ArrayLike {
  static [Symbol.hasInstance](x) { return Array.isArray(x) }
}
console.log([1, 2] instanceof ArrayLike)   // true（完全由你说了算）</pre>
      </div>
      <p class="hint" style="margin-top: 10px">
        <strong>面试常考</strong>：<code>class</code> 与「函数构造函数」不完全等价 ——
        ① class 声明<strong>不会提升</strong>（TDZ），必须在定义之后使用；
        ② class 内部代码<strong>默认严格模式</strong>；
        ③ class 只能通过 <code>new</code> 调用，直接调用抛 TypeError；
        ④ 类方法不可枚举（<code>for...in</code> 不会遍历到），函数构造函数挂在 prototype 上的方法是可枚举的。
      </p>
    </JsCard>

    <!-- ============ 卡片 5：完整断言对照 ============ -->
    <JsCard
      title="⑤ 断言对照：把上面每个说法都验一遍"
      hint="这些断言用的是页面里的真实原型链，✅ 说明结论成立。"
      :asserts="asserts1"
    >
      <p class="hint">
        第 2 条提醒：两个分开写的 <code>function F(){}</code> 是<strong>两个不同的函数</strong>，
        所以它们的 prototype 永不相等。想验证 <code>prototype.constructor</code>，必须先把函数存进变量：
      </p>
      <pre class="code" style="margin-top: 8px">const F = function () {}
console.log(F.prototype.constructor === F)   // true（这是引擎自动建立的「反向指针」）
// 手写继承时必须手动修回这一句：
//   Dog.prototype.constructor = Dog
// 否则 new Dog().constructor 会指向 Animal，凡是靠 constructor 判断类型的库都会出错</pre>
    </JsCard>

    <!-- ============ 卡片 6：速查表 + 项目联想 ============ -->
    <JsCard title="⑥ 速查表、常见坑，以及为什么 Vue 到处用「对象描述符」" tone="danger">
      <table class="pc-table">
        <thead>
          <tr>
            <th>概念</th>
            <th>属于谁</th>
            <th>怎么读</th>
            <th>易错点</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>prototype</code></td>
            <td>只有函数有</td>
            <td><code>F.prototype</code></td>
            <td>它不是实例的原型，而是「new 出来的实例的原型」</td>
          </tr>
          <tr>
            <td><code>[[Prototype]]</code></td>
            <td>所有对象都有</td>
            <td><code>Object.getPrototypeOf(o)</code></td>
            <td>没有官方写法的「o.[[Prototype]]」；<code>__proto__</code> 只是访问器</td>
          </tr>
          <tr>
            <td><code>__proto__</code></td>
            <td>继承自 Object.prototype 的访问器</td>
            <td><code>o.__proto__</code></td>
            <td><code>Object.create(null)</code> 的对象没有它，会直接报/取到 undefined</td>
          </tr>
          <tr>
            <td><code>constructor</code></td>
            <td>原型对象上的一个普通属性</td>
            <td><code>o.constructor</code></td>
            <td>可被改写；手写继承时若忘了修，类型判断全错</td>
          </tr>
          <tr>
            <td><code>instanceof</code></td>
            <td>一条链的包含判断</td>
            <td><code>a instanceof B</code></td>
            <td>跨 iframe / 跨 realm 会失败（不同的 Object.prototype）</td>
          </tr>
          <tr>
            <td>类字段 <code>v = 0</code></td>
            <td>每个实例一份</td>
            <td><code>Object.keys(inst)</code></td>
            <td>在 constructor 体之前初始化，所以会「覆盖」构造函数里更早的赋值顺序预期</td>
          </tr>
          <tr>
            <td>私有 <code>#x</code></td>
            <td>只有类体内部</td>
            <td>类外不可读、不可写、不在键里</td>
            <td>不是约定，是语法硬约束；<code>JSON.stringify</code> 也拿不到</td>
          </tr>
        </tbody>
      </table>
      <ul class="pc-notes">
        <li>
          <strong>坑 1：改共享原型会影响所有实例。</strong>
          <code>Array.prototype.foo = 1</code> 会污染全局（这也是「不要扩展内置原型」的原因）。
        </li>
        <li>
          <strong>坑 2：把方法写在构造函数里。</strong>
          <code>function F() { this.hi = () => {} }</code> 每个实例都新建一个函数，
          内存是写在 prototype 上的 N 倍。class 的方法自动放在原型上，就是为了避免这个。
        </li>
        <li>
          <strong>坑 3：<code>for...in</code> 会遍历原型链上的可枚举属性。</strong>
          用 <code>Object.keys</code> / <code>hasOwnProperty</code> / <code>Object.hasOwn</code> 更安全。
        </li>
        <li>
          <strong>坑 4：<code>Object.create(null)</code> 的用途。</strong>
          当「字典 / 映射表」用：没有原型，就不可能被 <code>toString</code>、<code>constructor</code>
          这类键名意外命中（<code>Map</code> 之前的标准做法）。
        </li>
        <li>
          <strong>与本项目的联想（重要）。</strong>
          Vue 3 的组件选项、props 校验、路由 meta、Pinia 的 options
          <strong>大量使用「对象描述符」而不是类实例</strong>：
          <code>props: { title: { type: String, required: true, default: '' } }</code>
          这个写法之所以可行，正是因为 JS 里「对象字面量 + 原型链 + 属性查找」足够灵活、
          而<strong>对象可以被任意结构地描述与遍历</strong>（框架只需要读 key 做校验，不需要你 new 一个类）。
          反过来，<code>Proxy</code> / <code>Reflect</code>（第 12 页）能拦截的也正是这套
          「属性读取 → 沿原型链查找」的底层行为。
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
.pc-table {
  font-size: 12.5px;
}
.pc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 10px;
  margin-top: 10px;
}
.pc-steps {
  margin: 10px 0 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
}
.pc-notes {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.8;
}
.pc-notes strong {
  color: var(--c-text);
}
</style>
