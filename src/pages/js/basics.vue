<script setup lang="ts">
import { computed, ref } from 'vue'
import JsCard from '@/components/JsCard.vue'

/* ============================================================================
 * 1. 变量、类型与转换
 *
 * 这一页把「JS 的地基」一次说清：
 *   ① var / let / const：作用域、重复声明、暂时性死区（TDZ）
 *   ② 8 种类型 + typeof 结果表（顺手记住 typeof null === 'object' 这个历史 bug）
 *   ③ 显式转换：Number / String / Boolean / parseInt / parseFloat（带实验台）
 *   ④ 隐式转换：+ 号、== 的规则、[] + {} 与 {} + []
 *   ⑤ falsy 值清单、NaN、Object.is
 *   ⑥ 原始值 vs 引用值：为什么「改一个对象会影响另一个变量」
 *
 * 断言区的 actual 都写成「表达式本身」，左右对照着看最直观。
 * 注意：断言在组件初始化时求值，所以任何可能抛错的表达式都要用 probe() 包起来，
 * 否则一个 ReferenceError 会让整页白屏。
 * ========================================================================== */

/** 把「可能抛错的表达式」包起来：正常返回值的文本，抛错返回错误名 */
function probe(fn: () => unknown): string {
  try {
    const v = fn()
    if (typeof v === 'string') return `'${v}'`
    return String(v)
  } catch (e) {
    return (e as Error).name
  }
}

/** 语法错误只有在「编译一段新代码」时才会暴露，所以用 Function 构造器探测 */
function probeSyntax(src: string): string {
  try {
    // eslint-disable-next-line no-new-func
    new Function(src)
    return 'OK'
  } catch (e) {
    return (e as Error).name
  }
}

/** 断言里故意比较「不同类型的值」，所以要绕开 TS 的「类型没有交集」检查 */
// eslint-disable-next-line eqeqeq
const looseEq = (a: unknown, b: unknown): boolean => (a as any) == (b as any)
const strictEq = (a: unknown, b: unknown): boolean => a === b

/** 故意引用一个不存在的标识符：typeof 对未声明的变量不报错 */
function probeUndeclared(): string {
  // @ts-ignore 演示用，真实项目里这种拼写错误会被 TS 直接拦下
  return typeof totallyNotDeclaredName
}

// ---------------------------------------------------------------------------
// ① var / let / const
// ---------------------------------------------------------------------------
const assertsDeclare = [
  {
    expr: 'let 是块级作用域：{ let x = 2 } 不影响外层',
    actual: (() => {
      let x = 1
      {
        let x = 2
        void x
      }
      return x
    })(),
    expected: 1,
  },
  {
    expr: 'const 锁的是绑定，不是内容',
    actual: (() => {
      const o = { n: 1 }
      o.n = 2
      return o.n
    })(),
    expected: 2,
    note: '想禁止改属性用 Object.freeze（浅冻结）',
  },
  {
    expr: 'let 声明但没赋值 → undefined',
    actual: (() => {
      let v: number | undefined
      return String(v)
    })(),
    expected: 'undefined',
  },
  {
    expr: "var 允许重复声明：'var a = 1; var a = 2'",
    actual: probeSyntax('var a = 1; var a = 2; return a'),
    expected: 'OK',
    note: 'var 重复声明不报错，后者覆盖前者',
  },
  {
    expr: "let 不允许重复声明：'let a = 1; let a = 2'",
    actual: probeSyntax('let a = 1; let a = 2'),
    expected: 'SyntaxError',
    note: 'Identifier has already been declared',
  },
  {
    expr: "const 必须立即初始化：'const a'",
    actual: probeSyntax('const a'),
    expected: 'SyntaxError',
    note: 'Missing initializer in const declaration',
  },
  {
    expr: '同一作用域里 let 也会遮蔽外层同名变量',
    actual: (() => {
      let n = 'outer'
      {
        let n = 'inner'
        void n
      }
      return n
    })(),
    expected: 'outer',
  },
]

