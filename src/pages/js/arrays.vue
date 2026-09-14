<script setup lang="ts">
import { computed, ref } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 4. 数组与常用方法
 *
 *   ① 创建、稀疏数组、增删（push/pop/shift/unshift/splice/toSpliced）
 *   ② 遍历全家桶：map / filter / reduce / some / every / find / flat / at
 *   ③ sort 的坑（默认按字符串排序）+ 可交互排序实验台
 *   ④ reduce 的多种用法：求和 / 分组 / 去重 / 扁平化
 *   ⑤ 查找、复制、合并、深浅拷贝、类数组与 Array.from
 *   ⑥ Vue 列表渲染里最常用的 5 个方法 + 坑清单
 *
 * 注意：断言用 Object.is 比较，数组/对象的引用永远不等，
 * 所以本页所有涉及数组的 actual 都写成 .join(',') / JSON.stringify(...) / .length。
 * ========================================================================== */

/** 把可能抛错的表达式包起来（断言区不能直接抛，否则整页白屏） */
function probe(fn: () => unknown): string {
  try {
    return String(fn())
  } catch (e) {
    return (e as Error).name
  }
}

/** 解析输入框里的数字列表 */
function parseNums(raw: string): number[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number)
    .filter((n) => !Number.isNaN(n))
}

/** 造一个「中间带空洞」的稀疏数组：[1, 空洞, 3] */
function makeSparse(): number[] {
  const a: number[] = new Array(3)
  a[0] = 1
  a[2] = 3
  return a
}

// ---------------------------------------------------------------------------
// ① 创建、稀疏数组、增删
// ---------------------------------------------------------------------------
const assertsCreate = [
  { expr: '[1, 2, 3].length', actual: [1, 2, 3].length, expected: 3 },
  { expr: 'new Array(3).length（只给一个数字参数 = 长度）', actual: new Array(3).length, expected: 3 },
  { expr: 'new Array(3)[0]', actual: new Array(3)[0], expected: undefined },
  {
    expr: "0 in new Array(3)（稀疏数组里根本没有这个下标）",
    actual: 0 in new Array(3),
    expected: false,
    note: '稀疏数组（sparse array）有 length 但没有元素',
  },
  { expr: '[1, 空洞, 3].length（中间挖了个洞）', actual: makeSparse().length, expected: 3 },
  {
    expr: '[1, 空洞, 3].filter(() => true).length（空洞被跳过）',
    actual: makeSparse().filter(() => true).length,
    expected: 2,
    note: 'forEach / map / filter 都会跳过空洞',
  },
  {
    expr: 'JSON.stringify([1, 空洞, 3])（JSON 把空洞当 null）',
    actual: JSON.stringify(makeSparse()),
    expected: '[1,null,3]',
  },
  {
    expr: '[...[1, 空洞, 3]].length（展开把空洞变成 undefined）',
    actual: [...makeSparse()].length,
    expected: 3,
    note: '空洞 → undefined，这是稀疏数组最容易被忽视的差异',
  },
  { expr: 'Array(3).fill(0).join(",")', actual: Array(3).fill(0).join(','), expected: '0,0,0' },
  {
    expr: 'Array.from({ length: 3 }, (_, i) => i).join(",")',
    actual: Array.from({ length: 3 }, (_, i) => i).join(','),
    expected: '0,1,2',
    note: '初始化数组首选这种写法（不会产生空洞）',
  },
  {
    expr: 'const a = []; a[2] = 5; a.length',
    actual: (() => {
      const a: number[] = []
      a[2] = 5
      return a.length
    })(),
    expected: 3,
    note: '按下标赋值会自动补空洞',
  },

  { expr: '[1, 2, 3].push(4)（返回新长度）', actual: [1, 2, 3].push(4), expected: 4 },
  { expr: '[1, 2, 3].pop()（返回被删的元素）', actual: [1, 2, 3].pop(), expected: 3 },
  { expr: '[1, 2, 3].shift()（删第一个，返回它）', actual: [1, 2, 3].shift(), expected: 1 },
  { expr: '[1, 2, 3].unshift(0)（返回新长度）', actual: [1, 2, 3].unshift(0), expected: 4 },
  {
    expr: '[1, 2, 3, 4].splice(1, 2)（返回被删掉的片段）',
    actual: JSON.stringify([1, 2, 3, 4].splice(1, 2)),
    expected: '[2,3]',
    note: 'splice(起始下标, 删除个数, ...插入的元素)',
  },
  {
    expr: 'splice 会改原数组',
    actual: (() => {
      const a = [1, 2, 3, 4]
      a.splice(1, 2)
      return a.join(',')
    })(),
    expected: '1,4',
  },
  {
    expr: '[1, 2, 3, 4].slice(1, 3)（只读切片）',
    actual: [1, 2, 3, 4].slice(1, 3).join(','),
    expected: '2,3',
  },
  {
    expr: '([1, 2, 3, 4]).toSpliced(1, 2)（返回新数组）',
    actual: ([1, 2, 3, 4] as any).toSpliced(1, 2).join(','),
    expected: '1,4',
    note: 'toSpliced / toSorted / toReversed / with 都是 ES2023 的「不改原数组」版本',
  },
  {
    expr: 'toSpliced 不动原数组',
    actual: (() => {
      const a = [1, 2, 3, 4]
      void (a as any).toSpliced(1, 2)
      return a.join(',')
    })(),
    expected: '1,2,3,4',
  },
]

