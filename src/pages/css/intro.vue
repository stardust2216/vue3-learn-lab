<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 1：CSS 是怎么工作的
 * - 三种引入方式：外部 / 内部 <style> / 行内 style（本模板只用「内部 + scoped」）
 * - 层叠（cascade）：同一元素被多条规则命中时，谁赢？
 * - 继承：哪些属性会自动传给子元素
 * - 初始值 / 浏览器默认样式
 *
 * 下面所有示例卡片里的「CSS 源码」都是从本页真实 <style scoped> 里提取的，
 * 你改了样式，展示的代码会跟着变 —— 不存在「文档和实现不一致」。
 */
const css = useStyleSource()

// ---------- 层叠演示：切换每个来源的开关，看最终生效的颜色 ----------
const useBrowserDefault = ref(true)
const useAuthorStyle = ref(true)
const useInlineStyle = ref(true)

/** 三层的优先级：浏览器默认 < 作者样式表 < 行内 style */
const winner = computed(() => {
  if (useInlineStyle.value) return '行内 style（1000 分，最强）'
  if (useAuthorStyle.value) return '作者样式表 .cascade-demo（0,1,0）'
  if (useBrowserDefault.value) return '浏览器默认样式（0 分，最弱）'
  return '没有任何规则命中 → 继承父级颜色'
})

// ---------- 权重演示 ----------
const target = ref<'.a' | '.a.b' | '#id' | '.a.b#id'>('.a')
const specificity = computed(() => {
  switch (target.value) {
    case '.a':
      return { digits: '0,1,0', score: 10, note: '一个类选择器' }
    case '.a.b':
      return { digits: '0,2,0', score: 20, note: '两个类选择器' }
    case '#id':
      return { digits: '1,0,0', score: 100, note: '一个 id 选择器' }
    default:
      return { digits: '1,2,0', score: 120, note: 'id 一旦出现就压倒所有类' }
  }
})
</script>

<template>
  <div>
    <h1>1. CSS 是怎么工作的</h1>
    <p class="lead">
      CSS 的本质只有一句话：<strong>给元素找匹配的规则，按优先级挑出赢家，再把声明应用上去</strong>。
      搞懂「层叠 + 优先级 + 继承」这三件事，80% 的「样式不生效」都会自己解释清楚。
    </p>

    <CssCard
      title="① 三种引入方式"
      hint="真实项目里最常见的是「外部样式表 + 构建工具」；行内 style 优先级最高，也最难维护。"
      :source="
        [
          '/* 1) 外部样式表：最常用，可缓存、可复用 */',
          '<link rel=&quot;stylesheet&quot; href=&quot;/styles/main.css&quot;>',
          '',
          '/* 2) 内部样式表：写在 HTML 的 <style> 里（Vue 的 <style scoped> 就是这种） */',
          '<style> .box { color: red } </style>',
          '',
          '/* 3) 行内样式：优先级最高，通常只用于「运行时计算出来的值」 */',
          '<div style=&quot;color: red&quot;>',
        ].join('\n')
      "
      html="<p class=&quot;demo-inline&quot;>① 外部/内部样式表：.demo-inline { color: var(--c-info) }</p>
