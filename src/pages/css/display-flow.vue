<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 7：display 与文档流
 *
 * 页面顺序：先看三种「基本盒子」的差别 → 再看三种「隐藏」的差别 →
 * 然后进入文档流本身（float 脱离一半、absolute 完全脱离）→ BFC 是什么、能治什么病 →
 * 最后是现代值 display: flow-root / contents。
 */
const css = useStyleSource()

/* ---------- ① 块级 / 行内 / inline-block ---------- */
type DispKey = 'block' | 'inline' | 'inline-block'
const disp = ref<DispKey>('block')
const dispNote = computed(
  () =>
    ({
      block: 'block：独占一行，宽度默认撑满父级，width / height / 垂直 margin 全部生效。',
      inline: 'inline：像文字一样排在同一行，width / height 被忽略，垂直方向的 margin 和 padding 不会把行盒撑高。',
      'inline-block': 'inline-block：对外像文字（可以和其他行内内容并排），对内像块级（width / height / margin 都生效）。',
    })[disp.value],
)

/* ---------- ② none / hidden / opacity: 0 ---------- */
type HideKey = 'visible' | 'none' | 'hidden' | 'opacity'
const hide = ref<HideKey>('visible')
const hideNote = computed(
  () =>
    ({
      visible: '正常显示：占位、能点、能聚焦。',
      none: 'display: none：不生成盒子 → 不占位、点不到、聚焦不了、读屏也读不到。',
      hidden: 'visibility: hidden：占位但不可见 → 点不到、聚焦不了，但布局位置还留着。',
      opacity: 'opacity: 0：只是「透明」→ 照样占位、照样能点、照样能聚焦，读屏也照样读得到。',
    })[hide.value],
)
const hits = ref<string[]>([])
function hit(name: string) {
  hits.value = [...hits.value.slice(-4), name]
}

/* ---------- ③ float 与清除 ---------- */
type FloatKey = 'none' | 'left' | 'right'
const floatDir = ref<FloatKey>('left')
type ClearKey = 'none' | 'bfc' | 'clearfix'
const clearMode = ref<ClearKey>('none')
const floatNote = computed(() => {
  if (floatDir.value === 'none') return 'float: none → 这个盒子就是一个普通块级盒子，独占一行，文字不会环绕。'
  if (clearMode.value === 'none')
    return '浮动元素脱离了正常流：父级算高度时看不见它 → 虚线框只包住文字，浮动盒子「漏」到外面去了。'
  if (clearMode.value === 'bfc')
    return '父级加了 overflow: hidden（也就是建立 BFC）→ 父级重新把浮动子元素算进自己的高度。'
  return '父级用 ::after { clear: both } 把浮动「清掉」→ 父级高度恢复正常（经典 clearfix）。'
})

/* ---------- ④ BFC ---------- */
type BfcKey = 'none' | 'flow-root' | 'overflow' | 'inline-block' | 'flex'
const bfc = ref<BfcKey>('none')
const bfcNote = computed(
  () =>
    ({
      none: '没有任何触发条件：父级高度塌陷，浮动子元素整个漏在虚线框外面。',
      'flow-root': 'display: flow-root：专门为「建立 BFC」而生的值，不带来任何副作用，最推荐。',
      overflow: 'overflow: hidden：最常见的触发方式，代价是会把溢出的内容裁掉、也可能出现滚动条。',
      'inline-block': 'display: inline-block：会建立 BFC，但盒子变成行内级 —— 它默认只缩到内容宽度（浮动子元素不算内容宽度），所以这里补了 width: 100%。',
      flex: 'display: flex：弹性容器同样建立 BFC（不过子项的 float 会被忽略，这里只是演示「父级能包住子元素」）。',
    })[bfc.value],
)
const collapseFixed = ref(false)

/* ---------- ⑤ 现代 display 值 ---------- */
type ModernKey = 'normal' | 'contents' | 'flow-root' | 'inline-block'
const modern = ref<ModernKey>('normal')
const modernNote = computed(
  () =>
    ({
      normal: '默认：中间那层是一个普通块级盒子，三个子项竖着排在它里面。',
      contents: 'display: contents：中间层的盒子「消失」了，三个子项直接变成最外层 flex 容器的项目 → 排成一行。',
      'flow-root': 'display: flow-root：外观看不出变化 —— 它本来就是 flex 的子项，已经被「块化」成 block 了；flow-root 的价值在内部（建立 BFC）。',
      'inline-block': 'display: inline-block：同样看不出变化 —— flex 容器的子项会被「块化」，inline-block / inline 都会被计算成 block。',
    })[modern.value],
)
</script>

