<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 12：过渡与动画
 *
 * 一句话区分：
 *   transition = A 状态 → B 状态的「补间」，由属性值变化触发，只有两个端点；
 *   animation  = 用 @keyframes 描述时间轴，可以自己播放、循环、往返，不依赖状态变化。
 *
 * 本页所有演示的样式都在 <style scoped> 里真实存在，
 * 所以「查看 CSS 源码」显示的就是此刻生效的代码。
 */
const css = useStyleSource()

/* ==== ① 四要素：property / duration / timing-function / delay ==== */
const d1 = ref(false)
const dur = ref(600)
const delay = ref(0)
/** 下拉框的 value 是缓动关键字，class 是静态类名（scoped 只认静态类名） */
const easeKey = ref('ease-in-out')
const easeClassMap: Record<string, string> = {
  linear: 'ta-e-linear',
  ease: 'ta-e-ease',
  'ease-in': 'ta-e-in',
  'ease-out': 'ta-e-out',
  'ease-in-out': 'ta-e-inout',
}
const easeClass = computed(() => easeClassMap[easeKey.value] ?? 'ta-e-ease')

/* ==== ③ 多属性分别设置 ==== */
const d3 = ref(false)

/* ==== ④ @keyframes 与 animation 子属性 ==== */
const d4 = ref(true)
const aDur = ref(1200)
const aRepeat = ref(3)
const aInfinite = ref(false)
const aDir = ref('normal')
const aPaused = ref(false)
/** 只有「无限循环」时才换成另一个 animation-name，避免每次改设置都重启动画 */
const animIter = computed(() => (aInfinite.value ? 'infinite' : String(aRepeat.value)))

/* ==== ⑤ 性能对比 ==== */
const perfDur = ref(1400)
const perfRun = ref(false)
const perfContain = ref(false)
const dist = ref(220)

/* ==== ⑥ 降级演示 ==== */
const a11yReduce = ref(false)

/** 合成的 animation 简写文本，便于对照「哪个值对应哪个子属性」 */
const animShorthand = computed(
  () =>
    `ta-slide ${aDur.value}ms ease-in-out 0ms ` +
    `${aInfinite.value ? 'infinite' : aRepeat.value} ${aDir.value} both`,
)
</script>

