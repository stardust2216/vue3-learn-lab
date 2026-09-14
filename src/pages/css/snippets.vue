<script setup lang="ts">
import CssCard from '@/components/CssCard.vue'
import { useStyleSource } from '@/lib/cssSource'
/**
 * 可直接仿写的成稿样式库
 *
 * 这一页和前面 15 页的区别：前面讲「原理」，这一页给「成品」。
 * 每个组件都是一段完整、可直接粘贴使用的 HTML + CSS（自包含，不依赖本项目的变量），
 * 点「复制」即可整段拿走，粘到自己项目里就能跑。
 *
 * 展示的 CSS 源码同样是从本页真实 <style scoped> 里提取的（见 lib/cssSource.ts），
 * 所以：你在页面上看到的样式 = 你复制到的代码，永远一致。
 */
const css = useStyleSource()

/* ---------- ① 设计令牌（把这段放到 :root 就能全站换皮） ---------- */
const tokensCss = `:root {
  /* 色板：一个主色 + 一组中性灰 + 语义色，足够覆盖 95% 的界面 */
  --brand-500: #3b82f6;
  --brand-600: #2563eb;
  --brand-50:  #eff6ff;

  --gray-0:  #ffffff;
  --gray-50: #f8fafc;
  --gray-100:#f1f5f9;
  --gray-200:#e2e8f0;
  --gray-400:#94a3b8;
  --gray-600:#475569;
  --gray-900:#0f172a;

  --success: #16a34a;
  --warning: #d97706;
  --danger:  #dc2626;

  /* 语义别名：组件只引用语义层，换主题时只改这一层 */
  --bg: var(--gray-50);
  --surface: var(--gray-0);
  --border: var(--gray-200);
  --text: var(--gray-900);
  --text-muted: var(--gray-600);
  --primary: var(--brand-500);
  --primary-hover: var(--brand-600);

  /* 间距与尺寸阶梯：不要到处写魔法数字 */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;

  --radius-sm: 6px; --radius: 10px; --radius-lg: 16px; --radius-full: 999px;

  /* 阴影与层级 */
  --shadow-sm: 0 1px 2px rgb(15 23 42 / 6%);
  --shadow:    0 4px 12px rgb(15 23 42 / 8%);
  --shadow-lg: 0 12px 32px rgb(15 23 42 / 14%);
  --z-dropdown: 100; --z-sticky: 200; --z-modal: 1000; --z-toast: 2000;

  --font-sans: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

/* 暗色主题：只覆盖语义层，组件代码一行都不用改 */
html.dark {
  --bg: var(--gray-900);
  --surface: #1e293b;
  --border: #334155;
  --text: #f1f5f9;
  --text-muted: var(--gray-400);
}`

/* ---------- ② 布局原语 ---------- */
const stackHtml = `<div class="stack">
  <div class="row-between">
    <strong>标题</strong>
    <button class="btn btn-ghost btn-sm">操作</button>
  </div>
  <p class="text-muted">用 stack 控制纵向间距，用 cluster 控制横向换行。</p>
  <div class="cluster">
    <span class="badge">标签一</span>
    <span class="badge">标签二</span>
    <span class="badge">标签三</span>
  </div>
</div>`

/* ---------- ③ 文本样式 ---------- */
const textHtml = `<h1 class="t-title">页面标题 32/1.25</h1>
<h2 class="t-h2">区块标题 20/1.35</h2>
<p class="t-body">正文：16px / 行高 1.7 / 颜色 --text。</p>
<p class="t-muted">次要说明：14px，颜色 --text-muted。</p>
<p class="t-caption">辅助信息：12px，字距 0.02em。</p>
<p class="t-truncate">单行省略：这是一段很长的文字，用来演示单行截断效果……</p>
<p class="t-clamp">多行省略（2 行）：这是一段很长的文字，用来演示两行之后的省略号效果，超出部分会被裁掉并显示省略号。</p>`

/* ---------- ④ 按钮 ---------- */
const buttonHtml = `<button class="btn btn-primary">主要操作</button>
<button class="btn btn-secondary">次要操作</button>
<button class="btn btn-ghost">幽灵按钮</button>
<button class="btn btn-danger">危险操作</button>
<button class="btn btn-primary btn-sm">小号</button>
<button class="btn btn-primary btn-lg">大号</button>
<button class="btn btn-primary btn-block">块级按钮</button>
<button class="btn btn-primary" disabled>禁用</button>
<button class="btn btn-primary">
  <span class="spinner spinner-sm" aria-hidden="true"></span> 加载中
</button>`