<template>
  <div>
    <h1>7. display 与文档流</h1>
    <p class="lead">
      文档流（normal flow）是浏览器排版时的默认规则：块级盒子从上到下、行内内容从左到右。
      <strong>把它想成「水」——float 是让一个盒子漂起来（周围的水绕开它），absolute 是让盒子直接飞出水面（谁也不理它）</strong>。
      BFC 则是「在水里放一个独立的水池」，池子内外互不影响。
    </p>

    <CssCard
      title="① 块级 / 行内 / inline-block 的行为差异"
      hint="切换 display：同一组三个盒子，宽度、换行、宽高是否生效、垂直对齐全都不一样。"
      :source="css.rules('.df-disp-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="disp">
          <option value="block">display: block</option>
          <option value="inline">display: inline</option>
          <option value="inline-block">display: inline-block</option>
        </select>
      </template>

      <div
        class="df-disp-stage"
        :class="{
          'df-disp-as-block': disp === 'block',
          'df-disp-as-inline': disp === 'inline',
          'df-disp-as-inline-block': disp === 'inline-block',
        }"
      >
        <div class="df-disp-item">盒子 A（写了 width: 110px / height: 56px）</div>
        <div class="df-disp-item">盒子 B（同一份样式）</div>
        <div class="df-disp-item">盒子 C（同一份样式）</div>
      </div>
      <p class="kv" style="margin-top: 8px">{{ dispNote }}</p>
      <p class="hint" style="margin-top: 6px">
        观察点：切到 <code>inline</code> 时宽高直接失效，盒子的背景还会「涂」到上下两行去 ——
        因为行内元素的垂直 padding 只画背景、不撑开行盒。切到 <code>inline-block</code> 时宽高又回来了，
        而且三个盒子排成一行（它们按基线对齐）。
      </p>
    </CssCard>

    <CssCard
      title="② none / hidden / opacity:0 的三方对比"
      hint="下面四个盒子里的按钮都能点：点得动的会出现在下面的记录里；再用右上角下拉框切换一个「被测盒子」。"
      :source="css.rules('.df-state-')"
    >
      <template #extra>
        <select v-model="hide">
          <option value="visible">正常显示</option>
          <option value="none">display: none</option>
          <option value="hidden">visibility: hidden</option>
          <option value="opacity">opacity: 0</option>
        </select>
      </template>

      <div class="df-state-row">
        <div class="df-state-slot">
          <span class="df-state-slot-label">display: none</span>
          <div class="df-state-box df-state-none">
            <button class="df-state-btn" @click="hit('display: none')">点我</button>
          </div>
        </div>
        <div class="df-state-slot">
          <span class="df-state-slot-label">visibility: hidden</span>
          <div class="df-state-box df-state-hidden">
            <button class="df-state-btn" @click="hit('visibility: hidden')">点我</button>
          </div>
        </div>
        <div class="df-state-slot">
          <span class="df-state-slot-label">opacity: 0（按钮还在原地，试着点它）</span>
          <div class="df-state-box df-state-opacity">
            <button class="df-state-btn" @click="hit('opacity: 0')">点我</button>
          </div>
        </div>
        <div class="df-state-slot">
          <span class="df-state-slot-label">正常显示</span>
          <div class="df-state-box">
            <button class="df-state-btn" @click="hit('正常')">点我</button>
          </div>
        </div>
      </div>
      <p class="kv">点击记录：{{ hits.length ? hits.join(' → ') : '（还没点过；前两个点不到）' }}</p>

      <p class="kv" style="margin-top: 12px">当前状态：{{ hide }} —— {{ hideNote }}</p>
      <div
        class="df-state-lab"
        :class="{
          'df-state-lab-none': hide === 'none',
          'df-state-lab-hidden': hide === 'hidden',
          'df-state-lab-opacity': hide === 'opacity',
        }"
      >
        这个盒子的状态由右上角的下拉框控制。注意 <code>opacity: 0</code> 时它「还在」：
        鼠标能点、Tab 能聚焦、屏幕阅读器也照样念出来 —— 这是弹窗遮罩层最常见的可访问性事故。
      </div>

      <table style="margin-top: 12px">
        <thead>
          <tr><th>状态</th><th>占位</th><th>可点击</th><th>可聚焦 / 读屏</th><th>能否被子元素救回来</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>display: none</code></td>
            <td>否</td>
            <td>否</td>
            <td>否</td>
            <td>不能（整棵子树一起消失）</td>
          </tr>
          <tr>
            <td><code>visibility: hidden</code></td>
            <td><b>是</b></td>
            <td>否</td>
            <td>否</td>
            <td><b>能</b>：子元素写 <code>visibility: visible</code> 就会重新显示（visibility 可继承）</td>
          </tr>
          <tr>
            <td><code>opacity: 0</code></td>
            <td><b>是</b></td>
            <td><b>是</b></td>
            <td><b>是</b></td>
            <td>—（它只是透明，什么都没变）</td>
          </tr>
        </tbody>
      </table>
    </CssCard>

    <CssCard
      title="③ float：图文环绕、父级高度塌陷与两种清除方式"
      hint="切换 float 方向看文字环绕；再切换「清除方式」，看父级虚线框能不能重新包住浮动盒子。"
      :source="css.rules('.df-float-')"
      tone="warn"
    >
      <div class="df-float-ctl">
        <label class="df-ctl">float
          <select v-model="floatDir">
            <option value="left">left</option>
            <option value="right">right</option>
            <option value="none">none</option>
          </select>
        </label>
        <label class="df-ctl">清除方式
          <select v-model="clearMode">
            <option value="none">不清除（看塌陷）</option>
            <option value="bfc">overflow: hidden</option>
            <option value="clearfix">::after + clear: both</option>
          </select>
        </label>
      </div>

      <div class="df-float-stage">
        <div
          class="df-float-wrap"
          :class="{ 'df-float-bfc': clearMode === 'bfc', 'df-float-clearfix': clearMode === 'clearfix' }"
        >
          <div
            class="df-float-box"
            :class="{
              'df-float-left': floatDir === 'left',
              'df-float-right': floatDir === 'right',
              'df-float-none': floatDir === 'none',
            }"
          >
            float 盒子<br />110 × 120
          </div>
          <p class="df-float-text">
            文字会绕开浮动盒子排布 —— 因为浮动元素虽然离开了正常流，它的位置仍然会影响「行盒」的宽度。
            这是 float 最初被发明出来的用途（图文环绕），也是它和 absolute 最大的区别。
          </p>
        </div>
      </div>
      <p class="kv">{{ floatNote }}</p>

      <pre class="code" style="margin-top: 10px">
