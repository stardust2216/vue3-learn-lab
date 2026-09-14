<script setup lang="ts">
import { ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import StyleChild from '@/components/StyleChild.vue'

/* ============================================================================
 * 7. 样式与 CSS 隔离
 *
 * <style scoped> 的真相：编译后给元素加 data-v-xxxxxx 属性，选择器变成 .cls[data-v-xxxxxx]
 *   - 子组件根元素会带上父组件的 data-v（所以父能选中子组件根）
 *   - 想改子组件内部 → :deep(选择器)
 *   - 想改插槽内容（由父渲染、但写在子模板里）→ :slotted(选择器)
 *   - 全局样式 → <style> 不带 scoped，或 :global()
 *   - CSS 里用 JS 变量 → v-bind(变量)
 * ========================================================================== */

const accent = ref('#42b883')
const fontSize = ref(14)
const childRef = ref<InstanceType<typeof StyleChild> | null>(null)
const enabled = ref(true)

/** 动态 class 的几种写法（对象/数组/三元） */
const isActive = ref(true)
const hasError = ref(false)
const theme = ref<'light' | 'dark'>('light')
</script>

<template>
  <div>
    <h1>7. 样式与 CSS 隔离</h1>
    <p class="lead">
      Vue 的 scoped 不是 Shadow DOM，而是「属性选择器」方案：理解
      <code>data-v-xxx</code>，就理解了所有「样式不生效」的问题。
    </p>

    <BaseCard
      title="① scoped 的作用范围 + :deep() / :slotted()"
      hint="下面父组件的样式：直接写 .child-root 能生效（子组件根），改子组件内部必须 :deep()。"
    >
      <div class="row">
        <label class="kv">强调色 <input type="color" v-model="accent" /></label>
        <label class="kv">字号 <input type="range" min="12" max="24" v-model.number="fontSize" /></label>
      </div>

      <StyleChild ref="childRef" style="margin-top: 10px">
        <template #extra>
          <span class="slotted-item">我是父组件通过插槽塞进去的内容（:slotted 命中）</span>
        </template>
      </StyleChild>

      <p class="hint" style="margin-top: 10px">
        打开 DevTools 看元素：子组件根节点有 <code>data-v-父</code> 与
        <code>data-v-子</code> 两个属性；子组件内部的 p 只有子组件的属性。
      </p>
    </BaseCard>

    <BaseCard title="② v-bind() 在 CSS 中使用响应式变量" hint="改上面的颜色，子组件的文字颜色会实时变化。">
      <pre class="code">&lt;script setup&gt;
const accent = ref('#42b883')
&lt;/script&gt;

&lt;style scoped&gt;
.dynamic {
  color: v-bind(accent);   /* 会被编译成 var(--xxxx-xxx)，随 ref 变化 */
}
&lt;/style&gt;</pre
      >
      <p class="hint" style="margin-top: 8px">
        原理：Vue 编译时把 <code>v-bind(accent)</code> 变成一个内联 CSS 变量，并在组件更新时写回。
        适合主题色、尺寸这类「由 JS 计算得到的样式」。
      </p>
    </BaseCard>

    <BaseCard title="③ 动态 class / style 的写法与优先级" hint="强烈推荐对象语法，可读性最好。">
      <div class="row">
        <label class="kv"><input type="checkbox" v-model="isActive" /> isActive</label>
        <label class="kv"><input type="checkbox" v-model="hasError" /> hasError</label>
        <select v-model="theme">
          <option value="light">light 主题</option>
          <option value="dark">dark 主题</option>
        </select>
      </div>

      <div
        class="box base"
        :class="[{ active: isActive, error: hasError }, theme === 'dark' && 'dark-box', `theme-${theme}`]"
        :style="{ borderWidth: enabled ? '2px' : '1px' }"
        style="margin-top: 10px"
      >
        我的 class 由对象 + 数组 + 模板字符串混合决定
      </div>

      <pre class="code" style="margin-top: 10px">:class="{ active: isActive, error: hasError }"        // 对象：推荐
:class="[cond ? 'a' : 'b', `theme-${theme}`]"        // 数组：适合拼接
:class="classList"                                   // 直接把数组/对象交给它
:style="{ color: accent, fontSize: fontSize + 'px' }" // style 对象，数值要带单位</pre
      >
      <p class="hint" style="margin-top: 8px">
        优先级：<code>style</code> 属性里的静态值会被 <code>:style</code> 覆盖；class
        是合并而不是覆盖，最终谁生效取决于 CSS 优先级（后写的 + 更具体的选择器胜出）。
      </p>
    </BaseCard>

    <BaseCard title="④ 样式方案的 4 个层次" tone="ok">
      <table>
        <thead>
          <tr>
            <th>写法</th>
            <th>作用范围</th>
            <th>使用场景</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>&lt;style scoped&gt;</code></td>
            <td>当前组件（含子组件根元素）</td>
            <td>默认选择，90% 的组件样式</td>
          </tr>
          <tr>
            <td><code>:deep(.cls)</code></td>
            <td>穿透到子组件内部</td>
            <td>改第三方组件/子组件内部样式（尽量少用，优先用 props 控制）</td>
          </tr>
          <tr>
            <td><code>:slotted(.cls)</code></td>
            <td>插槽内容</td>
            <td>父组件塞进来的内容样式</td>
          </tr>
          <tr>
            <td><code>:global(.cls)</code> / 无 scoped</td>
            <td>全局</td>
            <td>重置样式、主题变量、第三方库覆盖</td>
          </tr>
          <tr>
            <td>CSS Modules（<code>&lt;style module&gt;</code>）</td>
            <td>当前组件，类名被哈希</td>
            <td>需要把类名当 JS 对象用、或避免命名冲突</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 10px">
        项目里通常会再加一层：全局 CSS 变量（<code>--c-primary</code> 等，本模板就是这么做的）+
        scoped 组件样式 + 主题切换（<code>html.dark</code> 覆盖变量）。中大型项目再引入
        UnoCSS / Tailwind 之类的原子化方案。
      </p>
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

/* ① 父组件能选中子组件的根元素（因为根元素带父的 data-v） */
.child-root {
  box-shadow: inset 0 0 0 1px rgba(66, 184, 131, 0.25);
}

/* 想改子组件内部，必须用 :deep() */
:deep(.deep-target) {
  color: var(--c-danger);
  font-style: italic;
}

/* 插槽内容由父组件渲染，默认就带父组件的 data-v，所以父直接写 .slotted-item 也能命中；
   :slotted() 主要用在「子组件想给自己收到的插槽内容加样式」的场景 */
:slotted(.slotted-item) {
  background: rgba(59, 130, 246, 0.14);
  padding: 2px 6px;
  border-radius: 6px;
  color: var(--c-info);
}

/* ③ 动态 class 对应的样式 */
.box {
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  transition: all 0.2s;
}
.box.active {
  background: rgba(66, 184, 131, 0.14);
  border-color: var(--c-primary);
}
.box.error {
  background: rgba(229, 83, 75, 0.12);
  border-color: var(--c-danger);
}
.box.dark-box {
  color: #e6e8eb;
  background: #262a32;
}
.box.theme-dark {
  border-style: dashed;
}
</style>
