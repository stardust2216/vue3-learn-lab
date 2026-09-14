<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 8：Flexbox 弹性布局
 *
 * 核心心智模型（把这两步分开想，几乎所有 Flex 问题都能推出来）：
 *   1) 先定「主轴」：flex-direction 决定主轴是水平还是垂直。
 *   2) 主轴上的空间分配：先按 flex-basis 放好基准尺寸，
 *      多出来的空间给 flex-grow，不够的空间由 flex-shrink（按 basis 加权）承担。
 *   3) 交叉轴上的对齐：单行看 align-items / align-self，多行看 align-content。
 *
 * 注意：justify-content 永远管主轴、align-items 永远管交叉轴，
 * 所以 flex-direction 一变，这两个属性「看起来」就换了方向 —— 不是它们变了，是轴变了。
 */
const css = useStyleSource()

// ---------- ① 主轴 / 交叉轴 ----------
const dir = ref<'row' | 'row-reverse' | 'column' | 'column-reverse'>('row')
const wrap = ref(true)

const dirStageStyle = computed(() => ({
  flexDirection: dir.value,
  flexWrap: wrap.value ? ('wrap' as const) : ('nowrap' as const),
}))

const axisText = computed(() =>
  dir.value.startsWith('column')
    ? '当前主轴是垂直方向，交叉轴是水平方向：justify-content 管上下，align-items 管左右。'
    : '当前主轴是水平方向，交叉轴是垂直方向：justify-content 管左右，align-items 管上下。',
)

const dirCode = computed(
  () => `.fx-dir-stage {
  display: flex;
  flex-direction: ${dir.value};
  flex-wrap: ${wrap.value ? 'wrap' : 'nowrap'};
  gap: 8px;
}
/* 主轴：${dir.value} 方向；交叉轴：与之垂直 */`,
)

// ---------- ② 对齐三兄弟 ----------
const justify = ref('flex-start')
const alignItems = ref('stretch')
const alignContent = ref('stretch')
const gap = ref(8)

const alStageStyle = computed(() => ({
  justifyContent: justify.value,
  alignItems: alignItems.value,
  alignContent: alignContent.value,
  gap: gap.value + 'px',
}))

const alCode = computed(
  () => `display: flex;
justify-content: ${justify.value};   /* 主轴 */
align-items: ${alignItems.value};   /* 交叉轴 · 单行 */
align-content: ${alignContent.value};   /* 交叉轴 · 多行 */
gap: ${gap.value}px;`,
)

// ---------- ③ flex: grow shrink basis 的剩余空间分配 ----------
const growStage = ref<HTMLElement | null>(null)
const containerWidth = ref(480)
const boxes = reactive([
  { name: 'A', grow: 1, shrink: 1, basis: 60 },
  { name: 'B', grow: 2, shrink: 1, basis: 60 },
  { name: 'C', grow: 0, shrink: 1, basis: 120 },
])

const basisSum = computed(() => boxes.reduce((sum, b) => sum + b.basis, 0))
const freeSpace = computed(() => containerWidth.value - basisSum.value)

/** 公式预测：剩余空间按 grow 比例分；空间不足时按 shrink × basis 的加权比例收缩 */
const predicted = computed(() => {
  const free = freeSpace.value
  if (free >= 0) {
    const growSum = boxes.reduce((sum, b) => sum + b.grow, 0)
    // 所有元素都 grow: 0 → 剩余空间没人要，全部留在行尾
    if (growSum === 0) return boxes.map((b) => b.basis)
    return boxes.map((b) => b.basis + (free * b.grow) / growSum)
  }
  const weights = boxes.map((b) => b.shrink * b.basis)
  const weightSum = weights.reduce((a, c) => a + c, 0)
  if (weightSum === 0) return boxes.map((b) => b.basis)
  return boxes.map((b, i) => b.basis + (free * weights[i]) / weightSum)
})

/** 真实测量：不信公式，直接读 offsetWidth */
const measured = ref<number[]>([])
function measure() {
  const el = growStage.value
  if (!el) return
  measured.value = Array.from(el.children).map((c) => (c as HTMLElement).offsetWidth)
}
onMounted(() => nextTick(measure))
watch(
  () => [containerWidth.value, boxes.map((b) => `${b.grow}/${b.basis}`).join(',')],
  () => nextTick(measure),
)

const grRows = computed(() =>
  boxes.map((b, i) => ({
    name: b.name,
    flex: `${b.grow} ${b.shrink} ${b.basis}px`,
    predict: Math.round(predicted.value[i]) + 'px',
    real: measured.value.length > i ? measured.value[i] + 'px' : '—',
  })),
)

