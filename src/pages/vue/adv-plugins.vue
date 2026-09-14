<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import { useI18n } from '@/plugins/i18n'
import { useCounterStore } from '@/stores/counter'

/* ============================================================================
 * 20. 插件、全局配置与工程化
 *
 * 插件（Plugin）= 一个带 install(app, options) 的函数/对象，
 * 用来做「应用级」的注册：全局组件、全局指令、provide、globalProperties、第三方库初始化。
 *
 * main.ts 里的安装顺序：Pinia → Router → 自定义插件 → 指令 → mount
 * ========================================================================== */

// ---------- ① 使用插件提供的组合式函数 ----------
const { locale, t, setLocale } = useI18n()
const counter = useCounterStore()

// ---------- ② 全局属性：模板里 $t / $appName（main.ts 里注册的） ----------
const instance = getCurrentInstance()
const globalProps = computed(() => {
  const p = instance?.appContext.config.globalProperties
  return Object.keys(p ?? {}).sort()
})

// ---------- ③ 环境变量 ----------
const env = import.meta.env
const envRows = computed(() => [
  { k: 'MODE', v: env.MODE as string },
  { k: 'DEV', v: String(env.DEV) },
  { k: 'PROD', v: String(env.PROD) },
  { k: 'VITE_API_BASE', v: (env.VITE_API_BASE as string | undefined) ?? '（未定义，走默认值）' },
  { k: 'VITE_APP_TITLE', v: (env.VITE_APP_TITLE as string | undefined) ?? '（未定义）' },
])

// ---------- ④ 版本与运行信息（挂在全局属性上的 $appName） ----------
const appName = (instance?.appContext.config.globalProperties.$appName as string) ?? '-'

// ---------- ⑤ 演示 app.config 的几项常用配置 ----------
const configRows = [
  ['app.config.errorHandler', '全局错误处理：组件里没被捕获的错误都会到这里（main.ts 已注册）'],
  ['app.config.warnHandler', '自定义警告处理（开发期把警告上报到监控平台）'],
  ['app.config.performance', '开启组件初始化/渲染的性能打点（DevTools Performance 里可见）'],
  ['app.config.globalProperties', '全局属性（$appName / $t），用 TS 时要在 env.d.ts 里声明'],
  ['app.config.compilerOptions', '运行时编译选项（仅完整版有效，如 isCustomElement）'],
  ['app.config.idPrefix', '用 useId() 生成 id 时的前缀（SSR 场景常用）'],
]
</script>

<template>
  <div>
    <h1>20. 插件、全局配置与工程化</h1>
    <p class="lead">
      到这里 Vue 3 的主要 API 就学完了。最后一块是「怎么把它们组织成一个可维护的项目」：
      插件机制、全局配置、环境变量、构建优化。
    </p>

    <BaseCard
      title="① 自定义插件：i18nPlugin（src/plugins/i18n.ts）"
      hint="切换语言：组合式函数 t()、模板里的 $t、全局组件 AppBadge 三处都会变。"
      tone="ok"
    >
      <div class="row">
        <button :class="{ primary: locale === 'zh' }" @click="setLocale('zh')">中文</button>
        <button :class="{ primary: locale === 'en' }" @click="setLocale('en')">English</button>
        <span class="kv">locale = {{ locale }}</span>
      </div>

      <div class="grid2" style="margin-top: 10px">
        <div>
          <p class="hint">用 useI18n() 提供的 t() 函数：</p>
          <p class="kv">{{ t('app.title') }} / {{ t('app.hello') }} / {{ t('app.count') }} = {{ counter.count }}</p>
        </div>
        <div>
          <p class="hint">用 app.config.globalProperties.$t（模板里直接用）：</p>
          <p class="kv">$t('app.hello') = {{ $t('app.hello') }}</p>
        </div>
      </div>

      <p class="hint" style="margin-top: 10px">插件注册的全局组件（无需 import）：</p>
      <AppBadge :text="t('app.title')" />

      <pre class="code" style="margin-top: 10px">
// src/plugins/i18n.ts
export const i18nPlugin = {
  install(app, options) {
    const locale = ref(options?.locale ?? 'zh')
    const t = (key: string) =&gt; messages[locale.value][key] ?? key

    app.provide(I18nKey, { locale, t, setLocale })     // 组合式 API 用 inject
    app.config.globalProperties.$t = t                 // 模板 / 选项式 API 用 $t
    app.component('AppBadge', AppBadge)                // 全局组件

    console.log('[i18nPlugin] install 完成')
  },
}

// main.ts
app.use(i18nPlugin, { locale: 'zh' })</pre
      >
      <p class="hint" style="margin-top: 8px">
        插件也可以是一个函数：<code>const myPlugin = (app, options) =&gt; { ... }</code>，
        <code>app.use()</code> 两种都支持。第三方库（Element Plus / Pinia / Router）
        全都是这个机制。
      </p>
    </BaseCard>

    <BaseCard title="② 全局属性与当前应用配置" hint="getCurrentInstance() 是访问 app 级配置的入口（仅调试/插件里用）。">
      <p class="kv">本模板注册的全局属性：{{ globalProps.join('、') }}</p>
      <p class="kv">$appName = {{ appName }}</p>
      <table style="margin-top: 10px">
        <thead>
          <tr>
            <th>配置项</th>
            <th>作用</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in configRows" :key="row[0]">
            <td><code>{{ row[0] }}</code></td>
            <td>{{ row[1] }}</td>
          </tr>
        </tbody>
      </table>
      <pre class="code" style="margin-top: 10px">