<template>
  <div>
    <h1>12. 过渡与动画</h1>
    <p class="lead">
      过渡（transition）和动画（animation）解决的是同一个问题的两个层次：
      <strong>状态之间的小变化用 transition，需要自己播放/循环/多关键帧的用 animation</strong>。
      而两者共同的性能原则只有一条：<strong>只动 <code>transform</code> 和 <code>opacity</code></strong>。
    </p>

    <!-- ============ ① 四要素 ============ -->
    <CssCard
      title="① transition 四要素：property / duration / timing-function / delay"
      hint="点按钮切换状态。下面四个滑块/下拉框直接改真实生效的 transition，慢速播放更容易看清差别。"
      :source="css.rules('.ta-')"
      tone="ok"
    >
      <template #extra>
        <label class="kv">duration <input v-model.number="dur" type="range" min="100" max="2000" step="50" /> {{ dur }}ms</label>
        <label class="kv">delay <input v-model.number="delay" type="range" min="0" max="1000" step="50" /> {{ delay }}ms</label>
        <select v-model="easeKey">
          <option value="linear">linear</option>
          <option value="ease">ease（默认）</option>
          <option value="ease-in">ease-in</option>
          <option value="ease-out">ease-out</option>
          <option value="ease-in-out">ease-in-out</option>
        </select>
      </template>

      <div class="ta-stage" :style="{ '--ta-shift': '180px', '--ta-ms': dur + 'ms' }">
        <div class="ta-track">
          <span class="ta-track-label">起点</span>
          <span class="ta-track-label ta-track-label-end">终点</span>
        </div>
        <div
          class="ta-dot"
          :class="[easeClass, { 'is-end': d1 }]"
          :style="{ transitionDuration: dur + 'ms', transitionDelay: delay + 'ms' }"
        />
      </div>

      <div class="ta-row">
        <button class="ta-btn" type="button" @click="d1 = !d1">{{ d1 ? '回到起点' : '移动到终点' }}</button>
        <span class="kv">
          transition: transform <b>{{ dur }}ms</b> {{ easeKey }} <b>{{ delay }}ms</b>
          ｜ 当前状态：{{ d1 ? '终点（is-end）' : '起点' }}
        </span>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>要素</th><th>作用</th><th>常用取值</th></tr>
        </thead>
        <tbody>
          <tr><td><code>transition-property</code></td><td>要补间的属性名</td><td><code>transform</code> / <code>opacity</code> / <code>all</code>（慎用）</td></tr>
          <tr><td><code>transition-duration</code></td><td>走完全程用多久</td><td>UI 反馈 120～200ms，位移 250～400ms</td></tr>
          <tr><td><code>transition-timing-function</code></td><td>速度曲线</td><td><code>ease</code> / <code>ease-out</code> / <code>cubic-bezier()</code></td></tr>
          <tr><td><code>transition-delay</code></td><td>等多久才开始，可写负值</td><td>错峰入场 0～200ms；负值 = 从中途开始</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        简写的顺序不敏感（第一个「时间」是 duration，第二个才是 delay），但
        <b>把 duration 误写成 delay（只写一个时间）会让动画看起来「根本没动」</b> —— 排查时优先检查这一项。
      </p>
    </CssCard>

    <!-- ============ ② 缓动对比 ============ -->
    <CssCard
      title="② 同一段位移，不同 timing-function 的手感"
      hint="把鼠标移到每条轨道上：同一个「左端 → 右端」位移，只有缓动函数不同。"
      :source="css.rules('.ta-ease-')"
      tone="warn"
    >
      <div class="ta-ease-list">
        <div class="ta-ease-row">
          <span class="ta-ease-name">linear</span>
          <div class="ta-ease-bar"><i class="ta-ease-dot ta-ease-linear" /></div>
          <span class="ta-ease-desc">匀速，机械感，适合进度条 / 转圈</span>
        </div>
        <div class="ta-ease-row">
          <span class="ta-ease-name">ease</span>
          <div class="ta-ease-bar"><i class="ta-ease-dot ta-ease-default" /></div>
          <span class="ta-ease-desc">浏览器默认，两端略慢，通用</span>
        </div>
        <div class="ta-ease-row">
          <span class="ta-ease-name">ease-in</span>
          <div class="ta-ease-bar"><i class="ta-ease-dot ta-ease-in" /></div>
          <span class="ta-ease-desc">慢启动 → 快结束，适合「元素离场」</span>
        </div>
        <div class="ta-ease-row">
          <span class="ta-ease-name">ease-out</span>
          <div class="ta-ease-bar"><i class="ta-ease-dot ta-ease-out" /></div>
          <span class="ta-ease-desc">快启动 → 慢结束，适合「元素入场」</span>
        </div>
        <div class="ta-ease-row">
          <span class="ta-ease-name">ease-in-out</span>
          <div class="ta-ease-bar"><i class="ta-ease-dot ta-ease-inout" /></div>
          <span class="ta-ease-desc">两端都慢，最「顺滑」，适合来回移动</span>
        </div>
        <div class="ta-ease-row">
          <span class="ta-ease-name">cubic-bezier(.34,1.56,.64,1)</span>
          <div class="ta-ease-bar"><i class="ta-ease-dot ta-ease-back" /></div>
          <span class="ta-ease-desc">回弹（y 超出 1，会冲过头再回来）</span>
        </div>
        <div class="ta-ease-row">
          <span class="ta-ease-name">steps(6, end)</span>
          <div class="ta-ease-bar"><i class="ta-ease-dot ta-ease-steps" /></div>
          <span class="ta-ease-desc">逐帧跳变，适合 sprite 帧动画 / 打字机</span>
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        规律：<b>入场用 ease-out、离场用 ease-in、来回移动用 ease-in-out</b>；
        <code>cubic-bezier()</code> 的 x 必须在 0～1 之间（控制时间），y 可以超出 0～1（产生回弹）。
      </p>
    </CssCard>

    <!-- ============ ③ 多属性分别设置 ============ -->
    <CssCard
      title="③ 简写与多属性分别设置：一次点击，四种属性各走各的速度"
      hint="transition 可以写多组、用逗号分隔。下面这张卡片的四个属性故意给了不同的时长和曲线。"
      :source="css.rules('.ta-mul')"
    >
      <div class="ta-mul-box" :class="{ 'is-end': d3 }">
        <span class="ta-mul-title">多属性过渡</span>
        <span class="ta-mul-sub">背景 700ms ease｜圆角 250ms ease-out｜位移 500ms cubic-bezier 回弹｜阴影 900ms linear</span>
      </div>
      <div class="ta-row">
        <button class="ta-btn" type="button" @click="d3 = !d3">{{ d3 ? '还原' : '触发' }}</button>
      </div>
      <pre class="code" style="margin-top: 10px">/* 简写（全部属性都用同一条曲线） */
