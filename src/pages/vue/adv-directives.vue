<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import { useCounterStore } from '@/stores/counter'
import { setPermissionRoleGetter } from '@/directives'

/* ============================================================================
 * 13. 自定义指令
 *
 * 钩子（都收到 (el, binding, vnode, prevVnode)）：
 *   created        元素属性/事件绑定前（少用，拿不到父节点）
 *   beforeMount    挂载前
 *   mounted        挂载后 → 最常用（能操作 DOM、能拿 offsetHeight、能 focus）
 *   beforeUpdate   所在组件更新前
 *   updated        所在组件更新后（注意：不是「指令值变了」才调用！）
 *   beforeUnmount  卸载前
 *   unmounted      卸载后 → 清理事件监听/定时器
 *
 * binding 对象：{ value, oldValue, arg, modifiers, instance, dir }
 *   v-demo:arg.mod1.mod2="expr"
 *   → arg='arg'，modifiers={mod1:true,mod2:true}，value=expr 的值，oldValue=上一次的值
 * ========================================================================== */

const counter = useCounterStore()

// ---------- 把「当前角色」注册给全局 v-permission 指令 ----------
onMounted(() => setPermissionRoleGetter(() => counter.role))

// ---------- 局部指令：只在当前组件可用，用 vName 命名后在模板里写 v-name ----------
const upperLog = ref('')
const vUppercase = {
  mounted(el: HTMLElement, binding: { value?: string; modifiers: Record<string, boolean> }) {
    // 演示：指令直接改写元素内容（真实场景：格式化、脱敏、加水印）
    const prefix = binding.modifiers.prefix ? '【指令加的】' : ''
    el.textContent = prefix + (el.textContent ?? '').toUpperCase()
    upperLog.value = `mounted 钩子执行，modifiers.prefix=${!!binding.modifiers.prefix}`
  },
  updated(el: HTMLElement) {
    el.textContent = (el.textContent ?? '').toUpperCase()
  },
}

// ---------- 局部指令：对象语法 vs 函数简写 ----------
// vShorten 用「函数简写」写法：等价于 { mounted, updated }，适合不需要清理逻辑的简单指令。
// 局部指令变量必须以 v 开头（后面接大写字母），模板里写 v-shorten。
const vShorten = (el: HTMLElement) => {
  el.textContent = (el.textContent ?? '').slice(0, 8) + '…'
}

// ---------- 演示 v-clickOutside ----------
const dropdownOpen = ref(false)
const outsideCount = ref(0)
function closeDropdown() {
  if (dropdownOpen.value) outsideCount.value++
  dropdownOpen.value = false
}

// ---------- 演示 v-highlight 的 updated ----------
const highlightColor = ref('#fff3bf')
const highlightTick = ref(0)

// ---------- 演示 v-focus-delayed 的参数 ----------
const delayedKey = ref(0)
</script>

<template>
  <div>
    <h1>13. 自定义指令</h1>
    <p class="lead">
      指令 = 「对 DOM 的声明式封装」。用它的判断标准：<strong>不需要额外的模板结构，
      只是给元素加行为</strong>。需要模板结构就写组件，需要复用逻辑就写组合式函数。
    </p>

    <BaseCard
      title="① 全局指令一览（定义在 src/directives/index.ts）"
      hint="v-focus / v-focus-delayed:300 / v-permission / v-click-outside / v-highlight"
      tone="ok"
    >
      <div class="grid2">
        <div>
          <p class="hint">v-focus：页面/元素挂载后自动聚焦</p>
          <input v-focus placeholder="我挂载后自动获得焦点" />

          <p class="hint" style="margin-top: 10px">v-focus-delayed:300（参数是延迟毫秒）</p>
          <input :key="delayedKey" v-focus-delayed:300 placeholder="300ms 后聚焦" />
          <button style="margin-top: 6px" @click="delayedKey++">重新创建（触发指令）</button>

          <p class="hint" style="margin-top: 10px">v-highlight（mounted + updated 都会跑）</p>
          <span v-highlight="highlightColor" class="hl">我的背景色来自指令绑定值</span>
          <div class="row" style="margin-top: 6px">
            <input type="color" v-model="highlightColor" />
            <button @click="highlightTick++">触发组件更新（tick={{ highlightTick }}）</button>
          </div>
        </div>

        <div>
          <p class="hint">v-permission：按当前角色移除元素（切换角色后重新进入本页生效）</p>
          <div class="row">
            <select v-model="counter.role">
              <option value="admin">admin</option>
              <option value="editor">editor</option>
              <option value="guest">guest</option>
            </select>
            <span class="kv">当前角色：{{ counter.role }}</span>
          </div>
          <div class="row" style="margin-top: 8px">
            <button v-permission="'admin'" class="primary">仅 admin 可见</button>
            <button v-permission="'editor'">仅 editor 可见</button>
            <button v-permission="'guest'">仅 guest 可见</button>
            <span class="kv">（切到别的页面再回来，看按钮消失）</span>
          </div>

          <p class="hint" style="margin-top: 10px">v-click-outside：点元素外部关闭下拉</p>
          <div v-click-outside="closeDropdown" class="dropdown">
            <button @click="dropdownOpen = !dropdownOpen">下拉菜单 ▾</button>
            <ul v-if="dropdownOpen">
              <li>选项一</li>
              <li>选项二</li>
              <li>选项三</li>
            </ul>
          </div>
          <p class="kv">已被外部点击关闭 {{ outsideCount }} 次</p>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="② 局部指令（定义在组件内部）" hint="只在本组件生效；命名用 vXxx，模板里写 v-xxx。">
      <p v-uppercase.prefix>hello local directive</p>
      <p v-shorten>这是一段很长的文字，会被函数式指令截断</p>
      <p class="kv">{{ upperLog }}</p>

      <pre class="code" style="margin-top: 10px">