/* ---------- ⑤ 表单 ---------- */
const fieldHtml = `<div class="field">
  <label class="field-label" for="snippet-email">
    邮箱 <span class="field-required">*</span>
  </label>
  <input id="snippet-email" class="input" type="email" placeholder="you@example.com" />
  <p class="field-hint">我们只会在登录时使用它。</p>
</div>

<div class="field">
  <label class="field-label" for="snippet-pwd">密码</label>
  <input id="snippet-pwd" class="input is-error" type="password" value="123" />
  <p class="field-error">密码至少 8 位</p>
</div>

<label class="checkbox"><input type="checkbox" checked /> 记住我</label>
<label class="switch"><input type="checkbox" checked /><span></span> 开启通知</label>`

/* ---------- ⑥ 表格 ---------- */
const tableHtml = `<div class="table-wrap">
  <table class="table">
    <thead>
      <tr><th>项目</th><th>负责人</th><th class="num">进度</th><th>状态</th></tr>
    </thead>
    <tbody>
      <tr><td>首页改版</td><td>张三</td><td class="num">80%</td><td><span class="badge badge-success">进行中</span></td></tr>
      <tr><td>组件库</td><td>李四</td><td class="num">45%</td><td><span class="badge badge-warning">待评审</span></td></tr>
      <tr><td>性能优化</td><td>王五</td><td class="num">100%</td><td><span class="badge">已完成</span></td></tr>
    </tbody>
  </table>
</div>`

/* ---------- ⑦ 卡片 ---------- */
const cardHtml = `<article class="ui-card ui-card-hover">
  <img class="ui-card-cover" src="https://picsum.photos/seed/csslab/640/360" alt="封面" />
  <div class="ui-card-body">
    <div class="row-between">
      <h3>卡片标题</h3>
      <span class="badge badge-brand">NEW</span>
    </div>
    <p class="t-muted">用 padding + radius + shadow 就能做出层次，注意悬停时只改 transform 与阴影，不要改尺寸。</p>
    <div class="row-between">
      <span class="badge">标签</span>
      <button class="btn btn-primary btn-sm">查看</button>
    </div>
  </div>
</article>`

/* ---------- ⑧ 弹窗 ---------- */
const modalHtml = `<div class="modal-mask">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header class="modal-head">
      <h3 id="modal-title">确认删除？</h3>
      <button class="modal-close" aria-label="关闭">×</button>
    </header>
    <div class="modal-body">删除后不可恢复，确定要继续吗？</div>
    <footer class="modal-foot">
      <button class="btn btn-secondary">取消</button>
      <button class="btn btn-danger">删除</button>
    </footer>
  </div>
</div>`

/* ---------- ⑨ 反馈 ---------- */
const feedbackHtml = `<div class="alert alert-success"><strong>保存成功</strong> 数据已同步。</div>
<div class="alert alert-warning"><strong>注意</strong> 该操作会影响所有用户。</div>
<div class="alert alert-danger"><strong>失败</strong> 网络异常，请重试。</div>

<span class="badge">默认</span>
<span class="badge badge-brand">品牌</span>
<span class="badge badge-success">成功</span>
<span class="badge badge-warning">警告</span>
<span class="badge badge-danger">错误</span>

<div class="progress"><span style="width: 62%"></span></div>`

/* ---------- ⑩ 空态与骨架屏 ---------- */
const skeletonHtml = `<div class="skeleton-card">
  <div class="skeleton skeleton-avatar"></div>
  <div class="skeleton-lines">
    <div class="skeleton skeleton-line" style="width: 60%"></div>
    <div class="skeleton skeleton-line" style="width: 90%"></div>
    <div class="skeleton skeleton-line" style="width: 40%"></div>
  </div>
</div>

<div class="empty">
  <div class="empty-icon">📭</div>
  <p class="empty-title">还没有数据</p>
  <p class="t-muted">点击右上角「新建」开始你的第一条记录。</p>
  <button class="btn btn-primary">新建记录</button>
</div>`

/* ---------- ⑪ 提示气泡 ---------- */
const tooltipHtml = `<span class="tooltip-host">
  悬停查看提示
  <span class="tooltip" role="tooltip">我出现在上方，用伪元素画的小三角</span>
</span>`

/* ---------- ⑫ 折叠面板 ---------- */
const accordionHtml = `<div class="accordion">
  <details open>
    <summary>怎么改主题色？</summary>
    <p class="t-muted">只改 :root 里的 --brand-500 / --primary 两个变量，其他组件不用动。</p>
  </details>
  <details>
    <summary>为什么用 CSS 变量而不是预处理器变量？</summary>
    <p class="t-muted">CSS 变量在运行时可变，能做主题切换；预处理器变量在编译期就被替换掉了。</p>
  </details>
</div>`