const runDeclare = `// 本页所有代码都跑在「严格模式」下（ESM 模块 / new Function 都自带 "use strict"）
console.log('=== var：函数作用域 + 变量提升 ===')

function varScope() {
  if (true) {
    var a = 1          // var 无视块级作用域
  }
  return a             // 1：块外面照样能读到
}
console.log('if 块里 var a，块外读到 a =', varScope())

function varHoist() {
  var before = typeof b   // 'undefined'：var 被提升到函数顶部，但还没赋值
  var b = 2
  return before
}
console.log('var 声明之前 typeof 得到：', varHoist())

console.log('')
console.log('=== let / const：块级作用域 + TDZ ===')

function letScope() {
  let x = 1
  {
    let x = 2          // 全新的绑定，和外层 x 无关
  }
  return x
}
console.log('内层 let 不影响外层：', letScope())

try {
  console.log(tdz)     // 这里在 TDZ 里 → 抛 ReferenceError
} catch (e) {
  console.log('在 let 声明之前访问（TDZ）→', e.name + ': ' + e.message)
}
let tdz = 1

try {
  console.log(typeof tdz2)   // TDZ 里连 typeof 都会抛，这跟「未声明的变量」完全不同
} catch (e) {
  console.log('TDZ 里 typeof 也会抛 →', e.name)
}
let tdz2 = 1

console.log('typeof 未声明的变量 →', typeof neverDeclared)   // 'undefined'，不报错

try {
  const c = 1
  c = 2                // 严格模式下给 const 重新赋值 → TypeError
} catch (e) {
  console.log('给 const 重新赋值 →', e.name + ': ' + e.message)
}

const obj = { n: 1 }
obj.n = 2              // const 锁的是「绑定」，不是「内容」
console.log('const 对象的属性可以改：', obj.n)

console.log('')
console.log('=== 作用域小陷阱：循环里的 var 会「漏」出去 ===')
for (var i = 0; i < 3; i++) {}
console.log('循环结束后 i =', i, '（循环里的 var 属于函数作用域，详见第 3 页闭包）')`

// ---------------------------------------------------------------------------
// ② 8 种类型 + typeof
// ---------------------------------------------------------------------------
const assertsTypes = [
  { expr: "typeof 'str'", actual: typeof 'str', expected: 'string' },
  { expr: 'typeof 1', actual: typeof 1, expected: 'number' },
  { expr: 'typeof NaN', actual: typeof NaN, expected: 'number', note: 'NaN 也是 number，要用 Number.isNaN 判断' },
  { expr: 'typeof 1n（BigInt 字面量）', actual: typeof 1n, expected: 'bigint' },
  { expr: 'typeof true', actual: typeof true, expected: 'boolean' },
  { expr: 'typeof undefined', actual: typeof undefined, expected: 'undefined' },
  { expr: 'typeof null', actual: typeof null, expected: 'object', note: '历史 bug，永远不会修；判断 null 请用 === null' },
  { expr: "typeof Symbol('s')", actual: typeof Symbol('s'), expected: 'symbol' },
  { expr: 'typeof {}', actual: typeof {}, expected: 'object' },
  { expr: 'typeof []', actual: typeof [], expected: 'object', note: '数组也是 object，判断数组用 Array.isArray' },
  { expr: 'typeof (() => {})', actual: typeof (() => {}), expected: 'function', note: '函数本质是对象，但 typeof 单独给了 function' },
  { expr: 'typeof class {}', actual: typeof class {}, expected: 'function' },
  {
    expr: 'typeof 一个从未声明过的变量',
    actual: probeUndeclared(),
    expected: 'undefined',
    note: '不报错，所以拼错变量名时 typeof 检查会骗你',
  },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: "'a' instanceof String（原始值不是包装对象）", actual: 'a' instanceof String, expected: false },
  { expr: 'new String("a") instanceof String', actual: new String('a') instanceof String, expected: true },
  { expr: 'Array.isArray([])', actual: Array.isArray([]), expected: true },
]

// ---------------------------------------------------------------------------
// ③ 显式转换实验台（卡片右侧可交互）
// ---------------------------------------------------------------------------
const rawText = ref('12px')
const rawType = ref('string')
const convFn = ref('Number')
const rawTypes = ['string', 'number', 'boolean', 'null', 'undefined', 'array', 'object'] as const
const convFns = ['Number', 'String', 'Boolean', 'parseInt', 'parseFloat', '一元 +'] as const

/** 按「原始值的类型」把输入框里的文本变成真正的值 */
function currentRaw(): unknown {
  const t = rawText.value
  switch (rawType.value) {
    case 'number':
      return Number(t)
    case 'boolean':
      return t === 'true'
    case 'null':
      return null
    case 'undefined':
      return undefined
    case 'array':
      return t.split(',').filter((s) => s !== '')
    case 'object':
      return { text: t }
    default:
      return t
  }
}

const convResult = computed(() => {
  const v = currentRaw()
  return probe(() => {
    switch (convFn.value) {
      case 'String':
        return String(v)
      case 'Boolean':
        return Boolean(v)
      case 'parseInt':
        return parseInt(String(v), 10)
      case 'parseFloat':
        return parseFloat(String(v))
      case '一元 +':
        return +(v as any)
      default:
        return Number(v as any)
    }
  })
})

