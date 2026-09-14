<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 2：选择器与权重
 * - 基础选择器：标签 / 类 / id / 通配 / 属性 / 分组
 * - 组合器：后代 / 子代 / 相邻兄弟 / 通用兄弟
 * - 伪类与伪元素：:hover :nth-child() :not() ::before ::after
 * - :is() / :where() / :has() 这三个现代选择器的实际用途
 */
const css = useStyleSource()

// ---------- 组合器演示 ----------
const combinator = ref<'descendant' | 'child' | 'adjacent' | 'sibling' | 'none'>('none')
const combinatorLabel = computed(
  () =>
    ({
      none: '不选任何组合器（只看颜色对比）',
      descendant: '空格 = 后代（所有层级的 li 都会被选中）',
      child: '> = 子代（只选中直接子级）',
      adjacent: '+ = 相邻兄弟（紧挨着的下一个）',
      sibling: '~ = 通用兄弟（后面的所有同级）',
    })[combinator.value],
)

// ---------- 伪类：nth-child 公式 ----------
const nthFormula = ref('2n+1')
const nthDesc = computed(() => {
  const map: Record<string, string> = {
    '2n+1': '奇数行（= odd）',
    '2n': '偶数行（= even）',
    '3n': '每 3 个选 1 个',
    '-n+3': '前 3 个',
    'n+4': '第 4 个开始全部',
  }
  return map[nthFormula.value] ?? ''
})
/** 静态 class（scoped 样式里要用静态类名，动态拼出来的类不会带上作用域属性） */
const nthClass = computed(
  () =>
    ({
      '2n+1': 'nth-odd',
      '2n': 'nth-even',
      '3n': 'nth-third',
      '-n+3': 'nth-first3',
      'n+4': 'nth-from4',
    })[nthFormula.value] ?? 'nth-odd',
)

// ---------- :has() 演示 ----------
const withBadge = ref(true)
</script>

<template>
  <div>
    <h1>2. 选择器与权重</h1>
    <p class="lead">
      选择器是 CSS 的「定位系统」。这一页把常用选择器按「基础 → 组合 → 伪类 → 现代函数式」四层过一遍，
      每个都配一个能点的示例；权重在上一页已经讲过计算规则，这里重点是<strong>怎么写得更稳</strong>。
    </p>

    <CssCard
      title="① 基础选择器与属性选择器"
      hint="四种属性匹配方式：存在、精确、前缀、包含。表单/图标库大量使用它们。"
      :source="css.rules('.sel-')"
      html="<p class=&quot;sel-class&quot;>类选择器</p>
<input class=&quot;sel-input&quot; type=&quot;text&quot; placeholder=&quot;属性选择器命中我&quot; />
<a class=&quot;sel-link&quot; href=&quot;https://example.com&quot; target=&quot;_blank&quot;>外链（[target] 命中）</a>"
    >
      <p id="sel-id" class="sel-class">我是 .sel-class（类选择器，最常用）</p>
      <p class="sel-tag-demo">我是 p 标签选择器命中的段落</p>
      <input class="sel-input" type="text" placeholder="属性选择器 [type='text'] 命中我" />
      <a class="sel-link" href="https://example.com" target="_blank">外链 —— [target] 属性选择器会命中</a>
      <p class="sel-attr-contains" data-role="field-text">data-role 包含 "text"，[data-role*='text'] 命中</p>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>写法</th><th>含义</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>p</code></td><td>标签</td><td>重置默认样式</td></tr>
          <tr><td><code>.card</code></td><td>类（最推荐）</td><td>组件样式，可复用、权重低</td></tr>
          <tr><td><code>#app</code></td><td>id</td><td>唯一挂载点，权重高，业务样式里少用</td></tr>
          <tr><td><code>[disabled]</code></td><td>属性存在</td><td>表单状态</td></tr>
          <tr><td><code>[type='text']</code></td><td>属性精确匹配</td><td>按类型区分输入框</td></tr>
          <tr><td><code>[href^='https']</code></td><td>前缀 / 后缀 <code>$=</code></td><td>外链图标、文件类型图标</td></tr>
          <tr><td><code>[data-role*='text']</code></td><td>包含</td><td>语义化分组</td></tr>
        </tbody>
      </table>
    </CssCard>

    <CssCard
      title="② 组合器：后代 / 子代 / 兄弟"
      hint="切换下拉框，被选中的项会高亮。注意「后代」和「子代」的差别。"
      :source="css.rules('.comb-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="combinator">
          <option value="none">不选</option>
          <option value="descendant">后代（空格）</option>
          <option value="child">&gt; 子代</option>
          <option value="adjacent">+ 相邻兄弟</option>
          <option value="sibling">~ 通用兄弟</option>
        </select>
      </template>

      <p class="kv">{{ combinatorLabel }}</p>
      <ul class="comb-list" :class="'comb-' + combinator">
        <li>第一项</li>
        <li>
          第二项
          <ul>
            <li>第二项的子项（后代能选中，子代选不中）</li>
            <li>第二项的另一个子项</li>
          </ul>
        </li>
        <li>第三项</li>
        <li>第四项</li>
      </ul>

      <pre class="code" style="margin-top: 10px">
