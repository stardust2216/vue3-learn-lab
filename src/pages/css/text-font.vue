<script setup lang="ts">
import { computed, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 5：文本与字体排版
 *
 * 三条主线：
 *   ① 选字体：font-family 是「回退列表」，从左到右取第一个系统里存在的字体
 *   ② 定节奏：font-size 决定字号，line-height 决定行距（无单位数值最稳）
 *   ③ 做微调：letter-spacing / word-spacing / text-align / text-indent / text-transform / text-decoration
 * 最容易踩的坑集中在最后一张卡片。
 */
const css = useStyleSource()

/* ---------- ① 字体栈 ---------- */
type StackKey = 'system' | 'cjk' | 'serif' | 'mono'
const stack = ref<StackKey>('system')
const stackCode = computed(
  () =>
    ({
      system:
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;",
      cjk: "font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;",
      serif: "font-family: Georgia, 'Times New Roman', 'Songti SC', SimSun, serif;",
      mono: "font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;",
    })[stack.value],
)
const stackNote = computed(
  () =>
    ({
      system:
        '系统 UI 字体栈：macOS 命中 -apple-system，Windows 命中 Segoe UI；末尾的 sans-serif 是通用族兜底。',
      cjk: '中文优先：英文字母会用这些字体内置的西文字形，所以放在西文字体之前也不会难看。',
      serif: '衬线体：长文阅读友好，但在小字号屏幕上笔画容易糊。',
      mono: '等宽体：用来对齐代码和数字；中文字符在等宽字体里的宽度通常是西文的两倍。',
    })[stack.value],
)

/* ---------- ② 字号 / 行高 / 字距 / 对齐 ---------- */
const fontSize = ref(16)
const lineHeight = ref(1.7)
const letterSpacing = ref(0)
const wordSpacing = ref(0)
type AlignKey = 'left' | 'center' | 'right' | 'justify'
const align = ref<AlignKey>('left')
const sampleStyle = computed(() => ({
  fontSize: fontSize.value + 'px',
  lineHeight: lineHeight.value,
  letterSpacing: letterSpacing.value + 'px',
  wordSpacing: wordSpacing.value + 'px',
  textAlign: align.value,
}))
const lhVerdict = computed(() => {
  const lh = lineHeight.value
  if (lh < 1.3) return '行距过窄：长文里上下行会「粘」在一起，眼睛容易串行。'
  if (lh <= 1.9) return '正文的舒适区（大约 1.5 ~ 1.8）：行与行分得开，又不会散成两段。'
  return '行距过宽：一行读完要「跳」很远才找到下一行的开头，同样费眼。'
})

/* ---------- ③ 字重 / 下划线 / 大小写 / 缩进 ---------- */
const weight = ref(400)
const ulOffset = ref(3)
const ulThickness = ref(1)
type DecoKey = 'solid' | 'dashed' | 'dotted' | 'wavy'
const deco = ref<DecoKey>('solid')

/* ---------- ④ white-space 与文本截断 ---------- */
type WsKey = 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces'
const ws = ref<WsKey>('normal')
const wsNote = computed(
  () =>
    ({
      normal: '合并连续空白，允许自动换行（默认值）。',
      nowrap: '合并连续空白，禁止自动换行 → 内容横向溢出容器。',
      pre: '原样保留空白和换行符，但只在换行符处断行（长文本会横向溢出）。',
      'pre-wrap': '保留空白和换行符，同时允许自动换行。',
      'pre-line': '保留换行符，但合并连续的空格（常见的「留言板」效果）。',
      'break-spaces': '像 pre-wrap，但行尾的空格也保留，而且每个空格都是一个换行机会。',
    })[ws.value],
)
/** 用插值生成文本：源码里的空白会被模板编译器压缩，只有运行时字符串才是可靠的 */
const wsSample =
  '第一行后面有      连续多个空格\n第二行是源码里的一个换行符\n这一行很长很长，用来观察 white-space 允不允许自动换行；如果不允许，它就会横向溢出容器（容器开了 overflow-x: auto，可以左右滚动）。'
type ClampKey = 2 | 3 | 4
const clampLines = ref<ClampKey>(3)
const boxWidth = ref(100)
const longText =
  '多行截断要三件套：display: -webkit-box 把元素变成「块级弹性盒」，-webkit-box-orient: vertical 让内容竖排，再用 -webkit-line-clamp 限制显示行数，最后 overflow: hidden 把超出的行裁掉。这段文字故意写长一点，保证在任何合理宽度下都放不下三行，切换行数时效果才明显。'

/* ---------- ⑤ vertical-align 与基线 ---------- */
type VaKey = 'baseline' | 'top' | 'middle' | 'bottom' | 'text-top' | 'text-bottom' | 'sub' | 'super'
const va = ref<VaKey>('baseline')
const vaNote = computed(
  () =>
    ({
      baseline: '默认值：行内盒自己的基线与父级行盒的基线对齐（图片的基线就是它的下外边距边缘）。',
      top: '与整条行盒的顶部对齐。',
      middle: '与「父级基线 + x-height 的一半」对齐，图片配文字时最常用。',
      bottom: '与整条行盒的底部对齐，图片底部那几像素空隙立刻消失。',
      'text-top': '与父级内容区的顶部对齐。',
      'text-bottom': '与父级内容区的底部对齐。',
      sub: '降到下标位置（可能会把行盒撑高）。',
      super: '升到上标位置（可能会把行盒撑高）。',
    })[va.value],
)
</script>

<template>
  <div>
    <h1>5. 文本与字体排版</h1>
    <p class="lead">
      排版里真正决定「好不好看」的只有三件事：<strong>用了什么字体、字号多大、行距多少</strong>。
      其余的（字距、对齐、缩进、大小写、下划线）都是微调。这一页把每一项都做成能拖能切的样子，
      重点记住两条：<code>font-family</code> 是一个回退列表，<code>line-height</code> 永远优先写无单位数值。
    </p>

    <CssCard
      title="① 字体栈：font-family 是一份「回退列表」"
      hint="切换下拉框，同一段文字会用不同的字体栈渲染；注意最后一定要有通用族兜底。"
      :source="css.rules('.txt-stack-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="stack">
          <option value="system">系统 UI 字体栈</option>
          <option value="cjk">中文优先</option>
          <option value="serif">衬线 serif</option>
          <option value="mono">等宽 monospace</option>
        </select>
      </template>

      <p class="kv">{{ stackCode }}</p>
      <p
        class="txt-stack-sample"
        :class="{
          'txt-stack-system': stack === 'system',
          'txt-stack-cjk': stack === 'cjk',
          'txt-stack-serif': stack === 'serif',
          'txt-stack-mono': stack === 'mono',
        }"
      >
        Vue 3 让排版可预测 — The quick brown fox jumps over the lazy dog. 0123456789
      </p>
      <p class="hint">{{ stackNote }}</p>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>写法</th><th>含义</th><th>为什么要这么写</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>-apple-system</code></td>
            <td>关键字，等价于系统的 UI 字体</td>
            <td>macOS / iOS 上是 San Francisco，不用写字体名</td>
          </tr>
          <tr>
            <td><code>'Segoe UI'</code></td>
            <td>带空格的字体名要加引号</td>
            <td>不加引号时，空格会被当成列表分隔符，字体名直接被拆坏</td>
          </tr>
          <tr>
            <td><code>sans-serif</code></td>
            <td>通用族（generic family）</td>
            <td>它不是某个字体，而是「浏览器自己挑一个无衬线体」，必须放在最后兜底</td>
          </tr>
          <tr>
            <td>字体栈很长</td>
            <td>从 macOS → Windows → Android → Linux 逐层覆盖</td>
            <td>浏览器从左往右找第一个「本机存在」的字体；写全是为了让所有平台都命中系统原生字体</td>
          </tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        用系统字体栈的最大好处是<b>零网络请求、零闪烁</b>。自定义字体走 <code>@font-face</code> 时，
        Chrome 的默认行为是先「隐形」最多 3 秒（FOIT），再显示后备字体；写 <code>font-display: swap</code>
        可以换成「先用后备字体显示，字体下载完再替换」（FOUT，代价是有一次视觉跳动）。
      </p>
    </CssCard>

    <CssCard
      title="② 字号 / 行高 / 字距 / 对齐：拖动看阅读体验的变化"
      hint="拖动滑块改字号、line-height、字距，右边切换对齐方式，下面会给出当前设置的判断。"
      :source="css.rules('.txt-type-')"
    >
      <template #extra>
        <select v-model="align">
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
          <option value="justify">justify</option>
        </select>
      </template>

      <div class="txt-type-ctl">
        <label class="txt-ctl">font-size <input type="range" min="12" max="26" v-model.number="fontSize" /> {{ fontSize }}px</label>
        <label class="txt-ctl">line-height <input type="range" min="1" max="2.6" step="0.05" v-model.number="lineHeight" /> {{ lineHeight }}</label>
        <label class="txt-ctl">letter-spacing <input type="range" min="-0.5" max="4" step="0.1" v-model.number="letterSpacing" /> {{ letterSpacing }}px</label>
        <label class="txt-ctl">word-spacing <input type="range" min="0" max="12" v-model.number="wordSpacing" /> {{ wordSpacing }}px</label>
      </div>

      <p class="txt-type-preview" :style="sampleStyle">
        排版的第一原则是「读得下去」。字号决定一只眼睛一次能抓住多少字，行高决定读完一行之后
        能不能顺畅地找到下一行。行距太紧，上下行的笔画会互相干扰；行距太松，视线在行与行之间
        来回跳，一样累。中文正文的舒适区间大约在 1.6 ~ 1.9 之间，标题可以压到 1.1 ~ 1.3。
      </p>
      <p class="kv">{{ lhVerdict }}</p>

      <div class="txt-type-lh-grid">
        <div class="txt-type-lh-card">
          <p class="kv">line-height: 1.5（无单位数值）</p>
          <p class="txt-type-lh-unitless">
            父级 20px 的字
            <span class="txt-type-lh-unitless-small">子级 12px：继承的是「1.5 倍」这个比例，所以行高自己算成 18px，看着依然紧凑</span>
          </p>
        </div>
        <div class="txt-type-lh-card">
          <p class="kv">line-height: 150%（会被算成固定值再继承）</p>
          <p class="txt-type-lh-percent">
            父级 20px 的字
            <span class="txt-type-lh-percent-small">子级 12px：继承的是算好的 30px 固定行高，于是小字被撑得很松</span>
          </p>
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        这就是「无单位行高」唯一但要命的好处：<b>它把计算推迟到每个元素自己做</b>。
        百分比和 px 都会在父元素上先算成一个固定长度，然后把这个长度一路继承下去。
      </p>
    </CssCard>

    <CssCard
      title="③ 字重、下划线、大小写与首行缩进"
      hint="拖动字重与下划线参数；注意 font-weight 只在字体文件真的包含该字重时才「真」生效。"
      :source="css.rules('.txt-deco-')"
    >
      <template #extra>
        <select v-model="deco">
          <option value="solid">solid</option>
          <option value="dashed">dashed</option>
          <option value="dotted">dotted</option>
          <option value="wavy">wavy</option>
        </select>
      </template>

      <div class="txt-deco-ctl">
        <label class="txt-ctl">font-weight <input type="range" min="100" max="900" step="50" v-model.number="weight" /> {{ weight }}</label>
        <label class="txt-ctl">underline-offset <input type="range" min="0" max="12" v-model.number="ulOffset" /> {{ ulOffset }}px</label>
        <label class="txt-ctl">thickness <input type="range" min="1" max="6" v-model.number="ulThickness" /> {{ ulThickness }}px</label>
      </div>

      <p class="txt-deco-weight" :style="{ fontWeight: String(weight) }">
        字重 {{ weight }}：font-weight 取值 100 ~ 900（normal = 400、bold = 700）。
        如果字体文件里没有这个字重，浏览器会<b>合成</b>一个假粗体（笔画被硬撑粗，边缘发糊）；
        可变字体（variable font）一个文件里带连续的 wght 轴，才能写 450 这种中间值。
      </p>

      <p
        class="txt-deco-link"
        :class="{
          'txt-deco-ul-solid': deco === 'solid',
          'txt-deco-ul-dashed': deco === 'dashed',
          'txt-deco-ul-dotted': deco === 'dotted',
          'txt-deco-ul-wavy': deco === 'wavy',
        }"
        :style="{ textUnderlineOffset: ulOffset + 'px', textDecorationThickness: ulThickness + 'px' }"
      >
        下划线：text-decoration 是简写（线型 / 样式 / 颜色 / 粗细），
        text-underline-offset 单独控制「离文字多远」——默认贴着文字，中文里常常压到笔画上。
      </p>

      <p class="txt-deco-indent">
        首行缩进：<code>text-indent: 2em</code> 是中文排版里最自然的两字缩进。它只作用于
        <b>块级容器的第一行</b>，后面的行不受影响；写成负值就是「悬挂缩进」。
      </p>

      <div class="txt-deco-row">
        <span class="txt-deco-label">原文本</span>
        <span>Vue 3 Text and Font</span>
      </div>
      <div class="txt-deco-row">
        <span class="txt-deco-label">uppercase</span>
        <span class="txt-deco-upper">Vue 3 Text and Font</span>
      </div>
      <div class="txt-deco-row">
        <span class="txt-deco-label">lowercase</span>
        <span class="txt-deco-lower">Vue 3 Text and Font</span>
      </div>
      <div class="txt-deco-row">
        <span class="txt-deco-label">capitalize</span>
        <span class="txt-deco-capitalize">vue 3 text and font</span>
      </div>
      <p class="hint" style="margin-top: 6px">
        text-transform 是<b>纯视觉</b>变换：DOM 里、复制出来的、表单提交的都是原文。
        所以它不能当校验用（大小写规则要在数据层处理）。
      </p>
    </CssCard>

    <CssCard
      title="④ white-space 与文本截断"
      hint="切换 white-space 看空白与换行的处理差异；再切截断行数与容器宽度看两种截断的效果。"
      :source="css.rules('.txt-ws-')"
      tone="ok"
    >
      <template #extra>
        <select v-model="ws">
          <option value="normal">normal</option>
          <option value="nowrap">nowrap</option>
          <option value="pre">pre</option>
          <option value="pre-wrap">pre-wrap</option>
          <option value="pre-line">pre-line</option>
          <option value="break-spaces">break-spaces</option>
        </select>
      </template>

      <div class="txt-ws-ctl">
        <label class="txt-ctl">截断行数
          <select v-model="clampLines">
            <option :value="2">2 行</option>
            <option :value="3">3 行</option>
            <option :value="4">4 行</option>
          </select>
        </label>
        <label class="txt-ctl">容器宽度 <input type="range" min="30" max="100" v-model.number="boxWidth" /> {{ boxWidth }}%</label>
      </div>

      <p class="kv">white-space: {{ ws }} —— {{ wsNote }}</p>
      <div
        class="txt-ws-box"
        :class="{
          'txt-ws-normal': ws === 'normal',
          'txt-ws-nowrap': ws === 'nowrap',
          'txt-ws-pre': ws === 'pre',
          'txt-ws-prewrap': ws === 'pre-wrap',
          'txt-ws-preline': ws === 'pre-line',
          'txt-ws-breakspaces': ws === 'break-spaces',
        }"
      >{{ wsSample }}</div>

      <p class="kv" style="margin-top: 12px">单行截断：overflow: hidden + white-space: nowrap + text-overflow: ellipsis</p>
      <p class="txt-ws-ellipsis" :style="{ width: boxWidth + '%' }">{{ longText }}</p>

      <p class="kv" style="margin-top: 12px">多行截断：display: -webkit-box + -webkit-box-orient: vertical + -webkit-line-clamp: {{ clampLines }}</p>
      <div class="txt-ws-stage" :style="{ width: boxWidth + '%' }">
        <p
          class="txt-ws-clamp"
          :class="{
            'txt-ws-clamp-2': clampLines === 2,
            'txt-ws-clamp-3': clampLines === 3,
            'txt-ws-clamp-4': clampLines === 4,
          }"
        >{{ longText }}</p>
      </div>
      <p class="hint" style="margin-top: 8px">
        两种截断都必须有<b>宽度约束</b>：容器宽度滑块拖到 100% 时依然会截断，是因为容器本身有宽度上限；
        如果把这两个元素放进 flex 行里，还要给它们加 <code>min-width: 0</code>，否则会被内容撑开、永远不溢出。
      </p>
    </CssCard>

    <CssCard
      title="⑤ vertical-align 与行内元素的基线问题"
      hint="切换 vertical-align，观察图片在行盒里的位置变化；下面那条线就是文字基线。"
      :source="css.rules('.txt-va-')"
    >
      <template #extra>
        <select v-model="va">
          <option value="baseline">baseline</option>
          <option value="top">top</option>
          <option value="middle">middle</option>
          <option value="bottom">bottom</option>
          <option value="text-top">text-top</option>
          <option value="text-bottom">text-bottom</option>
          <option value="sub">sub</option>
          <option value="super">super</option>
        </select>
      </template>

      <div class="txt-va-stage">
        <p class="txt-va-line">
          汉字 gp 字
          <img
            class="txt-va-img"
            :class="{
              'txt-va-baseline': va === 'baseline',
              'txt-va-top': va === 'top',
              'txt-va-middle': va === 'middle',
              'txt-va-bottom': va === 'bottom',
              'txt-va-texttop': va === 'text-top',
              'txt-va-textbottom': va === 'text-bottom',
              'txt-va-sub': va === 'sub',
              'txt-va-super': va === 'super',
            }"
            src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='44'%20height='44'%3E%3Crect%20width='44'%20height='44'%20rx='8'%20fill='%233b82f6'/%3E%3C/svg%3E"
            alt="示例图片"
          />
          汉字 gp 字
        </p>
      </div>
      <p class="kv">当前 vertical-align: {{ va }} —— {{ vaNote }}</p>

      <pre class="code" style="margin-top: 10px">
