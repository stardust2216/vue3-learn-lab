<script setup lang="ts">
import { computed, ref } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 6. 现代语法速查
 *
 *   ① 模板字符串：多行 / 插值 / 标签模板
 *   ② 解构与展开的补充用法、默认参数、Symbol
 *   ③ 迭代器与可迭代协议：for...of vs for...in（附实验台）
 *   ④ Set / Map / WeakMap / WeakSet
 *   ⑤ 生成器 function* 与 yield
 *   ⑥ 较新 API 速查 + 「项目里最常用的 12 个现代写法」
 *
 * 类型说明：本项目的 tsconfig lib 是 ES2020，所以 at / toSorted / Object.groupBy 这类
 * ES2022+ 的 API 在断言里用 as any 绕开类型检查（浏览器运行时时它们都在）。
 * ========================================================================== */

/** 把可能抛错的表达式包起来（断言区不能直接抛，否则整页白屏） */
function probe(fn: () => unknown): string {
  try {
    return String(fn())
  } catch (e) {
    return (e as Error).name
  }
}

/** 标签模板示例：把静态部分变大写，插值原样拼回去 */
function upperTag(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.map((s, i) => s.toUpperCase() + (i < values.length ? String(values[i]) : '')).join('')
}

// ---------------------------------------------------------------------------
// ① 模板字符串
// ---------------------------------------------------------------------------
const assertsTemplate = [
  { expr: '插值 `${1 + 1}`', actual: `1 + 1 = ${1 + 1}`, expected: '1 + 1 = 2' },
  { expr: '插值里可以写任意表达式', actual: `${[1, 2].map((n) => n * 2).join(',')}`, expected: '2,4' },
  { expr: '三元表达式', actual: `${1 > 0 ? '正数' : '非正数'}`, expected: '正数' },
  {
    expr: '多行字符串（不用再写 \\n 拼接）',
    actual: `第一行
第二行`.includes('\n'),
    expected: true,
  },
  {
    expr: '多行模板的缩进也会被保留',
    actual: `a
  b`.split('\n')[1],
    expected: '  b',
  },
  { expr: '模板字符串也是普通字符串', actual: typeof `x`, expected: 'string' },
  { expr: '标签模板：函数名后面直接跟模板', actual: upperTag`hello ${'world'}`, expected: 'HELLO world' },
  {
    expr: '标签函数收到的第一个参数是「静态片段数组」',
    actual: (() => {
      const spy = (strings: TemplateStringsArray, ...values: unknown[]) =>
        `${strings.length}|${values.length}|${strings.join('~')}`
      return spy`a${1}b${2}c`
    })(),
    expected: '3|2|a~b~c',
    note: '静态片段永远比插值多 1 个',
  },
  {
    expr: 'String.raw 拿到「原始文本」（反斜杠不被转义）',
    actual: String.raw`a\nb`,
    expected: 'a\\nb',
    note: '写文件路径、正则时很有用',
  },
  {
    expr: '对比：普通模板里的 \\n 是换行',
    actual: `a\nb`.length,
    expected: 3,
  },
  {
    expr: '标签模板可以用来做安全的 HTML 拼接（防 XSS 思路）',
    actual: (() => {
      const escape = (v: unknown) => String(v).replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)
      const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
        strings.reduce((acc, s, i) => acc + s + (i < values.length ? escape(values[i]) : ''), '')
      return html`<p>${'<script>'}</p>`
    })(),
    expected: '<p>&#60;script&#62;</p>',
  },
]

const runTemplate = `console.log('=== 插值：里面可以写任何表达式 ===')
const user = { name: '小明', age: 18 }
console.log(\`姓名：\${user.name}，年龄：\${user.age}\`)
console.log(\`明年：\${user.age + 1} 岁\`)
console.log(\`是否成年：\${user.age >= 18 ? '是' : '否'}\`)
console.log(\`列表：\${[1, 2, 3].map((n) => n * n).join(' / ')}\`)

console.log('')
console.log('=== 多行字符串：写 HTML 片段、SQL 都很方便 ===')
const html = \`
  <ul>
    <li>第一项</li>
    <li>第二项</li>
  </ul>
\`
console.log(html)
console.log('注意：缩进会被保留，所以有时要配合 .trim()')

console.log('')
console.log('=== 标签模板：函数名 + 模板 ===')
function highlight(strings, ...values) {
  // strings 是静态片段数组，values 是插值
  return strings.reduce((acc, s, i) => acc + s + (i < values.length ? '【' + values[i] + '】' : ''), '')
}
const keyword = '闭包'
console.log(highlight\`今天学的是 \${keyword}，重点是 \${'this'}\`)

console.log('')
console.log('=== 实用标签：String.raw（不转义反斜杠）===')
console.log('普通模板：', \`C:\\new\\test\`)
console.log('String.raw：', String.raw\`C:\\new\\test\`)

console.log('')
console.log('=== 实用标签：转义 HTML（防 XSS 的思路）===')
function escapeHtml(strings, ...values) {
  const escape = (v) => String(v).replace(/[<>&"]/g, (c) => '&#' + c.charCodeAt(0) + ';')
  return strings.reduce((acc, s, i) => acc + s + (i < values.length ? escape(values[i]) : ''), '')
}
const evil = '<img src=x onerror=alert(1)>'
console.log(escapeHtml\`<div>\${evil}</div>\`)`