const assertsConvert = [
  { expr: "Number('')", actual: Number(''), expected: 0, note: '空串 → 0，和直觉相反' },
  { expr: "Number('   ')", actual: Number('   '), expected: 0, note: '纯空白也是 0' },
  { expr: "Number('12px')", actual: Number('12px'), expected: NaN, note: '只要有一个字符不合法就是 NaN' },
  { expr: 'Number(null)', actual: Number(null), expected: 0 },
  { expr: 'Number(undefined)', actual: Number(undefined), expected: NaN },
  { expr: 'Number(true)', actual: Number(true), expected: 1 },
  { expr: 'Number([])', actual: Number([]), expected: 0, note: '[] → "" → 0' },
  { expr: 'Number([7])', actual: Number([7]), expected: 7 },
  { expr: 'Number([1, 2])', actual: Number([1, 2]), expected: NaN, note: '"1,2" 不是合法数字' },
  { expr: 'Number({})', actual: Number({}), expected: NaN },
  { expr: 'Number(Symbol())', actual: probe(() => Number(Symbol('s'))), expected: 'TypeError', note: 'Symbol 不能转成数字' },
  { expr: "parseInt('12px')", actual: parseInt('12px', 10), expected: 12, note: 'parseInt 是「从左往右尽力解析」' },
  { expr: "parseInt('px12')", actual: parseInt('px12', 10), expected: NaN },
  { expr: "parseInt('3.9')", actual: parseInt('3.9', 10), expected: 3, note: '直接截断，不四舍五入' },
  { expr: "parseInt('')", actual: parseInt('', 10), expected: NaN, note: "对比：Number('') 是 0，parseInt('') 是 NaN" },
  { expr: "parseInt('0x10')", actual: parseInt('0x10'), expected: 16, note: '不传基数也能识别 0x 前缀' },
  { expr: "parseInt('10', 2)", actual: parseInt('10', 2), expected: 2, note: '务必传第二个参数，避开历史八进制坑' },
  { expr: "parseFloat('3.14abc')", actual: parseFloat('3.14abc'), expected: 3.14 },
  { expr: 'String(null)', actual: String(null), expected: 'null' },
  { expr: 'String(undefined)', actual: String(undefined), expected: 'undefined' },
  { expr: 'String([1, 2])', actual: String([1, 2]), expected: '1,2' },
  { expr: 'String({})', actual: String({}), expected: '[object Object]' },
  { expr: 'String(Symbol("s"))', actual: String(Symbol('s')), expected: 'Symbol(s)', note: 'String() 可以，隐式拼接不行（见下一张卡）' },
  { expr: 'Boolean(0)', actual: Boolean(0), expected: false },
  { expr: "Boolean('0')", actual: Boolean('0'), expected: true, note: '非空字符串永远是 true' },
  { expr: "Boolean('')", actual: Boolean(''), expected: false },
  { expr: 'Boolean([])', actual: Boolean([]), expected: true, note: '空数组 / 空对象都是 true' },
  { expr: 'Boolean(0n)', actual: Boolean(0n), expected: false },
  { expr: '+true（一元加号等价于 Number）', actual: +true, expected: 1 },
  { expr: "+''", actual: +'', expected: 0 },
  { expr: '0.1 + 0.2 === 0.3', actual: 0.1 + 0.2 === 0.3, expected: false, note: '浮点误差，比较前先 toFixed 或放大取整' },
  { expr: '(0.1 + 0.2).toFixed(2)', actual: (0.1 + 0.2).toFixed(2), expected: '0.30' },
]

// ---------------------------------------------------------------------------
// ④ 隐式转换 + == 对比台
// ---------------------------------------------------------------------------
const eqOptions = [
  { key: 'num1', label: '1（number）', value: 1 as unknown },
  { key: 'str1', label: "'1'（string）", value: '1' as unknown },
  { key: 'num0', label: '0（number）', value: 0 as unknown },
  { key: 'str0', label: "'0'（string）", value: '0' as unknown },
  { key: 'empty', label: "''（空串）", value: '' as unknown },
  { key: 'space', label: "' \\t'（空白串）", value: ' \t' as unknown },
  { key: 'nul', label: 'null', value: null as unknown },
  { key: 'undef', label: 'undefined', value: undefined as unknown },
  { key: 'nan', label: 'NaN', value: NaN as unknown },
  { key: 'tru', label: 'true', value: true as unknown },
  { key: 'fls', label: 'false', value: false as unknown },
  { key: 'arr0', label: '[]（空数组）', value: [] as unknown },
  { key: 'arr1', label: '[1]', value: [1] as unknown },
  { key: 'obj', label: '{}（空对象）', value: {} as unknown },
]
const eqLeftKey = ref('num0')
const eqRightKey = ref('str0')
function eqPick(key: string): unknown {
  return eqOptions.find((o) => o.key === key)!.value
}
const eqLeft = computed(() => eqPick(eqLeftKey.value))
const eqRight = computed(() => eqPick(eqRightKey.value))
const eqLoose = computed(() => looseEq(eqLeft.value, eqRight.value))
const eqStrict = computed(() => strictEq(eqLeft.value, eqRight.value))

