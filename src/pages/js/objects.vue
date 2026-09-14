<script setup lang="ts">
import { ref } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 5. 对象、原型与解构
 *
 *   ① 字面量、属性访问（点 vs 方括号）、简写、计算属性名、遍历顺序
 *   ② 可选链 ?. 与空值合并 ??（附与 || 的对照实验台）
 *   ③ 解构赋值：默认值 / 重命名 / 嵌套 / 函数参数 / 交换变量
 *   ④ Object 静态方法：keys / values / entries / assign / fromEntries / freeze / create / hasOwn
 *   ⑤ 属性描述符（writable / enumerable / configurable）与 getter / setter
 *   ⑥ 「对象的 8 个常用招式」+ 常见坑清单
 *
 * 原型的深入部分（__proto__ / 原型链 / 继承 / class）放在第 9 页，这里只讲「不会用错」的部分。
 * ========================================================================== */

/** 把可能抛错的表达式包起来（断言区不能直接抛，否则整页白屏） */
function probe(fn: () => unknown): string {
  try {
    return String(fn())
  } catch (e) {
    return (e as Error).name
  }
}

// ---------------------------------------------------------------------------
// ① 字面量、属性访问与遍历顺序
// ---------------------------------------------------------------------------
const assertsBasics = [
  { expr: "o.a 与 o['a'] 等价", actual: (() => {
      const o = { a: 1 }
      return `${o.a}/${o['a']}`
    })(), expected: '1/1' },
  {
    expr: '方括号里可以放变量 / 表达式（点号不行）',
    actual: (() => {
      const key = 'a'
      const o: Record<string, number> = { a: 7 }
      return o[key]
    })(),
    expected: 7,
  },
  {
    expr: '属性简写：{ name } 等于 { name: name }',
    actual: (() => {
      const name = '小明'
      const o = { name }
      return o.name
    })(),
    expected: '小明',
  },
  {
    expr: "计算属性名：{ ['k' + 1]: 1 }",
    actual: (() => {
      const k = 'k'
      return JSON.stringify({ [k + 1]: 1 })
    })(),
    expected: '{"k1":1}',
  },
  {
    expr: '方法简写：{ hi() {} }',
    actual: (() => {
      const o = {
        hi() {
          return 'hi'
        },
      }
      return o.hi()
    })(),
    expected: 'hi',
  },
  { expr: '访问不存在的属性得到 undefined', actual: ({ b: 1 } as { a?: number }).a, expected: undefined },
  {
    expr: '读取 undefined 的属性 → TypeError',
    actual: probe(() => ({} as any).a.b),
    expected: 'TypeError',
    note: '这就是可选链 ?. 要解决的问题',
  },
  { expr: '属性名永远是字符串', actual: typeof Object.keys({ 1: 'x' })[0], expected: 'string' },
  {
    expr: '整数键会被提前并按升序排列：{ b, 2, a, 1 }',
    actual: Object.keys({ b: 1, 2: 1, a: 1, 1: 1 }).join(','),
    expected: '1,2,b,a',
    note: '遍历顺序 = 整数键升序 → 其余字符串键按插入顺序 → Symbol 键（单独取）',
  },
  { expr: '插入顺序：{ a, b }', actual: Object.keys({ a: 1, b: 2 }).join(','), expected: 'a,b' },
  {
    expr: '数组的键就是下标字符串集合',
    actual: Object.keys(['x', 'y']).join(','),
    expected: '0,1',
  },
  {
    expr: '对象里存函数 = 方法，可以用 this',
    actual: (() => {
      const o = {
        n: 2,
        double() {
          return this.n * 2
        },
      }
      return o.double()
    })(),
    expected: 4,
  },
]

// ---------------------------------------------------------------------------
// ② 可选链与空值合并（+ 交互）
// ---------------------------------------------------------------------------
const nilOptions = [
  { key: 'zero', label: '0（number）', value: 0 as unknown },
  { key: 'empty', label: "''（空串）", value: '' as unknown },
  { key: 'nan', label: 'NaN', value: NaN as unknown },
  { key: 'false', label: 'false', value: false as unknown },
  { key: 'null', label: 'null', value: null as unknown },
  { key: 'undef', label: 'undefined', value: undefined as unknown },
  { key: 'text', label: "'有值'", value: '有值' as unknown },
]
const nilLeftKey = ref('zero')
const nilRightKey = ref('text')
function nilPick(key: string): unknown {
  return nilOptions.find((o) => o.key === key)!.value
}
const nilLeft = ref(nilPick('zero'))
const nilRight = ref(nilPick('text'))
function nilRefresh() {
  nilLeft.value = nilPick(nilLeftKey.value)
  nilRight.value = nilPick(nilRightKey.value)
}
function nilShow(v: unknown): string {
  if (typeof v === 'string') return `'${v}'`
  if (typeof v === 'number' && Number.isNaN(v)) return 'NaN'
  if (v === undefined) return 'undefined'
  if (v === null) return 'null'
  return String(v)
}

