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

// Configuration object
export const EctoplasmConfig = {
  // Network Configuration
  networks: {
    testnet: {
      name: 'Casper Testnet',
      rpcUrl: 'https://node.testnet.casper.network/rpc',
      apiUrl: 'https://api.testnet.cspr.cloud',
      chainName: 'casper-test',
    },
    mainnet: {
      name: 'Casper Mainnet',
      rpcUrl: 'https://node.mainnet.casper.network/rpc',
      apiUrl: 'https://api.cspr.cloud',
      chainName: 'casper',
    }
  } as Record<NetworkName, NetworkConfig>,

  // Current Network (toggle for deployment)
  currentNetwork: 'mainnet' as NetworkName,

  // Contract Package Hashes (deployed on testnet)
  contracts: {
    factory: 'hash-b42ef2718fd368fb40564b2c655550de5f5157b9d3788463ce4a7492db100816',
    router: 'hash-344a719930ebca4c37525d5801400b24b7f007a56f3426e9a5777cd6f56faca1',
    lpToken: 'hash-16eacd913f576394fbf114f652504e960367be71b560795fb9d7cf4d5c98ea68',
    pairs: {
      'ECTO/USDC': 'hash-7a9d232fb79ae73ad24f2f40f76ec97757df9f40c60913477b67e912a5ac7ddf',
      'WETH/USDC': 'hash-3a580a704165ce3fc5c4216819f372a19b765b736ecd89b009fa04725ebba0bf',
      'WBTC/USDC': 'hash-35db4ae07d69915fc04ef5441642911da75f48b05c0b55f31b59a9ae0504c8bf',
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
      hash: 'hash-fb7c662bca66d1a32018ac6529b4ee588cf13178370ae5b59f979ae6e5e96029',
      symbol: 'ECTO',
      decimals: 18,
      name: 'Ectoplasm Token',
      icon: null
    },
    USDC: {
      hash: 'hash-85c1770e3dd4e951d37b8ea9b0047fed7fb68578eb4006477d31f019b6d4d1ca',
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
