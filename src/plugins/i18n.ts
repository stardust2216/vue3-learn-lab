import type { App, InjectionKey, Ref } from 'vue'
import { defineComponent, h, inject, ref } from 'vue'

/* ============================================================================
 * 自定义插件：一个函数/对象，接收 app 实例，在里面做「全局注册」。
 * 能做的事：注册全局组件(component)、全局指令(directive)、provide、全局属性(globalProperties)。
 * 典型用途：i18n、UI 组件库、埋点、权限、请求封装。
 * ========================================================================== */

type Locale = 'zh' | 'en'

const messages: Record<Locale, Record<string, string>> = {
  zh: {
    'app.title': 'Vue 3 学习实验室',
    'app.hello': '你好',
    'app.count': '当前计数',
  },
  en: {
    'app.title': 'Vue 3 Learning Lab',
    'app.hello': 'Hello',
    'app.count': 'Current count',
  },
}

export interface I18nContext {
  locale: Ref<Locale>
  t: (key: string) => string
  setLocale: (l: Locale) => void
}

export const I18nKey: InjectionKey<I18nContext> = Symbol('i18n')

/** 一个极简 i18n 插件 */
export const i18nPlugin = {
  install(app: App, options?: { locale?: Locale }) {
    const locale = ref<Locale>(options?.locale ?? 'zh')
    const t = (key: string) => messages[locale.value][key] ?? key
    const setLocale = (l: Locale) => (locale.value = l)

    // ① provide：组合式 API 里用 inject(I18nKey) 取
    app.provide(I18nKey, { locale, t, setLocale })

    // ② globalProperties：模板里可以直接用 $t（选项式 API 也能用 this.$t）
    app.config.globalProperties.$t = t
    app.config.globalProperties.$locale = locale

    // ③ 全局组件：注册一个小组件给所有页面用
    // 注意：这里用 render 函数而不是 template 字符串 ——
    // 因为默认的 vue 是「运行时版」（不含模板编译器），字符串模板会编译失败。
    // 想用字符串模板要么引 alias 到 vue/dist/vue.esm-bundler.js（见 vite.config.ts 注释），要么用 h()。
    const AppBadge = defineComponent({
      name: 'AppBadge',
      props: { text: { type: String, default: '' } },
      setup(props) {
        return () => h('span', { class: 'app-badge' }, `🔖 ${props.text}`)
      },
    })
    app.component('AppBadge', AppBadge)

    console.log('[i18nPlugin] install 完成，locale =', locale.value)
  },
}

/** 插件里提供的小工具函数：在组件里这样用（推荐做法，比 inject 更友好） */
export function useI18n() {
  const ctx = inject(I18nKey)
  if (!ctx) throw new Error('useI18n() 必须在安装了 i18nPlugin 的组件里使用')
  return ctx
}
