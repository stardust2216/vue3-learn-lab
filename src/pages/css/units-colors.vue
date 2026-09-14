<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 4：单位、颜色与函数
 * - 长度单位：px / em / rem / % / vw / vh / ch —— 什么时候用哪个
 * - 颜色写法：关键词 / hex / rgb / hsl / oklch + 透明度
 * - 数学函数：calc() / clamp() / min() / max()
 */
const css = useStyleSource()

// ---------- ① em 与 rem 的相对性 ----------
const rootSize = ref(16)
const parentSize = ref(20)
const useRem = ref(false)
const emPreview = computed(() => (useRem.value ? '1rem' : '1em'))
const pxPerUnit = computed(() => (useRem.value ? rootSize.value : parentSize.value))

// ---------- ② clamp 流体字号 ----------
const clampMin = ref(14)
const clampMax = ref(26)
const clampViewport = ref(60)
const clampSize = computed(
  () => `clamp(${clampMin.value}px, ${clampViewport.value / 10}vw + 8px, ${clampMax.value}px)`,
)
const clampStyle = computed(() => ({ fontSize: clampSize.value }))

// ---------- ③ 颜色格式 ----------
const hue = ref(200)
const sat = ref(70)
const light = ref(50)
const alpha = ref(0.85)
const swatches = computed(() => [
  { name: '关键词', value: 'rebeccapurple', css: 'rebeccapurple' },
  { name: 'hex', value: '#42b883', css: '#42b883' },
  { name: 'hex + alpha', value: '#42b88380', css: '#42b88380' },
  { name: 'rgb()', value: `rgb(${Math.round(hue.value * 2.55)} 120 80)`, css: `rgb(${Math.round(hue.value * 2.55)} 120 80)` },
  { name: 'hsl()', value: `hsl(${hue.value} ${sat.value}% ${light.value}%)`, css: `hsl(${hue.value} ${sat.value}% ${light.value}%)` },
  { name: 'hsl + alpha', value: `hsl(${hue.value} ${sat.value}% ${light.value}% / ${alpha.value})`, css: `hsl(${hue.value} ${sat.value}% ${light.value}% / ${alpha.value})` },
  { name: 'oklch()', value: `oklch(60% 0.15 ${hue.value})`, css: `oklch(60% 0.15 ${hue.value})` },
  { name: 'color-mix()', value: `color-mix(in srgb, var(--c-primary) ${100 - hue.value / 4}%, var(--c-info))`, css: `color-mix(in srgb, var(--c-primary) ${100 - hue.value / 4}%, var(--c-info))` },
])

// ---------- ④ 计算函数 ----------
const asideWidth = ref(220)
const gapValue = ref(20)
</script>

<template>
  <div>
    <h1>4. 单位、颜色与函数</h1>
    <p class="lead">
      单位选择的核心问题只有一个：<strong>这个尺寸应该随「谁的」变化而变？</strong>
      跟着根字体变用 <code>rem</code>，跟着父级字体变用 <code>em</code>，跟着视口变用
      <code>vw/vh</code>，都不要就用 <code>px</code>。
    </p>

    <CssCard
      title="① px / em / rem / % / vw / ch 对照"
      hint="切换 em 与 rem，观察下面同一段文字的大小：em 跟父级，rem 跟根元素。"
      :source="css.rules('.unit-')"
      html="<div class=&quot;unit-parent&quot; style=&quot;font-size: 20px&quot;>
  <p class=&quot;unit-em&quot;>1em 段落</p>
