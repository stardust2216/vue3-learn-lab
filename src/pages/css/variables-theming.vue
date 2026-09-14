<script setup lang="ts">
import { reactive, ref } from 'vue'
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'

/**
 * CSS 14：变量与现代 CSS
 *
 * 自定义属性（custom property）和 Sass/Less 变量的本质区别：
 *   它不是「编译期替换」，而是「运行期的继承值」——
 *   所以它能被 JS 读写、能参与级联、能随媒体查询 / class 切换而改变。
 * 本页所有演示都在「局部容器」上生效，不会影响整站的主题。
 */
const css = useStyleSource()

/* ---------- ① 变量的定义与使用 ---------- */
/* 四级变量同时存在，切换看「哪一级赢」 */
const varState = reactive({ base: true, cardOn: false, boxOn: false })

/* ---------- ② JS 动态改变量 ---------- */
const jsColor = ref('#42b883')
const jsRadius = ref(12)
const jsPadding = ref(16)

/* ---------- ③ 主题切换（只在卡片内的容器上生效） ---------- */
const themeMode = ref<'light' | 'dark'>('light')
const accent = ref('#3b82f6')
const radius = ref(12)

/* ---------- ④ 作用域与继承 ---------- */
const inheritTint = ref('#42b883')

/* ---------- ⑤ 现代 CSS ---------- */
const spinOn = ref(true)

/* ---------- ⑥ 设计令牌分层 ---------- */
const tokenShift = ref(false)
</script>