const assertsNullish = [
  { expr: 'null?.a', actual: (null as any)?.a, expected: undefined },
  { expr: 'undefined?.a', actual: (undefined as any)?.a, expected: undefined },
  { expr: '({ a: { b: 1 } })?.a?.b', actual: { a: { b: 1 } }?.a?.b, expected: 1 },
  { expr: '({}).a?.b（中间断了就短路）', actual: ({} as { a?: { b?: number } }).a?.b, expected: undefined },
  {
    expr: '可选链会短路后面整个表达式（不会继续取 .b.c）',
    actual: (() => {
      const o: { a?: { b: { c: number } } } | null = null
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      return o?.a?.b.c
    })(),
    expected: undefined,
  },
  {
    expr: '可选调用：o.fn?.()',
    actual: (() => {
      const o: { fn?: () => number } = {}
      return o.fn?.()
    })(),
    expected: undefined,
  },
  {
    expr: '可选调用真的会调用（有值的情况）',
    actual: (() => {
      const o = { fn: () => 42 }
      return o.fn?.()
    })(),
    expected: 42,
  },
  {
    expr: '可选下标：arr?.[5]',
    actual: (() => {
      const arr: number[] = [1]
      return arr?.[5]
    })(),
    expected: undefined,
  },

  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: '0 ?? 1（0 是有效值）', actual: 0 ?? 1, expected: 0 },
  { expr: '0 || 1（0 是 falsy，被替换了）', actual: 0 || 1, expected: 1 },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: "'' ?? 'x'", actual: '' ?? 'x', expected: '' },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: "'' || 'x'", actual: '' || 'x', expected: 'x' },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: 'null ?? "x"', actual: null ?? 'x', expected: 'x' },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: 'undefined ?? "x"', actual: undefined ?? 'x', expected: 'x' },
  { expr: 'NaN ?? 1（NaN 不是 nullish）', actual: NaN ?? 1, expected: NaN },
  { expr: 'NaN || 1（NaN 是 falsy）', actual: NaN || 1, expected: 1 },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: 'false ?? true', actual: false ?? true, expected: false },
  { expr: 'false || true', actual: false || true, expected: true },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: 'null ?? undefined ?? "兜底"（可以连写）', actual: null ?? undefined ?? '兜底', expected: '兜底' },
  {
    expr: '??= 只在左边是 null/undefined 时赋值',
    actual: (() => {
      const o: { a: number | null; b: number | null } = { a: null, b: 0 }
      o.a ??= 9
      o.b ??= 9
      return `${o.a},${o.b}`
    })(),
    expected: '9,0',
    note: '对比 ||= ：因为 0 是 falsy，o.b ||= 9 会把它改成 9',
  },
  {
    expr: '||= 会把 0 也替换掉',
    actual: (() => {
      const o: { b: number | null } = { b: 0 }
      o.b ||= 9
      return o.b
    })(),
    expected: 9,
  },
]

