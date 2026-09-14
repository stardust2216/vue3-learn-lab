<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseCard from '@/components/BaseCard.vue'
import RouterNested from '@/pages/vue/RouterNested.vue'
import { routes } from '@/router'

/**
 * 14. 路由 Vue Router 4
 * 练习：动态路由、嵌套路由、守卫、懒加载、编程式导航、params/query。
 * 本页所在的 /adv-router 与详情页 /adv-router/user/:id 都注册在 src/router/index.ts。
 */
const route = useRoute()
const router = useRouter()

const users = [
  { id: 1, name: '张三', role: '前端' },
  { id: 2, name: '李四', role: '后端' },
  { id: 3, name: '王五', role: '产品' },
]

// ---------- 编程式导航 ----------
const navLog = ref<string[]>([])
const searchId = ref('1')

async function goUser() {
  // push 返回 Promise：可以 await 知道导航是否完成；被守卫拦截时不会 reject
  const failure = await router.push({ name: 'router-user', params: { id: searchId.value } })
  navLog.value.unshift(
    failure ? `导航被中止：${failure.type}` : `已跳转到 /adv-router/user/${searchId.value}`,
  )
}
async function goWithQuery() {
  await router.push({ path: '/adv-router/user/2', query: { tab: 'posts', from: 'button' } })
}
async function goNotFound() {
  await router.push('/不存在的路径/随便写')
}
function goBack() {
  router.back() // 等价于 history.back()
}
function goForward() {
  router.forward()
}

// ---------- 当前路由信息 ----------
const info = ref<Record<string, unknown>>({})
function refreshInfo() {
  info.value = {
    name: route.name,
    path: route.path,
    fullPath: route.fullPath,
    params: route.params,
    query: route.query,
    hash: route.hash,
    matched: route.matched.map((m) => m.path),
    meta: route.meta,
  }
}
refreshInfo()
router.afterEach(() => refreshInfo())

// ---------- 路由合并/解析 ----------
const resolved = ref('')
function resolveIt() {
  const r = router.resolve({ name: 'router-user', params: { id: 3 }, query: { x: '1' } })
  resolved.value = `href = ${r.href} ／ matched = ${r.matched.map((m) => m.path).join(' > ')}`
}
</script>

<template>
  <div>
    <h1>14. 路由 Vue Router 4</h1>
    <p class="lead">
      路由 = 「URL ↔ 组件的映射」。SPA 的页面切换靠它，<strong>守卫</strong>负责
      「能不能进 / 要不要重定向 / 要不要先取数据」。
    </p>

    <BaseCard title="① 动态路由与编程式导航" hint="地址栏会变，详情页从 params 里取 id。">
      <div class="row">
        <input v-model="searchId" style="width: 60px" />
        <button class="primary" @click="goUser">router.push 到 user/:id</button>
        <button @click="goWithQuery">带 query 跳转</button>
        <button @click="goNotFound">跳不存在的路径（404）</button>
        <button @click="goBack">router.back()</button>
        <button @click="goForward">router.forward()</button>
      </div>

      <ul style="margin: 10px 0 0; padding-left: 18px">
        <li v-for="u in users" :key="u.id">
          <RouterLink :to="{ name: 'router-user', params: { id: String(u.id) }, query: { from: 'list' } }">
            {{ u.name }}（{{ u.role }}）→ /adv-router/user/{{ u.id }}
          </RouterLink>
        </li>
      </ul>
      <pre class="code" style="margin-top: 10px">{{ navLog.slice(0, 4).join('\n') || '（还没有导航记录）' }}</pre>
    </BaseCard>

    <BaseCard title="② 嵌套路由（父子路由）" hint="注意父级布局不会重建，只有子 RouterView 的内容切换。">
      <RouterNested />
      <p class="hint" style="margin-top: 8px">
        RouterLink 的 <code>to</code> 支持三种形式：字符串 <code>"/a/b"</code>、
        对象 <code>{'{ name, params, query }'}</code>、以及 <code>{ path: '/a', query }</code>。
        推荐用 <b>name + params</b>：路径改了也不用全项目搜索替换。
      </p>
    </BaseCard>

    <BaseCard title="③ 当前路由信息（route 对象）" hint="组件里用 useRoute() 拿到的就是它。">
      <pre class="code">{{ JSON.stringify(info, null, 2) }}</pre>
      <p class="hint" style="margin-top: 8px">
        注意 <code>route.params</code> 的值永远可能是 <code>string | string[]</code>（重复参数），
        所以要转换时用 <code>Number(route.params.id)</code> 之类显式处理。
      </p>
    </BaseCard>

    <BaseCard title="④ router.resolve / 类型化路由" hint="resolve 可以在不导航的情况下算出一个 href。">
      <button @click="resolveIt">resolve({ name: 'router-user', params: { id: 3 } })</button>
      <p class="kv" style="margin-top: 8px">{{ resolved || '（点一下按钮）' }}</p>
    </BaseCard>

    <BaseCard title="⑤ 路由配置模板（src/nav.ts / src/router/index.ts）" tone="ok">
      <pre class="code">
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/basic-template' },

  // ① 静态路由 + 懒加载：() =&gt; import(...) 会把该页单独打成一个 chunk
  { path: '/basic-template', name: 'basic-template', component: () =&gt; import('@/pages/basic-template.vue') },

  // ② 动态段 + props: true（把 params 变成组件 props，组件与路由解耦）
  { path: '/adv-router/user/:id', name: 'router-user', component: () =&gt; import('@/pages/RouterUser.vue'),
    props: true, meta: { requiresAuth: true } },

  // ③ 嵌套路由：父组件里必须有 &lt;RouterView /&gt;
  { path: '/adv-router/nested', component: RouterNested, children: [
      { path: '', name: 'router-nested-home', component: () =&gt; import('...') },
      { path: 'about', name: 'router-nested-about', component: () =&gt; import('...') },
      { path: 'detail/:id?', name: 'router-nested-detail', component: () =&gt; import('...'), props: true },
  ]},

  // ④ 命名视图：一个路由渲染多个组件（同级的多个 &lt;RouterView name="x" /&gt;）
  { path: '/layout', components: { default: Body, sidebar: Sidebar } },

  // ⑤ 404 通配：必须放最后
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () =&gt; import('@/pages/NotFound.vue') },
]</pre
      >
    </BaseCard>

    <BaseCard title="⑥ 导航守卫执行顺序（背下来）" tone="warn">
      <pre class="code">
