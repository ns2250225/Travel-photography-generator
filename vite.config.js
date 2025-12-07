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
      '/amap-search': {
        target: 'https://restapi.amap.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/amap-search/, '/v3/assistant/inputtips')
      },
      '/photon': {
        target: 'https://photon.komoot.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/photon/, '/api')
      }
    }
  }
})
