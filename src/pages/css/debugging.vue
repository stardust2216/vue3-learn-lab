<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 15：调试与常见坑
 *
 * 这一页是「工具箱」：左边是可复现的现象，右边是原因与解法。
 * 每张卡片都至少有一个开关/按钮，可以在「出问题的写法」和「修好的写法」之间来回切。
 */
const css = useStyleSource()

/* ---------- ① 层叠上下文 ---------- */
const scTrap = ref(false)

/* ---------- ② 外边距折叠 ---------- */
const bfcOn = ref(false)

/* ---------- ③ 高度塌陷 ---------- */
const hcFloat = ref(false)
const hcAbsolute = ref(false)

/* ---------- ④ 居中 ---------- */
const centerMode = ref('bad')
/** 用「静态类名映射」而不是拼字符串：scoped 样式只认模板里字面量出现的类名 */
const centerClassMap: Record<string, string> = {
  bad: 'dbg-c-bad',
  inline: 'dbg-c-inline',
  margin: 'dbg-c-margin',
  absolute: 'dbg-c-absolute',
  flex: 'dbg-c-flex',
  grid: 'dbg-c-grid',
}
const centerClass = computed(() => centerClassMap[centerMode.value] ?? 'dbg-c-bad')

/* ---------- ⑤ 视口与溢出 ---------- */
const useDvh = ref(false)
const boxSizing = ref('content-box')

/* ---------- ⑥ flex 文字溢出 / 图片基线间隙 ---------- */
const flexMinWidth = ref(false)
const flexBreak = ref(false)
const imgBlock = ref(false)

/* ---------- ⑦ 表格与长单词 ---------- */
const tableFixed = ref(false)
const wordBreak = ref(false)

/* ---------- ⑧ 滚动条 ---------- */
const longText = ref(false)
</script>

<template>
  <div>
    <h1>15. 调试与常见坑</h1>
    <p class="lead">
      这些坑的共同点是：<strong>代码「看起来没错」，但结果不对</strong>。
      它们的根因几乎都落在三件事上 —— <strong>层叠上下文、外边距折叠、包含块/尺寸计算</strong>。
      下面每条都配一个能复现的开关：先看出问题的样子，再切到修好的样子。
    </p>

    <!-- ============ ① 层叠上下文 ============ -->
    <CssCard
      title="① z-index 失效：不是数字不够大，是层叠上下文被隔开了"
      hint="点开关给父级加一个 opacity（哪怕 0.99）。子元素的 z-index 再也无法与外部元素比较。"
      :source="css.rules('.dbg-sc')"
      tone="warn"
    >
      <template #extra>
        <label class="kv"><input v-model="scTrap" type="checkbox" /> 父级加 opacity: 0.99</label>
      </template>

      <div class="dbg-sc-stage" :class="{ 'is-trap': scTrap }">
        <div class="dbg-sc-parent">
          <span class="dbg-sc-item dbg-sc-item-a">z-index: 999</span>
          <span class="dbg-sc-note">父级（{{ scTrap ? '已有 opacity → 新层叠上下文' : '无层叠上下文' }}）</span>
        </div>
        <span class="dbg-sc-item dbg-sc-item-b">z-index: 1</span>
      </div>
      <p class="kv" style="margin-top: 8px">
        当前结果：<b>{{ scTrap ? '999 被压在 1 下面（两个上下文整体比较，内部数字失去意义）' : '999 正常盖住 1' }}</b>
      </p>

      <pre class="code" style="margin-top: 10px">/* 会「开启新层叠上下文」的常见属性（这就是 z-index 失效的元凶）：
   opacity &lt; 1        transform ≠ none     filter ≠ none
   isolation: isolate  will-change: transform/opacity
   position: fixed / sticky
   position 非 static + z-index 非 auto
   contain: layout / paint
   flex / grid 容器的子元素 + z-index 非 auto */

/* 出问题的结构：父级有 opacity，子级的 999 只在父级内部有效 */
.dbg-sc-parent &#123;
  position: relative;
  opacity: 0.99;      /* ← 就是在这一行让 z-index 失效的 */
&#125;
.dbg-sc-item-a &#123; position: absolute; z-index: 999 &#125;  /* 看似无敌，实则被关在父级里 */
.dbg-sc-item-b &#123; position: absolute; z-index: 1 &#125;    /* 反而盖在父级整体之上 */