</div>"
    >
      <template #extra>
        <label class="kv">根字号 <input type="range" min="12" max="22" v-model.number="rootSize" /></label>
        <label class="kv">父级字号 <input type="range" min="12" max="28" v-model.number="parentSize" /></label>
        <label class="kv"><input type="checkbox" v-model="useRem" /> 用 rem</label>
      </template>

      <div class="unit-stage" :style="{ fontSize: parentSize + 'px', '--root-font': rootSize + 'px' }">
        <p class="kv">当前：1{{ useRem ? 'rem' : 'em' }} = {{ pxPerUnit }}px（{{ useRem ? '根元素' : '父元素' }}字号）</p>
        <p class="unit-item" :style="{ fontSize: emPreview }">
          我是 {{ emPreview }} 的文字（{{ pxPerUnit }}px）
        </p>
        <div class="unit-nested" :style="{ fontSize: emPreview }">
          我用 {{ emPreview }} 做内边距
          <div class="unit-nested" :style="{ fontSize: emPreview }">
            <b>嵌套的 em 会连乘</b>：每层都相对上一层，所以容易失控；rem 不会。
          </div>
        </div>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>单位</th><th>相对谁</th><th>适合</th><th>坑</th></tr>
        </thead>
        <tbody>
          <tr><td><code>px</code></td><td>绝对像素</td><td>边框、阴影、固定尺寸</td><td>不随字号缩放，无障碍放大时体验差</td></tr>
          <tr><td><code>em</code></td><td>当前元素 font-size</td><td>组件的内边距/圆角（跟字号成比例）</td><td>嵌套连乘，难预测</td></tr>
          <tr><td><code>rem</code></td><td>根元素 font-size</td><td>字号、间距体系（推荐主力单位）</td><td>根字号被用户改过时要保证布局不崩</td></tr>
          <tr><td><code>%</code></td><td>父级对应尺寸</td><td>宽度、流体布局</td><td>height 的百分比要求父级有确定高度</td></tr>
          <tr><td><code>vw / vh</code></td><td>视口宽 / 高</td><td>全屏区域、流体字号</td><td>移动端 <code>100vh</code> 会被地址栏顶掉，用 <code>dvh/svh</code></td></tr>
          <tr><td><code>ch</code></td><td>"0" 字符宽度</td><td>限制阅读行宽（如 <code>max-width: 65ch</code>）</td><td>等宽字体下更准</td></tr>
          <tr><td><code>fr</code> / <code>min-content</code> / <code>fit-content</code></td><td>容器分配</td><td>Grid / Flex 布局</td><td>见后面 Grid 一页</td></tr>
        </tbody>
      </table>
    </CssCard>

    <CssCard
      title="② clamp() 流体字号：一行代码替代媒体查询"
      hint="clamp(最小值, 理想值, 最大值) —— 浏览器自动在区间内插值。拖动滑块看文字变化。"
      :source="css.rules('.clamp-')"
      tone="ok"
    >
      <template #extra>
        <label class="kv">min <input type="range" min="10" max="20" v-model.number="clampMin" /> {{ clampMin }}px</label>
        <label class="kv">max <input type="range" min="18" max="40" v-model.number="clampMax" /> {{ clampMax }}px</label>
        <label class="kv">流体系数 <input type="range" min="10" max="120" v-model.number="clampViewport" /></label>
      </template>

      <p class="kv">font-size: {{ clampSize }}</p>
      <p class="clamp-demo" :style="clampStyle">标题会跟着视口宽度平滑缩放</p>

      <pre class="code" style="margin-top: 10px">
/* 标题：小屏最小 20px，大屏最大 40px，中间跟着视口走 */
h1 { font-size: clamp(1.25rem, 2vw + 1rem, 2.5rem) }

/* 容器宽度：至少 320px，最多 1200px，理想是 90% */
.wrap { width: clamp(320px, 90%, 1200px) }

