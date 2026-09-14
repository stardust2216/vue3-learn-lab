<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * Teleport 弹窗组件。
 * Teleport 的作用：把这段 DOM 渲染到别的地方（通常是 body），
 * 从而绕开父级的 overflow: hidden、transform、z-index 堆叠上下文。
 *
 * Transition 的作用：给「插入 / 移除」加动画（对应 CSS 的 6 个 class）。
 */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ title?: string }>()
const emit = defineEmits<{ (e: 'confirmed', note: string): void }>()

// 打开时锁定 body 滚动（真实项目里的常规操作）
watch(open, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
onBeforeUnmount(() => (document.body.style.overflow = ''))

const note = ref('')
function confirm() {
  // 通过 emit 让父组件知道结果
  emit('confirmed', note.value)
  open.value = false
}
</script>

<template>
  <!-- to="body"：把这个弹窗的 DOM 挂到 body 下；disabled 时退回原位（移动端适配常用） -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="mask" @click.self="open = false">
        <div class="dialog">
          <header>
            <h4>{{ props.title ?? 'Teleport 弹窗' }}</h4>
            <button @click="open = false">✕</button>
          </header>
          <div class="body">
            <p class="hint">
              打开 DevTools 看：这段 DOM 实际挂在 <code>&lt;body&gt;</code> 下，
              而不是本页面的组件树里 —— 但它依然是本组件的一部分（父组件的 data-v、props、事件都正常）。
            </p>
            <textarea v-model="note" rows="2" placeholder="写点什么，确认后回传给父组件"></textarea>
          </div>
          <footer>
            <button @click="open = false">取消</button>
            <button class="primary" @click="confirm">确定并回传</button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  z-index: 100;
}
.dialog {
  width: min(460px, 92vw);
  background: var(--c-surface);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}
header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--c-border);
}
header h4 {
  flex: 1;
  margin: 0;
  font-size: 14px;
}
header button {
  border: none;
  background: transparent;
  font-size: 15px;
}
.body {
  padding: 14px;
}
.body textarea {
  width: 100%;
  margin-top: 8px;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--c-border);
  background: var(--c-surface-2);
}

/* Transition 的 6 个 class：
   modal-enter-from / modal-enter-active / modal-enter-to
   modal-leave-from / modal-leave-active / modal-leave-to */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .dialog,
.modal-leave-active .dialog {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .dialog,
.modal-leave-to .dialog {
  transform: scale(0.9) translateY(12px);
}
</style>
