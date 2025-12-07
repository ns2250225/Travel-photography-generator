import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api/upload': {
        target: 'https://img.scdn.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/upload/, '/api/v1.php')
      },
      '/api/generate': {
        target: 'https://grsai.dakka.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/generate/, '/v1/draw/nano-banana')
      },
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nominatim/, '/search')
      }
    }
  }
})
