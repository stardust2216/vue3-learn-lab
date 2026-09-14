<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 11：响应式与媒体查询
 *
 * 一条主线：让「布局」跟着「可用空间」变。
 *   - 页面级：@media（看视口）+ <meta name="viewport">
 *   - 组件级：@container（看父容器宽度）—— 能用容器查询就用它，组件才能真正复用
 *   - 连续变化：clamp() 流体排版，比堆一串断点更平滑
 */
const css = useStyleSource()

// ---------- ① 视口 ----------
const vpWidth = ref(360)

// ---------- ② 媒体查询与断点 ----------
const MQ_STEPS = [
  { name: '手机', min: 0, cols: 1, rule: '基础样式（移动优先的起点）' },
  { name: '平板', min: 600, cols: 2, rule: '@media (min-width: 600px)' },
  { name: '桌面', min: 1024, cols: 3, rule: '@media (min-width: 1024px)' },
  { name: '大屏', min: 1440, cols: 4, rule: '@media (min-width: 1440px)' },
]
const simWidth = ref(820)
const realWidth = ref(0)

/** 模拟：移动优先下，取「满足条件里 min 最大的那一条」 */
const activeStep = computed(() => {
  let hit = MQ_STEPS[0]
  for (const s of MQ_STEPS) if (simWidth.value >= s.min) hit = s
  return hit
})
const simStyle = computed(() => ({
  width: simWidth.value + 'px',
  gridTemplateColumns: `repeat(${activeStep.value.cols}, 1fr)`,
}))

function readRealWidth() {
  realWidth.value = window.innerWidth
}

