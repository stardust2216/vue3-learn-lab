<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="nf">
    <h1>404</h1>
    <p>没有匹配到这条路由：<code>{{ $route.fullPath }}</code></p>
    <p class="hint">
      这条路由来自 <code>/:pathMatch(.*)*</code> 通配规则，必须放在 routes 数组的<strong>最后</strong>，
      否则会吞掉后面所有路由。
    </p>
    <RouterLink class="btn" to="/">回到首页</RouterLink>
  </div>
</template>

<style scoped>
.nf {
  padding: 40px 0;
  text-align: center;
}
h1 {
  font-size: 56px;
  margin: 0;
  color: var(--c-text-dim);
}
code {
  background: var(--c-surface-2);
  padding: 1px 5px;
  border-radius: 5px;
}
</style>