// ---------------------------------------------------------------------------
// ③ 解构赋值
// ---------------------------------------------------------------------------
const assertsDestructure = [
  {
    expr: '对象解构 + 默认值：const { a = 1, b = 2 } = {}',
    actual: (() => {
      const cfg: { a?: number; b?: number } = {}
      const { a = 1, b = 2 } = cfg
      return a + b
    })(),
    expected: 3,
  },
  {
    expr: '重命名：{ a: x }',
    actual: (() => {
      const { a: x = 5 } = {} as { a?: number }
      return x
    })(),
    expected: 5,
  },
  {
    expr: '默认值只在 undefined 时生效（null 不会触发）',
    actual: (() => {
      const { a = 1 } = { a: null } as { a: number | null }
      return String(a)
    })(),
    expected: 'null',
    note: '想兜住 null 得写 const a = obj.a ?? 1',
  },
  {
    expr: '嵌套解构：{ a: { b } }',
    actual: (() => {
      const {
        a: { b },
      } = { a: { b: 7 } }
      return b
    })(),
    expected: 7,
  },
  {
    expr: '嵌套 + 默认值：整段都能兜底',
    actual: (() => {
      const { a: { b = 9 } = {} } = {} as { a?: { b?: number } }
      return b
    })(),
    expected: 9,
  },
  {
    expr: '数组解构可以跳位：[first, , third]',
    actual: (() => {
      const [first, , third] = [1, 2, 3]
      return `${first},${third}`
    })(),
    expected: '1,3',
  },
  {
    expr: '交换变量：[x, y] = [y, x]',
    actual: (() => {
      let x = 1
      let y = 2
      ;[x, y] = [y, x]
      return `${x},${y}`
    })(),
    expected: '2,1',
  },
  {
    expr: '剩余属性：const { a, ...rest } = obj',
    actual: (() => {
      const { a, ...rest } = { a: 1, b: 2, c: 3 }
      void a
      return JSON.stringify(rest)
    })(),
    expected: '{"b":2,"c":3}',
    note: '常用于「剔除某个字段」，注意 rest 是浅拷贝',
  },
  {
    expr: '剩余元素（数组）：const [first, ...others] = arr',
    actual: (() => {
      const [first, ...others] = [1, 2, 3]
      return `${first}|${others.join(',')}`
    })(),
    expected: '1|2,3',
  },
  {
    expr: '函数参数解构 + 每个参数各自的默认值',
    actual: (({ a = 1, b = 1 } = {}) => a + b)(),
    expected: 2,
  },
  {
    expr: '整个参数对象的默认值（调用时不传也不报错）',
    actual: ((opts: { n?: number } = {}) => opts.n ?? 0)(),
    expected: 0,
  },
  {
    expr: '解构函数返回值',
    actual: (() => {
      const f = (): [number, number] => [1, 2]
      const [a, b] = f()
      return a + b
    })(),
    expected: 3,
  },
  {
    expr: "字符串也能解构（它是可迭代的）",
    actual: (() => {
      const [x, y] = 'ab'
      return `${x}${y}`
    })(),
    expected: 'ab',
  },
  {
    expr: '遍历对象：for (const [k, v] of Object.entries(obj))',
    actual: (() => {
      const out: string[] = []
      for (const [k, v] of Object.entries({ a: 1, b: 2 })) out.push(`${k}=${v}`)
      return out.join(',')
    })(),
    expected: 'a=1,b=2',
  },
]

// ---------------------------------------------------------------------------
// ③ 解构（演示代码）
// ---------------------------------------------------------------------------
const runDestructure = `console.log('=== 对象解构 ===')
const user = { name: '小明', age: 18, address: { city: '杭州' } }

const { name, age } = user
console.log(name, age)

const { name: nickName } = user                      // 重命名
console.log('昵称：', nickName)

const { gender = '未知' } = user                     // 默认值（undefined 才生效）
console.log('性别：', gender)

const { nothing = 1 } = { nothing: null }            // null 不触发默认值
console.log('null 不会用默认值：', nothing)

const { address: { city } } = user                   // 嵌套解构
console.log('城市：', city)

const { name: n2, ...rest } = user                   // 剩余属性
console.log('其余字段：', rest)

console.log('')
console.log('=== 数组解构 ===')
const [first, , third] = [1, 2, 3]                   // 跳位
console.log(first, third)

let x = 1, y = 2
;[x, y] = [y, x]                                     // 交换变量
console.log('交换后：', x, y)

const [head, ...tail] = [1, 2, 3, 4]
console.log('head =', head, '/ tail =', tail)

console.log('')
console.log('=== 函数参数解构（工具函数里天天用）===')
function createUser({ name = '匿名', age = 0, tags = [] } = {}) {
  return { name, age, tags }
}
console.log(createUser())
console.log(createUser({ name: '小红', age: 16 }))

console.log('')
console.log('=== 遍历对象：Object.entries + 解构 ===')
const scores = { 语文: 90, 数学: 95 }
for (const [subject, score] of Object.entries(scores)) {
  console.log('  ' + subject + ' = ' + score)
}
console.log('只要值：', Object.values(scores))
console.log('只要键：', Object.keys(scores))`

