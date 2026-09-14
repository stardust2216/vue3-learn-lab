<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 3：盒模型（Box Model）
 *
 * 每个元素都是一个盒子，从里到外四层：content → padding → border → margin。
 * 最容易踩的两个坑：
 *   1) width 到底指哪一层？取决于 box-sizing（content-box / border-box）
 *   2) 垂直方向的相邻 margin 会「折叠」，不是相加
 */
const css = useStyleSource()

// ---------- ① 交互式盒模型 ----------
const box = reactive({
  width: 240,
  padding: 16,
  border: 4,
  boxSizing: 'content-box' as 'content-box' | 'border-box',
})
const inner = ref<HTMLElement | null>(null)
const measured = ref({ content: 0, padding: 0, border: 0, total: 0, outer: 0 })

/** 该元素最终在页面上占的尺寸（读真实计算值，不做数学推导，避免误人） */
function measure() {
  const el = inner.value
  if (!el) return
  const cs = getComputedStyle(el)
  const total = el.offsetWidth
  const border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)
  const padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  measured.value = {
    content: Number(cs.width.replace('px', '')) || total - padding - border,
    padding,
    border,
    total,
    outer: total,
  }
}

onMounted(() => nextTick(measure))
watch(() => [box.width, box.padding, box.border, box.boxSizing], () => nextTick(measure))

const boxStyle = computed(() => ({
  width: box.width + 'px',
  padding: box.padding + 'px',
  borderWidth: box.border + 'px',
  boxSizing: box.boxSizing,
}))

/** 公式说明：不同 box-sizing 下 width 的含义 */
const formula = computed(() =>
  box.boxSizing === 'content-box'
    ? `width(${box.width}) 只算内容区 → 实际占宽 = ${box.width} + padding×2(${box.padding * 2}) + border×2(${box.border * 2})`
    : `width(${box.width}) 已包含 padding 与 border → 内容区 = ${box.width} − ${box.padding * 2} − ${box.border * 2}`,
)

// ---------- ② 两个同宽元素对比 ----------
const cmpWidth = ref(240)
const cmpPadding = ref(20)
const cmpBorder = ref(6)

// ---------- ③ 外边距折叠 ----------
const marginA = ref(20)
const marginB = ref(30)
const useFlex = ref(false)
const collapseReport = computed(() =>
  useFlex.value
    ? `父级是 flex 容器 → 不折叠，间距 = ${marginA.value} + ${marginB.value} = ${marginA.value + marginB.value}px`
    : `普通块级流 → 折叠，间距 = max(${marginA.value}, ${marginB.value}) = ${Math.max(marginA.value, marginB.value)}px`,
)
</script>

<template>
  <div>
    <h1>3. 盒模型</h1>
    <p class="lead">
      盒模型是布局的地基。<strong>记住一句话：<code>box-sizing: border-box</code> 是几乎所有人的默认选择</strong> ——
      它让 <code>width</code> 表示「最终占多宽」，而不是「内容区多宽」。
    </p>

    <CssCard
      title="① 四层结构 + 实时测量"
      hint="拖动滑块改 padding / border / width，切换 box-sizing，右侧显示真实计算结果。"
      :source="css.rules('.bm-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="box.boxSizing">
          <option value="content-box">content-box</option>
          <option value="border-box">border-box</option>
        </select>
      </template>

      <div class="bm-controls">
        <label class="kv">width <input type="range" min="100" max="300" v-model.number="box.width" /> {{ box.width }}px</label>
        <label class="kv">padding <input type="range" min="0" max="40" v-model.number="box.padding" /> {{ box.padding }}px</label>
        <label class="kv">border <input type="range" min="0" max="20" v-model.number="box.border" /> {{ box.border }}px</label>
      </div>

      <!-- 四层可视化：margin 在最外，border 用实线画出来，padding 是内阴影感，content 是中心块 -->
      <div class="bm-margin-layer">
        <span class="bm-layer-label">margin（透明，只影响与其他元素的间距）</span>
        <div class="bm-border-layer" :style="{ borderWidth: box.border + 'px' }">
          <span class="bm-layer-label">border {{ box.border }}px</span>
          <div class="bm-padding-layer" :style="{ padding: box.padding + 'px' }">
            <span class="bm-layer-label">padding {{ box.padding }}px</span>
            <div ref="inner" class="bm-content-layer" :style="boxStyle">width: {{ box.width }}px</div>
          </div>
        </div>
      </div>

      <div class="bm-result">
        <p class="kv">{{ formula }}</p>
        <p class="kv">
          真实测量 → 内容区 {{ measured.content }}px ｜ padding 合计 {{ measured.padding }}px ｜
          border 合计 {{ measured.border }}px ｜ <b>最终占宽 {{ measured.total }}px</b>
        </p>
      </div>

      <pre class="code" style="margin-top: 10px">
/* 全局统一盒模型（几乎所有项目都会写这一行） */
*, *::before, *::after { box-sizing: border-box }

/* content-box（默认）：width = 内容区宽度 */
.box { width: 240px; padding: 16px; border: 4px solid }   /* 实际占 240+32+8 = 280px */

