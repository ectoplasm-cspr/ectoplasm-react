import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy for Casper mainnet RPC to bypass CORS
      '/_casper/mainnet': {
        target: 'https://node.mainnet.casper.network/rpc',
        changeOrigin: true,
        rewrite: () => '',
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Content-Type', 'application/json');
          });
        },
      },
      // Proxy for Casper testnet RPC
      '/_casper/testnet': {
        target: 'https://node.testnet.casper.network/rpc',
        changeOrigin: true,
        rewrite: () => '',
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Content-Type', 'application/json');
          });
        },
      },
      // Proxy for CSPR.cloud API (testnet)
      '/_csprcloud/testnet': {
        target: 'https://api.testnet.cspr.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_csprcloud\/testnet/, ''),
        secure: true,
      },
      // Proxy for CSPR.cloud API (mainnet)
      '/_csprcloud/mainnet': {
        target: 'https://api.cspr.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_csprcloud\/mainnet/, ''),
        secure: true,
      },
    },
  },
})
