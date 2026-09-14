<script setup lang="ts">
import { inject, provide, readonly, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import MiddleLayer from '@/components/MiddleLayer.vue'
import { CounterKey, ThemeKey, type CounterContext, type ThemeContext } from '@/components/injectionKeys'

/* ============================================================================
 * 11. 依赖注入 provide / inject
 *
 * 解决问题：跨层级通信（祖父 → 曾孙），避免 props 逐层透传（prop drilling）。
 * 关键点：
 *  - provide 的值可以是任意值；但只有「ref / reactive / 含响应式的对象」才是响应式的
 *    （provide 一个普通字符串，后代拿到的是快照，改不了源数据）
 *  - provide / inject 只能在 setup 顶层同步调用
 *  - 建议用 Symbol 作为 key（见 injectionKeys.ts）+ 自定义组合式函数包装（推荐做法）
 * ========================================================================== */

// ---------- ① 主题上下文 ----------
const theme = ref<'light' | 'dark'>('light')
const primary = ref('#42b883')

/** 推荐模式：把 provide 包装成 useXxxProvider 组合式函数，只暴露必要的能力 */
function useThemeProvider() {
  const toggle = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    // 顺带演示：把主题应用到 <html> 上（本项目暗色模式就是这么实现的）
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }
  const setPrimary = (c: string) => (primary.value = c)
  const ctx: ThemeContext = { theme, toggle, primary, setPrimary }
  provide(ThemeKey, ctx)
  return ctx
}
useThemeProvider()

// ---------- ② 计数器上下文：用 readonly 防止后代直接改状态 ----------
const innerCount = ref(0)
const counterCtx: CounterContext = {
  // readonly()：后代可以读、会响应，但直接赋值会被拦截并警告
  count: readonly(innerCount),
  increment: (step = 1) => (innerCount.value += step),
  reset: () => (innerCount.value = 0),
}
provide(CounterKey, counterCtx)

// ---------- ③ 反面教材：provide 一个普通值（非响应式） ----------
const plainConfig = { appName: 'Vue 3 学习实验室', version: '0.1.0' }
provide('plain-config', plainConfig) // 后代 inject 到的是同一个对象引用，但整体替换不会被感知

// ---------- ④ 当前组件自己也 inject 一下（同一个组件里先 provide 再 inject，拿到的是祖先的） ----------
const outerTheme = inject(ThemeKey, null)
const injectedPlain = inject<{ appName: string; version: string }>('plain-config', {
  appName: '默认值',
  version: '-',
})
</script>

<template>
  <div>
    <h1>11. 依赖注入 provide / inject</h1>
    <p class="lead">
      什么时候用：<strong>跨层级、且是「上下文」性质的数据</strong>（主题、国际化、表单上下文、当前用户）。
      兄弟组件通信、父子通信都不该用它（那用 props / Pinia 更清晰）。
    </p>

    <BaseCard
      title="① 三层结构：祖先 provide，中间层什么都不做，孙组件 inject"
      hint="主题切换按钮在孙组件里，但状态由本页（祖先）持有。"
      tone="ok"
    >
      <div class="row">
        <span class="kv">祖先（本页）持有的 theme = {{ theme }}，primary = {{ primary }}</span>
        <label class="kv">改 primary <input type="color" v-model="primary" /></label>
      </div>
      <p class="hint" style="margin-top: 6px">
        下面这一层是 MiddleLayer：它<strong>没有</strong>声明任何 props、也不 inject，
        只是把孙组件渲染出来 —— 这就是 provide/inject 的价值。
      </p>

      <MiddleLayer style="margin-top: 8px" />
    </BaseCard>

    <BaseCard title="② 两个组件同时注入 + 默认值" hint="DeepChild 里 inject(ThemeKey) 没有默认值，所以可能是 undefined。">
      <p class="kv">本页自己也 inject(ThemeKey)：{{ outerTheme ? '拿到了' : '没拿到' }}</p>
      <p class="kv">inject('plain-config', 默认值) → {{ injectedPlain }}</p>
      <p class="hint" style="margin-top: 8px">
        组件在「没有祖先 provide」的环境下被单独复用时，给 <code>inject(key, defaultValue)</code>
        传默认值是保证健壮性的关键（比如 Storybook / 单元测试里单独渲染子组件）。
      </p>
    </BaseCard>

    <BaseCard title="③ 响应式的真相：provide 什么才会响应？" tone="warn">
      <table>
        <thead>
          <tr>
            <th>provide 的值</th>
            <th>后代能否看到更新</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ref(0)</code></td>
            <td>✅ 能</td>
            <td>后代拿到的就是同一个 ref 对象，读写都联动</td>
          </tr>
          <tr>
            <td><code>reactive({...})</code></td>
            <td>✅ 能</td>
            <td>代理对象共享，改属性即响应</td>
          </tr>
          <tr>
            <td><code>{ count: ref(0) }</code> 对象里包 ref</td>
            <td>✅ 能</td>
            <td>对象引用不变，内部 ref 是响应式的（本项目 ThemeContext 就是这个模式）</td>
          </tr>
          <tr>
            <td><code>'普通字符串'</code> / <code>{...}普通对象</code></td>
            <td>❌ 不能</td>
            <td>后代拿到的是值/引用快照，祖先后续整体替换不会通知后代</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 10px">
        所以标准做法：<b>provide 一个包装对象 / 或直接 provide ref</b>，并把「改状态的方法」一起提供出去，
        后代只调用方法，不直接改值（配合 readonly 更安全）。
      </p>
    </BaseCard>

    <BaseCard title="④ 推荐工程写法：Provider 组合式函数">
      <pre class="code">