// ---------------------------------------------------------------------------
// ④ Object 静态方法
// ---------------------------------------------------------------------------
const assertsStatic = [
  { expr: 'Object.keys({ a: 1, b: 2 })', actual: Object.keys({ a: 1, b: 2 }).join(','), expected: 'a,b' },
  { expr: 'Object.values({ a: 1, b: 2 })', actual: Object.values({ a: 1, b: 2 }).join(','), expected: '1,2' },
  {
    expr: 'Object.entries + map 拼字符串',
    actual: Object.entries({ a: 1 }).map(([k, v]) => `${k}=${v}`).join(','),
    expected: 'a=1',
  },
  {
    expr: 'Object.fromEntries（entries 的逆运算）',
    actual: JSON.stringify(Object.fromEntries([['a', 1], ['b', 2]])),
    expected: '{"a":1,"b":2}',
  },
  {
    expr: 'Object.fromEntries(new Map(...))（Map 转对象）',
    actual: JSON.stringify(Object.fromEntries(new Map([['a', 1]]))),
    expected: '{"a":1}',
  },
  {
    expr: 'Object.fromEntries 还能顺手做转换（价格 ×100）',
    actual: JSON.stringify(Object.fromEntries(Object.entries({ a: 1, b: 2 }).map(([k, v]) => [k, v * 100]))),
    expected: '{"a":100,"b":200}',
  },
  {
    expr: 'Object.assign({}, a, b) 合并（返回目标对象）',
    actual: JSON.stringify(Object.assign({}, { a: 1 }, { b: 2 })),
    expected: '{"a":1,"b":2}',
  },
  {
    expr: 'Object.assign 会改第一个参数（第一个是 target）',
    actual: (() => {
      const target: Record<string, number> = { a: 1 }
      Object.assign(target, { b: 2 })
      return JSON.stringify(target)
    })(),
    expected: '{"a":1,"b":2}',
    note: '想返回新对象就传 {} 当目标',
  },
  {
    expr: '后面的覆盖前面的',
    actual: JSON.stringify(Object.assign({}, { a: 1 }, { a: 2 })),
    expected: '{"a":2}',
  },
  {
    expr: 'Object.assign 是浅拷贝',
    actual: (() => {
      const src = { a: { n: 1 } }
      const copy = Object.assign({}, src)
      copy.a.n = 9
      return src.a.n
    })(),
    expected: 9,
  },
  { expr: "Object.hasOwn({ a: 1 }, 'a')", actual: Object.hasOwn({ a: 1 }, 'a'), expected: true },
  {
    expr: "Object.hasOwn({}, 'toString')",
    actual: Object.hasOwn({}, 'toString'),
    expected: false,
    note: 'hasOwn 只看「自己的属性」，这是它和 in 的关键区别',
  },
  {
    expr: "'toString' in {}（in 会查原型链）",
    actual: 'toString' in {},
    expected: true,
    note: '用 in 判断字段存在时，会被原型上的方法骗到',
  },
  {
    expr: 'Object.freeze 是浅冻结',
    actual: (() => {
      const o: { a: number; n: { b: number } } = Object.freeze({ a: 1, n: { b: 2 } })
      try {
        ;(o as { a: number }).a = 99
      } catch {
        /* 严格模式下会抛 TypeError，这里忽略，继续看嵌套属性 */
      }
      o.n.b = 99
      return `${o.a},${o.n.b}`
    })(),
    expected: '1,99',
    note: '冻结后第一层改不动，但嵌套对象照样能改 → 深冻结要递归',
  },
  {
    expr: '严格模式下给冻结属性赋值抛 TypeError',
    actual: probe(() => {
      const o = Object.freeze({ a: 1 }) as { a: number }
      o.a = 2
    }),
    expected: 'TypeError',
  },
  { expr: 'Object.isFrozen({})', actual: Object.isFrozen({}), expected: false },
  {
    expr: 'Object.create(null) 造出的对象没有原型',
    actual: Object.getPrototypeOf(Object.create(null)),
    expected: null,
    note: '常用作「纯字典」，避免 key 撞上 toString 之类的原型方法',
  },
  {
    expr: 'Object.create(null) 没有继承来的方法',
    actual: (() => {
      const dict = Object.create(null) as Record<string, number>
      dict.a = 1
      return typeof (dict as { toString?: unknown }).toString
    })(),
    expected: 'undefined',
  },
  {
    expr: 'Object.entries 会把数字键排前面（与 Object.keys 一致）',
    actual: Object.entries({ b: 1, 1: 2 })
      .map(([k]) => k)
      .join(','),
    expected: '1,b',
  },
]

// ---------------------------------------------------------------------------
// ⑤ 属性描述符与 getter / setter（+ 交互）
// ---------------------------------------------------------------------------
let descV = 0
const descObj = {
  get x() {
    return descV
  },
  set x(n: number) {
    descV = n * 2
  },
}
const descRO: Record<string, unknown> = {}
Object.defineProperty(descRO, 'ro', { get: () => '只读值', enumerable: true })

const descInput = ref('5')
const descLog = ref<string[]>([])
function applySetter() {
  const n = Number(descInput.value) || 0
  descObj.x = n
  descLog.value.unshift(`o.x = ${n} → setter 里存成 descV = ${descV} → 再读 o.x 得到 ${descObj.x}`)
}
function trySetReadonly() {
  try {
    descRO.ro = '新值'
    descLog.value.unshift('ro = "新值" → 居然成功了')
  } catch (e) {
    descLog.value.unshift(`ro = "新值" → ${(e as Error).name}（只定义了 getter，严格模式下抛错）`)
  }
}