const runCreate = `console.log('=== 三种创建方式 ===')
console.log('字面量：', [1, 2, 3])
console.log('new Array(3)：', new Array(3), '/ length =', new Array(3).length)
console.log('Array.from({length:3})：', Array.from({ length: 3 }, (_, i) => i))

console.log('')
console.log('=== 稀疏数组的坑 ===')
const sparse = [1, , 3]                 // 中间是「空洞」，不是 undefined
console.log('sparse =', sparse, '/ length =', sparse.length)
console.log('0 in sparse =', 0 in sparse, '/ 1 in sparse =', 1 in sparse)
console.log('filter 会跳过空洞：', sparse.filter(() => true))
console.log('map 也跳过（保留空洞）：', sparse.map((x) => x * 2), '/ 结果是', sparse.map((x) => x * 2).length, '个位置')
console.log('转 JSON 时空洞变 null：', JSON.stringify(sparse))
console.log('展开时空洞变 undefined：', [...sparse])

console.log('')
console.log('=== 增删：谁改原数组、谁返回新数组 ===')
const arr = [2, 3]
console.log('push(4) 返回新长度：', arr.push(4), '/ arr =', arr)
console.log('unshift(1) 返回新长度：', arr.unshift(1), '/ arr =', arr)
console.log('pop() 返回被删的元素：', arr.pop(), '/ arr =', arr)
console.log('shift() 返回被删的元素：', arr.shift(), '/ arr =', arr)

console.log('')
console.log('=== splice vs slice（名字像，行为完全不同）===')
const s1 = [1, 2, 3, 4, 5]
console.log('splice(1, 2) 返回被删的：', s1.splice(1, 2), '/ 原数组变成了', s1)
const s2 = [1, 2, 3, 4, 5]
console.log('slice(1, 3) 返回新数组：', s2.slice(1, 3), '/ 原数组没变：', s2)
const s3 = [1, 2, 3, 4, 5]
console.log('toSpliced(1, 2)（新方法）：', s3.toSpliced(1, 2), '/ 原数组没变：', s3)

console.log('')
console.log('=== 删除元素的几种写法 ===')
const d1 = [1, 2, 3]
delete d1[1]                            // 不推荐：会留下空洞
console.log('delete 之后：', d1, '/ length =', d1.length, '/ 是空洞：', !(1 in d1))
const d2 = [1, 2, 3]
d2.splice(1, 1)                         // 推荐
console.log('splice(1, 1) 之后：', d2)`

// ---------------------------------------------------------------------------
// ② 遍历全家桶
// ---------------------------------------------------------------------------
const assertsIterate = [
  { expr: '[1, 2, 3].map((x) => x * 2).join(",")', actual: [1, 2, 3].map((x) => x * 2).join(','), expected: '2,4,6' },
  {
    expr: 'map 不改原数组',
    actual: (() => {
      const a = [1, 2, 3]
      a.map((x) => x * 2)
      return a.join(',')
    })(),
    expected: '1,2,3',
  },
  {
    expr: "map 的回调参数是 (值, 下标, 原数组)",
    actual: ['a', 'b'].map((v, i) => `${i}${v}`).join(','),
    expected: '0a,1b',
  },
  {
    expr: "['1','2','3'].map(parseInt) ★ 经典坑",
    actual: ['1', '2', '3'].map(parseInt).join(','),
    expected: '1,NaN,NaN',
    note: 'parseInt 拿到了 (值, 下标) 两个参数，第二个被当成进制：parseInt("2", 1) → NaN',
  },
  { expr: '[1, 2, 3, 4].filter((x) => x % 2 === 0).join(",")', actual: [1, 2, 3, 4].filter((x) => x % 2 === 0).join(','), expected: '2,4' },
  {
    expr: '[0, 1, 2].filter(Boolean).join(",")（0 被误杀）',
    actual: [0, 1, 2].filter(Boolean).join(','),
    expected: '1,2',
    note: 'filter(Boolean) 会连 0 和 "" 一起去掉；只想删 null/undefined 就写条件',
  },
  {
    expr: '[0, 1, 2].filter((x) => x !== null && x !== undefined).join(",")',
    actual: [0, 1, 2].filter((x) => x !== null && x !== undefined).join(','),
    expected: '0,1,2',
  },
  { expr: '[1, 2, 3].forEach(() => {}) 的返回值', actual: [1, 2, 3].forEach(() => {}), expected: undefined, note: 'forEach 没有返回值，也不能 break' },
  { expr: '[1, 2, 3].reduce((a, b) => a + b, 0)', actual: [1, 2, 3].reduce((a, b) => a + b, 0), expected: 6 },
  { expr: '[1, 2, 3].reduce((a, b) => a + b)（不给初始值）', actual: [1, 2, 3].reduce((a, b) => a + b), expected: 6 },
  {
    expr: '[].reduce((a, b) => a + b)（空数组 + 无初始值）',
    actual: probe(() => ([] as number[]).reduce((a, b) => a + b)),
    expected: 'TypeError',
    note: 'Reduce of empty array with no initial value',
  },
  { expr: '[1, 2, 3].some((x) => x > 2)', actual: [1, 2, 3].some((x) => x > 2), expected: true },
  { expr: '[1, 2, 3].every((x) => x > 0)', actual: [1, 2, 3].every((x) => x > 0), expected: true },
  {
    expr: '[].every(() => false) ★ 空数组恒为 true',
    actual: ([] as number[]).every(() => false),
    expected: true,
    note: '空集合上的「所有元素都…」一律为真，所以校验前要先判空',
  },
  { expr: '[].some(() => true)', actual: ([] as number[]).some(() => true), expected: false },
  { expr: '[1, 2, 3].find((x) => x > 1)', actual: [1, 2, 3].find((x) => x > 1), expected: 2 },
  { expr: '[1, 2, 3].findIndex((x) => x > 1)', actual: [1, 2, 3].findIndex((x) => x > 1), expected: 1 },
  { expr: '[1, 2, 3].find((x) => x > 10)', actual: [1, 2, 3].find((x) => x > 10), expected: undefined },
  { expr: '[1, 2, 3].findIndex((x) => x > 10)', actual: [1, 2, 3].findIndex((x) => x > 10), expected: -1 },
  { expr: 'findLast（从后往前找第一个）', actual: ([1, 2, 3, 4] as any).findLast((x: number) => x < 3), expected: 2 },
  { expr: '[1, 2, 3].at(-1)（支持负数下标）', actual: ([1, 2, 3] as any).at(-1), expected: 3 },
  {
    expr: '[1, 2, 3][-1]（方括号不支持负数）',
    actual: ([1, 2, 3] as any)[-1],
    expected: undefined,
    note: '只有 at() 支持负下标',
  },
  { expr: '[1, [2, [3]]].flat()', actual: JSON.stringify([1, [2, [3]]].flat()), expected: '[1,2,[3]]' },
  { expr: '[1, [2, [3]]].flat(2)', actual: JSON.stringify([1, [2, [3]]].flat(2)), expected: '[1,2,3]' },
  { expr: '[1, [2, [3]]].flat(Infinity)', actual: JSON.stringify([1, [2, [3]]].flat(Infinity)), expected: '[1,2,3]' },
  { expr: '[1, 2, 3].flatMap((x) => [x, x * 10])', actual: JSON.stringify([1, 2, 3].flatMap((x) => [x, x * 10])), expected: '[1,10,2,20,3,30]' },
  { expr: '[1, 2, 3].flatMap((x) => x)（非数组元素原样保留）', actual: JSON.stringify([1, 2, 3].flatMap((x) => x)), expected: '[1,2,3]' },
]