/* 浮动元素脱离了正常流 → 父级算高度时「看不见」它，于是父级高度塌陷 */
.float-box { float: left; width: 110px; height: 120px }

/* 清除方式 1：让父级自己建立 BFC（最省事，但 overflow 有副作用） */
.wrap { overflow: hidden }

/* 清除方式 2：经典 clearfix（在父级末尾补一个「清浮动」的块） */
.clearfix::after { content: ''; display: block; clear: both }

/* 清除方式 3（现代首选）：flow-root，只做建立 BFC 这一件事 */
.wrap { display: flow-root }

/* 对比：absolute / fixed 是彻底脱离文档流 —— 连行盒都不受影响，文字不会环绕 */
.abs { position: absolute; left: 0; top: 0 }</pre
      >
    </CssCard>

    <CssCard
      title="④ BFC 是什么、怎么触发、能治什么病"
      hint="切换触发方式，看父级虚线框能不能包住浮动子元素；下面的勾选框演示「阻止 margin 折叠」。"
      :source="css.rules('.df-bfc-')"
      tone="ok"
    >
      <div class="df-bfc-ctl">
        <label class="df-ctl">触发方式
          <select v-model="bfc">
            <option value="none">不触发</option>
            <option value="flow-root">display: flow-root</option>
            <option value="overflow">overflow: hidden</option>
            <option value="inline-block">display: inline-block</option>
            <option value="flex">display: flex</option>
          </select>
        </label>
        <label class="df-ctl"><input type="checkbox" v-model="collapseFixed" /> 给父级加 overflow: hidden（阻止 margin 折叠）</label>
      </div>

      <div class="df-bfc-stage">
        <div
          class="df-bfc-wrap"
          :class="{
            'df-bfc-flow-root': bfc === 'flow-root',
            'df-bfc-overflow': bfc === 'overflow',
            'df-bfc-inline-block': bfc === 'inline-block',
            'df-bfc-flex': bfc === 'flex',
            'df-bfc-none': bfc === 'none',
          }"
        >
          <div class="df-bfc-float">float: left<br />高度 90px</div>
        </div>
      </div>
      <p class="kv">{{ bfcNote }}</p>

      <p class="kv" style="margin-top: 12px">
        BFC 也能挡住 margin 折叠：下面父级里首个子元素有 margin-top，勾选上面的勾选框对比一下。
      </p>
      <div class="df-bfc-mc-stage">
        <div class="df-bfc-mc-before">上一个兄弟元素</div>
        <div class="df-bfc-mc" :class="{ 'df-bfc-mc-fixed': collapseFixed }">
          <div class="df-bfc-mc-child">我的 margin-top: 24px</div>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">