/* 图片底部莫名多出几像素空白？这是「行内替换元素按基线对齐」的结果：
   基线下方要给字母的降部（g p y 的下半部分）留位置，图片底边却正好压在基线上。 */
img { vertical-align: middle }   /* 或者让图片不再参与行内布局 */
img { display: block }           /* 图片变成了块级盒子，基线问题直接消失 */

/* 反过来说：vertical-align 只对 inline / inline-block / table-cell 有效，
   给块级元素写 vertical-align 是完全无效的 —— 垂直居中请用 flex / grid。 */</pre
      >
    </CssCard>

    <CssCard title="⑥ 速查表与常见坑" tone="warn">
      <table>
        <thead>
          <tr><th>属性</th><th>常用值</th><th>要点</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>font-family</code></td>
            <td>字体栈 + 通用族</td>
            <td>从左到右取第一个存在的字体；含空格的字体名要加引号；通用族放最后兜底</td>
          </tr>
          <tr>
            <td><code>font-size</code></td>
            <td><code>16px</code> / <code>1rem</code> / <code>clamp()</code></td>
            <td>px 不跟随用户设置的默认字号，rem 会跟随；标题用 clamp() 可以平滑缩放</td>
          </tr>
          <tr>
            <td><code>line-height</code></td>
            <td>无单位数值 <code>1.7</code></td>
            <td>正文 1.5~1.8、标题 1.1~1.3；写百分比或 px 会被继承成固定值</td>
          </tr>
          <tr>
            <td><code>font-weight</code></td>
            <td>100~900 / normal / bold</td>
            <td>400 = normal、700 = bold；字体里没有对应字重时会被「合成」出假粗体</td>
          </tr>
          <tr>
            <td><code>letter-spacing</code></td>
            <td>长度值，可为负</td>
            <td>会加在<b>每个字符</b>后面（包括最后一个），居中文本因此会略微偏左</td>
          </tr>
          <tr>
            <td><code>word-spacing</code></td>
            <td>长度值</td>
            <td>只影响「词与词之间的空白」；中文没有空格，所以基本无效</td>
          </tr>
          <tr>
            <td><code>text-align</code></td>
            <td>left / center / right / justify</td>
            <td>justify 靠拉伸空白实现，西文长文容易出现难看的「空隙河流」；最后一行由 text-align-last 控制</td>
          </tr>
          <tr>
            <td><code>text-indent</code></td>
            <td><code>2em</code> / 负值</td>
            <td>只作用于块级容器的第一行</td>
          </tr>
          <tr>
            <td><code>text-decoration</code></td>
            <td><code>underline wavy 2px</code></td>
            <td>简写含线型/样式/颜色/粗细；距离用 text-underline-offset 单独设</td>
          </tr>
          <tr>
            <td><code>text-transform</code></td>
            <td>uppercase / lowercase / capitalize</td>
            <td>纯视觉，DOM 文本不变，不能用来做数据校验</td>
          </tr>
          <tr>
            <td><code>white-space</code></td>
            <td>normal / nowrap / pre / pre-wrap / pre-line</td>
            <td>同时管两件事：空白要不要合并、允许不允许自动换行</td>
          </tr>
          <tr>
            <td><code>text-overflow</code></td>
            <td>ellipsis</td>
            <td>只在 overflow 非 visible 且 nowrap 时生效，并且容器必须有宽度约束</td>
          </tr>
          <tr>
            <td><code>vertical-align</code></td>
            <td>baseline / middle / top / bottom</td>
            <td>只对 inline / inline-block / table-cell 生效，对块级元素无效</td>
          </tr>
          <tr>
            <td><code>-webkit-line-clamp</code></td>
            <td>整数行数</td>
            <td>需配合 display: -webkit-box、-webkit-box-orient: vertical、overflow: hidden</td>
          </tr>
        </tbody>
      </table>

      <ol class="txt-pit">
        <li><b>line-height 写百分比或 px</b>：会被算成固定长度再继承，子元素字号变小后行距显得巨大 → 永远用无单位数值。</li>
        <li><b>text-decoration 会向后代「传播」</b>：给父元素加了下划线，子元素写 <code>text-decoration: none</code> 也去不掉（颜色/样式/粗细可以改）。</li>
        <li><b>截断失效</b>：三件套缺一不可，而且元素必须在 flex/grid 里加 <code>min-width: 0</code>，否则它会被内容撑开。</li>
        <li><b>图片底部空隙</b>：baseline 对齐给字母降部留的空间 → <code>display: block</code> 或 <code>vertical-align: middle</code>。</li>
        <li><b>行内元素的垂直 padding</b>：会给背景「涂出去」，但不会把行盒撑高，于是和上下行重叠 —— 要占空间就用 inline-block 或 block。</li>
        <li><b>长单词撑破容器</b>：用 <code>overflow-wrap: anywhere</code>（或 break-word）而不是 <code>word-break: break-all</code>（它会把所有单词随意断开）。</li>
        <li><b>字距与居中</b>：居中的短标题加了 letter-spacing 会看起来偏左，因为最后一个字符后面也算了一份间距。</li>
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