/* 解法清单（按推荐顺序）：
   1) 把 z-index 提到「要跨越的那个共同父级」上，而不是它的子元素上；
   2) 去掉不必要的 opacity / transform / filter（改用不影响层叠的替代方案）；
   3) 用 isolation: isolate 显式建立你要的边界，让层级关系可预期；
   4) 工程上统一用「层级令牌」：--z-dropdown: 100 / --z-modal: 1000 / --z-toast: 2000，
      避免 999 / 9999 军备竞赛。 */</pre>
    </CssCard>

    <!-- ============ ② 两个 BFC 相关坑：外边距折叠 + 高度塌陷 ============ -->
    <CssCard
      title="② 两个 BFC 相关坑：垂直外边距折叠 & 父元素高度塌陷"
      hint="上半段：两个 30px 外边距被折叠成 30px。下半段：浮动/绝对定位的子元素不撑开父级。同一个解法：让父级创建 BFC。"
      :source="css.rules('.dbg-mc', '.dbg-mch')"
    >
      <template #extra>
        <label class="kv"><input v-model="bfcOn" type="checkbox" /> 外边距父级 overflow: hidden</label>
        <label class="kv"><input v-model="hcFloat" type="checkbox" /> 子元素 float: left</label>
        <label class="kv"><input v-model="hcAbsolute" type="checkbox" /> 子元素 position: absolute</label>
      </template>

      <p class="kv" style="margin: 0 0 6px">① 外边距折叠（两个盒子各写 30px）</p>
      <div class="dbg-mc-wrap" :class="{ 'is-bfc': bfcOn }">
        <div class="dbg-mc-box dbg-mc-a">A：margin-bottom 30px</div>
        <div class="dbg-mc-box dbg-mc-b">B：margin-top 30px</div>
      </div>
      <p class="kv" style="margin-top: 8px">
        实际间距：<b>{{ bfcOn ? '30 + 30 = 60px（不折叠）' : 'max(30, 30) = 30px（折叠）' }}</b>
      </p>

      <p class="kv" style="margin: 16px 0 6px">② 父元素高度塌陷（float / absolute 子元素不占位）</p>
      <div class="dbg-mch-row">
        <div class="dbg-mch-cell">
          <p class="kv">出问题：父级高度只剩 padding</p>
          <div class="dbg-mch-parent-bad">
            <div class="dbg-mch-child" :class="{ 'is-float': hcFloat, 'is-absolute': hcAbsolute }">子元素</div>
          </div>
        </div>
        <div class="dbg-mch-cell">
          <p class="kv">修好：父级 <code>display: flow-root</code></p>
          <div class="dbg-mch-parent-good">
            <div class="dbg-mch-child" :class="{ 'is-float': hcFloat }">子元素</div>
          </div>
        </div>
      </div>
      <p class="kv" style="margin-top: 8px">
        当前：浮动 {{ hcFloat ? '开' : '关' }} ｜ 绝对定位 {{ hcAbsolute ? '开' : '关' }} ——
        {{ hcAbsolute ? '「右侧 flow-root」也救不了绝对定位，因为它本来就完全脱离文档流' : '浮动会让父级高度塌陷，flow-root 可以恢复' }}
      </p>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>外边距「会折叠」</th><th>外边距「不会折叠」</th></tr>
        </thead>
        <tbody>
          <tr><td>相邻兄弟的 margin-bottom 与 margin-top</td><td>父级是 flex / grid 容器</td></tr>
          <tr><td>父级 margin-top 与第一个子元素 margin-top（父级被「顶出去」）</td><td>父级有 padding / border 分隔</td></tr>
          <tr><td>父级 padding-bottom 为 0 时与最后一个子元素 margin-bottom</td><td>父级创建了 BFC（<code>overflow: hidden</code>、<code>display: flow-root</code>）</td></tr>
          <tr><td>空元素（无内容、无高度、无 padding/border）自己的上下 margin</td><td>存在浮动的元素</td></tr>
        </tbody>
      </table>

      <pre class="code" style="margin-top: 10px">/* ① 外边距折叠：父子/兄弟间距莫名其妙「消失」或「顶出去」 */
.dbg-mc-wrap &#123; background: var(--c-surface-2) &#125;   /* 父级没有 padding/border → 与子元素折叠 */

/* 解法 1：布局用 gap，不用 margin（推荐，语义最清晰） */
.dbg-mc-wrap.is-flex &#123; display: flex; flex-direction: column; gap: 30px &#125;

/* 解法 2：需要父级「包住」子元素时，显式建立 BFC */
.dbg-mc-wrap.is-bfc &#123; overflow: hidden &#125;     /* 或 display: flow-root（更干净，无副作用） */

/* 解法 3：父级加 padding 或 border（哪怕 1px / transparent）也能阻断折叠 */
/* ⚠ 水平方向不会折叠；flex / grid 的 gap 也不会。 */