/* ---------- ⑬ 导航 ---------- */
const navHtml = `<nav class="ui-nav">
  <a class="ui-nav-brand" href="#">Acme</a>
  <a class="ui-nav-link is-active" href="#">工作台</a>
  <a class="ui-nav-link" href="#">项目</a>
  <a class="ui-nav-link" href="#">成员</a>
  <span class="ui-nav-spacer"></span>
  <button class="btn btn-primary btn-sm">新建</button>
</nav>

<div class="tabs">
  <button class="tab is-active">概览</button>
  <button class="tab">活动</button>
  <button class="tab">设置</button>
</div>`

/* ---------- ⑭ 骨架式页面布局 ---------- */
const layoutHtml = `<div class="shell">
  <aside class="shell-side">侧边栏</aside>
  <div class="shell-main">
    <header class="shell-head">顶栏（sticky）</header>
    <main class="shell-body">
      <div class="grid-auto">
        <div class="ui-card" style="padding:16px">卡片 1</div>
        <div class="ui-card" style="padding:16px">卡片 2</div>
        <div class="ui-card" style="padding:16px">卡片 3</div>
      </div>
    </main>
  </div>
</div>`

/* ---------- ⑮ 微交互 ---------- */
const microHtml = `<button class="btn btn-primary micro-lift">悬停浮起</button>
<button class="btn btn-secondary micro-press">按下回弹</button>
<span class="spinner"></span>
<div class="skeleton skeleton-line" style="width: 160px"></div>`
</script>

