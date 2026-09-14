<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 13：Transform 与视觉特效
 *
 * transform 是「不改布局」的视觉变换：元素在文档流里占的位置不变，
 * 变的只是绘制结果 —— 所以它既能做动效（见上一页），也是各种视觉特效的地基。
 * 记住三条：
 *   1) 复合函数按书写顺序「从右往左」依次作用于坐标系，顺序不同结果不同；
 *   2) translate 的百分比相对「自身尺寸」，不是父容器；
 *   3) transform / filter / clip-path / mask 都会创建包含块（子元素 absolute 的参照会变）。
 */
const css = useStyleSource()

/* ---------- ① 基础函数 ---------- */
const tx = ref(30)
const scale = ref(1.2)
const rotate = ref(-12)
const skew = ref(0)

/* ---------- ② 顺序 ---------- */
const swapOrder = ref(false)

/* ---------- ③ origin / 3D ---------- */
const originKey = ref('center')
const originClassMap: Record<string, string> = {
  center: 'tf-origin-center',
  'top left': 'tf-origin-tl',
  'bottom right': 'tf-origin-br',
  'left center': 'tf-origin-lc',
}
const originClass = computed(() => originClassMap[originKey.value] ?? 'tf-origin-center')
const flipDeg = ref(120)
const showBack = ref(true)

/* ---------- ④ 滤镜 ---------- */
const blur = ref(2)
const bright = ref(1.1)
const contrast = ref(1)
const grayscale = ref(0)
const dropShadow = ref(true)
const useBackdrop = ref(true)
const bdBlur = ref(6)
const bdSaturate = ref(1.2)

/* ---------- ⑤ clip-path / mask / 混合模式 ---------- */
const clipKey = ref('polygon')
const clipClassMap: Record<string, string> = {
  none: 'tf-clip-none',
  circle: 'tf-clip-circle',
  ellipse: 'tf-clip-ellipse',
  polygon: 'tf-clip-polygon',
  hexagon: 'tf-clip-hexagon',
  inset: 'tf-clip-inset',
}
const clipClass = computed(() => clipClassMap[clipKey.value] ?? 'tf-clip-polygon')

/* ---------- ⑥ 实战特效 ---------- */
const fxTilt = ref(-14)
const spotX = ref(40)
const spotY = ref(35)
</script>

<template>
  <div>
    <h1>13. Transform 与视觉特效</h1>
    <p class="lead">
      <code>transform</code> 解决「元素长什么样、摆什么角度」，<code>filter</code> / <code>clip-path</code> /
      <code>mask</code> / <code>mix-blend-mode</code> 解决「看到的最终像素」。
      它们共同的特点是<strong>不触发重排</strong>，但要注意<strong>复合变换的顺序</strong>和
      <strong>它会成为子元素绝对定位的包含块</strong>。
    </p>

    <!-- ============ ① 基础函数 ============ -->
    <CssCard
      title="① 四个基础函数：translate / scale / rotate / skew"
      hint="拖动滑块改变每个函数的值，右侧灰色虚线框是元素「原来的位置和尺寸」，方便对比。"
      :source="css.rules('.tf-base')"
      tone="ok"
    >
      <template #extra>
        <label class="kv">translateX <input v-model.number="tx" type="range" min="-60" max="60" /> {{ tx }}px</label>
        <label class="kv">scale <input v-model.number="scale" type="range" min="0.5" max="1.8" step="0.05" /> {{ scale.toFixed(2) }}</label>
        <label class="kv">rotate <input v-model.number="rotate" type="range" min="-180" max="180" /> {{ rotate }}°</label>
        <label class="kv">skewX <input v-model.number="skew" type="range" min="-45" max="45" /> {{ skew }}°</label>
      </template>

      <div class="tf-base-stage">
        <div class="tf-base-ghost">原位</div>
        <div
          class="tf-base-box"
          :style="{ transform: `translateX(${tx}px) scale(${scale}) rotate(${rotate}deg) skewX(${skew}deg)` }"
        >
          变换中的盒子
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">.tf-base-box &#123;
  /* 不带单位的 0 可以省略单位；其余都要写单位 */
  transform: translateX(30px) scale(1.2) rotate(-12deg) skewX(0deg);

  /* 单轴写法：translate / scale / rotate 都有 X / Y / Z 版本 */
  /* transform: translate(10px, 20px)  两个值 = x, y */
  /* transform: scale(1.2, 0.8)        两个值 = x 方向, y 方向 */
