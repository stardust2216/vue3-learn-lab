<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 10：定位与层叠
 *
 * 定位只需要问三个问题：
 *   1) 这个元素还占原来的位置吗？（relative 占，absolute / fixed 不占）
 *   2) 它的 top/left 是相对谁算的？（包含块：最近的「定位祖先」/ 视口 / 最近的滚动容器）
 *   3) 它画在谁上面？（z-index，但只在同一个层叠上下文里比较 —— 这是 90% 的「z-index 无效」的根因）
 */
const css = useStyleSource()

// ---------- ① 三个常用值的对比 ----------
const posValue = ref<'static' | 'relative' | 'absolute'>('relative')

const posText = computed(() => {
  if (posValue.value === 'static')
    return 'static：什么偏移都不生效（top/left 被忽略），元素老老实实待在正常流里。'
  if (posValue.value === 'relative')
    return 'relative：相对「自己原来的位置」偏移，原位置仍然占着 —— 所以 B 动了，A、C 不动，中间会留出空洞。'
  return 'absolute：完全脱离文档流，原位置被后面的元素顶上来（C 会往上跑），偏移相对最近的定位祖先。'
})

// ---------- ② 包含块 ----------
const parentRelative = ref(true)

const cbText = computed(() =>
  parentRelative.value
    ? '内层 .ps-cb-parent 是 position: relative → 它是「最近的定位祖先」，absolute 子元素相对它定位。'
    : '内层是 position: static（不算定位祖先）→ 往上找到外层的 .ps-cb-stage 才停，子元素跳到外层左上角。',
)

// ---------- ③ fixed 与 sticky ----------
const stickyOn = ref(true)
const stickyTop = ref(0)

const stickyCode = computed(
  () => `.ps-st-scroll {
  height: 200px;
  overflow: auto;          /* 必须有一个「滚动祖先」，sticky 才有地方可粘 */
}
.ps-st-th {
  position: ${stickyOn.value ? 'sticky' : 'static'};
  top: ${stickyTop.value}px;${stickyOn.value ? '   /* 阈值：滑到距顶部这个距离时开始粘住 */' : '   /* static 时 top 毫无意义 */'}
  z-index: 2;              /* 让表头盖住下面的行 */
  background: var(--c-accent);
}`,
)

// ---------- ④ 层叠上下文 ----------
const parentCtx = ref(true)
const childZ = ref(9999)

const zText = computed(() =>
  parentCtx.value
    ? `父级有 transform → 形成层叠上下文。子元素的 z-index: ${childZ.value} 只在「父级内部」比大小，
       而父级这一层相对外部元素的层级是 0（z-index: auto），外部元素是 1 —— 所以子元素永远压不过外部元素。`
    : `父级没有形成层叠上下文 → 子元素的 z-index: ${childZ.value} 直接在根上下文里参与比较，
       压过外部元素的 z-index: 1。`,
)

// ---------- ⑤ 居中 ----------
const centerMode = ref<'inset' | 'transform' | 'wrong' | 'flex'>('inset')
const centerSize = ref(90)
const centerText = computed(() => {
  if (centerMode.value === 'inset') return 'inset: 0 + margin: auto：四边都设 0，auto margin 平分两侧空间 —— 尺寸随便改都居中。'
  if (centerMode.value === 'transform') return 'top/left: 50% + translate(-50%, -50%)：先挪到 50%，再把自己的一半挪回来。'
  if (centerMode.value === 'wrong') return '少了 translate(-50%, -50%)：元素的左上角在中心，整体偏右下 —— 这就是「居中偏了」的经典原因。'
  return '父级 display: flex + align-items/justify-content: center：不需要子元素知道自己的尺寸，最省心。'
})
</script>