<template>
  <div>
    <h1>成稿样式库 · 可直接仿写</h1>
    <p class="lead">
      这一页不讲原理，只给<strong>成品</strong>：每个组件都是一段完整、自包含的 HTML + CSS，
      点每张卡片的「复制」就能整段拿走，粘到自己项目里直接能用。
      代码里的注释写清了「哪个值可以调、调了会怎样」，照着改就是最好的练习。
    </p>

    <CssCard
      title="① 设计令牌（先抄这段，全站换皮只改这里）"
      hint="做法：把色板（gray/brand）→ 语义别名（--text/--primary）→ 组件三层分开，组件只引用语义层。"
      :source="tokensCss"
      tone="ok"
      open
    >
      <div class="sn-tokens">
        <div v-for="name in ['--brand-500', '--gray-100', '--success', '--warning', '--danger']" :key="name" class="sn-token">
          <span class="sn-chip" :style="{ background: `var(${name})` }" />
          <code>{{ name }}</code>
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        本项目的页面就是这套结构：<code>styles/main.css</code> 里是 <code>--c-*</code> 变量，组件只写
        <code>var(--c-primary)</code> 之类的语义引用，所以顶栏一个按钮就能切换亮/暗主题。
      </p>
    </CssCard>

    <CssCard
      title="② 布局原语：stack / cluster / row-between"
      hint="把「间距」和「排列」抽成 3 个类，能省掉大量重复的 flex 声明。"
      :source="css.rules('.stack', '.cluster', '.row-between')"
      :html="stackHtml"
      copyable
    >
      <div class="stack">
        <div class="row-between">
          <strong>标题</strong>
          <button class="btn btn-ghost btn-sm">操作</button>
        </div>
        <p class="t-muted">用 stack 控制纵向间距，用 cluster 控制横向换行。</p>
        <div class="cluster">
          <span class="badge">标签一</span>
          <span class="badge">标签二</span>
          <span class="badge">标签三</span>
        </div>
      </div>
    </CssCard>

    <CssCard
      title="③ 文本样式表（字号 / 行高 / 颜色 / 截断）"
      hint="字号与行高成对定义，避免「同一层级两种字号」。截断用 text-overflow 或 -webkit-line-clamp。"
      :source="css.rules('.t-title', '.t-h2', '.t-body', '.t-muted', '.t-caption', '.t-truncate', '.t-clamp')"
      :html="textHtml"
      copyable
    >
      <div class="stack">
        <h1 class="t-title">页面标题 32/1.25</h1>
        <h2 class="t-h2">区块标题 20/1.35</h2>
        <p class="t-body">正文：16px / 行高 1.7 / 颜色 --text。</p>
        <p class="t-muted">次要说明：14px，颜色 --text-muted。</p>
        <p class="t-caption">辅助信息：12px，字距 0.02em。</p>
        <p class="t-truncate">单行省略：这是一段很长的文字，用来演示单行截断效果，超出容器宽度就会被裁掉。</p>
        <p class="t-clamp">
          多行省略（2 行）：这是一段很长的文字，用来演示两行之后的省略号效果，超出部分会被裁掉并显示省略号。
        </p>
      </div>
    </CssCard>

    <CssCard
      title="④ 按钮体系（5 种变体 × 3 种尺寸）"
      hint="一个 .btn 基类 + 变体类 + 尺寸类；用 :focus-visible 做键盘可访问的焦点环。"
      :source="css.rules('.btn', '.btn-primary', '.btn-secondary', '.btn-ghost', '.btn-danger')"
      :html="buttonHtml"
      copyable
      tone="ok"
    >
      <div class="cluster">
        <button class="btn btn-primary">主要操作</button>
        <button class="btn btn-secondary">次要操作</button>
        <button class="btn btn-ghost">幽灵按钮</button>
        <button class="btn btn-danger">危险操作</button>
        <button class="btn btn-primary btn-sm">小号</button>
        <button class="btn btn-primary btn-lg">大号</button>
        <button class="btn btn-primary" disabled>禁用</button>
        <button class="btn btn-primary"><span class="spinner spinner-sm" aria-hidden="true"></span> 加载中</button>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top: 10px">块级按钮（width: 100%）</button>
    </CssCard>

    <CssCard
      title="⑤ 表单：输入框 / 标签 / 提示 / 错误 / 开关"
      hint="错误态用 .is-error 而不是内联改色；提示文字与错误文字用同一套排版。开关和复选框用 accent-color 一行搞定。"
      :source="css.rules('.field', '.input', '.checkbox', '.switch', '.field-')"
      :html="fieldHtml"
      copyable
    >
      <div class="sn-form">
        <div class="field">
          <label class="field-label" for="snip-email">邮箱 <span class="field-required">*</span></label>
          <input id="snip-email" class="input" type="email" placeholder="you@example.com" />
          <p class="field-hint">我们只会在登录时使用它。</p>
        </div>
        <div class="field">
          <label class="field-label" for="snip-pwd">密码</label>
          <input id="snip-pwd" class="input is-error" type="password" value="123" />
          <p class="field-error">密码至少 8 位</p>
        </div>
        <div class="cluster">
          <label class="checkbox"><input type="checkbox" checked /> 记住我</label>
          <label class="switch"><input type="checkbox" checked /><span></span> 开启通知</label>
        </div>
      </div>
    </CssCard>

    <CssCard
      title="⑥ 表格：斑马纹 / 悬停高亮 / 数字右对齐"
      hint="外层 .table-wrap 负责横向滚动，表格本身只负责排版；数字列统一右对齐并等宽，方便对比。"
      :source="css.rules('.table')"
      :html="tableHtml"
      copyable
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>项目</th><th>负责人</th><th class="num">进度</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr><td>首页改版</td><td>张三</td><td class="num">80%</td><td><span class="badge badge-success">进行中</span></td></tr>
            <tr><td>组件库</td><td>李四</td><td class="num">45%</td><td><span class="badge badge-warning">待评审</span></td></tr>
            <tr><td>性能优化</td><td>王五</td><td class="num">100%</td><td><span class="badge">已完成</span></td></tr>
          </tbody>
        </table>
      </div>
    </CssCard>

    <CssCard
      title="⑦ 卡片：封面 + 内容 + 悬停浮起"
      hint="卡片的三件套是 radius + border + shadow；悬停只改 transform 与阴影，不要改宽高（会触发重排、布局抖动）。"
      :source="css.rules('.ui-card')"
      :html="cardHtml"
      copyable
      tone="ok"
    >
      <div class="sn-grid">
        <article class="ui-card ui-card-hover">
          <img class="ui-card-cover" src="https://picsum.photos/seed/csslab/640/360" alt="封面" />
          <div class="ui-card-body">
            <div class="row-between"><h3>卡片标题</h3><span class="badge badge-brand">NEW</span></div>
            <p class="t-muted">
              用 padding + radius + shadow 就能做出层次，注意悬停时只改 transform 与阴影，不要改尺寸。
            </p>
            <div class="row-between">
              <span class="badge">标签</span>
              <button class="btn btn-primary btn-sm">查看</button>
            </div>
          </div>
        </article>
      </div>
    </CssCard>

    <CssCard
      title="⑧ 弹窗：遮罩 + 居中 + 结构分区"
      hint="遮罩用 position: fixed + inset: 0；居中用 grid + place-items；弹窗本体用 flex 列布局，头尾固定、中间滚动。"
      :source="css.rules('.modal')"
      :html="modalHtml"
      copyable
    >
      <!-- 这里做成静态展示，避免在文档里真的弹出遮罩挡住别的卡片 -->
      <div class="sn-modal-stage">
        <div class="modal" role="dialog" aria-modal="true">
          <header class="modal-head">
            <h3>确认删除？</h3>
            <button class="modal-close" aria-label="关闭">×</button>
          </header>
          <div class="modal-body">删除后不可恢复，确定要继续吗？</div>
          <footer class="modal-foot">
            <button class="btn btn-secondary">取消</button>
            <button class="btn btn-danger">删除</button>
          </footer>
        </div>
      </div>
    </CssCard>

    <CssCard
      title="⑨ 反馈：提示条 / 徽标 / 进度条"
      hint="语义色（成功/警告/危险）只用于传达状态，不要拿来做装饰；徽标用 color-mix() 从语义色派生浅底，省一组变量。"
      :source="css.rules('.alert', '.badge', '.progress')"
      :html="feedbackHtml"
      copyable
    >
      <div class="stack">
        <div class="alert alert-success"><strong>保存成功</strong> 数据已同步。</div>
        <div class="alert alert-warning"><strong>注意</strong> 该操作会影响所有用户。</div>
        <div class="alert alert-danger"><strong>失败</strong> 网络异常，请重试。</div>
        <div class="cluster">
          <span class="badge">默认</span>
          <span class="badge badge-brand">品牌</span>
          <span class="badge badge-success">成功</span>
          <span class="badge badge-warning">警告</span>
          <span class="badge badge-danger">错误</span>
        </div>
        <div class="progress"><span style="width: 62%"></span></div>
      </div>
    </CssCard>

    <CssCard
      title="⑩ 空态与骨架屏"
      hint="加载中用骨架屏（shimmer 动画）比转圈更不容易让人焦虑；空态要给「下一步动作」，不只是说「没有数据」。"
      :source="css.rules('.skeleton', '.empty')"
      :html="skeletonHtml"
      copyable
    >
      <div class="sn-two">
        <div class="skeleton-card">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton skeleton-line" style="width: 60%"></div>
            <div class="skeleton skeleton-line" style="width: 90%"></div>
            <div class="skeleton skeleton-line" style="width: 40%"></div>
          </div>
        </div>
        <div class="empty">
          <div class="empty-icon">📭</div>
          <p class="empty-title">还没有数据</p>
          <p class="t-muted">点击右上角「新建」开始你的第一条记录。</p>
          <button class="btn btn-primary btn-sm">新建记录</button>
        </div>
      </div>
    </CssCard>

    <CssCard
      title="⑪ 提示气泡 tooltip（纯 CSS）"
      hint="用 opacity + visibility 做显隐就能带过渡；三角形用 border 技巧或 clip-path。"
      :source="css.rules('.tooltip')"
      :html="tooltipHtml"
      copyable
    >
      <span class="tooltip-host">
        把鼠标放上来
        <span class="tooltip" role="tooltip">我出现在上方，带一个小三角</span>
      </span>
    </CssCard>

    <CssCard
      title="⑫ 折叠面板（details/summary，零 JS）"
      hint="原生 details 自带展开收起与无障碍语义；把默认的三角换成自定义图标即可。"
      :source="css.rules('.accordion')"
      :html="accordionHtml"
      copyable
    >
      <div class="accordion">
        <details open>
          <summary>怎么改主题色？</summary>
          <p class="t-muted">只改 :root 里的 --brand-500 / --primary 两个变量，其他组件不用动。</p>
        </details>
        <details>
          <summary>为什么用 CSS 变量而不是预处理器变量？</summary>
          <p class="t-muted">CSS 变量在运行时可变，能做主题切换；预处理器变量在编译期就被替换掉了。</p>
        </details>
      </div>
    </CssCard>

    <CssCard
      title="⑬ 导航栏与选项卡"
      hint="导航用 flex + gap + margin-left:auto 把右侧推到末尾；当前项用底部 2px 高亮条而不是下划线 border。"
      :source="css.rules('.ui-nav', '.tabs', '.tab')"
      :html="navHtml"
      copyable
    >
      <nav class="ui-nav">
        <a class="ui-nav-brand" href="#">Acme</a>
        <a class="ui-nav-link is-active" href="#">工作台</a>
        <a class="ui-nav-link" href="#">项目</a>
        <a class="ui-nav-link" href="#">成员</a>
        <span class="ui-nav-spacer" />
        <button class="btn btn-primary btn-sm">新建</button>
      </nav>
      <div class="tabs" style="margin-top: 14px">
        <button class="tab is-active">概览</button>
        <button class="tab">活动</button>
        <button class="tab">设置</button>
      </div>
    </CssCard>

    <CssCard
      title="⑭ 后台页面骨架（侧栏 + 粘性顶栏 + 卡片网格）"
      hint="最常用的后台布局：shell 用 flex 撑满视口高度，主体区独立滚动，卡片区用 auto-fit 网格自适应列数。"
      :source="css.rules('.shell', '.grid-auto')"
      :html="layoutHtml"
      copyable
      tone="ok"
    >
      <div class="shell">
        <aside class="shell-side">侧边栏</aside>
        <div class="shell-main">
          <header class="shell-head">顶栏（sticky）</header>
          <main class="shell-body">
            <div class="grid-auto">
              <div class="ui-card sn-pad">卡片 1</div>
              <div class="ui-card sn-pad">卡片 2</div>
              <div class="ui-card sn-pad">卡片 3</div>
            </div>
          </main>
        </div>
      </div>
    </CssCard>

    <CssCard
      title="⑮ 微交互：浮起 / 回弹 / 加载 / 流光"
      hint="统一用 transform + opacity 做动效（只触发合成，不重排）；过渡时长 150~250ms、缓动用 ease-out 最自然。"
      :source="css.rules('.micro', '.spinner')"
      :html="microHtml"
      copyable
    >
      <div class="cluster">
        <button class="btn btn-primary micro-lift">悬停浮起</button>
        <button class="btn btn-secondary micro-press">按下回弹</button>
        <span class="spinner" />
        <div class="skeleton skeleton-line" style="width: 160px; margin: 0" />
      </div>
    </CssCard>

    <CssCard title="⑯ 仿写练习建议（照着抄 → 改 → 造）" tone="warn">
      <ol class="sn-steps">
        <li><b>抄一遍</b>：把 ① 设计令牌 + ② 布局原语粘进一个新项目，先把地基打好。</li>
        <li><b>改一遍</b>：只改令牌里的色板与圆角，看看整站气质变了多少 —— 体会「变量的威力」。</li>
        <li><b>补全状态</b>：给按钮补上 <code>:hover</code> / <code>:active</code> / <code>:focus-visible</code> /
          <code>:disabled</code> 四态；给输入框补上 <code>:focus</code> 与 <code>:invalid</code>。</li>
        <li><b>加响应式</b>：把 ⑭ 的侧栏在 <code>max-width: 900px</code> 时改成抽屉或隐藏。</li>
        <li><b>自己造一个</b>：用同样的三层结构（令牌 → 语义 → 组件）写一个「标签输入框」或「分页器」，
          写完回来对照本页的写法检查：有没有魔法数字？颜色是不是都走变量？间距有没有用阶梯值？</li>
      </ol>
    </CssCard>
  </div>