const assertsDescriptor = [
  {
    expr: '普通属性的三个开关默认都是 true',
    actual: (() => {
      const d = Object.getOwnPropertyDescriptor({ a: 1 }, 'a')!
      return `${d.writable},${d.enumerable},${d.configurable}`
    })(),
    expected: 'true,true,true',
  },
  {
    expr: 'Object.defineProperty 的开关默认都是 false（writable）',
    actual: (() => {
      const o: Record<string, number> = {}
      Object.defineProperty(o, 'x', { value: 1 })
      const d = Object.getOwnPropertyDescriptor(o, 'x')!
      return `${d.writable},${d.enumerable},${d.configurable}`
    })(),
    expected: 'false,false,false',
    note: '这是最容易踩的坑：defineProperty 不写就是全部关闭',
  },
  {
    expr: '不可枚举 → 不出现在 Object.keys / JSON 里',
    actual: (() => {
      const o: Record<string, number> = {}
      Object.defineProperty(o, 'x', { value: 1, enumerable: false })
      return `${Object.keys(o).length}|${JSON.stringify(o)}`
    })(),
    expected: '0|{}',
  },
  {
    expr: '但直接读还是读得到',
    actual: (() => {
      const o: Record<string, number> = {}
      Object.defineProperty(o, 'x', { value: 1, enumerable: false })
      return o.x
    })(),
    expected: 1,
  },
  {
    expr: 'Object.getOwnPropertyNames 能看到不可枚举属性',
    actual: (() => {
      const o: Record<string, number> = {}
      Object.defineProperty(o, 'x', { value: 1, enumerable: false })
      return Object.getOwnPropertyNames(o).join(',')
    })(),
    expected: 'x',
  },
  {
    expr: 'writable: false 时赋值抛 TypeError（严格模式）',
    actual: probe(() => {
      const o: Record<string, number> = {}
      Object.defineProperty(o, 'x', { value: 1, writable: false })
      o.x = 2
    }),
    expected: 'TypeError',
  },
  {
    expr: 'getter 可以让「读取」变成计算：o.x = 5 → 读回 10',
    actual: (() => {
      let v = 0
      const o = {
        get x() {
          return v
        },
        set x(n: number) {
          v = n * 2
        },
      }
      o.x = 5
      return o.x
    })(),
    expected: 10,
    note: '这就是 Vue 3 响应式（ref / reactive）的核心机制：把读写都换成函数',
  },
  {
    expr: '只有 getter、没有 setter → 赋值抛 TypeError（严格模式）',
    actual: probe(() => {
      const o = {
        get x() {
          return 1
        },
      } as { x: number }
      o.x = 2
    }),
    expected: 'TypeError',
  },
  {
    expr: 'getter 每次读取都会执行（不是缓存值）',
    actual: (() => {
      let calls = 0
      const o = {
        get x() {
          calls++
          return calls
        },
      }
      void o.x
      void o.x
      return calls
    })(),
    expected: 2,
  },
  {
    expr: '属性描述符也影响 console.log / 展开（只复制可枚举）',
    actual: (() => {
      const o: Record<string, number> = {}
      Object.defineProperty(o, 'x', { value: 1, enumerable: false })
      Object.defineProperty(o, 'y', { value: 2, enumerable: true })
      return JSON.stringify({ ...o })
    })(),
    expected: '{"y":2}',
  },
]

// ---------------------------------------------------------------------------
// ⑥ 常用招式与坑清单（纯展示）
// ---------------------------------------------------------------------------
</script>

<template>
  <div>
    <h1>5. 对象、原型与解构</h1>
    <p class="lead">
      <strong><code>?.</code> 和 <code>??</code> 解决的是「后端字段可能是 null」这类问题</strong>：
      <code>?.</code> 短路取值，<code>??</code> 只在 <code>null / undefined</code> 时兜底（
      <code>||</code> 连 <code>0</code>、<code>''</code>、<code>false</code> 一起吃掉）；
      <strong>解构默认值也只在 <code>undefined</code> 时生效</strong>；<code>Object.keys</code> 只返回「自己的、可枚举的、字符串键」。
    </p>

    <JsCard
      title="① 属性访问、简写、计算属性名与遍历顺序"
      hint="点号适合固定字段名，方括号适合动态键名；对象的键永远是字符串（Symbol 除外）。"
      :asserts="assertsBasics"
    >
      <pre class="ob-code">const key = 'name'

const user = {
  [key]: '小明',        // 计算属性名：键由变量决定
  age: 18,              // 普通属性
  sayHi() {             // 方法简写（不要写 sayHi: function () {}）
    return this.age
  },
}