/* ② 高度塌陷：浮动 / 绝对定位的子元素不占位，父级「瘪」了 */
.dbg-mch-parent-bad &#123; padding: 8px; background: rgba(66, 184, 131, 0.12) &#125;
.dbg-mch-child.is-float &#123; float: left &#125;            /* 浮动元素不撑开父级 */
.dbg-mch-child.is-absolute &#123; position: absolute &#125;   /* 完全脱离文档流，父级高度为 0 */

/* 解法 1（推荐）：display: flow-root —— 专门为「包住浮动子元素」设计的 BFC */
.dbg-mch-parent-good &#123; display: flow-root &#125;

/* 解法 2：给父级一个确定高度（子元素高度可控时最简单） */
/* .parent &#123; height: 200px &#125; */

/* 解法 3：现代布局 —— flex / grid 容器天然包含浮动子元素 */
/* .parent &#123; display: flex &#125; 或 display: grid */

/* 解法 4：clearfix（老项目常见，知道即可） */
/* .parent::after &#123; content: ''; display: block; clear: both &#125; */

/* 绝对定位的子元素：父级要么给高度，要么把子元素放回文档流。
   顺带记住：绝对定位的参照是「最近的 position 非 static 的祖先」。 */</pre>
    </CssCard>

    <!-- ============ ③ 居中 ============ -->
    <CssCard
      title="③ 元素居中失败：先判断「谁是居中参照」"
      hint="选一种写法，看同一个子元素在四种机制下的结果。前两种是错的示范，后四种是各自场景的正解。"
      :source="css.rules('.dbg-c')"
    >
      <template #extra>
        <select v-model="centerMode">
          <option value="bad">错误示范：只写 margin: 0 auto</option>
          <option value="inline">行内元素：父级 text-align: center</option>
          <option value="margin">块级定宽：margin auto</option>
          <option value="absolute">绝对定位：inset + margin auto</option>
          <option value="flex">Flex：place-items / justify+align</option>
          <option value="grid">Grid：place-items</option>
        </select>
      </template>

      <div class="dbg-c-stage" :class="centerClass">
        <span class="dbg-c-item">{{ centerMode }}</span>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>元素类型</th><th>正确写法</th><th>为什么</th></tr>
        </thead>
        <tbody>
          <tr><td>行内 / 行内块（文字、图标）</td><td>父级 <code>text-align: center</code></td><td>行内级内容由父级的文本对齐控制，给元素自己写 margin 没用</td></tr>
          <tr><td>块级 + 已知宽度</td><td><code>margin: 0 auto</code> + <code>width</code></td><td>auto 外边距会平分剩余空间；宽度是 auto（占满）时没有剩余空间可平分</td></tr>
          <tr><td>绝对 / 固定定位</td><td><code>inset: 0</code> + <code>margin: auto</code>，或 <code>top:50%;left:50%;translate:-50%,-50%</code></td><td>绝对定位元素需要明确「上下左右都为 0」才有可平分的空间</td></tr>
          <tr><td>Flex 容器里的子项</td><td>父级 <code>display:flex; justify-content:center; align-items:center</code></td><td>主轴/交叉轴各管一个方向；<code>place-items</code> 是简写</td></tr>
          <tr><td>Grid 容器里的子项</td><td>父级 <code>display:grid; place-items:center</code></td><td>单格子里最省事的两行方案</td></tr>
          <tr><td>垂直方向的小图标</td><td><code>vertical-align: middle</code> + <code>line-height</code></td><td>行内级元素用「行盒」对齐，不是盒模型居中</td></tr>
        </tbody>
      </table>
      <pre class="code" style="margin-top: 10px">/* 出问题：父级是普通块级，子元素是宽度 auto 的 div → margin auto 无事可做 */
.dbg-c-bad .dbg-c-item &#123; margin: 0 auto &#125;                    /* ❌ 需要先有确定宽度 */

/* ✅ 行内元素 */
.dbg-c-inline &#123; text-align: center &#125;

/* ✅ 块级定宽 */
.dbg-c-margin .dbg-c-item &#123; display: block; width: 120px; margin: 0 auto &#125;

/* ✅ 绝对定位：父级 relative，子元素四边为 0 + margin auto */
.dbg-c-absolute &#123; position: relative &#125;
.dbg-c-absolute .dbg-c-item &#123;
  position: absolute;
  inset: 0;
  width: 120px;
  height: 40px;
  margin: auto;                 /* 有了可平分空间，auto 才生效 */
&#125;

/* ✅ Flex / Grid：交给父级 */
.dbg-c-flex &#123; display: flex; justify-content: center; align-items: center &#125;
.dbg-c-grid &#123; display: grid; place-items: center &#125;