/* 组合 min()/max()：取两者中的更大/更小者 */
.sidebar { width: max(200px, 20%) }
.content { width: min(100% - 32px, 900px) }</pre
      >
      <p class="hint" style="margin-top: 8px">
        注意：<code>clamp()</code> 里的理想值必须能算出长度；<code>2vw + 1rem</code> 这种混合运算要写在
        <code>calc()</code> 里，但 clamp/min/max 内部可以省略 <code>calc()</code> 直接写算式。
      </p>
    </CssCard>

    <CssCard title="③ 颜色的所有写法（拖动色相看实时效果）" hint="现代写法支持空格分隔与 / 透明度，读起来比逗号版更清楚。" :source="css.rules('.sw-')">
      <template #extra>
        <label class="kv">色相 <input type="range" min="0" max="360" v-model.number="hue" /> {{ hue }}</label>
        <label class="kv">饱和 <input type="range" min="0" max="100" v-model.number="sat" />%</label>
        <label class="kv">亮度 <input type="range" min="10" max="90" v-model.number="light" />%</label>
        <label class="kv">α <input type="range" min="10" max="100" v-model.number="alpha" /></label>
      </template>

      <div class="sw-grid">
        <div v-for="s in swatches" :key="s.name" class="sw-item">
          <div class="sw-chip" :style="{ background: s.css }" />
          <div class="sw-meta">
            <b>{{ s.name }}</b>
            <code>{{ s.value }}</code>
          </div>
        </div>
      </div>

      <table style="margin-top: 12px">
        <thead>
          <tr><th>写法</th><th>示例</th><th>适合</th></tr>
        </thead>
        <tbody>
          <tr><td>关键词</td><td><code>red</code>、<code>transparent</code>、<code>currentColor</code></td><td>快速原型；<code>currentColor</code> 让边框/图标跟随文字色</td></tr>
          <tr><td>hex</td><td><code>#42b883</code> / <code>#42b88380</code></td><td>设计稿复制，最常用</td></tr>
          <tr><td>rgb / rgba</td><td><code>rgb(66 184 131 / 50%)</code></td><td>需要动态计算通道值时</td></tr>
          <tr><td>hsl</td><td><code>hsl(152 47% 49%)</code></td><td>「同色系调明暗」最直观</td></tr>
          <tr><td>oklch / lab</td><td><code>oklch(60% 0.15 152)</code></td><td>感知均匀，做配色系统/渐变更自然</td></tr>
          <tr><td>color-mix()</td><td><code>color-mix(in srgb, red 50%, blue)</code></td><td>混合两个颜色，配合 CSS 变量做主题派生色</td></tr>
        </tbody>
      </table>
    </CssCard>

    <CssCard
      title="④ calc()：让「混合单位」参与计算"
      hint="calc 里可以有空格、可以混单位、可以嵌套变量 —— 这是布局里最常用的函数。"
      :source="css.rules('.calc-')"
      tone="ok"
    >
      <template #extra>
        <label class="kv">侧栏 <input type="range" min="120" max="320" v-model.number="asideWidth" /> {{ asideWidth }}px</label>
        <label class="kv">gap <input type="range" min="0" max="60" v-model.number="gapValue" /> {{ gapValue }}px</label>
      </template>

      <div class="calc-wrap" :style="{ gap: gapValue + 'px' }">
        <div class="calc-aside" :style="{ width: asideWidth + 'px' }">侧栏 {{ asideWidth }}px</div>
        <div class="calc-main">主区域：width: calc(100% - {{ asideWidth }}px - {{ gapValue }}px)</div>
      </div>

      <pre class="code" style="margin-top: 10px">
/* 注意：+ - 两侧必须有空格，* / 不需要 */
width: calc(100% - 240px - 1.5rem)
height: calc(100dvh - 64px)          /* 减去固定顶栏 */
font-size: calc(1rem + 0.5vw)
padding: calc(var(--space) * 1.5)    /* 和 CSS 变量配合最香 */

/* 算术函数可嵌套 */
grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr))</pre
      >
    </CssCard>

    <CssCard title="⑤ 单位选择决策树" tone="warn">
      <ol class="tree-steps">
        <li>这个尺寸需要随用户调大字号而变大吗？→ <b>用 rem</b>（间距、字号）。</li>
        <li>需要随视口宽度平滑变化吗？→ <b>clamp() + vw</b>。</li>
        <li>需要跟所在组件的字号成比例吗（如按钮内边距）？→ <b>用 em</b>。</li>
        <li>是边框、阴影、1px 细线、固定图标吗？→ <b>用 px</b>。</li>
        <li>是「剩余空间」或「比例关系」吗？→ <b>Flex/Grid 的 fr 与 gap</b>，别用百分比硬算。</li>
      </ol>
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
input[type='range'] {
  width: 110px;
  vertical-align: middle;
}

/* ① 单位 */
.unit-stage {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--c-surface-2);
  font-size: var(--root-font, 16px);
}
.unit-item {
  margin: 6px 0;
  background: rgba(66, 184, 131, 0.16);
  border-radius: 6px;
  padding: 6px 10px;
}
.unit-nested {
  padding: 1em;
  margin-top: 6px;
  border: 1px dashed var(--c-info);
  border-radius: 8px;
  font-size: 1em;
}

/* ② clamp */
.clamp-demo {
  margin: 4px 0 0;
  font-weight: 700;
  line-height: 1.2;
  color: var(--c-primary-dark);
}

/* ③ 颜色 */
.sw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.sw-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
}
.sw-chip {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  flex: 0 0 38px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.sw-meta {
  min-width: 0;
  font-size: 12px;
}
.sw-meta b {
  display: block;
  font-size: 12.5px;
}
.sw-meta code {
  display: block;
  font-size: 11px;
  color: var(--c-text-dim);
  word-break: break-all;
  background: none;
  padding: 0;
}

/* ④ calc */
.calc-wrap {
  display: flex;
  align-items: stretch;
}
.calc-aside {
  flex: 0 0 auto;
  padding: 12px;
  border-radius: 8px;
  background: var(--c-info);
  color: #fff;
  font-size: 12.5px;
}
.calc-main {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  background: rgba(66, 184, 131, 0.16);
  border: 1px dashed var(--c-primary);
  font-size: 12.5px;
}

.tree-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.85;
}
</style>
