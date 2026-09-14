<script setup lang="tsx">
import { computed, defineComponent, h, ref, type FunctionalComponent, type VNodeChild } from 'vue'
// ↑ FunctionalComponent 用于下面「函数式组件」一节的类型标注

/* ============================================================================
 * 渲染函数与 JSX
 *
 * 模板 → 编译 → 渲染函数。所以能用模板就别写渲染函数；
 * 但有些场景模板表达不了或很难受：
 *   ① 组件「本身就是一段逻辑」时（比如根据 type 动态产出标签）
 *   ② 需要把插槽/vnode 当数据来操作（透传、包装、递归）
 *   ③ 高度动态的结构（列由配置决定，如表格/表单生成器）
 *
 * h(type, props, children)：
 *   type: 'div' / 组件对象 / Fragment / Teleport ...
 *   props: { class, style, onClick, ... }，事件是 onXxx；属性名用 camelCase
 *   children: 字符串 / 数组 / 对象（插槽）
 * ========================================================================== */

// ---------- ① 用 h() 写一个计数器组件 ----------
const HCounter = {
  name: 'HCounter',
  props: { start: { type: Number, default: 0 } },
  setup(props: { start: number }) {
    const n = ref(props.start)
    return () =>
      // 多个根节点要用数组（Fragment）
      h('div', { class: 'h-counter' }, [
        h('span', { class: 'kv' }, `h() 计数器：${n.value}`),
        h(
          'button',
          {
            class: 'primary',
            onClick: () => n.value++,
            // 动态属性、布尔属性、style 对象都可以直接传
            disabled: n.value >= 10,
            style: { marginLeft: '8px' },
          },
          'h() +1',
        ),
        n.value >= 10 ? h('span', { class: 'tag warn' }, '到上限了') : null,
      ])
  },
}

// ---------- ② 函数式组件：没有状态，只有 props → vnode ----------
interface TagProps {
  level?: number
  text?: string
  highlight?: boolean
}
const DynamicHeading: FunctionalComponent<TagProps> = (props) => {
  const tag = `h${Math.min(6, Math.max(1, props.level ?? 3))}`
  return h(
    tag,
    { class: props.highlight ? 'hl' : undefined, title: `由 level=${props.level} 决定标签名` },
    props.text ?? '动态标题',
  )
}
DynamicHeading.props = ['level', 'text', 'highlight']

const level = ref(3)
const headingText = ref('我是 h() 生成的标题')

// ---------- ③ 把 vnode 当数据：包装器组件 ----------
const WrapWithBorder = {
  name: 'WrapWithBorder',
  setup(_: unknown, { slots }: { slots: Record<string, (() => VNodeChild) | undefined> }) {
    // 手动把默认插槽包一层 div —— 模板里要做到这点只能用额外组件
    return () => h('div', { class: 'wrapped' }, [h('em', '【包装器插入的前缀】'), slots.default?.()])
  },
}

// ---------- ④ 运行时编译模板（需要 vue 的完整版构建，见 vite.config.ts 的 alias） ----------
// 这里的 template 是「字符串」，由运行时编译器解析 ——
// 默认的运行时版 vue 不含编译器，所以想让它真正跑起来要打开 vite.config.ts 里的 alias。
const TextTemplate = {
  name: 'RuntimeTemplate',
  props: { title: { type: String, default: '' } },
  template:
    '<p class="runtime" style="padding:8px 12px;border-radius:8px;background:var(--c-surface-2)">' +
    '我是运行时编译的 template：<b>{{ title }}</b>（字符串模板）</p>',
}

// ---------- ⑤ 动态列：用 vnode 数组生成结构 ----------
const columns = ref([
  { key: 'name', title: '姓名' },
  { key: 'age', title: '年龄' },
  { key: 'city', title: '城市' },
])
const tableData = ref([
  { name: '张三', age: 28, city: '杭州' },
  { name: '李四', age: 31, city: '上海' },
])

const TableByH = {
  name: 'TableByH',
  props: {
    columns: { type: Array as () => { key: string; title: string }[], required: true },
    data: { type: Array as () => Record<string, unknown>[], required: true },
  },
  setup(props: { columns: { key: string; title: string }[]; data: Record<string, unknown>[] }) {
    return () =>
      h('table', { class: 'mini-table' }, [
        h('thead', [
          h(
            'tr',
            props.columns.map((c) => h('th', { key: c.key }, c.title)),
          ),
        ]),
        h('tbody', [
          ...props.data.map((row, i) =>
            h(
              'tr',
              { key: i },
              props.columns.map((c) => h('td', { key: c.key }, String(row[c.key] ?? ''))),
            ),
          ),
        ]),
      ])
  },
}

