import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/yahoo-search': {
          target: 'https://query2.finance.yahoo.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/yahoo-search/, ''),
          headers: { 'User-Agent': 'Mozilla/5.0' },
        },
        '/api/yahoo-quote': {
          target: 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/yahoo-quote/, ''),
          headers: { 'User-Agent': 'Mozilla/5.0' },
        },
        '/api/goldpricez': {
          target: 'https://goldpricez.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/goldpricez/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('X-API-KEY', env.VITE_GOLDPRICEZ_API_KEY || '');
            });
          },
        },
      },
    },
  }
})
