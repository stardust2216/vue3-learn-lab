import { createRouter, createWebHashHistory, type RouteComponent, type RouteRecordRaw } from 'vue-router'
import { h } from 'vue'
import { labs, routePath, type Lab } from '@/labs'
import RouterNested from '@/pages/vue/RouterNested.vue'

/**
 * 按 Lab 的目录批量收集页面组件。
 * 每个 Lab 一个 glob，键统一成 `/src/pages/<lab.id>/<name>.vue`，与 labs.ts 里的 dir 一致。
 */
const pageModules = {
  ...import.meta.glob('@/pages/vue/*.vue'),
  ...import.meta.glob('@/pages/css/*.vue'),
  ...import.meta.glob('@/pages/js/*.vue'),
} as Record<string, RouteComponent>

/** 由 labs.ts 的配置生成路由：新增页面不用改这个文件 */
function buildLabRoutes(lab: Lab): RouteRecordRaw[] {
  return lab.groups.flatMap((group, gi) =>
    group.items.map<RouteRecordRaw>((item) => {
      const key = `/src/pages/${lab.id}/${item.name}.vue`
      if (import.meta.env.DEV && !pageModules[key]) {
        console.warn(
          `[router] 找不到页面组件：${key}（请在 src/pages/${lab.id}/ 下创建 ${item.name}.vue）`,
        )
      }
      return {
        path: routePath(lab, item.name),
        name: item.name,
        component: pageModules[key],
        meta: {
          lab: lab.id,
          groupIndex: gi,
          groupTitle: group.title,
          title: item.title,
          desc: item.desc,
        },
      }
    }),
  )
}

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/basic-template' },

  // —— 三个 Lab 的页面 ——
  ...labs.flatMap(buildLabRoutes),

  // 非导航页：路由参数练习（params / query / 动态段）
  {
    path: '/adv-router/user/:id',
    name: 'router-user',
    component: () => import('@/pages/vue/RouterUser.vue'),
    props: true, // 把 params 当 props 传给组件，组件与路由解耦
    meta: { lab: 'vue', title: '路由参数详情页', desc: '动态段 + query + props: true' },
  },

  // 嵌套路由示例：父级 RouterNested 有自己的 <RouterView />，
  // 子路由只替换父级内部的那块区域。子路由 path 不要带前导 /。
  {
    path: '/adv-router/nested',
    component: RouterNested,
    meta: { lab: 'vue' },
    children: [
      {
        path: '',
        name: 'router-nested-home',
        component: {
          name: 'NestedHome',
          render: () =>
            h('div', [h('b', '子路由首页'), h('p', '我是 name 为 router-nested-home 的子页面。')]),
        },
      },
      {
        path: 'about',
        name: 'router-nested-about',
        component: {
          name: 'NestedAbout',
          render: () => h('div', [h('b', '子路由关于页'), h('p', '父级布局保持不变，只有这里被替换。')]),
        },
      },
      {
        path: 'detail/:id?',
        name: 'router-nested-detail',
        props: true,
        component: {
          name: 'NestedDetail',
          props: ['id'],
          render() {
            return h('div', [
              h('b', '子路由详情页'),
              h('p', `props.id = ${(this as unknown as { id?: string }).id ?? '（未传，用了可选参数）'}`),
            ])
          },
        },
      },
    ],
  },

  // 404：必须放最后
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/vue/NotFound.vue'),
  },
]

/**
 * 路由实例
 * - createWebHashHistory：地址带 #，部署到任意静态服务器都能直接打开（学习/演示最省事）
 *   真实项目一般用 createWebHistory（需要服务端把未匹配路径回退到 index.html）
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  // 切换路由时回到顶部，返回时恢复原位置
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

// ---------------- 全局前置守卫 ----------------
router.beforeEach((to, from) => {
  console.log('[router.beforeEach]', from.fullPath, '->', to.fullPath, 'meta=', to.meta)
  document.title = to.meta.title ? `${to.meta.title} · 前端学习实验室` : '前端学习实验室'
  // 返回 false 取消导航；返回字符串/对象则重定向
  // if (!isLogin) return { name: 'login' }
})

// ---------------- 全局解析守卫（组件内守卫之后、导航确认之前） ----------------
router.beforeResolve((to) => {
  console.log('[router.beforeResolve]', to.fullPath)
})

// ---------------- 全局后置钩子：没有 next，常用于埋点/进度条 ----------------
router.afterEach((_to, _from, failure) => {
  if (failure) console.warn('[router.afterEach] 导航失败', failure)
})

router.onError((err) => {
  console.error('[router.onError] 路由懒加载失败', err)
})

export default router
