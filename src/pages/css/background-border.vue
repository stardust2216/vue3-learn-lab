<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 6：背景、边框与阴影
 *
 * 一句话总结这三个属性的分工：
 *   background → 铺在内容下面的「图层」，可以叠很多层
 *   border     → 真正占空间的框，圆角由 border-radius 控制
 *   box-shadow → 画在盒子外面（或里面）的阴影，不占空间，是最省事的「装饰」手段
 * 最容易踩的坑是「简写会重置所有子属性」，以及「阴影不占空间、也不接收鼠标事件」。
 */
const css = useStyleSource()

/* ---------- ① 背景分层 ---------- */
const layerAngle = ref(135)
const layerStyle = computed(() => ({ '--bg-layer-angle': layerAngle.value + 'deg' }))

/* ---------- ② background-size / position / repeat ---------- */
type SizeKey = 'auto' | 'cover' | 'contain' | '100% 100%' | '60px 40px'
type PosKey = 'center' | 'left top' | 'right bottom' | '20% 80%'
type RepKey = 'no-repeat' | 'repeat' | 'repeat-x'
const bgSize = ref<SizeKey>('auto')
const bgPos = ref<PosKey>('center')
const bgRep = ref<RepKey>('no-repeat')
const sizeNote = computed(
  () =>
    ({
      auto: 'auto：使用图片自身尺寸（示例图是 160×100）。',
      cover: 'cover：等比缩放到「完全盖住」容器，一定会裁掉一部分。',
      contain: 'contain：等比缩放到「完整放得下」，一定会留白。',
      '100% 100%': '100% 100%：宽高各自拉满容器 → 图片被拉伸变形。',
      '60px 40px': '60px 40px：写死尺寸，同样不保持比例。',
    })[bgSize.value],
)
const imgStyle = computed(() => ({
  backgroundSize: bgSize.value,
  backgroundPosition: bgPos.value,
  backgroundRepeat: bgRep.value,
}))

/* ---------- ③ border-radius ---------- */
const rtl = ref(16)
const rtr = ref(16)
const rbr = ref(16)
const rbl = ref(16)
const ellipse = ref(false)
const radiusStyle = computed(() => ({
  '--bg-r-tl': rtl.value + 'px',
  '--bg-r-tr': rtr.value + 'px',
  '--bg-r-br': rbr.value + 'px',
  '--bg-r-bl': rbl.value + 'px',
}))

/* ---------- ④ box-shadow ---------- */
const shX = ref(0)
const shY = ref(10)
const shBlur = ref(24)
const shSpread = ref(-6)
const shAlpha = ref(0.25)
const shInset = ref(false)
const shadowStyle = computed(() => ({
  boxShadow: `${shInset.value ? 'inset ' : ''}${shX.value}px ${shY.value}px ${shBlur.value}px ${shSpread.value}px rgba(15, 23, 42, ${shAlpha.value})`,
}))

/* ---------- ⑤ 渐变文字与渐变边框 ---------- */
const gradAngle = ref(90)
const gradStyle = computed(() => ({ '--bg-grad-angle': gradAngle.value + 'deg' }))
</script>

<template>
  <div>
    <h1>6. 背景、边框与阴影</h1>
    <p class="lead">
      这三个属性决定了「一个盒子看起来是什么样」。<strong>最该记住的一条是：简写（<code>background</code>、<code>border</code>）
      会把没写的子属性全部重置成初始值</strong>，所以顺序写错就会出现「我明明设了背景色却不见了」这类怪事。
      另外 <code>box-shadow</code> 不占布局空间、也不接收鼠标事件，用它代替边框能避免 1px 的布局跳动。
    </p>

    <CssCard
      title="① 背景可以叠很多层，以及简写的重置陷阱"
      hint="拖动角度看多层渐变叠出来的纹理；下面两个盒子是「同一份声明、只差顺序」的对比。"
      :source="css.rules('.bg-layer-')"
      tone="ok"
    >
      <div class="bg-layer-ctl">
        <label class="bg-ctl">渐变角度 <input type="range" min="0" max="360" v-model.number="layerAngle" /> {{ layerAngle }}deg</label>
      </div>

      <div class="bg-layer-box" :style="layerStyle">
        <p class="bg-layer-caption">三层背景：线性渐变 + 斜条纹 + 径向光斑</p>
      </div>

      <pre class="code" style="margin-top: 10px">