const assertsCoerce = [
  { expr: "'1' + 1", actual: '1' + 1, expected: '11', note: '只要有一边是字符串，+ 就是拼接' },
  { expr: "1 + 2 + '3'", actual: 1 + 2 + '3', expected: '33', note: '从左往右：先 1 + 2 = 3，再拼成字符串' },
  { expr: "'3' - 1", actual: ('3' as any) - 1, expected: 2, note: '只有 + 有「拼接」重载，- * / 一律转数字' },
  { expr: "'3' * '2'", actual: ('3' as any) * ('2' as any), expected: 6 },
  { expr: '[] + {}', actual: ([] as any) + ({} as any), expected: '[object Object]' },
  {
    expr: '({} + [])（表达式位置）',
    actual: ({} as any) + ([] as any),
    expected: '[object Object]',
    note: '语句位置的 {} 会被当成空代码块，见下面的运行结果',
  },
  { expr: "'10' < '9'", actual: '10' < '9', expected: true, note: '两边都是字符串 → 按字典序比字符，不是比数值' },
  { expr: "'10' < 9", actual: ('10' as any) < 9, expected: false, note: '有一边是数字 → 都转成数字' },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误（TS2358）
  { expr: '3 > 2 > 1', actual: 3 > 2 > 1, expected: false, note: '(3 > 2) 得 true，true > 1 → 1 > 1 → false' },

  { expr: "1 == '1'", actual: looseEq(1, '1'), expected: true, note: '== 会先把字符串转成数字' },
  { expr: "1 === '1'", actual: strictEq(1, '1'), expected: false, note: '=== 类型不同直接 false，不做转换' },
  { expr: "0 == ''", actual: looseEq(0, ''), expected: true },
  { expr: '0 == false', actual: looseEq(0, false), expected: true },
  { expr: 'null == undefined', actual: looseEq(null, undefined), expected: true, note: '这是 == 里唯一「不转数字」的特例' },
  { expr: 'null === undefined', actual: strictEq(null, undefined), expected: false },
  { expr: 'null == 0', actual: looseEq(null, 0), expected: false, note: 'null 只和 undefined 相等，不跟 0 走' },
  { expr: 'null >= 0', actual: (null as unknown as number) >= 0, expected: true, note: '关系运算符走 ToNumber，null → 0' },
  { expr: 'NaN == NaN', actual: looseEq(NaN, NaN), expected: false },
  { expr: '[] == false', actual: looseEq([] as unknown, false), expected: true, note: '[] → "" → 0，false → 0' },
  { expr: '[] == 0', actual: looseEq([] as unknown, 0), expected: true },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: '[] == ![]', actual: looseEq([] as unknown, ![]), expected: true, note: '面试名场面：![] 是 false，[] == false 又是 true' },
  { expr: '[1] == 1', actual: looseEq([1] as unknown, 1), expected: true },
  { expr: "'abc' == 0", actual: looseEq('abc', 0), expected: false, note: "Number('abc') 是 NaN，NaN 和谁都不等" },
  { expr: "'' == '0'", actual: looseEq('', '0'), expected: false, note: '两边都是字符串 → 直接比内容，不转数字' },
  { expr: "' \\t' == 0", actual: looseEq(' \t', 0), expected: true, note: '空白串转数字是 0' },
]

const runCoerce = `console.log('=== + 号：只要有一边是字符串，就是拼接 ===')
console.log("'1' + 1 =", '1' + 1)
console.log("1 + 2 + '3' =", 1 + 2 + '3')     // 先算 1 + 2 = 3，再拼成 '33'
console.log("'3' - 1 =", '3' - 1)             // 只有 + 会拼接，- * / 都转数字
console.log("'5' * '2' =", '5' * '2')

console.log('')
console.log('=== 加号碰上数组 / 对象：先转成原始值 ===')
console.log('[] + {} =', [] + {})             // '' + '[object Object]'
console.log('[] + [] =', [] + [])
console.log('[1,2] + [3,4] =', [1, 2] + [3, 4])
console.log('+[] =', +[])                     // Number('') → 0
console.log('+{} =', +{})                     // Number('[object Object]') → NaN

console.log('')
console.log('=== {} + [] 为什么是 0？ ===')
var r = eval('{} + []')        // 语句位置：{} 被当成「空代码块」，剩下 +[] → 0
console.log("eval('{} + []') =", r)
console.log('({} + []) =', ({} + []))          // 表达式位置才是字符串拼接

console.log('')
console.log('=== Symbol 的特殊待遇 ===')
console.log('String(Symbol("s")) =', String(Symbol('s')))   // 显式转换可以
try {
  console.log('' + Symbol('s'))                // 隐式转字符串 → 抛 TypeError
} catch (e) {
  console.log("'' + Symbol('s') →", e.name + ': ' + e.message)
}

console.log('')
console.log('=== 比较运算也会隐式转换 ===')
console.log("'10' < '9' =", '10' < '9')        // 两边都是字符串 → 比字符编码
console.log("'10' < 9 =", '10' < 9)            // 有一边是数字 → 都转数字
console.log('3 > 2 > 1 =', 3 > 2 > 1)          // (3>2)=true → true>1 → 1>1 → false
console.log('null >= 0 =', null >= 0, '/ null > 0 =', null > 0)

console.log('')
console.log('=== == 的三大特例（背下来） ===')
console.log('null == undefined →', null == undefined)
console.log('null == 0 →', null == 0)
console.log('NaN == NaN →', NaN == NaN)
console.log('[] == ![] →', [] == ![])`

