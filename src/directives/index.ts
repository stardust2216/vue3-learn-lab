import type { App } from 'vue'

/**
 * 全局自定义指令：在 main.ts 里用 app.use(setupDirectives) 安装。
 * 每个指令都实现完整的挂载/更新/卸载生命周期，方便对照学习。
 *
 * 指令 vs 组件怎么选？
 *  - 需要「一段模板结构」→ 组件
 *  - 只是给「已有元素」附加行为（聚焦、点击外部、权限、懒加载、拖拽）→ 指令
 */

/**
 * v-permission 需要按当前角色判断。指令模块不直接 import Pinia store，
 * 而是由外部（页面的 onMounted 里）注册一个「取角色的函数」——这叫依赖倒置，
 * 能避免 main.ts 里的模块初始化顺序问题，也方便在测试里替换。
 */
let getRole: () => string = () => 'admin'
export function setPermissionRoleGetter(fn: () => string) {
  getRole = fn
}

export function setupDirectives(app: App) {
  // v-focus：元素挂载后自动聚焦（最常见的一行指令）
  app.directive('focus', {
    mounted(el: HTMLElement) {
      el.focus()
    },
  })

  // v-focus-delayed：带「参数」和「修饰符」的指令 —— v-focus-delayed:300
  app.directive('focusDelayed', {
    mounted(el: HTMLElement, binding) {
      const delay = Number(binding.arg ?? 0) // :300 → binding.arg === '300'
      window.setTimeout(() => el.focus(), delay)
    },
  })

  // v-permission：按角色控制元素显隐（真实项目里最常用的指令之一）
  // 用法：<button v-permission="'admin'">仅管理员可见</button>
  app.directive<HTMLElement, string>('permission', {
    mounted(el, binding) {
      const needed = binding.value
      if (needed && needed !== getRole()) {
        // 直接移除元素：比 v-if 更彻底（DOM 里根本不存在，无法被抓包看到）
        el.parentNode?.removeChild(el)
      }
    },
  })

  // v-click-outside：点外部触发回调，练习「绑定 / 解绑原生事件」
  app.directive<HTMLElement, () => void>('clickOutside', {
    mounted(el, binding) {
      const handler = (e: MouseEvent) => {
        if (!el.contains(e.target as Node)) binding.value?.()
      }
      // 把 handler 挂到元素上，unmounted 时才能解绑「同一个引用」
      ;(el as HTMLElement & { __clickOutside__?: (e: MouseEvent) => void }).__clickOutside__ = handler
      document.addEventListener('click', handler)
    },
    unmounted(el) {
      const target = el as HTMLElement & { __clickOutside__?: (e: MouseEvent) => void }
      document.removeEventListener('click', target.__clickOutside__!)
    },
  })

  // v-highlight：mounted 设置初始值，updated 里响应变化
  app.directive<HTMLElement, string>('highlight', {
    mounted(el, binding) {
      el.style.transition = 'background-color .3s'
      el.style.backgroundColor = binding.value || '#fff3bf'
    },
    updated(el, binding) {
      if (binding.value !== binding.oldValue) {
        el.style.backgroundColor = binding.value || '#fff3bf'
      }
    },
  })
}