.comb-list li          /* 后代：列表里所有层级的 li */
.comb-list > li        /* 子代：只是直接子级的 li */
.comb-list li + li     /* 相邻兄弟：每个 li 后面紧挨着的那一个 */
.comb-list li ~ li     /* 通用兄弟：每个 li 后面的所有同级 li */</pre
      >
    </CssCard>

    <CssCard
      title="③ 伪类：nth-child 公式"
      hint="公式 an+b：a 是步长，b 是偏移，n 从 0 开始。切换试试。"
      :source="css.rules('.nth-')"
    >
      <template #extra>
        <select v-model="nthFormula">
          <option value="2n+1">2n+1</option>
          <option value="2n">2n</option>
          <option value="3n">3n</option>
          <option value="-n+3">-n+3</option>
          <option value="n+4">n+4</option>
        </select>
      </template>

      <p class="kv">li:nth-child({{ nthFormula }}) → {{ nthDesc }}</p>
      <ul class="nth-list" :class="nthClass">
        <li v-for="n in 8" :key="n">第 {{ n }} 行</li>
      </ul>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>伪类</th><th>作用</th><th>示例</th></tr>
        </thead>
        <tbody>
          <tr><td><code>:hover</code> / <code>:focus</code> / <code>:active</code></td><td>交互状态</td><td>按钮悬停、输入框聚焦</td></tr>
          <tr><td><code>:first-child</code> / <code>:last-child</code></td><td>首尾元素</td><td>去掉列表最后一条的分隔线</td></tr>
          <tr><td><code>:nth-child(an+b)</code></td><td>按位置选</td><td>斑马纹、每 3 个换行</td></tr>
          <tr><td><code>:not(.x)</code></td><td>排除</td><td>给除禁用项之外的所有项加样式</td></tr>
          <tr><td><code>:disabled</code> / <code>:checked</code> / <code>:required</code></td><td>表单状态</td><td>不写 JS 也能有交互反馈</td></tr>
          <tr><td><code>::before</code> / <code>::after</code></td><td>伪元素（生成内容）</td><td>图标、角标、清除浮动、装饰线</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        记忆点：<b>伪类选状态，伪元素造内容</b>。伪元素必须写 <code>content</code>（可以是空字符串）。
      </p>
    </CssCard>

    <CssCard
      title="④ 伪元素：::before / ::after 造装饰"
      hint="它们不改变 DOM，只是渲染层的装饰 —— 所以别用它承载重要内容（无障碍读屏读不到）。"
      :source="css.rules('.pe-')"
      html="<p class=&quot;pe-quote&quot;>只用 CSS 生成引号与下划线</p>
<span class=&quot;pe-badge&quot;>消息</span>"
      tone="ok"
    >
      <p class="pe-quote">只用 CSS 生成引号与下划线</p>
      <span class="pe-badge">消息</span>
      <div class="pe-tooltip-host">
        悬停我看提示
        <span class="pe-tooltip">我是 ::after 生成的 tooltip</span>
      </div>
    </CssCard>

    <CssCard
      title="⑤ 现代函数式选择器：:is() / :where() / :has()"
      hint="这一组让「父选择器」和「简化长选择器」变成现实。"
      :source="css.rules('.modern-')"
      tone="ok"
    >
      <template #extra>
        <label class="kv"><input type="checkbox" v-model="withBadge" /> 卡片里放一个角标</label>
      </template>

      <div class="modern-grid">
        <article class="modern-card" :class="{ 'has-badge': withBadge }">
          <span v-if="withBadge" class="modern-badge">NEW</span>
          <h4>卡片标题</h4>
          <p class="kv">父级用 :has(.modern-badge) 检测到我里面有角标，于是加了外发光</p>
        </article>
        <article class="modern-card">
          <h4>普通卡片</h4>
          <p class="kv">没有角标，所以没有外发光</p>
        </article>
      </div>

      <pre class="code" style="margin-top: 10px">
/* :is() 简化「一堆选择器都要同一套样式」的写法，权重取其中最高的那个 */
:is(h1, h2, h3, .title) { margin: 0 0 .5em }

