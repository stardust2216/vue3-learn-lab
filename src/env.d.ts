/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

/**
 * 环境变量类型声明：让 import.meta.env.VITE_XXX 有类型提示。
 * 对应的值写在 .env / .env.development / .env.production 里（必须以 VITE_ 开头才会暴露给客户端）。
 */
interface ImportMetaEnv {
  /** 接口基础地址（本模板没有真实后端，仅作演示） */
  readonly VITE_API_BASE?: string
  readonly VITE_APP_TITLE?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * 全局属性声明：在 main.ts / 插件里挂到 app.config.globalProperties 上的东西，
 * 都要在这里声明，模板与选项式 API 里使用它才有类型提示。
 */
declare module 'vue' {
  interface ComponentCustomProperties {
    $appName: string
    /** i18n 插件注册：$t('app.title') */
    $t: (key: string) => string
    /** i18n 插件注册：当前语言的 ref */
    $locale: import('vue').Ref<'zh' | 'en'>
  }
}

export {}
