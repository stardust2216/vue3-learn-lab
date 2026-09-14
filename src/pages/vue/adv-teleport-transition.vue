<script setup lang="ts">
import { ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import ModalDialog from '@/components/ModalDialog.vue'

/* ============================================================================
 * 17. Teleport 与过渡动画
 *
 * Teleport：把 DOM 片段传送到别处（弹窗、下拉、Toast、全屏遮罩的标准解法）。
 *   <Teleport to="body" :disabled="isMobile"> ... </Teleport>
 *
 * Transition（单个元素/组件）：
 *   v-enter-from → v-enter-active → v-enter-to
 *   v-leave-from → v-leave-active → v-leave-to
 *   配合 mode="out-in" 做「先出后进」；配合 appear 做首次渲染动画。
 *
 * TransitionGroup（列表）：在 Transition 的基础上多了 v-move（FLIP 动画）。
 * ========================================================================== */

// ---------- ① 弹窗 ----------
const modalOpen = ref(false)
const modalResult = ref('（还没确认过）')

// ---------- ② 单元素过渡 ----------
const showFade = ref(true)
const showBounce = ref(true)

// ---------- ③ 列表过渡 ----------
interface Row {
  id: number
  text: string
}
let seed = 3
const rows = ref<Row[]>([
  { id: 1, text: '第一行' },
  { id: 2, text: '第二行' },
  { id: 3, text: '第三行' },
])
function addRow() {
  rows.value.push({ id: ++seed, text: `第 ${seed} 行` })
}
function removeRow(id: number) {
  rows.value = rows.value.filter((r) => r.id !== id)
}
function shuffle() {
  rows.value = [...rows.value].sort(() => Math.random() - 0.5)
}
function sortById() {
  rows.value = [...rows.value].sort((a, b) => a.id - b.id)
}

// ---------- ④ 动态组件 + 过渡 ----------
const tabs = ['组件 A', '组件 B', '组件 C'] as const
const activeTab = ref<(typeof tabs)[number]>('组件 A')
</script>

<template>
  <div>
    <h1>17. Teleport 与过渡动画</h1>
    <p class="lead">
      这两件事都跟「渲染位置的自由度」有关：<strong>Teleport 让 DOM 换个位置渲染</strong>，
      <strong>Transition 让进出场有过程</strong>。做后台系统/组件的同学几乎天天用。
    </p>

    <BaseCard
      title="① Teleport：为什么弹窗必须传送"
      hint="弹窗 DOM 会被挂到 body 下，从 DevTools 里看最直观。"
      tone="ok"
    >
      <div class="row">
        <button class="primary" @click="modalOpen = true">打开 Teleport 弹窗</button>
        <span class="kv">父组件收到的回传：{{ modalResult }}</span>
      </div>

      <div class="clipper" style="margin-top: 10px">
        <p class="hint" style="margin: 0">
          我是一个 <code>overflow: hidden</code> 的容器。如果弹窗不用 Teleport，
          就会被裁切在这里出不去（或者被 transform 创建的堆叠上下文压住 z-index）。
        </p>
      </div>

      <ModalDialog v-model:open="modalOpen" title="Teleport 到 body 的弹窗" @confirmed="modalResult = $event" />

      <pre class="code" style="margin-top: 10px">
&lt;!-- to 可以是 CSS 选择器，也可以是元素引用 --&gt;
&lt;Teleport to="body"&gt;
  &lt;div class="modal-mask"&gt;...&lt;/div&gt;
&lt;/Teleport&gt;

&lt;!-- 移动端常常不希望传送到 body（避免和原生滚动冲突），可以动态关闭 --&gt;
&lt;Teleport to="body" :disabled="isMobile"&gt;...&lt;/Teleport&gt;

&lt;!-- 同时传送到多个目标：Teleport 可以嵌套 / 并列 --&gt;
&lt;Teleport to="#modal-root"&gt;...&lt;/Teleport&gt;</pre
      >
      <p class="hint" style="margin-top: 8px">
        注意：Teleport 只改变 DOM 位置，<b>组件逻辑、props、事件、样式作用域都不变</b>
        —— 弹窗里依然能访问父组件的数据，scoped 样式也照样生效。
      </p>
    </BaseCard>

    <BaseCard title="② Transition：CSS 过渡与 animation 两种写法" hint="切换开关看动画；也可以直接用浏览器的「动画速度 0.1x」观察细节。">
      <div class="row">
        <button @click="showFade = !showFade">fade 过渡（transition）</button>
        <button @click="showBounce = !showBounce">bounce 动画（CSS animation）</button>
      </div>

      <div class="stage">
        <Transition name="fade">
          <div v-if="showFade" class="box">我是 fade（transition: opacity + transform）</div>
        </Transition>

        <Transition name="bounce">
          <div v-if="showBounce" class="box bounce-box">我是 bounce（@keyframes）</div>
        </Transition>
      </div>

      <pre class="code" style="margin-top: 10px">
&lt;Transition name="fade"&gt;
  &lt;div v-if="show"&gt;...&lt;/div&gt;
&lt;/Transition&gt;

&lt;style&gt;
/* 6 个内置 class（name 为空时前缀是 v-） */
.fade-enter-active, .fade-leave-active { transition: opacity .3s ease }
.fade-enter-from,  .fade-leave-to     { opacity: 0 }

/* 用 animation 时，Vue 会自动监听 animationend；嵌套动画要用 .fade-enter-active 指定时长 */
/* 持续时间不匹配时可以显式声明：&lt;Transition :duration="300"&gt; 或 :duration="{ enter: 200, leave: 400 }" */
&lt;/style&gt;</pre
      >
    </BaseCard>

    <BaseCard title="③ Transition 的常用配置" hint="mode='out-in' 是最常用的：先出后进，避免两个元素同时存在时布局跳动。">
      <div class="row">
        <button v-for="t in tabs" :key="t" :class="{ primary: activeTab === t }" @click="activeTab = t">
          {{ t }}
        </button>
      </div>

      <!-- mode="out-in"：旧元素动画结束后才插入新的（做 tab / 路由切换必备） -->
      <Transition name="swap" mode="out-in">
        <div :key="activeTab" class="box swap-box">当前：{{ activeTab }}</div>
      </Transition>

      <pre class="code" style="margin-top: 10px">
&lt;Transition
  name="swap"
  mode="out-in"          &lt;!-- out-in：先出后进；in-out：先进后出；默认：同时 --&gt;
  appear                 &lt;!-- 首次渲染也播放动画 --&gt;
  :duration="300"        &lt;!-- 显式指定时长（动画时长不确定时用） --&gt;
  @before-enter="..." @enter="..." @after-enter="..."
  @before-leave="..." @leave="..." @after-leave="..."
  @enter-cancelled="..." @leave-cancelled="..."
&gt;
  &lt;div :key="key"&gt;...&lt;/div&gt;   &lt;!-- 必须保证有 key 才能识别为不同元素 --&gt;
&lt;/Transition&gt;</pre
      >
      <p class="hint" style="margin-top: 8px">
        JS 钩子常用于第三方动画库（GSAP / anime.js）：在 <code>@enter</code> 里调
        <code>done()</code> 告诉 Vue 动画结束。CSS 能做的就别用 JS。
      </p>
    </BaseCard>

    <BaseCard title="④ TransitionGroup：列表动画（含 FLIP 移动动画）" hint="新增/删除/打乱顺序，都会平滑移动。">
      <div class="row">
        <button class="primary" @click="addRow">新增一行</button>
        <button @click="shuffle">打乱顺序（看 v-move）</button>
        <button @click="sortById">按 id 排序</button>
      </div>

      <TransitionGroup name="list" tag="ul" class="anim-list">
        <li v-for="row in rows" :key="row.id">
          <span>{{ row.text }}</span>
          <button @click="removeRow(row.id)">✕</button>
        </li>
      </TransitionGroup>

      <pre class="code" style="margin-top: 10px">
&lt;TransitionGroup name="list" tag="ul"&gt;
  &lt;li v-for="item in items" :key="item.id"&gt;&#123;&#123; item &#125;&#125;&lt;/li&gt;
&lt;/TransitionGroup&gt;

&lt;style&gt;
.list-enter-active, .list-leave-active { transition: all .3s ease }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(-16px) }

