import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy for Casper mainnet RPC to bypass CORS
      '/api/casper-mainnet': {
        target: 'https://node.mainnet.casper.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/casper-mainnet/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remove headers that might cause issues
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      // Proxy for Casper testnet RPC
      '/api/casper-testnet': {
        target: 'https://node.testnet.casper.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/casper-testnet/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
})
