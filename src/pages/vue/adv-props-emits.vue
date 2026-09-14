<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import PropsChild from '@/components/PropsChild.vue'

/* ============================================================================
 * 9. 组件通信（一）：defineProps / defineEmits / defineExpose
 *
 * 单向数据流：父 → 子 通过 props（只读），子 → 父 通过 emit 事件。
 * 这是所有组件通信的基础；跨层级用 provide/inject（第 11 页），
 * 全局共享用 Pinia（第 15 页）。
 * ========================================================================== */

// ---------- 父组件维护状态 ----------
const count = ref(0)
const status = ref<'draft' | 'published' | 'archived'>('draft')
const tags = ref(['vue', 'typescript'])
const childTitle = ref('我的第一篇文章')
const notifyText = ref('')
const eventLog = ref<string[]>([])

// ---------- 接收子组件的事件 ----------
function onIncrement(payload: { step: number; reason: string }) {
  count.value += payload.step
  eventLog.value.unshift(`increment: +${payload.step}（${payload.reason}）`)
}
function onUpdateStatus(s: 'draft' | 'published' | 'archived') {
  status.value = s
  eventLog.value.unshift(`update-status: ${s}`)
}

// ---------- 动态 props：v-bind 对象可以批量传 ----------
const extraProps = ref<Record<string, unknown>>({})
function toggleExtraProps() {
  extraProps.value = Object.keys(extraProps.value).length
    ? {}
    : { tags: ['批量', '传入'], count: 99 }
}

// ---------- 事件校验：多个 v-on 同名会依次执行 ----------
function onNotify(msg: string) {
  notifyText.value = msg
  eventLog.value.unshift(`notify: ${msg}`)
}

const attrsLog = ref('（$attrs 的透传演示见第 10 页）')
onMounted(() => console.log('[PropsChild] 挂载完成'))
</script>

<template>
  <div>
    <h1>9. 组件通信（一）Props / Emits</h1>
    <p class="lead">
      规则只有一条：<strong>props 只读，子组件改数据必须 emit 事件</strong>。
      这样数据流向始终是单向的，出问题时你只需要顺着父组件找原因。
    </p>

    <BaseCard
      title="① props：类型声明 + withDefaults 默认值"
      hint="改下面的输入框，子组件的 props 会实时更新；count 用父组件的按钮控制。"
      tone="ok"
    >
      <div class="row">
        <label class="kv">title <input v-model="childTitle" /></label>
        <label class="kv"
          >status
          <select v-model="status">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label class="kv"
          >tags
          <input :value="tags.join(',')" @change="tags = ($event.target as HTMLInputElement).value.split(',')" />
        </label>
        <button @click="count++">父组件 count++（{{ count }}）</button>
        <button @click="toggleExtraProps">切换 v-bind 批量 props</button>
      </div>

      <PropsChild
        v-bind="extraProps"
        :title="childTitle"
        :count="count"
        :tags="tags"
        :status="status"
        class="mt"
        @increment="onIncrement"
        @update-status="onUpdateStatus"
        @notify="onNotify"
      />

      <p class="kv" style="margin-top: 10px">
        notify 内容：{{ notifyText || '（等待子组件事件）' }} ｜ attrs：{{ attrsLog }}
      </p>
      <pre class="code" style="margin-top: 8px">{{ eventLog.slice(0, 6).join('\n') || '（事件日志为空）' }}</pre>
    </BaseCard>

    <BaseCard title="② 三种声明方式对照" hint="TS 项目统一用「类型声明 + withDefaults」，最省心。">
      <pre class="code">
// ✅ 推荐：类型声明（编译期 + 运行时都会校验）
const props = withDefaults(defineProps&lt;{
  title: string
  count?: number
  tags?: string[]
  status?: 'draft' | 'published'
}&gt;(), {
  count: 0,
  tags: () =&gt; [],          // 对象/数组默认值必须是工厂函数
  status: 'draft',
})