/* 一句话判断法：先问「谁负责这个方向的剩余空间」——
   是父级（text-align / flex / grid），还是元素自己（margin auto / inset auto）。 */</pre>
    </CssCard>

    <!-- ============ ④ 视口高度 + 溢出 ============ -->
    <CssCard
      title="④ 100vh 被移动端地址栏顶掉 & width:100% + padding 溢出"
      hint="左：切换 100vh / 100dvh（桌面浏览器两者相同，移动端才会露出差别）。右：切换 box-sizing 看右边框是否被挤出去。"
      :source="css.rules('.dbg-vh')"
      tone="warn"
    >
      <template #extra>
        <label class="kv"><input v-model="useDvh" type="checkbox" /> 使用 100dvh</label>
        <label class="kv"><input v-model="boxSizing" type="checkbox" true-value="border-box" false-value="content-box" /> box-sizing: border-box</label>
      </template>

      <div class="dbg-vh-row">
        <div class="dbg-vh-cell">
          <p class="kv">
            演示框高度：<b>{{ useDvh ? '100dvh' : '100vh' }}</b>（外层是可滚动容器，移动端滚动时地址栏收起/展开即可看出差别）
          </p>
          <div class="dbg-vh-scroll">
            <div class="dbg-vh-box" :class="{ 'is-dvh': useDvh }">
              <span class="dbg-vh-label">{{ useDvh ? '100dvh' : '100vh' }}</span>
              <span class="dbg-vh-tail">↓ 这一行只有滚动才能看到</span>
            </div>
          </div>
        </div>

        <div class="dbg-vh-cell">
          <p class="kv">
            子元素：<code>width: 100%; padding: 16px;</code> ＋ <code>box-sizing: {{ boxSizing }}</code>
          </p>
          <div class="dbg-vh-parent">
            <div class="dbg-vh-child" :class="{ 'is-border-box': boxSizing === 'border-box' }">
              100% + padding
            </div>
          </div>
        </div>
      </div>

      <div class="dbg-vh-more">
        <p class="kv" style="margin: 0 0 6px">相关的第 7 个坑：flex 子项里的长文字撑破容器</p>
        <div class="dbg-vh-flex">
          <div class="dbg-vh-avatar">90px</div>
          <div class="dbg-vh-text" :class="{ 'is-min-zero': flexMinWidth, 'is-anywhere': flexBreak }">
            SupercalifragilisticexpialidociousAndMoreLettersHere
          </div>
        </div>
        <p class="kv" style="margin-top: 6px">
          {{ flexBreak ? '已换行 → 容器不再被撑破' : flexMinWidth ? '子项收缩了，但长单词仍溢出这个子项' : '子项被 min-width: auto 顶到内容宽度 → 撑破父容器' }}
        </p>
      </div>

      <pre class="code" style="margin-top: 10px">/* ① 100vh 的坑：vh 以「最大视口」为基准，移动端地址栏展开时会把底部内容顶出屏幕 */
.dbg-vh-box &#123; height: 100vh &#125;      /* ❌ 底部按钮被地址栏盖住 */
.dbg-vh-box.is-dvh &#123; height: 100dvh &#125; /* ✅ dvh = dynamic viewport height，随地址栏实时变化 */

/* 单位家族：
   vh  = 最大视口（地址栏收起时的高度）
   svh = 最小视口（地址栏展开时的高度）
   lvh = 最大视口（= vh）
   dvh = 动态视口，随地址栏变化而变化 —— 全屏布局首选 */
/* 更彻底的方案：用 dvh 只给「必须撑满」的容器，内容区用 min-height: 0 + overflow: auto；
   或者干脆交给 flex：html, body, #app &#123; height: 100% &#125; + 容器 height: 100%。 */

/* ② width: 100% + padding 溢出：默认 content-box 下 width 只算内容区 */
.dbg-vh-child &#123;
  width: 100%;
  padding: 16px;
  box-sizing: content-box;    /* ❌ 实际占宽 = 父级宽 + 32px → 右侧溢出/出现横向滚动条 */
&#125;
.dbg-vh-child.is-border-box &#123; box-sizing: border-box &#125;  /* ✅ 宽高包含 padding 与 border */

/* ③ flex 子项文字溢出：罪魁祸首是 min-width 的初始值 auto
   （auto = 不肯收缩到比内容更小，于是长单词把容器顶破） */
.dbg-vh-text &#123;
  flex: 1;
  min-width: 0;                 /* ✅ 允许收缩，最常用的一行修复 */
  overflow-wrap: anywhere;      /* ✅ 没有空格的超长串也能断行 */
  /* 相关：overflow: hidden + text-overflow: ellipsis + white-space: nowrap = 单行省略号 */