.btn { transition: all 200ms ease }

/* 多组写法：逗号分隔，每组只管一个属性 —— 推荐这样写 */
.card {
  transition:
    background-color 700ms ease,
    border-radius 250ms ease-out,
    transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 900ms linear;
}

/* ⚠ all 的代价：会让「布局属性」也参与过渡（例如 width、height），
   还会意外过渡到不该动的东西（字体大小、颜色继承）。
   只写真正要动的属性，是最省性能也最可控的写法。 */</pre>
      <table style="margin-top: 10px">
        <thead>
          <tr><th>属性</th><th>能否过渡</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td><code>opacity</code> / <code>color</code> / <code>background-color</code></td><td>✅</td><td>颜色与透明度可插值</td></tr>
          <tr><td><code>transform</code> / <code>filter</code></td><td>✅</td><td>可插值，且不触发重排（transform 走合成层）</td></tr>
          <tr><td><code>width</code> / <code>height</code>（有确定数值时）</td><td>✅ 但会重排</td><td>能用 <code>transform: scale()</code> 就优先用它</td></tr>
          <tr><td><code>height: auto</code> ↔ 具体值</td><td>❌</td><td>auto 不是长度，无法插值。现代解法见下一行</td></tr>
          <tr><td><code>grid-template-rows: 0fr → 1fr</code></td><td>✅</td><td>现代浏览器可插值，所以「折叠面板」改用它最优雅</td></tr>
          <tr><td><code>display</code></td><td>❌</td><td>离散属性（现代浏览器配合 <code>transition-behavior: allow-discrete</code> 才能过渡，兼容性仍需注意）</td></tr>
          <tr><td><code>position</code> / <code>z-index</code>(整数之间)</td><td>❌ / ✅</td><td>position 不可过渡；z-index 可插值但会创建大量合成层，实际别用</td></tr>
        </tbody>
      </table>
    </CssCard>

    <!-- ============ ④ @keyframes ============ -->
    <CssCard
      title="④ @keyframes 与 animation 各子属性"
      hint="点「播放一次」重启动画；再改下面的重复次数、方向（direction）、暂停（play-state），实时看差别。"
      :source="css.rules('.ta-anim-')"
    >
      <template #extra>
        <label class="kv">duration <input v-model.number="aDur" type="range" min="300" max="3000" step="100" /> {{ aDur }}ms</label>
        <label class="kv">iteration <input v-model.number="aRepeat" type="range" min="1" max="6" :disabled="aInfinite" /> {{ aInfinite ? '∞' : aRepeat }}</label>
        <label class="kv"><input v-model="aInfinite" type="checkbox" /> 无限循环</label>
        <select v-model="aDir">
          <option value="normal">normal</option>
          <option value="reverse">reverse</option>
          <option value="alternate">alternate</option>
          <option value="alternate-reverse">alternate-reverse</option>
        </select>
        <button class="ta-btn" type="button" @click="aPaused = !aPaused">{{ aPaused ? '继续' : '暂停' }}</button>
      </template>

      <div class="ta-anim-stage">
        <div
          v-show="d4"
          class="ta-anim-marker"
          :class="aInfinite ? 'ta-anim-keep' : 'ta-anim-count'"
          :title="'animation: ' + animShorthand + (aPaused ? ' paused' : '')"
          :style="{
            display: 'block',
            animationDuration: aDur + 'ms',
            animationIterationCount: animIter,
            animationDirection: aDir,
            animationPlayState: aPaused ? 'paused' : 'running',
          }"
        >
          {{ aDir }}｜{{ aPaused ? 'paused' : 'running' }}
        </div>
      </div>
      <div class="ta-row">
        <button class="ta-btn" type="button" @click="d4 = false">隐藏（再播一次）</button>
        <button class="ta-btn" type="button" @click="d4 = true">播放</button>
      </div>

      <p class="kv" style="margin-top: 8px">
        等价于：animation: <b>ta-slide</b> {{ aDur }}ms <b>ease-in-out</b> 0ms
        <b>{{ aInfinite ? 'infinite' : aRepeat }}</b> <b>{{ aDir }}</b> <b>both</b>；
        play-state = <b>{{ aPaused ? 'paused' : 'running' }}</b>
      </p>
      <pre class="code" style="margin-top: 10px">/* 定义关键帧：0% 可以写成 from，100% 可以写成 to */