/* BFC（块级格式化上下文）= 一块「独立的排版区域」：
   内部的布局不会影响外面，外面的布局也不会影响里面。
   触发方式（任一即可）：
     display: flow-root             ← 专为这件事设计，无副作用，首选
     overflow: hidden / auto / scroll  （只要不是 visible）
     float: left / right
     position: absolute / fixed
     display: inline-block / table-cell / flex / grid
     contain: layout / paint / strict

/* 能解决的问题 1：父元素高度塌陷（包住浮动子元素） */
.list { display: flow-root }

/* 能解决的问题 2：垂直 margin 折叠（父级首个子元素的 margin-top 跑到父级外面） */
.panel { display: flow-root }   /* 有 padding/border/overflow 非 visible 也一样能挡住 */

/* 能解决的问题 3：两栏布局里，右侧内容不要被左侧浮动压住 */
.main { overflow: hidden }      /* 建立 BFC 后，它会与浮动元素并排而不是重叠 */</pre
      >
    </CssCard>

    <CssCard
      title="⑤ 现代值：flow-root / contents"
      hint="切换中间层的 display，观察三个子项在「外层 flex 容器」里怎么排。"
      :source="css.rules('.df-modern-')"
    >
      <template #extra>
        <select v-model="modern">
          <option value="normal">默认（不动）</option>
          <option value="contents">display: contents</option>
          <option value="flow-root">display: flow-root</option>
          <option value="inline-block">display: inline-block</option>
        </select>
      </template>

      <div class="df-modern-stage">
        <div
          class="df-modern-mid"
          :class="{
            'df-modern-contents': modern === 'contents',
            'df-modern-flow-root': modern === 'flow-root',
            'df-modern-inline-block': modern === 'inline-block',
          }"
        >
          <div class="df-modern-item">A</div>
          <div class="df-modern-item">B</div>
          <div class="df-modern-item">C</div>
        </div>
      </div>
      <p class="kv" style="margin-top: 8px">{{ modernNote }}</p>
      <p class="hint" style="margin-top: 6px">
        <code>display: contents</code> 的用途是「去掉一层多余的盒子」（比如只想保留外层 flex 的布局，
        不想要中间那层 wrapper），但它在无障碍上出过名：早期实现会把带语义的容器（列表、表格）
        从无障碍树里摘掉。<b>用在做布局的普通 div 上问题不大，用在 ul / table 这类语义容器上要非常谨慎。</b>
      </p>
    </CssCard>

    <CssCard title="⑥ display 速查表与常见坑" tone="warn">
      <table>
        <thead>
          <tr><th>display</th><th>在流里的表现</th><th>能设宽高</th><th>备注</th></tr>
        </thead>
        <tbody>
          <tr><td><code>block</code></td><td>独占一行，宽度撑满父级</td><td>可以</td><td>div / p / h1 的默认值；垂直 margin 会折叠</td></tr>
          <tr><td><code>inline</code></td><td>像文字一样排在一行</td><td><b>不行</b></td><td>span / a / em 的默认值；垂直 padding 与 margin 不撑开行盒</td></tr>
          <tr><td><code>inline-block</code></td><td>对外像文字，对内像块级</td><td>可以</td><td>按基线对齐，容易在图片旁出现空隙</td></tr>
          <tr><td><code>flow-root</code></td><td>块级 + 自己建立 BFC</td><td>可以</td><td>清除浮动 / 阻止 margin 折叠的首选</td></tr>
          <tr><td><code>flex</code></td><td>弹性容器（父级建立 BFC）</td><td>可以</td><td>子项的 float、vertical-align 都会失效</td></tr>
          <tr><td><code>grid</code></td><td>网格容器（父级建立 BFC）</td><td>可以</td><td>同上；子项也不参与 margin 折叠</td></tr>
          <tr><td><code>contents</code></td><td>盒子消失，子元素直接上位</td><td>—</td><td>无障碍历史上会把语义容器移出无障碍树，慎用</td></tr>
          <tr><td><code>none</code></td><td>不生成盒子</td><td>—</td><td>不占位、不可聚焦、读屏读不到</td></tr>
        </tbody>
      </table>

      <ol class="df-pit">
        <li><b>给 inline 元素设宽高无效</b>：先改成 <code>inline-block</code> 或 <code>block</code>；只有替换元素（img、input）是例外，它们天生可以被设宽高。</li>
        <li><b>inline 元素的垂直 padding/margin</b>：背景会画出去、和其他行重叠，但不会把行盒撑高 → 要占空间就别用纯 inline。</li>
        <li><b>inline-block 之间的空白间隙</b>：HTML 源码里元素之间的换行会变成一个空格。注意模板编译器（包括 Vue 默认的空白压缩）常常会把这个空白去掉，所以这个坑在模板里经常「看不到」，写纯 HTML 时才会遇到。</li>
        <li><b>隐藏方式别选错</b>：要「藏起来但保留过渡动画」就用 <code>opacity</code> / <code>visibility</code>；<code>display: none</code> 不参与过渡（较新的 allow-discrete 兼容性还不够放心）。</li>
        <li><b>float 只脱离「一半」</b>：它离开正常流，但仍影响行盒 → 文字环绕；absolute / fixed 才是彻底脱离，周围内容当它不存在。</li>
        <li><b>浮动/绝对定位会让 display 被「块化」</b>：给一个 <code>display: inline</code> 的元素加上 float 或 position: absolute，计算后的 display 会变成 block（所以此时宽高又生效了）。</li>
        <li><b>overflow: hidden 不是免费的</b>：它会裁掉溢出内容（下拉菜单、提示框会被切掉），还可能产生滚动容器、影响 sticky 定位 → 单纯为了清除浮动时优先用 <code>display: flow-root</code>。</li>
        <li><b>父级高度塌陷的排查顺序</b>：先确认子元素是不是 float / absolute；float 用 flow-root 或 clearfix，absolute 只能给父级显式高度或改用 grid/flex 布局。</li>
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
.df-ctl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--c-text-dim);
  white-space: nowrap;
}

