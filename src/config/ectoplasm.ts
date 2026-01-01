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
  lpToken: string;
  pairs: Record<string, string>;
}

export type NetworkName = 'testnet' | 'mainnet';
export type TokenSymbol = 'CSPR' | 'ECTO' | 'USDC' | 'WETH' | 'WBTC';
export type ContractVersion = 'odra' | 'native';

// Odra Contracts - Built with Odra framework
const ODRA_CONTRACTS: ContractsConfig = {
  factory: 'hash-2d752507bdb93699bfdcccc3018e6feaa4d25b051944c38691d584fa796d9dd4',
  router: 'hash-9c10e021bf564421da1ce9b820568a278a5736b33ca4af37361cb9595ab4ec61',
  lpToken: 'hash-16eacd913f576394fbf114f652504e960367be71b560795fb9d7cf4d5c98ea68',
  pairs: {
    'ECTO/USDC': 'hash-58e93450c5188c6d9caf9ce3e9938cd04d011203290ea688db858621ed148aa3',
    'WETH/USDC': 'hash-433c92970b5f9073222f9e50739af8092b1e96345e6eb2a33e511308495f3f7c',
    'WBTC/USDC': 'hash-6be8a5c893aed8cfa0fbe3c36fa4d3be03e4d9d6d2cfe02e55e965f3c4e355c0',
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
  ECTO: {
    hash: 'hash-cc4f2511d53acaa22f1a84054637e09f930c54a1e166eb1fd60b34f6f81d437b',
    packageHash: '1b0605985056c63e11765ec4b5d9d8fffaab9728f79593af559a75cb505e2e22',
    symbol: 'ECTO',
    decimals: 18,
    name: 'Ectoplasm Token',
    icon: null
  },
  USDC: {
    hash: 'hash-9e8eba6dad67c156e8743b3717fb790ca89fbeb61a5f5faa34e98586fe7f9832',
    packageHash: '8d280a37beafdbca44b162e6c2588f8415b379731e56522fca570e4b7ff98168',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    icon: null
  },
  WETH: {
    hash: 'hash-e40d469291f1e7a00040b8dd3c0781094c6357a88ae1ef49a9e3ac07a06cb305',
    packageHash: '01db8d5ecf32d600c0f601b76a094ed5bb982226d5e0430386077bb7bf4a6a07',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
    icon: null
  },
  WBTC: {
    hash: 'hash-46c0d1e377b6d59b3ef0f8550d10a757720563456ddfe6e71590e0b1bf76e356',
    packageHash: 'e0d728136c25fd7345a1e75a5a9d483498025cee516a948a38e95a39a3ba891c',
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped Bitcoin',
    icon: null
  }
};

// Native Contracts - Casper 2.0 native with init pattern (no framework)
const NATIVE_CONTRACTS: ContractsConfig = {
  factory: 'hash-8a4f4ffeab7a7c831359ee593b2edb5ee34333b7223b63f5ec906e42bc325ced',
  router: 'hash-9c10e021bf564421da1ce9b820568a278a5736b33ca4af37361cb9595ab4ec61', // TODO: Deploy V2 router
  lpToken: 'hash-16eacd913f576394fbf114f652504e960367be71b560795fb9d7cf4d5c98ea68',
  pairs: {
    'ECTO/USDC': 'hash-2c2287ee64b4b372227fcd9b448d664e270d949e9b37830dd28a0b8e8e5401b9',
    'WETH/USDC': 'hash-6759b832fe25e36288f9e63591242b54fc3a8b141a09b232a5a48ee2698d0e20',
    'WBTC/USDC': 'hash-0fb2b764080ef5d8912c94c7cc305625e83999f77e8f7088741dc62e8b65ecc7',
  },
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
  ECTO: {
    hash: 'hash-01b5a8092c45fb6276c5c3cf6b4c22730856cf0fc0051b078cf86010147d7a6f',
    packageHash: '67aef0547deacc3fdc310edf2c34be7e2cf122b9505e3cd9595164e22e495dfc',
    symbol: 'ECTO',
    decimals: 18,
    name: 'Ectoplasm Token',
    icon: null
  },
  USDC: {
    hash: 'hash-da800ac07a00e316bc84e3c1b614cfd9ff2db87b90904e30fa3a1bc5a632c2f0',
    packageHash: 'bfdf7e012e8cd03a66f15c9ecc11cec4895a4379ba24d81933ea3f018719de14',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    icon: null
  },
  WETH: {
    hash: 'hash-38fa5e20e2f80fb777e6036e2582adb98b387d785828a672ff2cea4aeb9fa990',
    packageHash: 'f27360e46517105bf849a0d3f96f22ac2eeb5b764f4de85fa96e2e3270eb9e5b',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
    icon: null
  },
  WBTC: {
    hash: 'hash-e7ff916e02b42268d755b8aaffa9e8ae09e00c8d99c0db628d02c925020bd8fb',
    packageHash: 'bc995293b6a7a43574d5c124e8822442ef0c755595b824cec92aef6ef9463f6c',
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped Bitcoin',
    icon: null
  }
};

// Configuration object
export const EctoplasmConfig = {
  // Network Configuration
  // Uses Vite proxy in dev (/_casper and /_csprcloud prefixes to avoid CORS)
  networks: {
    testnet: {
      name: 'Casper Testnet',
      rpcUrl: '/_casper/testnet',
      apiUrl: '/_csprcloud/testnet',
      chainName: 'casper-test',
    },
    mainnet: {
      name: 'Casper Mainnet',
      rpcUrl: '/_casper/mainnet',
      apiUrl: '/_csprcloud/mainnet',
      chainName: 'casper',
    }
  } as Record<NetworkName, NetworkConfig>,

  // Current Network (toggle for deployment)
  currentNetwork: 'testnet' as NetworkName,

  // Contract Version - 'odra' (Odra framework) or 'native' (Casper 2.0 native)
  // Stored in localStorage for persistence
  _contractVersion: (typeof localStorage !== 'undefined'
    ? localStorage.getItem('ectoplasm_contract_version') as ContractVersion
    : null) || 'native' as ContractVersion,

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
    return this.tokens[key] || null;
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
    const tokenAConfig = this.getTokenByHash(tokenA);
    const tokenBConfig = this.getTokenByHash(tokenB);
    if (!tokenAConfig || !tokenBConfig) return null;

    const key1 = `${tokenAConfig.symbol}/${tokenBConfig.symbol}`;
    const key2 = `${tokenBConfig.symbol}/${tokenAConfig.symbol}`;
    return this.contracts.pairs[key1] || this.contracts.pairs[key2] || null;
  }
};

export default EctoplasmConfig;
