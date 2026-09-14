<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'

/* ============================================================================
 * 1. 模板语法（Template Syntax）
 * Vue 的模板是「声明式」的：你描述 UI 和数据的关系，Vue 负责在数据变化时更新 DOM。
 * 记忆要点：
 *   {{ }}      → 插值（文本）
 *   v-bind / : → 绑定属性（单向：数据 → DOM）
 *   v-on   / @ → 绑定事件（DOM → 数据）
 *   v-if / v-for / v-model → 指令
 * ========================================================================== */

// ---------- ① 插值：任何 JS 表达式都可以，但只能是「表达式」（不能是语句） ----------
const msg = ref('Hello Vue 3')
const num = ref(3)
const now = ref(new Date())
function refreshTime() {
  now.value = new Date()
}

// ---------- ② v-bind：绑定 HTML 属性、class、style、props ----------
const isDisabled = ref(false)
const size = ref(18)
const attrs = reactive({ id: 'my-input', 'data-role': 'demo', title: '我是 v-bind 批量绑定' })

// class 的三种写法：字符串 / 对象 / 数组
const classStr = ref('tag')
const classObj = reactive({ pass: true, warn: false, info: true })
const classArr = ref(['tag', 'info'])

// style 的两种写法：对象 / 数组
const styleObj = reactive({ color: '#42b883', fontWeight: 600 })

// ---------- ③ v-on：事件绑定与内联表达式 ----------
const clicks = ref(0)
const lastKey = ref('-')
const items = ref(['苹果', '香蕉', '橘子'])

// ---------- ④ 指令：v-if / v-show / v-for / v-model 的差别 ----------
const showBox = ref(true)
const count = ref(1)
const text = ref('')
const checked = ref(false)
const picked = ref('b')
const tags = ref(['Vue', 'Vite', 'TS'])

// ---------- ⑤ 动态绑定：同一个 v-bind 后面接变量 ----------
const dynamicAttr = ref('title')
const dynamicAttrValue = ref('我是动态属性名')

// ---------- ⑥ 过滤器已移除：用 computed / 方法代替 ----------
const price = ref(1234.5)
function formatPrice(v: number) {
  return `¥${v.toFixed(2)}`
}
// 模板表达式里拿不到 typeof（typeof 是一元运算符，不是表达式），所以抽成 computed
const countType = computed(() => typeof count.value)
// v-text 的取值：注意这里用字符串拼出来，只是为了演示 v-text 的用法
const vTextDemo = 'v-text 等价于 {{ 插值 }}，但它会覆盖元素内已有的内容'
</script>

