/**
 * 多实验台（Lab）配置 —— 整个应用的大纲 + 路由数据源。
 *
 * 一个 Lab = 一套独立的学习大纲：
 *   - vue  : 原有的 20 页 Vue 3 教程（页面在 src/pages/vue/）
 *   - css  : CSS 教程（页面在 src/pages/css/）
 *   - js   : JavaScript 教程（页面在 src/pages/js/）
 *
 * 新增一个 Lab 只需要：① 在这里加一项 ② 建目录 src/pages/<dir>/ ③ 建同名页面文件。
 * 路由、侧边栏都会自动生成（见 src/router/index.ts 与 components/AppSidebar.vue）。
 */

export interface NavItem {
  /** 页面组件文件名（不含 .vue），同时决定路由路径 */
  name: string
  title: string
  desc: string
}
export interface NavGroup {
  id: string
  title: string
  badge?: string
  items: NavItem[]
}
export interface Lab {
  id: string
  /** 顶栏切换器上的名字 */
  label: string
  icon: string
  /** 一句话介绍 */
  slogan: string
  /** 路由前缀：'' 表示直接用 /<name>；'/css' 表示 /css/<name> */
  prefix: string
  /** 页面目录（相对仓库根目录），用于 import.meta.glob 自动匹配组件 */
  dir: string
  accent: string
  groups: NavGroup[]
}

/* ==========================================================================
 * 1) Vue 3
 * ======================================================================== */
const vueLab: Lab = {
  id: 'vue',
  label: 'Vue 3',
  icon: '🟩',
  slogan: '组合式 API · 组件 · 路由 · 状态管理',
  prefix: '',
  dir: 'src/pages/vue',
  accent: '#42b883',
  groups: [
    {
      id: 'vue-basic',
      title: '基础篇 · 模板与响应式',
      badge: '基础',
      items: [
        { name: 'basic-template', title: '1. 模板语法', desc: '插值、v-bind、v-on、v-if/v-for、class/style 绑定' },
        { name: 'basic-reactivity', title: '2. 响应式基础', desc: 'ref / reactive / toRefs / readonly，为什么解构会丢响应式' },
        { name: 'basic-computed', title: '3. 计算属性 computed', desc: '缓存机制、可写 computed、与 method / watch 的区别' },
        { name: 'basic-watch', title: '4. 侦听器 watch / watchEffect', desc: 'deep / immediate / flush / 停止侦听 / 清理副作用' },
        { name: 'basic-events-forms', title: '5. 事件处理与表单', desc: '修饰符、v-model 原理、自定义组件的 v-model' },
        { name: 'basic-lifecycle', title: '6. 生命周期', desc: 'onMounted / onUpdated / onUnmounted，父子执行顺序实测' },
        { name: 'basic-styles', title: '7. 样式与 CSS 隔离', desc: 'scoped / :deep() / :slotted() / v-bind() 动态 CSS' },
        { name: 'basic-render', title: '8. 渲染机制：key / v-if vs v-show', desc: 'Diff 与复用、为什么要写 key、性能取舍' },
      ],
    },
    {
      id: 'vue-advanced',
      title: '进阶篇 · 组件与工程化',
      badge: '进阶',
      items: [
        { name: 'adv-props-emits', title: '9. 组件通信（一）', desc: 'defineProps / defineEmits / defineModel / 类型声明' },
        { name: 'adv-slots', title: '10. 插槽 Slots', desc: '默认/具名/作用域插槽、动态插槽、透传与 $attrs' },
        { name: 'adv-provide-inject', title: '11. 依赖注入 provide / inject', desc: '跨层级通信、Symbol key、响应式传递、注入默认值' },
        { name: 'adv-composables', title: '12. 组合式函数 Composables', desc: '逻辑复用、生命周期封装、useCounter/useFetch 实战' },
        { name: 'adv-directives', title: '13. 自定义指令', desc: '全局/局部指令、钩子参数、真实场景封装' },
        { name: 'adv-router', title: '14. 路由 Vue Router', desc: '动态路由、嵌套路由、守卫、懒加载、params/query' },
        { name: 'adv-pinia', title: '15. 状态管理 Pinia', desc: 'setup store、getters、跨组件共享、持久化思路' },
        { name: 'adv-async', title: '16. 异步组件与 Suspense', desc: 'defineAsyncComponent、加载/错误态、Suspense 边界' },
        { name: 'adv-teleport-transition', title: '17. Teleport 与过渡动画', desc: '传送门弹窗、Transition / TransitionGroup、列表动画' },
        { name: 'adv-perf', title: '18. 性能优化与响应式进阶', desc: 'shallowRef / markRaw / v-memo / v-once / 虚拟滚动思路' },
        { name: 'adv-render-fn', title: '19. 渲染函数与 JSX', desc: 'h()、函数式组件、什么时候必须离开模板' },
        { name: 'adv-plugins', title: '20. 插件、全局配置与工程化', desc: '自定义插件、app.use、全局属性、环境变量、构建分包' },
      ],
    },
  ],
}

/* ==========================================================================
 * 2) CSS
 * ======================================================================== */