const runIterate = `console.log('=== map / filter：都是「返回新数组」===')
const nums = [1, 2, 3, 4, 5]
console.log('map 平方：', nums.map((n) => n * n))
console.log('filter 偶数：', nums.filter((n) => n % 2 === 0))
console.log('原数组没变：', nums)

console.log('')
console.log('=== forEach vs map ===')
console.log('forEach 返回值：', nums.forEach(() => {}), '（是 undefined）')
console.log('forEach 只能靠外部变量收集：')
const doubled = []
nums.forEach((n) => doubled.push(n * 2))
console.log('  ', doubled)
console.log('map 直接就是结果：', nums.map((n) => n * 2))

console.log('')
console.log('=== reduce：把数组「收敛」成一个值 ===')
console.log('求和：', nums.reduce((sum, n) => sum + n, 0))
console.log('最大值：', nums.reduce((max, n) => (n > max ? n : max)))
console.log('求平均：', nums.reduce((sum, n) => sum + n, 0) / nums.length)

console.log('')
console.log('=== some / every / find / findIndex ===')
const scores = [55, 72, 88, 91]
console.log('有人及格吗：', scores.some((s) => s >= 60))
console.log('全都及格吗：', scores.every((s) => s >= 60))
console.log('第一个不及格：', scores.find((s) => s < 60))
console.log('它的下标：', scores.findIndex((s) => s < 60))
console.log('空数组的 every 是', [].every(() => false), '（空集合的全称命题恒真）')

console.log('')
console.log('=== at / flat / flatMap ===')
const tail = [1, 2, 3]
console.log('at(-1) =', tail.at(-1), '/ at(0) =', tail.at(0))
const nested = [1, [2, [3, [4]]]]
console.log('flat() =', nested.flat())
console.log('flat(2) =', nested.flat(2))
console.log('flat(Infinity) =', nested.flat(Infinity))
console.log('flatMap(x => [x, x * 10]) =', [1, 2, 3].flatMap((x) => [x, x * 10]))
console.log('flatMap 顺手过滤空数组：[1,2,3].flatMap(x => x > 1 ? [x] : []) =', [1, 2, 3].flatMap((x) => (x > 1 ? [x] : [])))

console.log('')
console.log('=== 经典坑：map(parseInt) ===')
console.log("['1','2','3'].map(parseInt) =", ['1', '2', '3'].map(parseInt))
console.log('原因：map 传给回调的是 (元素, 下标, 原数组)，parseInt 把下标当成了进制')
console.log('正确写法：', ['1', '2', '3'].map((s) => parseInt(s, 10)))
console.log('更简洁：', ['1', '2', '3'].map(Number))`

// ---------------------------------------------------------------------------
// ③ sort 的坑（+ 交互）
// ---------------------------------------------------------------------------
const sortInput = ref('10, 9, 1, 100, 2')
const sortNums = computed(() => parseNums(sortInput.value))
const sortByDefault = computed(() => [...sortNums.value].sort().join(', '))
const sortByNumber = computed(() => [...sortNums.value].sort((a, b) => a - b).join(', '))
const sortByNumberDesc = computed(() => [...sortNums.value].sort((a, b) => b - a).join(', '))

const assertsSort = [
  {
    expr: '[10, 9, 1].sort() ★ 默认按字符串排序',
    actual: [10, 9, 1].sort().join(','),
    expected: '1,10,9',
    note: '面试常考：sort 会把元素先转成字符串，再按 UTF-16 码点比较',
  },
  { expr: '[1, 2, 3, 10, 20].sort()', actual: [1, 2, 3, 10, 20].sort().join(','), expected: '1,10,2,20,3' },
  {
    expr: '[10, 9, 1].sort((a, b) => a - b)（升序的正确写法）',
    actual: [10, 9, 1].sort((a, b) => a - b).join(','),
    expected: '1,9,10',
  },
  { expr: '[3, 1, 2].sort((a, b) => b - a)（降序）', actual: [3, 1, 2].sort((a, b) => b - a).join(','), expected: '3,2,1' },
  { expr: "['b', 'a', 'c'].sort()", actual: ['b', 'a', 'c'].sort().join(','), expected: 'a,b,c' },
  {
    expr: "['b', 'A'].sort()（大写字母码点更小）",
    actual: ['b', 'A'].sort().join(','),
    expected: 'A,b',
    note: '想要人类友好的顺序用 localeCompare',
  },
  {
    expr: "['b', 'a'].sort((a, b) => a.localeCompare(b))",
    actual: ['b', 'a'].sort((a, b) => a.localeCompare(b)).join(','),
    expected: 'a,b',
  },
  {
    expr: 'sort 会改原数组',
    actual: (() => {
      const a = [3, 1, 2]
      a.sort()
      return a.join(',')
    })(),
    expected: '1,2,3',
  },
  {
    expr: '([3, 1, 2]).toSorted() 不改原数组',
    actual: (() => {
      const a = [3, 1, 2]
      const sorted = (a as any).toSorted((x: number, y: number) => x - y)
      return `${sorted.join(',')}|${a.join(',')}`
    })(),
    expected: '1,2,3|3,1,2',
  },
  {
    expr: '对象数组按字段排序',
    actual: (() => {
      const list = [
        { name: 'b', v: 2 },
        { name: 'a', v: 1 },
      ]
      return list
        .sort((x, y) => x.v - y.v)
        .map((o) => o.name)
        .join(',')
    })(),
    expected: 'a,b',
  },
  {
    expr: '排序稳定性（ES2019 起保证）',
    actual: (() => {
      const list = [
        { k: 1, v: 0 },
        { k: 2, v: 0 },
        { k: 3, v: 0 },
      ]
      return list
        .sort((a, b) => a.v - b.v)
        .map((o) => o.k)
        .join(',')
    })(),
    expected: '1,2,3',
    note: '相等元素保持原顺序，所以可以「先按 A 排，再按 B 排」',
  },
  {
    expr: '多字段排序：先按分数降序，同分按名字升序',
    actual: (() => {
      const list = [
        { name: 'b', score: 90 },
        { name: 'a', score: 90 },
        { name: 'c', score: 80 },
      ]
      return list
        .sort((x, y) => y.score - x.score || x.name.localeCompare(y.name))
        .map((o) => `${o.name}${o.score}`)
        .join(',')
    })(),
    expected: 'a90,b90,c80',
  },
]