@keyframes ta-slide &#123;
  from &#123; transform: translateX(0) &#125;
  to   &#123; transform: translateX(calc(100% - 28px)) &#125;   /* 百分比相对「自身尺寸」计算 */
&#125;

/* 使用：animation 简写 = name duration timing-function delay
   iteration-count direction fill-mode play-state */
.ta-anim-marker &#123;
  animation: ta-slide 1200ms ease-in-out 0ms 3 normal both running;
&#125;

/* 关键子属性的作用 —— 不要背默认值，记住「什么时候需要它」 */
/* animation-fill-mode: none | forwards | backwards | both
   none      → 播完立刻回到「原始样式」（最常见的「闪一下」原因）
   forwards  → 停在最后一帧（做「播放完保持」）
   backwards → 延迟期间先呈现第一帧
   both      → 两头都保持，入场动画几乎总是用它 */
/* animation-direction: normal | reverse | alternate | alternate-reverse
   alternate → 奇偶次正反交替，做「来回摆动」不必写两组关键帧 */
/* animation-play-state: running | paused
   paused → 冻结在当前帧，可以做「悬停暂停」「加载可暂停」 */</pre>
      <p class="hint" style="margin-top: 8px">
        注意最后一条：<b>先设 <code>display: none</code> 再改 <code>animation-name</code>，元素出现时动画才会从头播</b>。
        只改 <code>animation</code>（不先隐藏）不会重启已经在跑的动画。
      </p>
    </CssCard>

    <!-- ============ ⑤ 性能 ============ -->
    <CssCard
      title="⑤ 性能友好的动画属性：为什么只用 transform / opacity"
      hint="两条轨道同步动画：上面只改 transform，下面改 width + left。拖长时长、打开「限制重排范围」，再用 DevTools 的 Paint flashing 看差别。"
      :source="css.rules('.ta-perf-')"
      tone="warn"
    >
      <template #extra>
        <label class="kv">duration <input v-model.number="perfDur" type="range" min="400" max="4000" step="100" /> {{ perfDur }}ms</label>
        <label class="kv">距离 <input v-model.number="dist" type="range" min="80" max="320" step="20" /> {{ dist }}px</label>
        <label class="kv"><input v-model="perfContain" type="checkbox" /> contain: layout paint</label>
        <button class="ta-btn" type="button" @click="perfRun = !perfRun">{{ perfRun ? '停止' : '开始' }}</button>
      </template>

      <div class="ta-perf-stage" :class="{ 'is-contained': perfContain }" :style="{ '--ta-perf-dist': dist + 'px' }">
        <div class="ta-perf-row">
          <span class="ta-perf-tag ta-perf-good">transform + opacity</span>
          <div class="ta-perf-track">
            <i class="ta-perf-marker-gpu" :class="{ 'is-run': perfRun }" :style="{ animationDuration: perfDur + 'ms' }" />
          </div>
        </div>
        <div class="ta-perf-row">
          <span class="ta-perf-tag ta-perf-bad">left + width</span>
          <div class="ta-perf-track">
            <i class="ta-perf-marker-layout" :class="{ 'is-run': perfRun }" :style="{ animationDuration: perfDur + 'ms' }" />
          </div>
        </div>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>属性</th><th>触发的阶段</th><th>代价</th></tr>
        </thead>
        <tbody>
          <tr><td><code>transform</code> / <code>opacity</code> / <code>filter</code></td><td>仅 Composite（合成）</td><td>最低，可以在 GPU 上完成，不重排不重绘</td></tr>
          <tr><td><code>background-color</code> / <code>box-shadow</code> / <code>color</code></td><td>Repaint（重绘）</td><td>中等，局部重绘，元素几何不变</td></tr>
          <tr><td><code>width / height / top / left / margin / padding / font-size</code></td><td>Layout（重排）</td><td>最高，每帧都要重新算布局，容易掉帧</td></tr>
        </tbody>
      </table>

      <pre class="code" style="margin-top: 10px">/* 常见错误：用 left/top 做位移 —— 每帧都触发 Layout */
