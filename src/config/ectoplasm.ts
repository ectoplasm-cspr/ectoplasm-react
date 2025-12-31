/**
 * Ectoplasm DEX Configuration
 * Contract addresses and network settings for Casper Network integration
 */

// Type definitions
export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  apiUrl: string;
  chainName: string;
}

export interface TokenConfig {
  hash: string | null;
  symbol: string;
  decimals: number;
  name: string;
  icon: string | null;
}

export interface SwapConfig {
  defaultSlippage: number;
  maxSlippage: number;
  deadlineMinutes: number;
  feePercent: number;
}

export interface GasLimits {
  approve: string;
  swap: string;
  addLiquidity: string;
  removeLiquidity: string;
}

export interface ContractsConfig {
  factory: string;
  router: string;
  lpToken: string;
  pairs: Record<string, string>;
}

export type NetworkName = 'testnet' | 'mainnet';
export type TokenSymbol = 'CSPR' | 'ECTO' | 'USDC' | 'WETH' | 'WBTC';

// Detect environment for RPC URL selection
const isDev = import.meta.env?.DEV ?? false;

// Configuration object
export const EctoplasmConfig = {
  // Network Configuration
  // Development: Uses Vite proxy to bypass CORS
  // Production: Uses Vercel serverless function at /api/casper-rpc
  networks: {
    testnet: {
      name: 'Casper Testnet',
      rpcUrl: isDev ? '/api/casper-testnet/rpc' : '/api/casper-rpc?network=testnet',
      apiUrl: 'https://api.testnet.cspr.cloud',
      chainName: 'casper-test',
    },
    mainnet: {
      name: 'Casper Mainnet',
      rpcUrl: isDev ? '/api/casper-mainnet/rpc' : '/api/casper-rpc?network=mainnet',
      apiUrl: 'https://api.cspr.cloud',
      chainName: 'casper',
    }
  } as Record<NetworkName, NetworkConfig>,

  // Current Network (toggle for deployment)
  currentNetwork: 'testnet' as NetworkName,

  // Contract Package Hashes (deployed on testnet)
  // Note: Use contract hash (not package hash) for calling entry points
  contracts: {
    factory: 'hash-2d752507bdb93699bfdcccc3018e6feaa4d25b051944c38691d584fa796d9dd4',
    router: 'hash-9c10e021bf564421da1ce9b820568a278a5736b33ca4af37361cb9595ab4ec61',
    lpToken: 'hash-16eacd913f576394fbf114f652504e960367be71b560795fb9d7cf4d5c98ea68',
    pairs: {
      // Contract hashes for direct pair access
      // Note: Use hash- prefix (CasperService normalizes to this format)
      'ECTO/USDC': 'hash-58e93450c5188c6d9caf9ce3e9938cd04d011203290ea688db858621ed148aa3',
      'WETH/USDC': 'hash-433c92970b5f9073222f9e50739af8092b1e96345e6eb2a33e511308495f3f7c',
      'WBTC/USDC': 'hash-6be8a5c893aed8cfa0fbe3c36fa4d3be03e4d9d6d2cfe02e55e965f3c4e355c0',
    },
  } as ContractsConfig,

  // Token Configuration
  tokens: {
    CSPR: {
      hash: null,
      symbol: 'CSPR',
      decimals: 9,
      name: 'Casper',
      icon: null
    },
    ECTO: {
      hash: 'hash-1b0605985056c63e11765ec4b5d9d8fffaab9728f79593af559a75cb505e2e22',
      symbol: 'ECTO',
      decimals: 18,
      name: 'Ectoplasm Token',
      icon: null
    },
    USDC: {
      hash: 'hash-8d280a37beafdbca44b162e6c2588f8415b379731e56522fca570e4b7ff98168',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      icon: null
    },
    WETH: {
      hash: 'hash-01db8d5ecf32d600c0f601b76a094ed5bb982226d5e0430386077bb7bf4a6a07',
      symbol: 'WETH',
      decimals: 18,
      name: 'Wrapped Ether',
      icon: null
    },
    WBTC: {
      hash: 'hash-e0d728136c25fd7345a1e75a5a9d483498025cee516a948a38e95a39a3ba891c',
      symbol: 'WBTC',
      decimals: 8,
      name: 'Wrapped Bitcoin',
      icon: null
    }
  } as Record<TokenSymbol, TokenConfig>,

  // Swap Settings
  swap: {
    defaultSlippage: 0.5,
    maxSlippage: 50.0,
    deadlineMinutes: 20,
    feePercent: 0.3,
  } as SwapConfig,

  // Gas Limits (in motes - 1 CSPR = 1,000,000,000 motes)
  gasLimits: {
    approve: '3000000000',
    swap: '15000000000',
    addLiquidity: '20000000000',
    removeLiquidity: '15000000000',
  } as GasLimits,

  // Helper to get current network config
  getNetwork(): NetworkConfig {
    return this.networks[this.currentNetwork];
  },

  // Helper to find token by symbol
  getToken(symbol: string): TokenConfig | null {
    const key = symbol?.toUpperCase() as TokenSymbol;
    return this.tokens[key] || null;
  },

  // Helper to find token by hash
  getTokenByHash(hash: string): TokenConfig | null {
    return Object.values(this.tokens).find(t => t.hash === hash) || null;
  },

  // Check if token contracts are deployed
  areTokensDeployed(): boolean {
    return this.tokens.ECTO.hash !== null;
  },

  // Get all token symbols
  getTokenSymbols(): TokenSymbol[] {
    return Object.keys(this.tokens) as TokenSymbol[];
  },

  // Get configured pair address
  getConfiguredPairAddress(tokenA: string, tokenB: string): string | null {
    const tokenAConfig = this.getTokenByHash(tokenA);
    const tokenBConfig = this.getTokenByHash(tokenB);
    if (!tokenAConfig || !tokenBConfig) return null;

    const key1 = `${tokenAConfig.symbol}/${tokenBConfig.symbol}`;
    const key2 = `${tokenBConfig.symbol}/${tokenAConfig.symbol}`;
    return this.contracts.pairs[key1] || this.contracts.pairs[key2] || null;
  }
};

export default EctoplasmConfig;
