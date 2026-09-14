<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 9：Grid 网格布局
 *
 * Grid 是「二维」布局：一次同时声明行和列，然后把元素放进格子。
 * 三个最需要分清的概念：
 *   1) fr 是「剩余空间的一份」，不是百分比 —— 它会先扣掉 gap 和固定轨道
 *   2) 显式网格（grid-template-*）与隐式网格（自动多出来的行/列，由 grid-auto-* 决定）
 *   3) repeat(auto-fill) 保留空轨道，repeat(auto-fit) 折叠空轨道让卡片拉宽
 */
const css = useStyleSource()

// ---------- ① 列数 / gap ----------
const cols = ref(3)
const gap = ref(10)

const colStageStyle = computed(() => ({
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`,
  gap: gap.value + 'px',
}))

const colCode = computed(
  () => `.gd-col-stage {
  display: grid;
  grid-template-columns: repeat(${cols.value}, 1fr);   /* = ${Array.from({ length: cols.value }, () => '1fr').join(' ')} */
  gap: ${gap.value}px;
}`,
)

// ---------- ② auto-fit vs auto-fill ----------
const FIT_ITEMS = 4
const fitGap = 10
const fitMode = ref<'auto-fill' | 'auto-fit'>('auto-fill')
const fitMin = ref(150)
const fitWidth = ref(720)

/** 能塞下多少条 minmax 轨道：条数 = floor((容器宽 + gap) / (最小轨道宽 + gap)) */
const fitTracks = computed(() =>
  Math.max(1, Math.floor((fitWidth.value + fitGap) / (fitMin.value + fitGap))),
)
const fitTrackWidth = computed(
  () => (fitWidth.value - (fitTracks.value - 1) * fitGap) / fitTracks.value,
)
/** auto-fit：空轨道折叠，卡片把空间吃掉；auto-fill：空轨道留着，卡片维持轨道宽度 */
const fitCardWidth = computed(() => {
  const n = Math.min(fitTracks.value, FIT_ITEMS)
  return (fitWidth.value - (n - 1) * fitGap) / n
})
const fitEmptyTracks = computed(() => Math.max(0, fitTracks.value - FIT_ITEMS))
const fitTrackText = computed(() => Math.round(fitTrackWidth.value) + 'px')
const fitCardWidthText = computed(() => Math.round(fitCardWidth.value) + 'px')

const fitStageStyle = computed(() => ({
  gridTemplateColumns: `repeat(${fitMode.value}, minmax(${fitMin.value}px, 1fr))`,
  gap: fitGap + 'px',
  width: fitWidth.value + 'px',
}))

// ---------- ③ 显式网格 vs 隐式网格 ----------
const autoRows = ref(56)
const flowMode = ref<'row' | 'row dense' | 'column'>('row')
const pinItem = ref(true)

const flowStageStyle = computed(() =>
  flowMode.value === 'column'
    ? // 列方向流动：行数由显式行决定，多出来的列是隐式列（由 grid-auto-columns 决定宽度）
      {
        gap: '10px',
        gridAutoRows: autoRows.value + 'px',
        gridTemplateColumns: 'none',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridAutoFlow: 'column',
        gridAutoColumns: '1fr',
      }
    : // 只显式声明了 1 行（72px），第 2 行往后全是隐式行 —— 才会跟着 grid-auto-rows 变
      {
        gap: '10px',
        gridAutoRows: autoRows.value + 'px',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '72px',
        gridAutoFlow: flowMode.value,
      },
)

const flowCode = computed(() =>
  flowMode.value === 'column'
    ? `.gd-flow-stage {
  display: grid;
  grid-template-rows: repeat(3, 1fr);   /* 显式：3 行 */
  grid-auto-flow: column;               /* 先往下填，填满一列再开新列 */
  grid-auto-columns: 1fr;               /* 隐式列的宽度 */
  gap: 10px;
}`
    : `.gd-flow-stage {
  display: grid;
  grid-template-columns: repeat(3, 1fr);   /* 显式：3 列 */
  grid-template-rows: 72px;                /* 显式：只有第 1 行 */
  grid-auto-rows: ${autoRows.value}px;     /* 隐式行的高度 —— 第 2 行之后全归它管 */
  grid-auto-flow: ${flowMode.value};
  gap: 10px;
}`,
)

// ---------- ④ 区域命名 ----------
const narrow = ref(false)

// ---------- ⑤ 对齐 ----------
const justifyItems = ref('stretch')
const alignItems = ref('stretch')
const alStyle = computed(() => ({
  justifyItems: justifyItems.value,
  alignItems: alignItems.value,
}))
</script>

<template>
  <div>
    <h1>9. Grid 网格布局</h1>
    <p class="lead">
      Grid 是<strong>二维</strong>布局：行列一起声明，元素放进格子里。
      最需要记住的一句话是：<strong><code>fr</code> 分的是「扣掉 gap 与固定轨道之后的剩余空间」</strong>，
      所以 <code>1fr 2fr</code> 不是 1:2 的百分比，而是「把剩下的按 1:2 分」。
    </p>

    <!-- ① 列数与 fr -->
    <CssCard
      title="① grid-template-columns / repeat() / fr 单位"
      hint="拖列数与 gap 滑块，观察 fr 轨道怎么平分空间 —— 注意 gap 是先从总宽里扣掉的。"
      :source="css.rules('.gd-col-')"
      tone="ok"
    >
      <template #extra>
        <label class="kv">列数 <input type="range" min="1" max="6" v-model.number="cols" /> {{ cols }}</label>
        <label class="kv">gap <input type="range" min="0" max="32" v-model.number="gap" /> {{ gap }}px</label>
      </template>

      <div class="gd-col-stage" :style="colStageStyle">
        <div class="gd-col-cell" v-for="n in 6" :key="n">{{ n }}</div>
      </div>
      <pre class="code" style="margin-top: 10px">{{ colCode }}</pre>
      <p class="hint" style="margin-top: 8px">
        <code>fr</code> = free space 的一份：先把 <code>gap</code>、<code>px</code> 这类固定轨道扣掉，
        剩下的才按 fr 的比例分。所以轨道数越多、gap 越大，每格越窄 —— 但每个 <code>1fr</code> 永远相等。
        <b>没有写 <code>grid-template-rows</code> 时，行高由内容撑开</b>，想让所有行等高就配 <code>grid-auto-rows: 1fr</code>。
      </p>
      <p class="hint">
        小坑：<code>1fr</code> 等价于 <code>minmax(auto, 1fr)</code>，轨道有「内容最小宽」的下限，
        超长不可断词的文本会把格子顶宽；要严格平分写 <code>minmax(0, 1fr)</code>。
      </p>
    </CssCard>

    <!-- ② auto-fit vs auto-fill -->
    <CssCard
      title="② repeat(auto-fill) vs repeat(auto-fit)：卡片列表的经典差异"
      hint="切换 auto-fill / auto-fit，并拖动容器宽度：注意「空轨道」到底是被保留还是被折叠。"
      :source="css.rules('.gd-fit-')"
      tone="warn"
    >
      <template #extra>
        <select v-model="fitMode">
          <option value="auto-fill">repeat(auto-fill, minmax(...))</option>
          <option value="auto-fit">repeat(auto-fit, minmax(...))</option>
        </select>
        <label class="kv">轨道最小宽 <input type="range" min="90" max="260" step="10" v-model.number="fitMin" /> {{ fitMin }}px</label>
        <label class="kv">容器宽度 <input type="range" min="320" max="900" step="10" v-model.number="fitWidth" /> {{ fitWidth }}px</label>
      </template>

      <div class="gd-fit-wrap">
        <div class="gd-fit-stage" :style="fitStageStyle">
          <div class="gd-fit-card" v-for="n in FIT_ITEMS" :key="n">
            <b>卡片 {{ n }}</b>
            <span class="kv">minmax({{ fitMin }}px, 1fr)</span>
          </div>
        </div>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>模式</th><th>自动轨道数</th><th>空轨道</th><th>每张卡片宽度</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>auto-fill</code></td>
            <td class="kv">{{ fitTracks }} 条</td>
            <td class="kv">{{ fitEmptyTracks }} 条（留着）</td>
            <td class="kv">{{ fitTrackText }}</td>
          </tr>
          <tr>
            <td><code>auto-fit</code></td>
            <td class="kv">{{ fitTracks }} 条 → 折叠 {{ fitEmptyTracks }} 条</td>
            <td class="kv">0（折叠掉）</td>
            <td class="kv">{{ fitCardWidthText }}</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        两者<b>算出的轨道数完全一样</b>，区别只在最后一步：
        <b>auto-fill 保留空轨道</b>（卡片维持 <code>minmax</code> 的宽度，右侧留白）；
        <b>auto-fit 把空轨道宽度折叠为 0</b>，剩下的轨道被拉伸，卡片就变宽铺满整行。
        所以「卡片要撑满整行」用 auto-fit，「想保持卡片尺寸、右对齐留白」用 auto-fill。
      </p>
    </CssCard>

    <!-- ③ 显式 / 隐式网格 -->
    <CssCard
      title="③ 显式网格 vs 隐式网格 + grid-auto-flow"
      hint="第 1 行是显式行（固定 72px，不跟滑块变），第 2 行起是隐式行（跟着 grid-auto-rows 变）。"
      :source="css.rules('.gd-flow-')"
    >
      <template #extra>
        <label class="kv">grid-auto-rows <input type="range" min="40" max="90" step="4" v-model.number="autoRows" /> {{ autoRows }}px</label>
        <select v-model="flowMode">
          <option value="row">grid-auto-flow: row</option>
          <option value="row dense">grid-auto-flow: row dense</option>
          <option value="column">grid-auto-flow: column</option>
        </select>
        <label class="kv"><input type="checkbox" v-model="pinItem" /> 第 2 个元素钉在 grid-column: 3</label>
      </template>

      <div class="gd-flow-stage" :style="flowStageStyle">
        <div
          class="gd-flow-cell"
          v-for="n in 8"
          :key="n"
          :class="{ 'gd-flow-pin': pinItem && n === 2 && flowMode !== 'column' }"
        >
          {{ n }}
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">{{ flowCode }}</pre>
      <p class="hint" style="margin-top: 8px">
        <b>显式网格</b>= 你亲手写的 <code>grid-template-*</code>；<b>隐式网格</b>= 内容放不下时自动多出来的行/列，
        尺寸由 <code>grid-auto-rows / grid-auto-columns</code> 决定。演示里第 1 行永远是 72px，就是显式行的证据。
      </p>
      <p class="hint">
        <code>grid-auto-flow: row dense</code> 会让后面的小元素<b>回头填补前面的空洞</b>：
        勾上「钉在第 3 列」再看 <code>row</code> 与 <code>row dense</code> 的差别 —— 只有 dense 会把 3 号填进第 1 行的空位。
        dense 会打乱视觉顺序，跟 <code>order</code> 一样要小心可访问性。
      </p>
    </CssCard>

    <!-- ④ 区域命名与跨行跨列 -->
    <CssCard
      title="④ grid-template-areas 页面骨架 + 跨行跨列"
      hint="勾选「窄屏」看同一套 HTML 只靠 grid-template-areas 重排成单列 —— 这就是 Grid 最舒服的地方：布局写在 CSS 里，DOM 顺序保持语义。"
      :source="css.rules('.gd-area-')"
      tone="ok"
    >
      <template #extra>
        <label class="kv"><input type="checkbox" v-model="narrow" /> 窄屏（单列重排）</label>
      </template>

      <div class="gd-area-stage" :class="{ 'gd-area-narrow': narrow }">
        <div class="gd-area-header">header</div>
        <div class="gd-area-sidebar">sidebar</div>
        <div class="gd-area-main">main</div>
        <div class="gd-area-footer">footer</div>
      </div>

      <p class="kv" style="margin-top: 12px">跨行跨列：</p>
      <div class="gd-area-span-grid">
        <div class="gd-area-span-a">grid-area: 1 / 1 / 2 / 3<br /><span class="kv">跨 2 列</span></div>
        <div class="gd-area-span-b">grid-area: 1 / 3 / 3 / 5<br /><span class="kv">跨 2 行 2 列</span></div>
        <div class="gd-area-span-c">grid-column: span 2<br /><span class="kv">自动放置的跨列</span></div>
        <div class="gd-area-span-d">grid-row: span 2<br /><span class="kv">自动放置的跨行</span></div>
        <div class="gd-area-span-e">默认 1 格</div>
      </div>

      <p class="hint" style="margin-top: 10px">
        <code>grid-area</code> 的简写顺序是 <b>行起 / 列起 / 行止 / 列止</b>
        （<code>grid-row-start / grid-column-start / grid-row-end / grid-column-end</code>），
        所以 <code>grid-area: 1 / 3 / 3 / 5</code> 表示「从第 1 行第 3 列，到第 3 行第 5 列之前」。
        写区域名时 <code>grid-area: header</code> 是另一种用法：直接引用 <code>grid-template-areas</code> 里起的名字。
        <b>线号里的「止」是不包含的那条线</b>，跨 2 列要写 <code>1 / 3</code> 而不是 <code>1 / 2</code>。
      </p>
    </CssCard>

    <!-- ⑤ 对齐 + 选型 -->
    <CssCard
      title="⑤ justify-items / align-items / place-items + Grid 还是 Flex"
      hint="justify 管行内（水平），align 管块内（垂直）；place-items 是两者的简写，注意 align 在前。"
      :source="css.rules('.gd-al-')"
    >
      <template #extra>
        <label class="kv"
          >justify-items
          <select v-model="justifyItems">
            <option value="stretch">stretch</option>
            <option value="start">start</option>
            <option value="center">center</option>
            <option value="end">end</option>
          </select>
        </label>
        <label class="kv"
          >align-items
          <select v-model="alignItems">
            <option value="stretch">stretch</option>
            <option value="start">start</option>
            <option value="center">center</option>
            <option value="end">end</option>
          </select>
        </label>
      </template>

      <div class="gd-al-stage" :style="alStyle">
        <div class="gd-al-cell" v-for="n in 6" :key="n">{{ n }}</div>
      </div>
      <p class="hint" style="margin-top: 8px">
        格子里的元素写了固定 <code>width/height</code> 才看得出对齐效果（stretch 只对没写尺寸的方向生效）。
        <code>justify-items</code> 默认 <code>stretch</code>、<code>align-items</code> 默认 <code>stretch</code>，
        所以不加任何设置的 Grid 会「格子多大元素多大」。
        <code>place-items: center</code> = <code>align-items: center</code> + <code>justify-items: center</code>（<b>先 align 后 justify</b>）。
        只想改某一个元素，就在它身上写 <code>justify-self / align-self</code>。
      </p>

      <table style="margin-top: 12px">
        <thead>
          <tr><th>问题</th><th>用 Grid</th><th>用 Flex</th></tr>
        </thead>
        <tbody>
          <tr><td>需要的维度</td><td><b>二维</b>：行列要互相对齐（表格、画廊、骨架屏）</td><td><b>一维</b>：一行或一列排下去（导航、标签、工具栏）</td></tr>
          <tr><td>谁决定尺寸</td><td>先画格子，再把内容放进去（布局驱动）</td><td>内容先占位，再分剩余空间（内容驱动）</td></tr>
          <tr><td>典型场景</td><td>页面骨架、卡片墙、仪表盘、表单栅格</td><td>导航栏、按钮组、列表项两端对齐、居中</td></tr>
          <tr><td>能不能互换</td><td>大部分 Flex 布局 Grid 都能做，但代码更长</td><td>Grid 能做单行单列，但拿不到跨行跨列的能力</td></tr>
          <tr><td>一句话决策</td><td colspan="2"><b>「这条线要不要跟另一条线对齐？」要 → Grid；只是把东西排一排再分空间 → Flex。</b>两者可以互相嵌套，不要二选一。</td></tr>
        </tbody>
      </table>
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

/* ---------- ① 列数与 fr ---------- */
.gd-col-stage {
  display: grid;
  padding: 10px;
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
.gd-col-cell {
  padding: 14px 6px;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-family: var(--mono);
  font-size: 12.5px;
  text-align: center;
}

/* ---------- ② auto-fit / auto-fill ---------- */
.gd-fit-wrap {
  /* 容器可以比卡片区窄，所以允许横向滚动，避免把页面撑破 */
  overflow-x: auto;
  padding-bottom: 4px;
}
.gd-fit-stage {
  display: grid;
  /* 用 outline 而不是 border + padding：outline 不参与布局，
     所以容器内容宽正好等于滑块的 px 值，下面的轨道宽度计算才能对上 */
  outline: 2px dashed var(--c-warn);
  outline-offset: 4px;
  margin: 4px 0 8px;
  background: rgba(210, 153, 34, 0.08);
}
.gd-fit-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 12px 10px;
  border-radius: 8px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  font-size: 12.5px;
}

/* ---------- ③ 显式 / 隐式网格 ---------- */
.gd-flow-stage {
  display: grid;
  height: 300px;
  padding: 8px;
  border: 1px dashed var(--c-info);
  border-radius: 10px;
  background: var(--c-surface-2);
}
.gd-flow-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.22);
  border: 1px solid rgba(59, 130, 246, 0.55);
  font-family: var(--mono);
  font-size: 12.5px;
}
.gd-flow-pin {
  grid-column: 3;
  background: rgba(229, 83, 75, 0.22);
  border-color: var(--c-danger);
}

/* ---------- ④ 区域命名 ---------- */
.gd-area-stage {
  display: grid;
  gap: 8px;
  min-height: 240px;
  grid-template-columns: 108px 1fr;
  grid-template-rows: 46px 1fr 42px;
  grid-template-areas:
    'header header'
    'sidebar main'
    'footer footer';
}
.gd-area-header,
.gd-area-sidebar,
.gd-area-main,
.gd-area-footer {
  padding: 8px 10px;
  border-radius: 8px;
  font-family: var(--mono);
  font-size: 12px;
}
.gd-area-header {
  grid-area: header;
  background: rgba(53, 73, 94, 0.9);
  color: #fff;
}
.gd-area-sidebar {
  grid-area: sidebar;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.5);
}
.gd-area-main {
  grid-area: main;
  background: rgba(66, 184, 131, 0.18);
  border: 1px solid rgba(66, 184, 131, 0.5);
}
.gd-area-footer {
  grid-area: footer;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
}
/* 放在 .gd-area-stage 之后：同权重，靠顺序覆盖 */
.gd-area-narrow {
  grid-template-columns: 1fr;
  grid-template-rows: 46px 1fr auto 42px;
  grid-template-areas:
    'header'
    'main'
    'sidebar'
    'footer';
}
.gd-area-span-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 36px;
  gap: 6px;
  padding: 8px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
}
.gd-area-span-a,
.gd-area-span-b,
.gd-area-span-c,
.gd-area-span-d,
.gd-area-span-e {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(210, 153, 34, 0.18);
  border: 1px solid rgba(210, 153, 34, 0.5);
  font-family: var(--mono);
  font-size: 10.5px;
  line-height: 1.35;
  overflow: hidden;
}
.gd-area-span-a {
  grid-area: 1 / 1 / 2 / 3;
}
.gd-area-span-b {
  grid-area: 1 / 3 / 3 / 5;
  background: rgba(59, 130, 246, 0.18);
  border-color: rgba(59, 130, 246, 0.5);
}
.gd-area-span-c {
  grid-column: span 2;
}
.gd-area-span-d {
  grid-row: span 2;
  background: rgba(66, 184, 131, 0.18);
  border-color: rgba(66, 184, 131, 0.5);
}
.gd-area-span-e {
  background: var(--c-surface-2);
  border-color: var(--c-border);
}

/* ---------- ⑤ 对齐 ---------- */
.gd-al-stage {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 90px;
  gap: 8px;
  padding: 8px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: var(--c-surface-2);
}
.gd-al-cell {
  /* 写了固定尺寸，justify-items / align-items 才看得出来 */
  width: 62px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-family: var(--mono);
  font-size: 12.5px;
}
</style>
