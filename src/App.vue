<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import { labs } from '@/labs'
import { routes } from '@/router'
import { useCounterStore } from '@/stores/counter'

const route = useRoute()
const counter = useCounterStore()

/**
 * name → 页面组件 的映射（模块加载时构建一次）。
 *
 * 为什么要自己查表，而不是直接用 route.matched？
 * 实测在本项目的环境里 route.path / route.meta 是响应的，但 route.matched 不会
 * 跟着路由更新，用它算出的组件会「卡住不换」。route.name 是响应式且唯一的，
 * 拿它查一张静态表，渲染行为就完全可预测了。
 *
 * 为什么统一包一层 defineAsyncComponent？
 * 路由表里的页面组件大多是 `() => import('...')` 这种「懒加载函数」，
 * <component :is> 不会把它当成懒加载，而是当成函数式组件（渲染成空）。
 * 用 defineAsyncComponent 包一下才等价于 RouterView 的行为。
 */
const componentCache = new Map<string, Component>()
function resolvePage(name: string): Component | null {
  if (!name) return null
  const cached = componentCache.get(name)
  if (cached) return cached
  const raw = routes.find((r) => String(r.name ?? '') === name)?.component
  if (!raw) return null
  const comp =
    typeof raw === 'function'
      ? defineAsyncComponent(raw as () => Promise<Component>)
      : (raw as Component)
  componentCache.set(name, comp)
  return comp
}

/** 当前要渲染的页面组件（依赖 route.name —— 它是响应式的） */
const pageComponent = computed(() => resolvePage(route.name ? String(route.name) : ''))

/** 当前 Lab（Vue 3 / CSS / JavaScript）：决定顶栏标识与配色 */
const currentLab = computed(() => labs.find((l) => l.id === route.meta.lab) ?? labs[0])

/** 顶部面包屑：从当前路由 meta 里取标题 */
const currentTitle = computed(() => (route.meta.title as string) ?? '前端学习实验室')

/** 侧边栏开关：小屏时折叠 */
const sidebarOpen = ref(true)
const isDark = ref(document.documentElement.classList.contains('dark'))
watch(isDark, (v) => document.documentElement.classList.toggle('dark', v))

/** 页面切换进度条：路由变化时短暂显示 */
const entering = ref(false)
watch(
  () => route.fullPath,
  () => {
    entering.value = true
    window.setTimeout(() => (entering.value = false), 260)
  },
)
</script>

<template>
  <div class="layout">
    <!-- 顶栏：顺带演示「全局共享状态」（Pinia 的 count 在任何页面都能看到） -->
    <header class="topbar">
      <button class="burger" title="折叠导航" @click="sidebarOpen = !sidebarOpen">☰</button>
      <RouterLink to="/" class="brand">
        <span class="logo" :style="{ background: currentLab.accent }">{{ currentLab.icon }}</span>
        <strong>前端学习实验室</strong>
      </RouterLink>

      <span class="crumb" :style="{ '--accent': currentLab.accent }">
        <b>{{ currentLab.label }}</b> ／ {{ currentTitle }}
      </span>

      <div class="spacer" />

      <span class="tag info" title="来自 Pinia 全局 store，在任意页面都同步">
        counter.count = {{ counter.count }}
      </span>
      <button @click="isDark = !isDark" :title="isDark ? '切换亮色' : '切换暗色'">
        {{ isDark ? '🌙' : '☀️' }}
      </button>
    </header>

    <div class="body">
      <AppSidebar v-show="sidebarOpen" />

      <main class="content">
        <div v-if="entering" class="progress" />
        <!--
          页面渲染：useRoute() + <component :is> 显式渲染（等价于 <RouterView /> 的效果）。

          两个实测结论，写在这里避免以后又踩：
          ① 不要用 route.matched 取组件：本项目环境里 route.path / route.meta 是响应的，
             但 route.matched 不跟着更新，用它算出的组件会「卡住不换」。
             这里改成用响应式的 route.name 查一张静态表（见 script 里的 resolvePage）。
          ② 不要用 <Transition mode="out-in"> 包异步组件：离场动画会和懒加载互相等待，
             导致「路由变了页面不换 / 组件堆积」。页面入场动画改用 CSS keyframes
             挂在页面根节点上（见 style 里的 .page-enter）。
        -->
        <component :is="pageComponent" :key="route.path" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 52px;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text);
  font-size: 15px;
}
.brand:hover {
  text-decoration: none;
}
.logo {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
}
.crumb {
  color: var(--c-text-dim);
  font-size: 13px;
  padding-left: 10px;
  border-left: 1px solid var(--c-border);
}
.crumb b {
  color: var(--accent, var(--c-text));
}
.spacer {
  flex: 1;
}
.burger {
  border: none;
  background: transparent;
  font-size: 17px;
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.content {
  flex: 1;
  overflow: auto;
  padding: 20px 24px 60px;
  max-width: 1080px;
}
.progress {
  position: fixed;
  left: 0;
  top: 52px;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, var(--c-primary), var(--c-info));
  animation: shrink 260ms ease-out;
  z-index: 20;
}
@keyframes shrink {
  from {
    transform: scaleX(0);
    transform-origin: left;
  }
  to {
    transform: scaleX(1);
    transform-origin: left;
  }
}
/* 页面入场动画：挂在「页面根节点」上，由 :key="route.path" 换 key 时触发。
   用 CSS keyframes 而不是 <Transition>，是因为页面组件是懒加载的异步组件，
   Transition 的离场钩子会和异步加载互相等待（详见 template 里的注释）。 */
.content > :deep(*) {
  animation: page-enter 0.22s ease-out both;
}
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
</style>