/* 多层背景：写在最前面的图层在最上面，逗号分隔。
   每一层都可以单独设 background-position / size / repeat / clip。 */
.hero {
  background-color: #f0f2f5;                      /* 颜色只有一层，写在最后面 */
  background-image:
    linear-gradient(135deg, rgba(66,184,131,.9), rgba(59,130,246,.9)),  /* 顶层 */
    repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 6px, transparent 6px 12px),
    radial-gradient(circle at 20% 20%, rgba(210,153,34,.85), transparent 60%); /* 底层 */
}

/* 简写会「重置」所有子属性（包括 background-color）→ 下面这行会丢掉红色 */
.box { background-color: red; background: linear-gradient(#0003, #0000) }

/* 简写里写 size 必须紧跟 position，并用斜杠分隔 */
.cover { background: url(hero.png) center / cover no-repeat }</pre
      >

      <div class="bg-layer-trap">
        <div class="bg-trap-a">
          <b>background-color 写在简写之前</b>
          <span>简写把 background-color 重置成 transparent → 颜色消失了</span>
        </div>
        <div class="bg-trap-b">
          <b>background-color 写在简写之后</b>
          <span>颜色保留，从半透明渐变里透出来</span>
        </div>
      </div>
    </CssCard>

    <CssCard
      title="② background-size / position / repeat 三件套"
      hint="切换三个下拉框，观察同一张图在 16:10 容器里的裁切与留白。"
      :source="css.rules('.bg-size-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="bgSize">
          <option value="auto">size: auto</option>
          <option value="cover">size: cover</option>
          <option value="contain">size: contain</option>
          <option value="100% 100%">size: 100% 100%</option>
          <option value="60px 40px">size: 60px 40px</option>
        </select>
        <select v-model="bgPos">
          <option value="center">position: center</option>
          <option value="left top">position: left top</option>
          <option value="right bottom">position: right bottom</option>
          <option value="20% 80%">position: 20% 80%</option>
        </select>
        <select v-model="bgRep">
          <option value="no-repeat">repeat: no-repeat</option>
          <option value="repeat">repeat: repeat</option>
          <option value="repeat-x">repeat: repeat-x</option>
        </select>
      </template>

      <div class="bg-size-stage">
        <div class="bg-size-box" :style="imgStyle"></div>
        <div class="bg-size-meter">
          <span class="bg-meter-tag">容器 480×220</span>
          <span class="bg-meter-tag">图片 160×100（比例 1.6 : 1）</span>
          <span class="bg-meter-tag">容器比例约 2.2 : 1</span>
        </div>
      </div>
      <p class="kv">{{ sizeNote }}</p>
      <p class="hint" style="margin-top: 6px">
        <b>cover 与 contain 都保持比例，区别只在「宁可裁掉」还是「宁可留白」</b>。
        百分比是「相对容器的可用区域」：<code>100% 100%</code> 等于两个方向分别拉满，所以比例会被破坏。
        百分比定位也不是「相对剩余空间」，而是「图片自身的 (容器 − 图片) 那部分距离」——
        所以 <code>background-position: 100% 100%</code> 正好把图片右下角贴到容器右下角。
      </p>
    </CssCard>

    <CssCard
      title="③ border-radius：四角独立与椭圆圆角"
      hint="四个滑块分别控制四个角；勾选后切换成 50% / 30% 的椭圆圆角。"
      :source="css.rules('.bg-radius-')"
    >
      <template #extra>
        <label class="bg-ctl"><input type="checkbox" v-model="ellipse" /> 椭圆圆角 50% / 30%</label>
      </template>

      <div class="bg-radius-ctl">
        <label class="bg-ctl">左上 <input type="range" min="0" max="80" v-model.number="rtl" /> {{ rtl }}px</label>
        <label class="bg-ctl">右上 <input type="range" min="0" max="80" v-model.number="rtr" /> {{ rtr }}px</label>
        <label class="bg-ctl">右下 <input type="range" min="0" max="80" v-model.number="rbr" /> {{ rbr }}px</label>
        <label class="bg-ctl">左下 <input type="range" min="0" max="80" v-model.number="rbl" /> {{ rbl }}px</label>
      </div>

      <div class="bg-radius-stage">
        <div class="bg-radius-box" :class="{ 'bg-radius-ellipse': ellipse }" :style="radiusStyle">
          border-radius
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">
/* 四个角：从左上开始顺时针，可以只写 1~4 个值 */
.a { border-radius: 12px }                          /* 四角相同 */
.b { border-radius: 12px 40px }                     /* 左上+右下 12，右上+左下 40 */
.c { border-radius: 40px 20px 0 20px }              /* 顺时针：左上 右上 右下 左下 */

/* 斜杠语法：斜杠前是水平半径，斜杠后是垂直半径 → 得到椭圆角 */
.d { border-radius: 50% / 30% }                     /* 水平半径 = 50% 宽，垂直半径 = 30% 高 */
.e { border-radius: 120px 20px 120px 20px / 60px 20px } /* 每个角都可以分别指定两个方向 */

/* 百分比是「分别相对宽和高」算的，所以 border-radius: 50% 只有在正方形上才是正圆 */</pre
      >
    </CssCard>

    <CssCard
      title="④ box-shadow：多层、inset 与「阴影当边框用」"
      hint="拖动 X/Y/模糊/扩散/透明度，勾选 inset 看内阴影；注意盒子本身尺寸完全没变。"
      :source="css.rules('.bg-shadow-')"
      tone="ok"
    >
      <template #extra>
        <label class="bg-ctl"><input type="checkbox" v-model="shInset" /> inset（内阴影）</label>
      </template>

      <div class="bg-shadow-ctl">
        <label class="bg-ctl">X <input type="range" min="-30" max="30" v-model.number="shX" /> {{ shX }}px</label>
        <label class="bg-ctl">Y <input type="range" min="-30" max="30" v-model.number="shY" /> {{ shY }}px</label>
        <label class="bg-ctl">blur <input type="range" min="0" max="60" v-model.number="shBlur" /> {{ shBlur }}px</label>
        <label class="bg-ctl">spread <input type="range" min="-30" max="30" v-model.number="shSpread" /> {{ shSpread }}px</label>
        <label class="bg-ctl">alpha <input type="range" min="0" max="1" step="0.05" v-model.number="shAlpha" /> {{ shAlpha }}</label>
      </div>

      <div class="bg-shadow-stage">
        <div class="bg-shadow-box" :style="shadowStyle">box-shadow</div>
        <div class="bg-shadow-multi">多层阴影：一层贴地的暗边 + 一层扩散的柔光</div>
        <div class="bg-shadow-ring">0 0 0 4px 的实心阴影 —— 当 focus 圈 / 选中扩散用</div>
      </div>

      <pre class="code" style="margin-top: 10px">
/* box-shadow: x偏移 y偏移 模糊半径 扩散半径 颜色, 第二层, ... */
.card { box-shadow: 0 1px 2px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.08) }

/* 扩散半径为 0、模糊为 0 → 得到一圈实心「外扩」，等价于加粗的边框但不占空间 */
.focus-ring { box-shadow: 0 0 0 4px rgba(66,184,131,.28) }

/* inset：阴影画在盒子内部（在背景之上、内容之下），常用来做「内凹」的输入框 */
.inset { box-shadow: inset 0 2px 6px rgba(0,0,0,.2) }

/* 阴影不占空间、不接收指针事件 → 用阴影代替 1px 边框，hover 时不会引起布局跳动 */
.ghost { border: 1px solid transparent; box-shadow: 0 0 0 1px rgba(0,0,0,.12) }</pre
      >
      <p class="hint" style="margin-top: 6px">
        <b>性能提醒</b>：模糊半径很大的阴影，每次重绘都要重新算一遍。做动画时不要直接动
        <code>box-shadow</code>，改成给伪元素加阴影、只动 <code>opacity</code> / <code>transform</code>。
      </p>
    </CssCard>

    <CssCard
      title="⑤ 渐变文字与渐变边框（两种实现）"
      hint="拖动角度滑块：三处渐变会同时转向，它们共用同一个 CSS 变量。"
      :source="css.rules('.bg-clip-')"
    >
      <div class="bg-clip-ctl">
        <label class="bg-ctl">渐变角度 <input type="range" min="0" max="360" v-model.number="gradAngle" /> {{ gradAngle }}deg</label>
      </div>

      <div class="bg-clip-stage" :style="gradStyle">
        <p class="bg-clip-text-demo">渐变文字 Gradient Text</p>

        <div class="bg-clip-border-a">
          <b>做法 A：padding-box + border-box 两层背景</b>
          <span>用 border: 4px solid transparent 留出边框位置，再用两层 background-clip 分别铺内容区和边框区</span>
        </div>

        <div class="bg-clip-border-b">
          <b>做法 B：伪元素 + mask-composite</b>
          <span>伪元素铺满整个盒子铺渐变，再用 mask 把中间「挖空」，只留一圈边</span>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">
/* 渐变文字：背景裁剪到文字形状，再把文字颜色变透明 */
.grad-text {
  background-image: linear-gradient(90deg, #42b883, #3b82f6);
  -webkit-background-clip: text;   /* Chrome / Safari 需要前缀 */
  background-clip: text;
  color: transparent;              /* 忘了这句就看不到渐变，只看到普通文字 */
}

/* 渐变边框 A：两层背景，分别裁到 padding-box 和 border-box */
.grad-border-a {
  border: 4px solid transparent;
  border-radius: 12px;
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, #42b883, #3b82f6) border-box;
}

/* 渐变边框 B：伪元素铺满 + mask 挖空中间（背景可以保持透明） */
.grad-border-b { position: relative; border-radius: 12px }
.grad-border-b::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  padding: 4px;                                   /* 这一圈就是边框厚度 */
  background: linear-gradient(90deg, #42b883, #3b82f6);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;                           /* 别挡住下面的点击 */
}</pre
      >
      <p class="hint" style="margin-top: 6px">
        顺便说清 <code>background-attachment</code>：<code>scroll / fixed / local</code> 控制背景跟着谁滚。
        <code>fixed</code> 在移动端（尤其 iOS Safari）长期不按「视口固定」处理，效果不可靠 ——
        <b>除非在做视差并且能亲自测过移动端，否则别用</b>；背景跟随滚动容器请用 <code>local</code>。
      </p>
    </CssCard>

    <CssCard title="⑥ 速查表与常见坑" tone="warn">
      <table>
        <thead>
          <tr><th>属性</th><th>常用值</th><th>要点</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>background-color</code></td>
            <td>颜色 / 渐变函数</td>
            <td>只有一层，永远在所有 <code>background-image</code> 图层的最下面</td>
          </tr>
          <tr>
            <td><code>background-image</code></td>
            <td><code>url()</code> / 渐变函数，逗号分层</td>
            <td>写在前面的层在上面；每层可单独设 position / size / repeat / clip</td>
          </tr>
          <tr>
            <td><code>background-size</code></td>
            <td>cover / contain / 长度 / 百分比</td>
            <td>cover 裁切、contain 留白；百分比不保持比例</td>
          </tr>
          <tr>
            <td><code>background-position</code></td>
            <td>center / 关键字 / 百分比 / 长度</td>
            <td>百分比是「图片超出容器的那部分距离」的百分比，不是剩余空间</td>
          </tr>
          <tr>
            <td><code>background-clip</code></td>
            <td>border-box / padding-box / content-box / text</td>
            <td>控制背景画到哪一层；<code>text</code> 用于渐变文字，需要 <code>color: transparent</code></td>
          </tr>
          <tr>
            <td><code>background-attachment</code></td>
            <td>scroll / fixed / local</td>
            <td>移动端对 <code>fixed</code> 支持不可靠，谨慎使用</td>
          </tr>
          <tr>
            <td><code>border</code></td>
            <td><code>1px solid var(--c-border)</code></td>
            <td>会撑大盒子（除非 box-sizing: border-box）；样式必须写，否则宽度无效</td>
          </tr>
          <tr>
            <td><code>border-radius</code></td>
            <td>1~4 个值 / <code>水平 / 垂直</code></td>
            <td>百分比分别相对宽高；四角可写成椭圆角</td>
          </tr>
          <tr>
            <td><code>box-shadow</code></td>
            <td><code>x y blur spread 颜色, 多层</code></td>
            <td>不占空间、不接受指针事件、不触发滚动；inset 画在背景之上内容之下</td>
          </tr>
          <tr>
            <td><code>outline</code></td>
            <td><code>2px solid</code> + <code>outline-offset</code></td>
            <td>不占空间、可以画在边框外面、能跟随圆角；做 focus 态最合适</td>
          </tr>
        </tbody>
      </table>

      <ol class="bg-pit">
        <li><b>简写会重置子属性</b>：<code>background: red</code> 之后写 <code>background-image</code> 没问题，但反过来先写 image 再写 <code>background: red</code>，图片就没了；<code>border</code> 简写同理（还会把 border-image 重置）。</li>
        <li><b>background-size 写不进简写</b>：必须紧跟 position 并用斜杠分隔 —— <code>background: url(a.png) center / cover no-repeat</code>。</li>
        <li><b>渐变文字看不见</b>：忘了 <code>color: transparent</code>，或者忘了 <code>-webkit-background-clip: text</code>。另外 <code>background-clip: text</code> 只裁剪背景，不裁剪子元素。</li>
        <li><b>border-radius + overflow: hidden</b> 会裁掉所有溢出的子元素（包括绝对定位的角标），还会创建 BFC，可能影响 <code>position: sticky</code> 和 margin 折叠。</li>
        <li><b>用阴影代替边框不会跳动</b>：border 会改变盒子尺寸，阴影不会 → hover 加边框导致布局抖动时，换成 <code>box-shadow</code> 或预留 transparent 边框。</li>
        <li><b>focus 可见性别关掉</b>：<code>outline: none</code> 一定要配一个替代方案（<code>:focus-visible</code> + 阴影或边框色），否则键盘用户完全看不到焦点在哪。</li>
        <li><b>大模糊阴影的动画很贵</b>：每一帧都要重新模糊；改用伪元素 + <code>opacity</code> 过渡。</li>
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

/* 控制器通用样式 */
.bg-ctl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--c-text-dim);
  white-space: nowrap;
}
.bg-ctl input[type='range'] {
  width: 106px;
}