/* :where() 和 :is() 一样，但权重恒为 0 —— 适合做「容易被覆盖」的基础样式 */
:where(.card, .panel) { padding: 16px }

/* :has() 是「父选择器」：选中「内部含有某个元素的元素」 */
.modern-card:has(.modern-badge) { box-shadow: 0 0 0 2px var(--c-primary) }

/* 组合起来很好用：表单里有错误提示的输入框变红 */
.field:has(input:invalid) { border-color: var(--c-danger) }</pre
      >
    </CssCard>

    <CssCard title="⑥ 选择器书写建议" tone="warn">
      <ul class="tips">
        <li><b>优先用类选择器</b>：权重低（0,1,0）好覆盖，语义清晰，不依赖 DOM 结构。</li>
        <li><b>少用 id 与标签选择器写业务样式</b>：一个 id 就把权重抬到 (1,0,0)，之后只能靠 <code>!important</code> 打架。</li>
        <li><b>别写超长后代链</b>（如 <code>.a .b .c .d li span</code>）：DOM 一动就失效，且权重虚高。</li>
        <li><b>需要「就近覆盖」时用 <code>:where()</code> 包一层</b>，把权重压回 0。</li>
        <li><b>命名用 BEM 或组件前缀</b>（<code>.card__title--active</code>）：避免全局撞名，配合 scoped 更稳。</li>
      </ul>
    </CssCard>
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
.tips {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
}

/* ① 基础与属性选择器 */
.sel-class {
  color: var(--c-primary-dark);
  margin: 4px 0;
}
.sel-tag-demo {
  margin: 4px 0;
  padding-left: 8px;
  border-left: 3px solid var(--c-warn);
}
.sel-input {
  margin: 4px 0;
  width: 100%;
}
.sel-input[type='text'] {
  border-color: var(--c-info);
  background: rgba(59, 130, 246, 0.06);
}
.sel-link[target]::after {
  content: ' ↗';
  color: var(--c-info);
}
.sel-attr-contains[data-role*='text'] {
  background: rgba(210, 153, 34, 0.14);
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-block;
}

/* ② 组合器 */
.comb-list {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 13px;
}
.comb-list ul {
  padding-left: 20px;
  color: var(--c-text-dim);
}
.comb-descendant li {
  color: var(--c-primary-dark);
  font-weight: 600;
}
.comb-child > li {
  color: var(--c-info);
  font-weight: 600;
}
.comb-adjacent li + li {
  background: rgba(66, 184, 131, 0.16);
}
.comb-sibling li ~ li {
  background: rgba(59, 130, 246, 0.14);
}

/* ③ nth-child */
.nth-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}
.nth-list li {
  padding: 3px 10px;
  border-bottom: 1px solid var(--c-border);
}
/* ③ nth-child：五个公式各对应一套静态 class（动态拼接的类名不会带 scoped 属性） */
.nth-odd li:nth-child(2n + 1),
.nth-even li:nth-child(2n),
.nth-third li:nth-child(3n),
.nth-first3 li:nth-child(-n + 3),
.nth-from4 li:nth-child(n + 4) {
  background: rgba(66, 184, 131, 0.16);
  font-weight: 600;
}

/* ④ 伪元素 */
.pe-quote {
  position: relative;
  margin: 4px 0 14px;
  padding-left: 22px;
  font-size: 15px;
}
.pe-quote::before {
  content: '“';
  position: absolute;
  left: 0;
  top: -6px;
  font-size: 34px;
  color: var(--c-primary);
  line-height: 1;
}
.pe-quote::after {
  content: '';
  display: block;
  width: 120px;
  height: 3px;
  margin-top: 6px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--c-primary), transparent);
}
.pe-badge {
  position: relative;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
}
.pe-badge::after {
  content: '3';
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--c-danger);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  padding: 0 4px;
}
.pe-tooltip-host {
  position: relative;
  display: inline-block;
  margin-left: 20px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px dashed var(--c-info);
  cursor: help;
  font-size: 13px;
}
.pe-tooltip {
  position: absolute;
  left: 0;
  bottom: 130%;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--c-accent);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.18s;
  pointer-events: none;
}
.pe-tooltip-host:hover .pe-tooltip {
  opacity: 1;
}

/* ⑤ 现代选择器 */
.modern-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.modern-card {
  position: relative;
  padding: 12px 14px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-surface-2);
  transition: box-shadow 0.2s;
}
.modern-card h4 {
  margin: 0 0 4px;
  font-size: 14px;
}
.modern-card:has(.modern-badge) {
  box-shadow: 0 0 0 2px var(--c-primary);
}
.modern-badge {
  position: absolute;
  top: -9px;
  right: 10px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--c-danger);
  color: #fff;
  font-size: 11px;
}
</style>