</template>

<style scoped>
h1 {
  font-size: 24px;
  margin-bottom: 6px;
}
.lead {
  color: var(--c-text-dim);
  margin-top: 0;
  max-width: 78ch;
}
code {
  background: var(--c-surface-2);
  padding: 1px 5px;
  border-radius: 5px;
}

/* ============================================================
   以下都是「成稿样式」：自包含、不依赖本项目变量，可直接复制
   ============================================================ */

/* ① 设计令牌演示 */
.sn-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.sn-token {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.sn-chip {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
}

/* ② 布局原语 */
.stack > * + * {
  margin-top: 12px;
}
.cluster {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* ③ 文本样式 */
.t-title {
  font-size: 32px;
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}
.t-h2 {
  font-size: 20px;
  line-height: 1.35;
  font-weight: 600;
  margin: 0;
}
.t-body {
  font-size: 16px;
  line-height: 1.7;
  margin: 0;
}
.t-muted {
  font-size: 14px;
  line-height: 1.6;
  color: var(--c-text-dim);
  margin: 0;
}
.t-caption {
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.02em;
  color: var(--c-text-dim);
  margin: 0;
}
.t-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}
.t-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

/* ④ 按钮体系 */
.btn {
  --btn-py: 8px;
  --btn-px: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: var(--btn-py) var(--btn-px);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease,
    transform 0.12s ease, box-shadow 0.18s ease;
}
.btn:focus-visible {
  outline: 2px solid var(--c-info);
  outline-offset: 2px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
.btn-primary {
  background: var(--c-primary);
  color: #fff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 10%);
}
.btn-primary:hover {
  background: var(--c-primary-dark);
  box-shadow: 0 4px 12px rgb(15 23 42 / 14%);
}
.btn-secondary {
  background: var(--c-surface);
  border-color: var(--c-border);
  color: var(--c-text);
}
.btn-secondary:hover {
  border-color: var(--c-primary);
  color: var(--c-primary-dark);
}
.btn-ghost {
  background: transparent;
  color: var(--c-text-dim);
}
.btn-ghost:hover {
  background: var(--c-surface-2);
  color: var(--c-text);
}
.btn-danger {
  background: var(--c-danger);
  color: #fff;
}
.btn-danger:hover {
  filter: brightness(0.92);
}
.btn-sm {
  --btn-py: 5px;
  --btn-px: 11px;
  font-size: 13px;
}
.btn-lg {
  --btn-py: 12px;
  --btn-px: 22px;
  font-size: 16px;
}
.btn-block {
  width: 100%;
}

/* ⑤ 表单 */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
}
.field-required {
  color: var(--c-danger);
}
.field-hint {
  font-size: 12px;
  color: var(--c-text-dim);
  margin: 0;
}
.field-error {
  font-size: 12px;
  color: var(--c-danger);
  margin: 0;
}
.input {
  width: 100%;
  padding: 9px 12px;
  font: inherit;
  font-size: 14px;
  color: var(--c-text);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.input::placeholder {
  color: var(--c-text-dim);
}
.input:hover {
  border-color: var(--c-text-dim);
}
.input:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px rgb(66 184 131 / 22%);
}
.input.is-error {
  border-color: var(--c-danger);
}
.input.is-error:focus {
  box-shadow: 0 0 0 3px rgb(229 83 75 / 22%);
}
.input:disabled {
  background: var(--c-surface-2);
  cursor: not-allowed;
}
.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}
.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}
.switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.switch span {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: var(--c-border);
  transition: background-color 0.2s ease;
}
.switch span::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 25%);
  transition: transform 0.2s ease;
}
.switch input:checked + span {
  background: var(--c-primary);
}
.switch input:checked + span::after {
  transform: translateX(16px);
}
.switch input:focus-visible + span {
  outline: 2px solid var(--c-info);
  outline-offset: 2px;
}
.sn-form {
  display: grid;
  gap: 14px;
  max-width: 420px;
}