/* ① 背景分层 */
.bg-layer-ctl {
  margin-bottom: 8px;
}
.bg-layer-box {
  height: 150px;
  border-radius: 12px;
  background-color: var(--c-surface-2);
  background-image:
    linear-gradient(
      var(--bg-layer-angle, 135deg),
      rgba(66, 184, 131, 0.9),
      rgba(59, 130, 246, 0.9)
    ),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.22) 0 6px, transparent 6px 12px),
    radial-gradient(circle at 20% 20%, rgba(210, 153, 34, 0.85), transparent 60%);
}
.bg-layer-caption {
  margin: 0;
  padding: 8px 10px;
  color: #fff;
  font-size: 13px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
.bg-layer-trap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.bg-trap-a,
.bg-trap-b {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--c-text);
}
.bg-trap-a b,
.bg-trap-b b {
  display: block;
  font-family: var(--mono);
  font-size: 12px;
  margin-bottom: 4px;
}
.bg-trap-a span,
.bg-trap-b span {
  color: var(--c-text-dim);
}
/* 简写在 background-color 之后 → 颜色被重置成 transparent */
.bg-trap-a {
  background-color: var(--c-warn);
  background: linear-gradient(rgba(66, 184, 131, 0.5), rgba(59, 130, 246, 0.5));
}
/* 简写在 background-color 之前 → 颜色保留，透过半透明渐变显出来 */
.bg-trap-b {
  background: linear-gradient(rgba(66, 184, 131, 0.5), rgba(59, 130, 246, 0.5));
  background-color: var(--c-warn);
}