// ---------------------------------------------------------------------------
// ② 解构 / 展开补充 + Symbol
// ---------------------------------------------------------------------------
const assertsSpreadSymbol = [
  { expr: '展开数组：[...[1, 2], ...[3]]', actual: JSON.stringify([...[1, 2], ...[3]]), expected: '[1,2,3]' },
  { expr: '展开传参：Math.max(...[1, 9, 3])', actual: Math.max(...[1, 9, 3]), expected: 9 },
  {
    expr: '展开 + 追加元素（React 风格，Vue 里也常用）',
    actual: JSON.stringify([...[1, 2], 3]),
    expected: '[1,2,3]',
  },
  {
    expr: '对象展开：后面的覆盖前面的',
    actual: JSON.stringify({ ...{ a: 1, b: 2 }, b: 3 }),
    expected: '{"a":1,"b":3}',
  },
  {
    expr: '展开是浅拷贝（嵌套对象仍共享）',
    actual: (() => {
      const a = { n: { v: 1 } }
      const b = { ...a }
      b.n.v = 9
      return a.n.v
    })(),
    expected: 9,
  },
  {
    expr: '展开可以当「默认值 + 覆盖」用',
    actual: (() => {
      const defaults = { size: 'md', color: 'blue' }
      const options = { color: 'red' }
      return JSON.stringify({ ...defaults, ...options })
    })(),
    expected: '{"size":"md","color":"red"}',
  },
  {
    expr: '展开一个字符串 → 字符数组',
    actual: JSON.stringify([...'abc']),
    expected: '["a","b","c"]',
  },
  {
    expr: '展开 Set → 数组（同时完成去重）',
    actual: JSON.stringify([...new Set([1, 1, 2])]),
    expected: '[1,2]',
  },
  {
    expr: '剩余属性解构（剔除字段）',
    actual: (() => {
      const { password, ...safe } = { name: 'a', password: '123', age: 1 }
      void password
      return JSON.stringify(safe)
    })(),
    expected: '{"name":"a","age":1}',
  },
  {
    expr: '默认参数可以引用前面的参数',
    actual: ((a: number, b: number = a * 2) => a + b)(3),
    expected: 9,
  },

  {
    expr: "Symbol('a') === Symbol('a')（每次都不同）",
    actual: Symbol('a') === Symbol('a'),
    expected: false,
  },
  { expr: "Symbol.for('k') === Symbol.for('k')（全局注册表）", actual: Symbol.for('k') === Symbol.for('k'), expected: true },
  { expr: "Symbol('a') === Symbol.for('a')", actual: Symbol('a') === Symbol.for('a'), expected: false },
  { expr: 'typeof Symbol()', actual: typeof Symbol(), expected: 'symbol' },
  { expr: "Symbol('a').description", actual: Symbol('a').description, expected: 'a' },
  { expr: "Symbol('a').toString()", actual: Symbol('a').toString(), expected: 'Symbol(a)' },
  {
    expr: 'Symbol 键不出现在 Object.keys / JSON 里',
    actual: (() => {
      const s = Symbol('k')
      const o: Record<string | symbol, number> = { [s]: 1, a: 2 }
      return `${Object.keys(o).join(',')}|${JSON.stringify(o)}|${String(o[s])}`
    })(),
    expected: 'a|{"a":2}|1',
    note: '要用 Object.getOwnPropertySymbols 才能取到',
  },
  {
    expr: 'Object.getOwnPropertySymbols 能取到 Symbol 键',
    actual: Object.getOwnPropertySymbols({ [Symbol('k')]: 1 }).length,
    expected: 1,
  },
  { expr: 'Symbol 不能转数字', actual: probe(() => Number(Symbol('s'))), expected: 'TypeError' },
  { expr: 'Symbol 不能隐式转字符串', actual: probe(() => '' + (Symbol('s') as unknown as string)), expected: 'TypeError' },
  { expr: '内置 Symbol.iterator 存在', actual: typeof Symbol.iterator, expected: 'symbol' },
  { expr: '数组自带 Symbol.iterator 方法', actual: typeof [][Symbol.iterator], expected: 'function' },
  { expr: 'Symbol.asyncIterator 也存在', actual: typeof Symbol.asyncIterator, expected: 'symbol' },
]

// ---------------------------------------------------------------------------
// ③ for...of vs for...in（+ 交互）
// ---------------------------------------------------------------------------
const loopKind = ref('array')
const loopKinds = [
  { key: 'array', label: '数组 [10, 20, 30]' },
  { key: 'string', label: "字符串 'abc'" },
  { key: 'set', label: 'Set(1, 2)' },
  { key: 'object', label: '普通对象 { a, b }' },
  { key: 'entries', label: 'Object.entries({ a, b })' },
]

function loopTarget(kind: string): any {
  switch (kind) {
    case 'string':
      return 'abc'
    case 'set':
      return new Set([1, 2])
    case 'object':
      return { a: 1, b: 2 }
    case 'entries':
      return Object.entries({ a: 1, b: 2 })
    default:
      return [10, 20, 30]
  }
}
/** 对象不可迭代，返回 null 用来演示 for...of 报错 */
function loopIterable(kind: string): any {
  return kind === 'object' ? null : loopTarget(kind)
}

const loopOfText = computed(() => {
  try {
    const out: string[] = []
    for (const v of loopIterable(loopKind.value)) out.push(typeof v === 'string' ? v : JSON.stringify(v))
    return out.join(' , ') || '（没有内容）'
  } catch (e) {
    return `${(e as Error).name}: ${(e as Error).message}`
  }
})
const loopInText = computed(() => {
  const out: string[] = []
  for (const k in loopTarget(loopKind.value)) out.push(k)
  return out.join(' , ') || '（没有可枚举属性）'
})

