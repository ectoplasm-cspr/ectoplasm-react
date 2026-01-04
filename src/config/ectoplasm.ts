/**
 * Ectoplasm DEX Configuration
 * Contract addresses and network settings for Casper Network integration
 * Supports both V1 (Odra) and V2 (Casper 2.0 native) contracts
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
  packageHash: string | null;  // Contract package hash for CSPR.cloud API
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
  routerPackage: string;
  lpToken: string;
  pairs: Record<string, string>;
}

export type NetworkName = 'testnet' | 'mainnet';
export type TokenSymbol = 'CSPR' | 'WCSPR' | 'ECTO' | 'USDC' | 'WETH' | 'WBTC';
export type ContractVersion = 'odra' | 'native';

const ENV = import.meta.env as any;
const envGet = (key: string): string | undefined => {
  const v = ENV?.[key] ?? ENV?.[`VITE_${key}`];
  return typeof v === 'string' && v.length ? v : undefined;
};

const stripHashPrefix = (s: string | undefined): string | undefined => {
  if (!s) return undefined;
  return s.startsWith('hash-') ? s.slice('hash-'.length) : s;
};

// Odra Contracts - Built with Odra framework
const ODRA_CONTRACTS: ContractsConfig = {
  factory: envGet('FACTORY_CONTRACT_HASH') || '',
  router: envGet('ROUTER_CONTRACT_HASH') || '',
  routerPackage: envGet('ROUTER_PACKAGE_HASH') || '',
  lpToken: '',
  pairs: {
    ...(envGet('WCSPR_ECTO_PAIR_HASH') ? { 'WCSPR/ECTO': envGet('WCSPR_ECTO_PAIR_HASH')! } : {}),
  },
};

const ODRA_TOKENS: Record<TokenSymbol, TokenConfig> = {
  CSPR: {
    hash: null,
    packageHash: null,
    symbol: 'CSPR',
    decimals: 9,
    name: 'Casper',
    icon: null
  },
  WCSPR: {
    hash: envGet('WCSPR_CONTRACT_HASH') || null,
    packageHash: stripHashPrefix(envGet('WCSPR_PACKAGE_HASH')) || null,
    symbol: 'WCSPR',
    decimals: 9,
    name: 'Wrapped CSPR',
    icon: null
  },
  ECTO: {
    hash: envGet('ECTO_CONTRACT_HASH') || null,
    packageHash: stripHashPrefix(envGet('ECTO_PACKAGE_HASH')) || null,
    symbol: 'ECTO',
    decimals: 18,
    name: 'Ectoplasm Token',
    icon: null
  },
  USDC: {
    hash: envGet('USDC_CONTRACT_HASH') || null,
    packageHash: stripHashPrefix(envGet('USDC_PACKAGE_HASH')) || null,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    icon: null
  },
  WETH: {
    hash: envGet('WETH_CONTRACT_HASH') || null,
    packageHash: stripHashPrefix(envGet('WETH_PACKAGE_HASH')) || null,
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
    icon: null
  },
  WBTC: {
    hash: envGet('WBTC_CONTRACT_HASH') || null,
    packageHash: stripHashPrefix(envGet('WBTC_PACKAGE_HASH')) || null,
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped Bitcoin',
    icon: null
  }
};

// Native Contracts - Casper 2.0 native with init pattern (no framework)
const NATIVE_CONTRACTS: ContractsConfig = {
  factory: '',
  router: '',
  routerPackage: '',
  lpToken: '',
  pairs: {},
};

const NATIVE_TOKENS: Record<TokenSymbol, TokenConfig> = {
  CSPR: {
    hash: null,
    packageHash: null,
    symbol: 'CSPR',
    decimals: 9,
    name: 'Casper',
    icon: null
  },
  WCSPR: {
    hash: null,
    packageHash: null,
    symbol: 'WCSPR',
    decimals: 9,
    name: 'Wrapped CSPR',
    icon: null
  },
  ECTO: {
    hash: null,
    packageHash: null,
    symbol: 'ECTO',
    decimals: 18,
    name: 'Ectoplasm Token',
    icon: null
  },
  USDC: {
    hash: null,
    packageHash: null,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    icon: null
  },
  WETH: {
    hash: null,
    packageHash: null,
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
    icon: null
  },
  WBTC: {
    hash: null,
    packageHash: null,
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped Bitcoin',
    icon: null
  }
};

// Configuration object
export const EctoplasmConfig = {
  // Network Configuration
  // In development: Uses Vite proxy (/_casper and /_csprcloud prefixes to avoid CORS)
  // In production: Uses Vercel API routes (/api/casper and /api/csprcloud)
  networks: {
    testnet: {
      name: 'Casper Testnet',
      rpcUrl: import.meta.env.DEV ? '/_casper/testnet' : '/api/casper/testnet',
      apiUrl: import.meta.env.DEV ? '/_csprcloud/testnet' : '/api/csprcloud/testnet',
      chainName: envGet('CHAIN_NAME') || 'casper-test',
    },
    mainnet: {
      name: 'Casper Mainnet',
      rpcUrl: import.meta.env.DEV ? '/_casper/mainnet' : '/api/casper/mainnet',
      apiUrl: import.meta.env.DEV ? '/_csprcloud/mainnet' : '/api/csprcloud/mainnet',
      chainName: 'casper',
    }
  } as Record<NetworkName, NetworkConfig>,

  // Current Network (toggle for deployment)
  currentNetwork: (envGet('ECTOPLASM_NETWORK') as NetworkName) || 'testnet' as NetworkName,

  // Contract Version - 'odra' (Odra framework) or 'native' (Casper 2.0 native)
  // Stored in localStorage for persistence
  _contractVersion: (typeof localStorage !== 'undefined'
    ? localStorage.getItem('ectoplasm_contract_version') as ContractVersion
    : null) || ((envGet('ROUTER_PACKAGE_HASH') || envGet('FACTORY_PACKAGE_HASH')) ? 'odra' : 'native') as ContractVersion,

  get contractVersion(): ContractVersion {
    return this._contractVersion;
  },

  set contractVersion(version: ContractVersion) {
    this._contractVersion = version;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ectoplasm_contract_version', version);
    }
  },

  // Get contracts for current version
  get contracts(): ContractsConfig {
    return this._contractVersion === 'native' ? NATIVE_CONTRACTS : ODRA_CONTRACTS;
  },

  // Get tokens for current version
  get tokens(): Record<TokenSymbol, TokenConfig> {
    return this._contractVersion === 'native' ? NATIVE_TOKENS : ODRA_TOKENS;
  },

  // Version info for UI display
  getVersionInfo(): { version: ContractVersion; label: string; description: string } {
    return this._contractVersion === 'native'
      ? { version: 'native', label: 'Native', description: 'Casper 2.0 native contracts' }
      : { version: 'odra', label: 'Odra', description: 'Odra framework contracts' };
  },

  // Toggle between versions
  toggleVersion(): ContractVersion {
    this.contractVersion = this._contractVersion === 'native' ? 'odra' : 'native';
    return this._contractVersion;
  },

  // CSPR.cloud API Configuration
  csprCloud: {
    apiKey: import.meta.env.VITE_CSPR_CLOUD_API_KEY || '',
  },

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
    const token = this.tokens[key] || null;
    console.log('[EctoplasmConfig.getToken] symbol:', symbol, 'hash:', token?.hash);
    return token;
  },

  // Helper to find token by hash
  getTokenByHash(hash: string): TokenConfig | null {
    return Object.values(this.tokens).find(t => t.hash === hash) || null;
  },

  // Helper to find token by package hash (for CSPR.cloud API)
  getTokenByPackageHash(packageHash: string): TokenConfig | null {
    return Object.values(this.tokens).find(t => t.packageHash === packageHash) || null;
  },

  // Check if CSPR.cloud API is configured
  hasCsprCloudApiKey(): boolean {
    return !!this.csprCloud.apiKey;
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
    console.log('[EctoplasmConfig.getConfiguredPairAddress] tokenA:', tokenA, 'tokenB:', tokenB);
    const tokenAConfig = this.getTokenByHash(tokenA) || this.getTokenByPackageHash(tokenA);
    const tokenBConfig = this.getTokenByHash(tokenB) || this.getTokenByPackageHash(tokenB);
    console.log('[EctoplasmConfig.getConfiguredPairAddress] tokenAConfig:', tokenAConfig?.symbol, 'tokenBConfig:', tokenBConfig?.symbol);

    if (!tokenAConfig || !tokenBConfig) {
      console.log('[EctoplasmConfig.getConfiguredPairAddress] Token config not found, returning null');
      return null;
    }

    const key1 = `${tokenAConfig.symbol}/${tokenBConfig.symbol}`;
    const key2 = `${tokenBConfig.symbol}/${tokenAConfig.symbol}`;
    const pairAddress = this.contracts.pairs[key1] || this.contracts.pairs[key2] || null;
    console.log('[EctoplasmConfig.getConfiguredPairAddress] key1:', key1, 'key2:', key2, 'pairAddress:', pairAddress);
    return pairAddress;
  }
};

export default EctoplasmConfig;