/* 卡片通用的控制器（滑块 / 标签） */
.txt-ctl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--c-text-dim);
  white-space: nowrap;
}
.txt-ctl input[type='range'] {
  width: 110px;
}

/* ① 字体栈 */
.txt-stack-sample {
  margin: 8px 0;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-size: 17px;
  line-height: 1.6;
}
.txt-stack-system {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
}
.txt-stack-cjk {
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}
.txt-stack-serif {
  font-family: Georgia, 'Times New Roman', 'Songti SC', SimSun, serif;
}
.txt-stack-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

/* ② 字号 / 行高 / 字距 */
.txt-type-ctl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 10px;
}
.txt-type-preview {
  margin: 0;
  padding: 12px 14px;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
}
.txt-type-lh-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 10px;
}
.txt-type-lh-card {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 10px 12px;
}
.txt-type-lh-card .kv {
  margin: 0 0 6px;
}
.txt-type-lh-unitless {
  margin: 0;
  font-size: 20px;
  line-height: 1.5;
}
.txt-type-lh-unitless-small {
  display: block;
  font-size: 12px;
  color: var(--c-text-dim);
}
.txt-type-lh-percent {
  margin: 0;
  font-size: 20px;
  line-height: 150%;
}
.txt-type-lh-percent-small {
  display: block;
  font-size: 12px;
  color: var(--c-text-dim);
}