const assertsIterate = [
  {
    expr: 'for...of 数组 → 拿到「值」',
    actual: (() => {
      const out: string[] = []
      for (const v of ['a', 'b']) out.push(v)
      return out.join(',')
    })(),
    expected: 'a,b',
  },
  {
    expr: 'for...in 数组 → 拿到「下标字符串」★',
    actual: (() => {
      const out: string[] = []
      for (const k in ['a', 'b']) out.push(k)
      return out.join(',')
    })(),
    expected: '0,1',
    note: '面试常考：for...in 在数组上给的是索引（字符串！），不是值',
  },
  {
    expr: 'for...in 对象 → 拿到「键」',
    actual: (() => {
      const out: string[] = []
      for (const k in { a: 1, b: 2 }) out.push(k)
      return out.join(',')
    })(),
    expected: 'a,b',
  },
  {
    expr: 'for...of 普通对象 → TypeError（对象默认不可迭代）',
    actual: probe(() => {
      for (const v of { a: 1 } as any) void v
    }),
    expected: 'TypeError',
    note: 'is not iterable —— 要用 Object.entries / keys 先转成数组',
  },
  {
    expr: 'for...in 会顺着原型链找可枚举属性 ★',
    actual: (() => {
      const proto = { inherited: 1 }
      const o = Object.create(proto) as { own?: number }
      o.own = 2
      const keys: string[] = []
      for (const k in o) keys.push(k)
      return keys.join(',')
    })(),
    expected: 'own,inherited',
    note: '所以 for...in 里判断字段要用 Object.hasOwn，或者直接用 Object.keys',
  },
  {
    expr: 'Object.keys 只拿自己的属性（不受原型链干扰）',
    actual: (() => {
      const proto = { inherited: 1 }
      const o = Object.create(proto) as { own?: number }
      o.own = 2
      return Object.keys(o).join(',')
    })(),
    expected: 'own',
  },
  {
    expr: '字符串可以 for...of（按字符迭代，能正确处理 emoji）',
    actual: (() => {
      const out: string[] = []
      for (const c of 'a👍') out.push(c)
      return out.length
    })(),
    expected: 2,
    note: '"a👍".length 是 3（👍 占两个码元），但 for...of 只给 2 个字符',
  },
  {
    expr: 'Set / Map 可以 for...of',
    actual: (() => {
      const out: string[] = []
      for (const v of new Set([1, 2])) out.push(String(v))
      for (const [k, v] of new Map([['a', 1]])) out.push(`${k}${v}`)
      return out.join(',')
    })(),
    expected: '1,2,a1',
  },
  {
    expr: '手动使用迭代器：next() 的形状是 { value, done }',
    actual: (() => {
      const it = ['a', 'b'][Symbol.iterator]()
      return `${it.next().value},${it.next().value},${it.next().done}`
    })(),
    expected: 'a,b,true',
  },
  {
    expr: '判断一个值可不可迭代',
    actual: (() => {
      const isIterable = (x: unknown) => typeof (x as { [Symbol.iterator]?: unknown } | null | undefined)?.[Symbol.iterator] === 'function'
      return `${isIterable([])},${isIterable('ab')},${isIterable(new Set())},${isIterable(new Map())},${isIterable({})},${isIterable(null)}`
    })(),
    expected: 'true,true,true,true,false,false',
  },
  {
    expr: '展开运算符用的就是迭代协议',
    actual: JSON.stringify([...new Map([['a', 1]])]),
    expected: '[["a",1]]',
  },
  {
    expr: 'Array.from 既能吃「可迭代」也能吃「类数组」',
    actual: `${Array.from(new Set([1, 1])).join(',')}|${Array.from({ length: 2, 0: 'x', 1: 'y' }).join(',')}`,
    expected: '1|x,y',
  },
  {
    expr: '解构也依赖迭代协议（所以字符串能解构，对象不能按位置解构）',
    actual: (() => {
      const [a, b] = 'xy'
      return `${a}${b}`
    })(),
    expected: 'xy',
  },
]

const runIterate = `console.log('=== for...of：拿「值」（按迭代协议）===')
for (const v of ['a', 'b', 'c']) console.log('  值：', v)

console.log('')
console.log('=== for...in：拿「键」（按可枚举属性）===')
for (const k in ['a', 'b', 'c']) console.log('  数组的键：', k, typeof k)
const obj = { name: '小明', age: 18 }
for (const k in obj) console.log('  对象的键：', k)

console.log('')
console.log('=== for...of 不能直接用在普通对象上 ===')
try {
  for (const v of obj) console.log(v)
} catch (e) {
  console.log('  →', e.name + ': ' + e.message)
}
console.log('正确写法（先转成数组）：')
for (const [k, v] of Object.entries(obj)) console.log('  ' + k + ' = ' + v)

console.log('')
console.log('=== for...in 会遍历原型链上的可枚举属性 ===')
const proto = { inherited: '我是原型上的' }
const child = Object.create(proto)
child.own = '我自己的'
for (const k in child) console.log('  for...in 拿到：', k)
console.log('  Object.keys 只拿自己的：', Object.keys(child))

console.log('')
console.log('=== 自己实现可迭代协议：自定义对象也能 for...of ===')
const range = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let current = this.from
    const last = this.to
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true }
      },
    }
  },
}
console.log('展开：', [...range])
console.log('Array.from：', Array.from(range))
console.log('解构前两个：', (() => { const [a, b] = range; return [a, b] })())
for (const n of range) console.log('  for...of 拿到：', n)

console.log('')
console.log('=== 手动用迭代器 ===')
const it = ['x', 'y'][Symbol.iterator]()
console.log('next() 的形状：', it.next())
console.log('继续：', it.next())
console.log('结束：', it.next())`

// ---------------------------------------------------------------------------
// ④ Set / Map / WeakMap / WeakSet（+ 交互）
// ---------------------------------------------------------------------------
const setInput = ref('1, 2, 2, 3, 3, 3')
const setStats = computed(() => {
  const items = setInput.value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
  const set = new Set(items)
  const counts = new Map<string, number>()
  items.forEach((it) => counts.set(it, (counts.get(it) ?? 0) + 1))
  return {
    total: items.length,
    uniqueCount: set.size,
    unique: [...set].join(', ') || '（空）',
    counts: [...counts.entries()].map(([k, v]) => `${k}×${v}`).join(', ') || '（空）',
  }
})