// injectionKeys.ts —— key 和类型集中定义
export interface ThemeContext { theme: Ref&lt;'light' | 'dark'&gt;; toggle: () =&gt; void }
export const ThemeKey: InjectionKey&lt;ThemeContext&gt; = Symbol('theme')

// useTheme.ts —— 把 provide 包成组合式函数（在祖先组件 setup 里调用一次）
export function provideTheme() {
  const theme = ref&lt;'light' | 'dark'&gt;('light')
  const toggle = () =&gt; (theme.value = theme.value === 'light' ? 'dark' : 'light')
  provide(ThemeKey, { theme, toggle })
}

// 后代组件
const { theme, toggle } = inject(ThemeKey)!   // 有了 InjectionKey&lt;T&gt;，这里类型完整</pre
      >
      <p class="hint" style="margin-top: 8px">
        这也是 Element Plus / Vuetify 等组件库的通用模式（比如 <code>useFormContext</code>、
        <code>useTableContext</code>）：<b>组件库内部状态都用 provide/inject 传递，而不是 props</b>。
      </p>
    </BaseCard>

    <BaseCard title="⑤ app 级 provide 与 provide/inject vs Pinia">
      <pre class="code">
// main.ts：整个应用都能 inject
app.provide('appName', 'Vue 3 学习实验室')
app.provide(ConfigKey, { apiBase: import.meta.env.VITE_API_BASE })</pre
      >
      <table style="margin-top: 10px">
        <thead>
          <tr>
            <th>方案</th>
            <th>适合</th>
            <th>不适合</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>props / emits</td>
            <td>直接父子、关系明确</td>
            <td>层级深（透传地狱）</td>
          </tr>
          <tr>
            <td>provide / inject</td>
            <td>某个子树内部的上下文（主题、表单、表格）</td>
            <td>跨整个应用的业务状态、需要 devtools 追踪的数据</td>
          </tr>
          <tr>
            <td>Pinia</td>
            <td>全局业务状态、需要持久化/调试/跨页面共享</td>
            <td>只在局部子树里用的临时上下文</td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <BaseCard title="⑥ CounterContext 的注入演示说明">
      <p class="hint" style="margin: 0">
        上面孙组件里的 <code>counter.count</code> 来自本页 provide 的 <code>readonly(innerCount)</code>：
        孙组件可以读、能响应，但尝试 <code>counter.count.value++</code> 会被 Vue 警告拦截。
        状态修改必须走 <code>increment()</code>，这样「谁能改、怎么改」就完全由祖先控制了。
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