&#125;
/* grid 子项同理，对应属性是 min-width: 0 / min-height: 0（行方向） */

/* 相关知识：
   · 全局 *, *::before, *::after &#123; box-sizing: border-box &#125; 几乎是所有项目的第 0 条规则；
   · 排查溢出：DevTools 里选中元素，看 Layout 面板的「盒模型图」中每一层的实际数值。 */</pre>
    </CssCard>

    <!-- ============ ⑤ 图片基线间隙 + 表格/长单词/滚动条 ============ -->
    <CssCard
      title="⑤ 图片下方的基线空隙、表格撑破容器、滚动条引起跳动"
      hint="左：切换 display，看基线下方的空隙消失。右：切换 table-layout 把溢出关进单元格，再点按钮看滚动条是否挤动布局。"
      :source="css.rules('.dbg-fx', '.dbg-tt')"
    >
      <template #extra>
        <label class="kv"><input v-model="imgBlock" type="checkbox" /> 图片/方块改成 display: block</label>
        <label class="kv"><input v-model="tableFixed" type="checkbox" /> table-layout: fixed</label>
        <label class="kv"><input v-model="wordBreak" type="checkbox" /> overflow-wrap: anywhere</label>
        <button class="dbg-tt-btn" type="button" @click="longText = !longText">
          {{ longText ? '恢复短内容' : '塞入更多内容' }}
        </button>
      </template>

      <div class="dbg-fx-row">
        <div class="dbg-fx-cell">
          <p class="kv">图片/行内块下方为什么有 4～5px 空隙？</p>
          <div class="dbg-fx-imgbox">
            <span class="dbg-fx-block" :class="{ 'is-block': imgBlock }">图片</span><span class="dbg-fx-anchor">xyp</span>
          </div>
          <p class="kv">
            {{ imgBlock ? 'display: block → 方块不再参与基线对齐，空隙消失' : '行内级元素坐在基线上，基线下方要给字母降部留空间 → 出现空隙' }}
          </p>
        </div>

        <div class="dbg-fx-cell">
          <p class="kv">长单词撑破容器：{{ wordBreak ? 'overflow-wrap: anywhere 已开' : '默认只在空格处断行' }}</p>
          <div class="dbg-fx-long" :class="{ 'is-anywhere': wordBreak }">
            https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
          </div>
        </div>
      </div>

      <table class="dbg-tt-table" :class="{ 'is-fixed': tableFixed }" style="margin-top: 12px">
        <thead>
          <tr><th>名称</th><th>说明</th><th>超长标识符</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>第一行</td>
            <td :class="{ 'is-anywhere': wordBreak }">一个很长很长很长很长很长很长很长很长很长的中文句子</td>
            <td :class="{ 'is-anywhere': wordBreak }">aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</td>
          </tr>
          <tr>
            <td>第二行</td>
            <td :class="{ 'is-anywhere': wordBreak }">正常内容</td>
            <td :class="{ 'is-anywhere': wordBreak }">bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb</td>
          </tr>
        </tbody>
      </table>

      <div class="dbg-tt-scroll">
        <div class="dbg-tt-content" :class="{ 'is-long': longText }">
          <p class="kv" style="margin: 0">
            scrollbar-gutter 演示：容器固定高 96px + <code>scrollbar-gutter: stable</code>，内容{{ longText ? '已超过容器高度 → 出现滚动条，但预留位置不变，布局不跳' : '没有溢出 → 预留的空位依然占着，所以不会跳' }}。
          </p>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* ① 图片下方空隙：img 默认是 inline（替换元素），坐在文本基线上，
   而基线下方要给 g / y / p 这类字母的降部留空间 → 视觉上就是几像素的缝 */
.dbg-fx-imgbox &#123; line-height: 0 &#125;          /* 方案 A：让行盒没有基线空间 */
.dbg-fx-block.is-block &#123; display: block &#125;     /* 方案 B（推荐）：图片/视频默认就该 block */
.dbg-fx-block &#123; vertical-align: bottom &#125;     /* 方案 C：改变行内级对齐方式 */
/* 三个方案任选其一；最省心的是全局给 img / video / svg 加 display: block。 */

/* ② 长单词/长 URL 不换行：默认只在「空格」处断行 */
.dbg-fx-long.is-anywhere &#123; overflow-wrap: anywhere &#125;
/* 三个容易混的属性：
   overflow-wrap: anywhere   → 允许任意位置断行，且影响 min-content 宽度（推荐）
   overflow-wrap: break-word → 允许任意位置断行，但不影响 min-content 宽度
   word-break: break-all     → 强制任意位置断行，中英文一视同仁（更激进）
   hyphens: auto             → 带连字符的优雅断词（需要 lang 属性、且各浏览器表现不同） */