.ta-perf-marker-layout &#123;
  animation: ta-perf-layout 1400ms linear infinite;
&#125;
@keyframes ta-perf-layout &#123;
  from &#123; left: 0; width: 26px &#125;
  to   &#123; left: calc(var(--ta-perf-dist) - 26px); width: 26px &#125;
&#125;

/* 推荐：位移用 transform，透明度用 opacity —— 只走合成 */
.ta-perf-marker-gpu &#123;
  animation: ta-perf-gpu 1400ms linear infinite;
&#125;
@keyframes ta-perf-gpu &#123;
  from &#123; transform: translateX(0); opacity: 0.35 &#125;
  to   &#123; transform: translateX(calc(var(--ta-perf-dist) - 26px)); opacity: 1 &#125;
&#125;

/* will-change：提前告诉浏览器「这个元素马上要动」，让它先提升合成层。
   ⚠ 正确用法是「即将动画前挂上，动画结束后摘掉」；
   写死在样式表里 = 长期占用显存，元素多了反而更卡。 */
.card:hover &#123; will-change: transform &#125;          /* ✅ 可接受 */
.card &#123; will-change: transform, opacity, filter &#125; /* ❌ 无脑全开 */

/* contain：告诉浏览器「这个子树和外面互不影响」，把重排/重绘关在盒子里。
   比 will-change 更安全，适合列表项、卡片、滚动容器。 */
.ta-perf-stage.is-contained &#123;
  contain: layout paint;
&#125;</pre>
    </CssCard>

    <!-- ============ ⑥ 无障碍 + 速查 ============ -->
    <CssCard
      title="⑥ prefers-reduced-motion：把动效做成「可关闭」的"
      hint="勾选下方开关：演示容器加上一个降级类，动画被压到 0.01ms（保留状态变化、去掉位移），避免前庭失调用户不适。"
      :source="css.rules('.ta-motion')"
    >
      <template #extra>
        <label class="kv"><input v-model="a11yReduce" type="checkbox" /> 模拟「系统已开启减弱动效」</label>
      </template>

      <div class="ta-motion-demo" :class="{ 'is-reduced': a11yReduce }">
        <div class="ta-motion-item">❋</div>
        <p class="kv">
          当前：<b>{{ a11yReduce ? '已降级（无位移、无旋转）' : '正常动效' }}</b>
        </p>
      </div>

      <pre class="code" style="margin-top: 10px">/* 尊重系统设置：把「装饰性动效」关掉，但保留可感知的状态反馈 */
@media (prefers-reduced-motion: reduce) &#123;
  .ta-motion-demo *,
  .ta-motion-demo *::before,
  .ta-motion-demo *::after &#123;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  &#125;
&#125;

