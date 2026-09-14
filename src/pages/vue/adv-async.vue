<script setup lang="ts">
import { computed, defineAsyncComponent, onErrorCaptured, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import SuspensePanel from '@/components/SuspensePanel.vue'

/* ============================================================================
 * 16. 异步组件与 Suspense
 *
 * defineAsyncComponent：把「组件」变成「按需下载 + 加载状态管理」的对象。
 * Suspense：让「等待异步依赖」这件事由框架处理，组件里不用写 v-if="loading"。
 * ========================================================================== */

// ---------- ① 最简写法 ----------
const AsyncSimple = defineAsyncComponent(() => import('@/components/LazyPanel.vue'))

// ---------- ② 完整配置：loading / error / delay / timeout / 重试 ----------
const loadDelay = ref(1200) // 通过人为延迟让 loading 状态可见
const shouldFail = ref(false)

const AsyncConfigured = defineAsyncComponent({
  loader: async () => {
    await new Promise((r) => setTimeout(r, loadDelay.value))
    if (shouldFail.value) throw new Error('模拟：chunk 下载失败')
    const mod = await import('@/components/LazyPanel.vue')
    return mod.default
  },
  loadingComponent: {
    name: 'LoadingSpinner',
    template: `<div class="spinner">⏳ 正在加载异步组件…（loadingComponent）</div>`,
  },
  errorComponent: {
    name: 'ErrorBox',
    template: `<div class="errorbox">❌ 异步组件加载失败（errorComponent）</div>`,
  },
  delay: 200, // 200ms 内加载完就不显示 loading，避免闪烁
  timeout: 8000, // 超时也走 errorComponent
  suspensible: false, // 是否交给上层 Suspense 处理（默认 true）
  onError(error, retry, fail, attempts) {
    // 失败自动重试 2 次，仍失败才显示 errorComponent
    if (attempts <= 2) retry()
    else fail()
    console.warn(`[AsyncConfigured] 第 ${attempts} 次加载失败：`, (error as Error).message)
  },
})

// key 变化会重新创建组件 → 重新触发一次异步加载
const instanceKey = ref(0)
const showConfigured = ref(true)

// ---------- ③ 动态异步组件：配合 v-if 实现「点开才加载」 ----------
const showLazy = ref(false)
const lazyKey = ref(0)

// ---------- ④ Suspense ----------
const showSuspense = ref(false)
const suspenseDelay = ref(1200)
const suspenseFail = ref(false)
const suspenseKey = ref(0)

// ---------- ⑤ 错误边界：onErrorCaptured 捕获后代组件抛出的错误 ----------
const caughtError = ref<string | null>(null)
onErrorCaptured((err) => {
  caughtError.value = (err as Error).message
  console.warn('[onErrorCaptured] 捕获到子组件错误：', err)
  return false // 返回 false 阻止继续向上冒泡（返回 true/undefined 会继续往上抛）
})

const hasError = computed(() => caughtError.value !== null)
</script>

<template>
  <div>
    <h1>16. 异步组件与 Suspense</h1>
    <p class="lead">
      异步组件解决的痛点是<strong>首屏体积</strong>：把「不马上需要的组件」拆成单独的 chunk，
      用到时才下载。Suspense 解决的是「异步依赖的等待状态」，让组件内部可以写干净的
      <code>await</code>。
    </p>

    <BaseCard
      title="① defineAsyncComponent 完整配置（loading / error / delay / timeout / 重试）"
      hint="把「延迟」拉到 2000ms 就能看到 loading；勾选「模拟加载失败」看 errorComponent + 自动重试。"
      tone="ok"
    >
      <div class="row">
        <label class="kv">延迟 <input type="range" min="0" max="3000" step="100" v-model.number="loadDelay" /> {{ loadDelay }}ms</label>
        <label class="kv"><input type="checkbox" v-model="shouldFail" /> 模拟加载失败（会自动重试 2 次）</label>
        <label class="kv"><input type="checkbox" v-model="showConfigured" /> 显示该组件</label>
        <button @click="instanceKey++">换 key 重新加载</button>
      </div>

      <div style="margin-top: 10px">
        <AsyncConfigured v-if="showConfigured" :key="instanceKey" message="我是配置版异步组件" />
      </div>

      <pre class="code" style="margin-top: 10px">
const AsyncComp = defineAsyncComponent({
  loader: () =&gt; import('./Heavy.vue'),
  loadingComponent: Spinner,     // 加载中显示
  errorComponent: ErrorBox,      // 失败显示
  delay: 200,                    // 200ms 内完成就不显示 loading（防闪烁）
  timeout: 8000,                 // 超时按失败处理
  suspensible: true,             // 是否交给外层 Suspense 接管
  onError(error, retry, fail, attempts) {
    if (attempts &lt;= 2) retry()   // 自动重试
    else fail()                  // 放弃 → 渲染 errorComponent
  },
})</pre
      >
      <p v-if="caughtError" class="err">onErrorCaptured 捕获到：{{ caughtError }}</p>
    </BaseCard>

    <BaseCard title="② 最简写法 + 「点开才加载」" hint="打开 DevTools Network 面板，点按钮时会看到新的 chunk 请求。">
      <div class="row">
        <button class="primary" @click="showLazy = !showLazy">
          {{ showLazy ? '卸载' : '加载' }} LazyPanel（defineAsyncComponent 简写）
        </button>
        <button @click="lazyKey++" :disabled="!showLazy">重新创建（key++）</button>
      </div>
      <div style="margin-top: 10px">
        <AsyncSimple v-if="showLazy" :key="lazyKey" message="我是最简写法：() => import(...)" />
      </div>
      <pre class="code" style="margin-top: 10px">
// 最简：等价于「懒加载组件」，但没有 loading/error 状态
const AsyncSimple = defineAsyncComponent(() =&gt; import('@/components/LazyPanel.vue'))

// 更常见的两种用法：
// 1) 弹窗里的重组件：&lt;AsyncChart v-if="showChart" /&gt;
// 2) 配合 v-if 做「可见才加载」：&lt;AsyncHeavy v-if="visible" /&gt;
// 注意：不确定网络状况时，务必给 loading/error，否则用户只看到白屏</pre
      >
    </BaseCard>

    <BaseCard title="③ Suspense + 顶层 await" hint="Suspense 的 fallback 显示在 #fallback 插槽；失败会触发 onErrorCaptured。" tone="ok">
      <div class="row">
        <label class="kv">模拟耗时 <input type="range" min="300" max="3000" step="100" v-model.number="suspenseDelay" /> {{ suspenseDelay }}ms</label>
        <label class="kv"><input type="checkbox" v-model="suspenseFail" /> 模拟请求失败（抛错）</label>
        <label class="kv"><input type="checkbox" v-model="showSuspense" /> 挂载 Suspense</label>
        <button @click="suspenseKey++">重新挂载</button>
        <button @click="caughtError = null">清空错误</button>
      </div>

      <div style="margin-top: 10px">
        <Suspense v-if="showSuspense" :key="suspenseKey">
          <SuspensePanel :delay="suspenseDelay" :fail="suspenseFail" />

          <template #fallback>
            <div class="fallback">
              ⏳ Suspense fallback：#fallback 插槽内容（默认插槽里所有异步依赖都就绪后才替换）
            </div>
          </template>
        </Suspense>
        <p v-else class="hint">勾选「挂载 Suspense」开始演示。</p>
      </div>

      <p v-if="hasError" class="err">
        Suspense 里的组件抛错了：{{ caughtError }}（页面没有白屏，因为 onErrorCaptured 拦住了）
      </p>

      <pre class="code" style="margin-top: 10px">
// 子组件：直接用顶层 await，不需要自己维护 loading
&lt;script setup&gt;
const res = await fetch('/api/user')
const user = await res.json()
&lt;/script&gt;

// 父组件：用 Suspense 包住
&lt;Suspense&gt;
  &lt;AsyncUser /&gt;
  &lt;template #fallback&gt;⏳ 加载中…&lt;/template&gt;
&lt;/Suspense&gt;</pre
      >
    </BaseCard>

    <BaseCard title="④ Suspense 的三个要点与限制" tone="warn">
      <ol style="margin: 0; padding-left: 20px">
        <li>
          <b>默认插槽里可以有多个异步依赖</b>，Suspense 会等全部就绪（<code>timeout</code>
          可以控制等待上限）。
        </li>
        <li>
          <b>错误不会自动被“捕获成错误 UI”</b>：Suspense 只有 fallback，没有 error 插槽 ——
          要用 <code>onErrorCaptured</code> 或 <code>&lt;ErrorBoundary&gt;</code> 模式自己实现。
        </li>
        <li>
          <b>切换依赖时要配合 key</b>，否则 Suspense 只会显示第一个加载状态；
          这也是「点重新挂载看加载动画」必须 key++ 的原因。
        </li>
        <li>
          <b>不要滥用</b>：普通的接口请求用 <code>useFetch</code> + loading 更可控；
          Suspense 更适合「路由级页面首屏数据」和「多层嵌套的异步依赖」。
        </li>
      </ol>
    </BaseCard>

    <BaseCard title="⑤ 和路由配合：路由级异步 + 页面 loading">
      <pre class="code">
// 方案 A：路由懒加载 + 全局 loading（最简单，推荐）
router.beforeEach(() =&gt; (loadingBar.start()))
router.afterEach(() =&gt; (loadingBar.finish()))

// 方案 B：页面组件里顶层 await，路由用 Suspense 包 RouterView
&lt;RouterView v-slot="{ Component }"&gt;
  &lt;Suspense&gt;
    &lt;component :is="Component" /&gt;
    &lt;template #fallback&gt;页面加载中…&lt;/template&gt;
  &lt;/Suspense&gt;
&lt;/RouterView&gt;

// 方案 C：Nuxt 风格的 asyncData —— 在 beforeRouteEnter 里先取数据再进页面
// 注意 beforeRouteEnter 里拿不到组件实例（组件还没创建）</pre
      >
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
.fallback {
  padding: 14px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  color: var(--c-text-dim);
  font-size: 13px;
}
.err {
  color: var(--c-danger);
  font-size: 13px;
  margin-top: 8px;
}
:deep(.spinner) {
  padding: 12px;
  border: 1px dashed var(--c-warn);
  border-radius: 10px;
  color: var(--c-warn);
  font-size: 13px;
}
:deep(.errorbox) {
  padding: 12px;
  border: 1px solid var(--c-danger);
  border-radius: 10px;
  color: var(--c-danger);
  font-size: 13px;
}
</style>
