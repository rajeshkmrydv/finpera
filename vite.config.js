import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createMarketHandler } from './server/marketData.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), {
      name: 'finpera-market-data',
      configureServer(server) {
        server.middlewares.use(createMarketHandler({ token: env.UPSTOX_ACCESS_TOKEN }));
      },
      configurePreviewServer(server) {
        server.middlewares.use(createMarketHandler({ token: env.UPSTOX_ACCESS_TOKEN }));
      },
    }],
  };
});
