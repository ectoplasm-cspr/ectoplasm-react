import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const normalizeNodeRpc = (nodeAddress?: string): string | null => {
  if (!nodeAddress) return null;
  const base = nodeAddress.replace(/\/+$/, '');
  return base.endsWith('/rpc') ? base : `${base}/rpc`;
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const customNodeRpc = normalizeNodeRpc(env.NODE_ADDRESS || env.VITE_NODE_ADDRESS);

  return {
    plugins: [react()],
    // Allow using deploy outputs directly as `.env` (unprefixed), while still supporting `VITE_`.
    // Keep this list tight to avoid exposing secrets.
    envPrefix: [
      'VITE_',
      'NODE_',
      'CHAIN_',
      'DEPLOYER_',
      'PAIR_',
      'FACTORY_',
      'ROUTER_',
      'WCSPR_',
      'ECTO_',
      'USDC_',
      'WETH_',
      'WBTC_',
      'CSPR_',
    ],
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
        // If NODE_ADDRESS is provided in `.env`, proxy to that node instead.
        '/_casper/testnet': {
          target: customNodeRpc ?? 'https://node.testnet.casper.network/rpc',
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
  };
});