/* ③ 表格撑破：默认 table-layout: auto 按内容算列宽，长内容直接把表格顶宽 */
.dbg-tt-table &#123; width: 100%; table-layout: auto &#125;     /* ❌ 列宽听内容的 */
.dbg-tt-table.is-fixed &#123; table-layout: fixed &#125;         /* ✅ 列宽听第一行/显式宽度，超出交给换行 */
.dbg-tt-table.is-fixed td &#123; overflow-wrap: anywhere &#125;   /* 配合断词，单元格才真的不溢出 */
/* 表格的两个默认值也要留意：
   · border-collapse: collapse 合并边框（否则边框会「双线」且宽度翻倍）
   · 单元格里的图片 / 长 URL 是溢出常客，可用 overflow: hidden + text-overflow: ellipsis */

/* ④ 滚动条引起的布局跳动：内容变长出现滚动条 → 视口宽度变小 → 整页重排抖动 */
.dbg-tt-scroll &#123;
  height: 96px;
  overflow-y: auto;
  /* scrollbar-gutter: stable → 始终预留滚动条的位置，有没有滚动条都不跳 */
  scrollbar-gutter: stable;
&#125;
/* 也可配合 scrollbar-width: thin / scrollbar-color 定制外观；
   老写法是 overflow-y: scroll 让滚动条常驻（会一直显示滚动条槽）。 */

/* ⑤ 定位相关小坑：sticky 不生效 —— 检查父级有没有 overflow: hidden（会让 sticky 失效或粘在错误位置），
   以及是否忘了给 top / bottom / left / right 中的某一个值。 */</pre>
    </CssCard>

    <!-- ============ ⑦ 排查流程 + 总表 ============ -->
    <CssCard
      title="⑥ 排查流程与常见坑速查表"
      hint="遇到「样式没生效」按顺序走一遍，比盲改快得多。"
      tone="ok"
    >
      <pre class="code">【第一步：Elements 面板 —— 先确认「选中的是不是你以为的那个元素」】
  1. 用左上角的箭头点页面元素（或右键 → 检查）
  2. 看 DOM 结构：有没有多余的包裹层？有没有 v-if 没渲染出来？
  3. 看元素右上角的标签：flex / grid / scroll 徽标会提示它的布局上下文

【第二步：Styles 面板 —— 看「生效」与「被划掉」】
  1. 从上往下就是层叠顺序；被划掉 = 被更高优先级或更靠后的规则覆盖
  2. 看到灰色的 inherit / initial 说明没人给它设值，用的是继承值或初始值
  3. 自定义属性（--x）在展开时可以直接看到解析后的值，也能临时改
  4. ⚠ 如果一条声明整行被划掉且没有替代者 —— 优先怀疑 var() 未定义

【第三步：Computed 面板 —— 看「最终值」】
  1. 这里永远显示「浏览器实际采用的值」，用它可以判断是不是被别处覆盖
  2. 点开某一行会跳到对应规则，方便回溯源头
  3. 找不到某个属性？说明它从未生效（拼写错误 / 选择器没命中）

【第四步：Layout 面板 + 覆盖层 —— 看「盒子与上下文」】
  1. 盒模型图：content / padding / border / margin 的实际像素值，排查溢出第一现场
  2. Flexbox / Grid 覆盖层：展示轨道、gap、对齐方式，比猜快得多
  3. 「Layers / 3D 视图」可以看出谁创建了层叠上下文（z-index 失效时必看）

【第五步：Rendering 面板（性能相关）】
  1. Paint flashing：绿色闪 = 该区域在重绘（动画卡顿时看它）
  2. Layout Shift Regions：蓝色闪 = 发生了布局偏移（CLS 问题）
  3. 勾选「Emulate prefers-reduced-motion」可以验证无障碍降级