const runSort = `console.log('=== 默认 sort：按字符串比！ ===')
console.log('[10, 9, 1].sort() =', [10, 9, 1].sort())
console.log('[1, 2, 3, 10, 20].sort() =', [1, 2, 3, 10, 20].sort())
console.log('原因：默认会把元素转成字符串，按 UTF-16 码点比较："10" < "9"')

console.log('')
console.log('=== 正确写法：传比较函数 ===')
console.log('升序 (a, b) => a - b：', [10, 9, 1].sort((a, b) => a - b))
console.log('降序 (a, b) => b - a：', [10, 9, 1].sort((a, b) => b - a))

console.log('')
console.log('=== 比较函数的返回值含义 ===')
console.log('返回负数 → a 排前面；返回正数 → b 排前面；返回 0 → 保持相对顺序')
console.log('所以 a - b 是升序，b - a 是降序，就这么简单')

console.log('')
console.log('=== sort 会改原数组（这是个副作用）===')
const origin = [3, 1, 2]
const sorted = origin.sort()
console.log('origin =', origin, '/ sorted =', sorted, '/ 是同一个数组吗？', origin === sorted)

const safe = [3, 1, 2]
const safeSorted = safe.toSorted((a, b) => a - b)     // ES2023：返回新数组
console.log('toSorted 之后：safe =', safe, '/ safeSorted =', safeSorted)
console.log('（老环境用 [...safe].sort(...) 达到同样效果）')

console.log('')
console.log('=== 字符串排序：注意大小写和中文 ===')
console.log("['b', 'A', 'a'].sort() =", ['b', 'A', 'a'].sort())
console.log("['b', 'A', 'a'].sort((x, y) => x.localeCompare(y)) =", ['b', 'A', 'a'].sort((x, y) => x.localeCompare(y)))
console.log("中文按拼音：['张三', '李四'].sort((a, b) => a.localeCompare(b, 'zh')) =", ['张三', '李四'].sort((a, b) => a.localeCompare(b, 'zh')))

console.log('')
console.log('=== 对象数组排序（项目里最常见）===')
const users = [
  { name: '小明', age: 18, score: 90 },
  { name: '小红', age: 16, score: 95 },
  { name: '小刚', age: 18, score: 85 },
]
console.log('按年龄升序：', users.slice().sort((a, b) => a.age - b.age).map((u) => u.name))
console.log('多字段（年龄升序 → 分数降序）：')
console.log('  ', users.slice().sort((a, b) => a.age - b.age || b.score - a.score).map((u) => u.name + ':' + u.score))`

// ---------------------------------------------------------------------------
// ④ reduce 的多种用法（+ 交互）
// ---------------------------------------------------------------------------
const reduceInput = ref('1, 2, 3, 4, 5')
const reduceNums = computed(() => parseNums(reduceInput.value))
const reduceStats = computed(() => {
  const ns = reduceNums.value
  return {
    count: ns.length,
    sum: ns.reduce((s, n) => s + n, 0),
    max: ns.length ? Math.max(...ns) : '—',
    avg: ns.length ? Math.round((ns.reduce((s, n) => s + n, 0) / ns.length) * 100) / 100 : '—',
    unique: [...new Set(ns)].sort((a, b) => a - b).join(', ') || '（空）',
    even: ns.filter((n) => n % 2 === 0).join(', ') || '（无）',
  }
})

const assertsReduce = [
  { expr: '[1, 2, 3, 4].reduce((s, n) => s + n, 0)（求和）', actual: [1, 2, 3, 4].reduce((s, n) => s + n, 0), expected: 10 },
  { expr: '给了初始值 100 就从 100 开始累加', actual: [1, 2, 3].reduce((s, n) => s + n, 100), expected: 106 },
  {
    expr: '求最大值：reduce((max, n) => n > max ? n : max)',
    actual: [3, 9, 1].reduce((max, n) => (n > max ? n : max)),
    expected: 9,
  },
  {
    expr: '计数（统计每个元素出现次数）',
    actual: (() => {
      const count = ['a', 'b', 'a'].reduce<Record<string, number>>((acc, k) => {
        acc[k] = (acc[k] ?? 0) + 1
        return acc
      }, {})
      return JSON.stringify(count)
    })(),
    expected: '{"a":2,"b":1}',
  },
  {
    expr: '分组（把对象数组按字段分组）',
    actual: (() => {
      const users = [
        { role: 'admin', name: '甲' },
        { role: 'user', name: '乙' },
        { role: 'admin', name: '丙' },
      ]
      const grouped = users.reduce<Record<string, string[]>>((acc, u) => {
        ;(acc[u.role] ??= []).push(u.name)
        return acc
      }, {})
      return JSON.stringify(grouped)
    })(),
    expected: '{"admin":["甲","丙"],"user":["乙"]}',
  },
  {
    expr: 'Object.groupBy（ES2024，浏览器已广泛支持）',
    actual: JSON.stringify((Object as any).groupBy([1, 2, 3, 4], (n: number) => (n % 2 ? 'odd' : 'even'))),
    expected: '{"odd":[1,3],"even":[2,4]}',
    note: '比手写 reduce 分组可读得多；项目 tsconfig 的 lib 还是 ES2020，所以这里用 as any 绕类型',
  },
  {
    expr: '去重：reduce + includes（老写法）',
    actual: (() => {
      const uniq = [1, 2, 2, 3].reduce<number[]>((acc, n) => (acc.includes(n) ? acc : [...acc, n]), [])
      return uniq.join(',')
    })(),
    expected: '1,2,3',
  },
  {
    expr: '去重：Set（推荐写法）',
    actual: [...new Set([1, 2, 2, 3])].join(','),
    expected: '1,2,3',
  },
  {
    expr: '按 id 去重（后面的覆盖前面的）',
    actual: (() => {
      const list = [
        { id: 1, n: 'a' },
        { id: 1, n: 'b' },
      ]
      const map = list.reduce<Record<number, string>>((acc, u) => {
        acc[u.id] = u.n
        return acc
      }, {})
      return JSON.stringify(map)
    })(),
    expected: '{"1":"b"}',
  },
  {
    expr: '扁平化：reduce + concat',
    actual: (() => {
      const flat = [
        [1, 2],
        [3],
      ].reduce<number[]>((acc, cur) => acc.concat(cur), [])
      return flat.join(',')
    })(),
    expected: '1,2,3',
    note: '现在直接用 flat() 更直观',
  },
  {
    expr: 'reduce 做「对象转数组」统计（求和 + 求平均一次搞定）',
    actual: (() => {
      const items = [
        { price: 10, qty: 2 },
        { price: 5, qty: 3 },
      ]
      const total = items.reduce((s, it) => s + it.price * it.qty, 0)
      return total
    })(),
    expected: 35,
  },
  {
    expr: '累计到对象：reduce 返回任何类型都行',
    actual: (() => {
      const r = ['a', 'b'].reduce(
        (acc, k) => {
          acc.keys.push(k)
          acc.count++
          return acc
        },
        { keys: [] as string[], count: 0 },
      )
      return JSON.stringify(r)
    })(),
    expected: '{"keys":["a","b"],"count":2}',
  },
]