const allocText = computed(() => {
  const free = freeSpace.value
  if (free >= 0) {
    const growSum = boxes.reduce((sum, b) => sum + b.grow, 0)
    if (growSum === 0) return `剩余 ${free}px 无人认领（grow 全是 0）→ 全部空间留在行尾`
    return `剩余空间 = ${containerWidth.value} − ${basisSum.value} = ${free}px，按 grow ${boxes.map((b) => b.grow).join(' : ')} 的比例分掉`
  }
  return `空间不足 ${-free}px → 进入收缩：按 shrink × basis 的加权比例分摊（basis 越大，缩得越多）`
})
</script>

<template>
  <div>
    <h1>8. Flexbox 弹性布局</h1>
    <p class="lead">
      Flex 是<strong>一维</strong>布局：先定主轴方向，再在主轴分空间、在交叉轴做对齐。
      记住「<code>justify-content</code> 永远管主轴、<code>align-items</code> 永远管交叉轴」，
      以及「<strong><code>flex: 1</code> 的真实含义是 <code>1 1 0%</code>，是等分而不是按内容分</strong>」。
    </p>

    <!-- ① 主轴与交叉轴 -->
    <CssCard
      title="① 主轴 / 交叉轴：一切从 flex-direction 开始"
      hint="切换 flex-direction，两个轴会整体互换；同时切换 flex-wrap，看「宁可压缩也不换行」的默认行为。"
      :source="css.rules('.fx-dir-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="dir">
          <option value="row">row</option>
          <option value="row-reverse">row-reverse</option>
          <option value="column">column</option>
          <option value="column-reverse">column-reverse</option>
        </select>
        <label class="kv"><input type="checkbox" v-model="wrap" /> flex-wrap: wrap</label>
      </template>

      <p class="kv">{{ axisText }}</p>
      <div class="fx-dir-stage" :style="dirStageStyle">
        <div class="fx-dir-cell">A</div>
        <div class="fx-dir-cell">B</div>
        <div class="fx-dir-cell">C</div>
      </div>
      <p class="hint" style="margin: 8px 0 0">
        三个盒子都是 <code>width: 40%</code>：<b>不换行时它们被压缩成三份</b>（flex-shrink 生效），
        <b>换行时它们保持 40% 并折到第二行</b>。这就是「Flex 默认 nowrap，宁可挤也不换行」。
      </p>
      <pre class="code" style="margin-top: 10px">{{ dirCode }}</pre>
    </CssCard>

    <!-- ② 对齐 -->
    <CssCard
      title="② justify-content / align-items / align-content 全部取值"
      hint="两个演示区共用同一组对齐样式：上面是单行（nowrap），下面是多行（wrap）。注意 align-content 对上面那个毫无影响。"
      :source="css.rules('.fx-al-')"
    >
      <template #extra>
        <label class="kv"
          >justify-content
          <select v-model="justify">
            <option value="flex-start">flex-start</option>
            <option value="flex-end">flex-end</option>
            <option value="center">center</option>
            <option value="space-between">space-between</option>
            <option value="space-around">space-around</option>
            <option value="space-evenly">space-evenly</option>
          </select>
        </label>
        <label class="kv"
          >align-items
          <select v-model="alignItems">
            <option value="stretch">stretch</option>
            <option value="flex-start">flex-start</option>
            <option value="flex-end">flex-end</option>
            <option value="center">center</option>
            <option value="baseline">baseline</option>
          </select>
        </label>
        <label class="kv"
          >align-content
          <select v-model="alignContent">
            <option value="stretch">stretch</option>
            <option value="flex-start">flex-start</option>
            <option value="flex-end">flex-end</option>
            <option value="center">center</option>
            <option value="space-between">space-between</option>
            <option value="space-around">space-around</option>
            <option value="space-evenly">space-evenly</option>
          </select>
        </label>
        <label class="kv">gap <input type="range" min="0" max="40" v-model.number="gap" /> {{ gap }}px</label>
      </template>

      <p class="kv">单行（nowrap）· 高度 170px —— align-content 在这里<b>没有任何效果</b>：</p>
      <div class="fx-al-stage fx-al-single" :style="alStageStyle">
        <div class="fx-al-item">短</div>
        <div class="fx-al-item fx-al-tall">高一点<br />两行文字</div>
        <div class="fx-al-item">短</div>
      </div>

      <p class="kv" style="margin-top: 12px">多行（wrap）· 高度 190px —— 这时 align-content 才管用：</p>
      <div class="fx-al-stage fx-al-multi" :style="alStageStyle">
        <div class="fx-al-item fx-al-line">1</div>
        <div class="fx-al-item fx-al-line">2</div>
        <div class="fx-al-item fx-al-line">3</div>
        <div class="fx-al-item fx-al-line">4</div>
        <div class="fx-al-item fx-al-line">5</div>
      </div>

      <pre class="code" style="margin-top: 10px">{{ alCode }}</pre>
      <p class="hint" style="margin-top: 8px">
        一句话区分：<b>align-items 管「每行内部的元素怎么对齐」</b>，
        <b>align-content 管「多行之间怎么分布」</b>；只有一行时，行本身就是全部空间，所以 align-content 无从下手。
        <code>stretch</code> 是默认值 —— 元素没写高度时会被拉满交叉轴。
      </p>
    </CssCard>

    <!-- ③ flex: grow shrink basis -->
    <CssCard
      title="③ flex: grow shrink basis —— 剩余空间到底怎么分"
      hint="拖容器宽度和每个盒子的 grow / basis，表格里同时给出「公式预测」和「真实测量」，两者应该一致。"
      :source="css.rules('.fx-gr-')"
      tone="warn"
    >
      <div class="fx-gr-controls">
        <label class="kv">容器宽度 <input type="range" min="220" max="640" step="10" v-model.number="containerWidth" /> {{ containerWidth }}px</label>
        <div class="fx-gr-ctl" v-for="b in boxes" :key="b.name">
          <span class="fx-gr-name">{{ b.name }}</span>
          <label class="kv">grow <input type="range" min="0" max="4" v-model.number="b.grow" /> {{ b.grow }}</label>
          <label class="kv">basis <input type="range" min="0" max="200" step="10" v-model.number="b.basis" /> {{ b.basis }}px</label>
        </div>
      </div>

      <!-- outline 不占空间，所以这里的宽度数学是干净的：容器内容宽 = containerWidth -->
      <div ref="growStage" class="fx-gr-stage" :style="{ width: containerWidth + 'px' }">
        <div
          v-for="b in boxes"
          :key="b.name"
          class="fx-gr-item"
          :style="{ flexGrow: String(b.grow), flexShrink: String(b.shrink), flexBasis: b.basis + 'px' }"
        >
          {{ b.name }}
        </div>
      </div>

      <p class="kv" style="margin-top: 10px">{{ allocText }}</p>
      <table style="margin-top: 8px">
        <thead>
          <tr><th>盒子</th><th>flex（grow shrink basis）</th><th>公式预测宽度</th><th>真实测量</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in grRows" :key="r.name">
            <td>{{ r.name }}</td>
            <td class="kv">{{ r.flex }}</td>
            <td class="kv">{{ r.predict }}</td>
            <td class="kv"><b>{{ r.real }}</b></td>
          </tr>
        </tbody>
      </table>

      <p class="hint" style="margin-top: 10px">
        三条规则：<b>① grow 分的是「剩余空间」，不是总空间</b>，所以 grow 比例只在有剩余时才成立；
        <b>② 收缩量按 shrink × basis 加权</b>，basis 大的缩得多（不是按 shrink 直接平均分）；
        <b>③ 元素默认 <code>min-width: auto</code></b>，内容太长时会顶住不肯缩 —— 本演示特意加了
        <code>min-width: 0</code>，真实项目里这行经常是「布局被撑破」的解药。
      </p>

      <p class="kv" style="margin-top: 12px">flex-basis vs width（同为 flex 子项，basis 优先级更高）：</p>
      <div class="fx-gr-bw">
        <div class="fx-gr-bw-row">
          <span class="fx-gr-bw-label">width: 140px</span>
          <div class="fx-gr-bw-item">140px 生效</div>
        </div>
        <div class="fx-gr-bw-row">
          <span class="fx-gr-bw-label">width: 140px + flex-basis: 60px</span>
          <div class="fx-gr-bw-item fx-gr-bw-basis">basis 60px 生效</div>
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        <code>flex-basis: auto</code> 时才会回退到 <code>width</code>；<code>flex: 1</code> 展开是
        <code>1 1 0%</code>（等分），<code>flex: auto</code> 展开是 <code>1 1 auto</code>（先按内容占位再分剩余）。
      </p>
    </CssCard>

    <!-- ④ 实战套路 -->
    <CssCard
      title="④ 五个能覆盖 80% 场景的实战套路"
      hint="这五段写在项目里从不出错，建议直接背下来。"
      :source="css.rules('.fx-pt-')"
    >
      <p class="kv">套路 1 · 水平垂直居中（父级三行，子级不用管自己的尺寸）</p>
      <div class="fx-pt-center">
        <div class="fx-pt-center-box">我永远在正中间</div>
      </div>

      <p class="kv" style="margin-top: 12px">套路 2 · 导航栏：两端对齐（logo 在左，链接在右）</p>
      <nav class="fx-pt-nav">
        <span class="fx-pt-nav-logo">LOGO</span>
        <span class="fx-pt-nav-links"><span>首页</span><span>文档</span><span>关于</span></span>
      </nav>

      <p class="kv" style="margin-top: 12px">套路 3 · 圣杯布局主体：两侧固定、中间自适应</p>
      <div class="fx-pt-holy">
        <aside class="fx-pt-holy-side">侧栏<br />flex: 0 0 76px</aside>
        <div class="fx-pt-holy-main">
          <span class="fx-pt-holy-text">主内容 flex: 1 + min-width: 0（少了 min-width: 0，这段超长文本会把侧栏挤扁）</span>
        </div>
        <aside class="fx-pt-holy-side">侧栏<br />flex: 0 0 76px</aside>
      </div>

      <p class="kv" style="margin-top: 12px">套路 4 · 等分布局：每个都 <code>flex: 1</code></p>
      <div class="fx-pt-equal">
        <div class="fx-pt-equal-item">1/4</div>
        <div class="fx-pt-equal-item">1/4</div>
        <div class="fx-pt-equal-item">1/4</div>
        <div class="fx-pt-equal-item">1/4</div>
      </div>

      <p class="kv" style="margin-top: 12px">套路 5 · 最后一个元素靠右：不用绝对定位，一行搞定</p>
      <div class="fx-pt-last">
        <span>标题</span>
        <span>副标题</span>
        <span class="fx-pt-last-right">右侧操作</span>
      </div>
      <p class="hint" style="margin-top: 8px">
        <code>margin-left: auto</code> 之所以有用，是因为<b>主轴上的 auto margin 会吃掉全部剩余空间</b>；
        同理 <code>margin: auto</code> 可以同时在两个轴上做居中。
      </p>
    </CssCard>

    <!-- ⑤ 速查表 -->
    <CssCard title="⑤ Flex 速查表 + 六个高频坑" tone="warn">
      <table>
        <thead>
          <tr><th>属性</th><th>初始值</th><th>作用轴</th><th>一句话</th></tr>
        </thead>
        <tbody>
          <tr><td><code>flex-direction</code></td><td>row</td><td>定义主轴</td><td>主轴一变，下面两个「管主轴/交叉轴」的也跟着换方向</td></tr>
          <tr><td><code>flex-wrap</code></td><td>nowrap</td><td>—</td><td>默认不换行，宁可压缩</td></tr>
          <tr><td><code>justify-content</code></td><td>flex-start</td><td>主轴</td><td>主轴上的剩余空间怎么分</td></tr>
          <tr><td><code>align-items</code></td><td>stretch</td><td>交叉轴</td><td>单行时每个元素在交叉轴怎么对齐</td></tr>
          <tr><td><code>align-content</code></td><td>stretch</td><td>交叉轴</td><td>只在多行（换行后）生效</td></tr>
          <tr><td><code>align-self</code></td><td>auto</td><td>交叉轴</td><td>单个元素覆盖 align-items（写在子项上）</td></tr>
          <tr><td><code>gap</code></td><td>normal（=0）</td><td>两轴</td><td>行列间距，不折叠、不加在最外侧，优于 margin</td></tr>
          <tr><td><code>flex</code></td><td>0 1 auto</td><td>主轴</td><td>grow / shrink / basis 的简写</td></tr>
          <tr><td><code>order</code></td><td>0</td><td>—</td><td>只改绘制顺序，不改 DOM 顺序（会破坏 Tab 焦点顺序）</td></tr>
        </tbody>
      </table>

      <ol style="margin: 12px 0 0; padding-left: 20px">
        <li><b><code>flex: 1</code> 不等于「按内容比例分配」</b>：它是 <code>1 1 0%</code>，所有项从 0 起分，所以是等分。</li>
        <li><b>子项默认 <code>min-width: auto</code></b>，长文本/长单词会把容器撑破，加 <code>min-width: 0</code> 或 <code>overflow: hidden</code>。</li>
        <li><b>用 <code>align-content</code> 做单行垂直居中</b>没用 —— 单行请用 <code>align-items</code>。</li>
        <li><b>想「一个元素占满剩余空间」写 <code>flex: 1</code>，想「按内容大小再分剩余」写 <code>flex: auto</code></b>。</li>
        <li><b>百分比 <code>flex-basis</code> 参照的是容器主轴尺寸</b>，方向一变参照物就变了；高度依赖容器时用 <code>min-height: 0</code> 解决纵向溢出。</li>
        <li><b>别用 <code>order</code> 改变重要的操作顺序</b>：视觉顺序变了，但键盘 Tab 与读屏顺序仍然是 DOM 顺序。</li>
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