/* border-box：width = 内容 + padding + border */
.box { width: 240px; padding: 16px; border: 4px solid; box-sizing: border-box } /* 实际占 240px */</pre
      >
    </CssCard>

    <CssCard
      title="② 为什么一定要 border-box：两个 width:200px 的元素对不齐"
      hint="下面两个元素都写了同样的 width，只是 box-sizing 不同 —— 一眼看出问题。"
      :source="css.rules('.cmp-')"
      tone="warn"
    >
      <template #extra>
        <label class="kv">width <input type="range" min="120" max="260" v-model.number="cmpWidth" /></label>
        <label class="kv">padding <input type="range" min="0" max="30" v-model.number="cmpPadding" /></label>
        <label class="kv">border <input type="range" min="0" max="16" v-model.number="cmpBorder" /></label>
      </template>

      <div class="cmp-row">
        <div
          class="cmp-box cmp-content"
          :style="{ width: cmpWidth + 'px', padding: cmpPadding + 'px', borderWidth: cmpBorder + 'px' }"
        >
          content-box
        </div>
        <div
          class="cmp-box cmp-border"
          :style="{ width: cmpWidth + 'px', padding: cmpPadding + 'px', borderWidth: cmpBorder + 'px' }"
        >
          border-box
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        三个控制项同时作用于两个盒子：<b>content-box 会越撑越宽</b>，border-box 始终不变。
        这就是「明明写了同样宽度却对不齐」的根本原因。
      </p>
    </CssCard>

    <CssCard
      title="③ 外边距折叠（margin collapse）"
      hint="只发生在「普通块级流的垂直方向」。切换 flex 容器，折叠立刻消失。"
      :source="css.rules('.mc-')"
    >
      <template #extra>
        <label class="kv">A 下边距 <input type="range" min="0" max="40" v-model.number="marginA" /></label>
        <label class="kv">B 上边距 <input type="range" min="0" max="40" v-model.number="marginB" /></label>
        <label class="kv"><input type="checkbox" v-model="useFlex" /> 父级 display:flex</label>
      </template>

      <p class="kv">{{ collapseReport }}</p>
      <div class="mc-wrap" :class="{ 'mc-flex': useFlex }">
        <div class="mc-box" :style="{ marginBottom: marginA + 'px' }">A（margin-bottom: {{ marginA }}px）</div>
        <div class="mc-box" :style="{ marginTop: marginB + 'px' }">B（margin-top: {{ marginB }}px）</div>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>情况</th><th>结果</th></tr>
        </thead>
        <tbody>
          <tr><td>相邻兄弟的上下 margin</td><td>折叠 → 取较大值</td></tr>
          <tr><td>父元素的 margin-top 与首个子元素的 margin-top</td><td>折叠 → 看起来「父级被顶出去了」</td></tr>
          <tr><td>空元素（没有内容/高度/内边距/边框）</td><td>自己的上下 margin 也折叠</td></tr>
          <tr><td>父级是 flex / grid 容器，或加了 padding / border / overflow 非 visible</td><td>不折叠</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        工程建议：<b>layout 用 gap 代替 margin</b>（flex/grid 的 <code>gap</code> 不折叠、语义更清晰），
        margin 只负责「局部微调」。
      </p>
    </CssCard>

    <CssCard title="④ 盒模型速查表" tone="danger">
      <table>
        <thead>
          <tr><th>属性</th><th>能否为负</th><th>是否影响可点击区域</th><th>注意</th></tr>
        </thead>
        <tbody>
          <tr><td><code>width / height</code></td><td>否</td><td>是</td><td>含义受 box-sizing 影响</td></tr>
          <tr><td><code>padding</code></td><td>否</td><td>是</td><td>背景色会铺到 padding 上（border 以内）</td></tr>
          <tr><td><code>border</code></td><td>否</td><td>是</td><td>会撑大尺寸；可设 transparent 占位避免跳动</td></tr>
          <tr><td><code>margin</code></td><td><b>可以</b></td><td>否</td><td>点击区域不含 margin；垂直方向会折叠</td></tr>
          <tr><td><code>outline</code></td><td>否</td><td>否</td><td>不占空间、可跟随圆角（现代浏览器），适合 focus 态</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        最小可点击区域：移动端建议至少 44×44px，用 padding 撑开而不是写死 width/height，这样图标变大也不会挤压。
      </p>
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

/* ① 四层可视化 */
.bm-controls {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.bm-controls input[type='range'] {
  width: 120px;
  vertical-align: middle;
}
.bm-margin-layer {
  position: relative;
  border: 1px dashed var(--c-warn);
  border-radius: 10px;
  padding: 22px 12px 12px;
  background: repeating-linear-gradient(
    45deg,
    rgba(210, 153, 34, 0.09),
    rgba(210, 153, 34, 0.09) 6px,
    transparent 6px,
    transparent 12px
  );
}
.bm-border-layer {
  position: relative;
  border-style: solid;
  border-color: var(--c-info);
  border-radius: 6px;
  padding: 20px 10px 10px;
}
.bm-padding-layer {
  position: relative;
  background: rgba(66, 184, 131, 0.18);
  border-radius: 4px;
}
.bm-content-layer {
  background: var(--c-primary);
  color: #fff;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  text-align: center;
  font-family: var(--mono);
}
.bm-layer-label {
  position: absolute;
  top: 3px;
  left: 8px;
  font-size: 11px;
  color: var(--c-text-dim);
  font-family: var(--mono);
}
.bm-result {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--c-surface-2);
}

/* ② 对比 */
.cmp-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.cmp-box {
  border-style: solid;
  border-color: var(--c-danger);
  border-radius: 8px;
  background: rgba(229, 83, 75, 0.12);
  font-size: 12px;
  font-family: var(--mono);
  text-align: center;
}
.cmp-content {
  box-sizing: content-box;
}
.cmp-border {
  box-sizing: border-box;
}

/* ③ margin 折叠 */
.mc-wrap {
  padding: 6px 10px;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
  overflow: hidden;
}
.mc-flex {
  display: flex;
  flex-direction: column;
}
.mc-box {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--c-info);
  color: #fff;
  font-size: 13px;
}
</style>