const runReduce = `console.log('=== reduce 的基本形态：reduce(累加器, 初始值) ===')
const nums = [1, 2, 3, 4, 5]
console.log('求和：', nums.reduce((sum, n) => sum + n, 0))
console.log('不传初始值也能算，但空数组会抛错：')
try {
  [].reduce((a, b) => a + b)
} catch (e) {
  console.log('  ', e.name + ': ' + e.message)
}
console.log('所以养成「永远传初始值」的习惯')

console.log('')
console.log('=== 用法 1：求和 / 计数 / 最值 ===')
console.log('最大值：', nums.reduce((max, n) => (n > max ? n : max), -Infinity))
console.log('元素个数：', nums.reduce((count) => count + 1, 0))

console.log('')
console.log('=== 用法 2：分组 ===')
const users = [
  { role: 'admin', name: '甲' },
  { role: 'user', name: '乙' },
  { role: 'admin', name: '丙' },
]
const grouped = users.reduce((acc, u) => {
  ;(acc[u.role] || (acc[u.role] = [])).push(u.name)
  return acc
}, {})
console.log('按 role 分组：', grouped)
console.log('新 API Object.groupBy：', Object.groupBy(users, (u) => u.role))

console.log('')
console.log('=== 用法 3：去重 / 转 Map ===')
console.log('去重（reduce 版）：', [1, 2, 2, 3].reduce((acc, n) => (acc.includes(n) ? acc : acc.concat(n)), []))
console.log('去重（Set 版，推荐）：', [...new Set([1, 2, 2, 3])])
const byId = users.reduce((map, u) => map.set(u.name, u.role), new Map())
console.log('转成 Map：', byId)

console.log('')
console.log('=== 用法 4：扁平化 ===')
const matrix = [[1, 2], [3, 4], [5]]
console.log('reduce + concat：', matrix.reduce((acc, cur) => acc.concat(cur), []))
console.log('flat()：', matrix.flat())
console.log('flatMap：', matrix.flatMap((row) => row.map((n) => n * 10)))

console.log('')
console.log('=== 用法 5：把 array 变成对象（索引 / 统计表）===')
const list = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }]
console.log('reduce 建索引：', list.reduce((acc, it) => Object.assign(acc, { [it.id]: it.v }), {}))
console.log('Object.fromEntries + map 也行：', Object.fromEntries(list.map((it) => [it.id, it.v])))

console.log('')
console.log('=== 购物车汇总（项目里最常见的 reduce）===')
const cart = [
  { name: '键盘', price: 299, qty: 1 },
  { name: '鼠标', price: 99, qty: 2 },
]
const total = cart.reduce((sum, it) => sum + it.price * it.qty, 0)
console.log('总价 =', total, '（' + cart.map((it) => it.name + '×' + it.qty).join(' + ') + '）')`

// ---------------------------------------------------------------------------
// ⑤ 查找 / 复制 / 合并 / 深浅拷贝 / 类数组
// ---------------------------------------------------------------------------
const assertsFindCopy = [
  { expr: '[1, 2, 3].includes(2)', actual: [1, 2, 3].includes(2), expected: true },
  { expr: '[1, 2, 3].indexOf(2)', actual: [1, 2, 3].indexOf(2), expected: 1 },
  {
    expr: '[NaN].includes(NaN) ★',
    actual: [NaN].includes(NaN),
    expected: true,
    note: 'includes 用 SameValueZero 比较，所以能找到 NaN',
  },
  {
    expr: '[NaN].indexOf(NaN) ★',
    actual: [NaN].indexOf(NaN),
    expected: -1,
    note: 'indexOf 用 === 比较，NaN !== NaN 所以找不到',
  },
  {
    expr: "['a', 'b'].includes('b', 1)（第二参数是起始下标）",
    actual: ['a', 'b'].includes('b', 1),
    expected: true,
  },
  {
    expr: 'includes 找不到的区别：null vs undefined',
    // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
    actual: [null].includes(undefined),
    expected: false,
    note: '它们互相不相等（跟 == 的行为不一样）',
  },

  { expr: '合并：[...[1, 2], ...[3]]', actual: [...[1, 2], ...[3]].join(','), expected: '1,2,3' },
  { expr: '[1, 2].concat([3], 4)', actual: [1, 2].concat([3], 4).join(','), expected: '1,2,3,4' },
  {
    expr: '展开 + Set 一行去重并保持顺序',
    actual: [...new Set([3, 1, 3, 2])].join(','),
    expected: '3,1,2',
  },
  {
    expr: 'slice(-2)（从后往前数）',
    actual: [1, 2, 3, 4].slice(-2).join(','),
    expected: '3,4',
  },
  {
    expr: '([1, 2, 3]).toReversed() 不改原数组',
    actual: ([1, 2, 3] as any).toReversed().join(','),
    expected: '3,2,1',
  },
  {
    expr: '([1, 2, 3]).with(0, 9)（替换某个下标，返回新数组）',
    actual: ([1, 2, 3] as any).with(0, 9).join(','),
    expected: '9,2,3',
  },
  {
    expr: 'with(-1, 0)（支持负下标）',
    actual: ([1, 2, 3] as any).with(-1, 0).join(','),
    expected: '1,2,0',
  },
  {
    expr: '展开/浅拷贝只复制第一层',
    actual: (() => {
      const a = [[1]]
      const b = [...a]
      b[0].push(2)
      return JSON.stringify(a)
    })(),
    expected: '[[1,2]]',
    note: '改 b[0] 就是改 a[0]，因为里面还是同一个数组',
  },
  {
    expr: 'structuredClone 深拷贝才真正隔离',
    actual: (() => {
      const a = [[1]]
      const b = structuredClone(a)
      b[0].push(2)
      return JSON.stringify(a)
    })(),
    expected: '[[1]]',
  },
  {
    expr: 'JSON 深拷贝会把 Date 变成字符串',
    actual: JSON.stringify(JSON.parse(JSON.stringify({ d: new Date(0) }))),
    expected: '{"d":"1970-01-01T00:00:00.000Z"}',
    note: 'structuredClone 会保留 Date 类型',
  },
  {
    expr: 'structuredClone 保留 Date',
    actual: structuredClone(new Date(0)) instanceof Date,
    expected: true,
  },
  {
    expr: 'JSON 深拷贝会丢掉 undefined 和函数',
    actual: JSON.stringify(JSON.parse(JSON.stringify({ a: undefined, b: () => 1, c: 1 }))),
    expected: '{"c":1}',
  },
  {
    expr: 'JSON 深拷贝把 Set 变成空对象',
    actual: JSON.stringify(JSON.parse(JSON.stringify({ s: new Set([1]) }))),
    expected: '{"s":{}}',
  },
  {
    expr: '循环引用：JSON.stringify 直接报错',
    actual: probe(() => {
      const o: { self?: unknown } = {}
      o.self = o
      JSON.stringify(o)
    }),
    expected: 'TypeError',
  },
  {
    expr: '循环引用：structuredClone 能处理',
    actual: (() => {
      const o: { self?: unknown } = {}
      o.self = o
      const c = structuredClone(o)
      return c.self === c
    })(),
    expected: true,
  },
  {
    expr: 'structuredClone 不能克隆函数',
    actual: probe(() => structuredClone({ fn: () => 1 })),
    expected: 'DataCloneError',
  },

  { expr: "Array.from('abc')", actual: Array.from('abc').join(','), expected: 'a,b,c' },
  { expr: 'Array.from(new Set([1, 1, 2]))', actual: Array.from(new Set([1, 1, 2])).join(','), expected: '1,2' },
  {
    expr: 'Array.from({ length: 3 }, (_, i) => i * 2)',
    actual: Array.from({ length: 3 }, (_, i) => i * 2).join(','),
    expected: '0,2,4',
  },
  {
    expr: "Array.from('ab', (c) => c.toUpperCase())",
    actual: Array.from('ab', (c) => c.toUpperCase()).join(','),
    expected: 'A,B',
  },
  {
    expr: 'arguments 是类数组（不是真数组）',
    actual: (() => {
      function f() {
        return Array.isArray(arguments)
      }
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      return f(1, 2)
    })(),
    expected: false,
  },
  {
    expr: 'Array.from(arguments) 变成真数组',
    actual: (() => {
      function f() {
        return Array.from(arguments).filter((x) => x > 1).length
      }
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      return f(1, 2, 3)
    })(),
    expected: 2,
  },
  {
    expr: '类数组也能用展开运算符（只要有 Symbol.iterator）',
    actual: (() => {
      function f() {
        return [...arguments].join(',')
      }
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      return f(1, 2, 3)
    })(),
    expected: '1,2,3',
  },
  {
    expr: 'Array.of vs new Array：Array.of(3) 是一个元素',
    actual: `${Array.of(3).length}/${new Array(3).length}`,
    expected: '1/3',
    note: 'Array.of(3) → [3]；new Array(3) → 长度 3 的稀疏数组',
  },
]

