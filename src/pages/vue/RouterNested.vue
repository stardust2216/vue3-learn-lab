<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

/**
 * 嵌套路由的父级布局：它自己有一个 <RouterView>，
 * 子路由渲染到这个位置，父级的部分（如导航条）保持不变。
 *
 * 路由配置：
 * {
 *   path: '/adv-router/nested',
 *   component: RouterNested,
 *   children: [
 *     { path: '', name: 'router-nested-home', component: ... },
 *     { path: 'about', name: 'router-nested-about', component: ... },
 *   ],
 * }
 * 子路由 path 不要写 '/'，否则会被当成绝对路径。
 */
const tabs = [
  { name: 'router-nested-home', label: '子路由：首页' },
  { name: 'router-nested-about', label: '子路由：关于' },
  { name: 'router-nested-detail', label: '子路由：详情（带参数）' },
]
</script>

<template>
  <div class="nested">
    <p class="hint">
      我是父级组件 RouterNested：下面的标签栏属于父级，不会随子路由切换而重新渲染；
      绿色框内是子路由的 <code>&lt;RouterView /&gt;</code>。
    </p>
    <nav class="tabs">
      <RouterLink v-for="t in tabs" :key="t.name" :to="{ name: t.name }">{{ t.label }}</RouterLink>
    </nav>
    <div class="child-view">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.nested {
  border: 1px solid var(--c-primary);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--c-surface-2);
}
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.tabs a {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  font-size: 12.5px;
  color: var(--c-text);
  background: var(--c-surface);
}
.tabs a.router-link-active {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: #fff;
  text-decoration: none;
}
.child-view {
  border: 1px dashed var(--c-primary);
  border-radius: 8px;
  padding: 10px;
  background: var(--c-surface);
  min-height: 64px;
}
code {
  background: var(--c-bg);
  padding: 1px 5px;
  border-radius: 5px;
}
</style>