<template>
  <div>
    <h1>10. 定位与层叠</h1>
    <p class="lead">
      定位的本质是两件事：<strong>这个元素还占位置吗</strong>，以及<strong>它的 top/left 相对谁算</strong>。
      而 <code>z-index</code> 的第一句话是：<strong>它只在同一个层叠上下文里比大小</strong> ——
      父级一旦形成层叠上下文，子元素写 <code>z-index: 9999</code> 也出不去。
    </p>

    <!-- ① 三个值对比 -->
    <CssCard
      title="① static / relative / absolute：占不占位置，是第一个分水岭"
      hint="三个盒子的 top/left 从头到尾没变，只切换 B 的 position —— 看 A、C 会不会被影响。"
      :source="css.rules('.ps-pos-')"
      tone="ok"
    >
      <template #extra>
        <label class="kv"
          >B 的 position
          <select v-model="posValue">
            <option value="static">static</option>
            <option value="relative">relative</option>
            <option value="absolute">absolute</option>
          </select>
        </label>
      </template>

      <p class="kv">{{ posText }}</p>
      <div class="ps-pos-stage">
        <span class="ps-pos-tag">虚线框 = 最近的定位祖先</span>
        <div class="ps-pos-flow">A（正常流）</div>
        <div
          class="ps-pos-target"
          :class="{
            'ps-pos-static': posValue === 'static',
            'ps-pos-relative': posValue === 'relative',
            'ps-pos-absolute': posValue === 'absolute',
          }"
        >
          B（top: 26px; left: 30px）
        </div>
        <div class="ps-pos-flow">C（正常流）</div>
      </div>
      <p class="hint" style="margin-top: 8px">
        <b>relative 是「相对自己原来的位置」</b>，所以它可以当定位参照物，而<b>不会破坏周围布局</b>；
        <b>absolute 是「相对最近的定位祖先」</b>，并且彻底脱离文档流（父级会塌高，这是「父元素高度为 0」的元凶）。
      </p>
    </CssCard>

    <!-- ② 包含块 -->
    <CssCard
      title="② absolute 的包含块：最近的「定位祖先」"
      hint="切换内层父级的 position，子元素会在两个虚线框之间跳 —— 它找的是最近的定位祖先，不是「父元素」。"
      :source="css.rules('.ps-cb-')"
      tone="warn"
    >
      <template #extra>
        <label class="kv"><input type="checkbox" v-model="parentRelative" /> 内层父级 position: relative</label>
      </template>

      <p class="kv">{{ cbText }}</p>
      <div class="ps-cb-stage">
        <span class="ps-cb-tag">外层 .ps-cb-stage（position: relative）</span>
        <div
          class="ps-cb-parent"
          :class="{ 'ps-cb-parent-rel': parentRelative, 'ps-cb-parent-static': !parentRelative }"
        >
          <span class="ps-cb-tag">内层 .ps-cb-parent</span>
          <div class="ps-cb-child">absolute<br />top: 16px; left: 16px</div>
        </div>
        <div class="ps-cb-slot">外层的另一个普通元素</div>
      </div>
      <p class="hint" style="margin-top: 8px">
        三个要点：<b>①只有 position 不是 static 的元素才算「定位祖先」</b>（relative 最常用，因为它不改变布局）；
        <b>②偏移量相对包含块的 padding box</b>（不含 border 外侧）；
        <b>③如果一路往上都没有定位祖先，包含块就是初始包含块（≈ 文档视口）</b> ——
        这就是「明明写在小盒子里，元素却跑到页面角落」的原因。
      </p>
    </CssCard>

    <!-- ③ fixed 与 sticky -->
    <CssCard
      title="③ fixed 与视口 · sticky 粘性表头"
      hint="在下面的框里滚动：表头会粘在顶部。调 top 阈值和开关，看 sticky 条件被破坏后会怎样。"
      :source="css.rules('.ps-st-', '.ps-fx-')"
    >
      <template #extra>
        <label class="kv"><input type="checkbox" v-model="stickyOn" /> position: sticky</label>
        <label class="kv">top <input type="range" min="0" max="40" v-model.number="stickyTop" /> {{ stickyTop }}px</label>
      </template>

      <div class="ps-st-scroll">
        <table class="ps-st-table">
          <thead>
            <tr>
              <th class="ps-st-th" :class="{ 'ps-st-on': stickyOn, 'ps-st-off': !stickyOn }" :style="{ top: stickyTop + 'px' }">
                姓名
              </th>
              <th class="ps-st-th" :class="{ 'ps-st-on': stickyOn, 'ps-st-off': !stickyOn }" :style="{ top: stickyTop + 'px' }">
                城市
              </th>
              <th class="ps-st-th" :class="{ 'ps-st-on': stickyOn, 'ps-st-off': !stickyOn }" :style="{ top: stickyTop + 'px' }">
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in 12" :key="n">
              <td>成员 {{ n }}</td>
              <td>城市 {{ n }}</td>
              <td>{{ n % 3 === 0 ? '休息中' : '在线' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="kv" style="margin-top: 12px">sticky 生效的四个条件（缺一个就退化成 relative）：</p>
      <ol style="margin: 4px 0 0; padding-left: 20px; font-size: 13px">
        <li>必须写 <code>top / bottom / left / right</code> 里的<b>至少一个阈值</b>，否则没有「粘住」的判定线；</li>
        <li>必须有一个<b>可滚动的祖先</b>（这里是 <code>height + overflow: auto</code> 的盒子），页面滚动也算；</li>
        <li>祖先不能是 <code>overflow: hidden</code>（它会成为滚动容器但滚不动，sticky 就废了）；</li>
        <li>元素在滚动方向上要有<b>可移动的余地</b>：父容器高度 = 自身高度时它无处可粘。</li>
      </ol>

      <p class="kv" style="margin-top: 12px">fixed：相对「视口」定位，滚到哪都跟着走</p>
      <div class="ps-fx-mock">
        <span class="ps-fx-tag">视口模拟区（这就是 fixed 的「参照系」）</span>
        <div class="ps-fx-fixed">position: fixed<br />top: 10px; right: 10px</div>
        <p class="ps-fx-body">
          真实页面里 fixed 相对<b>视口</b>，滚动时纹丝不动（回到顶部按钮、漂浮客服就是这么做的）。
        </p>
      </div>
      <p class="hint" style="margin-top: 8px">
        ⚠️ 这里为了不遮挡整页，给模拟区加了一句 <code>transform: translate(0)</code> ——
        <b>祖先只要有 transform / filter / perspective / will-change / contain，fixed 的参照系就从视口变成那个祖先</b>。
        很多「弹窗位置莫名其妙」的 bug 都出自这一条。
      </p>
      <pre class="code" style="margin-top: 10px">{{ stickyCode }}</pre>
    </CssCard>

    <!-- ④ 层叠上下文 -->
    <CssCard
      title="④ z-index: 9999 也不生效的真实复现"
      hint="黄色是父级的子元素，蓝色是父级外面的元素。切换父级的 transform，再把子元素 z-index 拉到 9999。"
      :source="css.rules('.ps-z-')"
      tone="warn"
    >
      <template #extra>
        <label class="kv">子元素 z-index <input type="range" min="1" max="9999" v-model.number="childZ" /> {{ childZ }}</label>
        <label class="kv"><input type="checkbox" v-model="parentCtx" /> 父级 transform: translateZ(0)</label>
      </template>

      <div class="ps-z-stage">
        <div class="ps-z-parent" :class="{ 'ps-z-parent-ctx': parentCtx }">
          <span class="ps-z-label">父级（虚线）</span>
          <div class="ps-z-child" :style="{ zIndex: String(childZ) }">
            子元素<br />z-index: {{ childZ }}
          </div>
        </div>
        <div class="ps-z-out">外部元素<br />z-index: 1</div>
      </div>

      <p class="kv" style="margin-top: 10px">{{ zText }}</p>
      <p class="hint" style="margin-top: 8px">
        把子元素拖到 9999 也没用，因为 <code>z-index</code> 是<b>层叠上下文内部</b>的排序号：
        子元素再大，也只能在父级那一层里排队。
        父级一旦形成层叠上下文，它的层级就固定了（<code>z-index: auto</code> 当作 0），
        外部元素的 <code>z-index: 1</code> 完整地压过整个父级子树。
        <b>解决办法：把弹窗挂到 body（Vue 的 <code>&lt;Teleport to=&quot;body&quot;&gt;</code>），或者别在祖先上乱用 transform / opacity / filter。</b>
      </p>

      <table style="margin-top: 12px">
        <thead>
          <tr><th>形成层叠上下文的常见条件</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>根元素 <code>html</code></td><td>整个页面的最外层上下文</td></tr>
          <tr><td><code>position</code> 为 relative / absolute + <code>z-index</code> 是数字</td><td>注意：<code>z-index: auto</code> 不算；fixed / sticky 即使 auto 也会形成</td></tr>
          <tr><td><code>transform</code> 不是 none</td><td>包括 <code>translate(0)</code> 这种「看起来没变」的值</td></tr>
          <tr><td><code>opacity</code> 小于 1</td><td>淡入淡出动画结束后记得恢复成 1</td></tr>
          <tr><td><code>filter</code> / <code>backdrop-filter</code> 不是 none</td><td>毛玻璃效果会顺手造出一个上下文</td></tr>
          <tr><td><code>will-change</code> 指定了上述属性</td><td>为性能优化预声明，也会形成上下文</td></tr>
          <tr><td><code>isolation: isolate</code></td><td>唯一「专门用来」创建上下文、没有其他副作用的属性</td></tr>
        </tbody>
      </table>
    </CssCard>

    <!-- ⑤ 居中套路 -->
    <CssCard
      title="⑤ 定位元素的居中套路"
      hint="切换四种写法并拖动尺寸滑块：只有前两种和 flex 会一直保持在正中间。"
      :source="css.rules('.ps-ct-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="centerMode">
          <option value="inset">inset: 0 + margin: auto</option>
          <option value="transform">top/left 50% + translate(-50%,-50%)</option>
          <option value="wrong">top/left 50%（少一半回退）</option>
          <option value="flex">父级 flex 居中</option>
        </select>
        <label class="kv">尺寸 <input type="range" min="50" max="150" v-model.number="centerSize" /> {{ centerSize }}px</label>
      </template>

      <p class="kv">{{ centerText }}</p>
      <div class="ps-ct-stage">
        <div
          class="ps-ct-box"
          :class="{
            'ps-ct-inset': centerMode === 'inset',
            'ps-ct-transform': centerMode === 'transform',
            'ps-ct-wrong': centerMode === 'wrong',
            'ps-ct-flex': centerMode === 'flex',
          }"
          :style="{ width: centerSize + 'px', height: centerSize + 'px' }"
        >
          居中
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        <b><code>inset: 0; margin: auto</code> 是绝对定位元素最稳的居中方式</b>：
        它要求元素有确定的宽高（四边的 auto margin 才能平分剩余空间），但不需要 <code>transform</code>，
        因此不会意外创建层叠上下文、也不会让文字发虚。
        <code>top/left: 50%</code> + <code>translate(-50%, -50%)</code> 的好处是<b>不需要知道元素尺寸</b>。
      </p>
    </CssCard>

    <!-- ⑥ 速查 -->
    <CssCard title="⑥ 定位速查表 + 五个高频坑" tone="warn">
      <table>
        <thead>
          <tr><th>值</th><th>脱离文档流</th><th>参照系（包含块）</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>static</code></td><td>否</td><td>无（top/left 无效）</td><td>默认值，正常流</td></tr>
          <tr><td><code>relative</code></td><td>否（原位置保留）</td><td>自己原来的位置</td><td>做定位参照物、微调、配合 z-index</td></tr>
          <tr><td><code>absolute</code></td><td><b>是</b></td><td>最近的定位祖先，没有则初始包含块</td><td>角标、下拉菜单、覆盖层、居中</td></tr>
          <tr><td><code>fixed</code></td><td><b>是</b></td><td>视口（祖先有 transform 等则变成那个祖先）</td><td>回到顶部、悬浮按钮、全屏遮罩</td></tr>
          <tr><td><code>sticky</code></td><td>否</td><td>正常流 + 最近的滚动容器</td><td>粘性表头、吸顶导航、字母索引</td></tr>
        </tbody>
      </table>

      <ol style="margin: 12px 0 0; padding-left: 20px">
        <li><b>父级高度塌陷</b>：子元素 absolute 后不占高度，父级只剩 padding —— 要么给父级定高，要么用 flex/grid 布局。</li>
        <li><b>absolute 没找对参照物</b>：忘记给父级加 <code>position: relative</code>，元素直接飞到页面角落。</li>
        <li><b>z-index 失效</b>：先检查祖先里有没有 transform / opacity / filter —— 有就是层叠上下文问题，加数字没用。</li>
        <li><b>sticky 不粘</b>：忘了写 <code>top</code>；或者某个祖先有 <code>overflow: hidden</code>；或者父容器和元素一样高。</li>
        <li><b>fixed 弹窗被「关」在祖先里</b>：祖先的 transform 会把 fixed 的参照系改掉，弹窗用 Teleport 挂到 body 最省心。</li>
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

/* ---------- ① 三个值对比 ---------- */
.ps-pos-stage {
  position: relative;
  min-height: 230px;
  padding: 26px 12px 12px;
  border: 1px dashed var(--c-info);
  border-radius: 10px;
  background: repeating-linear-gradient(
    45deg,
    rgba(59, 130, 246, 0.06),
    rgba(59, 130, 246, 0.06) 8px,
    transparent 8px,
    transparent 16px
  );
}
.ps-pos-tag {
  position: absolute;
  top: 4px;
  left: 10px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--c-text-dim);
}
.ps-pos-flow {
  margin-bottom: 8px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  font-size: 12.5px;
}
.ps-pos-target {
  /* top/left 一直写着，只有 position 变 —— 这样才看得出「谁在起作用」 */
  top: 26px;
  left: 30px;
  width: 230px;
  margin-bottom: 8px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(210, 153, 34, 0.9);
  color: #fff;
  font-size: 12.5px;
  font-family: var(--mono);
}
.ps-pos-static {
  position: static;
}
.ps-pos-relative {
  position: relative;
}
.ps-pos-absolute {
  position: absolute;
}

