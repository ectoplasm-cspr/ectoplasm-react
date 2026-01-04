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
  packageHash: string | null; // Contract package hash for CSPR.cloud API
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
  // LST (Liquid Staking Token) contracts
  scsprToken?: string;
  stakingManager?: string;
}

export type NetworkName = "testnet" | "mainnet";
export type TokenSymbol = "CSPR" | "ECTO" | "USDC" | "WETH" | "WBTC" | "sCSPR";
export type ContractVersion = "odra" | "native";

// Odra Contracts - Built with Odra framework (DEPLOYED)
const ODRA_CONTRACTS: ContractsConfig = {
  factory:
    "hash-464e54c4e050fb995ac7bb3a9a4eef08f0b9010daf490ceb062ab5f7a8149263",
  router:
    "hash-1e5163f46dbc5aed9abe53bbf346aaa8d7239510dd32e6a06cfc9b16cce1de99",
  lpToken:
    "hash-eec2ae2bf596ae3ab4205669447fbb18adf848e2e5c1dfcefa39169d8399a4e7",
  pairs: {
    // Pairs will be created dynamically via factory
  },
  // LST Contracts
  scsprToken:
    "hash-01bb503f421ba93ad85e1b3f4f2f6218864a7623d4d7004f1fb7a0ca7923787d",
  stakingManager:
    "hash-626f1cb3e344e7ed53ce7b0f4e4b9c6d30aaff724be88a9380d8e3f73614e3b2",
};

const ODRA_TOKENS: Record<TokenSymbol, TokenConfig> = {
  CSPR: {
    hash: null,
    packageHash: null,
    symbol: "CSPR",
    decimals: 9,
    name: "Casper",
    icon: null,
  },
  ECTO: {
    hash: "hash-1a4edcb64811ae6ce8468fc23f562aa210e26f2b53f7e2968a3bfdaf0702d5c8",
    packageHash:
      "hash-2e52f8fe9ca9d7035ce8c2f84ab0780231226be612766448b878352ca4cd8903",
    symbol: "ECTO",
    decimals: 18,
    name: "Ectoplasm Token",
    icon: null,
  },
  USDC: {
    hash: "hash-325032bbeb00e82595b009b722c1c0bd471f2827b5404a3f6fbf196d1d77a888",
    packageHash:
      "hash-012891771aba35317f480cf52082411c18c5012e0436a96cb5ae1189207a15ab",
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
    icon: null,
  },
  WETH: {
    hash: "hash-cf0db4233c95cfbd4639810578d450ffec09add32c8995f78515106f6a282120",
    packageHash:
      "hash-39296df7ae4dc7a0d6f22ffceab89b5b93c97ea8cc92fe3967f49dce5c46199f",
    symbol: "WETH",
    decimals: 18,
    name: "Wrapped Ether",
    icon: null,
  },
  WBTC: {
    hash: "hash-2dca075e7804872e367e40a64ff0d7c73bcd0a7ca30a98b9a18cb245911b1a6f",
    packageHash:
      "hash-9ba451f07dd396d95fb28974b440b527f4ed20acbbeebd83c5710d5e2dff8717",
    symbol: "WBTC",
    decimals: 8,
    name: "Wrapped Bitcoin",
    icon: null,
  },
  sCSPR: {
    hash: "hash-01bb503f421ba93ad85e1b3f4f2f6218864a7623d4d7004f1fb7a0ca7923787d",
    packageHash:
      "hash-9dc4dc802730354161070e541b9860d427f9eae9330fe993728e717420d7f01f",
    symbol: "sCSPR",
    decimals: 18,
    name: "Staked CSPR",
    icon: null,
  },
};

