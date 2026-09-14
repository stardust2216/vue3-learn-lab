<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import DemoInput from '@/components/DemoInput.vue'

/* ============================================================================
 * 5. 事件处理 + 表单 + 组件 v-model
 * 核心结论：v-model 是语法糖，组件上的 v-model 就是 :modelValue + @update:modelValue
 * ========================================================================== */

// ---------- ① 组件 v-model（默认 + 具名 + 修饰符） ----------
const basicValue = ref('')
const titleValue = ref('')
const textValue = ref('')
const eventLog = ref<string[]>([])

// v-model 的自定义修饰符也可以这样接收（3.4 之前的老写法，了解即可）
function onConfirm(v: string) {
  eventLog.value.unshift(`confirm 事件收到："${v}"`)
}

// ---------- ② 表单综合示例 ----------
const form = reactive({
  username: '',
  email: '',
  password: '',
  age: 18 as number | null,
  gender: 'secret' as 'male' | 'female' | 'secret',
  hobbies: [] as string[],
  city: 'hangzhou',
  bio: '',
  agree: false,
  level: 50,
})
const submitted = ref<null | typeof form>(null)

const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.username) e.username = '用户名必填'
  else if (form.username.length < 3) e.username = '用户名至少 3 个字符'
  if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = '邮箱格式不正确'
  if (form.password.length < 6) e.password = '密码至少 6 位'
  if (!form.agree) e.agree = '必须同意协议'
  return e
})
const isValid = computed(() => Object.keys(errors.value).length === 0)

function submit() {
  if (!isValid.value) return
  submitted.value = JSON.parse(JSON.stringify(form))
}
function resetForm() {
  Object.assign(form, {
    username: '',
    email: '',
    password: '',
    age: 18,
    gender: 'secret',
    hobbies: [],
    city: 'hangzhou',
    bio: '',
    agree: false,
    level: 50,
  })
  submitted.value = null
}
</script>

<template>
  <div>
    <h1>5. 事件处理与表单</h1>
    <p class="lead">
      DOM 事件用 <code>@事件名</code>；表单用 <code>v-model</code>；
      <strong>组件上的 v-model 只是 props + emit 的语法糖</strong>，理解这一点，
      所有「第三方组件 v-model 怎么用」的疑问都会消失。
    </p>

    <BaseCard
      title="① 组件 v-model：默认 / 具名 / 修饰符"
      hint="子组件用 defineModel() 声明；父组件写 v-model / v-model:title.trim / v-model:text。"
      tone="ok"
    >
      <DemoInput
        v-model="basicValue"
        v-model:title.trim="titleValue"
        v-model:text="textValue"
        placeholder="默认 v-model"
        :max-length="20"
        @confirm="onConfirm"
        @cleared="eventLog.unshift('cleared 事件：子组件被清空')"
      />
      <div class="row" style="margin-top: 10px">
        <span class="tag pass">basicValue = "{{ basicValue }}"</span>
        <span class="tag info">title = "{{ titleValue }}"</span>
        <span class="tag warn">text（自动大写）= "{{ textValue }}"</span>
      </div>
      <pre class="code" style="margin-top: 10px">父组件：&lt;DemoInput v-model="x" v-model:title.trim="y" v-model:text="z" /&gt;
子组件：const model = defineModel&lt;string&gt;()            // 默认
        const title = defineModel&lt;string&gt;('title')      // 具名
        const text  = defineModel&lt;string&gt;('text', { set: v =&gt; v.toUpperCase() })