// ---------- ⑥ 用 JSX 写同样的东西（<script setup lang="tsx">） ----------
// 注意：这里用 defineComponent + setup 返回 JSX，而不是「箭头函数式函数组件」——
// 后者在 Vue 里需要显式声明 props 才能稳定拿到参数，用 defineComponent 更符合直觉。
const JsxCard = defineComponent({
  name: 'JsxCard',
  props: {
    title: { type: String, required: true },
    items: { type: Array as () => string[], default: () => [] },
  },
  setup(props: { title: string; items: string[] }) {
    return () => (
      <div class="jsx-card">
        <b>{props.title}</b>
        <ul>
          {props.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
        <p class="hint" style="margin: 6px 0 0">
          JSX 里用 {'{ }'} 插值，事件就是 onClick，class 直接写 class（不是 className）。
        </p>
      </div>
    )
  },
})

const jsxItems = computed(() => ['JSX 里用 {} 插值', 'onClick 就是 onClick', 'class 直接写 class'])

// ---------- ⑦ 递归组件（用渲染函数写树） ----------
interface TreeNode {
  label: string
  children?: TreeNode[]
}
const tree: TreeNode = {
  label: 'src',
  children: [
    { label: 'components', children: [{ label: 'BaseCard.vue' }, { label: 'VirtualList.vue' }] },
    { label: 'pages', children: [{ label: 'adv-render-fn.vue' }] },
    { label: 'main.ts' },
  ],
}
const TreeItem = {
  name: 'TreeItem',
  props: { node: { type: Object as () => TreeNode, required: true } },
  setup(props: { node: TreeNode }) {
    return (): unknown =>
      h('li', [
        props.node.label,
        props.node.children?.length
          ? h(
              'ul',
              props.node.children.map((c) => h(TreeItem, { node: c, key: c.label })),
            )
          : null,
      ])
  },
}
</script>

<template>
  <div>
    <h1>19. 渲染函数与 JSX</h1>
    <p class="lead">
      模板是「默认答案」，渲染函数是「逃生舱」。理解 <code>h()</code> 之后，
      你会更清楚模板编译成了什么，也就能看懂组件库的源码。
    </p>

    <BaseCard title="① h() 写组件：状态、事件、条件、样式全都有" hint="这就是模板背后真正运行的东西。">
      <HCounter :start="3" />
      <pre class="code" style="margin-top: 10px">
const HCounter = {
  props: { start: { type: Number, default: 0 } },
  setup(props) {
    const n = ref(props.start)
    return () =&gt; h('div', [
      h('span', `计数：${n.value}`),
      h('button', { onClick: () =&gt; n.value++, style: { marginLeft: '8px' } }, '+1'),
    ])
  },
}</pre
      >
      <p class="hint" style="margin-top: 8px">
        注意几个和模板的差异：事件是 <code>onClick</code>（camelCase）、
        属性名用 <code>class</code> 而不是 <code>className</code>、
        多根节点直接返回数组（Fragment）。
      </p>
    </BaseCard>

    <BaseCard title="② 函数式组件：动态标签名" hint="level 变化 → 渲染成 h1~h6，模板里做不到这么干净。">
      <div class="row">
        <label class="kv">level <input type="range" min="1" max="6" v-model.number="level" /> {{ level }}</label>
        <input v-model="headingText" />
      </div>
      <div style="margin-top: 10px">
        <DynamicHeading :level="level" :text="headingText" :highlight="level <= 2" />
      </div>
      <pre class="code" style="margin-top: 10px">
const DynamicHeading: FunctionalComponent&lt;{ level: number; text: string }&gt; = (props) =&gt;
  h(`h${props.level}`, { class: 'hl' }, props.text)
DynamicHeading.props = ['level', 'text']   // 函数式组件要显式声明 props</pre
      >
    </BaseCard>

    <BaseCard title="③ 把插槽当数据：包装组件" hint="这种「包装 vnode」的操作，模板里很难表达。">
      <WrapWithBorder>
        <span>我是被包装的默认插槽内容</span>
      </WrapWithBorder>
      <pre class="code" style="margin-top: 10px">
const Wrap = {
  setup(_, { slots }) {
    return () =&gt; h('div', [h('em', '前缀'), slots.default?.()])
  },
}</pre
      >
    </BaseCard>

    <BaseCard
      title="④ 运行时编译字符串模板（需要完整版 Vue）"
      hint="默认的 vue 是「运行时版」不带编译器，所以下面这个组件不会渲染；打开 vite.config.ts 里的 vue alias 就能看到它工作。"
      tone="warn"
    >
      <TextTemplate title="我被运行时编译成了渲染函数" />
      <p class="hint" style="margin-top: 8px">
        下面这段代码里的 <code>template</code> 是字符串，只有「完整版」的 Vue（含 compiler）才能在浏览器里编译它。
        默认安装的是运行时版（体积小 ~14kb gzip），遇到这种组件会直接跳过并给出警告。
      </p>
      <pre class="code" style="margin-top: 10px">
// 完整版（compiler + runtime）：可以用字符串模板
import { createApp } from 'vue/dist/vue.esm-bundler.js'
app.component('x', { template: '&lt;div&gt;' + '&#123;&#123; msg &#125;&#125;' + '&lt;/div&gt;' })

// 运行时版（默认）：体积小 ~14kb gzip，只能用 render 函数或 SFC
// 结论：真实项目永远用 SFC（.vue），字符串模板只适合低代码平台/动态配置场景</pre
      >
    </BaseCard>

    <BaseCard title="⑤ 配置驱动的表格（渲染函数的典型战场）" hint="列由 columns 决定，模板写法需要一堆 v-if 和动态组件。">
      <TableByH :columns="columns" :data="tableData" />
      <div class="row" style="margin-top: 8px">
        <button @click="columns.push({ key: 'city', title: '城市(重复)' })">加一列</button>
        <button @click="columns.splice(0, 1)">删一列</button>
        <button @click="tableData.push({ name: '王五', age: 25, city: '北京' })">加一行</button>
      </div>
      <pre class="code" style="margin-top: 10px">
return () =&gt; h('table', [
  h('thead', h('tr', props.columns.map((c) =&gt; h('th', { key: c.key }, c.title)))),
  h('tbody', props.data.map((row, i) =&gt;
    h('tr', { key: i }, props.columns.map((c) =&gt; h('td', { key: c.key }, row[c.key]))))),
])</pre
      >
    </BaseCard>

    <BaseCard title="⑥ JSX：h() 的语法糖" hint="本页就是 lang=&quot;tsx&quot;，@vitejs/plugin-vue 原生支持（内部用 @vue/babel-plugin-jsx 的等价实现）。">
      <JsxCard title="JSX 组件" :items="jsxItems" />
      <pre class="code" style="margin-top: 10px">
// &lt;script setup lang="tsx"&gt;
const Card = ({ title, items }: Props) =&gt; (
  &lt;div class="card"&gt;
    &lt;b&gt;{title}&lt;/b&gt;
    &lt;ul&gt;{items.map((it) =&gt; &lt;li key={it}&gt;{it}&lt;/li&gt;)}&lt;/ul&gt;
  &lt;/div&gt;
)

// 和 React JSX 的差异（重要）：
//   class 而不是 className（Vue 也支持 className，但推荐 class）
//   onClick={handler} / onUpdate:modelValue 用 onUpdate:modelValue 这种带冒号的写法
//   v-model 用 modelValue + onUpdate:modelValue，或者用 v-model 指令（JSX 里也支持）
//   插槽用 v-slots=&#123;&#123; default: () =&gt; ... &#125;&#125; 或 children</pre
      >
    </BaseCard>

    <BaseCard title="⑦ 递归组件：渲染函数天然适合" hint="树形结构里组件引用自己。">
      <ul class="tree">
        <TreeItem :node="tree" />
      </ul>
      <p class="hint" style="margin-top: 8px">
        递归组件必须有「终止条件」（没有 children 就停止），且要有 name（模板里用
        <code>&lt;TreeItem /&gt;</code> 递归时需要 name 或文件名自动推断）。
      </p>
    </BaseCard>

    <BaseCard title="⑧ 什么时候才该用渲染函数" tone="warn">
      <table>
        <thead>
          <tr>
            <th>场景</th>
            <th>推荐</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>普通页面 / 业务组件</td><td>模板（可读性最好，编译器还能做静态提升等优化）</td></tr>
          <tr><td>组件库里的底层组件（如 Table、Select）</td><td>渲染函数 / JSX</td></tr>
          <tr><td>动态标签、动态列、配置驱动 UI</td><td>h() / JSX</td></tr>
          <tr><td>包装 vnode、透传插槽、高阶组件</td><td>h()</td></tr>
          <tr><td>递归树、无限级菜单</td><td>两者都可以（模板更直观）</td></tr>
          <tr><td>需要极致性能、手写 patch 提示</td><td>渲染函数 + 稳定的 vnode 结构</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 10px">
        重要提醒：模板经过编译优化（hoistStatic、patchFlag、cacheHandler），
        <b>手写渲染函数默认拿不到这些优化</b>，所以「为了性能改用 JSX」通常是错的。
      </p>
    </BaseCard>
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
:deep(.h-counter) {
  display: flex;
  align-items: center;
  gap: 10px;
}
:deep(.hl) {
  color: var(--c-primary-dark);
}
.wrapped {
  border-left: 3px solid var(--c-primary);
  padding: 6px 10px;
  background: var(--c-surface-2);
  border-radius: 0 8px 8px 0;
}
.jsx-card {
  border: 1px solid var(--c-info);
  border-radius: 10px;
  padding: 10px 14px;
  background: rgba(59, 130, 246, 0.07);
}
.jsx-card ul {
  margin: 6px 0 0;
  padding-left: 18px;
}
:deep(.mini-table) {
  margin-top: 4px;
}
:deep(.runtime) {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--c-surface-2);
}
.tree {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  font-family: var(--mono);
}
.tree :deep(ul) {
  padding-left: 18px;
  border-left: 1px dashed var(--c-border);
}
</style>