const runFindCopy = `console.log('=== 查找：includes vs indexOf ===')
const list = [1, 2, 3, NaN]
console.log('includes(2)：', list.includes(2), '/ indexOf(2)：', list.indexOf(2))
console.log('includes(NaN)：', list.includes(NaN), '← 能找到')
console.log('indexOf(NaN)：', list.indexOf(NaN), '← 找不到（因为 === 比较）')

console.log('')
console.log('=== 复制与合并 ===')
const a = [1, 2]
const b = [3, 4]
console.log('展开合并：', [...a, ...b])
console.log('concat：', a.concat(b))
console.log('a 本身没变：', a)

console.log('')
console.log('=== 深浅拷贝：数组套数组的坑 ===')
const source = [{ n: 1 }, { n: 2 }]
const shallow = [...source]
shallow[0].n = 99
console.log('浅拷贝后 source[0].n =', source[0].n, '← 被改了！')

const deep = structuredClone(source)
deep[1].n = 88
console.log('深拷贝后 source[1].n =', source[1].n, '← 没被改')

console.log('')
console.log('=== JSON 深拷贝的四个坑 ===')
const messy = { date: new Date(0), fn: () => 1, undef: undefined, set: new Set([1]), n: 1 }
console.log('原文：', messy)
console.log('JSON 拷贝后：', JSON.parse(JSON.stringify(messy)))
console.log('→ Date 变字符串、函数和 undefined 直接消失、Set 变空对象')
const cyclic = {}
cyclic.self = cyclic
try {
  JSON.stringify(cyclic)
} catch (e) {
  console.log('循环引用：JSON.stringify →', e.name + ': ' + e.message)
}
const cloned = structuredClone(cyclic)
console.log('structuredClone 处理循环引用：', cloned.self === cloned)

console.log('')
console.log('=== 类数组（arguments / DOM 集合）===')
function demo() {
  console.log('是数组吗：', Array.isArray(arguments))
  console.log('有 length：', arguments.length)
  console.log('能用 for...of 吗：', (() => { try { for (const x of arguments) {} ; return true } catch (e) { return e.name } })())
  console.log('Array.from 之后：', Array.from(arguments).map((x) => x * 2))
}
demo(1, 2, 3)

console.log('')
console.log('=== Array.of 和 new Array 的区别 ===')
console.log('Array.of(3) =', Array.of(3), '/ length =', Array.of(3).length)
console.log('new Array(3) =', new Array(3), '/ length =', new Array(3).length)
console.log('new Array(3, 4) =', new Array(3, 4))`

// ---------------------------------------------------------------------------
// ⑥ Vue 里最常用的 5 个方法（不需要额外状态）
// ---------------------------------------------------------------------------
</script>