&#125;

/* 三个必知事实 */
/* 1. transform 不改变文档流占位：兄弟元素不会给它让位（视觉重叠是常态） */
/* 2. 百分比相对「自身」尺寸：translateX(50%) = 自身宽度的一半 */
/* 3. 它会创建包含块：子元素 position:absolute 从此以它为参照，而不是更外层 */</pre>
    </CssCard>

    <!-- ============ ② 复合顺序 ============ -->
    <CssCard
      title="② 复合顺序：同样两个函数，换个顺序结果完全不同"
      hint="点开关切换书写顺序。左边的盒子先平移后旋转，右边的先旋转后平移 —— 一个是「绕自己转」，一个变成「绕原点公转」。"
      :source="css.rules('.tf-ord')"
      tone="warn"
    >
      <template #extra>
        <label class="kv"><input v-model="swapOrder" type="checkbox" /> 交换顺序</label>
      </template>

      <div class="tf-ord-stage">
        <div class="tf-ord-cell">
          <div class="tf-ord-frame">
            <div class="tf-ord-box tf-ord-a" :class="{ 'tf-ord-first': swapOrder }" />
          </div>
          <p class="kv">A：{{ swapOrder ? 'rotate(-30deg) translateX(60px)' : 'translateX(60px) rotate(-30deg)' }}</p>
          <p class="kv">→ {{ swapOrder ? '绕自身中心旋转后，再沿「旋转过的 X 轴」平移' : '先平移 60px，再绕新位置的中心旋转' }}</p>
        </div>
        <div class="tf-ord-cell">
          <div class="tf-ord-frame">
            <div class="tf-ord-box tf-ord-b" :class="{ 'tf-ord-first': swapOrder }" />
          </div>
          <p class="kv">B：{{ swapOrder ? 'translateX(60px) rotate(-30deg)' : 'rotate(-30deg) translateX(60px)' }}</p>
          <p class="kv">→ {{ swapOrder ? '先平移再旋转（结果与 A 互换）' : '旋转坐标系后平移，看起来像「绕着远处一个点公转」' }}</p>
        </div>
      </div>
      <pre class="code" style="margin-top: 10px">/* 变换函数是「矩阵乘法」，从左到右依次左乘 —— 越靠左的越后作用于坐标系。
   实操结论：把变换读成「从右往左依次执行」最不容易错。 */

/* A */ .a &#123; transform: translateX(60px) rotate(-30deg) &#125;  /* 先位移，后旋转 */
/* B */ .b &#123; transform: rotate(-30deg) translateX(60px) &#125;  /* 先旋转，后沿新轴位移 */

