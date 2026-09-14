/**
 * 读取本页 SFC 里 <style scoped> 的真实 CSS 源码。
 *
 * 为什么要这么做：学 CSS 最怕「示例代码」和「实际生效的样式」是两套东西。
 * 这里直接从页面已注入的 <style> 标签里读取编译后的真实 CSS，
 * 再按选择器把需要的规则抠出来展示 —— 于是「展示的代码」和「页面效果」永远同源：
 * 改样式，示例代码跟着变；不会出现文档与实现不一致的情况。
 *
 * 实现说明：Vue 会把 SFC 样式编译成带 data-v-xxx 属性选择器的 CSS 并注入到 <head>，
 * 所有组件的样式标签都没有文件名标记，因此这里读取「所有带 data-v- 的样式」，
 * 再靠 rules('.demo-xxx') 的选择器关键字过滤出本页要展示的部分。
 * 建议每个 CSS 演示页用自己的命名前缀（如 .demo-flex-*），避免串台。
 */

/** 去掉 data-v-xxx 作用域属性，还原成人类可读的 CSS */
function stripScope(css: string) {
  return css.replace(/\[data-v-[0-9a-f]+\]/g, '')
}

/** 把 CSS 文本切成顶层块（选择器 + 声明体，@media 等整块保留） */
function topLevelBlocks(css: string): string[] {
  const blocks: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        let s = start
        while (s > 0 && css[s - 1] !== '}' && css[s - 1] !== ';') s--
        blocks.push(css.slice(s, i + 1).trim())
      }
    }
  }
  return blocks
}

function selectorOf(block: string) {
  const i = block.indexOf('{')
  return i < 0 ? '' : block.slice(0, i).trim()
}

export interface StyleSource {
  /** 页面上所有 SFC 样式的原文（已去掉 data-v 属性），调试用 */
  raw: () => string
  /**
   * 按选择器关键字提取规则。
   * @param selectors 关键字（子串匹配），如 ['.demo-flex', '.demo-flex-item']
   */
  rules: (...selectors: string[]) => string
}

/** 在 <script setup> 顶部调用：`const css = useStyleSource()` */
export function useStyleSource(): StyleSource {
  const collected: string[] = []
  document.querySelectorAll<HTMLStyleElement>('style').forEach((el) => {
    const text = el.textContent ?? ''
    if (text.includes('data-v-')) collected.push(stripScope(text))
  })

  const raw = () => collected.join('\n\n')
  const allBlocks = collected.flatMap(topLevelBlocks)

  const rules = (...selectors: string[]) => {
    if (!selectors.length) return raw()
    const picked = allBlocks.filter((block) => {
      const sel = selectorOf(block)
      return sel && selectors.some((key) => sel.includes(key))
    })
    // 过滤不到就退回整份源码，保证示例区不会空白
    return picked.length ? picked.join('\n\n') : raw()
  }

  return { raw, rules }
}
