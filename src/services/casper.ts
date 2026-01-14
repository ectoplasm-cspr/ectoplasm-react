// @ts-nocheck
/**
 * CasperService - Blockchain interaction module for Ectoplasm DEX
 * TypeScript port for React application
 *
 * NOTE: This file uses casper-js-sdk v4 APIs. It needs to be migrated to v5.
 * The @ts-nocheck directive is a temporary workaround.
 */

import * as sdk from 'casper-js-sdk';
const CasperSDK = (sdk as any).default ?? sdk;
const {
  RpcClient,
  HttpHandler,
  DeployUtil,
  RuntimeArgs,
  CLPublicKey,
  CLValueBuilder,
  CLList,
  PublicKey
} = CasperSDK;
import { EctoplasmConfig, TokenConfig } from '../config/ectoplasm';
import { hexToBytes, formatTokenAmount, parseTokenAmount } from '../utils/format';

// Types for swap quotes
export interface SwapQuote {
  valid: boolean;
  demo?: boolean;
  error?: string;
  tokenIn?: TokenConfig;
  tokenOut?: TokenConfig;
  amountIn: string;
  amountInRaw: bigint;
  amountOut: string;
  amountOutRaw: bigint;
  minReceived?: string;
  minReceivedRaw?: bigint;
  priceImpact: string;
  rate: string;
  path?: string[];
  reserves?: {
    reserveA: bigint;
    reserveB: bigint;
    exists: boolean;
  };
}

export interface BalanceResult {
  raw: bigint;
  formatted: string;
  decimals: number;
}

export interface DeployResult {
  success: boolean;
  deployHash?: string;
  error?: string;
}

class CasperServiceClass {
  private client: any = null;
  private initialized: boolean = false;
  private sdkAvailable: boolean = false;
  private initError: string | null = null;

  /**
   * Initialize the Casper client
   */
  init(): boolean {
    if (this.initialized) return this.sdkAvailable;

    const network = EctoplasmConfig.getNetwork();

    try {
      // SDK v5 uses RpcClient with HttpHandler
      const handler = new HttpHandler(network.rpcUrl);
      this.client = new RpcClient(handler);
      this.initialized = true;
      this.sdkAvailable = true;
      console.log(`CasperService initialized for ${network.name}`);
      return true;
    } catch (error: any) {
      this.initError = `Failed to initialize: ${error.message}`;
      console.error('CasperService:', this.initError);
      this.initialized = true;
      this.sdkAvailable = false;
      return false;
    }
  }

  isAvailable(): boolean {
    this.init();
    return this.sdkAvailable;
  }

  getError(): string | null {
    return this.initError;
  }

  private ensureInit(): void {
    this.init();
    if (!this.sdkAvailable || !this.client) {
      throw new Error(this.initError || 'CasperService not initialized');
    }
  }

  // ============================================
  // Token Balance Queries
  // ============================================

  async getTokenBalance(tokenHash: string, publicKeyHex: string): Promise<BalanceResult> {
    this.ensureInit();

    console.log('[getTokenBalance] Called with:', { tokenHash, publicKeyHex });

    if (!tokenHash) {
      console.log('[getTokenBalance] No tokenHash provided, returning 0');
      return { raw: BigInt(0), formatted: '0', decimals: 18 };
    }

    const tokenConfig = EctoplasmConfig.getTokenByHash(tokenHash);
    console.log('[getTokenBalance] Token config:', tokenConfig);
    const decimals = tokenConfig?.decimals || 18;

    try {
      const publicKey = CLPublicKey.fromHex(publicKeyHex);
      const accountHash = publicKey.toAccountHashStr();
      const contractHash = tokenHash.replace('hash-', '');

      console.log('[getTokenBalance] Derived values:', { accountHash, contractHash });

      // Try standard CEP-18 dictionary query with base64 key format
      // CEP-18 uses base64(Key bytes) for dictionary keys
      try {
        const balance = await this.queryCep18Balance(contractHash, accountHash);
        console.log('[getTokenBalance] Query result:', balance.toString());
        if (balance > BigInt(0)) {
          return {
            raw: balance,
            formatted: formatTokenAmount(balance.toString(), decimals),
            decimals
          };
        }
      } catch (e) {
        console.log('[getTokenBalance] CEP-18 query failed:', e);
      }

      // Note: Odra CEP-18 tokens use a different storage pattern
      // The "balances" dictionary is created dynamically and may not be accessible via standard RPC
      // For Odra tokens, CSPR.cloud API is recommended once indexing is improved

      return { raw: BigInt(0), formatted: '0', decimals };
    } catch (error: any) {
      console.error('[getTokenBalance] Error:', error);
      return { raw: BigInt(0), formatted: '0', decimals };
    }
  }