/* 注意：不要用 display:none 或 animation:none 一刀切 ——
   过渡常常承担「状态反馈」的职责，压到 0.01ms 而不是删掉，
   用户依然能看到颜色/位置的变化，只是不再有长时间位移。 */</pre>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>需求</th><th>用 transition</th><th>用 animation</th></tr>
        </thead>
        <tbody>
          <tr><td>状态切换（hover / focus / class 变化）</td><td>✅ 首选，一行搞定</td><td>过度设计</td></tr>
          <tr><td>循环播放（loading、呼吸灯）</td><td>❌ 做不到</td><td>✅</td></tr>
          <tr><td>多于两个端点（多段路径）</td><td>❌ 只能 A↔B</td><td>✅ 多个关键帧</td></tr>
          <tr><td>需要暂停 / 反向 / 播放次数</td><td>❌</td><td>✅ play-state / direction / iteration-count</td></tr>
          <tr><td>元素刚挂载就要播（无状态变化）</td><td>❌ 需要额外触发</td><td>✅ 加载即播</td></tr>
          <tr><td>JS 随时改目标值，浏览器自动补间</td><td>✅</td><td>要重启动画才能改</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        排查动效问题的顺序：① 属性到底能不能过渡（<code>display</code>、<code>height:auto</code> 不行）→
        ② duration/delay 是否写反 → ③ 属性值是否真的变了（例如两个 class 的 <code>transform</code> 相同）→
        ④ 是否被 <code>animation-fill-mode: none</code> 拉回原样。
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

/* ==== 通用小件 ==== */
.ta-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 10px;
}
.ta-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--c-primary);
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
}
.ta-btn:hover {
  background: var(--c-primary-dark);
}

/* ==== ① 四要素 ==== */
.ta-stage {
  position: relative;
  padding: 16px 12px 12px;
  border-radius: 10px;
  background: var(--c-surface-2);
}
.ta-track {
  position: relative;
  height: 44px;
  border-radius: 8px;
  border: 1px dashed var(--c-border);
  background: var(--c-surface);
}
.ta-track-label {
  position: absolute;
  top: 2px;
  left: 6px;
  font-size: 11px;
  color: var(--c-text-dim);
  font-family: var(--mono);
}
.ta-track-label-end {
  left: auto;
  right: 6px;
}
.ta-dot {
  position: absolute;
  top: 22px;
  left: 12px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 2px 8px rgba(66, 184, 131, 0.45);
  /* transition-property 写在这里，duration/delay/timing 由控制台决定 */
  transition-property: transform;
  transition-timing-function: ease-in-out;
}
.ta-dot.is-end {
  transform: translateX(var(--ta-shift, 180px));
}
.ta-e-linear {
  transition-timing-function: linear;
}
.ta-e-ease {
  transition-timing-function: ease;
}
.ta-e-in {
  transition-timing-function: ease-in;
}
.ta-e-out {
  transition-timing-function: ease-out;
}
.ta-e-inout {
  transition-timing-function: ease-in-out;
}

/* ==== ② 缓动对比（悬停整行即可播放） ==== */
.ta-ease-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ta-ease-row {
  display: grid;
  grid-template-columns: 190px 1fr 240px;
  gap: 10px;
  align-items: center;
  padding: 3px 6px;
  border-radius: 6px;
}
.ta-ease-row:hover {
  background: var(--c-surface-2);
}
.ta-ease-name {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--c-text-dim);
}
.ta-ease-desc {
  font-size: 12px;
  color: var(--c-text-dim);
}
.ta-ease-bar {
  position: relative;
  height: 22px;
  border-radius: 999px;
  background: var(--c-surface-2);
}
.ta-ease-dot {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--c-info);
}
.ta-ease-row:hover .ta-ease-dot {
  transform: translateX(290px);
}
.ta-ease-linear {
  transition: transform 1600ms linear;
}
.ta-ease-default {
  transition: transform 1600ms ease;
}
.ta-ease-in {
  transition: transform 1600ms ease-in;
}
.ta-ease-out {
  transition: transform 1600ms ease-out;
}
.ta-ease-inout {
  transition: transform 1600ms ease-in-out;
}
.ta-ease-back {
  transition: transform 1600ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ta-ease-steps {
  transition: transform 1600ms steps(6, end);
}

/* ==== ③ 多属性分别设置 ==== */
.ta-mul-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 240px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--c-border);
  background: var(--c-surface-2);
  color: var(--c-text);
  /* 四组过渡分别设置：时长、曲线都不同，一眼看出「各自独立」 */
  transition:
    background-color 700ms ease,
    border-radius 250ms ease-out,
    transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 900ms linear;
}
.ta-mul-box.is-end {
  background: var(--c-primary);
  color: #fff;
  border-radius: 32px;
  transform: translateX(160px) scale(1.06);
  box-shadow: 0 10px 24px rgba(66, 184, 131, 0.38);
}
.ta-mul-title {
  font-weight: 600;
  font-size: 14px;
}
.ta-mul-sub {
  font-size: 11.5px;
  opacity: 0.85;
}