// ---------------------------------------------------------------------------
// ⑤ falsy 值、NaN、Object.is
// ---------------------------------------------------------------------------
const assertsFalsy = [
  { expr: 'Boolean(0)', actual: Boolean(0), expected: false },
  { expr: 'Boolean(-0)', actual: Boolean(-0), expected: false },
  { expr: 'Boolean(0n)', actual: Boolean(0n), expected: false },
  { expr: "Boolean('')", actual: Boolean(''), expected: false },
  { expr: 'Boolean(null)', actual: Boolean(null), expected: false },
  { expr: 'Boolean(undefined)', actual: Boolean(undefined), expected: false },
  { expr: 'Boolean(NaN)', actual: Boolean(NaN), expected: false },
  { expr: 'Boolean(false)', actual: Boolean(false), expected: false },
  {
    expr: 'falsy 值的数量（false/0/-0/0n/""/null/undefined/NaN）',
    actual: [false, 0, -0, 0n, '', null, undefined, NaN].filter((v) => !v).length,
    expected: 8,
  },
  { expr: "Boolean('false')", actual: Boolean('false'), expected: true, note: '非空字符串一律 truthy' },
  { expr: 'Boolean([]) && Boolean({})', actual: Boolean([]) && Boolean({}), expected: true, note: '对象永远是 truthy' },
  // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
  { expr: 'NaN === NaN', actual: NaN === NaN, expected: false, note: 'NaN 是唯一不等于自己的值' },
  { expr: 'Object.is(NaN, NaN)', actual: Object.is(NaN, NaN), expected: true },
  { expr: '0 === -0', actual: 0 === -0, expected: true },
  { expr: 'Object.is(0, -0)', actual: Object.is(0, -0), expected: false, note: 'Object.is 会区分 +0 / -0' },
  { expr: "isNaN('abc')（先隐式转数字）", actual: isNaN('abc' as any), expected: true },
  { expr: "Number.isNaN('abc')（不转换）", actual: Number.isNaN('abc' as any), expected: false, note: '项目里一律用 Number.isNaN' },
  { expr: 'Number.isNaN(NaN)', actual: Number.isNaN(NaN), expected: true },
  { expr: "isFinite('1')", actual: isFinite('1' as any), expected: true },
  { expr: "Number.isFinite('1')", actual: Number.isFinite('1' as any), expected: false },
  { expr: 'Number.isInteger(1.0)', actual: Number.isInteger(1.0), expected: true, note: 'JS 里没有 int/float 之分' },
  { expr: 'Number.isSafeInteger(2 ** 53)', actual: Number.isSafeInteger(2 ** 53), expected: false, note: '超过 2^53 - 1 的整数不再精确' },
  { expr: '0.1 + 0.2', actual: 0.1 + 0.2, expected: 0.30000000000000004, note: 'IEEE 754 双精度浮点的固有误差' },
]

// ---------------------------------------------------------------------------
// ⑥ 原始值 vs 引用值
// ---------------------------------------------------------------------------
const assertsRef = [
  {
    expr: '原始值赋值：b = a 之后改 b，a 不变',
    actual: (() => {
      const a = 1
      // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
      let b = a
      b = 2
      return a
    })(),
    expected: 1,
  },
  {
    expr: '引用值赋值：const b = a 之后改 b.n',
    actual: (() => {
      const a = { n: 1 }
      const b = a
      b.n = 99
      return a.n
    })(),
    expected: 99,
    note: '两个变量指向同一个对象，改谁都一样',
  },
  {
    expr: '同一个对象两个名字：a === b',
    actual: (() => {
      const a = { n: 1 }
      const b = a
      return a === b
    })(),
    expected: true,
  },
  {
    expr: '{ n: 1 } === { n: 1 }（内容一样但不是同一个对象）',
    // @ts-expect-error 教学演示：这里故意是 TS 眼里的错误
    actual: { n: 1 } === { n: 1 },
    expected: false,
    note: '=== 对对象比的是「引用地址」，不是内容',
  },
  {
    expr: '函数参数传对象：在函数里改属性会影响外面',
    actual: (() => {
      const o = { n: 1 }
      const f = (x: { n: number }) => {
        x.n = 2
      }
      f(o)
      return o.n
    })(),
    expected: 2,
  },
  {
    expr: '函数参数传对象：给参数重新赋值不影响外面',
    actual: (() => {
      const o = { n: 1 }
      // 参数重新赋值只改本地变量：下面这行不影响外面的 o
      const f = (x: { n: number }) => {
        x = { n: 2 }
        void x
      }
      f(o)
      return o.n
    })(),
    expected: 1,
    note: '重新赋值只是让局部变量 x 指向了新对象',
  },
  {
    expr: '浅拷贝断开第一层：{ ...a }',
    actual: (() => {
      const a = { n: 1, inner: { v: 1 } }
      const b = { ...a }
      b.n = 9
      return a.n
    })(),
    expected: 1,
  },
  {
    expr: '浅拷贝管不住嵌套：b.inner.v = 9',
    actual: (() => {
      const a = { n: 1, inner: { v: 1 } }
      const b = { ...a }
      b.inner.v = 9
      return a.inner.v
    })(),
    expected: 9,
    note: '浅拷贝只复制第一层，嵌套对象还是同一个引用',
  },
  {
    expr: '深拷贝 structuredClone 才能真正隔离',
    actual: (() => {
      const a = { inner: { v: 1 } }
      const b = structuredClone(a)
      b.inner.v = 9
      return a.inner.v
    })(),
    expected: 1,
  },
  {
    expr: '字符串是原始值：赋值之后再改原变量',
    actual: (() => {
      let s = 'abc'
      const t = s
      s = s.toUpperCase()
      return t
    })(),
    expected: 'abc',
  },
  {
    expr: '数组也是引用值：const b = a; b.push(3)',
    actual: (() => {
      const a = [1, 2]
      const b = a
      b.push(3)
      return a.length
    })(),
    expected: 3,
  },
  {
    expr: 'Vue 里为什么必须「替换引用」才能触发更新？（同一个引用判断）',
    actual: (() => {
      const a = [1, 2]
      const same = a
      return same === a
    })(),
    expected: true,
    note: '所以响应式里对数组要么改内容（push/splice），要么换成新数组',
  },
]