<template>
  <div>
    <h1>4. 数组与常用方法</h1>
    <p class="lead">
      <strong><code>sort()</code> 默认按字符串排序</strong>（<code>[10,9,1].sort()</code> → 1,10,9，必须传比较函数）；
      <strong><code>map/filter/slice/concat/toSorted</code> 返回新数组</strong>，而
      <strong><code>push/pop/splice/sort/reverse</code> 会改原数组</strong>；
      <code>reduce</code> 是唯一能「把数组收敛成任何东西」的方法，分组、去重、统计都靠它。
    </p>

    <JsCard
      title="① 创建、稀疏数组与增删"
      hint="稀疏数组（holes）是 JS 数组最反直觉的地方：它有 length，但下标根本不存在。"
      :asserts="assertsCreate"
      :runnable="runCreate"
    >
      <table class="ar-table">
        <thead>
          <tr>
            <th>方法</th>
            <th>作用</th>
            <th>返回值</th>
            <th>改原数组？</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>push(x)</code></td>
            <td>尾部加</td>
            <td>新长度</td>
            <td>是</td>
          </tr>
          <tr>
            <td><code>pop()</code></td>
            <td>尾部删</td>
            <td>被删元素</td>
            <td>是</td>
          </tr>
          <tr>
            <td><code>unshift(x)</code></td>
            <td>头部加</td>
            <td>新长度</td>
            <td>是（比 push 慢，要移动所有元素）</td>
          </tr>
          <tr>
            <td><code>shift()</code></td>
            <td>头部删</td>
            <td>被删元素</td>
            <td>是</td>
          </tr>
          <tr>
            <td><code>splice(i, n, ...x)</code></td>
            <td>剪切 / 插入</td>
            <td>被删的片段数组</td>
            <td>是</td>
          </tr>
          <tr>
            <td><code>slice(i, j)</code></td>
            <td>切片</td>
            <td>新数组</td>
            <td>否</td>
          </tr>
          <tr>
            <td><code>toSpliced(i, n)</code></td>
            <td>剪切的新版</td>
            <td>新数组</td>
            <td>否</td>
          </tr>
        </tbody>
      </table>
      <p class="ar-note">
        删除元素<strong>不要用 <code>delete arr[i]</code></strong>：它只删掉属性，会留下空洞，length 也不变。
        用 <code>arr.splice(i, 1)</code>。
      </p>
    </JsCard>

    <JsCard
      title="② 遍历全家桶：map / filter / reduce / some / every / find / flat"
      hint="选型口诀：要新数组用 map/filter；要一个值用 reduce；要 boolean 用 some/every；要元素本身用 find。"
      :asserts="assertsIterate"
      :runnable="runIterate"
      tone="ok"
    >
      <table class="ar-table">
        <thead>
          <tr>
            <th>方法</th>
            <th>返回</th>
            <th>什么时候用</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>forEach</code></td>
            <td>undefined</td>
            <td>纯副作用（打印、发请求）；不能 break</td>
          </tr>
          <tr>
            <td><code>map</code></td>
            <td>等长新数组</td>
            <td>把每一项变形</td>
          </tr>
          <tr>
            <td><code>filter</code></td>
            <td>较短的新数组</td>
            <td>筛选</td>
          </tr>
          <tr>
            <td><code>reduce</code></td>
            <td>任何类型</td>
            <td>求和 / 分组 / 去重 / 转对象</td>
          </tr>
          <tr>
            <td><code>some / every</code></td>
            <td>boolean</td>
            <td>「有没有一个 / 是不是全都」；空数组 every 是 true</td>
          </tr>
          <tr>
            <td><code>find / findIndex</code></td>
            <td>元素 / 下标（找不到是 undefined / -1）</td>
            <td>找一项、判断是否选中</td>
          </tr>
          <tr>
            <td><code>flat / flatMap</code></td>
            <td>新数组</td>
            <td>拍平嵌套数组；flatMap = map + flat(1)</td>
          </tr>
          <tr>
            <td><code>at(i)</code></td>
            <td>元素</td>
            <td>取最后一个：<code>arr.at(-1)</code></td>
          </tr>
        </tbody>
      </table>
      <p class="ar-note">
        面试常考三连：<strong>① <code>map(parseInt)</code> 会得到 NaN</strong>；
        <strong>② <code>filter(Boolean)</code> 会把 0 和 '' 一起过滤掉</strong>；
        <strong>③ <code>[].every(...)</code> 是 true</strong>（空集合的全称命题恒真，校验前要先判空）。
      </p>
    </JsCard>

    <JsCard
      title="③ sort 的坑 ★"
      hint="改一下上面的输入框，对比「默认排序」和「传比较函数」的结果差异。"
      :asserts="assertsSort"
      :runnable="runSort"
      tone="danger"
    >
      <template #extra>
        <input v-model="sortInput" class="ar-input" placeholder="用逗号分隔的数字" />
      </template>
      <div class="ar-grid">
        <p class="ar-result">默认 sort()：<strong>{{ sortByDefault || '（空）' }}</strong></p>
        <p class="ar-result">sort((a,b) =&gt; a-b)：<strong>{{ sortByNumber || '（空）' }}</strong></p>
        <p class="ar-result">sort((a,b) =&gt; b-a)：<strong>{{ sortByNumberDesc || '（空）' }}</strong></p>
      </div>
      <p class="ar-note">
        规律：<strong>默认排序 = 先转字符串，再按 UTF-16 码点比</strong>，所以 "10" 排在 "9" 前面。
        比较函数的返回值含义：负数 → a 在前；正数 → b 在前；0 → 保持相对顺序（ES2019 起排序是稳定的）。
      </p>
    </JsCard>

    <JsCard
      title="④ reduce 的多种用法"
      hint="需要「把数组变成一个值（或一个对象 / 一个 Map）」时，reduce 是唯一选择。"
      :asserts="assertsReduce"
      :runnable="runReduce"
    >
      <template #extra>
        <input v-model="reduceInput" class="ar-input" placeholder="用逗号分隔的数字" />
      </template>
      <div class="ar-grid">
        <p class="ar-result">个数：<strong>{{ reduceStats.count }}</strong></p>
        <p class="ar-result">求和：<strong>{{ reduceStats.sum }}</strong></p>
        <p class="ar-result">平均：<strong>{{ reduceStats.avg }}</strong></p>
        <p class="ar-result">最大：<strong>{{ reduceStats.max }}</strong></p>
        <p class="ar-result">去重：<strong>{{ reduceStats.unique }}</strong></p>
        <p class="ar-result">偶数：<strong>{{ reduceStats.even }}</strong></p>
      </div>
      <pre class="code ar-code">// reduce 的三种典型骨架
// 1) 求和 / 统计：初始值是数字
const total = list.reduce((sum, item) => sum + item.price * item.qty, 0)

// 2) 分组：初始值是对象（acc[key] ??= [] 是惯用写法）
const grouped = users.reduce((acc, u) => {
  (acc[u.role] ??= []).push(u.name)
  return acc
}, {})