/* ---------- ② 包含块 ---------- */
.ps-cb-stage {
  position: relative;
  height: 270px;
  padding: 26px 14px 14px;
  border: 2px dashed var(--c-info);
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.06);
}
.ps-cb-tag {
  position: absolute;
  top: 4px;
  left: 10px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--c-text-dim);
}
.ps-cb-parent {
  margin: 24px 40px;
  height: 130px;
  border: 2px dashed var(--c-danger);
  border-radius: 10px;
  background: rgba(229, 83, 75, 0.06);
}
.ps-cb-parent-rel {
  position: relative;
}
.ps-cb-parent-static {
  position: static;
}
.ps-cb-child {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 150px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(210, 153, 34, 0.92);
  color: #fff;
  font-family: var(--mono);
  font-size: 11.5px;
  line-height: 1.5;
}
.ps-cb-slot {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  font-size: 12.5px;
}

/* ---------- ③ sticky / fixed ---------- */
.ps-st-scroll {
  height: 200px;
  overflow: auto;
  border: 1px solid var(--c-border);
  border-radius: 10px;
}
.ps-st-table {
  /* 关键：border-collapse: collapse 时表头的边框会跟着滚走，用 separate 最稳 */
  border-collapse: separate;
  border-spacing: 0;
}
.ps-st-th {
  background: var(--c-accent);
  color: #fff;
  font-size: 12.5px;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.25);
}
.ps-st-on {
  position: sticky;
  z-index: 2;
}
.ps-st-off {
  position: static;
}
.ps-fx-mock {
  position: relative;
  height: 150px;
  padding: 10px;
  border: 2px dashed var(--c-info);
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.06);
  /* 就是因为这一句，fixed 子元素才会相对本区域而不是视口定位 */
  transform: translate(0);
}
.ps-fx-tag {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--c-text-dim);
}
.ps-fx-fixed {
  position: fixed;
  top: 10px;
  right: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(66, 184, 131, 0.95);
  color: #fff;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.5;
  box-shadow: var(--shadow);
}
.ps-fx-body {
  margin: 44px 0 0;
  font-size: 12.5px;
  color: var(--c-text-dim);
}

