import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// Vite 配置：https://vite.dev/config/
export default defineConfig({
  // vueJsx 让 .tsx / JSX 写法可用（第 19 页演示）；
  // 只用模板 SFC 的项目可以不加这个插件。
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      // 用 @ 指向 src，避免 ../../.. 相对路径地狱
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 想让「字符串模板 / template 选项」可用（第 19 页的运行时编译演示）时，
      // 把下面这行打开：完整版比运行时版大约 14kb(gzip)，真实项目一般不需要。
      // vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  server: {
    port: 5199,
    open: false,
    // 这个工作目录在 E 盘，原生文件监听器偶发 EBUSY（编辑器/工具写入临时文件时），
    // 会让 dev server 直接退出；改成轮询更稳（代价是极小的一点 CPU）。
    watch: { usePolling: true, interval: 300 },
  },
})