const runRef = `console.log('=== 原始值：赋值就是复制一份 ===')
let a = 1
let b = a
b = 2
console.log('a =', a, '/ b =', b)

console.log('')
console.log('=== 引用值：复制的是「地址」 ===')
const o1 = { n: 1 }
const o2 = o1            // o2 和 o1 指向同一个对象
o2.n = 99
console.log('o1.n =', o1.n, ' ← 改 o2 就是改 o1')
console.log('o1 === o2 →', o1 === o2)

console.log('长得一样但不是同一个对象：', ({ n: 1 }) === ({ n: 1 }))

console.log('')
console.log('=== 想断开联动：复制一份 ===')
const o4 = { n: 1, inner: { deep: 1 } }
const o5 = { ...o4 }       // 浅拷贝：第一层是新的，里面还是同一个引用
o5.n = 100
o5.inner.deep = 100
console.log('o4.n =', o4.n, '（没被影响）')
console.log('o4.inner.deep =', o4.inner.deep, '（被影响了！浅拷贝只复制第一层）')

const o6 = structuredClone(o4)   // 深拷贝（现代浏览器 / Node 17+）
o6.inner.deep = 7
console.log('深拷贝后 o4.inner.deep =', o4.inner.deep)

console.log('')
console.log('=== 数组同理 ===')
const arr1 = [1, 2]
const arr2 = arr1
arr2.push(3)
console.log('arr1 =', arr1, '← arr1 也被改了')

console.log('')
console.log('=== 常见的「想复制却还是同一个引用」 ===')
const src = { list: [1, 2] }
const fakeCopy = { ...src }            // 浅拷贝：list 还是同一个数组
fakeCopy.list.push(3)
console.log('src.list =', src.list)

const realCopy = structuredClone(src)  // 深拷贝：彻底隔离
realCopy.list.push(4)
console.log('src.list 依然 =', src.list)`

// ---------------------------------------------------------------------------
// 卡片右侧的交互控制器用到的辅助展示
// ---------------------------------------------------------------------------
const rawPreview = computed(() => probe(() => currentRaw()))
const eqLeftLabel = computed(() => eqOptions.find((o) => o.key === eqLeftKey.value)!.label)
const eqRightLabel = computed(() => eqOptions.find((o) => o.key === eqRightKey.value)!.label)
</script>