// Native Contracts - Casper 2.0 native with init pattern (no framework)
const NATIVE_CONTRACTS: ContractsConfig = {
  factory:
    "hash-464e54c4e050fb995ac7bb3a9a4eef08f0b9010daf490ceb062ab5f7a8149263",
  router:
    "hash-1e5163f46dbc5aed9abe53bbf346aaa8d7239510dd32e6a06cfc9b16cce1de99",
  lpToken:
    "hash-eec2ae2bf596ae3ab4205669447fbb18adf848e2e5c1dfcefa39169d8399a4e7",
  pairs: {
    // Pairs will be created dynamically via factory
  },
  // LST Contracts (same as Odra for now)
  scsprToken:
    "hash-01bb503f421ba93ad85e1b3f4f2f6218864a7623d4d7004f1fb7a0ca7923787d",
  stakingManager:
    "hash-626f1cb3e344e7ed53ce7b0f4e4b9c6d30aaff724be88a9380d8e3f73614e3b2",
};

const NATIVE_TOKENS: Record<TokenSymbol, TokenConfig> = {
  CSPR: {
    hash: null,
    packageHash: null,
    symbol: "CSPR",
    decimals: 9,
    name: "Casper",
    icon: null,
  },
  ECTO: {
    hash: "hash-1a4edcb64811ae6ce8468fc23f562aa210e26f2b53f7e2968a3bfdaf0702d5c8",
    packageHash:
      "hash-2e52f8fe9ca9d7035ce8c2f84ab0780231226be612766448b878352ca4cd8903",
    symbol: "ECTO",
    decimals: 18,
    name: "Ectoplasm Token",
    icon: null,
  },
  USDC: {
    hash: "hash-325032bbeb00e82595b009b722c1c0bd471f2827b5404a3f6fbf196d1d77a888",
    packageHash:
      "hash-012891771aba35317f480cf52082411c18c5012e0436a96cb5ae1189207a15ab",
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
    icon: null,
  },
  WETH: {
    hash: "hash-cf0db4233c95cfbd4639810578d450ffec09add32c8995f78515106f6a282120",
    packageHash:
      "hash-39296df7ae4dc7a0d6f22ffceab89b5b93c97ea8cc92fe3967f49dce5c46199f",
    symbol: "WETH",
    decimals: 18,
    name: "Wrapped Ether",
    icon: null,
  },
  WBTC: {
    hash: "hash-2dca075e7804872e367e40a64ff0d7c73bcd0a7ca30a98b9a18cb245911b1a6f",
    packageHash:
      "hash-9ba451f07dd396d95fb28974b440b527f4ed20acbbeebd83c5710d5e2dff8717",
    symbol: "WBTC",
    decimals: 8,
    name: "Wrapped Bitcoin",
    icon: null,
  },
  sCSPR: {
    hash: "hash-01bb503f421ba93ad85e1b3f4f2f6218864a7623d4d7004f1fb7a0ca7923787d",
    packageHash:
      "hash-9dc4dc802730354161070e541b9860d427f9eae9330fe993728e717420d7f01f",
    symbol: "sCSPR",
    decimals: 18,
    name: "Staked CSPR",
    icon: null,
  },
};

