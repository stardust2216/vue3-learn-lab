<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import KeyDemo from '@/components/KeyDemo.vue'

/* ============================================================================
 * 8. 渲染机制：key / v-if vs v-show / v-once / v-memo / 虚拟 DOM
 *
 * 虚拟 DOM 的意义：用 JS 对象描述 UI，数据变化时先在内存里 diff，
 * 只把「真正需要改的部分」同步到真实 DOM（真实 DOM 操作才是性能瓶颈）。
 * key 是 diff 算法的「身份标识」：同 key 的节点被认为可以复用。
 * ========================================================================== */

// ---------- v-if vs v-show 的渲染耗时 ----------
const showByIf = ref(true)
const showByShow = ref(true)

// ---------- v-once：只渲染一次，之后永远不再更新 ----------
const frozenTime = ref(new Date().toLocaleTimeString())
const liveTime = ref(new Date().toLocaleTimeString())
const tick = ref(0)
const timer = window.setInterval(() => {
  liveTime.value = new Date().toLocaleTimeString()
  tick.value++
}, 1000)
onBeforeUnmount(() => window.clearInterval(timer))

// ---------- v-memo：跳过整个子树的更新（列表性能优化） ----------
const list = ref(
  Array.from({ length: 300 }, (_, i) => ({ id: i + 1, score: Math.floor(Math.random() * 100) })),
)
const selectedId = ref<number | null>(null)
const keyword = ref('')

const filteredList = computed(() =>
  list.value.filter((it) => String(it.id).includes(keyword.value.trim())),
)

function bumpRender() {
  // 只改 selectedId：理论上未选中项不该重新渲染
  selectedId.value = selectedId.value === null ? 1 : null
}
function refreshScores() {
  list.value = list.value.map((it) => ({ ...it, score: Math.floor(Math.random() * 100) }))
}

// ---------- 函数式组件/渲染函数在下一页，这里先给出总结 ----------
const summary = [
  ['v-if', '真正的条件渲染：销毁 / 重建该分支（含组件状态、事件监听）', '条件很少变化、初始不渲染更省资源'],
  ['v-show', '始终渲染，只切 display:none', '频繁切换的显示/隐藏'],
  ['key', '给 diff 提供节点身份；同 key 复用，不同 key 重建', 'v-for 必须写稳定 id；强制重建组件时改 key'],
  ['v-once', '渲染一次后标记为静态，永不参与更新', '纯静态内容（协议文本、Logo）'],
  ['v-memo', '依赖数组不变就跳过该子树 diff', '大列表里每项独立的渲染优化'],
  ['v-pre', '跳过编译，原样输出', '展示 {{ }} 本身、加速大段静态模板'],
] as const
</script>