/* ③ 字重 / 下划线 / 大小写 / 缩进 */
.txt-deco-ctl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 10px;
}
.txt-deco-weight {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--c-surface-2);
  font-size: 15px;
}
.txt-deco-link {
  display: inline-block;
  margin: 0 0 10px;
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--c-primary-dark);
  text-decoration: underline;
  cursor: default;
}
.txt-deco-ul-solid {
  text-decoration-style: solid;
}
.txt-deco-ul-dashed {
  text-decoration-style: dashed;
}
.txt-deco-ul-dotted {
  text-decoration-style: dotted;
}
.txt-deco-ul-wavy {
  text-decoration-style: wavy;
}
.txt-deco-indent {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-left: 3px solid var(--c-primary);
  background: var(--c-surface-2);
  border-radius: 0 8px 8px 0;
  text-indent: 2em;
}
.txt-deco-row {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 14px;
  padding: 2px 0;
}
.txt-deco-label {
  width: 92px;
  flex: none;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--c-text-dim);
}
.txt-deco-upper {
  text-transform: uppercase;
}
.txt-deco-lower {
  text-transform: lowercase;
}
.txt-deco-capitalize {
  text-transform: capitalize;
}

/* ④ white-space 与截断 */
.txt-ws-ctl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 8px;
}
.txt-ws-box {
  margin-top: 6px;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
  font-size: 13.5px;
  line-height: 1.75;
  overflow-x: auto;
}
.txt-ws-normal {
  white-space: normal;
}
.txt-ws-nowrap {
  white-space: nowrap;
}
.txt-ws-pre {
  white-space: pre;
}
.txt-ws-prewrap {
  white-space: pre-wrap;
}
.txt-ws-preline {
  white-space: pre-line;
}
.txt-ws-breakspaces {
  white-space: break-spaces;
}
.txt-ws-ellipsis {
  margin: 6px 0 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid var(--c-info);
  font-size: 13.5px;
}
.txt-ws-stage {
  margin-top: 6px;
}
.txt-ws-clamp {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(66, 184, 131, 0.12);
  border: 1px solid var(--c-primary);
  font-size: 13.5px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.txt-ws-clamp-2 {
  -webkit-line-clamp: 2;
}
.txt-ws-clamp-3 {
  -webkit-line-clamp: 3;
}
.txt-ws-clamp-4 {
  -webkit-line-clamp: 4;
}

/* ⑤ vertical-align 与基线 */
.txt-va-stage {
  padding: 10px 12px;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  background: var(--c-surface-2);
  overflow-x: auto;
}
.txt-va-line {
  margin: 0;
  font-size: 18px;
  line-height: 2;
  white-space: nowrap;
}
.txt-va-img {
  border-radius: 8px;
  vertical-align: baseline;
}
.txt-va-baseline {
  vertical-align: baseline;
}
.txt-va-top {
  vertical-align: top;
}
.txt-va-middle {
  vertical-align: middle;
}
.txt-va-bottom {
  vertical-align: bottom;
}
.txt-va-texttop {
  vertical-align: text-top;
}
.txt-va-textbottom {
  vertical-align: text-bottom;
}
.txt-va-sub {
  vertical-align: sub;
}
.txt-va-super {
  vertical-align: super;
}

/* ⑥ 坑清单 */
.txt-pit {
  margin: 12px 0 0;
  padding-left: 22px;
  font-size: 13px;
  line-height: 1.9;
}
.txt-pit li {
  margin-bottom: 4px;
}
</style>