/* ⑥ 表格 */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--c-border);
  border-radius: 10px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.table th,
.table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--c-border);
  white-space: nowrap;
}
.table thead th {
  background: var(--c-surface-2);
  font-weight: 600;
  font-size: 13px;
  color: var(--c-text-dim);
  position: sticky;
  top: 0;
}
.table tbody tr:nth-child(even) {
  background: color-mix(in srgb, var(--c-surface-2) 55%, transparent);
}
.table tbody tr:hover {
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
}
.table tbody tr:last-child td {
  border-bottom: none;
}
.table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: var(--mono);
}

/* ⑦ 卡片 */
.ui-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.ui-card-hover:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgb(15 23 42 / 14%);
  border-color: color-mix(in srgb, var(--c-primary) 45%, var(--c-border));
}
.ui-card-cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--c-surface-2);
}
.ui-card-body {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
}
.ui-card-body h3 {
  margin: 0;
  font-size: 16px;
}
.sn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 14px;
}

/* ⑧ 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(15 23 42 / 45%);
  backdrop-filter: blur(2px);
  z-index: 1000;
  animation: modal-in 0.18s ease-out;
}
.modal {
  width: min(440px, 100%);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--c-surface);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgb(15 23 42 / 28%);
  overflow: hidden;
  animation: modal-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-head,
.modal-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
}
.modal-head {
  border-bottom: 1px solid var(--c-border);
}
.modal-head h3 {
  flex: 1;
  margin: 0;
  font-size: 16px;
}
.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  color: var(--c-text-dim);
  cursor: pointer;
}
.modal-close:hover {
  background: var(--c-surface-2);
  color: var(--c-text);
}
.modal-body {
  padding: 18px;
  overflow: auto;
  font-size: 14px;
  line-height: 1.7;
}
.modal-foot {
  justify-content: flex-end;
  border-top: 1px solid var(--c-border);
  background: var(--c-surface-2);
}
.sn-modal-stage {
  position: relative;
  display: grid;
  place-items: center;
  padding: 20px;
  border-radius: 10px;
  background: repeating-conic-gradient(var(--c-surface-2) 0% 25%, transparent 0% 50%) 50% / 18px 18px;
}
@keyframes modal-in {
  from {
    opacity: 0;
  }
}
@keyframes modal-pop {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(8px);
  }
}

/* ⑨ 反馈 */
.alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border-left: 3px solid;
  font-size: 14px;
}
.alert-success {
  border-color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
}
.alert-warning {
  border-color: var(--c-warn);
  background: color-mix(in srgb, var(--c-warn) 14%, transparent);
}
.alert-danger {
  border-color: var(--c-danger);
  background: color-mix(in srgb, var(--c-danger) 12%, transparent);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.7;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  color: var(--c-text-dim);
}
.badge-brand {
  background: color-mix(in srgb, var(--c-info) 14%, transparent);
  border-color: color-mix(in srgb, var(--c-info) 40%, transparent);
  color: var(--c-info);
}
.badge-success {
  background: color-mix(in srgb, var(--c-primary) 16%, transparent);
  border-color: color-mix(in srgb, var(--c-primary) 42%, transparent);
  color: var(--c-primary-dark);
}
.badge-warning {
  background: color-mix(in srgb, var(--c-warn) 16%, transparent);
  border-color: color-mix(in srgb, var(--c-warn) 42%, transparent);
  color: var(--c-warn);
}
.badge-danger {
  background: color-mix(in srgb, var(--c-danger) 14%, transparent);
  border-color: color-mix(in srgb, var(--c-danger) 42%, transparent);
  color: var(--c-danger);
}
.progress {
  height: 8px;
  border-radius: 999px;
  background: var(--c-surface-2);
  overflow: hidden;
}
.progress > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--c-primary), var(--c-info));
  transition: width 0.3s ease;
}