/* ② background-size / position / repeat */
.bg-size-stage {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.bg-size-box {
  width: 480px;
  max-width: 100%;
  height: 220px;
  border: 2px dashed var(--c-info);
  border-radius: 10px;
  background-color: var(--c-surface-2);
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='160'%20height='100'%3E%3Crect%20width='160'%20height='100'%20fill='%2394a3b8'/%3E%3Ccircle%20cx='80'%20cy='50'%20r='30'%20fill='%23f8fafc'/%3E%3Ctext%20x='80'%20y='55'%20font-size='16'%20text-anchor='middle'%20fill='%231f2328'%3E160x100%3C/text%3E%3C/svg%3E");
}
.bg-size-meter {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bg-meter-tag {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--c-text-dim);
  background: var(--c-surface-2);
  border-radius: 6px;
  padding: 4px 8px;
}

/* ③ border-radius */
.bg-radius-ctl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 12px;
}
.bg-radius-stage {
  padding: 14px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: var(--c-surface-2);
}
.bg-radius-box {
  width: 200px;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 13px;
  color: #fff;
  background: linear-gradient(135deg, rgba(66, 184, 131, 0.95), rgba(59, 130, 246, 0.95));
  border-top-left-radius: var(--bg-r-tl, 16px);
  border-top-right-radius: var(--bg-r-tr, 16px);
  border-bottom-right-radius: var(--bg-r-br, 16px);
  border-bottom-left-radius: var(--bg-r-bl, 16px);
}
/* 同一个元素上的第二个类，写在后面 → 单独类选择器同权重时覆盖上面的四角声明 */
.bg-radius-ellipse {
  border-radius: 50% / 30%;
}