/* 最实用的两条经验：
   1) 想让元素「绕自己转」→ translate(-50%, -50%) 放在最右边之后不要混其他位移；
   2) 想单独调整某个方向 → 用 transform-origin，比在同一串里插 translate 更好维护。 */</pre>
    </CssCard>

    <!-- ============ ③ origin 与 3D ============ -->
    <CssCard
      title="③ transform-origin 与 3D：perspective / preserve-3d / backface-visibility"
      hint="左边选 origin（旋转支点），右边拖动角度做 Y 轴翻转并取消「显示背面」。"
      :source="css.rules('.tf-3d')"
    >
      <template #extra>
        <select v-model="originKey">
          <option value="center">origin: center</option>
          <option value="top left">origin: top left</option>
          <option value="bottom right">origin: bottom right</option>
          <option value="left center">origin: left center</option>
        </select>
        <label class="kv">rotateY <input v-model.number="flipDeg" type="range" min="-180" max="180" /> {{ flipDeg }}°</label>
        <label class="kv"><input v-model="showBack" type="checkbox" /> backface-visibility: visible</label>
      </template>

      <div class="tf-3d-row">
        <div class="tf-3d-panel">
          <p class="kv">transform-origin: <b>{{ originKey }}</b>（绕这个点旋转 45°）</p>
          <div class="tf-3d-frame">
            <div class="tf-3d-square" :class="originClass" />
          </div>
        </div>

        <div class="tf-3d-panel">
          <p class="kv">rotateY({{ flipDeg }}deg) ｜ perspective: 600px 在父级上</p>
          <div class="tf-3d-stage" :style="{ perspective: '600px' }">
            <div
              class="tf-3d-card"
              :class="{ 'tf-3d-hide-back': !showBack }"
              :style="{ transform: `rotateY(${flipDeg}deg)` }"
            >
              <span class="tf-3d-face tf-3d-front">正面</span>
              <span class="tf-3d-face tf-3d-back">背面</span>
            </div>
          </div>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* transform-origin：默认 50% 50%（元素中心），可写关键字或长度 */
.tf-3d-square &#123; transform: rotate(45deg); transform-origin: top left &#125;

/* 3D 的四件套 —— 缺一个都会「看起来不像 3D」 */
.tf-3d-stage &#123;
  perspective: 600px;        /* ① 视距，必须写在「父元素」上；越小透视越夸张 */
  perspective-origin: 50% 50%; /* 可选：视点位置 */
&#125;
.tf-3d-card &#123;
  transform-style: preserve-3d;   /* ② 让子元素保留自己的 3D 位置（默认 flat 会被拍平） */
  transform: rotateY(120deg);
  position: relative;
  transition: transform 400ms ease;
&#125;
.tf-3d-face &#123;
  position: absolute;
  inset: 0;
  backface-visibility: hidden;    /* ③ 不显示元素背面（做翻牌卡片必备） */
&#125;
.tf-3d-back &#123;
  transform: rotateY(180deg);     /* ④ 背面预先转 180°，正面朝后时它才正对观众 */
&#125;