<p style=&quot;color: var(--c-danger)&quot;>② 行内 style：优先级高于所有选择器</p>"
    >
      <p class="demo-inline">① 外部/内部样式表：.demo-inline 生效</p>
      <p style="color: var(--c-danger)">② 行内 style：优先级高于所有选择器</p>
      <p class="hint" style="margin: 8px 0 0">
        第三方库覆盖不了你的样式时，先看对方是不是用了行内 style 或 <code>!important</code>。
      </p>
    </CssCard>

    <CssCard
      title="② 层叠：同一属性被多条规则命中，谁赢？"
      hint="打开/关闭下面三层来源，观察文字颜色由谁决定。"
      :source="css.rules('.cascade-demo')"
      tone="ok"
    >
      <template #extra>
        <label class="kv"><input type="checkbox" v-model="useBrowserDefault" /> 浏览器默认</label>
        <label class="kv"><input type="checkbox" v-model="useAuthorStyle" /> 作者样式表</label>
        <label class="kv"><input type="checkbox" v-model="useInlineStyle" /> 行内 style</label>
      </template>

      <!-- 这三层用 class 控制，等价于「三份样式表按优先级竞争」 -->
      <p
        class="cascade-demo"
        :style="{
          color: useInlineStyle ? 'var(--c-danger)' : undefined,
          fontStyle: useBrowserDefault ? undefined : 'normal',
          fontWeight: useBrowserDefault ? undefined : 600,
        }"
        :class="{ 'cascade-author': useAuthorStyle }"
      >
        这段话的颜色由「{{ winner }}」决定
      </p>

      <ol class="steps">
        <li><b>来源与重要性</b>：浏览器默认 &lt; 作者样式 &lt; 行内 style &lt; <code>!important</code></li>
        <li><b>选择器权重</b>：id &gt; class/属性/伪类 &gt; 标签/伪元素（权重相同才比下一项）</li>
        <li><b>书写顺序</b>：前两项完全相同时，<b>后写的赢</b>（这就是「层叠」的字面意思）</li>
        <li><b>继承</b>：都没有命中时，才轮到从父元素继承来的值</li>
      </ol>
    </CssCard>

    <CssCard
      title="③ 选择器权重（specificity）是怎么算的"
      hint="权重是三个数字 (id, class, 标签)，不是十进制；比较时从高位开始逐位比。"
      :source="css.rules('.spec-')"
    >
      <template #extra>
        <select v-model="target">
          <option value=".a">.a</option>
          <option value=".a.b">.a.b</option>
          <option value="#id">#id</option>
          <option value=".a.b#id">.a.b#id</option>
        </select>
      </template>

      <div class="spec-row">
        <span class="spec-tag" :class="target">当前选择器：{{ target }}</span>
        <span class="tag pass">权重 = ({{ specificity.digits }})</span>
        <span class="kv">{{ specificity.note }}</span>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr>
            <th>写法</th>
            <th>权重 (id, class, 标签)</th>
            <th>记忆点</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>*</code></td><td>(0,0,0)</td><td>通配符不贡献权重</td></tr>
          <tr><td><code>div</code> / <code>::before</code></td><td>(0,0,1)</td><td>标签与伪元素同级</td></tr>
          <tr><td><code>.a</code> / <code>[type]</code> / <code>:hover</code></td><td>(0,1,0)</td><td>类、属性、伪类同级</td></tr>
          <tr><td><code>#id</code></td><td>(1,0,0)</td><td>一个 id 压倒任意多个 class</td></tr>
          <tr><td><code>style="..."</code></td><td>—</td><td>行内，比任何选择器都高（除 !important）</td></tr>
          <tr><td><code>!important</code></td><td>—</td><td>最高，但会让后续维护变成猜谜，慎用</td></tr>
          <tr><td><code>:is()</code> / <code>:where()</code></td><td>取最高 / 恒为 0</td><td><code>:where()</code> 常用于「可被覆盖的基础样式」</td></tr>
        </tbody>
      </table>
    </CssCard>

    <CssCard
      title="④ 继承：哪些属性会自动传给子元素"
      hint="文字相关属性默认继承；盒模型相关属性默认不继承。"
      :source="css.rules('.inherit-')"
      tone="warn"
    >
      <div class="inherit-parent">
        父元素设了 <code>color</code> / <code>font-size</code> / <code>border</code>
        <p class="inherit-child">我是子元素：color 和 font-size 继承了，但 border 没有</p>
        <p class="inherit-child inherit-explicit">
          我显式写了 <code>border: inherit</code>，于是边框也拿过来了
        </p>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr>
            <th>默认继承</th>
            <th>默认不继承</th>
            <th>强制控制</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>color、font-*、line-height、letter-spacing、text-align、visibility、cursor</td>
            <td>width/height、margin、padding、border、background、display、position</td>
            <td>
              <code>inherit</code> / <code>initial</code> / <code>unset</code> / <code>revert</code>
            </td>
          </tr>
        </tbody>
      </table>
    </CssCard>

    <CssCard title="⑤ 排查「样式不生效」的四步法" tone="danger">
      <ol class="steps">
        <li>打开 DevTools → Elements → Styles，看这条声明是<b>被划掉</b>（输了）还是<b>根本没出现</b>（选择器没匹配上）。</li>
        <li>没出现 → 检查选择器拼写、类名是否真的加上了、样式文件有没有加载（Network 面板看 404）。</li>
        <li>被划掉 → 鼠标悬停看是谁赢了；往上找更高权重的规则或 <code>!important</code>。</li>
        <li>还是不生效 → 检查属性是否写错/单位缺失/值不合法（DevTools 会把它标成灰色或直接丢弃）。</li>
      </ol>
      <p class="hint" style="margin-top: 8px">
        小技巧：在 DevTools 的 Styles 面板顶部 <code>element.style</code> 区域临时写属性，
        可以立刻验证「是不是这个属性起作用」，比改代码刷新快得多。
      </p>
    </CssCard>
  </div>
</template>

<style scoped>
.lead {
  color: var(--c-text-dim);
  margin-top: -4px;
}
code {
  background: var(--c-surface-2);
  padding: 1px 5px;
  border-radius: 5px;
}
h1 {
  font-size: 22px;
}

/* ① 引入方式 */
.demo-inline {
  color: var(--c-info);
  margin: 4px 0;
}

/* ② 层叠 */
.cascade-demo {
  margin: 4px 0 10px;
  /* 浏览器默认样式：italic + 常规字重 */
  font-style: italic;
  font-weight: 400;
}
.cascade-demo.cascade-author {
  /* 作者样式表：权重 (0,1,0) */
  color: var(--c-primary-dark);
  font-weight: 600;
}

/* ③ 权重 */
.spec-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.spec-tag {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--c-surface-2);
  font-family: var(--mono);
  font-size: 12.5px;
}

/* ④ 继承 */
.inherit-parent {
  color: var(--c-primary-dark);
  font-size: 15px;
  border: 2px dashed var(--c-info);
  border-radius: 8px;
  padding: 10px 12px;
}
.inherit-child {
  font-size: 13px;
  margin: 6px 0 0;
}
.inherit-explicit {
  border: inherit;
  border-radius: inherit;
  padding: inherit;
}

/* 通用 */
.steps {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.75;
}
</style>
