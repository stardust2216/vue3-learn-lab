import type { InjectionKey, Ref } from 'vue'

/**
 * 依赖注入的 key 定义在这里（单独文件），避免「提供方」和「注入方」各写一份字符串。
 * 用 Symbol 做 key 的好处：
 *  1. 不会和别的库/组件撞名；
 *  2. 通过 InjectionKey<T> 能拿到注入值的类型提示。
 */
export interface ThemeContext {
  theme: Ref<'light' | 'dark'>
  toggle: () => void
  primary: Ref<string>
  setPrimary: (c: string) => void
}

export const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme-context')

/** 第二个例子：计数器上下文（演示「方法 + 只读状态」的注入） */
export interface CounterContext {
  /** Readonly<Ref>：后代能读、能响应，但不能直接赋值（改了只会在控制台警告） */
  count: Readonly<Ref<number>>
  increment: (step?: number) => void
  reset: () => void
}

export const CounterKey: InjectionKey<CounterContext> = Symbol('counter-context')