/* 单元素 flip：也可以用 backface-visibility: hidden 让「转过 90° 后」直接看不见 */</pre>
    </CssCard>

    <!-- ============ ④ filter / backdrop-filter ============ -->
    <CssCard
      title="④ filter 与 backdrop-filter（毛玻璃）"
      hint="左边拖滑块看滤镜叠加；右边是毛玻璃面板，必须同时满足两件事：面板自己有半透明背景 + 底层有内容。"
      :source="css.rules('.tf-flt')"
    >
      <template #extra>
        <label class="kv">blur <input v-model.number="blur" type="range" min="0" max="10" step="0.5" /> {{ blur }}px</label>
        <label class="kv">brightness <input v-model.number="bright" type="range" min="0.4" max="2" step="0.05" /> {{ bright.toFixed(2) }}</label>
        <label class="kv">contrast <input v-model.number="contrast" type="range" min="0.5" max="2.5" step="0.05" /> {{ contrast.toFixed(2) }}</label>
        <label class="kv">grayscale <input v-model.number="grayscale" type="range" min="0" max="1" step="0.05" /> {{ grayscale.toFixed(2) }}</label>
        <label class="kv"><input v-model="dropShadow" type="checkbox" /> drop-shadow</label>
        <label class="kv"><input v-model="useBackdrop" type="checkbox" /> backdrop-filter</label>
        <label class="kv">毛玻璃 blur <input v-model.number="bdBlur" type="range" min="0" max="20" /> {{ bdBlur }}px</label>
        <label class="kv">毛玻璃 saturate <input v-model.number="bdSaturate" type="range" min="0.5" max="2.5" step="0.1" /> {{ bdSaturate.toFixed(1) }}</label>
      </template>

      <div class="tf-flt-row">
        <div class="tf-flt-box">
          <p class="kv" style="margin: 0 0 6px">
            filter: blur({{ blur }}px) brightness({{ bright.toFixed(2) }}) contrast({{ contrast.toFixed(2) }})
            grayscale({{ grayscale.toFixed(2) }}){{ dropShadow ? ' drop-shadow(0 6px 4px rgba(0,0,0,.35))' : '' }}
          </p>
          <div class="tf-flt-target">
            <img
              class="tf-flt-img"
              alt="滤镜示例图"
              :style="{ filter: `blur(${blur}px) brightness(${bright}) contrast(${contrast}) grayscale(${grayscale})${dropShadow ? ' drop-shadow(0 6px 4px rgba(0,0,0,.35))' : ''}` }"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='140'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2342b883'/%3E%3Cstop offset='0.5' stop-color='%233b82f6'/%3E%3Cstop offset='1' stop-color='%23d29922'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='140' fill='url(%23g)'/%3E%3Ccircle cx='70' cy='60' r='30' fill='%23ffffff' fill-opacity='0.75'/%3E%3Crect x='130' y='30' width='80' height='80' rx='12' fill='%23e5534b'/%3E%3C/svg%3E"
            />
          </div>
        </div>

        <div class="tf-flt-glass-wrap">
          <p class="kv" style="margin: 0 0 6px">
            backdrop-filter: {{ useBackdrop ? `blur(${bdBlur}px) saturate(${bdSaturate.toFixed(1)})` : '未启用（只有半透明背景）' }}
          </p>
          <div class="tf-flt-under">
            <span class="tf-flt-blob tf-flt-blob-a" />
            <span class="tf-flt-blob tf-flt-blob-b" />
            <span class="tf-flt-blob tf-flt-blob-c" />
            <div
              class="tf-flt-glass"
              :style="{
                backdropFilter: useBackdrop ? `blur(${bdBlur}px) saturate(${bdSaturate})` : 'none',
                WebkitBackdropFilter: useBackdrop ? `blur(${bdBlur}px) saturate(${bdSaturate})` : 'none',
              }"
            >
              <b>毛玻璃面板</b>
              <span class="kv">background: rgba(255,255,255,0.18) + backdrop-filter</span>
            </div>
          </div>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* filter：作用在「元素自己（含子孙）的画面上」，会创建包含块与合成层 */
.tf-flt-img &#123;
  filter: blur(2px) brightness(1.1) contrast(1) grayscale(0) drop-shadow(0 6px 4px rgba(0, 0, 0, 0.35));
&#125;
/* drop-shadow 与 box-shadow 的区别：前者跟随「不透明像素的轮廓」（png 图标、文字都行），
   后者只认元素的盒子。 */

/* backdrop-filter：作用在「元素背后已经绘制的内容」上，所以必须同时满足：
   ① 元素自己的背景是半透明的（否则看不到后面的东西，滤镜无从体现）；
   ② 它的背后真的有内容（纯色底看不出效果）。 */
.tf-flt-glass &#123;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(6px) saturate(1.2);
  -webkit-backdrop-filter: blur(6px) saturate(1.2);  /* Safari 仍需要前缀 */
&#125;

/* ⚠ 性能：filter / backdrop-filter 每帧都要重新计算，面积越大越贵。
   毛玻璃面板别做全屏，也别嵌套多层；能用 @supports 做降级更稳。 */
@supports not (backdrop-filter: blur(1px)) &#123;
  .tf-flt-glass &#123; background: rgba(255, 255, 255, 0.85) &#125;