触发导航到 /B：
  1. 失活组件的 beforeRouteLeave       （离开 A 的组件内守卫）
  2. 全局 beforeEach                   （登录校验首选位置）
  3. 重用组件里 beforeRouteUpdate      （A 复用到 B，比如 /user/1 → /user/2）
  4. 路由配置里的 beforeEnter
  5. 解析异步路由组件（懒加载，此时才去下 chunk）
  6. 激活组件的 beforeRouteEnter       （注意：此时还没有 this，拿不到组件实例）
  7. 全局 beforeResolve
  8. 导航被确认
  9. 全局 afterEach                     （没有 next，适合埋点/进度条）
 10. DOM 更新 → 组件内 beforeRouteEnter 的 next(vm =&gt; {}) 回调执行

守卫的返回值三种写法：
  return true / undefined   → 放行
  return false              → 取消导航（URL 不变）
  return '/login' 或 { name } → 重定向到别处</pre
      >
      <p class="hint" style="margin-top: 8px">
        本模板在 <code>src/router/index.ts</code> 里给 beforeEach / beforeResolve / afterEach
        都加了 <code>console.log</code>，打开 DevTools 控制台点页面，就能看到完整顺序。
      </p>
    </BaseCard>

    <BaseCard title="⑦ 懒加载与代码分割" hint="Vite 会把 () => import() 的组件单独打包成 chunk。">
      <pre class="code">
// 页面级懒加载（推荐）：路由表里写
component: () =&gt; import('@/pages/BigPage.vue')

// 带 webpackChunkName 的注释在 Vite 里用 magic comment：
component: () =&gt; import(/* @vite-ignore */ '@/pages/BigPage.vue')

// 分包策略（vite.config.ts）
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['vue', 'vue-router', 'pinia'],
      },
    },
  },
}</pre
      >
      <p class="hint" style="margin-top: 8px">
        判断标准：首屏必须的组件直接 import；首屏看不到的（详情页、弹窗里的大组件、图表）懒加载。
        <code>pnpm build</code> 后看 dist 目录，每个页面一个 js 文件就是生效了。
      </p>
    </BaseCard>

    <BaseCard title="⑧ 本模板的路由表结构">
      <p class="hint">
        导航大纲（<code>src/nav.ts</code> 的 <code>navGroups</code>）是<strong>单一数据源</strong>：
        侧边栏渲染它，路由也用 <code>import.meta.glob('../pages/*.vue')</code> 按名字自动匹配页面组件。
        新增一页只需要：① 在 navGroups 加一项 ② 新建同名 .vue 文件。
      </p>
      <p class="kv">共 {{ routes.length }} 条路由注册在 createRouter 里。</p>
      <table style="margin-top: 8px">
        <thead>
          <tr>
            <th>能力</th>
            <th>本模板用在哪</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>动态段 :id</td><td>/adv-router/user/:id → RouterUser.vue</td></tr>
          <tr><td>props: true</td><td>RouterUser 用 props.id 而不是 useRoute()</td></tr>
          <tr><td>嵌套路由</td><td>RouterNested 的子标签页</td></tr>
          <tr><td>通配 404</td><td>/:pathMatch(.*)* → NotFound.vue</td></tr>
          <tr><td>懒加载</td><td>import.meta.glob 生成的每个页面 chunk</td></tr>
          <tr><td>全局守卫</td><td>router/index.ts：改标题 + 打印导航链路</td></tr>
          <tr><td>组件内守卫</td><td>RouterUser：onBeforeRouteLeave 拦截未保存修改</td></tr>
          <tr><td>scrollBehavior</td><td>路由切换回到顶部，返回时恢复原位置</td></tr>
        </tbody>
      </table>
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
