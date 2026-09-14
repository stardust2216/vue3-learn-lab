<script setup lang="ts">
import { ref } from 'vue'

/**
 * 演示 key 的真实影响：
 * 用 index 作 key 时，删除中间项会让「输入框里的内容」跟错行——因为 Vue 复用了 DOM。
 */
const items = ref([
  { id: 1, text: '第一项' },
  { id: 2, text: '第二项' },
  { id: 3, text: '第三项' },
])
const notes = ref<Record<number, string>>({
  1: '我写在第一项里',
  2: '我写在第二项里',
  3: '我写在第三项里',
})
const useIndexKey = ref(false)
let nextId = 4

function removeMiddle() {
  items.value.splice(1, 1)
}
function addRow() {
  items.value.push({ id: nextId++, text: `新项 ${nextId - 1}` })
}
function reset() {
  items.value = [
    { id: 1, text: '第一项' },
    { id: 2, text: '第二项' },
    { id: 3, text: '第三项' },
  ]
  notes.value = { 1: '我写在第一项里', 2: '我写在第二项里', 3: '我写在第三项里' }
  nextId = 4
}
</script>

<template>
  <div>
    <div class="row">
      <label class="kv"
        ><input type="checkbox" v-model="useIndexKey" /> 用 index 作为 key（错误示范）</label
      >
      <button @click="removeMiddle">删除中间项</button>
      <button @click="addRow">末尾新增</button>
      <button @click="reset">重置</button>
    </div>

    <p class="hint" style="margin-top: 8px">
      步骤：先在输入框里打字 → 点「删除中间项」。用 <code>id</code> 作 key 时文字跟着数据走；
      用 <code>index</code> 作 key 时文字会「串行」，因为 Vue 认为第 2 个位置的 DOM 还是原来那个。
    </p>

    <ul class="list">
      <li v-for="(item, index) in items" :key="useIndexKey ? index : item.id">
        <span class="tag">{{ useIndexKey ? 'key=index' : 'key=id:' + item.id }}</span>
        <span class="label">{{ item.text }}</span>
        <input v-model="notes[item.id]" :placeholder="`第 ${items.indexOf(item) + 1} 行输入`" />
        <span class="kv">notes[{{ item.id }}] = "{{ notes[item.id] ?? '' }}"</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}
.list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  margin-bottom: 6px;
  background: var(--c-surface-2);
}
.label {
  min-width: 70px;
  font-size: 13px;
}
</style>