&#125;</pre>
    </CssCard>

    <!-- ============ ⑤ clip-path / mask / mix-blend-mode ============ -->
    <CssCard
      title="⑤ clip-path 裁剪、mask 遮罩、mix-blend-mode 混合"
      hint="切换裁剪形状；下面的混合色块用 mix-blend-mode 与底图生成新颜色，右边演示 mask 渐变淡出。"
      :source="css.rules('.tf-clip')"
    >
      <template #extra>
        <select v-model="clipKey">
          <option value="none">不裁剪</option>
          <option value="circle">circle(45%)</option>
          <option value="ellipse">ellipse(45% 30%)</option>
          <option value="polygon">polygon 三角形</option>
          <option value="hexagon">polygon 六边形</option>
          <option value="inset">inset 圆角内缩</option>
        </select>
      </template>

      <div class="tf-clip-row">
        <div class="tf-clip-card" :class="clipClass">
          <img
            class="tf-clip-img"
            alt="裁剪示例图"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='180'%3E%3Crect width='240' height='180' fill='%23282c34'/%3E%3Ccircle cx='60' cy='50' r='34' fill='%2342b883'/%3E%3Crect x='110' y='20' width='110' height='60' rx='10' fill='%233b82f6'/%3E%3Crect x='20' y='110' width='200' height='50' rx='10' fill='%23d29922'/%3E%3C/svg%3E"
          />
        </div>
        <p class="kv">
          当前裁剪：<b>{{ clipKey }}</b> —— clip-path 只影响「看得见的部分」，
          元素仍然占原来的位置、仍然能接受点击（命中区域不裁剪）。
        </p>
      </div>

      <div class="tf-clip-row" style="margin-top: 12px">
        <div class="tf-blend-stage">
          <span class="tf-blend-base" />
          <span class="tf-blend-circle tf-blend-multiply" />
          <span class="tf-blend-circle tf-blend-screen" />
          <span class="tf-blend-circle tf-blend-difference" />
        </div>
        <div class="tf-mask-demo">
          <div class="tf-mask-target" />
          <p class="kv">
            上面：<code>mix-blend-mode</code>（multiply / screen / difference）。
            下面：<code>mask-image: linear-gradient(90deg, #000, transparent)</code> 让右侧自然淡出。
          </p>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* clip-path：用形状「裁掉」外面的像素。所有形状都支持百分比（相对元素自身） */
.tf-clip-circle  &#123; clip-path: circle(45%) &#125;
.tf-clip-ellipse &#123; clip-path: ellipse(45% 30% at 50% 50%) &#125;
.tf-clip-polygon &#123; clip-path: polygon(50% 0, 100% 100%, 0 100%) &#125;      /* 三角形 */
.tf-clip-hexagon &#123; clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%) &#125;
.tf-clip-inset   &#123; clip-path: inset(10% round 18px) &#125;                /* 内缩 + 圆角 */

/* 注意：clip-path 不改变布局尺寸，也不裁剪点击区域；
   想让「溢出的部分」真的不可点，还要配合 overflow: hidden 或 pointer-events。 */

/* mask：用「另一张图/渐变」的明度或 alpha 决定每个像素的可见度 */
.tf-mask-target &#123;
  background: linear-gradient(120deg, var(--c-primary), var(--c-info));
  /* 黑色 = 完全透明（alpha 用法里则是 alpha=0），白色 = 完全保留 */
  mask-image: linear-gradient(90deg, #000 0%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 100%);
&#125;

/* mix-blend-mode：让元素与「下方的背景」做色彩混合，和设计软件里的图层混合一致 */
.tf-blend-multiply   &#123; mix-blend-mode: multiply &#125;    /* 正片叠底：变暗 */
.tf-blend-screen     &#123; mix-blend-mode: screen &#125;      /* 滤色：变亮 */
.tf-blend-difference &#123; mix-blend-mode: difference &#125;  /* 差值：颜色反转感 */
/* ⚠ 会与父级层叠上下文相互作用：父级加 isolation: isolate 可以「关住」混合范围，
   否则它会一直混到页面背景，出现难以解释的颜色。 */</pre>
    </CssCard>

    <!-- ============ ⑥ 实战三连 ============ -->
    <CssCard
      title="⑥ 三个实战特效：3D 悬浮卡片 / 渐变光斑 / 毛玻璃面板"
      hint="拖动「倾斜角」和「光斑坐标」，三个成品效果都是前面几点的组合，样式源码就在下面的折叠区里。"
      :source="css.rules('.tf-fx')"
      tone="ok"
    >
      <template #extra>
        <label class="kv">悬浮倾斜 <input v-model.number="fxTilt" type="range" min="-30" max="30" /> {{ fxTilt }}°</label>
        <label class="kv">光斑 X <input v-model.number="spotX" type="range" min="0" max="100" /> {{ spotX }}%</label>
        <label class="kv">光斑 Y <input v-model.number="spotY" type="range" min="0" max="100" /> {{ spotY }}%</label>
      </template>

      <div class="tf-fx-grid">
        <!-- 3D 悬浮卡片 -->
        <div class="tf-fx-cell">
          <p class="kv">① 3D 悬浮卡片：perspective + preserve-3d + translateZ</p>
          <div class="tf-fx-persp">
            <div class="tf-fx-card" :style="{ transform: `rotateY(${fxTilt}deg) rotateX(4deg)` }">
              <span class="tf-fx-card-front">
                <b>Hover me</b>
                <span class="tf-fx-card-note">鼠标移上去（或看当前滑块角度）</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 渐变光斑 -->
        <div class="tf-fx-cell">
          <p class="kv">② 渐变光斑：多个径向渐变 + filter: blur()</p>
          <div class="tf-fx-spot" :style="{ '--tf-spot-x': spotX + '%', '--tf-spot-y': spotY + '%' }">
            <i class="tf-fx-glow" />
            <span class="tf-fx-spot-text">blur + radial-gradient</span>
          </div>
        </div>

        <!-- 毛玻璃面板 -->
        <div class="tf-fx-cell">
          <p class="kv">③ 毛玻璃面板：半透明背景 + backdrop-filter + 内描边</p>
          <div class="tf-fx-glass-wrap">
            <i class="tf-fx-glow-sm" />
            <div class="tf-fx-glass">
              <b>Glass panel</b>
              <span class="tf-fx-glass-note">rgba 背景 + blur(10px) + 1px 高光边框</span>
            </div>
          </div>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* ① 3D 悬浮卡片：父级给透视，卡片自己保留 3D，内容用 translateZ 抬起来产生层次 */
.tf-fx-persp &#123; perspective: 800px &#125;
.tf-fx-card &#123;
  transform-style: preserve-3d;
  transition: transform 300ms ease-out;   /* 用 transform 过渡，不触发重排 */
&#125;
.tf-fx-persp:hover .tf-fx-card &#123; transform: rotateY(0deg) rotateX(0deg) &#125;
.tf-fx-card-front &#123; transform: translateZ(30px) &#125;  /* 内容浮到卡片上方 */

/* ② 渐变光斑：一个绝对定位的圆 + 径向渐变 + 大半径模糊，用 mix-blend-mode 融入背景 */
.tf-fx-glow &#123;
  position: absolute;
  left: var(--tf-spot-x);
  top: var(--tf-spot-y);
  width: 160px;
  height: 160px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle at 50% 50%, rgba(66, 184, 131, 0.9), rgba(59, 130, 246, 0.35) 60%, transparent 70%);
  filter: blur(18px);
  mix-blend-mode: screen;
&#125;

/* ③ 毛玻璃面板：三层一起才像玻璃 —— 模糊、半透明底、1px 高光边 */
.tf-fx-glass &#123;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
&#125;</pre>
      <p class="hint" style="margin-top: 8px">
        这三个效果的共同点：<b>全部只用到 transform / filter / backdrop-filter</b>，
        没有任何一个属性会触发重排 —— 这就是「视觉特效不卡」的关键。
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

/* ---------- ① 基础函数 ---------- */
.tf-base-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  border-radius: 10px;
  background: var(--c-surface-2);
  overflow: hidden;
}
.tf-base-ghost {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 64px;
  border: 1px dashed var(--c-text-dim);
  border-radius: 8px;
  color: var(--c-text-dim);
  font-size: 12px;
}
.tf-base-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 64px;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-size: 12px;
  box-shadow: 0 6px 18px rgba(66, 184, 131, 0.35);
}