/* ==== ④ @keyframes ==== */
.ta-anim-stage {
  position: relative;
  height: 76px;
  border-radius: 10px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
  overflow: hidden;
}
.ta-anim-marker {
  position: absolute;
  top: 22px;
  left: 4px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--c-accent);
  color: #fff;
  font-size: 9px;
  line-height: 1.1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
/* 两个类用同一个关键帧、不同的 animation-name：
   切换类名 = 换名字 = 浏览器重新开始播动画（只改 duration 不会重启） */
.ta-anim-count {
  animation: ta-slide 1200ms ease-in-out 0ms 3 normal both;
}
.ta-anim-keep {
  animation: ta-keep 1200ms ease-in-out 0ms infinite normal both;
}
@keyframes ta-slide {
  from {
    transform: translateX(0) rotate(0deg);
  }
  to {
    transform: translateX(calc(100% - 28px)) rotate(180deg);
  }
}
/* 无限循环用的名字：改 animation-name 才会重新开始播放 */
@keyframes ta-keep {
  from {
    transform: translateX(0) rotate(0deg);
  }
  to {
    transform: translateX(calc(100% - 28px)) rotate(180deg);
  }
}

/* ==== ⑤ 性能 ==== */
.ta-perf-stage {
  padding: 12px;
  border-radius: 10px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
}
/* contain: 把布局/绘制的影响限制在这个子树内，外部不受牵连 */
.ta-perf-stage.is-contained {
  contain: layout paint;
}
.ta-perf-row {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}
.ta-perf-tag {
  font-family: var(--mono);
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 999px;
  text-align: center;
}
.ta-perf-good {
  background: rgba(66, 184, 131, 0.18);
  color: var(--c-primary-dark);
}
.ta-perf-bad {
  background: rgba(229, 83, 75, 0.15);
  color: var(--c-danger);
}
.ta-perf-track {
  position: relative;
  height: 26px;
  border-radius: 6px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
}
.ta-perf-marker-gpu {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--c-primary);
  opacity: 0.4;
}
.ta-perf-marker-gpu.is-run {
  animation: ta-perf-gpu 1400ms linear infinite;
}
@keyframes ta-perf-gpu {
  from {
    transform: translateX(0);
    opacity: 0.4;
  }
  to {
    transform: translateX(calc(var(--ta-perf-dist) - 20px));
    opacity: 1;
  }
}
.ta-perf-marker-layout {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--c-danger);
  opacity: 0.4;
}
.ta-perf-marker-layout.is-run {
  animation: ta-perf-layout 1400ms linear infinite;
}
@keyframes ta-perf-layout {
  from {
    left: 3px;
    width: 20px;
  }
  to {
    left: calc(var(--ta-perf-dist) - 20px);
    width: 20px;
  }
}

/* ==== ⑥ 无障碍降级 ==== */
.ta-motion-demo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--c-surface-2);
}
.ta-motion-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--c-primary);
  color: #fff;
  font-size: 18px;
  animation: ta-breathe 1600ms ease-in-out infinite alternate;
}
@keyframes ta-breathe {
  from {
    transform: translateX(0) rotate(0deg);
    opacity: 0.6;
  }
  to {
    transform: translateX(80px) rotate(180deg);
    opacity: 1;
  }
}
/* 手动模拟「系统已开减弱动效」：压到 0.01ms，保留状态变化但去掉长时间位移 */
.ta-motion-demo.is-reduced .ta-motion-item {
  animation-duration: 0.01ms;
  animation-iteration-count: 1;
}
@media (prefers-reduced-motion: reduce) {
  .ta-motion-item {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
}
.ta-motion-demo .kv {
  margin: 0;
}
</style>