/* ---------- ① 主轴 / 交叉轴 ---------- */
.fx-dir-stage {
  display: flex;
  gap: 8px;
  padding: 10px;
  min-height: 160px;
  border: 1px dashed var(--c-info);
  border-radius: 10px;
  background: repeating-linear-gradient(
    45deg,
    rgba(59, 130, 246, 0.07),
    rgba(59, 130, 246, 0.07) 8px,
    transparent 8px,
    transparent 16px
  );
}
.fx-dir-cell {
  width: 40%;
  padding: 12px 8px;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-family: var(--mono);
  font-size: 12.5px;
  text-align: center;
}

/* ---------- ② 对齐 ---------- */
.fx-al-stage {
  display: flex;
  gap: 8px;
  padding: 10px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: var(--c-surface-2);
}
.fx-al-single {
  flex-wrap: nowrap;
  height: 170px;
}
.fx-al-multi {
  flex-wrap: wrap;
  height: 190px;
}
.fx-al-item {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--c-info);
  color: #fff;
  font-size: 12.5px;
  font-family: var(--mono);
  text-align: center;
}
.fx-al-tall {
  height: 74px;
}
.fx-al-line {
  width: 40%;
}

/* ---------- ③ grow / shrink / basis ---------- */
.fx-gr-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.fx-gr-ctl {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
}
.fx-gr-ctl input[type='range'] {
  width: 84px;
  vertical-align: middle;
}
.fx-gr-name {
  font-family: var(--mono);
  font-weight: 700;
  color: var(--c-primary-dark);
}
.fx-gr-stage {
  display: flex;
  max-width: 100%;
  /* outline 不参与布局，所以容器内容宽正好等于滑块的 px 值，预测和实测才能对上 */
  outline: 2px dashed var(--c-info);
  outline-offset: 3px;
  background: var(--c-surface-2);
}
.fx-gr-item {
  /* 关键：默认 min-width: auto 会让元素拒绝缩小到内容宽度以下，这里放开 */
  min-width: 0;
  padding: 16px 6px;
  color: #fff;
  font-family: var(--mono);
  font-size: 12px;
  text-align: center;
  overflow: hidden;
}
.fx-gr-item:nth-child(1) {
  background: var(--c-primary);
}
.fx-gr-item:nth-child(2) {
  background: var(--c-info);
}
.fx-gr-item:nth-child(3) {
  background: var(--c-warn);
}
.fx-gr-bw {
  margin-top: 8px;
}
.fx-gr-bw-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.fx-gr-bw-label {
  flex: 0 0 210px;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--c-text-dim);
}
.fx-gr-bw-item {
  width: 140px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(66, 184, 131, 0.2);
  border: 1px solid var(--c-primary);
  font-size: 12px;
  text-align: center;
}
.fx-gr-bw-basis {
  flex-basis: 60px;
}

