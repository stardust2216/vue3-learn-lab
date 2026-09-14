<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUpdated, ref, useTemplateRef } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import LifecycleChild from '@/components/LifecycleChild.vue'

/* ============================================================================
 * 6. 生命周期
 *
 * 执行顺序（首次渲染，父 A 包着子 B）：
 *   A.setup → A.onBeforeMount → B.setup → B.onBeforeMount → B.onMounted → A.onMounted
 * 也就是：父 beforeMount 先于子挂载，但父 mounted 晚于子 mounted（子先挂载完）。
 * 更新时：onBeforeUpdate → （DOM 更新）→ onUpdated，父子各自独立触发。
 * 卸载时：父 onBeforeUnmount → 子 onBeforeUnmount → 子 onUnmounted → 父 onUnmounted。
 * ========================================================================== */

const logs = ref<{ t: string; msg: string; who: 'parent' | 'child' }[]>([])
let seq = 0

function push(who: 'parent' | 'child', msg: string) {
  const d = new Date()
  const t =
    `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.` +
    String(d.getMilliseconds()).padStart(3, '0')
  logs.value.unshift({ t, msg: `#${++seq} ${msg}`, who })
}
const childLog = (msg: string) => push('child', msg)

// ---------- 父组件的钩子 ----------
push('parent', 'setup() 执行（父组件）')
onMounted(() => push('parent', 'onMounted（父组件，晚于子组件）'))
onUpdated(() => push('parent', 'onUpdated（父组件，自己或子的数据导致重渲染）'))
onBeforeUnmount(() => push('parent', 'onBeforeUnmount（本页被切走时触发）'))

// ---------- 控制子组件的挂载/卸载/缓存 ----------
const showChild = ref(true)
const childKey = ref(0)
const useKeepAlive = ref(false)
const parentTick = ref(0)

// Vue 3.5+ 的 useTemplateRef：模板里写 ref="childRef"，这里用同名 key 取实例，类型更准
const childRef = useTemplateRef<InstanceType<typeof LifecycleChild>>('childRef')
function callChildMethod() {
  // 通过 defineExpose 暴露的方法操作子组件（父组件调用子组件方法的正统做法）
  childRef.value?.reset()
  push('parent', `调用 childRef.reset()，当前子组件 count = ${childRef.value?.count}`)
}
</script>

<template>
  <div>
    <h1>6. 生命周期</h1>
    <p class="lead">
      组合式 API 用 <code>onXxx()</code> 注册钩子，必须在 <code>setup</code> 中<strong>同步</strong>调用。
      真实项目里最常用的只有四个：<code>onMounted</code>（请求/初始化）、
      <code>onUnmounted</code>（清理）、<code>onUpdated</code>（少用）、<code>onActivated</code>（配合
      KeepAlive）。
    </p>

    <BaseCard
      title="① 父子挂载顺序实测"
      hint="点下面的按钮挂载/卸载子组件，观察右侧时间线（# 是执行序号，最能说明顺序）。"
      tone="ok"
    >
      <div class="row">
        <button class="primary" @click="showChild = !showChild">
          {{ showChild ? '卸载子组件' : '挂载子组件' }}
        </button>
        <button @click="childKey++" :disabled="!showChild">换 key 强制重建（{{ childKey }}）</button>
        <label class="kv"
          ><input type="checkbox" v-model="useKeepAlive" :disabled="!showChild" /> 用 KeepAlive
          包裹</label
        >
        <button @click="parentTick++">让父组件更新（{{ parentTick }}）</button>
        <button @click="callChildMethod" :disabled="!showChild">调用子组件 reset()</button>
        <button class="danger" @click="logs = []">清空日志</button>
      </div>

      <div v-if="showChild" style="margin-top: 6px">
        <KeepAlive v-if="useKeepAlive">
          <LifecycleChild ref="childRef" :key="childKey" label="子组件(KeepAlive)" :log="childLog" />
        </KeepAlive>
        <LifecycleChild v-else ref="childRef" :key="childKey" label="子组件" :log="childLog" />
      </div>

      <pre class="code" style="margin-top: 10px; max-height: 280px">{{ logs.map((l) => `${l.t} ${l.msg}`).join('\n') || '（清空后点按钮看顺序）' }}</pre>
    </BaseCard>

    <BaseCard title="② 钩子对照表（选项式 ↔ 组合式）">
      <table>
        <thead>
          <tr>
            <th>阶段</th>
            <th>选项式</th>
            <th>组合式</th>
            <th>典型用途</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>实例创建前/后</td>
            <td>beforeCreate / created</td>
            <td>setup（无需对应钩子）</td>
            <td>初始化响应式状态、调用组合式函数</td>
          </tr>
          <tr>
            <td>挂载前</td>
            <td>beforeMount</td>
            <td>onBeforeMount</td>
            <td>极少用（此时模板还没渲染成 DOM）</td>
          </tr>
          <tr>
            <td>挂载后</td>
            <td>mounted</td>
            <td>onMounted</td>
            <td>请求数据、初始化第三方库、操作 DOM ref</td>
          </tr>
          <tr>
            <td>更新前/后</td>
            <td>beforeUpdate / updated</td>
            <td>onBeforeUpdate / onUpdated</td>
            <td>读更新后的 DOM 尺寸（多数场景用 watch flush:'post' 更精确）</td>
          </tr>
          <tr>
            <td>卸载前/后</td>
            <td>beforeUnmount / unmounted</td>
            <td>onBeforeUnmount / onUnmounted</td>
            <td>清理定时器、解绑全局事件、断开 WebSocket</td>
          </tr>
          <tr>
            <td>KeepAlive 激活/失活</td>
            <td>activated / deactivated</td>
            <td>onActivated / onDeactivated</td>
            <td>缓存页面重新进入时刷新数据</td>
          </tr>
          <tr>
            <td>错误捕获</td>
            <td>errorCaptured</td>
            <td>onErrorCaptured</td>
            <td>局部错误边界，避免整页白屏</td>
          </tr>
          <tr>
            <td>服务端渲染</td>
            <td>serverPrefetch</td>
            <td>onServerPrefetch</td>
            <td>SSR 时预先取数据</td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <BaseCard title="③ 三个高频坑" tone="warn">
      <ol style="margin: 0; padding-left: 20px">
        <li>
          <b>在 setup 里直接访问 DOM</b>：此时 <code>ref</code> 还是 null，必须放到
          <code>onMounted</code> 里。
        </li>
        <li>
          <b>在 onMounted 里请求数据后忘记 loading/错误处理</b>：<code>await</code> 之后的代码，
          组件可能已经卸载 → 用组合式函数（第 12 页）或 <code>onBeforeUnmount</code> 标记取消。
        </li>
        <li>
          <b>用 async setup 而不配 Suspense</b>：<code>&lt;script setup&gt;</code> 里顶层 await 会让组件变成
          异步组件，必须由 <code>&lt;Suspense&gt;</code> 包裹（第 16 页）。
        </li>
      </ol>
      <p class="hint" style="margin-top: 8px">
        小贴士：父组件 <code>onMounted</code> 时，子组件的 DOM 一定已经就绪，所以在父组件里测量子组件尺寸
        是安全的。
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
</style>