/* 关键：leave-active 用 absolute 让元素脱离文档流，其他元素才能平滑补位 */
.list-leave-active { position: absolute }
/* v-move：元素位置变化时自动加的 class，做 FLIP 动画 */
.list-move { transition: transform .3s ease }
&lt;/style&gt;</pre
      >
      <p class="hint" style="margin-top: 8px">
        <code>:key</code> 在 TransitionGroup 里是强制的，否则做不出移动动画；
        列表项上的 <code>v-move</code> 也是「为什么打乱顺序会很丝滑」的原因。
      </p>
    </BaseCard>

    <BaseCard title="⑤ 和 KeepAlive / 动态组件 / 路由的配合">
      <pre class="code">
&lt;!-- 路由切换动画：本模板 App.vue 就是这么写的 --&gt;
&lt;RouterView v-slot="{ Component }"&gt;
  &lt;Transition name="fade" mode="out-in"&gt;
    &lt;component :is="Component" /&gt;
  &lt;/Transition&gt;
&lt;/RouterView&gt;

&lt;!-- 配合 KeepAlive：注意 Transition 必须在 KeepAlive 外层 --&gt;
&lt;Transition name="fade" mode="out-in"&gt;
  &lt;KeepAlive :include="['HomeView']"&gt;
    &lt;component :is="Component" /&gt;
  &lt;/KeepAlive&gt;