const assertsCollections = [
  { expr: 'Set 去重：[...new Set([1, 1, 2])]', actual: [...new Set([1, 1, 2])].join(','), expected: '1,2' },
  { expr: 'Set 的 size（对比数组的 length）', actual: new Set([1, 1, 2]).size, expected: 2 },
  {
    expr: 'Set 用 SameValueZero 比较，NaN 只算一个',
    actual: new Set([NaN, NaN]).size,
    expected: 1,
    note: '这比 indexOf 去重靠谱（indexOf(NaN) 永远找不到）',
  },
  {
    expr: '对象去重不生效（引用不同）',
    actual: new Set([{}, {}]).size,
    expected: 2,
  },
  { expr: "new Set('aab').size（字符串自动按字符拆）", actual: new Set('aab').size, expected: 2 },
  { expr: 'Set.has', actual: new Set([1, 2, 3]).has(2), expected: true },
  {
    expr: 'Set.delete 返回「删没删掉」',
    actual: (() => {
      const s = new Set([1, 2])
      return `${s.delete(1)},${s.delete(9)},${s.size}`
    })(),
    expected: 'true,false,1',
  },
  {
    expr: 'Set 保持插入顺序',
    actual: [...new Set([3, 1, 3])].join(','),
    expected: '3,1',
  },
  {
    expr: 'Set 转数组后可以排序',
    actual: [...new Set([3, 1, 3])].sort((a, b) => a - b).join(','),
    expected: '1,3',
  },
  {
    expr: 'Map 可以用对象当键',
    actual: (() => {
      const m = new Map<object, string>()
      const key = { id: 1 }
      m.set(key, 'v')
      return m.get(key)
    })(),
    expected: 'v',
  },
  {
    expr: '★ 普通对象会把两个对象「撞成一个键」，Map 不会',
    actual: (() => {
      const keys = [{ id: 1 }, { id: 2 }]
      const plain: Record<string, number> = {}
      const map = new Map<object, number>()
      keys.forEach((k) => {
        plain[String(k)] = 1
        map.set(k, 1)
      })
      return `普通对象 ${Object.keys(plain).length} 个键 / Map ${map.size} 个键`
    })(),
    expected: '普通对象 1 个键 / Map 2 个键',
    note: '因为对象的键最后都会被转成字符串 "[object Object]"',
  },
  {
    expr: 'Map 的键也用 SameValueZero：NaN 能当键',
    actual: (() => {
      const m = new Map<number, string>()
      m.set(NaN, 'x')
      return m.get(NaN)
    })(),
    expected: 'x',
  },
  {
    expr: 'Map 的遍历顺序 = 插入顺序（对象做不到）',
    actual: (() => {
      const m = new Map<string, number>()
      m.set('b', 1)
      m.set('a', 2)
      return [...m.keys()].join(',')
    })(),
    expected: 'b,a',
  },
  {
    expr: 'JSON.stringify(Map) 会得到 {}（不能直接序列化）★',
    actual: JSON.stringify(new Map([['a', 1]])),
    expected: '{}',
    note: '要手动转：Object.fromEntries(map) 或 [...map]',
  },
  {
    expr: 'Map 转对象：Object.fromEntries(map)',
    actual: JSON.stringify(Object.fromEntries(new Map([['a', 1], ['b', 2]]))),
    expected: '{"a":1,"b":2}',
  },
  {
    expr: 'Map 转数组：[...map] 就是 [键, 值] 的数组',
    actual: JSON.stringify([...new Map([['a', 1]])]),
    expected: '[["a",1]]',
  },
  {
    expr: '对象转 Map：new Map(Object.entries(obj))',
    actual: (() => {
      const m = new Map(Object.entries({ a: 1, b: 2 }))
      return `${m.size}|${m.get('b')}`
    })(),
    expected: '2|2',
  },
  {
    expr: 'Map 统计词频（项目里最常见）',
    actual: (() => {
      const m = new Map<string, number>()
      for (const k of ['a', 'b', 'a']) m.set(k, (m.get(k) ?? 0) + 1)
      return JSON.stringify(Object.fromEntries(m))
    })(),
    expected: '{"a":2,"b":1}',
  },
  {
    expr: 'WeakMap 的键必须是对象',
    actual: probe(() => new WeakMap<object, number>().set('str' as unknown as object, 1)),
    expected: 'TypeError',
  },
  {
    expr: 'WeakMap 没有 size，也没有遍历方法（拿不到 keys）',
    actual: (() => {
      const wm = new WeakMap<object, number>()
      return `${(wm as { size?: unknown }).size}|${typeof (wm as { [Symbol.iterator]?: unknown })[Symbol.iterator]}`
    })(),
    expected: 'undefined|undefined',
    note: '这是故意的：不能遍历才不会把「随时可能消失的键」暴露出去',
  },
  {
    expr: 'WeakMap 基本用法：给对象挂元数据',
    actual: (() => {
      const meta = new WeakMap<object, string>()
      const el = {}
      meta.set(el, '元数据')
      return meta.get(el)
    })(),
    expected: '元数据',
  },
  {
    expr: 'WeakSet：只能放对象，用于「标记过没过」',
    actual: (() => {
      const seen = new WeakSet<object>()
      const a = {}
      seen.add(a)
      return `${seen.has(a)}|${seen.has({})}`
    })(),
    expected: 'true|false',
  },
]