【第六步：排错顺序（越靠前越常见）】
  ① 选择器写错 / 类名拼错（Computed 里根本没有这个属性）
  ② 被更高优先级覆盖（Styles 里被划掉）
  ③ 声明本身无效（属性名拼错、值不合法、var() 未定义）
  ④ 元素没渲染 / 被 display: none / 被别的元素盖住（用 3D 视图看）
  ⑤ 布局计算问题（父级尺寸、包含块、BFC、min-width: auto）</pre>

      <table style="margin-top: 12px">
        <thead>
          <tr><th>#</th><th>现象</th><th>根因</th><th>一行解法</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>z-index 怎么调都盖不住</td><td>父级开启了新的层叠上下文</td><td>把 z-index 提到共同父级；去掉 <code>opacity/transform/filter</code></td></tr>
          <tr><td>2</td><td>上下元素间距比写的小</td><td>垂直外边距折叠</td><td>改用 flex/grid 的 <code>gap</code>，或父级 <code>display: flow-root</code></td></tr>
          <tr><td>3</td><td>父级背景/边框「瘪」了</td><td>浮动或绝对定位子元素不占位</td><td>父级 <code>display: flow-root</code>（绝对定位需给高度或改回文档流）</td></tr>
          <tr><td>4</td><td>元素居中失败</td><td>居中参照选错了</td><td>行内 → 父级 <code>text-align</code>；块级 → <code>margin: 0 auto</code> + 定宽；绝对 → <code>inset: 0 + margin: auto</code>；容器 → <code>place-items: center</code></td></tr>
          <tr><td>5</td><td>移动端底部被地址栏顶掉</td><td><code>100vh</code> 是最小视口高度</td><td>改 <code>100dvh</code>（或 flex + <code>min-height: 0</code>）</td></tr>
          <tr><td>6</td><td>width:100% + padding 溢出</td><td>默认 <code>content-box</code></td><td>全局 <code>box-sizing: border-box</code></td></tr>
          <tr><td>7</td><td>flex 子项里的文字撑破容器</td><td>子项 <code>min-width: auto</code></td><td>子项 <code>min-width: 0</code> + <code>overflow-wrap: anywhere</code></td></tr>
          <tr><td>8</td><td>图片下方多几像素</td><td>行内级元素坐在基线上</td><td><code>display: block</code>（或 <code>vertical-align: bottom</code> / 父级 <code>line-height: 0</code>）</td></tr>
          <tr><td>9</td><td>表格/长单词撑破容器</td><td>列宽与断行都由内容决定</td><td><code>table-layout: fixed</code> + <code>overflow-wrap: anywhere</code></td></tr>
          <tr><td>10</td><td>出现滚动条时页面抖动</td><td>滚动条占用了视口宽度</td><td><code>scrollbar-gutter: stable</code>（或 <code>overflow-y: scroll</code> 常驻）</td></tr>
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

/* ---------- ① 层叠上下文 ---------- */
.dbg-sc-stage {
  position: relative;
  height: 150px;
  border-radius: 10px;
  background: var(--c-surface-2);
  padding: 10px;
}
.dbg-sc-parent {
  position: relative;
  height: 110px;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  background: var(--c-surface);
}
.dbg-sc-parent.is-trap {
  /* ⚠ 就是这一行创建了新的层叠上下文，把子元素的 z-index 关在里面 */
  opacity: 0.99;
}
.dbg-sc-item {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  font-family: var(--mono);
}
.dbg-sc-item-a {
  top: 20px;
  left: 24px;
  width: 180px;
  height: 56px;
  background: var(--c-info);
  z-index: 999;
}
.dbg-sc-item-b {
  top: 64px;
  left: 140px;
  width: 180px;
  height: 56px;
  background: var(--c-danger);
  z-index: 1;
}
.dbg-sc-note {
  position: absolute;
  right: 10px;
  top: 8px;
  font-size: 11px;
  color: var(--c-text-dim);
}

/* ---------- ② 外边距折叠 ---------- */
.dbg-mc-wrap {
  padding: 8px 10px;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
}
.dbg-mc-wrap.is-bfc {
  overflow: hidden;
}
.dbg-mc-box {
  padding: 10px 12px;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
}
.dbg-mc-a {
  margin-bottom: 30px;
  background: var(--c-info);
}
.dbg-mc-b {
  margin-top: 30px;
  background: var(--c-primary);
}

/* ---------- ② 高度塌陷（与外边距折叠同卡） ---------- */
.dbg-mch-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.dbg-mch-cell {
  flex: 1 1 260px;
}
.dbg-mch-parent-bad {
  padding: 8px;
  border: 2px dashed var(--c-danger);
  border-radius: 8px;
  background: rgba(229, 83, 75, 0.08);
}
.dbg-mch-parent-good {
  display: flow-root;
  padding: 8px;
  border: 2px dashed var(--c-primary);
  border-radius: 8px;
  background: rgba(66, 184, 131, 0.1);
}
.dbg-mch-child {
  width: 120px;
  padding: 12px;
  border-radius: 6px;
  background: var(--c-accent);
  color: #fff;
  font-size: 12px;
  text-align: center;
}
.dbg-mch-child.is-float {
  float: left;
}
.dbg-mch-child.is-absolute {
  position: absolute;
}