// ---------- ③ iframe 沙盒：真的会命中的媒体查询 ----------
const sbWidth = ref(560)
const sandboxDoc = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 12px; background: #ffffff; color: #1f2328;
         font: 13px/1.6 -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  .flag { margin: 0 0 10px; padding: 6px 10px; border-radius: 8px; background: #f0f2f5;
          font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
  .flag::after { content: "单列 · 没到 600px"; font-weight: 700; color: #d29922; }
  .wrap { display: grid; gap: 8px; grid-template-columns: 1fr; }
  .item { padding: 12px 10px; border: 1px solid #e3e6ea; border-radius: 8px; background: #f6f7f9; font-size: 12.5px; }
  @media (min-width: 600px) {
    .wrap { grid-template-columns: 1fr 1fr; }
    .flag::after { content: "两列 · 命中 @media (min-width: 600px)"; color: #369870; }
  }
</style>
</head>
<body>
  <p class="flag"></p>
  <div class="wrap">
    <div class="item">卡片 A</div>
    <div class="item">卡片 B</div>
    <div class="item">卡片 C</div>
    <div class="item">卡片 D</div>
  </div>
</body>
</html>`

// ---------- ④ 媒体特性 ----------
const FEATURES = [
  { label: 'orientation: landscape', query: '(orientation: landscape)', use: '横屏时改成左右分栏' },
  { label: 'prefers-color-scheme: dark', query: '(prefers-color-scheme: dark)', use: '跟随系统暗色，别自己造开关' },
  { label: 'prefers-reduced-motion: reduce', query: '(prefers-reduced-motion: reduce)', use: '关闭大动效，别让用户晕' },
  { label: 'hover: hover', query: '(hover: hover)', use: '设备有真实指针，才给 hover 效果' },
  { label: 'pointer: fine', query: '(pointer: fine)', use: '鼠标/触控笔这类精确指针，可以把按钮做小' },
  { label: 'width >= 1024px', query: '(min-width: 1024px)', use: '视口够宽，可以放侧栏' },
]
const featureRows = ref(FEATURES.map((f) => ({ ...f, matches: false })))
const featureCleanups: Array<() => void> = []

// ---------- ⑤ 响应式图片 ----------
const demoImg =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="640" height="360" fill="#e8eef7"/>
      <circle cx="180" cy="140" r="90" fill="#42b883"/>
      <rect x="300" y="60" width="260" height="160" rx="18" fill="#3b82f6" opacity="0.75"/>
      <path d="M0 360 L640 120" stroke="#d29922" stroke-width="10" fill="none"/>
      <text x="20" y="340" font-family="Consolas, monospace" font-size="26" fill="#1f2328">640 x 360</text>
    </svg>`,
  )
const fitValue = ref<'cover' | 'contain' | 'fill' | 'none' | 'scale-down'>('cover')
const imgHeight = ref(170)

// ---------- ⑥ 容器查询 ----------
const cqWidth = ref(320)

onMounted(() => {
  readRealWidth()
  window.addEventListener('resize', readRealWidth)
  // matchMedia 的好处：不仅能读当前值，还能监听变化（旋转屏幕 / 改系统主题时会触发）
  featureRows.value.forEach((row) => {
    const mql = window.matchMedia(row.query)
    row.matches = mql.matches
    const sync = () => {
      row.matches = mql.matches
    }
    mql.addEventListener('change', sync)
    featureCleanups.push(() => mql.removeEventListener('change', sync))
  })
})
onUnmounted(() => {
  window.removeEventListener('resize', readRealWidth)
  featureCleanups.forEach((fn) => fn())
})
</script>

<template>
  <div>
    <h1>11. 响应式与媒体查询</h1>
    <p class="lead">
      响应式的目标不是「适配 iPhone」，而是<strong>让布局跟着可用空间变化</strong>。
      所以断点应该由内容决定（放不下了就换行），而不是照着设备清单抄数字；
      组件内部的响应优先用 <strong><code>@container</code></strong>，页面骨架才交给 <code>@media</code>。
    </p>

    <!-- ① viewport -->
    <CssCard
      title="① &lt;meta name=&quot;viewport&quot;&gt; 到底做了什么"
      hint="拖动「屏幕宽度」，把它拖到 400px 以下：固定宽度的盒子会溢出，出现横向滚动条。"
      :source="css.rules('.rs-vp-')"
      tone="warn"
    >
      <template #extra>
        <label class="kv">屏幕宽度 <input type="range" min="300" max="480" v-model.number="vpWidth" /> {{ vpWidth }}px</label>
      </template>

      <pre class="code">&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</pre>

      <div class="rs-vp-scroll">
        <div class="rs-vp-frame" :style="{ width: vpWidth + 'px' }">
          <div class="rs-vp-bar">模拟手机屏幕（{{ vpWidth }}px）</div>
          <div class="rs-vp-fixed">width: 400px（写死的宽度）</div>
          <div class="rs-vp-fluid">width: 100%（跟着屏幕走）</div>
        </div>
      </div>

      <p class="hint" style="margin-top: 10px">
        没有这行 meta 时，手机浏览器会用<b>大约 980px 的「布局视口」</b>去排版，再整页缩小塞进屏幕 ——
        结果就是「PC 版页面能看，但字小到看不清，要双指放大」。
        加上 <code>width=device-width</code> 之后，布局视口 = 设备宽度，<code>100%</code> 才真的是屏幕宽，
        <code>@media (max-width: 600px)</code> 也才会按手机宽度命中。
        <code>initial-scale=1</code> 保证初始不缩放。别再用 <code>user-scalable=no</code> 禁止缩放（可访问性问题）。
      </p>
    </CssCard>

    <!-- ② 媒体查询语法 + 断点 -->
    <CssCard
      title="② 媒体查询语法与断点设计"
      hint="滑块是「模拟视口」，下面的网格会真的按命中的断点变成 N 列；顶部那行是当前浏览器的真实视口宽度（改窗口大小会变）。"
      :source="css.rules('.rs-mq-')"
      tone="ok"
    >
      <template #extra>
        <label class="kv">模拟视口 <input type="range" min="320" max="1440" step="10" v-model.number="simWidth" /> {{ simWidth }}px</label>
      </template>

      <p class="kv">
        真实视口宽度：<b>{{ realWidth }}px</b> ｜ 模拟命中：<b>{{ activeStep.rule }}</b> → {{ activeStep.cols }} 列
      </p>
      <div class="rs-mq-scroll">
        <div class="rs-mq-stage" :style="simStyle">
          <div class="rs-mq-cell" v-for="n in 4" :key="n">{{ n }}</div>
        </div>
      </div>

      <table style="margin-top: 12px">
        <thead>
          <tr><th>写法</th><th>含义</th><th>注意</th></tr>
        </thead>
        <tbody>
          <tr><td><code>@media (min-width: 600px)</code></td><td>视口宽 ≥ 600px 时生效</td><td>移动优先的主力：只写 min-width，按从小到大叠加</td></tr>
          <tr><td><code>@media (max-width: 599px)</code></td><td>视口宽 ≤ 599px 时生效</td><td>桌面优先用；和 min-width 混用时容易互相覆盖</td></tr>
          <tr><td><code>and</code></td><td><code>(min-width: 600px) and (max-width: 1023px)</code> 同时满足</td><td>区间查询，边界值别写重叠（600/600 会同时命中）</td></tr>
          <tr><td>逗号 <code>,</code></td><td><code>(max-width: 600px), (orientation: landscape)</code> 任一满足</td><td>相当于 <code>or</code>，注意不是 <code>and</code></td></tr>
          <tr><td><code>not</code></td><td><code>not print</code>、<code>not (hover: hover)</code></td><td>取反；不能和逗号混在同一层用</td></tr>
          <tr><td><code>only</code></td><td><code>only screen</code></td><td>为了兼容上古浏览器，现在基本可以不写</td></tr>
        </tbody>
      </table>

      <pre class="code" style="margin-top: 10px">/* 移动优先：默认样式就是手机，断点只做「增强」 */
.card { display: grid; grid-template-columns: 1fr; gap: 12px }
@media (min-width: 600px)  { .card { grid-template-columns: 1fr 1fr } }
@media (min-width: 1024px) { .card { grid-template-columns: repeat(3, 1fr) } }

/* 桌面优先：默认样式是桌面，断点做「降级」（覆盖更多、更容易打架） */
.card { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px }
@media (max-width: 1023px) { .card { grid-template-columns: 1fr 1fr } }
@media (max-width: 599px)  { .card { grid-template-columns: 1fr } }</pre>
      <p class="hint" style="margin-top: 8px">
        <b>移动优先的好处</b>：默认样式最轻（手机加载的 CSS 最少）、断点只增不减、权重冲突少。
        断点怎么定？<b>用内容驱动</b>：把窗口一点点拉窄，哪个宽度开始「挤得难看 / 文字换行变丑」，那里就是断点。
        常见的 640 / 768 / 1024 只是经验值，不是标准。
      </p>
    </CssCard>

    <!-- ③ iframe 沙盒 -->
    <CssCard
      title="③ 真·断点沙盒：拖宽度，看媒体查询真正命中"
      hint="iframe 有自己独立的视口，所以里面的 @media 是真的在按这个框的宽度命中 —— 这不是模拟。"
      :source="css.rules('.rs-sb-')"
    >
      <template #extra>
        <label class="kv">iframe 宽度 <input type="range" min="300" max="820" step="10" v-model.number="sbWidth" /> {{ sbWidth }}px</label>
      </template>

      <div class="rs-sb-scroll">
        <iframe
          class="rs-sb-frame"
          title="响应式沙盒"
          :srcdoc="sandboxDoc"
          :style="{ width: sbWidth + 'px' }"
        ></iframe>
      </div>
      <p class="hint" style="margin-top: 8px">
        拖到 600px 以上，里面的网格立刻从 1 列变 2 列，顶部横幅的文字也换了 —— 这就是
        <code>@media (min-width: 600px)</code> 生效的全过程。
        在真实项目里，把浏览器窗口拉窄、或者用开发者工具的设备模拟器，效果是一样的。
      </p>
    </CssCard>

    <!-- ④ 媒体特性 -->
    <CssCard
      title="④ 除了宽度，还有哪些媒体特性值得用"
      hint="下面是当前这台设备的真实探测结果（旋转屏幕 / 切换系统深色模式 / 打开「减少动态效果」都会实时变化）。"
      :source="css.rules('.rs-fe-')"
    >
      <table>
        <thead>
          <tr><th>媒体特性</th><th>当前设备</th><th>该拿它做什么</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in featureRows" :key="row.query">
            <td class="kv">{{ row.label }}</td>
            <td>
              <span class="rs-fe-badge" :class="{ 'rs-fe-yes': row.matches, 'rs-fe-no': !row.matches }">
                {{ row.matches ? '命中' : '未命中' }}
              </span>
            </td>
            <td>{{ row.use }}</td>
          </tr>
        </tbody>
      </table>

      <pre class="code" style="margin-top: 10px">/* 尊重系统的「减少动态效果」—— 这是可访问性要求，不是可选项 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 触摸设备没有 hover：不要把关键功能藏在 :hover 里 */
@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) }
}