  /**
   * Query CEP-18 token balance using standard dictionary format
   * Tries V2 hex format first (Casper 2.0 native), then falls back to V1 base64 format
   */
  private async queryCep18Balance(contractHash: string, accountHash: string): Promise<bigint> {
    const network = EctoplasmConfig.getNetwork();
    const accountHashHex = accountHash.replace('account-hash-', '');

    console.log('[CEP-18] Querying balance:', {
      contractHash,
      accountHash,
      accountHashHex,
      rpcUrl: network.rpcUrl
    });

    // Get state root hash first
    const stateRootResponse = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'chain_get_state_root_hash'
      })
    });
    const stateRootData = await stateRootResponse.json();
    console.log('[CEP-18] State root response:', stateRootData);
    const stateRootHash = stateRootData?.result?.state_root_hash;

    if (!stateRootHash) {
      throw new Error('Could not get state root hash');
    }

    // Try V2 format first: hex-encoded account hash (Casper 2.0 native contracts)
    try {
      console.log('[CEP-18] Trying V2 hex format with key:', accountHashHex);
      const v2Balance = await this.queryBalanceWithKey(contractHash, accountHashHex, stateRootHash);
      console.log('[CEP-18] V2 balance result:', v2Balance.toString());
      if (v2Balance > BigInt(0)) {
        return v2Balance;
      }
    } catch (e) {
      console.log('[CEP-18] V2 hex format query failed:', e);
    }

    // Fallback to V1 format: base64 encoded Key bytes (standard CEP-18)
    const keyBytes = new Uint8Array(33);
    keyBytes[0] = 0x00; // Account variant tag
    const hashBytes = hexToBytes(accountHashHex);
    keyBytes.set(hashBytes, 1);
    const base64Key = btoa(String.fromCharCode(...keyBytes));

    console.log('[CEP-18] Trying V1 base64 format with key:', base64Key);
    return await this.queryBalanceWithKey(contractHash, base64Key, stateRootHash);
  }

  /**
   * Query balance dictionary with a specific key format
   * Tries both Casper 2.0 (entity-contract-) and legacy (hash-) prefixes
   */
  private async queryBalanceWithKey(contractHash: string, dictKey: string, stateRootHash: string): Promise<bigint> {
    const network = EctoplasmConfig.getNetwork();

    // Ensure contractHash doesn't have any prefix
    const cleanContractHash = contractHash.replace(/^(hash-|entity-contract-)/, '');

    // Try Casper 2.0 entity-contract prefix first (for native contracts)
    const prefixes = ['entity-contract-', 'hash-'];

    for (const prefix of prefixes) {
      const requestBody = {
        jsonrpc: '2.0',
        id: 2,
        method: 'state_get_dictionary_item',
        params: {
          state_root_hash: stateRootHash,
          dictionary_identifier: {
            ContractNamedKey: {
              key: `${prefix}${cleanContractHash}`,
              dictionary_name: 'balances',
              dictionary_item_key: dictKey
            }
          }
        }
      };

      console.log(`[CEP-18] Dictionary query (${prefix}) request:`, JSON.stringify(requestBody, null, 2));

      try {
        const response = await fetch(network.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log(`[CEP-18] Dictionary query (${prefix}) response:`, JSON.stringify(data, null, 2));

        if (data.error) {
          console.log(`[CEP-18] ${prefix} prefix failed:`, data.error.message);
          continue; // Try next prefix
        }

        const clValue = data.result?.stored_value?.CLValue;
        if (clValue?.parsed !== undefined && clValue?.parsed !== null) {
          const balance = BigInt(clValue.parsed.toString());
          console.log('[CEP-18] Parsed balance:', balance.toString());
          return balance;
        }
      } catch (e) {
        console.log(`[CEP-18] ${prefix} prefix error:`, e);
        continue; // Try next prefix
      }
    }

    return BigInt(0);
  }

  /**
   * Query all CEP-18 token balances using CSPR.cloud API
   * This is the most reliable way to get token balances for Odra-based contracts
   */
  async getAllTokenBalancesFromCsprCloud(accountHash: string): Promise<Record<string, bigint>> {
    const balances: Record<string, bigint> = {};
    const apiKey = EctoplasmConfig.csprCloud.apiKey;

    if (!apiKey) {
      console.debug('[CSPR.cloud] No API key configured');
      return balances;
    }

    const network = EctoplasmConfig.getNetwork();
    const accountHashClean = accountHash.replace('account-hash-', '');

    try {
      const response = await fetch(
        `${network.apiUrl}/accounts/${accountHashClean}/ft-token-ownership`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': apiKey
          }
        }
      );

      if (!response.ok) {
        console.debug(`[CSPR.cloud] API returned ${response.status}`);
        return balances;
      }

      const data = await response.json();

      if (data?.data && Array.isArray(data.data)) {
        for (const ownership of data.data) {
          const token = EctoplasmConfig.getTokenByPackageHash(ownership.contract_package_hash);
          if (token) {
            balances[token.symbol] = BigInt(ownership.balance || '0');
            console.debug(`[CSPR.cloud] Found ${token.symbol} balance: ${ownership.balance}`);
          }
        }
      }

      return balances;
    } catch (error) {
      console.error('[CSPR.cloud] Error fetching token balances:', error);
      return balances;
    }
  }

  async getNativeBalance(publicKeyHex: string): Promise<BalanceResult> {
    try {
      const network = EctoplasmConfig.getNetwork();

      // Use RPC via Vite proxy to bypass CORS
      const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'query_balance',
          params: {
            purse_identifier: {
              main_purse_under_public_key: publicKeyHex
            }
          }
        })
      });

      const data = await response.json();

      if (data.error) {
        // Account not found or other error
        if (data.error.code === -32003 || data.error.message?.includes('not found')) {
          return { raw: BigInt(0), formatted: '0', decimals: 9 };
        }
        console.error('RPC error:', data.error);
        return { raw: BigInt(0), formatted: '0', decimals: 9 };
      }

      const balanceBigInt = BigInt(data.result?.balance || '0');

      return {
        raw: balanceBigInt,
        formatted: formatTokenAmount(balanceBigInt.toString(), 9),
        decimals: 9
      };
    } catch (error) {
      console.error('Error fetching CSPR balance:', error);
      return { raw: BigInt(0), formatted: '0', decimals: 9 };
    }
  }

  async getAllBalances(publicKeyHex: string): Promise<Record<string, BalanceResult>> {
    console.log('[getAllBalances] START - publicKeyHex:', publicKeyHex);
    console.log('[getAllBalances] Contract version:', EctoplasmConfig.contractVersion);
    console.log('[getAllBalances] Has CSPR.cloud API key:', EctoplasmConfig.hasCsprCloudApiKey());

    const balances: Record<string, BalanceResult> = {};
    const tokens = EctoplasmConfig.tokens;
    console.log('[getAllBalances] Tokens to query:', Object.keys(tokens));

    // Get native CSPR balance
    balances.CSPR = await this.getNativeBalance(publicKeyHex);
    console.log('[getAllBalances] CSPR balance:', balances.CSPR.formatted);

    // Initialize all CEP-18 token balances to 0
    Object.entries(tokens)
      .filter(([_, config]) => config.hash)
      .forEach(([symbol, config]) => {
        balances[symbol] = { raw: BigInt(0), formatted: '0', decimals: config.decimals };
      });

    // Try CSPR.cloud API first (only for Odra contracts - native contracts aren't indexed)
    const useCSPRCloud = EctoplasmConfig.hasCsprCloudApiKey() && EctoplasmConfig.contractVersion === 'odra';
    if (useCSPRCloud) {
      console.log('[getAllBalances] Using CSPR.cloud API path (Odra contracts)');
      try {
        const publicKey = CLPublicKey.fromHex(publicKeyHex);
        const accountHash = publicKey.toAccountHashStr();
        const csprCloudBalances = await this.getAllTokenBalancesFromCsprCloud(accountHash);

        for (const [symbol, rawBalance] of Object.entries(csprCloudBalances)) {
          const tokenConfig = EctoplasmConfig.getToken(symbol);
          if (tokenConfig) {
            balances[symbol] = {
              raw: rawBalance,
              formatted: formatTokenAmount(rawBalance.toString(), tokenConfig.decimals),
              decimals: tokenConfig.decimals
            };
          }
        }

        // If we got results from CSPR.cloud, return early
        const hasBalances = Object.values(csprCloudBalances).some(b => b > BigInt(0));
        if (hasBalances || Object.keys(csprCloudBalances).length > 0) {
          console.debug('[Balances] Using CSPR.cloud API results');
          return balances;
        }
      } catch (e) {
        console.debug('[Balances] CSPR.cloud API failed, falling back to RPC:', e);
      }
    }

    // Fallback: Try direct RPC queries for standard CEP-18 contracts
    console.log('[getAllBalances] Using direct RPC queries (not CSPR.cloud)');
    if (this.isAvailable()) {
      console.log('[getAllBalances] CasperService is available, querying tokens...');
      const tokenPromises = Object.entries(tokens)
        .filter(([_, config]) => config.hash)
        .map(async ([symbol, config]) => {
          try {
            const balance = await this.getTokenBalance(config.hash!, publicKeyHex);
            return [symbol, balance] as const;
          } catch (e) {
            return [symbol, { raw: BigInt(0), formatted: '0', decimals: config.decimals }] as const;
          }
        });

      const results = await Promise.all(tokenPromises);
      results.forEach(([symbol, balance]) => {
        balances[symbol] = balance;
        console.log(`[getAllBalances] ${symbol} balance:`, balance.formatted);
      });
    } else {
      console.log('[getAllBalances] CasperService not available, returning zeros');
      Object.entries(tokens)
        .filter(([_, config]) => config.hash)
        .forEach(([symbol, config]) => {
          balances[symbol] = { raw: BigInt(0), formatted: '0', decimals: config.decimals };
        });
    }

    console.log('[getAllBalances] DONE - Final balances:', Object.fromEntries(
      Object.entries(balances).map(([k, v]) => [k, v.formatted])
    ));
    return balances;
  }

  // ============================================
  // Pair Reserves Queries
  // ============================================

  async getPairAddress(tokenA: string, tokenB: string): Promise<string | null> {
    console.log('[CasperService.getPairAddress] Called with tokenA:', tokenA, 'tokenB:', tokenB);

    const configuredPair = EctoplasmConfig.getConfiguredPairAddress(tokenA, tokenB);
    console.log('[CasperService.getPairAddress] configuredPair from config:', configuredPair);
    if (configuredPair) return configuredPair;

    this.ensureInit();

    try {
      const factoryHash = EctoplasmConfig.contracts.factory;
      console.log('[CasperService.getPairAddress] factoryHash:', factoryHash);

      const stateRootHash = await this.client!.nodeClient.getStateRootHash();
      const [token0, token1] = this.sortTokens(tokenA, tokenB);
      const pairKey = `${token0.replace('hash-', '')}_${token1.replace('hash-', '')}`;
      console.log('[CasperService.getPairAddress] pairKey:', pairKey);

      const result = await this.client!.nodeClient.getDictionaryItemByName(
        stateRootHash,
        factoryHash.replace('hash-', ''),
        'pairs',
        pairKey
      );

      console.log('[CasperService.getPairAddress] result:', result?.CLValue?.data);
      return result?.CLValue?.data || null;
    } catch (error: any) {
      console.log('[CasperService.getPairAddress] Error:', error.message);
      if (error.message?.includes('ValueNotFound') || error.message?.includes('Failed to find')) {
        return null;
      }
      throw error;
    }
  }

  async getPairReserves(tokenAHash: string, tokenBHash: string): Promise<{
    reserveA: bigint;
    reserveB: bigint;
    exists: boolean;
  }> {
    try {
      const pairAddress = await this.getPairAddress(tokenAHash, tokenBHash);
      console.log('[getPairReserves] Pair address:', pairAddress);

      if (!pairAddress) {
        return { reserveA: BigInt(0), reserveB: BigInt(0), exists: false };
      }

      const reserve0 = await this.queryContractNamedKey(pairAddress, 'reserve0');
      const reserve1 = await this.queryContractNamedKey(pairAddress, 'reserve1');
      console.log('[getPairReserves] Reserves:', { reserve0, reserve1 });

      const [token0] = this.sortTokens(tokenAHash, tokenBHash);

      if (tokenAHash === token0) {
        return {
          reserveA: BigInt(reserve0 || 0),
          reserveB: BigInt(reserve1 || 0),
          exists: true
        };
      } else {
        return {
          reserveA: BigInt(reserve1 || 0),
          reserveB: BigInt(reserve0 || 0),
          exists: true
        };
      }
    } catch (error) {
      console.error('Error fetching pair reserves:', error);
      return { reserveA: BigInt(0), reserveB: BigInt(0), exists: false };
    }
  }

  /**
   * Query a contract's named key value using direct RPC
   * Works with both V2 native (entity-contract-) and legacy (hash-) contracts
   */
  private async queryContractNamedKey(
    contractHash: string,
    keyName: string,
    stateRootHash?: string
  ): Promise<string | null> {
    const network = EctoplasmConfig.getNetwork();
    const cleanHash = contractHash.replace(/^(hash-|entity-contract-)/, '');

    // Get state root hash if not provided
    if (!stateRootHash) {
      try {
        const response = await fetch(network.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'chain_get_state_root_hash'
          })
        });
        const data = await response.json();
        stateRootHash = data?.result?.state_root_hash;
      } catch (e) {
        console.error('Failed to get state root hash:', e);
        return null;
      }
    }

    // Try both entity-contract- and hash- prefixes
    const prefixes = ['entity-contract-', 'hash-'];

    for (const prefix of prefixes) {
      try {
        const response = await fetch(network.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'query_global_state',
            params: {
              state_identifier: { StateRootHash: stateRootHash },
              key: `${prefix}${cleanHash}`,
              path: [keyName]
            }
          })
        });

        const data = await response.json();

        if (data.error) {
          continue; // Try next prefix
        }

        const clValue = data.result?.stored_value?.CLValue;
        if (clValue?.parsed !== undefined && clValue?.parsed !== null) {
          return clValue.parsed.toString();
        }
      } catch (e) {
        continue; // Try next prefix
      }
    }

    return null;
  }

  private sortTokens(tokenA: string, tokenB: string): [string, string] {
    const hashA = tokenA.replace('hash-', '').toLowerCase();
    const hashB = tokenB.replace('hash-', '').toLowerCase();
    return hashA < hashB ? [tokenA, tokenB] : [tokenB, tokenA];
  }

  // ============================================
  // AMM Calculations
  // ============================================

  getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
    if (amountIn <= BigInt(0)) return BigInt(0);
    if (reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) return BigInt(0);

    const amountInWithFee = amountIn * BigInt(997);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * BigInt(1000) + amountInWithFee;

    return numerator / denominator;
  }

  getAmountIn(amountOut: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
    if (amountOut <= BigInt(0)) return BigInt(0);
    if (reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) return BigInt(0);
    if (amountOut >= reserveOut) return BigInt(0);

    const numerator = reserveIn * amountOut * BigInt(1000);
    const denominator = (reserveOut - amountOut) * BigInt(997);

    return numerator / denominator + BigInt(1);
  }

  // ============================================
  // Swap Quote
  // ============================================

  async getSwapQuote(
    tokenInSymbol: string,
    tokenOutSymbol: string,
    amountIn: string
  ): Promise<SwapQuote> {
    const tokenIn = EctoplasmConfig.getToken(tokenInSymbol);
    const tokenOut = EctoplasmConfig.getToken(tokenOutSymbol);

    if (!tokenIn || !tokenOut) {
      return {
        valid: false,
        error: `Invalid token: ${tokenInSymbol} or ${tokenOutSymbol}`,
        amountIn: '0',
        amountInRaw: BigInt(0),
        amountOut: '0',
        amountOutRaw: BigInt(0),
        priceImpact: '0',
        rate: '0'
      };
    }

    // For CSPR swaps, use demo mode
    if (!tokenIn.hash || !tokenOut.hash) {
      return this.getDemoQuote(tokenInSymbol, tokenOutSymbol, amountIn);
    }

    if (!this.isAvailable()) {
      return this.getDemoQuote(tokenInSymbol, tokenOutSymbol, amountIn);
    }

    try {
      const amountInRaw = BigInt(parseTokenAmount(amountIn, tokenIn.decimals));
      const reserves = await this.getPairReserves(tokenIn.hash, tokenOut.hash);

      if (!reserves.exists) {
        return {
          valid: false,
          error: 'Pair does not exist',
          amountIn: '0',
          amountInRaw: BigInt(0),
          amountOut: '0',
          amountOutRaw: BigInt(0),
          priceImpact: '0',
          rate: '0'
        };
      }

      const amountOutRaw = this.getAmountOut(amountInRaw, reserves.reserveA, reserves.reserveB);
      const amountOut = formatTokenAmount(amountOutRaw.toString(), tokenOut.decimals);

      const spotPrice = Number(reserves.reserveB) / Number(reserves.reserveA);
      const executionPrice = Number(amountOutRaw) / Number(amountInRaw);
      const priceImpact = spotPrice > 0 ? ((spotPrice - executionPrice) / spotPrice) * 100 : 0;

      const decimalAdjust = Math.pow(10, tokenIn.decimals - tokenOut.decimals);
      const rate = Number(amountOutRaw) / Number(amountInRaw) * decimalAdjust;

      const slippage = EctoplasmConfig.swap.defaultSlippage / 100;
      const minReceivedRaw = amountOutRaw * BigInt(Math.floor((1 - slippage) * 10000)) / BigInt(10000);

      return {
        valid: true,
        tokenIn,
        tokenOut,
        amountIn,
        amountInRaw,
        amountOut,
        amountOutRaw,
        minReceived: formatTokenAmount(minReceivedRaw.toString(), tokenOut.decimals),
        minReceivedRaw,
        priceImpact: Math.max(0, priceImpact).toFixed(2),
        rate: rate.toFixed(6),
        path: [tokenIn.hash, tokenOut.hash],
        reserves
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to calculate quote',
        amountIn: '0',
        amountInRaw: BigInt(0),
        amountOut: '0',
        amountOutRaw: BigInt(0),
        priceImpact: '0',
        rate: '0'
      };
    }
  }

  getDemoQuote(tokenInSymbol: string, tokenOutSymbol: string, amountIn: string): SwapQuote {
    const demoRates: Record<string, Record<string, number>> = {
      cspr: { ecto: 0.05, usdc: 0.035, weth: 0.000015, wbtc: 0.0000008 },
      ecto: { cspr: 20, usdc: 0.70, weth: 0.0003, wbtc: 0.000016 },
      usdc: { cspr: 28.57, ecto: 1.43, weth: 0.00043, wbtc: 0.000023 },
      weth: { cspr: 66667, ecto: 3333, usdc: 2333, wbtc: 0.053 },
      wbtc: { cspr: 1250000, ecto: 62500, usdc: 43750, weth: 18.87 }
    };

    const fromKey = tokenInSymbol.toLowerCase();
    const toKey = tokenOutSymbol.toLowerCase();
    const rate = demoRates[fromKey]?.[toKey] || 1;

    const amountInNum = parseFloat(amountIn) || 0;
    const amountOutNum = amountInNum * rate;

    const tokenIn = EctoplasmConfig.getToken(tokenInSymbol);
    const tokenOut = EctoplasmConfig.getToken(tokenOutSymbol);

    const slippage = EctoplasmConfig.swap.defaultSlippage / 100;
    const minReceivedNum = amountOutNum * (1 - slippage);

    return {
      valid: true,
      demo: true,
      tokenIn: tokenIn || undefined,
      tokenOut: tokenOut || undefined,
      amountIn,
      amountInRaw: BigInt(parseTokenAmount(amountIn, tokenIn?.decimals || 18)),
      amountOut: amountOutNum.toFixed(6),
      amountOutRaw: BigInt(parseTokenAmount(amountOutNum.toString(), tokenOut?.decimals || 18)),
      minReceived: minReceivedNum.toFixed(6),
      minReceivedRaw: BigInt(0),
      priceImpact: '0.00',
      rate: rate.toFixed(6),
      path: [],
      reserves: undefined
    };
  }

  // ============================================
  // Transaction Execution (require wallet context)
  // ============================================

  async checkAllowance(
    tokenHash: string,
    ownerPublicKey: string,
    amount: bigint
  ): Promise<boolean> {
    this.ensureInit();
    if (!tokenHash) return false;

    try {
      const accountHash = CLPublicKey.fromHex(ownerPublicKey).toAccountHashStr();
      const routerHash = EctoplasmConfig.contracts.router;
      const stateRootHash = await this.client!.nodeClient.getStateRootHash();
      const ownerKey = accountHash.replace('account-hash-', '');
      const spenderKey = routerHash.replace('hash-', '');
      const allowanceKey = `${ownerKey}_${spenderKey}`;

      const result = await this.client!.nodeClient.getDictionaryItemByName(
        stateRootHash,
        tokenHash.replace('hash-', ''),
        'allowances',
        allowanceKey
      );

      const currentAllowance = BigInt(result?.CLValue?.data?.toString() || '0');
      return currentAllowance >= amount;
    } catch (error) {
      return false;
    }
  }

  buildApproveDeploy(
    tokenHash: string,
    amount: bigint,
    publicKeyHex: string
  ): any {
    this.ensureInit();

    const publicKey = CLPublicKey.fromHex(publicKeyHex);
    const routerHash = EctoplasmConfig.contracts.router;
    const gasLimit = EctoplasmConfig.gasLimits.approve;
    const network = EctoplasmConfig.getNetwork();

    const args = RuntimeArgs.fromMap({
      spender: CLValueBuilder.key(
        CLValueBuilder.byteArray(hexToBytes(routerHash))
      ),
      amount: CLValueBuilder.u256(amount.toString())
    });

    return DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        publicKey,
        network.chainName,
        1,
        3600000
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        hexToBytes(tokenHash),
        'approve',
        args
      ),
      DeployUtil.standardPayment(gasLimit)
    );
  }

  buildSwapDeploy(
    quote: SwapQuote,
    publicKeyHex: string,
    slippagePercent: number = EctoplasmConfig.swap.defaultSlippage
  ): any {
    this.ensureInit();

    if (!quote.valid || quote.demo || !quote.path?.length) {
      throw new Error('Invalid quote for swap');
    }

    const publicKey = CLPublicKey.fromHex(publicKeyHex);
    const routerHash = EctoplasmConfig.contracts.router;
    const gasLimit = EctoplasmConfig.gasLimits.swap;
    const network = EctoplasmConfig.getNetwork();

    const deadline = Date.now() + (EctoplasmConfig.swap.deadlineMinutes * 60 * 1000);
    const slippageMultiplier = BigInt(Math.floor((1 - slippagePercent / 100) * 10000));
    const amountOutMin = quote.amountOutRaw * slippageMultiplier / BigInt(10000);

    const pathList = new CLList([
      CLValueBuilder.byteArray(hexToBytes(quote.path[0])),
      CLValueBuilder.byteArray(hexToBytes(quote.path[1]))
    ]);

    const args = RuntimeArgs.fromMap({
      amount_in: CLValueBuilder.u256(quote.amountInRaw.toString()),
      amount_out_min: CLValueBuilder.u256(amountOutMin.toString()),
      path: pathList,
      to: CLValueBuilder.key(CLValueBuilder.byteArray(publicKey.toAccountHash())),
      deadline: CLValueBuilder.u64(deadline)
    });

    return DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        publicKey,
        network.chainName,
        1,
        3600000
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        hexToBytes(routerHash),
        'swap_exact_tokens_for_tokens',
        args
      ),
      DeployUtil.standardPayment(gasLimit)
    );
  }

  async submitDeploy(signedDeploy: any): Promise<string> {
    console.log('[CasperService.submitDeploy] signedDeploy:', signedDeploy);
    console.log('[CasperService.submitDeploy] signedDeploy type:', typeof signedDeploy);
    console.log('[CasperService.submitDeploy] has hash?', signedDeploy?.hash);
    console.log('[CasperService.submitDeploy] has approvals?', signedDeploy?.approvals);

    this.ensureInit();

    // Convert Deploy object to JSON for RPC submission
    let deployJson: any;
    if (signedDeploy && signedDeploy.hash instanceof Uint8Array && signedDeploy.approvals) {
      console.log('[CasperService.submitDeploy] Converting Deploy object to JSON...');
      deployJson = DeployUtil.deployToJson(signedDeploy);
    } else if (typeof signedDeploy === 'string') {
      console.log('[CasperService.submitDeploy] Parsing string deploy...');
      try {
        deployJson = JSON.parse(signedDeploy);
      } catch (e) {
        throw new Error(`Failed to parse deploy JSON: ${e}`);
      }
    } else if (signedDeploy.deploy) {
      console.log('[CasperService.submitDeploy] Extracting deploy from wallet response');
      deployJson = signedDeploy;
    } else {
      deployJson = signedDeploy;
    }

    // Extract just the deploy/transaction if wrapped
    const deployData = deployJson.deploy || deployJson;

    console.log('[CasperService.submitDeploy] Submitting via direct RPC...');
    console.log('[CasperService.submitDeploy] Deploy data keys:', Object.keys(deployData));
    console.log('[CasperService.submitDeploy] Has cancel_hash:', deployData.cancel_hash !== undefined);
    console.log('[CasperService.submitDeploy] Has hash:', deployData.hash !== undefined);
    const network = EctoplasmConfig.getNetwork();

    // Check if this is a Casper 2.0 transaction (has cancel_hash field) or legacy deploy
    // Also check the raw JSON string for cancel_hash in case it's nested
    const dataStr = JSON.stringify(deployData);
    const isTransaction = deployData.cancel_hash !== undefined || dataStr.includes('"cancel_hash"');
    const method = isTransaction ? 'transaction_v1_put' : 'account_put_deploy';
    const paramKey = isTransaction ? 'transaction' : 'deploy';
    
    console.log('[CasperService.submitDeploy] Using method:', method);

    // Use direct fetch to submit deploy/transaction
    const response = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: method,
        params: {
          [paramKey]: deployData
        }
      })
    });

    const result = await response.json();
    console.log('[CasperService.submitDeploy] RPC response:', result);

    if (result.error) {
      console.error('[CasperService.submitDeploy] RPC error:', result.error);
      throw new Error(result.error.message || `RPC error: ${JSON.stringify(result.error)}`);
    }

    const deployHash = result.result?.deploy_hash || result.result?.transaction_hash?.Version1 || result.result?.transaction_hash;
    if (!deployHash) {
      throw new Error('No deploy/transaction hash returned from RPC');
    }

    console.log('[CasperService.submitDeploy] Deploy hash:', deployHash);
    return deployHash;
  }

  async waitForDeploy(deployHash: string, timeout: number = 300000): Promise<DeployResult> {
    console.log('[CasperService.waitForDeploy] Waiting for deploy:', deployHash);
    this.ensureInit();

    const startTime = Date.now();
    const pollInterval = 5000;
    let pollCount = 0;

    while (Date.now() - startTime < timeout) {
      pollCount++;
      console.log(`[CasperService.waitForDeploy] Poll #${pollCount} for deploy ${deployHash.substring(0, 16)}...`);

      try {
        const result = await this.client!.nodeClient.getDeployInfo(deployHash) as any;
        console.log('[CasperService.waitForDeploy] getDeployInfo result:', result);

        // Handle Casper 2.0 format (execution_info)
        if (result?.execution_info?.execution_result) {
          const execResult = result.execution_info.execution_result;
          console.log('[CasperService.waitForDeploy] Execution result (2.0 format):', execResult);

          // Casper 2.0 format: execution_result.Success or execution_result.Failure
          if (execResult.Success) {
            console.log('[CasperService.waitForDeploy] Deploy succeeded!');
            return { success: true, deployHash };
          } else if (execResult.Failure) {
            console.log('[CasperService.waitForDeploy] Deploy failed:', execResult.Failure);
            return {
              success: false,
              deployHash,
              error: execResult.Failure.error_message || 'Transaction failed'
            };
          }
        }

        // Handle legacy format (execution_results array)
        if (result?.execution_results?.length > 0) {
          const execResult = result.execution_results[0].result;
          console.log('[CasperService.waitForDeploy] Execution result (legacy format):', execResult);

          if (execResult.Success) {
            console.log('[CasperService.waitForDeploy] Deploy succeeded!');
            return { success: true, deployHash };
          } else if (execResult.Failure) {
            console.log('[CasperService.waitForDeploy] Deploy failed:', execResult.Failure);
            return {
              success: false,
              deployHash,
              error: execResult.Failure.error_message || 'Transaction failed'
            };
          }
        }

        console.log('[CasperService.waitForDeploy] No execution results yet, deploy still pending...');
        console.log('[CasperService.waitForDeploy] execution_info:', result?.execution_info);
      } catch (error: any) {
        console.log('[CasperService.waitForDeploy] Error polling deploy:', error?.message || error);
        // Deploy not found yet, continue polling
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    console.log('[CasperService.waitForDeploy] Timeout reached');
    return { success: false, deployHash, error: 'Timeout waiting for deploy' };
  }

  // ============================================
  // Liquidity Operations
  // ============================================

  /**
   * Build an add_liquidity deploy to call Router.add_liquidity()
   * This is the preferred approach - approve tokens first, then call add_liquidity
   */
  buildAddLiquidityDeploy(
    tokenAHash: string,
    tokenBHash: string,
    amountADesired: bigint,
    amountBDesired: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    publicKeyHex: string,
    deadlineMs?: number
  ): any {
    console.log('[CasperService.buildAddLiquidityDeploy] Called with:');
    console.log('  tokenAHash:', tokenAHash);
    console.log('  tokenBHash:', tokenBHash);
    console.log('  amountADesired:', amountADesired?.toString());
    console.log('  amountBDesired:', amountBDesired?.toString());
    console.log('  amountAMin:', amountAMin?.toString());
    console.log('  amountBMin:', amountBMin?.toString());

    this.ensureInit();

    const publicKey = CLPublicKey.fromHex(publicKeyHex);
    const routerHash = EctoplasmConfig.contracts.router;
    const gasLimit = EctoplasmConfig.gasLimits.addLiquidity;
    const network = EctoplasmConfig.getNetwork();

    // Default deadline: 20 minutes from now
    const deadline = deadlineMs || (Date.now() + EctoplasmConfig.swap.deadlineMinutes * 60 * 1000);

    console.log('  routerHash:', routerHash);
    console.log('  gasLimit:', gasLimit);
    console.log('  deadline:', deadline);

    const args = RuntimeArgs.fromMap({
      token_a: CLValueBuilder.key(
        CLValueBuilder.byteArray(hexToBytes(tokenAHash))
      ),
      token_b: CLValueBuilder.key(
        CLValueBuilder.byteArray(hexToBytes(tokenBHash))
      ),
      amount_a_desired: CLValueBuilder.u256(amountADesired.toString()),
      amount_b_desired: CLValueBuilder.u256(amountBDesired.toString()),
      amount_a_min: CLValueBuilder.u256(amountAMin.toString()),
      amount_b_min: CLValueBuilder.u256(amountBMin.toString()),
      to: CLValueBuilder.key(
        CLValueBuilder.byteArray(publicKey.toAccountHash())
      ),
      deadline: CLValueBuilder.u64(deadline)
    });

    const deploy = DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        publicKey,
        network.chainName,
        1,
        3600000
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        hexToBytes(routerHash),
        'add_liquidity',
        args
      ),
      DeployUtil.standardPayment(gasLimit)
    );

    console.log('[CasperService.buildAddLiquidityDeploy] Deploy created successfully');
    return deploy;
  }

  /**
   * Build a CEP-18 transfer deploy to send tokens to the Pair contract
   * @deprecated Use buildAddLiquidityDeploy with Router instead
   */
  buildTransferDeploy(
    tokenHash: string,
    recipientHash: string,
    amount: bigint,
    publicKeyHex: string
  ): any {
    console.log('[CasperService.buildTransferDeploy] Called with:');
    console.log('  tokenHash:', tokenHash);
    console.log('  recipientHash:', recipientHash);
    console.log('  amount:', amount?.toString());
    console.log('  publicKeyHex:', publicKeyHex);

    this.ensureInit();

    // Clean the hashes - remove any prefix
    const cleanTokenHash = tokenHash?.replace(/^(hash-|entity-contract-)/, '');
    const cleanRecipientHash = recipientHash?.replace(/^(hash-|entity-contract-)/, '');

    console.log('  cleanTokenHash:', cleanTokenHash);
    console.log('  cleanRecipientHash:', cleanRecipientHash);

    if (!cleanTokenHash || !cleanRecipientHash || !publicKeyHex) {
      throw new Error(`Invalid arguments: tokenHash=${cleanTokenHash}, recipientHash=${cleanRecipientHash}, publicKeyHex=${publicKeyHex}`);
    }

    const publicKey = CLPublicKey.fromHex(publicKeyHex);
    const gasLimit = EctoplasmConfig.gasLimits.approve; // Similar gas to approve
    const network = EctoplasmConfig.getNetwork();

    console.log('  gasLimit:', gasLimit);
    console.log('  chainName:', network.chainName);

    // Recipient is the Pair contract hash
    const recipientBytes = hexToBytes(cleanRecipientHash);
    console.log('  recipientBytes length:', recipientBytes?.length);

    const args = RuntimeArgs.fromMap({
      recipient: CLValueBuilder.key(
        CLValueBuilder.byteArray(recipientBytes)
      ),
      amount: CLValueBuilder.u256(amount.toString())
    });

    const tokenBytes = hexToBytes(cleanTokenHash);
    console.log('  tokenBytes length:', tokenBytes?.length);

    const deploy = DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        publicKey,
        network.chainName,
        1,
        3600000
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        tokenBytes,
        'transfer',
        args
      ),
      DeployUtil.standardPayment(gasLimit)
    );

    console.log('[CasperService.buildTransferDeploy] Deploy created successfully');
    return deploy;
  }

  /**
   * Build a mint deploy to call Pair.mint() and receive LP tokens
   */
  buildMintLiquidityDeploy(
    pairHash: string,
    recipientPublicKeyHex: string
  ): any {
    console.log('[CasperService.buildMintLiquidityDeploy] Called with:');
    console.log('  pairHash:', pairHash);
    console.log('  recipientPublicKeyHex:', recipientPublicKeyHex);

    this.ensureInit();

    // Clean the pair hash - remove any prefix
    const cleanPairHash = pairHash?.replace(/^(hash-|entity-contract-)/, '');
    console.log('  cleanPairHash:', cleanPairHash);

    if (!cleanPairHash || !recipientPublicKeyHex) {
      throw new Error(`Invalid arguments: pairHash=${cleanPairHash}, recipientPublicKeyHex=${recipientPublicKeyHex}`);
    }

    const publicKey = CLPublicKey.fromHex(recipientPublicKeyHex);
    const gasLimit = EctoplasmConfig.gasLimits.addLiquidity;
    const network = EctoplasmConfig.getNetwork();

    console.log('  gasLimit:', gasLimit);
    console.log('  chainName:', network.chainName);

    // The 'to' argument is where LP tokens will be minted
    const accountHash = publicKey.toAccountHash();
    console.log('  accountHash length:', accountHash?.length);

    const args = RuntimeArgs.fromMap({
      to: CLValueBuilder.key(
        CLValueBuilder.byteArray(accountHash)
      )
    });

    const pairBytes = hexToBytes(cleanPairHash);
    console.log('  pairBytes length:', pairBytes?.length);

    const deploy = DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        publicKey,
        network.chainName,
        1,
        3600000
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        pairBytes,
        'mint',
        args
      ),
      DeployUtil.standardPayment(gasLimit)
    );

    console.log('[CasperService.buildMintLiquidityDeploy] Deploy created successfully');
    return deploy;
  }

  /**
   * Get LP token balance for a user in a specific pair
   * Uses direct RPC to query the lp_balances dictionary
   */
  async getLPTokenBalance(pairHash: string, publicKeyHex: string): Promise<BalanceResult> {
    const network = EctoplasmConfig.getNetwork();

    try {
      const publicKey = CLPublicKey.fromHex(publicKeyHex);
      const accountHash = publicKey.toAccountHashStr();
      const accountHashHex = accountHash.replace('account-hash-', '');
      const cleanHash = pairHash.replace(/^(hash-|entity-contract-)/, '');

      // Get state root hash
      const stateRootResponse = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'chain_get_state_root_hash'
        })
      });
      const stateRootData = await stateRootResponse.json();
      const stateRootHash = stateRootData?.result?.state_root_hash;

      if (!stateRootHash) {
        return { raw: BigInt(0), formatted: '0', decimals: 18 };
      }

      // Try both entity-contract- and hash- prefixes for LP token balance
      // LP balances dictionary is 'lp_balances' in V2 native pair contracts
      const prefixes = ['entity-contract-', 'hash-'];
      const dictNames = ['lp_balances', 'balances']; // V2 uses lp_balances, legacy might use balances

      for (const prefix of prefixes) {
        for (const dictName of dictNames) {
          try {
            const response = await fetch(network.rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'state_get_dictionary_item',
                params: {
                  state_root_hash: stateRootHash,
                  dictionary_identifier: {
                    ContractNamedKey: {
                      key: `${prefix}${cleanHash}`,
                      dictionary_name: dictName,
                      dictionary_item_key: accountHashHex
                    }
                  }
                }
              })
            });

            const data = await response.json();

            if (data.error) {
              continue; // Try next combination
            }

            const clValue = data.result?.stored_value?.CLValue;
            if (clValue?.parsed !== undefined && clValue?.parsed !== null) {
              const balance = BigInt(clValue.parsed.toString());
              return {
                raw: balance,
                formatted: formatTokenAmount(balance.toString(), 18),
                decimals: 18
              };
            }
          } catch (e) {
            continue; // Try next combination
          }
        }
      }

      return { raw: BigInt(0), formatted: '0', decimals: 18 };
    } catch (error: any) {
      console.error('Error fetching LP balance:', error);
      return { raw: BigInt(0), formatted: '0', decimals: 18 };
    }
  }

  /**
   * Get total supply of LP tokens for a pair
   * V2 native contracts use 'lp_total_supply', legacy might use 'total_supply'
   */
  async getLPTokenTotalSupply(pairHash: string): Promise<bigint> {
    try {
      // Try V2 native key name first
      let totalSupply = await this.queryContractNamedKey(pairHash, 'lp_total_supply');
      if (totalSupply) {
        return BigInt(totalSupply);
      }

      // Fallback to legacy key name
      totalSupply = await this.queryContractNamedKey(pairHash, 'total_supply');
      return BigInt(totalSupply || '0');
    } catch (error) {
      console.error('Error fetching LP total supply:', error);
      return BigInt(0);
    }
  }

  /**
   * Calculate optimal amounts for adding liquidity based on current reserves
   */
  calculateOptimalLiquidity(
    amountADesired: bigint,
    amountBDesired: bigint,
    reserveA: bigint,
    reserveB: bigint
  ): { amountA: bigint; amountB: bigint } {
    // If no reserves, use desired amounts directly
    if (reserveA === BigInt(0) && reserveB === BigInt(0)) {
      return { amountA: amountADesired, amountB: amountBDesired };
    }

    // Calculate optimal amountB for given amountA
    const amountBOptimal = (amountADesired * reserveB) / reserveA;

    if (amountBOptimal <= amountBDesired) {
      return { amountA: amountADesired, amountB: amountBOptimal };
    }

    // Calculate optimal amountA for given amountB
    const amountAOptimal = (amountBDesired * reserveA) / reserveB;
    return { amountA: amountAOptimal, amountB: amountBDesired };
  }

  /**
   * Estimate LP tokens to receive for given liquidity amounts
   */
  estimateLPTokens(
    amountA: bigint,
    amountB: bigint,
    reserveA: bigint,
    reserveB: bigint,
    totalSupply: bigint
  ): bigint {
    if (totalSupply === BigInt(0)) {
      // First liquidity: sqrt(amountA * amountB) - MINIMUM_LIQUIDITY
      const product = amountA * amountB;
      const sqrt = this.bigIntSqrt(product);
      const MINIMUM_LIQUIDITY = BigInt(1000);
      return sqrt > MINIMUM_LIQUIDITY ? sqrt - MINIMUM_LIQUIDITY : BigInt(0);
    }

    // Subsequent liquidity: min(amountA * totalSupply / reserveA, amountB * totalSupply / reserveB)
    const liquidityA = (amountA * totalSupply) / reserveA;
    const liquidityB = (amountB * totalSupply) / reserveB;
    return liquidityA < liquidityB ? liquidityA : liquidityB;
  }

  /**
   * Calculate pool share percentage
   */
  calculatePoolShare(lpTokens: bigint, totalSupply: bigint): number {
    if (totalSupply === BigInt(0)) {
      return 100; // First LP gets 100% of the pool
    }
    const newTotalSupply = totalSupply + lpTokens;
    return Number((lpTokens * BigInt(10000)) / newTotalSupply) / 100;
  }

  /**
   * Integer square root for bigint
   */
  private bigIntSqrt(n: bigint): bigint {
    if (n < BigInt(0)) throw new Error('Square root of negative number');
    if (n < BigInt(2)) return n;

    let x = n;
    let y = (x + BigInt(1)) / BigInt(2);

    while (y < x) {
      x = y;
      y = (x + n / x) / BigInt(2);
    }

    return x;
  }
}

// Export singleton instance
export const CasperService = new CasperServiceClass();
export default CasperService;