/* ---------- ④ 居中 ---------- */
.dbg-c-stage {
  position: relative;
  height: 150px;
  border-radius: 10px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
}
.dbg-c-item {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-size: 12.5px;
  font-family: var(--mono);
}
/* ❌ 只写 margin auto：元素宽度是 auto（占满），没有剩余空间，无法居中 */
.dbg-c-bad .dbg-c-item {
  margin: 0 auto;
}
/* ✅ 行内级：靠父级文本对齐 */
.dbg-c-inline {
  text-align: center;
  line-height: 150px;
}
.dbg-c-inline .dbg-c-item {
  display: inline-block;
  line-height: 1.4;
}
/* ✅ 块级定宽：margin auto 才有空间可平分 */
.dbg-c-margin .dbg-c-item {
  display: block;
  width: 130px;
  margin: 45px auto 0;
  text-align: center;
}
/* ✅ 绝对定位：inset 0 撑出四边空间，margin auto 才能平分 */
.dbg-c-absolute .dbg-c-item {
  position: absolute;
  inset: 0;
  width: 130px;
  height: 44px;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* ✅ Flex / Grid：把居中交给父级 */
.dbg-c-flex {
  display: flex;
  justify-content: center;
  align-items: center;
}
.dbg-c-grid {
  display: grid;
  place-items: center;
}

/* ---------- ⑤ 视口高度 + 溢出 ---------- */
.dbg-vh-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.dbg-vh-cell {
  flex: 1 1 260px;
}
.dbg-vh-scroll {
  height: 130px;
  overflow-y: auto;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
}
.dbg-vh-box {
  height: 100vh;
  padding: 10px;
  border-radius: 8px;
  background: linear-gradient(160deg, var(--c-info), var(--c-primary));
  color: #fff;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}
.dbg-vh-box.is-dvh {
  height: 100dvh;
}
.dbg-vh-label {
  font-family: var(--mono);
  font-size: 14px;
}
.dbg-vh-tail {
  font-size: 11.5px;
}
.dbg-vh-parent {
  width: 220px;
  max-width: 100%;
  border: 2px dashed var(--c-info);
  border-radius: 8px;
  background: var(--c-surface-2);
}
.dbg-vh-child {
  background: var(--c-warn);
  color: #1f2328;
  font-size: 12px;
  border-radius: 6px;
}

/* ---------- ④⑤ flex 文字溢出 + 图片基线 / 长单词 ---------- */
.dbg-vh-more {
  margin-top: 14px;
  padding: 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
}
.dbg-vh-flex {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.dbg-vh-avatar {
  flex: 0 0 90px;
  padding: 14px 0;
  text-align: center;
  border-radius: 6px;
  background: var(--c-accent);
  color: #fff;
  font-size: 12px;
}
.dbg-vh-text {
  flex: 1;
  font-size: 12.5px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 6px 8px;
}
/* ⚠ 默认 min-width: auto：子项不肯收缩到比内容更小 → 撑破父容器 */
.dbg-vh-text.is-min-zero {
  min-width: 0;
}
.dbg-vh-text.is-anywhere {
  overflow-wrap: anywhere;
}
.dbg-fx-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.dbg-fx-cell {
  flex: 1 1 260px;
}
.dbg-fx-long {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
  font-family: var(--mono);
  font-size: 12px;
  /* 默认只在「空格」处断行：长 URL / 长英文串会直接撑破容器 */
  overflow-wrap: normal;
}
.dbg-fx-long.is-anywhere {
  overflow-wrap: anywhere;
}
.dbg-fx-imgbox {
  padding: 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
  font-size: 13px;
}
.dbg-fx-block {
  display: inline-block;
  width: 90px;
  height: 60px;
  background: var(--c-info);
  color: #fff;
  font-size: 12px;
  text-align: center;
  line-height: 60px;
  vertical-align: baseline;
}
.dbg-fx-block.is-block {
  display: block;
}
.dbg-fx-anchor {
  font-size: 22px;
  color: var(--c-danger);
  text-decoration: underline;
}

/* ---------- ⑤ 表格 / 滚动条 ---------- */
.dbg-tt-table {
  table-layout: auto;
}
.dbg-tt-table.is-fixed {
  table-layout: fixed;
}
.dbg-tt-table td.is-anywhere {
  overflow-wrap: anywhere;
}
.dbg-tt-table.is-fixed td {
  overflow-wrap: anywhere;
}
.dbg-tt-btn {
  font: inherit;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  background: var(--c-surface-2);
  color: var(--c-text);
  cursor: pointer;
}
.dbg-tt-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary-dark);
}
.dbg-tt-scroll {
  height: 96px;
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
  overflow-y: auto;
  scrollbar-gutter: stable;
}
.dbg-tt-content {
  min-height: 60px;
}
.dbg-tt-content.is-long {
  min-height: 340px;
}
</style>