// 局部指令：&lt;script setup&gt; 里以 v 开头的驼峰变量会被识别为指令
const vUppercase = {
  mounted(el, binding) { el.textContent = el.textContent.toUpperCase() },
  updated(el) { el.textContent = el.textContent.toUpperCase() },
}

// 函数简写：等价于 { mounted, updated }
const vShorten = (el) =&gt; { el.textContent = el.textContent.slice(0, 8) + '…' }

// 模板里用 kebab-case
&lt;p v-uppercase.prefix&gt;...&lt;/p&gt;
&lt;p v-shorten&gt;...&lt;/p&gt;</pre
      >
    </BaseCard>

    <BaseCard title="③ binding 对象全字段" hint="把 v-demo:arg.mod1.mod2=&quot;expr&quot; 拆开看。">
      <pre class="code">
// 模板：&lt;div v-demo:color.bold.delay="200"&gt;
{
  value: 200,               // 绑定表达式的值（可动态）
  oldValue: 100,            // 上一次的值（只在 beforeUpdate/updated 里有意义）
  arg: 'color',             // 冒号后的参数，可动态：[argName]
  modifiers: { bold: true, delay: true },  // 点号后的修饰符
  instance: 组件实例,        // binding.instance?.$el 等
  dir: 指令定义对象本身,
}
// 钩子签名：(el, binding, vnode, prevVNode)
// 动态参数：&lt;div v-demo:[dynamicArg]="v"&gt;  与 v-bind 的动态参数规则一致</pre
      >
    </BaseCard>

    <BaseCard title="④ 5 个实战指令模板（直接抄）" tone="ok">
      <pre class="code">
// 1. 权限：无权限直接移除元素
const vPermission: Directive&lt;HTMLElement, string&gt; = {
  mounted(el, binding) { if (!hasRole(binding.value)) el.remove() },
}

// 2. 图片懒加载（IntersectionObserver + 清理）
const vLazy: Directive&lt;HTMLImageElement, string&gt; = {
  mounted(el, binding) {
    const io = new IntersectionObserver(([e]) =&gt; {
      if (e.isIntersecting) { el.src = binding.value; io.disconnect() }
    })
    io.observe(el)
    ;(el as any).__io__ = io
  },
  updated(el, binding) { if (binding.value !== binding.oldValue) el.src = binding.value },
  unmounted(el) { (el as any).__io__?.disconnect() },
}

// 3. 节流点击（防止重复提交）
const vThrottleClick: Directive&lt;HTMLElement, () =&gt; void&gt; = {
  mounted(el, binding) {
    let locked = false
    el.addEventListener('click', async () =&gt; {
      if (locked) return
      locked = true
      try { await binding.value() } finally { setTimeout(() =&gt; (locked = false), 800) }
    })
  },
}

// 4. 水印（把文字画到 canvas 再当背景）
// 5. 数字滚动动画 / 拖拽 / 长按 —— 都是同一个套路：mounted 绑定，unmounted 清理</pre
      >
    </BaseCard>

    <BaseCard title="⑤ 指令的三个坑" tone="warn">
      <ol style="margin: 0; padding-left: 20px">
        <li>
          <b>updated 不代表「指令值变了」</b>：只要所在组件重渲染就会调用，
          所以要在里面比较 <code>binding.value !== binding.oldValue</code> 再干活。
        </li>
        <li>
          <b>多根节点组件上的指令会警告</b>：指令绑在组件上而组件是多根节点时，
          Vue 不知道该把行为加到哪个元素上（Vue 3 会输出运行时警告）。
        </li>
        <li>
          <b>忘了在 unmounted 里清理</b>：事件监听、定时器、IntersectionObserver
          都必须成对释放，否则组件销毁后回调仍会执行（内存泄漏 + 报错）。
        </li>
      </ol>
    </BaseCard>
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
.hl {
  padding: 2px 8px;
  border-radius: 6px;
}
.dropdown {
  position: relative;
  display: inline-block;
}
.dropdown ul {
  position: absolute;
  z-index: 5;
  margin: 4px 0 0;
  padding: 4px;
  list-style: none;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  min-width: 120px;
}
.dropdown li {
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.dropdown li:hover {
  background: var(--c-surface-2);
}
</style>
