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
}

export type NetworkName = "testnet" | "mainnet";
export type TokenSymbol = "CSPR" | "ECTO" | "USDC" | "WETH" | "WBTC";
export type ContractVersion = "odra" | "native";

// Odra Contracts - Built with Odra framework
const ODRA_CONTRACTS: ContractsConfig = {
  factory:
    "hash-971838101cc6b71719acba34a2a15dc7c18318131c3fcff5a05a18b4c9428f30",
  router:
    "hash-2fc68c2467facd37ecf8e0d03ba57c78250c88a6488008622fe82f78d58fe0e0",
  lpToken:
    "hash-b6a1031ce1c96eeecfea95a6c28d7135ba33139e02e5ab4a0387b328b0eeddb4",
  pairs: {
    "ECTO/USDC":
      "hash-58e93450c5188c6d9caf9ce3e9938cd04d011203290ea688db858621ed148aa3",
    "WETH/USDC":
      "hash-433c92970b5f9073222f9e50739af8092b1e96345e6eb2a33e511308495f3f7c",
    "WBTC/USDC":
      "hash-6be8a5c893aed8cfa0fbe3c36fa4d3be03e4d9d6d2cfe02e55e965f3c4e355c0",
  },
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
    hash: "contract-8aca78f9ea7594240acdcceae2bc1b6aec33bb8960b5ec7fc61928ea8e442718",
    packageHash:
      "hash-de7f410ea69479b7361cc996995faee468aff042980c35ff7f3e206405dede23",
    symbol: "ECTO",
    decimals: 18,
    name: "Ectoplasm Token",
    icon: null,
  },
  USDC: {
    hash: "contract-8f84571151c246af32d3d7c3a731692fd6a45e11350e15ff75e64384149b7c25",
    packageHash:
      "hash-6747a09ec86143394b41a1d95374aa0ed4fdfbca43573911dfef16062ee332b2",
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
    icon: null,
  },
  WETH: {
    hash: "contract-01496d996cc47097077cd8af4cb0bbbdd4c804ef49928631385ff61c76a36c9d",
    packageHash:
      "hash-428959f3e2cb2b98e730a6ee7d9b7c66c89fb0429e776c27d101cdbe3fe7089d",
    symbol: "WETH",
    decimals: 18,
    name: "Wrapped Ether",
    icon: null,
  },
  WBTC: {
    hash: "contract-70204794d5e396dc743c79af817f0a213c8c7b5f40b6af593ee2ac1463c1daac",
    packageHash:
      "hash-3d774cde807e5616a99b1bac6b7d88590ca794d47c0a49d189d77f7e9e77ef91",
    symbol: "WBTC",
    decimals: 8,
    name: "Wrapped Bitcoin",
    icon: null,
  },
};

// Native Contracts - Casper 2.0 native with init pattern (no framework)
const NATIVE_CONTRACTS: ContractsConfig = {
  factory:
    "hash-971838101cc6b71719acba34a2a15dc7c18318131c3fcff5a05a18b4c9428f30",
  router:
    "hash-2fc68c2467facd37ecf8e0d03ba57c78250c88a6488008622fe82f78d58fe0e0", // TODO: Deploy V2 router
  lpToken:
    "hash-b6a1031ce1c96eeecfea95a6c28d7135ba33139e02e5ab4a0387b328b0eeddb4",
  pairs: {
    "ECTO/USDC":
      "hash-c8aa723b7c6b701b68065403ec50256188ab37f4d9d1adc1dfed9dcc76a26e3f",
    "WETH/USDC":
      "hash-6ac0cc80497b785a21edcb2e9a7a02301189d2df3b307d80d2946e030a44b73e",
    "WBTC/USDC":
      "hash-e2fa7346714354619f1f0e8fbd41deb45dc65e88a09256e0ab85af514e63b324",
  },
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
    hash: "hash-01b5a8092c45fb6276c5c3cf6b4c22730856cf0fc0051b078cf86010147d7a6f",
    packageHash:
      "67aef0547deacc3fdc310edf2c34be7e2cf122b9505e3cd9595164e22e495dfc",
    symbol: "ECTO",
    decimals: 18,
    name: "Ectoplasm Token",
    icon: null,
  },
  USDC: {
    hash: "hash-da800ac07a00e316bc84e3c1b614cfd9ff2db87b90904e30fa3a1bc5a632c2f0",
    packageHash:
      "bfdf7e012e8cd03a66f15c9ecc11cec4895a4379ba24d81933ea3f018719de14",
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
    icon: null,
  },
  WETH: {
    hash: "hash-38fa5e20e2f80fb777e6036e2582adb98b387d785828a672ff2cea4aeb9fa990",
    packageHash:
      "f27360e46517105bf849a0d3f96f22ac2eeb5b764f4de85fa96e2e3270eb9e5b",
    symbol: "WETH",
    decimals: 18,
    name: "Wrapped Ether",
    icon: null,
  },
  WBTC: {
    hash: "hash-e7ff916e02b42268d755b8aaffa9e8ae09e00c8d99c0db628d02c925020bd8fb",
    packageHash:
      "bc995293b6a7a43574d5c124e8822442ef0c755595b824cec92aef6ef9463f6c",
    symbol: "WBTC",
    decimals: 8,
    name: "Wrapped Bitcoin",
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