/* ⑩ 骨架屏与空态 */
.skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  background: var(--c-surface-2);
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--c-surface) 70%, transparent),
    transparent
  );
  animation: shimmer 1.4s infinite;
}
.skeleton-line {
  height: 12px;
}
.skeleton-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex: none;
}
.skeleton-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
}
.skeleton-lines {
  flex: 1;
  display: grid;
  gap: 8px;
}
@keyframes shimmer {
  to {
    transform: translateX(100%);
  }
}
.empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 24px 16px;
  text-align: center;
  border: 1px dashed var(--c-border);
  border-radius: 12px;
}
.empty-icon {
  font-size: 30px;
}
.empty-title {
  margin: 0;
  font-weight: 600;
}
.sn-two {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 14px;
}

/* ⑪ tooltip */
.tooltip-host {
  position: relative;
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px dashed var(--c-info);
  font-size: 14px;
  cursor: help;
}
.tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translate(-50%, 4px);
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--c-accent);
  color: #fff;
  font-size: 12.5px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
  pointer-events: none;
}
.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  translate: -50% 0;
  border: 6px solid transparent;
  border-top-color: var(--c-accent);
}
.tooltip-host:hover .tooltip,
.tooltip-host:focus-within .tooltip {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}

/* ⑫ 折叠面板 */
.accordion {
  display: grid;
  gap: 8px;
}
.accordion details {
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-surface);
  overflow: hidden;
}
.accordion summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  list-style: none;
}
.accordion summary::-webkit-details-marker {
  display: none;
}
.accordion summary::before {
  content: '▸';
  transition: transform 0.18s ease;
  color: var(--c-text-dim);
}
.accordion details[open] summary::before {
  transform: rotate(90deg);
}
.accordion details[open] summary {
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface-2);
}
.accordion p {
  padding: 12px 14px;
  margin: 0;
}

