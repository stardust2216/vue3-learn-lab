<script setup lang="ts">
import { ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import SlotPanel from '@/components/SlotPanel.vue'

/* ============================================================================
 * 10. 插槽 Slots
 *
 * 默认插槽：<slot />          → 父组件里的子节点
 * 具名插槽：<slot name="x" /> → 父组件 <template #x>
 * 作用域插槽：<slot :item="item" /> → 父组件 <template #row="{ item }">
 * 动态插槽名：<slot :name="dynamic" /> → 父组件 #[dynamicName]
 * 插槽内容由「父组件」渲染，所以它的作用域是父组件的（这是最容易搞混的点）
 * ========================================================================== */

// ---------- ④ 动态插槽名 ----------
const dynamicName = ref<'info' | 'warning' | 'error'>('info')
const dynamicNames = ['info', 'warning', 'error'] as const

// ---------- ③ 作用域插槽接收的数据 ----------
const pickedItems = ref<string[]>([])
function pick(item: { name: string; price: number }) {
  pickedItems.value.unshift(`${item.name}（¥${item.price}）`)
}

// ---------- ① 对照：不用插槽时只能靠 props 传 HTML（危险/不灵活） ----------
const useCustomHeader = ref(true)
const headerText = ref('父组件传入的标题')

// ---------- $slots 判断 ----------
const showFooter = ref(true)
</script>

<template>
  <div>
    <h1>10. 插槽 Slots</h1>
    <p class="lead">
      插槽解决的是「<strong>结构由父组件决定、位置由子组件决定</strong>」的问题。
      props 传的是数据，slot 传的是模板片段。
    </p>

    <BaseCard title="① 默认插槽 + 具名插槽 + fallback" hint="切换开关看 fallback 内容。">
      <div class="row">
        <label class="kv"><input type="checkbox" v-model="useCustomHeader" /> 传入自定义 header</label>
        <label class="kv"><input type="checkbox" v-model="showFooter" /> 传入 footer</label>
        <input v-model="headerText" />
      </div>

      <SlotPanel style="margin-top: 10px">
        <template v-if="useCustomHeader" #header>
          <b>🔖 {{ headerText }}</b>
        </template>

        <template #actions>
          <button class="btn">编辑</button>
          <button class="btn danger">删除</button>
        </template>

        <!-- 默认插槽：直接写在标签内部的非 template 内容 -->
        <p>
          我是塞进「默认插槽」的内容，可以是任意模板结构：
          <span class="tag info">含组件</span>
          <button class="btn">甚至按钮</button>
        </p>

        <template v-if="showFooter" #footer>
          页脚插槽 —— 父组件提供，位置由子组件决定
        </template>
      </SlotPanel>

      <p class="hint" style="margin-top: 8px">
        命名建议：<code>#header</code> 等价于 <code>v-slot:header</code>；默认插槽写成
        <code>#default</code>。
      </p>
    </BaseCard>

    <BaseCard
      title="② 作用域插槽：子组件提供数据，父组件决定长什么样"
      hint="最经典的例子就是「列表组件」和「表格组件」。"
      tone="ok"
    >
      <SlotPanel>
        <template #row="{ item, index, highlight }">
          <span :style="{ color: highlight ? 'var(--c-danger)' : undefined }">
            {{ index }}. {{ item.name }} —— ¥{{ item.price }}
            <b v-if="highlight">（贵！）</b>
          </span>
          <button class="btn" style="margin-left: 8px" @click="pick(item)">选它</button>
        </template>
      </SlotPanel>

      <p class="kv" style="margin-top: 8px">已选：{{ pickedItems.join('、') || '（还没选）' }}</p>

      <pre class="code" style="margin-top: 8px">
子组件：&lt;slot name="row" :item="item" :index="i" :highlight="item.price &gt; 500" /&gt;
父组件：&lt;template #row="{ item, index, highlight }"&gt; ... &lt;/template&gt;</pre
      >
      <p class="hint" style="margin-top: 8px">
        数据流：子组件 → 父组件模板。所以作用域插槽可以用来「反向暴露子组件内部状态」，
        表格组件（Element Plus 的 el-table-column）就是这么实现的。
      </p>
    </BaseCard>

    <BaseCard title="③ 动态插槽名" hint="插槽名可以是变量，配合 v-for 或用户选择动态渲染。">
      <div class="row">
        <button
          v-for="n in dynamicNames"
          :key="n"
          :class="{ primary: dynamicName === n }"
          @click="dynamicName = n"
        >
          {{ n }}
        </button>
        <span class="kv">当前插槽名：{{ dynamicName }}</span>
      </div>

      <SlotPanel :dynamic-name="dynamicName" style="margin-top: 10px">
        <template #[dynamicName]>
          <span class="tag warn">父组件通过 #[{{ dynamicName }}] 提供了这段内容</span>
        </template>
      </SlotPanel>
    </BaseCard>

    <BaseCard title="④ 插槽的 4 个易错点" tone="warn">
      <ol style="margin: 0; padding-left: 20px">
        <li>
          <b>作用域问题</b>：插槽内容在父组件作用域里编译，所以它<b>访问不到子组件的变量</b>，
          必须通过 slot props 传出来。
        </li>
        <li>
          <b>样式作用域</b>：父组件提供的插槽内容只带父组件的 <code>data-v</code>，
          所以子组件想给它写样式要用 <code>:slotted()</code>。
        </li>
        <li>
          <b>$slots vs $scopedSlots</b>：Vue 3 全部合并到 <code>$slots</code>，
          <code>useSlots()</code> 是组合式写法。
        </li>
        <li>
          <b>v-if 控制插槽本身</b>：<code>&lt;template v-if="x" #header&gt;</code>
          合法；但不要用 v-if 去切 slot 的 name。
        </li>
      </ol>
    </BaseCard>

    <BaseCard title="⑤ $attrs：属性/事件透传（插槽的孪生兄弟）">
      <pre class="code">
// 父组件：&lt;BaseInput class="big" placeholder="名字" @focus="onFocus" /&gt;
// 子组件模板：
&lt;input v-bind="$attrs" /&gt;
&lt;script setup&gt;
// 若某个 prop 被子组件声明了，它就不会出现在 $attrs 里
defineProps&lt;{ placeholder?: string }&gt;()
// 关闭自动继承，手动决定挂到哪里（多根节点组件必须手动绑定，否则 Vue 会警告）
defineOptions({ inheritAttrs: false })
&lt;/script&gt;</pre
      >
      <p class="hint" style="margin-top: 8px">
        <code>$attrs</code> 里同时包含普通属性和 <code>onXxx</code> 事件监听，
        所以「把父组件的所有事件透传给内部元素」只需要 <code>v-bind="$attrs"</code>。
        这就是 Element Plus 等组件库支持 <code>@click</code>、<code>class</code> 的底层机制。
      </p>
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