// 对象形式：需要自定义校验时用（不常用）
defineProps({
  count: { type: Number, required: true },
  status: { type: String, validator: (v: string) =&gt; ['draft', 'published'].includes(v) },
})

// 数组形式：写法最短，但拿不到类型和默认值
defineProps(['title', 'count'])

// 🚫 解构 props（3.5 之前）会丢响应式；3.5+ 的响应式 props 解构可用但不推荐依赖
const { title } = props   // ❌ 后续父组件改 title，这里的 title 不会更新（历史坑）</pre
      >
      <p class="hint" style="margin-top: 8px">
        Vue 3.5 起支持「响应式 props 解构」（编译器自动转成 <code>props.title</code>），
        但为了可读性和版本兼容，模板里直接写 <code>props.xxx</code> 仍是最稳的写法。
      </p>
    </BaseCard>

    <BaseCard title="③ emit 的两种声明 + 命名规范">
      <pre class="code">
// 类型声明（推荐）：有自动补全，参数类型受约束
const emit = defineEmits&lt;{
  (e: 'update-status', status: 'draft' | 'published'): void
  (e: 'increment', payload: { step: number }): void
}&gt;()

// 运行时声明：还可以做参数校验
const emit = defineEmits({
  'update-status': (status: string) =&gt; ['draft', 'published'].includes(status),
  submit: null,   // null 表示不校验
})

emit('increment', { step: 1 })

// 命名：推荐 kebab-case（update-status）；v-model 相关固定是 update:modelValue
// 大小写：HTML 模板里 @update-status 会自动匹配 emit('update-status')
//        但 emit('updateStatus') 在 HTML 里要写 @update-status（编译器会转换）</pre
      >
      <p class="hint" style="margin-top: 8px">
        配合 <code>v-model:status="status"</code> 时，子组件应 emit
        <code>update:status</code>，这就是「具名 v-model」的底层机制。
      </p>
    </BaseCard>

    <BaseCard title="④ defineExpose 与模板 ref" hint="父组件通过 ref 访问子组件实例（默认是封闭的）。">
      <pre class="code">
// 子组件：只暴露想给父组件用的东西
defineExpose({ reset, count })

// 父组件：3.5+ 推荐 useTemplateRef
const childRef = useTemplateRef&lt;InstanceType&lt;typeof Child&gt;&gt;('childRef')
childRef.value?.reset()</pre
      >
      <p class="hint" style="margin-top: 8px">
        最佳实践：<b>能不用 ref 调子组件就不用</b>。让子组件通过 props 控制、通过 emit 反馈，
        只有「命令式操作」（focus、播放、滚动、重置表单）才暴露方法。
      </p>
    </BaseCard>

    <BaseCard title="⑤ 迁移自 Vue 2 的常见改名">
      <table>
        <thead>
          <tr>
            <th>Vue 2</th>
            <th>Vue 3</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>props / $emit</td>
            <td>defineProps / defineEmits</td>
            <td>组合式 API 里用编译宏，无需 import</td>
          </tr>
          <tr>
            <td>this.$refs.xxx</td>
            <td>useTemplateRef('xxx')</td>
            <td>模板里 ref="xxx"</td>
          </tr>
          <tr>
            <td>v-model="x" + .sync</td>
            <td>v-model / v-model:name</td>
            <td>.sync 已移除，统一成 v-model 参数形式</td>
          </tr>
          <tr>
            <td>$listeners</td>
            <td>并入 $attrs</td>
            <td>事件监听器也在 attrs 里，onXxx 形式</td>
          </tr>
          <tr>
            <td>filters 过滤器</td>
            <td>computed / 方法</td>
            <td>Vue 3 已移除</td>
          </tr>
          <tr>
            <td>$children / $on</td>
            <td>已移除</td>
            <td>用 props/emits、provide/inject、Pinia 替代</td>
          </tr>
        </tbody>
      </table>
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
.mt {
  margin-top: 12px;
}
</style>
