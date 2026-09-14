import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setupDirectives } from './directives'
import { i18nPlugin } from './plugins/i18n'
import './styles/main.css'

/**
 * 应用入口：createApp -> 安装插件 -> mount
 * 插件顺序无所谓，但 router 必须在 mount 之前安装。
 */
const app = createApp(App)

app.use(createPinia()) // 状态管理（进阶：Store）
app.use(router) // 路由
app.use(i18nPlugin, { locale: 'zh' }) // 自定义插件（第 20 页）
setupDirectives(app) // 全局自定义指令（第 13 页）

// 全局错误处理：组件渲染/生命周期里抛出的错误都会到这里
app.config.errorHandler = (err, instance, info) => {
  console.error('[全局 errorHandler]', info, err, instance)
}

// 全局属性：模板里可直接用 $appName（配合 env.d.ts 的声明才有类型提示）
app.config.globalProperties.$appName = '前端学习实验室'

app.mount('#app')