user.name        // '小明'   ← 固定字段用点号
user[key]        // '小明'   ← 动态字段用方括号
user['age']      // 18
user.none        // undefined（不报错）
user.none.deep   // ✗ TypeError（所以需要 ?.）</pre>
      <table class="ob-table">
        <thead>
          <tr>
            <th>键的类型</th>
            <th>遍历顺序</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>整数样式的字符串键（<code>"1"</code>、<code>"10"</code>）</td>
            <td><strong>先输出，且按数值升序</strong></td>
          </tr>
          <tr>
            <td>其他字符串键</td>
            <td>按创建（插入）顺序</td>
          </tr>
          <tr>
            <td>Symbol 键</td>
            <td>不参与 <code>for...in</code> / <code>Object.keys</code>，要用 <code>Object.getOwnPropertySymbols</code></td>
          </tr>
          <tr>
            <td>不可枚举属性（defineProperty 没写 enumerable）</td>
            <td>被 <code>Object.keys</code> / 展开 / JSON 全部忽略</td>
          </tr>
        </tbody>
      </table>
      <p class="ob-note">
        「对象的遍历顺序」在面试里问得不少：<strong>整数键升序 → 字符串键插入顺序 → Symbol</strong>。
        想严格按插入顺序遍历，就用 <code>Map</code>（第 6 页）。
      </p>
    </JsCard>

    <JsCard
      title="② 可选链 ?. 与空值合并 ??"
      hint="改一下两个下拉框，直接看 || 和 ?? 的分歧点：0 / '' / NaN / false 就是全部区别。"
      :asserts="assertsNullish"
      tone="ok"
    >
      <template #extra>
        <select v-model="nilLeftKey" class="ob-mini" @change="nilRefresh">
          <option v-for="o in nilOptions" :key="o.key" :value="o.key">{{ o.label }}</option>
        </select>
        <select v-model="nilRightKey" class="ob-mini" @change="nilRefresh">
          <option v-for="o in nilOptions" :key="o.key" :value="o.key">{{ o.label }}</option>
        </select>
      </template>
      <p class="ob-result">
        {{ nilShow(nilLeft) }} <strong>??</strong> {{ nilShow(nilRight) }} →
        <strong>{{ nilShow(nilLeft ?? nilRight) }}</strong> ｜ {{ nilShow(nilLeft) }} <strong>||</strong>
        {{ nilShow(nilRight) }} → <strong>{{ nilShow(nilLeft || nilRight) }}</strong>
      </p>
      <table class="ob-table">
        <thead>
          <tr>
            <th>写法</th>
            <th>生效条件</th>
            <th>典型用途</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>a?.b</code></td>
            <td>a 是 null / undefined 时整段返回 undefined（短路，不再往下求值）</td>
            <td>后端可选字段：<code>res.data?.list?.length</code></td>
          </tr>
          <tr>
            <td><code>a?.()</code> / <code>a?.[i]</code></td>
            <td>同上，用于函数调用和下标</td>
            <td>可选回调、可选数组项</td>
          </tr>
          <tr>
            <td><code>a ?? b</code></td>
            <td>只有 a 是 <strong>null / undefined</strong> 才用 b</td>
            <td>配置兜底：<code>pageSize ?? 10</code></td>
          </tr>
          <tr>
            <td><code>a || b</code></td>
            <td>a 是任何 falsy 值（0、''、NaN、false）都用 b</td>
            <td>只想「空就兜底」时反而会误伤 0</td>
          </tr>
          <tr>
            <td><code>a ??= b</code></td>
            <td>a 是 null / undefined 时才赋值</td>
            <td>懒初始化：<code>cache[key] ??= create()</code></td>
          </tr>
        </tbody>
      </table>
      <p class="ob-note">
        语法提醒：<code>??</code> 不能和 <code>||</code> / <code>&amp;&amp;</code> 不加括号地混用
        （<code>a ?? b || c</code> 是语法错误），因为设计者不想让你猜优先级。
      </p>
    </JsCard>

    <JsCard
      title="③ 解构赋值全家桶"
      hint="解构默认值的触发条件是「undefined」，不是「假值」—— 所以 null 不会触发默认值。"
      :asserts="assertsDestructure"
      :runnable="runDestructure"
    >
      <pre class="ob-code">// Vue 里最常见的解构写法
const props = defineProps&lt;&#123;
  title?: string
  pageSize?: number
&#125;&gt;()

const &#123; title = '默认标题', pageSize = 10 &#125; = props

