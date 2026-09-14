<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import BaseCard from '@/components/BaseCard.vue'

/**
 * 路由参数详情页：演示 params / query / props / 编程式导航 / 组件内守卫。
 * 路由配置里写了 props: true，所以 :id 会自动作为 props 传进来，
 * 组件不需要 import useRoute 也能拿到参数（解耦，便于单独测试）。
 */
const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()

const users: Record<string, { name: string; role: string; intro: string }> = {
  '1': { name: '张三', role: '前端工程师', intro: 'Vue 3 + TS 技术栈' },
  '2': { name: '李四', role: '后端工程师', intro: 'Node / Go' },
  '3': { name: '王五', role: '产品经理', intro: '爱提需求' },
}
const user = computed(() => users[props.id] ?? { name: '未知用户', role: '-', intro: '-' })

// ---------- query 参数 ----------
const tab = computed({
  get: () => (route.query.tab as string) ?? 'info',
  set: (v: string) => router.replace({ query: { ...route.query, tab: v } }),
})

// ---------- 组件内守卫 ----------
const dirty = ref(false)
onBeforeRouteUpdate((to, from) => {
  console.log('[组件内] onBeforeRouteUpdate', from.params.id, '->', to.params.id)
})
onBeforeRouteLeave((_to, _from, next) => {
  if (dirty.value && !window.confirm('有未保存的修改，确定离开吗？')) next(false)
  else next()
})

// 侦听参数变化（同一路由不同参数时组件会被复用，不会重新 created）
watch(
  () => props.id,
  (nv, ov) => console.log('[watch props.id]', ov, '->', nv),
)

function goRandom() {
  const id = String(Math.floor(Math.random() * 3) + 1)
  router.push({ name: 'router-user', params: { id }, query: { from: 'random' } })
}
</script>

<template>
  <div>
    <h1>路由参数详情页（/adv-router/user/:id）</h1>

    <BaseCard title="① props 与 params" hint="路由配置里的 props: true 把 params 变成了组件 props。">
      <div class="row">
        <span class="tag pass">props.id = {{ props.id }}</span>
        <span class="tag info">route.params.id = {{ route.params.id }}</span>
        <button @click="goRandom">随机跳到另一个用户（router.push）</button>
        <RouterLink class="btn" :to="{ name: 'router-user', params: { id: '1' } }">
          RouterLink 到用户 1
        </RouterLink>
      </div>
      <p style="margin-top: 10px">
        <b>{{ user.name }}</b> · {{ user.role }} · {{ user.intro }}
      </p>
      <p class="hint">
        注意：从 /user/1 跳到 /user/2 时组件被<strong>复用</strong>（不会重新 created/mounted），
        所以要用 watch(() =&gt; props.id) 或 onBeforeRouteUpdate 响应参数变化。
      </p>
    </BaseCard>

    <BaseCard title="② query 与 replace" hint="切换 tab 会写进地址栏 ?tab=xxx，刷新后仍然保留。">
      <div class="row">
        <button :class="{ primary: tab === 'info' }" @click="tab = 'info'">信息</button>
        <button :class="{ primary: tab === 'posts' }" @click="tab = 'posts'">动态</button>
        <button :class="{ primary: tab === 'settings' }" @click="tab = 'settings'">设置</button>
      </div>
      <p class="kv" style="margin-top: 8px">route.query = {{ route.query }}</p>
      <p class="kv">route.fullPath = {{ route.fullPath }}</p>
      <p class="hint" style="margin-top: 8px">
        <code>router.push</code> 会新增历史记录（可后退）；<code>router.replace</code> 不会。
        数值/布尔参数会被序列化成字符串，取值时要自己转换。
      </p>
    </BaseCard>

    <BaseCard title="③ 组件内守卫与脏数据拦截" tone="warn">
      <label class="kv"><input type="checkbox" v-model="dirty" /> 模拟「有未保存的修改」</label>
      <p class="hint" style="margin-top: 8px">
        勾选后再点侧边栏其他页面，会触发 <code>onBeforeRouteLeave</code>，弹出 confirm。
        这是防止用户误丢表单的常见做法。
      </p>
    </BaseCard>

    <RouterLink class="btn" :to="{ name: 'adv-router' }">← 返回路由章节</RouterLink>
  </div>
</template>

<style scoped>
h1 {
  font-size: 22px;
}
code {
  background: var(--c-surface-2);
  padding: 1px 5px;
  border-radius: 5px;
}
</style>
