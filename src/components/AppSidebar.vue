<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { labs } from '@/labs'

/**
 * 侧边导航：
 *  顶部是 Lab 切换器（Vue 3 / CSS / JavaScript），下面渲染当前 Lab 的大纲。
 *  大纲数据来自 src/labs.ts —— 与路由共用同一份配置。
 */
const route = useRoute()
const router = useRouter()

/** 当前所在 Lab：优先看路由 name 属于哪个 Lab（详情页也能正确归属），否则看 meta.lab */
const currentLab = computed(() => {
  const byName = route.name ? labs.find((l) => l.groups.some((g) => g.items.some((i) => i.name === route.name))) : undefined
  if (byName) return byName
  const byMeta = labs.find((l) => l.id === route.meta.lab)
  return byMeta ?? labs[0]
})

/** 切 Lab：跳到该 Lab 的第一页 */
function switchLab(id: string) {
  const lab = labs.find((l) => l.id === id)
  if (!lab) return
  const first = lab.groups[0]?.items[0]
  if (first) router.push({ name: first.name })
}

function isActive(name: string) {
  return route.name === name || (name === 'adv-router' && route.name === 'router-user')
}
</script>

<template>
  <aside class="sidebar">
    <!-- Lab 切换器：三个学习模块 -->
    <div class="labs">
      <button
        v-for="lab in labs"
        :key="lab.id"
        class="lab-tab"
        :class="{ on: lab.id === currentLab.id }"
        :style="{ '--accent': lab.accent }"
        @click="switchLab(lab.id)"
      >
        <span class="ico">{{ lab.icon }}</span>
        <span class="nm">{{ lab.label }}</span>
      </button>
    </div>

    <p class="slogan">{{ currentLab.slogan }}</p>

    <nav>
      <section v-for="group in currentLab.groups" :key="group.id">
        <h4 class="group-title">
          <span v-if="group.badge" class="tag" :class="group.badge === '基础' ? 'pass' : 'info'">
            {{ group.badge }}
          </span>
          {{ group.title }}
        </h4>
        <ul>
          <li v-for="item in group.items" :key="item.name">
            <RouterLink :to="{ name: item.name }" :class="{ active: isActive(item.name) }">
              <span class="title">{{ item.title }}</span>
              <span class="desc">{{ item.desc }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 278px;
  flex: 0 0 278px;
  overflow: auto;
  border-right: 1px solid var(--c-border);
  background: var(--c-surface);
  padding: 12px 10px 40px;
}
.labs {
  display: flex;
  gap: 6px;
  padding: 2px 2px 8px;
  border-bottom: 1px solid var(--c-border);
  position: sticky;
  top: 0;
  background: var(--c-surface);
  z-index: 2;
}
.lab-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 2px;
  font-size: 11.5px;
  border-radius: 9px;
  border: 1px solid var(--c-border);
  background: var(--c-surface-2);
  color: var(--c-text-dim);
  line-height: 1.25;
}
.lab-tab .ico {
  font-size: 14px;
}
.lab-tab:hover {
  border-color: var(--accent);
  color: var(--c-text);
}
.lab-tab.on {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border-color: var(--accent);
  color: var(--c-text);
  font-weight: 600;
}
.slogan {
  font-size: 11.5px;
  color: var(--c-text-dim);
  margin: 8px 6px 4px;
}
.group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--c-text-dim);
  margin: 12px 4px 6px;
  letter-spacing: 0.02em;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
a {
  display: block;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--c-text);
  border-left: 2px solid transparent;
}
a:hover {
  background: var(--c-surface-2);
  text-decoration: none;
}
a.active {
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
  border-left-color: var(--c-primary);
  color: var(--c-primary-dark);
}
.title {
  display: block;
  font-size: 13px;
}
.desc {
  display: block;
  font-size: 11.5px;
  color: var(--c-text-dim);
  line-height: 1.4;
  margin-top: 1px;
}
</style>