// 从 store / composable 返回值里解构（注意响应式丢失问题）
const &#123; count, increment &#125; = useCounter()</pre>
      <p class="ob-note">
        Vue 重要提醒：从 <code>reactive</code> 对象解构出来的基本类型会<strong>丢掉响应式</strong>
        （解构出来的只是当时的值）；从 <code>ref</code> 解构也一样。
        需要保持响应式就用 <code>toRefs(state)</code>，或者干脆不解构、直接用
        <code>state.count</code>。
      </p>
    </JsCard>

    <JsCard
      title="④ Object 静态方法"
      hint="记两个最常用的组合：Object.entries 用来遍历对象，Object.assign({}, a, b) 用来合并配置。"
      :asserts="assertsStatic"
    >
      <table class="ob-table">
        <thead>
          <tr>
            <th>方法</th>
            <th>作用</th>
            <th>要点</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>Object.keys / values / entries</code></td>
            <td>取键 / 值 / [键, 值] 数组</td>
            <td>只包含<strong>自己的、可枚举的、字符串键</strong></td>
          </tr>
          <tr>
            <td><code>Object.fromEntries(entries)</code></td>
            <td>数组 → 对象</td>
            <td>和 entries 互为逆运算，配合 map 做批量转换</td>
          </tr>
          <tr>
            <td><code>Object.assign(target, ...sources)</code></td>
            <td>合并到 target 并返回它</td>
            <td>会改第一个参数，是浅拷贝</td>
          </tr>
          <tr>
            <td><code>Object.hasOwn(obj, key)</code></td>
            <td>判断自有属性</td>
            <td>比 <code>in</code> 准（<code>in</code> 会查原型链）</td>
          </tr>
          <tr>
            <td><code>Object.freeze(obj)</code></td>
            <td>冻结（只读）</td>
            <td>浅冻结；严格模式下赋值抛 TypeError</td>
          </tr>
          <tr>
            <td><code>Object.create(proto)</code></td>
            <td>按指定原型创建对象</td>
            <td><code>Object.create(null)</code> 可造出无原型的纯字典</td>
          </tr>
          <tr>
            <td><code>Object.getOwnPropertyDescriptor</code></td>
            <td>读属性的三个开关</td>
            <td>配合 <code>defineProperty</code> 用</td>
          </tr>
        </tbody>
      </table>
      <pre class="ob-code">// 项目里最常见的两个组合
// 1) 遍历对象（比 for...in 安全：不会带上原型链上的属性）
Object.entries(config).forEach(([key, value]) =&gt; console.log(key, value))