/* ---------- ② 复合顺序 ---------- */
.tf-ord-stage {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.tf-ord-cell {
  flex: 1 1 280px;
}
.tf-ord-frame {
  position: relative;
  height: 190px;
  border-radius: 10px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
  overflow: hidden;
}
.tf-ord-box {
  position: absolute;
  top: 63px;
  left: 20px;
  width: 64px;
  height: 64px;
  border-radius: 10px;
  background: var(--c-info);
}
.tf-ord-a {
  background: var(--c-info);
  transform: translateX(60px) rotate(-30deg);
}
.tf-ord-a.tf-ord-first {
  transform: rotate(-30deg) translateX(60px);
}
.tf-ord-b {
  background: var(--c-warn);
  transform: rotate(-30deg) translateX(60px);
}
.tf-ord-b.tf-ord-first {
  transform: translateX(60px) rotate(-30deg);
}

/* ---------- ③ origin 与 3D ---------- */
.tf-3d-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.tf-3d-panel {
  flex: 1 1 280px;
}
.tf-3d-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 170px;
  border-radius: 10px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
}
.tf-3d-square {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  background: var(--c-primary);
  transform: rotate(45deg);
  transform-origin: center;
}
.tf-origin-center {
  transform-origin: center;
}
.tf-origin-tl {
  transform-origin: top left;
}
.tf-origin-br {
  transform-origin: bottom right;
}
.tf-origin-lc {
  transform-origin: left center;
}
.tf-3d-stage {
  position: relative;
  height: 170px;
  border-radius: 10px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
  perspective: 600px;
}
.tf-3d-card {
  position: absolute;
  top: 35px;
  left: 50%;
  width: 150px;
  height: 100px;
  margin-left: -75px;
  transform-style: preserve-3d;
  transition: transform 250ms ease-out;
}
.tf-3d-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 13px;
  color: #fff;
  backface-visibility: hidden;
}
.tf-3d-front {
  background: linear-gradient(135deg, var(--c-primary), var(--c-primary-dark));
}
.tf-3d-back {
  background: linear-gradient(135deg, var(--c-warn), var(--c-danger));
  transform: rotateY(180deg);
}
/* backface-visibility 看不见的那一面靠 visibility 显式印证 */
.tf-3d-hide-back .tf-3d-back {
  visibility: hidden;
}