/* 跟随系统配色（配合 CSS 变量最省事） */
@media (prefers-color-scheme: dark) {
  :root { --bg: #16181d; --fg: #e6e8eb }
}</pre>
      <p class="hint" style="margin-top: 8px">
        三个原则：<b>①不要用 <code>hover</code> 来判断「是不是手机」</b>（带触摸屏的笔记本两者都有），
        用 <code>hover</code> / <code>pointer</code> 特性做「渐进增强」；
        <b>②<code>prefers-color-scheme</code> 是跟随系统，别用来做站内主题开关</b>（开关应该用 class + 变量）；
        <b>③动效一定要留 <code>prefers-reduced-motion</code> 的出口。</b>
      </p>
    </CssCard>

    <!-- ⑤ 响应式图片 -->
    <CssCard
      title="⑤ 响应式图片：不溢出、不变形"
      hint="切换 object-fit 并拖动容器高度：cover 裁掉多余部分，contain 一定会留下空白，fill 会拉伸变形。"
      :source="css.rules('.rs-im-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="fitValue">
          <option value="cover">object-fit: cover</option>
          <option value="contain">object-fit: contain</option>
          <option value="fill">object-fit: fill</option>
          <option value="none">object-fit: none</option>
          <option value="scale-down">object-fit: scale-down</option>
        </select>
        <label class="kv">容器高度 <input type="range" min="90" max="260" v-model.number="imgHeight" /> {{ imgHeight }}px</label>
      </template>

      <div class="rs-im-box" :style="{ height: imgHeight + 'px' }">
        <img class="rs-im-img" :src="demoImg" :style="{ objectFit: fitValue }" alt="示例图" />
      </div>
      <p class="kv" style="margin-top: 8px">容器 100% 宽 × {{ imgHeight }}px ｜ 原图 640×360</p>

      <p class="hint" style="margin-top: 10px">
        <code>max-width: 100%; height: auto;</code> 是内容图片的保命两行：
        宽度不超过容器（不撑破布局），高度按比例（不变形）。
        但图片进入「固定比例的框」（卡片封面、头像、Banner）时，就该换成
        <code>object-fit</code> 家族：<b>cover 铺满并裁切</b>（封面首选）、
        <b>contain 完整显示并留白</b>（图表、商品全景）、<b>fill 拉伸变形</b>（基本不要用）、
        <b>none 保持原始像素</b>（可能溢出裁剪）、<b>scale-down 取 none 与 contain 中更小的那个</b>。
        配合 <code>object-position</code> 可以决定裁切时保留哪一边。
      </p>

      <pre class="code" style="margin-top: 10px">/* 1) 普通内容图片：别溢出、别变形 */
img { max-width: 100%; height: auto; display: block }

/* 2) 固定比例的框：先用 aspect-ratio 占位，避免图片加载完成后页面跳动 */
.cover { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; object-position: center }

/* 3) 按屏幕宽度选图：srcset 给候选，sizes 告诉浏览器「它会被画多宽」 */
&lt;img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1600.jpg 1600w"
  sizes="(min-width: 900px) 800px, 100vw"
  width="800" height="450"
  alt="示例"
/&gt;

/* 4) 分辨率切换（同一张图给不同倍率，常用于 Retina 的固定尺寸图） */
&lt;img src="logo.png" srcset="logo.png 1x, logo@2x.png 2x" alt="Logo" /&gt;</pre>
      <p class="hint" style="margin-top: 8px">
        <b>为什么一定要写 <code>width</code> / <code>height</code> 或 <code>aspect-ratio</code>？</b>
        浏览器要提前留出位置，否则图片加载完会把下面的内容顶下去（CLS 布局跳动，直接影响体验和 SEO）。
      </p>
    </CssCard>

    <!-- ⑥ 容器查询 -->
    <CssCard
      title="⑥ 容器查询 @container：组件自己会看「爸妈给了多大地方」"
      hint="拖动容器宽度：卡片内部从「上下排列」切成「左图右文」，标题字号也连续变大 —— 全程没有一条媒体查询。"
      :source="css.rules('.rs-cq-', '@container')"
      tone="ok"
    >
      <template #extra>
        <label class="kv">容器宽度 <input type="range" min="260" max="760" step="10" v-model.number="cqWidth" /> {{ cqWidth }}px</label>
      </template>

      <div class="rs-cq-scroll">
        <div class="rs-cq-box" :style="{ width: cqWidth + 'px' }">
          <div class="rs-cq-card">
            <div class="rs-cq-thumb">图</div>
            <div>
              <p class="rs-cq-title">容器宽度决定我的样子</p>
              <p class="rs-cq-text">
                宽的时候我在右边、字号跟容器成比例；窄的时候我自动跑到下面去。
                同一个组件放进侧栏或主区域，都不需要写第二套样式。
              </p>
            </div>
          </div>
        </div>
      </div>

      <p class="hint" style="margin-top: 8px">
        注意：<code>@container</code> 比较的是容器的 <b>content box</b>（不含 padding / border），
        所以上例的虚线框要拖到约 490px 才会切换 —— 这也是排查「容器查询不生效」时必须确认的一点。
        另外别忘了父级那行 <code>container-type: inline-size</code>，少了它就没有查询容器。
      </p>

      <pre class="code" style="margin-top: 10px">/* 父级声明「我是查询容器」：只关心行内尺寸，最省性能 */
.rs-cq-box { container-type: inline-size; }

/* 默认（窄）：上下排列 */
.rs-cq-card { display: grid; grid-template-columns: 1fr; gap: 10px }

/* 容器自己够宽了，才切换成左右排列 —— 跟视口无关 */
@container (min-width: 460px) {
  .rs-cq-card { grid-template-columns: 120px 1fr }
}

/* 流体排版：clamp(最小值, 理想值, 最大值)，理想值用 cqi（容器宽度的 1%）*/
.rs-cq-title { font-size: clamp(15px, 5cqi, 24px) }</pre>

      <table style="margin-top: 12px">
        <thead>
          <tr><th>要解决的问题</th><th>用什么</th><th>为什么</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>页面整体骨架（几栏、导航折叠）</td>
            <td><code>@media</code></td>
            <td>它天生只认视口，正好对应「整页有多宽」</td>
          </tr>
          <tr>
            <td>组件内部的自我调整（卡片、列表项）</td>
            <td><b><code>@container</code></b></td>
            <td>组件不应该知道自己在页面的哪个位置；容器查询让它「看爸妈给多大地方」</td>
          </tr>
          <tr>
            <td>字号 / 间距随宽度平滑变化</td>
            <td><code>clamp()</code> + <code>vw</code> / <code>cqi</code></td>
            <td>连续变化，不用为每个中间宽度写断点</td>
          </tr>
          <tr>
            <td>容器查询的前提</td>
            <td colspan="2">
              父级必须写 <code>container-type: inline-size</code>（或用 <code>container</code> 简写），
              否则没有「查询容器」，<code>@container</code> 不会生效。命名容器用
              <code>container-name</code>，配合 <code>@container 名字 (min-width: …)</code> 可以指定查谁。
            </td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        实践顺序建议：<b>能用容器查询就用容器查询</b>（组件可复用、可拖拽、可嵌进任何位置），
        媒体查询留给「整页级别」的决策；两者不是替代关系，而是分工。
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

/* ---------- ① viewport ---------- */
.rs-vp-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}
.rs-vp-frame {
  min-width: 300px;
  padding: 8px;
  border: 3px solid var(--c-accent);
  border-radius: 14px;
  background: var(--c-surface-2);
  overflow-x: auto;
}
.rs-vp-bar {
  margin-bottom: 8px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--c-text-dim);
}
.rs-vp-fixed {
  width: 400px;
  margin-bottom: 8px;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(229, 83, 75, 0.85);
  color: #fff;
  font-size: 12.5px;
  font-family: var(--mono);
}
.rs-vp-fluid {
  width: 100%;
  padding: 12px 10px;
  border-radius: 8px;
  background: rgba(66, 184, 131, 0.85);
  color: #fff;
  font-size: 12.5px;
  font-family: var(--mono);
}