&lt;/Transition&gt;

&lt;!-- 用 v-show 的过渡（不需要 v-if）：只播 enter/leave 中的一部分 --&gt;
&lt;Transition name="fade"&gt;
  &lt;div v-show="show"&gt;...&lt;/div&gt;
&lt;/Transition&gt;</pre
      >
      <p class="hint" style="margin-top: 8px">
        性能提示：优先用 <code>opacity</code> / <code>transform</code>（不触发重排），
        避免对 <code>width/height/top/left</code> 做长动画；
        大量列表动画记得开 <code>will-change</code> 或改用 <code>position: absolute</code>。
      </p>
      <p class="kv" style="margin-top: 8px">
        本页也用到了全局的暗色模式变量，所以动画颜色在两套主题下都正常。
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
.clipper {
  max-height: 80px;
  overflow: hidden;
  border: 1px dashed var(--c-danger);
  border-radius: 8px;
  padding: 8px 10px;
}
.stage {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  min-height: 54px;
}
.box {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  background: var(--c-surface-2);
  margin-top: 10px;
}
.bounce-box {
  border-color: var(--c-info);
}

/* ---------- ① fade：transition ---------- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ---------- ② bounce：CSS animation ---------- */
.bounce-enter-active {
  animation: bounce-in 0.5s ease;
}
.bounce-leave-active {
  animation: bounce-in 0.3s reverse ease;
}
@keyframes bounce-in {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  60% {
    transform: scale(1.06);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

/* ---------- ③ swap：配合 mode="out-in" ---------- */
.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.swap-enter-from {
  opacity: 0;
  transform: translateX(14px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}
.swap-box {
  border-color: var(--c-primary);
}

/* ---------- ④ 列表动画 ---------- */
.anim-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  position: relative;
}
.anim-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
  font-size: 13px;
}
.anim-list li span {
  flex: 1;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
/* leave 时脱离文档流，其余元素才能平滑补位 */
.list-leave-active {
  position: absolute;
  width: 100%;
}
/* v-move：位置变化时的 FLIP 动画 */
.list-move {
  transition: transform 0.3s ease;
}
</style>