// ---------------------------------------------------------------------------
// ⑤ 生成器 function*
// ---------------------------------------------------------------------------
const assertsGenerator = [
  {
    expr: '生成器的 next() 返回 { value, done }',
    actual: (() => {
      function* g() {
        yield 'a'
      }
      return JSON.stringify(g().next())
    })(),
    expected: '{"value":"a","done":false}',
  },
  {
    expr: '迭代结束时 done 为 true（JSON 会丢掉 undefined 的 value）',
    actual: (() => {
      function* g() {
        yield 'a'
      }
      const it = g()
      it.next()
      return JSON.stringify(it.next())
    })(),
    expected: '{"done":true}',
  },
  {
    expr: '展开生成器会丢掉 return 的值 ★',
    actual: (() => {
      function* g() {
        yield 1
        yield 2
        return 3
      }
      return [...g()].join(',')
    })(),
    expected: '1,2',
    note: 'for...of 和展开只看 done，return 的值要用 next() 手动拿',
  },
  {
    expr: 'yield 表达式的值 = 下一次 next(参数) 传进来的值 ★',
    actual: (() => {
      function* g(): Generator<number, void, number> {
        const fromOuter = yield 1
        yield fromOuter * 2
      }
      const it = g()
      it.next()
      return it.next(10).value
    })(),
    expected: 20,
  },
  {
    expr: '生成器函数体是「惰性执行」的（第一次 next 才开始跑）',
    actual: (() => {
      let started = false
      function* g() {
        started = true
        yield 1
      }
      const it = g()
      const beforeNext = started
      it.next()
      return `${beforeNext},${started}`
    })(),
    expected: 'false,true',
  },
  {
    expr: '无限生成器：只算需要的那几个值',
    actual: (() => {
      function* ids() {
        let i = 1
        while (true) yield i++
      }
      const it = ids()
      return `${it.next().value},${it.next().value},${it.next().value}`
    })(),
    expected: '1,2,3',
  },
  {
    expr: '生成器自己就是迭代器（Symbol.iterator 返回自身）',
    actual: (() => {
      function* g() {
        yield 1
      }
      const it = g()
      return it[Symbol.iterator]() === it
    })(),
    expected: true,
  },
  {
    expr: 'yield* 委托：把另一个生成器的值全接过来',
    actual: (() => {
      function* inner() {
        yield 1
        yield 2
      }
      function* outer() {
        yield 0
        yield* inner()
        yield 3
      }
      return [...outer()].join(',')
    })(),
    expected: '0,1,2,3',
  },
  {
    expr: 'for...of 遍历生成器',
    actual: (() => {
      function* letters() {
        yield 'a'
        yield 'b'
      }
      const out: string[] = []
      for (const c of letters()) out.push(c)
      return out.join(',')
    })(),
    expected: 'a,b',
  },
  {
    expr: '实用例子：分页/分块（chunks）',
    actual: (() => {
      function* chunks(arr: number[], size: number) {
        for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size)
      }
      return JSON.stringify([...chunks([1, 2, 3, 4, 5], 2)])
    })(),
    expected: '[[1,2],[3,4],[5]]',
  },
  {
    expr: '生成器也能 return 提前结束（finally 会执行）',
    actual: (() => {
      const log: string[] = []
      function* g() {
        try {
          yield 1
          yield 2
        } finally {
          log.push('finally')
        }
      }
      const it = g()
      it.next()
      it.return(undefined)
      return log.join(',')
    })(),
    expected: 'finally',
    note: '提前 return 会触发 finally，所以生成器里的资源清理是安全的',
  },
]

const runGenerator = `console.log('=== 生成器基础：yield 像「暂停点」===')
function* gen() {
  console.log('  1) 开始执行')
  const fromOuter = yield 1              // 暂停在这里，把 1 交出去
  console.log('  2) 收到 next() 传进来的值：', fromOuter)
  yield fromOuter * 2
  return '我是 return 的值'
}
const it = gen()
console.log('第一次 next：', it.next())
console.log('第二次 next(10)：', it.next(10))
console.log('第三次 next：', it.next())

console.log('')
console.log('=== 惰性执行：调用生成器函数不会执行任何代码 ===')
let started = false
function* lazy() {
  started = true
  yield 'done'
}
const lazyIt = lazy()
console.log('刚创建时 started =', started)
console.log('next 之后：', lazyIt.next(), '/ started =', started)

console.log('')
console.log('=== 展开 / for...of：只看 done，丢掉 return 值 ===')
function* letters() {
  yield 'a'
  yield 'b'
  return 'c（不会出现在展开结果里）'
}
console.log('展开：', [...letters()])
for (const c of letters()) console.log('  for...of：', c)

console.log('')
console.log('=== 无限序列：按需取值，不会卡死 ===')
function* idGenerator() {
  let id = 1
  while (true) yield id++
}
const ids = idGenerator()
console.log(ids.next().value, ids.next().value, ids.next().value)

console.log('')
console.log('=== yield* 委托 ===')
function* inner() { yield 1; yield 2 }
function* outer() { yield 0; yield* inner(); yield 3 }
console.log([...outer()])

console.log('')
console.log('=== 实用场景：分块处理（分页请求 / 批量提交）===')
function* chunks(arr, size) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size)
  }
}
const data = [1, 2, 3, 4, 5, 6, 7]
for (const page of chunks(data, 3)) {
  console.log('  一页：', page)
}
console.log('一次性转成数组：', [...chunks(data, 3)])

console.log('')
console.log('=== 提前结束会触发 finally（资源清理友好）===')
const log = []
function* safe() {
  try {
    yield 1
    yield 2
  } finally {
    log.push('清理资源')
  }
}
const s = safe()
s.next()
s.return()                                // 提前结束
console.log('finally 执行记录：', log)`

