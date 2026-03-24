import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001/api';
  // Extract base URL from API URL (remove /api suffix)
  const proxyTarget = apiUrl.replace(/\/api\/?$/, '') || 'http://localhost:3001';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api/': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