<template>
  <div>
    <h1>8. 渲染机制：key / v-if vs v-show</h1>
    <p class="lead">
      Vue 把「模板 → 虚拟 DOM → 真实 DOM」这条链路里的 diff 都交给你无法感知的运行时；
      你能干预的关键点只有 <code>key</code>、<code>v-if/v-show</code>、<code>v-once/v-memo</code>。
    </p>

    <BaseCard
      title="① key 的真实影响（请务必动手试）"
      hint="先在输入框打字，再删除中间项：切换两种 key 对比结果。"
      tone="warn"
    >
      <KeyDemo />
    </BaseCard>

    <BaseCard title="② v-if vs v-show" hint="打开 DevTools 元素面板：v-if 的节点被替换成注释节点。">
      <div class="row">
        <button @click="showByIf = !showByIf">v-if 切换（{{ showByIf }}）</button>
        <button @click="showByShow = !showByShow">v-show 切换（{{ showByShow }}）</button>
      </div>
      <div class="grid2" style="margin-top: 10px">
        <p v-if="showByIf" class="tag pass">v-if：我被真实创建/销毁，组件状态会丢失</p>
        <p v-show="showByShow" class="tag info">v-show：我一直在 DOM 里，state 保留</p>
      </div>
      <p class="hint" style="margin-top: 8px">
        结论：<b>频繁切换用 v-show</b>（切换成本低）；
        <b>条件稳定、或需要真正销毁组件/释放资源用 v-if</b>。
        二者不要同时写在一个元素上（v-if 优先级更高，v-show 会显得莫名其妙）。
      </p>
    </BaseCard>

    <BaseCard title="③ v-once / v-memo / v-pre" hint="看「冻结时间」和「实时时间」的区别。">
      <div class="grid2">
        <div>
          <p class="kv">v-once 时间：{{ frozenTime }}（点了也没变）</p>
          <p class="kv">实时时间：{{ liveTime }}（tick={{ tick }}）</p>
          <p class="kv" v-pre>v-pre 原样输出：{{ liveTime }}</p>
        </div>
        <div>
          <p class="hint">
            v-memo 用法：<code>&lt;div v-memo="[item.id, item.score]"&gt;</code>
            —— 数组中每一项的 id/score 都没变时，跳过该项的整个 diff。
          </p>
          <p class="hint">
            注意：v-memo 和 v-for 一起用时必须放在同一个元素上，且<strong>不能</strong>配合
            v-if（同元素会报错）。
          </p>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      title="④ v-memo 大列表演示（300 行）"
      hint="点「切换选中项」时，只有选中态在变；右侧渲染计数说明有多少行被重新渲染。"
    >
      <div class="row">
        <input v-model="keyword" placeholder="按 id 过滤" style="width: 120px" />
        <button @click="bumpRender">切换选中项（只改 selectedId）</button>
        <button @click="refreshScores">刷新所有分数（应该重渲染）</button>
        <span class="kv">共 {{ filteredList.length }} 行</span>
      </div>

      <div class="memolist" style="margin-top: 10px">
        <div
          v-for="item in filteredList"
          :key="item.id"
          v-memo="[item.id, item.score, selectedId === item.id]"
          class="memorow"
          :class="{ sel: selectedId === item.id }"
        >
          <span class="kv">#{{ item.id }}</span>
          <span>分数 {{ item.score }}</span>
          <span class="tag" :class="item.score >= 60 ? 'pass' : 'warn'">
            {{ item.score >= 60 ? '及格' : '不及格' }}
          </span>
        </div>
      </div>
      <p class="hint" style="margin-top: 8px">
        说明：这里对每行做了 v-memo，只有依赖变化过的行才会参与 diff。真实项目里 300 行还不至于卡，
        但 3000 行 + 每行带上复杂组件时差异很明显。更彻底的方案是虚拟滚动（只渲染可视区）。
      </p>
    </BaseCard>

    <BaseCard title="⑤ 指令选择总结表">
      <table>
        <thead>
          <tr>
            <th>指令</th>
            <th>机制</th>
            <th>适用场景</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in summary" :key="row[0]">
            <td><code>{{ row[0] }}</code></td>
            <td>{{ row[1] }}</td>
            <td>{{ row[2] }}</td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <BaseCard title="⑥ 一次完整的更新流程（背下来）" tone="ok">
      <pre class="code">
① 触发：组件里的响应式数据被修改
② 调度：Vue 把「需要重新渲染的组件」推入微任务队列（同一轮里多次修改只渲染一次）
③ 渲染：执行组件的 render，生成新的虚拟 DOM 树
④ 打补丁 patch(oldVNode, newVNode)：
     - 类型/key 不同 → 直接替换（卸载旧的，挂载新的）
     - 同类型同 key → 复用 DOM，只更新变化的 props / text
     - 子节点列表 → 双端比较 + key 映射，尽量少移动节点
⑤ 收尾：更新 ref、触发 onUpdated / watch(flush:'post') 等回调</pre
      >
      <p class="hint" style="margin-top: 8px">
        所以：<code>key</code> 用稳定 id，等于告诉 patch「这个节点还是它」→ 复用 DOM 与组件状态；
        用 index 等于每次都在换身份 → 不该复用的被复用，该复用的被重建。
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
.memolist {
  max-height: 240px;
  overflow: auto;
  border: 1px solid var(--c-border);
  border-radius: 8px;
}
.memorow {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 4px 10px;
  border-bottom: 1px solid var(--c-border);
  font-size: 12.5px;
}
.memorow.sel {
  background: rgba(66, 184, 131, 0.16);
}
</style>