/* ---------- ④ 实战套路 ---------- */
.fx-pt-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 110px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
}
.fx-pt-center-box {
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-size: 12.5px;
}
.fx-pt-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--c-accent);
  color: #fff;
  font-size: 12.5px;
}
.fx-pt-nav-logo {
  font-weight: 700;
  letter-spacing: 1px;
}
.fx-pt-nav-links {
  display: flex;
  gap: 14px;
}
.fx-pt-holy {
  display: flex;
  gap: 8px;
}
.fx-pt-holy-side {
  flex: 0 0 76px;
  padding: 10px 6px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.16);
  border: 1px solid rgba(59, 130, 246, 0.4);
  font-size: 11.5px;
  text-align: center;
}
.fx-pt-holy-main {
  flex: 1;
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(66, 184, 131, 0.16);
  border: 1px solid rgba(66, 184, 131, 0.4);
}
.fx-pt-holy-text {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 11.5px;
}
.fx-pt-equal {
  display: flex;
  gap: 8px;
}
.fx-pt-equal-item {
  flex: 1;
  padding: 12px 6px;
  border-radius: 8px;
  background: rgba(210, 153, 34, 0.2);
  border: 1px solid rgba(210, 153, 34, 0.5);
  font-size: 12px;
  text-align: center;
  font-family: var(--mono);
}
.fx-pt-last {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-size: 12.5px;
}
.fx-pt-last-right {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
}
</style>