/* ---------- ④ 滤镜 ---------- */
.tf-flt-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.tf-flt-box,
.tf-flt-glass-wrap {
  flex: 1 1 300px;
}
.tf-flt-target {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  border-radius: 10px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
}
.tf-flt-img {
  width: 240px;
  height: 140px;
  border-radius: 10px;
  display: block;
}
.tf-flt-under {
  position: relative;
  height: 190px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--c-accent);
}
.tf-flt-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(18px);
}
.tf-flt-blob-a {
  top: -20px;
  left: -10px;
  width: 150px;
  height: 150px;
  background: var(--c-primary);
}
.tf-flt-blob-b {
  right: -30px;
  top: 30px;
  width: 170px;
  height: 170px;
  background: var(--c-info);
}
.tf-flt-blob-c {
  bottom: -40px;
  left: 90px;
  width: 150px;
  height: 150px;
  background: var(--c-warn);
}
.tf-flt-glass {
  position: absolute;
  top: 40px;
  left: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  backdrop-filter: blur(6px) saturate(1.2);
  -webkit-backdrop-filter: blur(6px) saturate(1.2);
}
.tf-flt-glass .kv {
  color: rgba(255, 255, 255, 0.85);
}

/* ---------- ⑤ clip-path / mask / 混合 ---------- */
.tf-clip-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.tf-clip-card {
  flex: 0 0 240px;
  width: 240px;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--c-surface-2);
}
.tf-clip-img {
  display: block;
  width: 240px;
  height: 180px;
}
.tf-clip-none {
  clip-path: none;
}
.tf-clip-circle {
  clip-path: circle(45%);
}
.tf-clip-ellipse {
  clip-path: ellipse(45% 30%);
}
.tf-clip-polygon {
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}
.tf-clip-hexagon {
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
}
.tf-clip-inset {
  clip-path: inset(10% round 18px);
}
.tf-blend-stage {
  position: relative;
  flex: 0 0 260px;
  width: 260px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  /* isolation 把混合模式「关」在这个容器内，避免混到页面背景 */
  isolation: isolate;
  background: var(--c-surface-2);
}
.tf-blend-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #2b6cb0, #b7791f);
}
.tf-blend-circle {
  position: absolute;
  top: 34px;
  width: 92px;
  height: 92px;
  border-radius: 50%;
}
.tf-blend-multiply {
  left: 12px;
  background: var(--c-primary);
  mix-blend-mode: multiply;
}
.tf-blend-screen {
  left: 84px;
  background: var(--c-primary);
  mix-blend-mode: screen;
}
.tf-blend-difference {
  left: 156px;
  background: var(--c-danger);
  mix-blend-mode: difference;
}
.tf-mask-demo {
  flex: 1 1 240px;
}
.tf-mask-target {
  height: 96px;
  border-radius: 12px;
  background: linear-gradient(120deg, var(--c-primary), var(--c-info));
  mask-image: linear-gradient(90deg, #000 0%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 100%);
}

/* ---------- ⑥ 实战特效 ---------- */
.tf-fx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}
.tf-fx-cell {
  padding: 10px;
  border-radius: 10px;
  background: var(--c-surface-2);
}
.tf-fx-persp {
  perspective: 800px;
  padding: 10px 0;
}
.tf-fx-card {
  width: 170px;
  margin: 0 auto;
  height: 110px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--c-accent), #101319);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  transition: transform 300ms ease-out;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
}
.tf-fx-persp:hover .tf-fx-card {
  transform: rotateY(0deg) rotateX(0deg) !important;
}
.tf-fx-card-front {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  transform: translateZ(30px);
}
.tf-fx-card-note {
  font-size: 11px;
  opacity: 0.8;
}
.tf-fx-spot {
  position: relative;
  height: 130px;
  border-radius: 12px;
  overflow: hidden;
  background: #14161c;
  isolation: isolate;
}
.tf-fx-glow {
  position: absolute;
  left: var(--tf-spot-x, 40%);
  top: var(--tf-spot-y, 35%);
  width: 150px;
  height: 150px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(66, 184, 131, 0.9), rgba(59, 130, 246, 0.35) 60%, transparent 72%);
  filter: blur(16px);
  mix-blend-mode: screen;
}
.tf-fx-spot-text {
  position: absolute;
  left: 10px;
  bottom: 8px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--mono);
}
.tf-fx-glass-wrap {
  position: relative;
  height: 130px;
  border-radius: 12px;
  overflow: hidden;
  background: #1d2430;
}
.tf-fx-glow-sm {
  position: absolute;
  inset: -40px;
  background: radial-gradient(circle at 30% 30%, rgba(210, 153, 34, 0.85), transparent 60%),
    radial-gradient(circle at 75% 70%, rgba(66, 184, 131, 0.85), transparent 55%);
  filter: blur(10px);
}
.tf-fx-glass {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 26px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.tf-fx-glass-note {
  font-size: 11px;
  opacity: 0.85;
}
</style>