// ---------------------------------------------------------------------------
// ⑥ 较新 API 速查（纯展示 + 少量断言）
// ---------------------------------------------------------------------------
const assertsModern = [
  { expr: "String.replaceAll（ES2021）", actual: ('a-b-c' as any).replaceAll('-', '+'), expected: 'a+b+c' },
  { expr: "String.at(-1)（ES2022）", actual: ('abc' as any).at(-1), expected: 'c' },
  { expr: 'Object.hasOwn（ES2022）', actual: (Object as any).hasOwn({ a: 1 }, 'a'), expected: true },
  {
    expr: 'Object.groupBy（ES2024）',
    actual: JSON.stringify((Object as any).groupBy([1, 2, 3, 4], (n: number) => (n % 2 ? 'odd' : 'even'))),
    expected: '{"odd":[1,3],"even":[2,4]}',
  },
  { expr: 'Array.toSorted（ES2023，不改原数组）', actual: ([3, 1, 2] as any).toSorted((a: number, b: number) => a - b).join(','), expected: '1,2,3' },
  { expr: 'Array.toReversed', actual: ([1, 2, 3] as any).toReversed().join(','), expected: '3,2,1' },
  { expr: 'Array.with（替换某下标，返回新数组）', actual: ([1, 2, 3] as any).with(1, 9).join(','), expected: '1,9,3' },
  { expr: 'Array.findLast', actual: ([1, 2, 3, 4] as any).findLast((n: number) => n < 3), expected: 2 },
  {
    expr: 'structuredClone 深拷贝（不改原对象）',
    actual: (() => {
      const a = { n: [1] }
      const b = structuredClone(a)
      b.n.push(2)
      return a.n.length
    })(),
    expected: 1,
  },
  {
    expr: '??= 懒初始化：只补 null / undefined',
    actual: (() => {
      const o: { a: number | null; b: number | null } = { a: null, b: 0 }
      o.a ??= 5
      o.b ??= 5
      return `${o.a},${o.b}`
    })(),
    expected: '5,0',
  },
  {
    expr: '||= 会把 0 也替换掉（和 ??= 的区别）',
    actual: (() => {
      const o: { b: number | null } = { b: 0 }
      o.b ||= 5
      return o.b
    })(),
    expected: 5,
  },
  {
    expr: '&&= 只在左边为真时赋值',
    actual: (() => {
      const o: { a: number | null } = { a: 0 }
      o.a &&= 5
      return o.a
    })(),
    expected: 0,
  },
  {
    expr: '私有字段 #x（class fields）',
    actual: (() => {
      class Counter {
        #n = 0
        inc() {
          this.#n++
          return this.#n
        }
        get value() {
          return this.#n
        }
      }
      const c = new Counter()
      c.inc()
      return c.value
    })(),
    expected: 1,
  },
  {
    expr: '私有字段外面拿不到', 
    actual: (() => {
      class Secret {
        #hidden = 1
        read() {
          return this.#hidden
        }
      }
      return Object.keys(new Secret()).length
    })(),
    expected: 0,
    note: '私有字段不参与 Object.keys / 展开 / JSON',
  },
  { expr: 'Promise.allSettled 存在（ES2020）', actual: typeof Promise.allSettled, expected: 'function' },
  { expr: 'globalThis 存在', actual: typeof globalThis, expected: 'object' },
  { expr: "padStart（ES2017）", actual: 'abc'.padStart(5, '0'), expected: '00abc' },
  { expr: 'Object.fromEntries（ES2019）', actual: JSON.stringify(Object.fromEntries([['a', 1]])), expected: '{"a":1}' },
  { expr: 'Array.flat（ES2019）', actual: JSON.stringify([1, [2]].flat()), expected: '[1,2]' },
  { expr: 'BigInt 不能和 number 直接相加', actual: probe(() => (10n as any) + 1), expected: 'TypeError' },
  { expr: 'BigInt 之间可以相加', actual: (10n + 1n) === 11n, expected: true },
]
</script>