等价的原始写法：
&lt;DemoInput :modelValue="x" @update:modelValue="x = $event" /&gt;
子组件：defineProps(['modelValue']) + defineEmits(['update:modelValue'])</pre
      >
      <pre class="code" style="margin-top: 8px">{{ eventLog.slice(0, 4).join('\n') || '（事件日志为空）' }}</pre>
    </BaseCard>

    <BaseCard
      title="② 表单绑定全家桶 + 校验"
      hint="v-model 在 input/textarea/select/checkbox/radio 上的取值规则，以及配套修饰符。"
    >
      <form class="form" @submit.prevent="submit">
        <div class="grid2">
          <div>
            <label>用户名（必填，≥3）
              <input v-model.trim="form.username" placeholder="请输入用户名" />
              <span v-if="errors.username" class="err">{{ errors.username }}</span>
            </label>
            <label>邮箱
              <input v-model.trim="form.email" type="email" placeholder="a@b.com" />
              <span v-if="errors.email" class="err">{{ errors.email }}</span>
            </label>
            <label>密码（≥6）
              <input v-model="form.password" type="password" placeholder="••••••" />
              <span v-if="errors.password" class="err">{{ errors.password }}</span>
            </label>
            <label>年龄（.number 自动转数字）
              <input v-model.number="form.age" type="number" />
            </label>
            <label>音量（v-model 绑 range）
              <input v-model.number="form.level" type="range" min="0" max="100" />
              <span class="kv">{{ form.level }}</span>
            </label>
          </div>

          <div>
            <fieldset>
              <legend>性别（radio 单选）</legend>
              <label><input type="radio" value="male" v-model="form.gender" /> 男</label>
              <label><input type="radio" value="female" v-model="form.gender" /> 女</label>
              <label><input type="radio" value="secret" v-model="form.gender" /> 保密</label>
            </fieldset>

            <fieldset>
              <legend>爱好（checkbox 数组）</legend>
              <label><input type="checkbox" value="code" v-model="form.hobbies" /> 写代码</label>
              <label><input type="checkbox" value="read" v-model="form.hobbies" /> 看书</label>
              <label><input type="checkbox" value="game" v-model="form.hobbies" /> 游戏</label>
              <div class="kv">hobbies = {{ form.hobbies }}</div>
            </fieldset>

            <label>城市（select）
              <select v-model="form.city">
                <option value="hangzhou">杭州</option>
                <option value="shanghai">上海</option>
                <option value="beijing">北京</option>
              </select>
            </label>

            <label>简介（textarea + .lazy）
              <textarea v-model.lazy="form.bio" rows="2" placeholder="失焦才同步"></textarea>
            </label>

            <label>
              <input type="checkbox" v-model="form.agree" /> 我已阅读并同意协议
              <span v-if="errors.agree" class="err">{{ errors.agree }}</span>
            </label>
          </div>
        </div>

        <div class="row" style="margin-top: 12px">
          <button class="primary" type="submit" :disabled="!isValid">提交（@submit.prevent）</button>
          <button type="button" @click="resetForm">重置</button>
          <span class="tag" :class="isValid ? 'pass' : 'warn'">
            {{ isValid ? '校验通过' : Object.keys(errors).length + ' 个问题' }}
          </span>
        </div>
      </form>

      <pre v-if="submitted" class="code" style="margin-top: 10px">提交的数据：
{{ JSON.stringify(submitted, null, 2) }}</pre>
      <p class="hint" style="margin-top: 8px">
        表单提交用 <code>@submit.prevent</code> 阻止默认刷新；校验用 computed（纯函数、可复用、无副作用）。
      </p>
    </BaseCard>

    <BaseCard title="③ v-model 取值规则对照表">
      <table>
        <thead>
          <tr>
            <th>表单元素</th>
            <th>绑定值类型</th>
            <th>注意点</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>input[type=text] / textarea</td>
            <td>string</td>
            <td><code>.lazy</code> 改成 change 同步、<code>.trim</code>、<code>.number</code></td>
          </tr>
          <tr>
            <td>input[type=checkbox] 单个</td>
            <td>boolean</td>
            <td>加 <code>true-value / false-value</code> 可自定义两端的值</td>
          </tr>
          <tr>
            <td>input[type=checkbox] 多个</td>
            <td>数组</td>
            <td>必须有 <code>value</code> 属性，绑定同一个数组</td>
          </tr>
          <tr>
            <td>input[type=radio]</td>
            <td>value 的类型</td>
            <td>同一组 radio 共享一个 ref</td>
          </tr>
          <tr>
            <td>select 单选 / 多选</td>
            <td>string / 数组</td>
            <td>多选务必加 <code>multiple</code></td>
          </tr>
          <tr>
            <td>自定义组件</td>
            <td>defineModel 的泛型</td>
            <td>默认 prop 名 modelValue，具名用 <code>v-model:name</code></td>
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
.form label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}
.form input,
.form select,
.form textarea {
  display: block;
  margin-top: 3px;
  width: 100%;
}
fieldset {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  margin: 0 0 8px;
  padding: 8px 10px;
}
fieldset label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
}
fieldset input {
  display: inline;
  width: auto;
  margin: 0;
}
.err {
  display: block;
  color: var(--c-danger);
  font-size: 12px;
}
</style>