<template>
  <div>
    <h1>1. 变量、类型与转换</h1>
    <p class="lead">
      JS 只有 <strong>8 种类型</strong>（7 种原始值 + object），变量本身没有类型，
      <strong>值的类型决定一切</strong>；<code>==</code> 会偷偷做类型转换，所以
      <strong>项目里一律用 <code>===</code></strong>；<code>typeof null === 'object'</code> 是修不掉的历史
      bug，判断 null 请直接用 <code>=== null</code>。
    </p>

    <JsCard
      title="① var / let / const：作用域、重复声明、TDZ"
      hint="结论先记住：新代码一律 const 优先，需要重新赋值才用 let，var 只在维护老代码时出现。"
      :asserts="assertsDeclare"
      :runnable="runDeclare"
    >
      <p class="bs-note">
        <strong>var</strong>：函数作用域 + 变量提升（提升后是 <code>undefined</code>），允许重复声明。
        <strong>let / const</strong>：块级作用域 + 暂时性死区 TDZ（从进入作用域到执行到声明语句之间，访问就抛
        <code>ReferenceError</code>）。
      </p>
      <table class="bs-table">
        <thead>
          <tr>
            <th>对比项</th>
            <th>var</th>
            <th>let</th>
            <th>const</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>作用域</td>
            <td>函数作用域</td>
            <td>块级作用域</td>
            <td>块级作用域</td>
          </tr>
          <tr>
            <td>提升后的初始值</td>
            <td>undefined</td>
            <td>未初始化（TDZ）</td>
            <td>未初始化（TDZ）</td>
          </tr>
          <tr>
            <td>重复声明</td>
            <td>允许</td>
            <td>SyntaxError</td>
            <td>SyntaxError</td>
          </tr>
          <tr>
            <td>必须初始化</td>
            <td>否</td>
            <td>否</td>
            <td>是</td>
          </tr>
          <tr>
            <td>挂到 window 上</td>
            <td>是（全局 var）</td>
            <td>否</td>
            <td>否</td>
          </tr>
        </tbody>
      </table>
    </JsCard>

    <JsCard
      title="② 8 种类型与 typeof 结果表"
      hint="typeof 只能区分「原始值 + function」，剩下的全是 object —— 所以判断数组/日期/正则要用别的手段。"
      :asserts="assertsTypes"
    >
      <table class="bs-table">
        <thead>
          <tr>
            <th>值</th>
            <th>typeof 结果</th>
            <th>准确判断方式</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>'abc'</code></td>
            <td>string</td>
            <td><code>typeof x === 'string'</code></td>
          </tr>
          <tr>
            <td><code>1</code> / <code>NaN</code> / <code>Infinity</code></td>
            <td>number</td>
            <td><code>Number.isNaN(x)</code> 单独判 NaN</td>
          </tr>
          <tr>
            <td><code>10n</code></td>
            <td>bigint</td>
            <td><code>typeof x === 'bigint'</code></td>
          </tr>
          <tr>
            <td><code>true</code></td>
            <td>boolean</td>
            <td><code>typeof x === 'boolean'</code></td>
          </tr>
          <tr>
            <td><code>undefined</code></td>
            <td>undefined</td>
            <td><code>x === undefined</code></td>
          </tr>
          <tr>
            <td><code>null</code></td>
            <td><strong>object</strong>（bug）</td>
            <td><code>x === null</code></td>
          </tr>
          <tr>
            <td><code>Symbol()</code></td>
            <td>symbol</td>
            <td><code>typeof x === 'symbol'</code></td>
          </tr>
          <tr>
            <td><code>{}</code> / <code>[]</code> / <code>new Date()</code></td>
            <td>object</td>
            <td><code>Array.isArray</code> / <code>instanceof</code></td>
          </tr>
          <tr>
            <td><code>() =&gt; {}</code> / <code>class</code></td>
            <td>function</td>
            <td><code>typeof x === 'function'</code></td>
          </tr>
        </tbody>
      </table>
      <p class="bs-note">
        BigInt 用来表示超过 2^53 - 1 的整数：<code>9007199254740993n</code>。
        它不能和 number 直接混算（<code>1n + 1</code> 会抛 <code>TypeError</code>），这是故意的，避免精度悄悄丢失。
      </p>
    </JsCard>

    <JsCard
      title="③ 显式转换实验台"
      hint="同一个值，用不同函数转出来的结果完全不同：注意 Number('') 是 0，而 parseInt('') 是 NaN。"
      :asserts="assertsConvert"
      tone="ok"
    >
      <template #extra>
        <select v-model="rawType" class="bs-mini">
          <option v-for="t in rawTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-model="convFn" class="bs-mini">
          <option v-for="f in convFns" :key="f" :value="f">{{ f }}</option>
        </select>
      </template>
      <div class="bs-row">
        <input v-model="rawText" class="bs-input" placeholder="输入原始文本，如 12px / true / 1,2" />
        <span class="kv">现在的值：{{ rawPreview }}</span>
      </div>
      <p class="bs-result">
        {{ convFn }}({{ rawPreview }}) = <strong>{{ convResult }}</strong>
      </p>
      <p class="bs-note">
        记忆口诀：<strong>Number 要「整串都合法」，parseInt/parseFloat 是「能解析多少算多少」</strong>；
        表单里的数字永远先用 <code>Number()</code> 再配合 <code>Number.isNaN()</code> 校验，
        或者直接用 <code>v-model.number</code>（Vue 帮你转）。
      </p>
    </JsCard>

    <JsCard
      title="④ 隐式转换与 == 对比台"
      hint="== 的规则是「类型不同就先转换」，而转换规则本身又分好几档 —— 这就是它不可预测的原因。"
      :asserts="assertsCoerce"
      :runnable="runCoerce"
      tone="warn"
    >
      <template #extra>
        <select v-model="eqLeftKey" class="bs-mini">
          <option v-for="o in eqOptions" :key="o.key" :value="o.key">{{ o.label }}</option>
        </select>
        <span class="kv">vs</span>
        <select v-model="eqRightKey" class="bs-mini">
          <option v-for="o in eqOptions" :key="o.key" :value="o.key">{{ o.label }}</option>
        </select>
      </template>
      <p class="bs-result">
        {{ eqLeftLabel }} <strong>==</strong> {{ eqRightLabel }} →
        <strong>{{ eqLoose }}</strong> ｜ {{ eqLeftLabel }} <strong>===</strong> {{ eqRightLabel }} →
        <strong>{{ eqStrict }}</strong>
      </p>
      <p class="bs-note">
        只要选择不同类型再对比，就能看到 <code>==</code> 和 <code>===</code> 分道扬镳。
        工程结论：<strong>只在判断 null / undefined 时允许写 <code>x == null</code></strong>
        （它同时匹配两者，是 <code>==</code> 唯一值得用的地方），其余一律 <code>===</code>。
      </p>
    </JsCard>

    <JsCard
      title="⑤ falsy 值清单、NaN 与 Object.is"
      hint="falsy 只有 8 个（含 -0 和 0n 两种写法），其余一切都是 truthy —— 包括 'false'、[]、{}。"
      :asserts="assertsFalsy"
    >
      <div class="bs-grid">
        <div>
          <p class="bs-sub">falsy 值（Boolean(x) === false）</p>
          <ul class="bs-list">
            <li><code>false</code></li>
            <li><code>0</code> 与 <code>-0</code></li>
            <li><code>0n</code>（BigInt 零）</li>
            <li><code>''</code>（空字符串，注意不是 <code>'0'</code>）</li>
            <li><code>null</code></li>
            <li><code>undefined</code></li>
            <li><code>NaN</code></li>
          </ul>
        </div>
        <div>
          <p class="bs-sub">NaN 的三条铁律</p>
          <ul class="bs-list">
            <li><code>typeof NaN === 'number'</code>（它是「不是数字的数字」）</li>
            <li><code>NaN !== NaN</code>，判断必须用 <code>Number.isNaN(x)</code></li>
            <li>任何算术运算只要掺进 NaN，结果就是 NaN</li>
          </ul>
          <p class="bs-sub">Object.is 与 === 的差异</p>
          <ul class="bs-list">
            <li><code>Object.is(NaN, NaN)</code> → true</li>
            <li><code>Object.is(0, -0)</code> → false</li>
            <li>其他地方两者完全一致</li>
          </ul>
        </div>
      </div>
      <p class="bs-note">
        Vue 的响应式内部就是用 <code>Object.is</code> 判断值有没有变的 —— 所以把 ref 从
        <code>0</code> 改成 <code>-0</code> 也算「变了」，而赋值 <code>NaN</code> 不会重复触发更新。
      </p>
    </JsCard>

    <JsCard
      title="⑥ 原始值 vs 引用值：赋值到底复制了什么"
      hint="这一条是后面所有「数据莫名被改了」bug 的总根源：变量里存的可能是值的副本，也可能是对象的地址。"
      :asserts="assertsRef"
      :runnable="runRef"
      tone="danger"
    >
      <table class="bs-table">
        <thead>
          <tr>
            <th>操作</th>
            <th>原始值（string / number / boolean / null / undefined / symbol / bigint）</th>
            <th>引用值（object / array / function）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>const b = a</code></td>
            <td>复制一份值，互不影响</td>
            <td>复制地址，两个名字指向同一个对象</td>
          </tr>
          <tr>
            <td><code>a === b</code></td>
            <td>比内容</td>
            <td>比引用地址（内容一样也可能 false）</td>
          </tr>
          <tr>
            <td>函数传参</td>
            <td>函数内改参数不影响外面</td>
            <td>改属性会影响外面；重新赋值参数不影响外面</td>
          </tr>
          <tr>
            <td>想真正复制</td>
            <td>不需要</td>
            <td>浅拷贝 <code>{ ...a }</code> / 深拷贝 <code>structuredClone(a)</code></td>
          </tr>
          <tr>
            <td>Vue 响应式</td>
            <td>赋新值即触发更新</td>
            <td>改属性 / 调用变异方法才触发；换新对象也算</td>
          </tr>
        </tbody>
      </table>
      <p class="bs-note">
        <strong>常见坑清单</strong>：① <code>JSON.parse(JSON.stringify(x))</code> 做深拷贝会丢
        <code>undefined</code>、函数、<code>Date</code> 会变字符串、循环引用直接报错 —— 首选
        <code>structuredClone</code>；② 浅拷贝只解决第一层，嵌套对象依旧共享；
        ③ 判断两个对象「内容是否相同」要靠手写比较或工具函数，
        <code>===</code> 做不到。
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
.bs-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.7;
}
.bs-table {
  margin-top: 10px;
  font-size: 12.5px;
}
.bs-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.bs-input {
  min-width: 240px;
}
.bs-mini {
  max-width: 150px;
}
.bs-result {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-family: var(--mono);
  font-size: 12.5px;
}
.bs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.bs-sub {
  margin: 0 0 6px;
  font-weight: 600;
  font-size: 12.5px;
}
.bs-list {
  margin: 0 0 10px;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  line-height: 1.8;
}
</style>