<template>
  <div>
    <h1>6. 现代语法速查</h1>
    <p class="lead">
      <strong><code>for...of</code> 按「迭代协议」拿值，<code>for...in</code> 按「可枚举属性」拿键</strong>
      （所以数组上用 for...in 拿到的是下标字符串，而且还会带上原型链上的属性）；
      <strong><code>Map</code> 能拿对象当键、遍历顺序稳定，<code>WeakMap</code> 的键是弱引用、不阻止回收</strong>；
      生成器 <code>function*</code> 是「可以暂停的函数」，适合无限序列和分块处理。
    </p>

    <JsCard
      title="① 模板字符串：多行、插值、标签模板"
      hint="标签模板看着冷门，但 styled-components、i18n、SQL 模板、防 XSS 都靠它。"
      :asserts="assertsTemplate"
      :runnable="runTemplate"
    >
      <table class="es-table">
        <thead>
          <tr>
            <th>写法</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>`hello ${name}`</code></td>
            <td>插值，里面可以是任意表达式</td>
          </tr>
          <tr>
            <td>跨行的反引号</td>
            <td>直接换行，缩进会被保留（必要时 <code>.trim()</code>）</td>
          </tr>
          <tr>
            <td><code>String.raw<code>C:\a</code></code></td>
            <td>取原始文本，反斜杠不转义</td>
          </tr>
          <tr>
            <td><code>tag`a${1}b`</code></td>
            <td>标签模板：<code>tag(['a','b'], 1)</code></td>
          </tr>
          <tr>
            <td><code>&#123;&#123; &#125;&#125;</code></td>
            <td>
              注意：这是 <strong>Vue 模板</strong>的插值语法，和 JS 模板字符串的 <code>$&#123;&#125;</code> 是两套东西
            </td>
          </tr>
        </tbody>
      </table>
      <p class="es-note">
        标签模板的原理：<strong>静态片段永远比插值多 1 个</strong>，所以
        <code>strings.reduce((acc, s, i) =&gt; acc + s + (values[i] ?? ''), '')</code>
        就是最通用的拼接骨架。
      </p>
    </JsCard>

    <JsCard
      title="② 展开与解构的补充用法、Symbol"
      hint="Symbol 的核心价值：独一无二的键。所以它能做「不会撞名的属性」和语言内置协议（Symbol.iterator 等）。"
      :asserts="assertsSpreadSymbol"
      tone="ok"
    >
      <div class="es-grid">
        <div>
          <p class="es-sub">展开的 4 个常用场景</p>
          <ul class="es-list">
            <li>复制：<code>[...arr]</code> / <code>&#123; ...obj &#125;</code>（浅拷贝）</li>
            <li>合并：<code>&#123; ...defaults, ...options &#125;</code></li>
            <li>传参：<code>Math.max(...nums)</code></li>
            <li>转换：<code>[...new Set(arr)]</code>、<code>[...map]</code></li>
          </ul>
        </div>
        <div>
          <p class="es-sub">Symbol 的两个用途</p>
          <ul class="es-list">
            <li>唯一键：<code>Symbol('id')</code> 不会和任何字符串键冲突</li>
            <li>内置协议：<code>Symbol.iterator</code> / <code>Symbol.asyncIterator</code></li>
          </ul>
        </div>
      </div>
      <p class="es-note">
        注意 Symbol 不是「私有属性」：<code>Object.getOwnPropertySymbols(obj)</code>
        依然能拿到它（真正的私有要用 <code>#field</code>，见 ⑥）。
        Symbol 的价值在于<strong>不会撞名</strong>和<strong>默认不被遍历/序列化</strong>。
      </p>
    </JsCard>

    <JsCard
      title="③ 迭代器与可迭代协议：for...of vs for...in"
      hint="切换下面的类型，直接看 for...of 和 for...in 分别吐出什么 —— 对象那一项 for...of 会直接报错。"
      :asserts="assertsIterate"
      :runnable="runIterate"
      tone="warn"
    >
      <template #extra>
        <select v-model="loopKind" class="es-select">
          <option v-for="k in loopKinds" :key="k.key" :value="k.key">{{ k.label }}</option>
        </select>
      </template>
      <p class="es-result">
        for (const v <strong>of</strong> x) → <strong>{{ loopOfText }}</strong>
      </p>
      <p class="es-result">
        for (const k <strong>in</strong> x) → <strong>{{ loopInText }}</strong>
      </p>
      <table class="es-table">
        <thead>
          <tr>
            <th>对比项</th>
            <th>for...of</th>
            <th>for...in</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>依据</td>
            <td>迭代协议（<code>Symbol.iterator</code>）</td>
            <td>可枚举属性（含原型链）</td>
          </tr>
          <tr>
            <td>数组上拿到</td>
            <td>元素的值</td>
            <td>下标的<strong>字符串</strong></td>
          </tr>
          <tr>
            <td>对象上</td>
            <td>不能直接用（不是可迭代对象）→ 用 <code>Object.entries</code></td>
            <td>键</td>
          </tr>
          <tr>
            <td>能否 break / continue / return</td>
            <td>可以</td>
            <td>可以</td>
          </tr>
          <tr>
            <td>典型用途</td>
            <td>遍历数组 / 字符串 / Set / Map / 生成器</td>
            <td>排查对象属性（但要配合 <code>Object.hasOwn</code>）</td>
          </tr>
        </tbody>
      </table>
      <p class="es-note">
        面试常考对比：<strong>forEach 不能 break，for...of 可以</strong>；
        <strong>for...in 在数组上给的是字符串下标，还可能拿到原型链上的属性</strong>，所以数组遍历请用
        <code>for...of</code> 或数组方法。
      </p>
    </JsCard>

    <JsCard
      title="④ Set / Map / WeakMap / WeakSet"
      hint="上面的输入框演示：Set 去重、Map 计数。要「用对象当键」或「保持顺序」时，Map 是对象的唯一替代。"
      :asserts="assertsCollections"
    >
      <template #extra>
        <input v-model="setInput" class="es-input" placeholder="用逗号分隔的值" />
      </template>
      <p class="es-result">
        原始 {{ setStats.total }} 项 → Set 去重后 <strong>{{ setStats.uniqueCount }}</strong> 项：{{ setStats.unique }}
      </p>
      <p class="es-result">Map 计数：<strong>{{ setStats.counts }}</strong></p>
      <table class="es-table">
        <thead>
          <tr>
            <th>结构</th>
            <th>键的类型</th>
            <th>顺序</th>
            <th>能否遍历 / 有 size</th>
            <th>用途</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>Set</code></td>
            <td>值去重（SameValueZero）</td>
            <td>插入顺序</td>
            <td>能 / 有</td>
            <td>去重、集合运算（并集交集）</td>
          </tr>
          <tr>
            <td><code>Map</code></td>
            <td>任意类型（含对象）</td>
            <td>插入顺序</td>
            <td>能 / 有</td>
            <td>缓存、计数、需要对象作键</td>
          </tr>
          <tr>
            <td><code>WeakMap</code></td>
            <td><strong>只能是对象</strong></td>
            <td>—</td>
            <td>不能 / 没有</td>
            <td>给对象挂元数据且不阻止 GC</td>
          </tr>
          <tr>
            <td><code>WeakSet</code></td>
            <td><strong>只能是对象</strong></td>
            <td>—</td>
            <td>不能 / 没有</td>
            <td>标记「处理过」，对象销毁后标记自动消失</td>
          </tr>
          <tr>
            <td>普通对象 <code>&#123;&#125;</code></td>
            <td>字符串 / Symbol</td>
            <td>整数键会提前</td>
            <td>keys/entries / 无 size</td>
            <td>纯数据、要 JSON 序列化</td>
          </tr>
        </tbody>
      </table>
      <p class="es-note">
        两个必知坑：<strong>① <code>JSON.stringify(map)</code> 得到的是 <code>&#123;&#125;</code></strong>
        （要手动 <code>Object.fromEntries(map)</code>）；
        <strong>② 用普通对象当「字典」时，两个不同对象会撞成同一个键</strong>
        （因为键都会被转成 <code>"[object Object]"</code>），需要对象作键就用 <code>Map</code>。
      </p>
    </JsCard>

    <JsCard
      title="⑤ 生成器 function* 与 yield"
      hint="生成器 = 可以暂停/恢复的函数。它同时是「迭代器」也是「可迭代对象」，所以 for...of / 展开都能直接用。"
      :asserts="assertsGenerator"
      :runnable="runGenerator"
    >
      <pre class="es-code">function* gen() {
  console.log('第一次 next 才开始执行')
  const fromOuter = yield 1      // 暂停：把 1 交出去；恢复时 fromOuter = next(参数)
  yield fromOuter * 2
  return 'return 的值（不在 for...of / 展开里出现）'
}