<template>
  <div>
    <h1>1. 模板语法</h1>
    <p class="lead">
      模板里能写「表达式」，不能写「语句」。下面每块都可以直接改代码试：
      数据 → 视图是自动的，视图 → 数据要靠 v-on / v-model。
    </p>

    <BaseCard
      title="① 文本插值 {{ }}"
      hint="双大括号里是 JS 表达式：运算、三元、调用函数、模板字符串都行；var/if/for 这种语句不行。"
    >
      <div class="row">
        <span>{{ msg }}</span>
        <span class="kv">{{ num }} × 7 = {{ num * 7 }}</span>
        <span class="kv">三元：{{ num > 2 ? '大于2' : '小于等于2' }}</span>
        <span class="kv">函数：{{ formatPrice(price) }}</span>
        <span class="kv">时间：{{ now.toLocaleTimeString() }}</span>
        <button @click="refreshTime">刷新时间</button>
      </div>
      <p class="hint" style="margin-top: 8px">
        注意：<code>&#123;&#123; &#125;&#125;</code> 只做文本渲染，永远不解析 HTML（防 XSS）。要渲染 HTML 用 v-html（危险，慎用）。
      </p>
    </BaseCard>

    <BaseCard
      title="② v-bind（简写 : ）单向绑定"
      hint="数据 → DOM。绑定 class / style / 普通属性 / 组件 props 都用它。"
    >
      <div class="grid2">
        <div>
          <p class="hint">对象语法绑定多个属性：</p>
          <input v-bind="attrs" placeholder="我有 id/title/data-role" />
          <p class="hint" style="margin-top: 6px">
            简写：<code>:title="dynamicAttrValue"</code>，动态属性名
            <code>[dynamicAttr]="dynamicAttrValue"</code>
          </p>
          <input :[dynamicAttr]="dynamicAttrValue" :placeholder="`动态属性名：${dynamicAttr}`" />
        </div>
        <div>
          <p class="hint">class 三种写法：</p>
          <span class="tag" :class="classObj">对象</span>
          <span :class="classArr.join(' ')">数组</span>
          <span :class="classStr">字符串</span>
          <p class="hint" style="margin-top: 8px">style 对象/数组：</p>
          <span :style="styleObj">我用了 :style 对象</span>
          <span :style="[{ fontSize: size + 'px' }, { color: '#3b82f6' }]">数组写法</span>
          <div class="row" style="margin-top: 8px">
            <label>字号 <input type="range" min="12" max="32" v-model.number="size" /></label>
            <label><input type="checkbox" v-model="isDisabled" /> 禁用按钮</label>
          </div>
          <button :disabled="isDisabled">:disabled 绑定</button>
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        小技巧：<code>:class</code> 和原生 class 可以共存，Vue 会合并；<code>v-bind="obj"</code> 可一次展开多个属性。
      </p>
    </BaseCard>

    <BaseCard
      title="③ v-on（简写 @ ）与事件修饰符"
      hint="视图 → 数据。事件对象 $event，修饰符 .stop .prevent .once .self .capture .passive"
    >
      <div class="row">
        <button class="primary" @click="clicks++">点击 +1（内联表达式）</button>
        <button @click="clicks = 0">重置</button>
        <span class="tag pass">clicks = {{ clicks }}</span>
      </div>

      <div class="row" style="margin-top: 10px">
        <!-- 内联写多行要用「箭头函数」或方法名；带参数时通常用箭头函数包一层 -->
        <button @click="(e) => { clicks += 2; lastKey = (e as MouseEvent).type }">
          带 $event 的内联（+2）
        </button>
        <span class="kv">lastKey: {{ lastKey }}</span>
      </div>

      <!-- 修饰符演示：外层 div 有点击，内层 .stop 阻止冒泡 -->
      <div
        @click="lastKey = '外层 div 冒泡'"
        style="margin-top: 10px; padding: 10px; border: 1px dashed var(--c-border); border-radius: 8px"
      >
        外层容器（点我会冒泡到这里）
        <div class="row" style="margin-top: 6px">
          <button @click="lastKey = '内层按钮（冒泡）'">不阻止冒泡</button>
          <button @click.stop="lastKey = '内层按钮（已阻止冒泡）'">.stop 阻止冒泡</button>
          <a href="https://vuejs.org" @click.prevent="lastKey = '链接被 .prevent 拦截'">.prevent 拦截跳转</a>
          <button @click.once="lastKey = '只触发一次的 .once'">.once 只生效一次</button>
        </div>
      </div>

      <p class="hint" style="margin-top: 10px">
        键盘/鼠标修饰符：<code>@keyup.enter</code> <code>@keyup.esc</code>
        <code>@click.right</code> <code>@scroll.passive</code>。<br />
        系统键：<code>@click.ctrl.exact</code>（精确匹配 Ctrl）。
      </p>
      <input
        placeholder="在这里按 Enter / Esc 试试"
        @keyup.enter="lastKey = '按了 Enter'"
        @keyup.esc="lastKey = '按了 Esc'"
      />
    </BaseCard>

    <BaseCard title="④ 常用指令速记" hint="v-if vs v-show：前者销毁/重建 DOM，后者只改 display。">
      <div class="grid2">
        <div>
          <label><input type="checkbox" v-model="showBox" /> showBox</label>
          <p v-if="showBox" class="tag pass">v-if：真实存在 / 移除 DOM</p>
          <p v-show="showBox" class="tag info">v-show：始终在 DOM，只切换 display</p>
          <p class="hint">用 DevTools 看元素树，能直观看到 v-if 的节点被注释掉了。</p>
        </div>
        <div>
          <p class="hint">v-for 三种遍历：数组 / 数组带索引 / 对象 / 数字</p>
          <ul style="margin: 0; padding-left: 18px">
            <li v-for="(item, i) in items" :key="item">第 {{ i + 1 }} 项：{{ item }}</li>
            <li v-for="(val, key, i) in attrs" :key="key">{{ i }}. {{ key }} = {{ val }}</li>
            <li v-for="n in 3" :key="n">数字循环 {{ n }}</li>
          </ul>
          <button style="margin-top: 6px" @click="items.push('新增-' + (items.length + 1))">
            给数组 push 一项
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      title="⑤ 表单 v-model（双向绑定语法糖）"
      hint="v-model 本质 = :value + @input。修饰符 .lazy(change) .number .trim"
    >
      <div class="grid2">
        <div class="row" style="flex-direction: column; align-items: flex-start">
          <input v-model="text" placeholder="文本框 v-model" />
          <input v-model.lazy="text" placeholder=".lazy 失焦才同步" />
          <input v-model.trim="text" placeholder=".trim 自动去首尾空格" />
          <input v-model.number="count" type="number" placeholder=".number 转数字" />
          <span class="kv">text = "{{ text }}" / count = {{ count }}（{{ countType }}）</span>
        </div>
        <div>
          <label><input type="checkbox" v-model="checked" /> 单个复选框 → boolean</label><br />
          <label
            ><input type="checkbox" v-model="tags" value="Vue" /> Vue
            <input type="checkbox" v-model="tags" value="React" /> React
            <input type="checkbox" v-model="tags" value="Svelte" /> Svelte</label
          >
          <div class="kv">tags = {{ tags }}</div>
          <label
            ><input type="radio" value="a" v-model="picked" /> A
            <input type="radio" value="b" v-model="picked" /> B</label
          >
          <div class="kv">picked = {{ picked }}</div>
          <select v-model="picked" multiple style="min-height: 60px">
            <option value="a">选项 A</option>
            <option value="b">选项 B</option>
          </select>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="⑥ 其他模板能力" hint="v-html / v-text / v-once / v-pre / v-cloak">
      <div class="grid2">
        <div>
          <p v-html="'<b>v-html</b> 会解析成真实 HTML（<i>只对可信内容用</i>）'"></p>
          <p v-text="vTextDemo"></p>
          <p v-once>v-once：{{ text }}（永远渲染第一次的值，不再更新）</p>
          <p v-pre>v-pre 原样输出：{{ 这里不会被编译 }}</p>
        </div>
        <div>
          <p class="hint">
            计算属性 vs 方法：下面的价格格式化用「方法」每次渲染都会重算，用 computed 会缓存：
          </p>
          <p class="kv">方法：{{ formatPrice(price) }}；computed 见第 3 页</p>
          <p class="hint">
            表达式不要写太长：超过 2 个操作符就该抽成 computed 或方法，模板只负责「描述结构」。
          </p>
        </div>
      </div>
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
</style>