// main.ts —— 本模板的完整入口
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18nPlugin, { locale: 'zh' })
setupDirectives(app)

app.config.errorHandler = (err, instance, info) =&gt; console.error('[errorHandler]', info, err)
app.config.globalProperties.$appName = 'Vue 3 学习实验室'

app.mount('#app')</pre
      >
    </BaseCard>

    <BaseCard title="③ 环境变量与多环境配置" hint="以 VITE_ 开头的变量才会被打进客户端代码。">
      <table>
        <thead>
          <tr>
            <th>变量</th>
            <th>当前值</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in envRows" :key="row.k">
            <td><code>{{ row.k }}</code></td>
            <td>{{ row.v }}</td>
          </tr>
        </tbody>
      </table>

      <pre class="code" style="margin-top: 10px">
# .env                所有环境都会加载
VITE_APP_TITLE=Vue 3 学习实验室
# .env.development    仅开发环境（pnpm dev）
VITE_API_BASE=/api-dev
# .env.production     仅生产环境（pnpm build）
VITE_API_BASE=https://api.example.com

# 代码里使用（构建时被静态替换，不是运行时读取）
const base = import.meta.env.VITE_API_BASE

# 类型提示写在 src/env.d.ts 的 ImportMetaEnv 接口里
# 注意：不要把密钥写进 VITE_ 变量 —— 它会被打进客户端产物，等同于公开</pre
      >
      <p class="hint" style="margin-top: 8px">
        模式（mode）与命令：<code>vite build --mode staging</code> 会加载
        <code>.env.staging</code>；<code>import.meta.env.MODE</code> 就是当前模式名。
      </p>
    </BaseCard>

    <BaseCard title="④ 工程化清单：从模板到项目" tone="ok">
      <table>
        <thead>
          <tr>
            <th>方面</th>
            <th>建议</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>目录结构</td>
            <td>
              <code>src/{components,pages,composables,stores,router,directives,plugins,api,utils,styles}</code>
              —— 按职责分，不要按文件类型堆在根目录
            </td>
          </tr>
          <tr>
            <td>组件命名</td>
            <td>组件 PascalCase（BaseCard.vue），页面 kebab-case 或 index，组合式函数 useXxx.ts</td>
          </tr>
          <tr>
            <td>代码规范</td>
            <td>ESLint + @typescript-eslint + eslint-plugin-vue，Prettier 只保留格式化</td>
          </tr>
          <tr>
            <td>类型检查</td>
            <td><code>vue-tsc --noEmit</code> 放进 CI 和 <code>pnpm build</code>（本模板已配）</td>
          </tr>
          <tr>
            <td>样式方案</td>
            <td>scoped + CSS 变量（主题），或 UnoCSS / Tailwind；大项目用设计令牌统一</td>
          </tr>
          <tr>
            <td>UI 组件库</td>
            <td>Element Plus / Naive UI / Ant Design Vue，按需引入（unplugin-vue-components）</td>
          </tr>
          <tr>
            <td>请求层</td>
            <td>axios/fetch 封装 + 拦截器（token、错误统一处理）+ 类型化的 API 模块</td>
          </tr>
          <tr>
            <td>测试</td>
            <td>Vitest（单元/组件）+ Vue Test Utils + Playwright（端到端）</td>
          </tr>
          <tr>
            <td>构建优化</td>
            <td>manualChunks 拆 vendor、gzip/brotli、图片压缩、CDN、构建分析（rollup-plugin-visualizer）</td>
          </tr>
          <tr>
            <td>部署</td>
            <td>静态托管（history 模式需回退到 index.html）；带 SSR 需求上 Nuxt</td>
          </tr>
        </tbody>
      </table>

      <pre class="code" style="margin-top: 10px">
// 构建分包示例（vite.config.ts）
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vue: ['vue', 'vue-router', 'pinia'],
      },
    },
  },
  chunkSizeWarningLimit: 600,
}</pre
      >
    </BaseCard>

    <BaseCard title="⑤ 学习路径建议（对照本模板）">
      <ol style="margin: 0; padding-left: 20px">
        <li><b>第 1~8 页</b>：把模板语法、ref/reactive、computed、watch 写熟 —— 这是每天的代码。</li>
        <li><b>第 9~12 页</b>：组件通信、插槽、provide/inject、组合式函数 —— 决定你的代码能不能复用。</li>
        <li><b>第 13~17 页</b>：指令、路由、Pinia、异步组件、Teleport/过渡 —— 撑起一个真实应用。</li>
        <li><b>第 18~20 页</b>：性能、渲染函数、插件与工程化 —— 从「会写」到「会维护」。</li>
        <li>
          下一步练习建议：用本模板的知识做一个「待办 + 用户列表」小应用
          （路由 + Pinia + 组合式函数 + 自定义指令 + 异步组件全用上），
          然后试着读一遍 Vue 官方文档的「深入组件」和「响应式深入」两章 ——
          有了模板里的对照例子，会顺畅很多。
        </li>
      </ol>
      <p class="hint" style="margin-top: 10px">
        官方文档：<code>cn.vuejs.org</code>（Vue 3 中文）· <code>router.vuejs.org</code> ·
        <code>pinia.vuejs.org</code> · <code>cn.vite.dev</code>
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