// 3) 建索引：初始值是 Map 或对象
const byId = list.reduce((map, item) => map.set(item.id, item), new Map())</pre>
      <p class="ar-note">
        两个提醒：<strong>① 永远给初始值</strong>（否则空数组会抛
        <code>TypeError: Reduce of empty array with no initial value</code>）；
        <strong>② <code>Object.groupBy</code> 已经把「分组」这件事标准化了</strong>，
        浏览器已广泛支持，能用就用它（本项目 lib 是 ES2020，用的时候可能要给类型打个补丁）。
      </p>
    </JsCard>

    <JsCard
      title="⑤ 查找、复制、合并与深浅拷贝"
      hint="复制数组先判断「里面有没有对象」：全是原始值，展开就够了；有嵌套对象，必须 structuredClone。"
      :asserts="assertsFindCopy"
      :runnable="runFindCopy"
    >
      <table class="ar-table">
        <thead>
          <tr>
            <th>需求</th>
            <th>推荐写法</th>
            <th>注意</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>找元素 / 判断存在</td>
            <td><code>find</code> / <code>includes</code></td>
            <td><code>includes</code> 能找到 NaN，<code>indexOf</code> 不能</td>
          </tr>
          <tr>
            <td>浅拷贝</td>
            <td><code>[...arr]</code> / <code>arr.slice()</code></td>
            <td>只复制第一层，嵌套对象仍共享</td>
          </tr>
          <tr>
            <td>深拷贝</td>
            <td><code>structuredClone(arr)</code></td>
            <td>支持循环引用；不能克隆函数 / DOM</td>
          </tr>
          <tr>
            <td>合并</td>
            <td><code>[...a, ...b]</code>（新数组）</td>
            <td><code>concat</code> 也能合并，且能接非数组参数</td>
          </tr>
          <tr>
            <td>去重</td>
            <td><code>[...new Set(arr)]</code></td>
            <td>保持首次出现的顺序；对象去重不生效</td>
          </tr>
          <tr>
            <td>取最后一个</td>
            <td><code>arr.at(-1)</code></td>
            <td><code>arr[arr.length - 1]</code> 是老写法</td>
          </tr>
          <tr>
            <td>替换某个下标</td>
            <td><code>arr.with(i, v)</code> / <code>arr.splice</code></td>
            <td><code>with</code> 返回新数组，支持负下标</td>
          </tr>
          <tr>
            <td>类数组转数组</td>
            <td><code>Array.from(x)</code></td>
            <td>还能传映射函数 + 配合 <code>&#123; length: n &#125;</code> 造数组</td>
          </tr>
        </tbody>
      </table>
    </JsCard>

    <JsCard
      title="⑥ Vue 列表渲染里最常用的 5 个方法 + 坑清单"
      hint="列表页写多了就会发现：90% 的情况就是这 5 个方法。"
      tone="warn"
    >
      <p class="ar-sub">1. map —— 渲染前把数据「整形」</p>
      <pre class="code ar-code">// 把后端字段转成组件需要的形状（放在 computed 里，有缓存）
const rows = computed(() =&gt; list.value.map((it) =&gt; (&#123;
  id: it.id,
  label: it.name + '（' + it.type + '）',
  price: (it.price / 100).toFixed(2),
&#125;)))</pre>
      <p class="ar-sub">2. filter —— 搜索 / 筛选</p>
      <pre class="code ar-code">const visible = computed(() =&gt;
  rows.value.filter((r) =&gt; r.label.toLowerCase().includes(keyword.value.toLowerCase())),
)</pre>
      <p class="ar-sub">3. find —— 选中项 / 详情</p>
      <pre class="code ar-code">const current = computed(() =&gt; rows.value.find((r) =&gt; r.id === activeId.value))
const isActive = (id) =&gt; rows.value.some((r) =&gt; r.id === id &amp;&amp; r.id === activeId.value)</pre>
      <p class="ar-sub">4. reduce —— 汇总统计（购物车总价）</p>
      <pre class="code ar-code">const total = computed(() =&gt; cart.value.reduce((sum, it) =&gt; sum + it.price * it.qty, 0))</pre>
      <p class="ar-sub">5. sort / toSorted —— 排序（注意别改到原数组）</p>
      <pre class="code ar-code">// sort 会改原数组，而 computed 里改原数组会造成「意外的联动」
const sorted = computed(() =&gt; [...rows.value].sort((a, b) =&gt; a.price - b.price))
// 或者（ES2023）：rows.value.toSorted((a, b) =&gt; a.price - b.price)</pre>

      <p class="ar-sub">坑清单</p>
      <ol class="ar-list">
        <li><code>sort()</code> 不传比较函数 → 数字按字符串排，结果错得毫无规律。</li>
        <li><code>map(parseInt)</code> / <code>map(parseFloat)</code> → 回调多接了下标参数，结果 NaN。</li>
        <li><code>filter(Boolean)</code> 会把 <code>0</code>、<code>''</code>、<code>NaN</code> 一起过滤掉。</li>
        <li><code>[]</code> 上 <code>every</code> 返回 true、<code>some</code> 返回 false —— 校验前先判空。</li>
        <li><code>reduce</code> 不给初始值 + 空数组 → TypeError。</li>
        <li><code>[...a]</code> 只复制第一层，改嵌套对象会影响原数组。</li>
        <li>
          <code>JSON.parse(JSON.stringify(x))</code> 深拷贝会丢 <code>undefined</code>/函数、
          把 <code>Date</code> 变字符串、<code>Set</code> 变空对象、循环引用直接报错 →
          用 <code>structuredClone</code>。
        </li>
        <li>
          <code>v-for</code> 的 <code>:key</code> 不要用数组下标（插入/删除/排序时会导致复用错乱），
          用数据自己的唯一 id。
        </li>
        <li>
          Vue 3 的响应式基于 Proxy，<strong><code>arr[0] = x</code> 和 <code>arr.length = 0</code> 都能触发更新</strong>
          （Vue 2 不行，必须用 <code>splice</code>）；但为了可读性，改数组还是优先用变异方法。
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
.ar-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.7;
}
.ar-sub {
  margin: 12px 0 6px;
  font-weight: 600;
  font-size: 12.5px;
}
.ar-table {
  margin-top: 10px;
  font-size: 12.5px;
}
.ar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.ar-input {
  min-width: 220px;
}
.ar-result {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-family: var(--mono);
  font-size: 12.5px;
}
.ar-code {
  margin: 0;
  background: #282c34;
  color: #abb2bf;
  padding: 12px 14px;
  border-radius: 8px;
  overflow: auto;
  line-height: 1.55;
  font-size: 12.5px;
}
.ar-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--c-text-dim);
  line-height: 1.9;
}
</style>