/* ---------- ② 媒体查询 ---------- */
.rs-mq-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}
.rs-mq-stage {
  display: grid;
  gap: 8px;
  padding: 8px;
  border: 2px dashed var(--c-info);
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.07);
}
.rs-mq-cell {
  padding: 14px 6px;
  border-radius: 8px;
  background: var(--c-info);
  color: #fff;
  font-family: var(--mono);
  font-size: 12.5px;
  text-align: center;
}

/* ---------- ③ iframe 沙盒 ---------- */
.rs-sb-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}
.rs-sb-frame {
  height: 250px;
  border: 2px solid var(--c-border);
  border-radius: 12px;
  background: #fff;
  display: block;
}

/* ---------- ④ 媒体特性 ---------- */
.rs-fe-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  border: 1px solid var(--c-border);
}
.rs-fe-yes {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: #fff;
}
.rs-fe-no {
  background: var(--c-surface-2);
  color: var(--c-text-dim);
}

/* ---------- ⑤ 图片 ---------- */
.rs-im-box {
  width: 100%;
  overflow: hidden;
  border-radius: 10px;
  border: 1px dashed var(--c-border);
  background: repeating-linear-gradient(
    45deg,
    rgba(59, 130, 246, 0.08),
    rgba(59, 130, 246, 0.08) 8px,
    transparent 8px,
    transparent 16px
  );
}
.rs-im-img {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---------- ⑥ 容器查询 ---------- */
.rs-cq-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}
.rs-cq-box {
  /* 关键的一行：告诉浏览器「这个盒子可以被查询」，
     inline-size 表示只跟踪宽度，开销最小 */
  container-type: inline-size;
  min-width: 260px;
  padding: 12px;
  border: 2px dashed var(--c-primary);
  border-radius: 12px;
  background: rgba(66, 184, 131, 0.07);
}
.rs-cq-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.rs-cq-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.5);
  font-family: var(--mono);
  font-size: 12.5px;
}
.rs-cq-title {
  /* cqi = 查询容器行内尺寸的 1%，跟 vw 一个道理，但看的是容器而不是视口 */
  font-size: clamp(15px, 5cqi, 24px);
  font-weight: 700;
  margin: 0 0 4px;
}
.rs-cq-text {
  margin: 0;
  font-size: 12.5px;
  color: var(--c-text-dim);
}

@container (min-width: 460px) {
  .rs-cq-card {
    grid-template-columns: 130px 1fr;
  }
}
</style>