/* ⑬ 导航与选项卡 */
.ui-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
}
.ui-nav-brand {
  font-weight: 700;
  color: var(--c-text);
  text-decoration: none;
  padding-right: 8px;
}
.ui-nav-link {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--c-text-dim);
  text-decoration: none;
}
.ui-nav-link:hover {
  background: var(--c-surface-2);
  color: var(--c-text);
}
.ui-nav-link.is-active {
  color: var(--c-primary-dark);
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
  font-weight: 500;
}
.ui-nav-spacer {
  flex: 1;
}
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--c-border);
}
.tab {
  position: relative;
  padding: 8px 14px;
  border: none;
  background: none;
  font: inherit;
  font-size: 14px;
  color: var(--c-text-dim);
  cursor: pointer;
}
.tab:hover {
  color: var(--c-text);
}
.tab.is-active {
  color: var(--c-text);
  font-weight: 600;
}
.tab.is-active::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--c-primary);
}

/* ⑭ 后台页面骨架 */
.shell {
  display: flex;
  height: 320px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  overflow: hidden;
  font-size: 13px;
}
.shell-side {
  flex: 0 0 130px;
  padding: 12px;
  background: var(--c-surface-2);
  border-right: 1px solid var(--c-border);
  color: var(--c-text-dim);
}
.shell-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.shell-head {
  position: sticky;
  top: 0;
  padding: 10px 14px;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  font-weight: 500;
}
.shell-body {
  flex: 1;
  overflow: auto;
  padding: 14px;
  background: var(--c-bg);
}
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
  gap: 12px;
}
.sn-pad {
  padding: 16px;
  font-size: 13px;
  color: var(--c-text-dim);
}

/* ⑮ 微交互 */
.micro-lift {
  transition: transform 0.16s ease, box-shadow 0.2s ease;
}
.micro-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgb(15 23 42 / 18%);
}
.micro-press:active {
  transform: scale(0.96);
}
.spinner {
  width: 18px;
  height: 18px;
  display: inline-block;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--c-primary) 30%, transparent);
  border-top-color: var(--c-primary);
  animation: spin 0.7s linear infinite;
}
.spinner-sm {
  width: 13px;
  height: 13px;
  border-width: 2px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.sn-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 13.5px;
  line-height: 1.9;
}
</style>
