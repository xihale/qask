import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://chat.qwen.ai', // 注意：这里是根域名
        changeOrigin: true, // 支持跨域
        secure: false, // 如果有证书问题可设为 false（开发时常见）
        // secure: true, // 推荐生产调试时保留 true，验证 HTTPS 证书
      },
    },
  },
})