const cssLab: Lab = {
  id: 'css',
  label: 'CSS',
  icon: '🎨',
  slogan: '盒模型 · Flex/Grid · 层叠上下文 · 动画 · 响应式',
  prefix: '/css',
  dir: 'src/pages/css',
  accent: '#3b82f6',
  groups: [
    {
      id: 'css-basic',
      title: '基础篇 · 视觉与盒模型',
      badge: '基础',
      items: [
        { name: 'intro', title: '1. CSS 是怎么工作的', desc: '引入方式、层叠与优先级、继承、初始值、开发者工具' },
        { name: 'selectors', title: '2. 选择器与权重', desc: '选择器全家桶、specificity 计算、!important、:is/:where' },
        { name: 'box-model', title: '3. 盒模型', desc: 'content/padding/border/margin、box-sizing、margin 折叠' },
        { name: 'units-colors', title: '4. 单位、颜色与函数', desc: 'px/em/rem/%/vw/vh、颜色写法、calc/clamp/min/max' },
        { name: 'text-font', title: '5. 文本与字体排版', desc: '行高、letter-spacing、字体栈、截断、垂直居中' },
        { name: 'background-border', title: '6. 背景、边框与阴影', desc: '渐变、多层背景、圆角、box-shadow、outline vs border' },
      ],
    },
    {
      id: 'css-layout',
      title: '布局篇 · 现代布局系统',
      badge: '布局',
      items: [
        { name: 'display-flow', title: '7. display 与文档流', desc: 'block/inline/inline-block/none、BFC、格式化上下文' },
        { name: 'flex', title: '8. Flexbox 弹性布局', desc: '主轴交叉轴、flex-grow/shrink/basis、对齐、常见布局套路' },
        { name: 'grid', title: '9. Grid 网格布局', desc: 'fr 单位、repeat/minmax/auto-fit、区域命名、显隐式网格' },
        { name: 'position', title: '10. 定位与层叠', desc: 'relative/absolute/fixed/sticky、z-index、层叠上下文、粘性表头' },
      ],
    },
    {
      id: 'css-advanced',
      title: '进阶篇 · 动效与工程化',
      badge: '进阶',
      items: [
        { name: 'responsive', title: '11. 响应式与媒体查询', desc: 'viewport、媒体查询、容器查询、移动优先、图片自适应' },
        { name: 'transition-animation', title: '12. 过渡与动画', desc: 'transition 四要素、@keyframes、性能友好的动画属性' },
        { name: 'transform-effects', title: '13. Transform 与视觉特效', desc: '位移/旋转/缩放/倾斜、3D、滤镜、毛玻璃、渐变边框' },
        { name: 'variables-theming', title: '14. 变量与现代 CSS', desc: 'CSS 变量、级联变量、:has()、嵌套、暗色主题' },
        { name: 'debugging', title: '15. 调试与常见坑', desc: '层叠上下文、外边距折叠、居中失败、层高塌陷排查清单' },
        { name: 'snippets', title: '16. 成稿样式库 · 可直接仿写', desc: '按钮/表单/表格/卡片/弹窗/导航/反馈 等 15 组成品，一键复制' },
      ],
    },
  ],
}

/* ==========================================================================
 * 3) JavaScript
 * ======================================================================== */
const jsLab: Lab = {
  id: 'js',
  label: 'JavaScript',
  icon: '🟨',
  slogan: '类型 · 函数与闭包 · 对象与原型 · 异步 · 模块',
  prefix: '/js',
  dir: 'src/pages/js',
  accent: '#d29922',
  groups: [
    {
      id: 'js-basic',
      title: '基础篇 · 语言核心',
      badge: '基础',
      items: [
        { name: 'basics', title: '1. 变量、类型与转换', desc: 'let/const/var、八种类型、typeof、隐式转换陷阱、相等比较' },
        { name: 'functions-scope', title: '2. 函数与作用域', desc: '声明 vs 表达式、参数默认值、arguments、作用域链、提升' },
        { name: 'closures', title: '3. 闭包与 this', desc: '闭包原理、循环陷阱、this 四种绑定、箭头函数、call/apply/bind' },
        { name: 'arrays', title: '4. 数组与常用方法', desc: 'map/filter/reduce、sort 的坑、查找、去重、扁平化' },
        { name: 'objects', title: '5. 对象、原型与解构', desc: '属性描述符、可选链、解构、展开、Object 静态方法' },
        { name: 'es6-plus', title: '6. 现代语法速查', desc: '模板字符串、Symbol、迭代器、Set/Map、解构赋值、标签模板' },
      ],
    },
    {
      id: 'js-advanced',
      title: '进阶篇 · 异步与运行时',
      badge: '进阶',
      items: [
        { name: 'async-promise', title: '7. Promise 与 async/await', desc: '三种状态、链式调用、all/race/allSettled/any、错误处理、并发控制' },
        { name: 'event-loop', title: '8. 事件循环与微任务', desc: '调用栈、宏任务/微任务、执行顺序题、requestAnimationFrame' },
        { name: 'prototype-class', title: '9. 原型链与 Class', desc: 'prototype/__proto__、继承、class 语法、静态成员、私有字段' },
        { name: 'modules-errors', title: '10. 模块与错误处理', desc: 'ESM import/export、动态导入、try/catch、自定义错误、严格模式' },
        { name: 'dom-events', title: '11. DOM 与事件', desc: '查询与创建节点、事件冒泡与捕获、委托、防抖节流' },
        { name: 'vue-js-bridge', title: '12. 与 Vue 的桥梁', desc: 'Proxy 响应式原理、手写迷你 reactive、数组方法在列表中的应用、性能陷阱' },
      ],
    },
  ],
}

export const labs: Lab[] = [vueLab, cssLab, jsLab]

/** 由 lab.id 取配置 */
export function getLab(id: string): Lab {
  return labs.find((l) => l.id === id) ?? labs[0]
}

/** 某条路由 name 属于哪个 lab */
export function labOfRouteName(name: string): Lab {
  return labs.find((l) => l.groups.some((g) => g.items.some((i) => i.name === name))) ?? labs[0]
}

/** 某个 lab 的所有页面 */
export function labItems(lab: Lab): NavItem[] {
  return lab.groups.flatMap((g) => g.items)
}

/** 生成路由路径：prefix + '/' + name */
export function routePath(lab: Lab, name: string): string {
  return `${lab.prefix}/${name}`
}