// Configuration object
export const EctoplasmConfig = {
  // Network Configuration
  // In development: Uses Vite proxy (/_casper and /_csprcloud prefixes to avoid CORS)
  // In production: Uses Vercel API routes (/api/casper and /api/csprcloud)
  networks: {
    testnet: {
      name: "Casper Testnet",
      rpcUrl: import.meta.env.DEV ? "/_casper/testnet" : "/api/casper/testnet",
      apiUrl: import.meta.env.DEV
        ? "/_csprcloud/testnet"
        : "/api/csprcloud/testnet",
      chainName: "casper-test",
    },
    mainnet: {
      name: "Casper Mainnet",
      rpcUrl: import.meta.env.DEV ? "/_casper/mainnet" : "/api/casper/mainnet",
      apiUrl: import.meta.env.DEV
        ? "/_csprcloud/mainnet"
        : "/api/csprcloud/mainnet",
      chainName: "casper",
    },
  } as Record<NetworkName, NetworkConfig>,

  // Current Network (toggle for deployment)
  currentNetwork: "testnet" as NetworkName,

  // Contract Version - 'odra' (Odra framework) or 'native' (Casper 2.0 native)
  // Stored in localStorage for persistence
  _contractVersion:
    (typeof localStorage !== "undefined"
      ? (localStorage.getItem("ectoplasm_contract_version") as ContractVersion)
      : null) || ("native" as ContractVersion),

  get contractVersion(): ContractVersion {
    return this._contractVersion;
  },

  set contractVersion(version: ContractVersion) {
    this._contractVersion = version;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("ectoplasm_contract_version", version);
    }
  },

  // Get contracts for current version
  get contracts(): ContractsConfig {
    return this._contractVersion === "native"
      ? NATIVE_CONTRACTS
      : ODRA_CONTRACTS;
  },

  // Get tokens for current version
  get tokens(): Record<TokenSymbol, TokenConfig> {
    return this._contractVersion === "native" ? NATIVE_TOKENS : ODRA_TOKENS;
  },

  // Version info for UI display
  getVersionInfo(): {
    version: ContractVersion;
    label: string;
    description: string;
  } {
    return this._contractVersion === "native"
      ? {
          version: "native",
          label: "Native",
          description: "Casper 2.0 native contracts",
        }
      : {
          version: "odra",
          label: "Odra",
          description: "Odra framework contracts",
        };
  },

  // Toggle between versions
  toggleVersion(): ContractVersion {
    this.contractVersion =
      this._contractVersion === "native" ? "odra" : "native";
    return this._contractVersion;
  },

  // CSPR.cloud API Configuration
  csprCloud: {
    apiKey: import.meta.env.VITE_CSPR_CLOUD_API_KEY || "",
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
    approve: "3000000000",
    swap: "15000000000",
    addLiquidity: "20000000000",
    removeLiquidity: "15000000000",
  } as GasLimits,

  // Helper to get current network config
  getNetwork(): NetworkConfig {
    return this.networks[this.currentNetwork];
  },

  // Helper to find token by symbol
  getToken(symbol: string): TokenConfig | null {
    const key = symbol?.toUpperCase() as TokenSymbol;
    const token = this.tokens[key] || null;
    console.log(
      "[EctoplasmConfig.getToken] symbol:",
      symbol,
      "hash:",
      token?.hash
    );
    return token;
  },

  // Helper to find token by hash
  getTokenByHash(hash: string): TokenConfig | null {
    return Object.values(this.tokens).find((t) => t.hash === hash) || null;
  },

  // Helper to find token by package hash (for CSPR.cloud API)
  getTokenByPackageHash(packageHash: string): TokenConfig | null {
    return (
      Object.values(this.tokens).find((t) => t.packageHash === packageHash) ||
      null
    );
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
    console.log(
      "[EctoplasmConfig.getConfiguredPairAddress] tokenA:",
      tokenA,
      "tokenB:",
      tokenB
    );
    const tokenAConfig = this.getTokenByHash(tokenA);
    const tokenBConfig = this.getTokenByHash(tokenB);
    console.log(
      "[EctoplasmConfig.getConfiguredPairAddress] tokenAConfig:",
      tokenAConfig?.symbol,
      "tokenBConfig:",
      tokenBConfig?.symbol
    );

    if (!tokenAConfig || !tokenBConfig) {
      console.log(
        "[EctoplasmConfig.getConfiguredPairAddress] Token config not found, returning null"
      );
      return null;
    }

    const key1 = `${tokenAConfig.symbol}/${tokenBConfig.symbol}`;
    const key2 = `${tokenBConfig.symbol}/${tokenAConfig.symbol}`;
    const pairAddress =
      this.contracts.pairs[key1] || this.contracts.pairs[key2] || null;
    console.log(
      "[EctoplasmConfig.getConfiguredPairAddress] key1:",
      key1,
      "key2:",
      key2,
      "pairAddress:",
      pairAddress
    );
    return pairAddress;
  },
};

export default EctoplasmConfig;