/* ① 三种 display */
.df-disp-stage {
  padding: 10px 12px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: var(--c-surface-2);
  font-size: 0; /* 去掉 inline-block 之间由空白字符产生的间隙，让对比更干净 */
}
.df-disp-item {
  width: 110px;
  height: 56px;
  margin: 6px;
  padding: 6px 8px;
  border: 2px solid var(--c-info);
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.16);
  color: var(--c-text);
  font-size: 11.5px;
  line-height: 1.35;
  box-sizing: border-box;
}
/* 同一组三行声明，只有 display 不同 —— 这就是本节要对比的全部变量 */
.df-disp-as-block .df-disp-item {
  display: block;
}
.df-disp-as-inline .df-disp-item {
  display: inline;
}
.df-disp-as-inline-block .df-disp-item {
  display: inline-block;
}

/* ② 三种隐藏 */
.df-state-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start; /* 让 display: none 那个「坑」明显变矮，一眼看出它不占位 */
  gap: 12px;
}
.df-state-slot {
  width: 176px;
  padding: 8px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: var(--c-surface);
}
.df-state-slot-label {
  display: block;
  margin-bottom: 6px;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.4;
  color: var(--c-text-dim);
  min-height: 30px;
}
.df-state-box {
  height: 56px;
  padding: 8px;
  border-radius: 8px;
  background: var(--c-surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.df-state-btn {
  font-size: 12px;
  padding: 4px 10px;
}
.df-state-none {
  display: none;
}
.df-state-hidden {
  visibility: hidden;
}
.df-state-opacity {
  opacity: 0;
}
.df-state-lab {
  padding: 12px 14px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
  font-size: 13px;
}
.df-state-lab-none {
  display: none;
}
.df-state-lab-hidden {
  visibility: hidden;
}
.df-state-lab-opacity {
  opacity: 0;
}

/* ③ float */
.df-float-ctl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 10px;
}
.df-float-stage {
  min-height: 210px;
  padding: 10px;
  border-radius: 10px;
  background: var(--c-surface-2);
  overflow: hidden; /* 只用来把「漏出来」的浮动盒子限制在演示区里，不影响父级高度计算 */
}
.df-float-wrap {
  border: 2px dashed var(--c-warn);
  border-radius: 8px;
  padding: 6px 8px;
}
.df-float-box {
  width: 110px;
  height: 120px;
  border-radius: 8px;
  background: linear-gradient(160deg, var(--c-primary), var(--c-info));
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.df-float-left {
  float: left;
  margin-right: 10px;
}
.df-float-right {
  float: right;
  margin-left: 10px;
}
.df-float-none {
  margin-bottom: 8px;
}
.df-float-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
}
.df-float-bfc {
  overflow: hidden;
}
.df-float-clearfix::after {
  content: '';
  display: block;
  clear: both;
}

/* ④ BFC */
.df-bfc-ctl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 10px;
}
.df-bfc-stage {
  padding: 10px;
  border-radius: 10px;
  background: var(--c-surface-2);
}
.df-bfc-wrap {
  border: 2px dashed var(--c-info);
  border-radius: 8px;
  padding: 4px;
}
.df-bfc-float {
  float: left;
  width: 120px;
  height: 90px;
  border-radius: 8px;
  background: rgba(66, 184, 131, 0.85);
  color: #fff;
  font-size: 11.5px;
  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.df-bfc-none {
  /* 没有任何 BFC 触发条件：父级包不住浮动子元素 */
}
.df-bfc-flow-root {
  display: flow-root;
}
.df-bfc-overflow {
  overflow: hidden;
}
.df-bfc-inline-block {
  display: inline-block;
  /* inline-block 默认「收缩到内容宽度」，而浮动子元素不参与宽度计算 →
     不写 width 的话盒子会缩成一条细边，所以这里补上 100% */
  width: 100%;
}
.df-bfc-flex {
  display: flex;
}
.df-bfc-mc-stage {
  margin-top: 6px;
  padding: 10px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: var(--c-surface-2);
}
.df-bfc-mc-before {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-text-dim);
  color: var(--c-surface);
  font-size: 12.5px;
}
.df-bfc-mc {
  background: rgba(59, 130, 246, 0.16);
  /* 故意不写 border / padding-top：否则会挡住 margin 折叠，演示就不成立了 */
}
.df-bfc-mc-child {
  margin-top: 24px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-info);
  color: #fff;
  font-size: 12.5px;
}
.df-bfc-mc-fixed {
  overflow: hidden;
}

/* ⑤ 现代值 */
.df-modern-stage {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 2px dashed var(--c-primary);
  border-radius: 10px;
  background: var(--c-surface-2);
}
.df-modern-mid {
  padding: 6px;
  border: 1px dashed var(--c-warn);
  border-radius: 8px;
  background: rgba(210, 153, 34, 0.14);
}
.df-modern-item {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--c-info);
  color: #fff;
  font-size: 13px;
  text-align: center;
}
.df-modern-contents {
  display: contents;
}
.df-modern-flow-root {
  display: flow-root;
}
.df-modern-inline-block {
  display: inline-block;
}

/* ⑥ 坑清单 */
.df-pit {
  margin: 12px 0 0;
  padding-left: 22px;
  font-size: 13px;
  line-height: 1.9;
}
.df-pit li {
  margin-bottom: 4px;
}
</style>