// 2) 合并默认配置：后面的覆盖前面的
const options = &#123; ...defaults, ...userOptions &#125;
// 等价的老写法：Object.assign(&#123;&#125;, defaults, userOptions)</pre>
    </JsCard>

    <JsCard
      title="⑤ 属性描述符与 getter / setter"
      hint="点一下按钮：setter 把输入的数字乘 2 存起来，getter 每次读取都会重新执行 —— 这就是 Vue 响应式的原理。"
      :asserts="assertsDescriptor"
      tone="warn"
    >
      <template #extra>
        <input v-model="descInput" class="ob-num" placeholder="数字" />
        <button class="primary" @click="applySetter">执行 o.x = 值</button>
        <button @click="trySetReadonly">给只读属性赋值</button>
      </template>
      <pre class="code ob-log">{{ descLog.slice(0, 6).join('\n') || '（还没有记录）' }}</pre>
      <table class="ob-table">
        <thead>
          <tr>
            <th>描述符</th>
            <th>默认（普通字面量）</th>
            <th>默认（defineProperty 不写时）</th>
            <th>作用</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>writable</code></td>
            <td>true</td>
            <td><strong>false</strong></td>
            <td>能否改值（严格模式赋值会抛错，非严格模式静默失败）</td>
          </tr>
          <tr>
            <td><code>enumerable</code></td>
            <td>true</td>
            <td><strong>false</strong></td>
            <td>是否出现在 keys / for...in / 展开 / JSON 中</td>
          </tr>
          <tr>
            <td><code>configurable</code></td>
            <td>true</td>
            <td><strong>false</strong></td>
            <td>能否删除或重新定义该属性</td>
          </tr>
          <tr>
            <td><code>get / set</code></td>
            <td>—</td>
            <td>—</td>
            <td>把读 / 写变成函数调用（Vue 3 的响应式基石）</td>
          </tr>
        </tbody>
      </table>
      <p class="ob-note">
        面试常考：<strong>「Vue 3 的 ref 是怎么做到响应式的？」</strong>——
        <code>ref</code> 用一个对象包住值，通过 <code>get value()</code> 收集依赖、
        <code>set value()</code> 触发更新；<code>reactive</code> 则用
        <code>Proxy</code> 拦截 <code>get/set/has/deleteProperty</code>。
        两者的共同点是：<strong>把「读写」这两个动作变成可拦截的函数调用</strong>。
      </p>
    </JsCard>

    <JsCard
      title="⑥ 对象的 8 个常用招式 + 坑清单"
      hint="这 8 个写法覆盖了日常 95% 的对象操作，值得背下来。"
      tone="danger"
    >
      <p class="ob-sub">8 个常用招式</p>
      <table class="ob-table">
        <thead>
          <tr>
            <th>#</th>
            <th>招式</th>
            <th>写法</th>
            <th>用在哪</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>动态取值</td>
            <td><code>obj[key]</code></td>
            <td>键名来自变量（表格列、表单字段名）</td>
          </tr>
          <tr>
            <td>2</td>
            <td>可选链</td>
            <td><code>obj?.a?.b</code></td>
            <td>接口返回的字段可能不存在</td>
          </tr>
          <tr>
            <td>3</td>
            <td>空值兜底</td>
            <td><code>obj?.n ?? 0</code></td>
            <td>只兜 null / undefined，保住 0 和 ''</td>
          </tr>
          <tr>
            <td>4</td>
            <td>解构 + 默认值</td>
            <td><code>const &#123; a = 1 &#125; = obj</code></td>
            <td>配置对象、props</td>
          </tr>
          <tr>
            <td>5</td>
            <td>展开合并</td>
            <td><code>&#123; ...defaults, ...options &#125;</code></td>
            <td>默认配置 + 用户配置</td>
          </tr>
          <tr>
            <td>6</td>
            <td>剔除字段</td>
            <td><code>const &#123; pwd, ...safe &#125; = user</code></td>
            <td>脱敏、去掉多余字段再提交</td>
          </tr>
          <tr>
            <td>7</td>
            <td>遍历 / 转换</td>
            <td><code>Object.entries(obj).map(...)</code></td>
            <td>对象 → 数组、批量格式化</td>
          </tr>
          <tr>
            <td>8</td>
            <td>自有属性判断</td>
            <td><code>Object.hasOwn(obj, key)</code></td>
            <td>表单项校验、白名单过滤</td>
          </tr>
        </tbody>
      </table>

      <p class="ob-sub">坑清单</p>
      <ol class="ob-list">
        <li>
          <strong><code>for...in</code> 会遍历原型链上的可枚举属性</strong>
          （比如自定义原型上的方法），判断字段要用 <code>Object.hasOwn</code>；遍历自己的字段用
          <code>Object.keys / entries</code>。
        </li>
        <li>
          <strong><code>Object.keys</code> 看不到不可枚举属性和 Symbol 键</strong>；
          <code>JSON.stringify</code> 也会跳过它们（还会丢 <code>undefined</code> 和函数）。
        </li>
        <li>
          <strong>展开是浅拷贝</strong>：<code>&#123; ...obj &#125;</code>
          只复制第一层，嵌套对象仍然共享引用（要深拷贝用 <code>structuredClone</code>）。
        </li>
        <li>
          <strong>展开会保留 <code>undefined</code></strong>：
          <code>&#123; ...&#123; a: 1 &#125;, ...&#123; a: undefined &#125; &#125;</code> 的结果里
          <code>a</code> 存在且是 undefined（不会被跳过）—— 和后端数据合并时要小心。
        </li>
        <li>
          <strong>解构默认值只认 <code>undefined</code></strong>：传 <code>null</code>
          不会走默认值，需要写成 <code>obj.a ?? 1</code>。
        </li>
        <li>
          <strong><code>||</code> 会把 0 / '' / false 当成「没有值」</strong>：
          <code>pageSize || 10</code> 在 pageSize 为 0 时会得到 10，应该用 <code>??</code>。
        </li>
        <li>
          <strong><code>defineProperty</code> 不写的开关默认全是 false</strong>：
          <code>&#123; value: 1 &#125;</code> 得到的是「不可写、不可枚举、不可配置」的属性。
        </li>
        <li>
          <strong>对象没有「按插入顺序」的保证</strong>（整数键会被提前）。
          需要严格顺序或对象作为键时，用 <code>Map</code>。
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
.ob-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.7;
}
.ob-sub {
  margin: 14px 0 6px;
  font-weight: 600;
  font-size: 12.5px;
}
.ob-table {
  margin-top: 10px;
  font-size: 12.5px;
}
.ob-mini {
  max-width: 150px;
}
.ob-num {
  width: 90px;
}
.ob-result {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-family: var(--mono);
  font-size: 12.5px;
}
.ob-log {
  margin: 10px 0 0;
  background: #282c34;
  color: #abb2bf;
  padding: 12px 14px;
  border-radius: 8px;
  overflow: auto;
  line-height: 1.55;
  font-size: 12.5px;
}
.ob-code {
  margin: 0;
  background: #282c34;
  color: #abb2bf;
  padding: 12px 14px;
  border-radius: 8px;
  overflow: auto;
  line-height: 1.55;
  font-size: 12.5px;
}
.ob-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--c-text-dim);
  line-height: 1.9;
}
</style>