const it = gen()
it.next()          // { value: 1, done: false }
it.next(10)        // { value: 20, done: false }
it.next()          // { value: 'return 的值', done: true }

// 常用形态 1：无限序列（惰性，不会卡死）
function* ids() { let i = 1; while (true) yield i++ }

// 常用形态 2：分块 / 分页
function* chunks(arr, size) {
  for (let i = 0; i &lt; arr.length; i += size) yield arr.slice(i, i + size)
}

// 常用形态 3：yield* 委托给另一个生成器
function* all() { yield* inner(); yield* other() }</pre>
      <p class="es-note">
        什么时候用生成器？<strong>「需要惰性序列」或「需要把一段逻辑暂停/恢复」</strong>的时候：
        分页拉取、批量分块、无限滚动、手写状态机。
        日常业务里 <code>async/await</code> 已经替代了它的大部分用途（<code>async</code> 函数本质上就是生成器 + Promise 的语法糖）。
      </p>
    </JsCard>

    <JsCard
      title="⑥ 较新 API 速查 + 最常用的 12 个现代写法"
      hint="标注（ES20xx）的都已被现代浏览器广泛支持；本项目 tsconfig lib 是 ES2020，所以断言里对更新的 API 用了 as any。"
      :asserts="assertsModern"
      tone="danger"
    >
      <p class="es-sub">较新 API 速查</p>
      <table class="es-table">
        <thead>
          <tr>
            <th>API</th>
            <th>作用</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>structuredClone(v)</code></td>
            <td>深拷贝</td>
            <td>支持循环引用 / Date / Map；不能克隆函数</td>
          </tr>
          <tr>
            <td><code>arr.at(-1)</code></td>
            <td>按负下标取值</td>
            <td>ES2022</td>
          </tr>
          <tr>
            <td><code>arr.toSorted / toReversed / toSpliced / with</code></td>
            <td>不改原数组的排序 / 反转 / 剪切 / 替换</td>
            <td>ES2023，配合响应式数据最安全</td>
          </tr>
          <tr>
            <td><code>arr.findLast / findLastIndex</code></td>
            <td>从后往前找</td>
            <td>ES2023</td>
          </tr>
          <tr>
            <td><code>Object.hasOwn(o, k)</code></td>
            <td>判断自有属性</td>
            <td>ES2022，替代 <code>hasOwnProperty.call</code></td>
          </tr>
          <tr>
            <td><code>Object.groupBy(arr, fn)</code></td>
            <td>分组</td>
            <td>ES2024，替代手写 reduce 分组</td>
          </tr>
          <tr>
            <td><code>str.replaceAll(a, b)</code></td>
            <td>替换全部</td>
            <td>ES2021，替代 <code>split/join</code> 或正则加 g</td>
          </tr>
          <tr>
            <td><code>??= / ||= / &amp;&amp;=</code></td>
            <td>逻辑赋值</td>
            <td>懒初始化 <code>cache[k] ??= create()</code></td>
          </tr>
          <tr>
            <td><code>#private</code></td>
            <td>真正的私有字段</td>
            <td>不参与 keys / 展开 / JSON</td>
          </tr>
          <tr>
            <td><code>Promise.allSettled</code></td>
            <td>等所有 Promise 结束（不因失败中断）</td>
            <td>ES2020</td>
          </tr>
        </tbody>
      </table>

      <p class="es-sub">项目里最常用的 12 个现代写法</p>
      <ol class="es-list es-list--big">
        <li>模板字符串：<code>`共 ${total} 条`</code></li>
        <li>对象解构 + 重命名：<code>const &#123; data: list = [] &#125; = res</code></li>
        <li>数组解构：<code>const [first, ...rest] = arr</code></li>
        <li>展开合并配置：<code>&#123; ...defaults, ...options &#125;</code></li>
        <li>可选链：<code>res?.data?.list?.length ?? 0</code></li>
        <li>空值合并：<code>pageSize ?? 10</code>（保住 0）</li>
        <li>默认参数：<code>function f(size = 10) &#123;&#125;</code></li>
        <li>参数解构 + 默认值：<code>(&#123; size = 10 &#125; = &#123;&#125;) =&gt; ...</code></li>
        <li>属性简写：<code>return &#123; list, total, loading &#125;</code></li>
        <li>动态键：<code>&#123; [field]: value &#125;</code>（表单双向绑定）</li>
        <li>懒初始化：<code>cache[key] ??= compute()</code></li>
        <li>遍历对象：<code>for (const [k, v] of Object.entries(obj))</code></li>
      </ol>
      <p class="es-note">
        最后提醒：<strong>展开和 <code>Object.assign</code> 都是浅拷贝</strong>，
        要深拷贝请用 <code>structuredClone</code>；
        <strong><code>for...in</code> 不要用来遍历数组</strong>（拿到的是字符串下标，还会带上原型链属性）。
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
.es-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.7;
}
.es-sub {
  margin: 14px 0 6px;
  font-weight: 600;
  font-size: 12.5px;
}
.es-table {
  margin-top: 10px;
  font-size: 12.5px;
}
.es-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.es-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.8;
}
.es-list--big {
  font-size: 13px;
  line-height: 1.9;
}
.es-select {
  max-width: 220px;
}
.es-input {
  min-width: 200px;
}
.es-result {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-family: var(--mono);
  font-size: 12.5px;
}
.es-code {
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