/* ---------- ④ 层叠上下文 ---------- */
.ps-z-stage {
  position: relative;
  height: 210px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: var(--c-surface-2);
}
.ps-z-parent {
  position: absolute;
  left: 16px;
  top: 16px;
  width: 180px;
  height: 130px;
  border: 2px dashed var(--c-danger);
  border-radius: 8px;
}
.ps-z-parent-ctx {
  /* 只加这一句，父级就变成了层叠上下文 */
  transform: translateZ(0);
}
.ps-z-label {
  position: absolute;
  top: -18px;
  left: 0;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--c-danger);
}
.ps-z-child {
  position: absolute;
  left: 50px;
  top: 40px;
  width: 200px;
  height: 92px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(210, 153, 34, 0.95);
  color: #fff;
  font-family: var(--mono);
  font-size: 11.5px;
  line-height: 1.5;
}
.ps-z-out {
  position: absolute;
  left: 140px;
  top: 44px;
  z-index: 1;
  width: 200px;
  height: 92px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.95);
  color: #fff;
  font-family: var(--mono);
  font-size: 11.5px;
  line-height: 1.5;
}

/* ---------- ⑤ 居中 ---------- */
.ps-ct-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 190px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: var(--c-surface-2);
}
.ps-ct-box {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-size: 12.5px;
}
.ps-ct-inset {
  position: absolute;
  inset: 0;
  margin: auto;
}
.ps-ct-transform {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.ps-ct-wrong {
  position: absolute;
  top: 50%;
  left: 50%;
  background: var(--c-danger);
}
.ps-ct-flex {
  position: static;
}
</style>