/* ④ box-shadow */
.bg-shadow-ctl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 12px;
}
.bg-shadow-stage {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  padding: 18px 20px;
  border-radius: 10px;
  background: var(--c-surface-2);
}
.bg-shadow-box {
  width: 170px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--c-surface);
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--c-text-dim);
}
.bg-shadow-multi {
  width: 200px;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--c-surface);
  font-size: 12.5px;
  color: var(--c-text-dim);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08);
}
.bg-shadow-ring {
  width: 200px;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--c-surface);
  font-size: 12.5px;
  color: var(--c-text-dim);
  box-shadow: 0 0 0 4px rgba(66, 184, 131, 0.28);
}

/* ⑤ 渐变文字与渐变边框 */
.bg-clip-ctl {
  margin-bottom: 10px;
}
.bg-clip-stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 10px;
  background: var(--c-surface-2);
}
.bg-clip-text-demo {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 1px;
  background-image: linear-gradient(
    var(--bg-grad-angle, 90deg),
    var(--c-primary),
    var(--c-info),
    var(--c-warn)
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.bg-clip-border-a {
  border: 4px solid transparent;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  background:
    linear-gradient(var(--c-surface), var(--c-surface)) padding-box,
    linear-gradient(var(--bg-grad-angle, 90deg), var(--c-primary), var(--c-info)) border-box;
}
.bg-clip-border-b {
  position: relative;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--c-text-dim);
  background: var(--c-surface);
}
.bg-clip-border-b::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 4px;
  background: linear-gradient(
    var(--bg-grad-angle, 90deg),
    var(--c-primary),
    var(--c-info)
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
.bg-clip-border-a b,
.bg-clip-border-b b {
  display: block;
  color: var(--c-text);
  font-size: 13px;
  margin-bottom: 2px;
}

/* ⑥ 坑清单 */
.bg-pit {
  margin: 12px 0 0;
  padding-left: 22px;
  font-size: 13px;
  line-height: 1.9;
}
.bg-pit li {
  margin-bottom: 4px;
}
</style>
