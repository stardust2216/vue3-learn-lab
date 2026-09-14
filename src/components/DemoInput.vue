<script setup lang="ts">
/**
 * 演示：自定义组件的 v-model 原理（Vue 3.4+ 的 defineModel）
 *
 * v-model 在组件上就是语法糖：
 *   <MyInput v-model="x" />
 * 等价于
 *   <MyInput :modelValue="x" @update:modelValue="x = $event" />
 * 用 defineModel() 后，这个「props + emit」的样板代码由编译器自动生成，
 * 并且它本身就是个可读写的 ref：子组件里直接 model.value = xxx 就能回写父组件。
 */
const model = defineModel<string>({ default: '' })

/** 具名 v-model：v-model:count。带 .uppercase 自定义修饰符 */
const title = defineModel<string>('title', { default: '' })
const text = defineModel<string>('text', { default: '', set: (v: string) => v.toUpperCase() })

const props = defineProps<{ placeholder?: string; maxLength?: number }>()
const emit = defineEmits<{
  (e: 'confirm', value: string): void
  (e: 'cleared'): void
}>()

function clear() {
  model.value = ''
  emit('cleared')
}
</script>

<template>
  <div class="field">
    <input
      v-model="model"
      :placeholder="props.placeholder ?? 'defineModel 默认 v-model'"
      :maxlength="props.maxLength"
      @keyup.enter="emit('confirm', model)"
    />
    <button @click="clear">清空（清空时会 emit cleared）</button>

    <div class="row" style="margin-top: 6px">
      <label class="kv">
        v-model:title（.trim）
        <input v-model.trim="title" placeholder="带空格的输入会被 trim" />
      </label>
      <label class="kv">
        v-model:text（.uppercase 修饰符 → set 转换）
        <input v-model="text" placeholder="自动转大写" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
input {
  min-width: 180px;
}
</style>