<template>
  <div>
    <h1>14. 变量与现代 CSS</h1>
    <p class="lead">
      <code>--x: value</code> + <code>var(--x, 回退值)</code> 是现代 CSS 的地基：
      <strong>设计令牌、主题切换、组件可配置化，全都建立在「自定义属性会继承、能被 JS 改写」这两点上</strong>。
      它的最大陷阱也很简单：<strong>变量未定义时，整条声明直接失效</strong>（不是取空值）。
    </p>

    <!-- ============ ① 定义 / var() / 回退值 ============ -->
    <CssCard
      title="① 定义与 var()：回退值怎么写，未定义会发生什么"
      hint="三个开关分别「打开卡片级变量」「打开元素级变量」。观色块颜色，它只取「离自己最近的那一层」。"
      :source="css.rules('.vt-var')"
      tone="ok"
    >
      <template #extra>
        <label class="kv"><input v-model="varState.base" type="checkbox" /> :root 上的 --vt-base</label>
        <label class="kv"><input v-model="varState.cardOn" type="checkbox" /> 卡片上的 --vt-base</label>
        <label class="kv"><input v-model="varState.boxOn" type="checkbox" /> 元素上的 --vt-base</label>
      </template>

      <div class="vt-var-root" :class="{ 'vt-var-root-on': varState.base }">
        <div class="vt-var-card" :class="{ 'vt-var-card-on': varState.cardOn }">
          <div class="vt-var-box" :class="{ 'vt-var-box-on': varState.boxOn }">
            <b>--vt-base</b>
            <span class="vt-var-note">
              生效来源：{{ varState.boxOn ? '元素自己' : varState.cardOn ? '卡片（继承下来）' : varState.base ? '外层 :root' : '都没定义 → 走 var() 回退值' }}
            </span>
          </div>

          <div class="vt-var-row">
            <span class="vt-swatch vt-swatch-fallback">
              var(--vt-missing, #e5534b)<br /><span class="vt-var-note">变量不存在 → 用回退值</span>
            </span>
            <span class="vt-swatch vt-swatch-bad">
              background: var(--vt-missing)<br /><span class="vt-var-note">没有回退值 → 整条声明无效（透明）</span>
            </span>
            <span class="vt-swatch vt-swatch-good">
              background: var(--vt-base, #e5534b)<br /><span class="vt-var-note">有定义就直接取值</span>
            </span>
          </div>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* 定义：名字必须以 -- 开头，大小写敏感；值几乎可以是任何「声明值」 */
:root &#123;
  --vt-base: #42b883;
  --vt-gap: 12px;
  --vt-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
&#125;

/* 使用：var(变量名, 回退值) */
.vt-var-box &#123;
  background: var(--vt-base, #e5534b);   /* 找不到 --vt-base 就用 #e5534b */
  padding: var(--vt-gap, 8px);
&#125;

/* ⚠ 陷阱：没有回退值 + 变量不存在 = 这条声明「无效」，会被丢弃。
   它不是「取到空字符串」，而是整条 background 都不生效（于是你看到透明）。
   回退值也可以是嵌套的：var(--a, var(--b, 16px)) */

/* ⚠ 另一个陷阱：变量值在「使用处」才被解析，所以下面的写法是合法的 */
:root &#123; --vt-size: 16px &#125;
.a &#123; --vt-size: 24px &#125;     /* 只影响 .a 及其后代 */

/* 变量不能被用作「属性名」或「选择器」，也别指望它做数学运算：
   calc(var(--vt-size) * 2) 可以，但 var(--vt-size) * 2 不行 */</pre>
    </CssCard>

    <!-- ============ ② JS 动态改变量 ============ -->
    <CssCard
      title="② 用 JS 动态改变量：一次改变，所有使用者同步更新"
      hint="三个控制器写的是同一个元素上的内联自定义属性（等价于 el.style.setProperty）。"
      :source="css.rules('.vt-js')"
      tone="warn"
    >
      <template #extra>
        <label class="kv">--vt-js-color <input v-model="jsColor" type="color" /></label>
        <label class="kv">--vt-js-radius <input v-model.number="jsRadius" type="range" min="0" max="40" /> {{ jsRadius }}px</label>
        <label class="kv">--vt-js-pad <input v-model.number="jsPadding" type="range" min="4" max="36" /> {{ jsPadding }}px</label>
      </template>

      <div
        class="vt-js-host"
        :style="{ '--vt-js-color': jsColor, '--vt-js-radius': jsRadius + 'px', '--vt-js-pad': jsPadding + 'px' }"
      >
        <div class="vt-js-card vt-js-tone">令牌 A（背景/圆角/内边距都读变量）</div>
        <div class="vt-js-card vt-js-badge">令牌 B（同一个变量的另一处使用）</div>
        <button class="vt-js-btn" type="button">按钮也读同一批变量</button>
      </div>

      <pre class="code" style="margin-top: 10px">/* 三个使用者在 CSS 里都只写 var()，互不知情 */
.vt-js-tone &#123;
  background: var(--vt-js-color);
  border-radius: var(--vt-js-radius);
  padding: var(--vt-js-pad);
&#125;
.vt-js-badge &#123; border: 2px solid var(--vt-js-color); border-radius: var(--vt-js-radius) &#125;
.vt-js-btn &#123;
  background: var(--vt-js-color);
  border-radius: var(--vt-js-radius);
&#125;

/* JS 侧：写一次，所有使用者一起变 */
const host = document.querySelector('.vt-js-host');
host.style.setProperty('--vt-js-color', '#3b82f6');   /* 写 */
host.style.setProperty('--vt-js-radius', '24px');
host.style.getPropertyValue('--vt-js-color');          /* 读：返回 ' #3b82f6'（可能带前导空格） */
host.style.removeProperty('--vt-js-color');            /* 移除 → 回到继承值或 var() 回退值 */

/* 为什么比「直接改 N 个类名」好：
   ① 一次 DOM 写操作，触发一次样式重算；
   ② 消费者（子组件）不需要知道自己被主题化了；
   ③ 可以只改一个子树（比如拖拽时只在被拖的元素上改变量）。 */

/* 配合 Vue 更省事：把变量直接写进 :style 对象（本卡片就是这么做的） */
/* 用法示意：:style="&#123; '--vt-js-color': jsColor &#125;" */</pre>
    </CssCard>

    <!-- ============ ③ 主题切换 ============ -->
    <CssCard
      title="③ 主题切换：light / dark 两套变量，只作用在页内容器上"
      hint="切换下面容器自己的 class（不影响整站主题）。本项目整站用的是 html.dark + 变量覆盖，思路完全一样。"
      :source="css.rules('.vt-theme')"
    >
      <template #extra>
        <select v-model="themeMode">
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
        <label class="kv">--vt-accent <input v-model="accent" type="color" /></label>
        <label class="kv">--vt-radius <input v-model.number="radius" type="range" min="0" max="28" /> {{ radius }}px</label>
      </template>

      <div
        class="vt-theme"
        :class="{ 'is-dark': themeMode === 'dark', 'is-light': themeMode === 'light' }"
        :style="{ '--vt-theme-accent': accent, '--vt-theme-radius': radius + 'px' }"
      >
        <div class="vt-theme-panel">
          <h4 class="vt-theme-title">局部主题容器</h4>
          <p class="vt-theme-text">这里的文字、背景、边框、按钮颜色全部来自本容器的 CSS 变量。</p>
          <div class="vt-theme-actions">
            <button class="vt-theme-btn vt-theme-btn-primary" type="button">主要按钮</button>
            <button class="vt-theme-btn" type="button">次要按钮</button>
            <span class="vt-theme-chip">chip</span>
          </div>
          <div class="vt-theme-tokens">
            <code>--vt-theme-bg</code>
            <code>--vt-theme-surface</code>
            <code>--vt-theme-text</code>
            <code>--vt-theme-border</code>
            <code>--vt-theme-accent</code>
          </div>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* 一、把「具体颜色」和「用途」分成两层：语义令牌先定义在容器上 */
.vt-theme.is-light &#123;
  --vt-theme-bg: #f6f7f9;
  --vt-theme-surface: #ffffff;
  --vt-theme-text: #1f2328;
  --vt-theme-border: #e3e6ea;
&#125;
.vt-theme.is-dark &#123;
  --vt-theme-bg: #16181d;
  --vt-theme-surface: #1e2127;
  --vt-theme-text: #e6e8eb;
  --vt-theme-border: #343a44;
&#125;

/* 二、组件只消费语义令牌，永远不写具体颜色 */
.vt-theme-panel &#123;
  background: var(--vt-theme-surface);
  color: var(--vt-theme-text);
  border: 1px solid var(--vt-theme-border);
  border-radius: var(--vt-theme-radius, 12px);
&#125;
.vt-theme-btn-primary &#123;
  background: var(--vt-theme-accent);
  color: #fff;
&#125;

/* 三、暗色主题的三种实现，按「用户能不能选」来挑 */
/* A. 跟随系统：@media (prefers-color-scheme: dark) —— 无法手动切换 */
/* B. class 切换：html.dark / 容器 .is-dark —— 用户可切换、可持久化（本项目用的就是这套） */
/* C. color-scheme: light dark —— 让浏览器原生控件（滚动条、表单、光标）也跟着变色，
      它不是「主题系统」，而是「告诉浏览器当前配色」，通常与 A/B 配合使用 */
:root &#123; color-scheme: light &#125;
html.dark &#123; color-scheme: dark &#125;

/* ⚠ 局部主题不会影响 :root 上的浏览器控件；
   如果要在整站切换，记得同时切换 html.dark 与 color-scheme。 */</pre>
    </CssCard>

    <!-- ============ ④ 作用域与继承 ============ -->
    <CssCard
      title="④ 作用域与继承：变量定义在 :root / 组件 / 元素上的差别"
      hint="拖动颜色控制器改变父级变量，观察「会继承的子元素」与「自己覆盖过的子元素」分别怎么表现。"
      :source="css.rules('.vt-scope')"
    >
      <template #extra>
        <label class="kv">父级 --vt-tint <input v-model="inheritTint" type="color" /></label>
      </template>

      <div class="vt-scope" :style="{ '--vt-tint': inheritTint }">
        <div class="vt-scope-a">A 没定义 → 继承父级 <code>var(--vt-tint)</code></div>
        <div class="vt-scope-b">B 自己定义了 <code>--vt-tint: #d29922</code>（半径内后代都用它）</div>
        <div class="vt-scope-c">C 定义了但只影响自己：<code>--vt-tint: #e5534b</code></div>
      </div>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>定义位置</th><th>可见范围</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>:root</code>（= <code>html</code>）</td><td>全站，可被任何后代覆盖</td><td>设计令牌的默认值、字号、间距</td></tr>
          <tr><td>组件根元素（如 <code>.card</code>）</td><td>该组件子树，不污染外部</td><td>组件的可配置参数（同 Vue 的 props 思路）</td></tr>
          <tr><td>具体元素 / 内联 style</td><td>只影响该元素及其后代</td><td>运行时覆盖、拖拽/动画临时值</td></tr>
          <tr><td>媒体查询 / 状态类里的同名变量</td><td>命中条件时覆盖</td><td>主题、响应式间距</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top: 8px">
        和普通属性一样遵循继承与级联：<b>后定义 + 更具体的选择器会赢</b>；
        不同的是<strong>变量没有「优先级更高的定义」这种说法 —— 它只是在该元素上被覆盖了，后代跟着用新值</strong>。
        另外自定义属性默认全部继承（除非用 <code>@property</code> 把 <code>inherits</code> 设成 <code>false</code>）。
      </p>
    </CssCard>

    <!-- ============ ⑤ 现代 CSS ============ -->
    <CssCard
      title="⑤ @property、CSS 嵌套、:is() / :where()、@supports"
      hint="左边是注册过的角度变量在过渡（梯度平滑），中间是未注册的（会跳变）；右边展示嵌套与 :is/:where。"
      :source="css.rules('.vt-mod-')"
      tone="warn"
    >
      <template #extra>
        <label class="kv"><input v-model="spinOn" type="checkbox" /> 运行角度过渡</label>
      </template>

      <div class="vt-mod-row">
        <div class="vt-mod-cell">
          <div
            class="vt-mod-ring vt-mod-registered"
            :style="{ '--vt-angle': spinOn ? '300deg' : '0deg' }"
          >
            <span class="vt-mod-ring-label">registered</span>
          </div>
          <p class="kv">注册过 <code>--vt-angle</code>：渐变角度可以做 transition，平滑转动。</p>
        </div>

        <div class="vt-mod-cell">
          <div class="vt-mod-ring vt-mod-plain" :style="{ '--vt-angle': spinOn ? '300deg' : '0deg' }">
            <span class="vt-mod-ring-label">unregistered</span>
          </div>
          <p class="kv">未注册：同样是渐变角度，过渡会被当成离散值，直接跳变。</p>
        </div>

        <div class="vt-mod-cell">
          <div class="vt-mod-nest">
            <p class="vt-mod-nest-item">嵌套里的直接子元素</p>
            <div>
              <p class="vt-mod-nest-item">嵌套里的后代元素</p>
            </div>
          </div>
          <p class="kv"><code>&amp;</code> 代表父选择器；后代直接写在后代选择器前即可。</p>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* ① @property：把一个自定义属性「注册」成有类型、有初始值、可插值的真属性
   标准写法如下（syntax 的值必须带尖括号，这里刻意不写出来以免和标签混淆）：

   @property --vt-angle &#123;
     syntax: '&lt;angle&gt;';    // 声明类型，浏览器才知道怎么插值
     inherits: false;        // 默认 true；设 false 可以避免污染后代
     initial-value: 0deg;    // 注册时通常要给初始值（syntax 为 '*' 时可省）
   &#125;

   本页的 scoped 样式里没有引入 at-rule 变量，改用等价的 JS 注册（效果一致）：
   CSS.registerProperty(&#123; name: '--vt-angle', syntax: '&lt;angle&gt;', inherits: false, initialValue: '0deg' &#125;)

   注册后的两个收益：
     ① 可以做 transition 插值 —— 左边的环就是靠它平滑转动的；
     ② 有初始值，不会因为「未定义」导致整条声明失效。 */
.vt-mod-registered &#123;
  background: conic-gradient(from var(--vt-angle, 0deg), #42b883, #3b82f6, #d29922, #42b883);
  transition: --vt-angle 600ms ease;   /* 未注册的属性通常无法这样过渡 */
&#125;

/* ② CSS 嵌套（现代浏览器已原生支持，无需预处理器） */
.vt-mod-nest &#123;
  padding: 12px;
  /* & 表示父选择器本身 */
  &amp;:hover &#123; border-color: var(--c-primary) &#125;
  /* 后代可以省略 &，直接写 */
  .vt-mod-nest-item &#123; color: var(--c-text) &#125;
  /* 媒体查询也可以嵌套 */
  @media (min-width: 720px) &#123; padding: 20px &#125;
&#125;
/* ⚠ 嵌套不会提升优先级：.vt-mod-nest .vt-mod-nest-item 依然是 (0,2,0) */

/* ③ :is() / :where()：打包一组选择器，权重由「括号里最具体的那个」决定；
   :where() 的权重永远是 0，非常适合做「低权重默认值 / 主题重置」 */
:is(h1, h2, h3).vt-title &#123; line-height: 1.25 &#125;      /* 权重 = (0,1,1) */
:where(.vt-theme) .vt-theme-text &#123; color: var(--vt-theme-text) &#125; /* 权重 = (0,1,0)，很容易被覆盖 */
/* :is() 的另一个用法：一行覆盖多种状态，避免重复写 */
/* .vt-theme-btn:is(:hover, :focus-visible) &#123; outline: 2px solid currentColor &#125; */

/* ④ @supports：特性检测，先写好降级 */
@supports (backdrop-filter: blur(4px)) &#123;
  .vt-glass &#123; backdrop-filter: blur(4px) &#125;
&#125;</pre>
    </CssCard>

    <!-- ============ ⑥ 设计令牌分层 + 速查 ============ -->
    <CssCard
      title="⑥ 设计令牌分层（原始色 → 语义色 → 组件色）与速查表"
      hint="点是/否切换「品牌色变更」：只改原始层的一个值，语义层与组件层自动跟着变 —— 这就是分层的意义。"
      :source="css.rules('.vt-token')"
    >
      <template #extra>
        <label class="kv"><input v-model="tokenShift" type="checkbox" /> 切换品牌原始色</label>
      </template>

      <div class="vt-token" :class="{ 'is-shifted': tokenShift }">
        <div class="vt-token-layer">
          <span class="vt-token-tag">① 原始色 raw</span>
          <span class="vt-token-chip vt-token-raw-green">--vt-green-500</span>
          <span class="vt-token-chip vt-token-raw-green-soft">--vt-green-100</span>
        </div>
        <div class="vt-token-layer">
          <span class="vt-token-tag">② 语义色 semantic</span>
          <span class="vt-token-chip vt-token-brand">--vt-color-brand</span>
          <span class="vt-token-chip vt-token-brand-soft">--vt-color-brand-soft</span>
        </div>
        <div class="vt-token-layer">
          <span class="vt-token-tag">③ 组件色 component</span>
          <span class="vt-token-chip vt-token-btn">--vt-btn-bg</span>
          <span class="vt-token-chip vt-token-card">--vt-card-border</span>
          <span class="vt-token-chip vt-token-focus">--vt-focus-ring</span>
        </div>
      </div>

      <pre class="code" style="margin-top: 10px">/* ① 原始色：只有色阶，没有含义 —— 换品牌时最先动的地方 */
.vt-token &#123;
  --vt-green-500: #42b883;
  --vt-green-100: #e6f6ef;
&#125;
.vt-token.is-shifted &#123;
  --vt-green-500: #7c5cff;      /* 只改这里 */
  --vt-green-100: #ece7ff;
&#125;

/* ② 语义色：说明「用在哪」，不关心具体色值 */
.vt-token &#123;
  --vt-color-brand: var(--vt-green-500);
  --vt-color-brand-soft: var(--vt-green-100);
&#125;

/* ③ 组件色：组件级的可配置开关，默认指向语义色 —— 组件内部只写这一层 */
.vt-token &#123;
  --vt-btn-bg: var(--vt-color-brand);
  --vt-card-border: var(--vt-color-brand-soft);
  --vt-focus-ring: var(--vt-color-brand);
&#125;

/* 好处：某个按钮要特殊配色时，只覆盖组件色，不动全局 */
.vt-token .special &#123; --vt-btn-bg: #e5534b &#125;</pre>

      <table style="margin-top: 10px">
        <thead>
          <tr><th>易踩的坑</th><th>现象</th><th>解法</th></tr>
        </thead>
        <tbody>
          <tr><td>变量未定义</td><td>整条声明无效（透明、无边框…），不像 Sass 那样报错</td><td>关键变量给回退值 <code>var(--x, 默认)</code>；或用 <code>@property</code> 给初始值</td></tr>
          <tr><td>变量值里带分号/引号</td><td>解析提前结束，后续声明全丢</td><td>值里不要写分号；字符串要配对引号</td></tr>
          <tr><td>拿变量当属性名/选择器</td><td>不生效</td><td>变量只能当「值」用</td></tr>
          <tr><td>在 <code>calc()</code> 外做运算</td><td><code>var(--x) * 2</code> 无效</td><td>用 <code>calc(var(--x) * 2)</code></td></tr>
          <tr><td>以为变量不继承</td><td>在子元素里读到父级的值，覆盖范围超出预期</td><td>记住默认继承；需要时不继承用 <code>@property &#123; inherits: false &#125;</code></td></tr>
          <tr><td>暗色主题只换背景</td><td>原生控件（滚动条、下拉、光标）还是亮的</td><td>同时切换 <code>color-scheme</code></td></tr>
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

/* ---------- ① 变量定义与回退 ---------- */
.vt-var-root {
  --vt-base: #42b883;
}
.vt-var-root-on {
  --vt-base: #42b883;
}
.vt-var-card {
  padding: 14px;
  border-radius: 10px;
  background: var(--c-surface-2);
}
.vt-var-card-on {
  --vt-base: #d29922;
}
.vt-var-box {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--vt-base, #6b7280);
  color: #fff;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.vt-var-box-on {
  --vt-base: #e5534b;
}
.vt-var-note {
  font-size: 11.5px;
  opacity: 0.85;
}
.vt-var-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.vt-swatch {
  flex: 1 1 190px;
  padding: 10px;
  border-radius: 8px;
  color: #fff;
  font-size: 11.5px;
  font-family: var(--mono);
  border: 1px solid var(--c-border);
}
.vt-swatch-fallback {
  background: var(--vt-missing, #e5534b);
}
.vt-swatch-bad {
  /* 故意不写回退值：变量不存在 → 这条声明无效 → 保持透明 */
  background: var(--vt-missing);
  color: var(--c-text);
}
.vt-swatch-good {
  background: var(--vt-base, #e5534b);
}

/* ---------- ② JS 动态改变量 ---------- */
.vt-js-host {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px;
  border-radius: 12px;
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border);
}
.vt-js-card {
  color: #fff;
  font-size: 12.5px;
}
/* 令牌 A：背景、圆角、内边距三个属性全部读变量 */
.vt-js-tone {
  background: var(--vt-js-color, #42b883);
  border-radius: var(--vt-js-radius, 12px);
  padding: var(--vt-js-pad, 16px);
}
.vt-js-badge {
  background: transparent;
  color: var(--vt-js-color, #42b883);
  border: 2px solid var(--vt-js-color, #42b883);
}
.vt-js-btn {
  font: inherit;
  cursor: pointer;
  color: #fff;
  border: none;
  background: var(--vt-js-color, #42b883);
  border-radius: var(--vt-js-radius, 12px);
  padding: 8px 16px;
}

/* ---------- ③ 主题切换（局部） ---------- */
.vt-theme {
  padding: 16px;
  border-radius: 14px;
  transition: background-color 250ms ease, color 250ms ease;
}
.vt-theme.is-light {
  --vt-theme-bg: #f6f7f9;
  --vt-theme-surface: #ffffff;
  --vt-theme-text: #1f2328;
  --vt-theme-text-dim: #656d76;
  --vt-theme-border: #e3e6ea;
  background: var(--vt-theme-bg);
}
.vt-theme.is-dark {
  --vt-theme-bg: #16181d;
  --vt-theme-surface: #1e2127;
  --vt-theme-text: #e6e8eb;
  --vt-theme-text-dim: #9aa3ad;
  --vt-theme-border: #343a44;
  background: var(--vt-theme-bg);
}
.vt-theme-panel {
  padding: 16px 18px;
  border-radius: var(--vt-theme-radius, 12px);
  background: var(--vt-theme-surface);
  color: var(--vt-theme-text);
  border: 1px solid var(--vt-theme-border);
}
.vt-theme-title {
  margin: 0 0 6px;
  font-size: 15px;
}
.vt-theme-text {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--vt-theme-text-dim);
}
.vt-theme-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.vt-theme-btn {
  font: inherit;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: var(--vt-theme-radius, 12px);
  border: 1px solid var(--vt-theme-border);
  background: transparent;
  color: var(--vt-theme-text);
}
.vt-theme-btn-primary {
  background: var(--vt-theme-accent, #3b82f6);
  border-color: var(--vt-theme-accent, #3b82f6);
  color: #fff;
}
.vt-theme-chip {
  font-size: 11.5px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid var(--vt-theme-accent, #3b82f6);
  color: var(--vt-theme-accent, #3b82f6);
}
.vt-theme-tokens {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.vt-theme-tokens code {
  font-size: 11px;
  background: var(--vt-theme-bg);
  color: var(--vt-theme-text-dim);
}

/* ---------- ④ 作用域与继承 ---------- */
.vt-scope {
  --vt-tint: #42b883;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vt-scope-a {
  padding: 10px 12px;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  background: var(--vt-tint, #6b7280);
}
.vt-scope-b {
  --vt-tint: #d29922;
  padding: 10px 12px;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  background: var(--vt-tint);
}
.vt-scope-c {
  --vt-tint: #e5534b;
  padding: 10px 12px;
  border-radius: 8px;
  border: 2px solid var(--vt-tint);
  color: var(--vt-tint);
  font-size: 13px;
  background: transparent;
}

/* ---------- ⑤ 现代 CSS ---------- */
.vt-mod-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.vt-mod-cell {
  padding: 12px;
  border-radius: 10px;
  background: var(--c-surface-2);
}
.vt-mod-cell p {
  margin: 8px 0 0;
}
.vt-mod-ring {
  width: 110px;
  height: 110px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
}
.vt-mod-registered {
  --vt-angle: 0deg;
  background: conic-gradient(from var(--vt-angle, 0deg), #42b883, #3b82f6, #d29922, #42b883);
  transition: --vt-angle 700ms ease;
}
.vt-mod-plain {
  --vt-angle: 0deg;
  background: conic-gradient(from var(--vt-angle, 0deg), #42b883, #3b82f6, #d29922, #42b883);
  transition: background 700ms ease;
}
.vt-mod-nest {
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-surface);
}
.vt-mod-nest .vt-mod-nest-item {
  margin: 0 0 8px;
  font-size: 13px;
}
.vt-mod-nest:hover {
  border-color: var(--c-primary);
}
.vt-mod-ring-label {
  font-family: var(--mono);
}

/* ---------- ⑥ 设计令牌分层 ---------- */
.vt-token {
  --vt-green-500: #42b883;
  --vt-green-100: #e6f6ef;
  --vt-color-brand: var(--vt-green-500);
  --vt-color-brand-soft: var(--vt-green-100);
  --vt-btn-bg: var(--vt-color-brand);
  --vt-card-border: var(--vt-color-brand-soft);
  --vt-focus-ring: var(--vt-color-brand);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: var(--c-surface-2);
}
.vt-token.is-shifted {
  --vt-green-500: #7c5cff;
  --vt-green-100: #ece7ff;
}
.vt-token-layer {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.vt-token-tag {
  flex: 0 0 170px;
  font-size: 12px;
  color: var(--c-text-dim);
  font-family: var(--mono);
}
.vt-token-chip {
  font-size: 11.5px;
  font-family: var(--mono);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
}
.vt-token-raw-green {
  background: var(--vt-green-500);
  color: #fff;
  border-color: transparent;
}
.vt-token-raw-green-soft {
  background: var(--vt-green-100);
  color: #1f2328;
  border-color: transparent;
}
.vt-token-brand {
  background: var(--vt-color-brand);
  color: #fff;
  border-color: transparent;
}
.vt-token-brand-soft {
  background: var(--vt-color-brand-soft);
  color: #1f2328;
  border-color: transparent;
}
.vt-token-btn {
  background: var(--vt-btn-bg);
  color: #fff;
  border-color: transparent;
}
.vt-token-card {
  border-color: var(--vt-card-border);
  color: var(--vt-color-brand);
}
.vt-token-focus {
  outline: 2px solid var(--vt-focus-ring);
  outline-offset: 2px;
}
</style>
