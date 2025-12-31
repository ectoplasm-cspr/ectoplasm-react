/**
 * CasperService - Blockchain interaction module for Ectoplasm DEX
 * TypeScript port for React application
 */

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

// SDK class references (set during init)
let CasperClientClass: any = null;
let CLPublicKeyClass: any = null;
let CLValueBuilderClass: any = null;
let RuntimeArgsClass: any = null;
let DeployUtilClass: any = null;
let CLListClass: any = null;

class CasperServiceClass {
  private client: any = null;
  private initialized: boolean = false;
  private sdkAvailable: boolean = false;
  private initError: string | null = null;

  /**
   * Initialize the Casper client and resolve SDK classes
   */
  init(): boolean {
    if (this.initialized) return this.sdkAvailable;

    const network = EctoplasmConfig.getNetwork();

    // Try to resolve SDK from imports or window
    try {
      // For browser with CDN-loaded SDK
      const w = window as any;
      const sdk = w.Casper || w.CasperSDK || w.casper_js_sdk || w;

      CasperClientClass = sdk.CasperClient || w.CasperClient;
      CLPublicKeyClass = sdk.CLPublicKey || w.CLPublicKey;
      CLValueBuilderClass = sdk.CLValueBuilder || w.CLValueBuilder;
      RuntimeArgsClass = sdk.RuntimeArgs || w.RuntimeArgs;
      DeployUtilClass = sdk.DeployUtil || w.DeployUtil;
      CLListClass = sdk.CLList || w.CLList;

      if (!CasperClientClass) {
        this.initError = 'Casper SDK not loaded. Blockchain features are unavailable.';
        console.warn('CasperService:', this.initError);
        this.initialized = true;
        this.sdkAvailable = false;
        return false;
      }

      this.client = new CasperClientClass(network.rpcUrl);
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

    if (!tokenHash) {
      return { raw: BigInt(0), formatted: '0', decimals: 18 };
    }

    try {
      const publicKey = CLPublicKeyClass.fromHex(publicKeyHex);
      const accountHash = publicKey.toAccountHashStr();
      const stateRootHash = await this.client.nodeClient.getStateRootHash();
      const balanceKey = accountHash.replace('account-hash-', '');
      const contractHash = tokenHash.replace('hash-', '');

      const result = await this.client.nodeClient.getDictionaryItemByName(
        stateRootHash,
        contractHash,
        'balances',
        balanceKey
      );

      const balance = BigInt(result.CLValue?.data?.toString() || '0');
      const tokenConfig = EctoplasmConfig.getTokenByHash(tokenHash);
      const decimals = tokenConfig?.decimals || 18;

      return {
        raw: balance,
        formatted: formatTokenAmount(balance.toString(), decimals),
        decimals
      };
    } catch (error: any) {
      if (error.message?.includes('ValueNotFound') ||
          error.message?.includes('Failed to find') ||
          error.code === -32003) {
        return { raw: BigInt(0), formatted: '0', decimals: 18 };
      }
      throw error;
    }
  }

  async getNativeBalance(publicKeyHex: string): Promise<BalanceResult> {
    try {
      const network = EctoplasmConfig.getNetwork();

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
        if (data.error.code === -32003 || data.error.message?.includes('not found')) {
          return { raw: BigInt(0), formatted: '0', decimals: 9 };
        }
        throw new Error(data.error.message || 'RPC error');
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
    const balances: Record<string, BalanceResult> = {};
    const tokens = EctoplasmConfig.tokens;

    // Get native CSPR balance
    balances.CSPR = await this.getNativeBalance(publicKeyHex);

    // Get CEP-18 token balances if SDK available
    if (this.isAvailable()) {
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
      });
    } else {
      Object.entries(tokens)
        .filter(([_, config]) => config.hash)
        .forEach(([symbol, config]) => {
          balances[symbol] = { raw: BigInt(0), formatted: '0', decimals: config.decimals };
        });
    }

    return balances;
  }

  // ============================================
  // Pair Reserves Queries
  // ============================================

  async getPairAddress(tokenA: string, tokenB: string): Promise<string | null> {
    const configuredPair = EctoplasmConfig.getConfiguredPairAddress(tokenA, tokenB);
    if (configuredPair) return configuredPair;

    this.ensureInit();

    try {
      const factoryHash = EctoplasmConfig.contracts.factory;
      const stateRootHash = await this.client.nodeClient.getStateRootHash();
      const [token0, token1] = this.sortTokens(tokenA, tokenB);
      const pairKey = `${token0.replace('hash-', '')}_${token1.replace('hash-', '')}`;

      const result = await this.client.nodeClient.getDictionaryItemByName(
        stateRootHash,
        factoryHash.replace('hash-', ''),
        'pairs',
        pairKey
      );

      return result?.CLValue?.data || null;
    } catch (error: any) {
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
    this.ensureInit();

    try {
      const pairAddress = await this.getPairAddress(tokenAHash, tokenBHash);
      if (!pairAddress) {
        return { reserveA: BigInt(0), reserveB: BigInt(0), exists: false };
      }

      const stateRootHash = await this.client.nodeClient.getStateRootHash();
      const reserve0 = await this.queryContractNamedKey(pairAddress, 'reserve0', stateRootHash);
      const reserve1 = await this.queryContractNamedKey(pairAddress, 'reserve1', stateRootHash);

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

  private async queryContractNamedKey(
    contractHash: string,
    keyName: string,
    stateRootHash?: string
  ): Promise<string | null> {
    try {
      const result = await this.client.nodeClient.getBlockState(
        stateRootHash || await this.client.nodeClient.getStateRootHash(),
        `hash-${contractHash.replace('hash-', '')}`,
        [keyName]
      );
      return result?.CLValue?.data?.toString();
    } catch (error) {
      return null;
    }
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
      const accountHash = CLPublicKeyClass.fromHex(ownerPublicKey).toAccountHashStr();
      const routerHash = EctoplasmConfig.contracts.router;
      const stateRootHash = await this.client.nodeClient.getStateRootHash();
      const ownerKey = accountHash.replace('account-hash-', '');
      const spenderKey = routerHash.replace('hash-', '');
      const allowanceKey = `${ownerKey}_${spenderKey}`;

      const result = await this.client.nodeClient.getDictionaryItemByName(
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

    const publicKey = CLPublicKeyClass.fromHex(publicKeyHex);
    const routerHash = EctoplasmConfig.contracts.router;
    const gasLimit = EctoplasmConfig.gasLimits.approve;
    const network = EctoplasmConfig.getNetwork();

    const args = RuntimeArgsClass.fromMap({
      spender: CLValueBuilderClass.key(
        CLValueBuilderClass.byteArray(hexToBytes(routerHash))
      ),
      amount: CLValueBuilderClass.u256(amount.toString())
    });

    return DeployUtilClass.makeDeploy(
      new DeployUtilClass.DeployParams(
        publicKey,
        network.chainName,
        1,
        3600000
      ),
      DeployUtilClass.ExecutableDeployItem.newStoredContractByHash(
        hexToBytes(tokenHash),
        'approve',
        args
      ),
      DeployUtilClass.standardPayment(gasLimit)
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

    const publicKey = CLPublicKeyClass.fromHex(publicKeyHex);
    const routerHash = EctoplasmConfig.contracts.router;
    const gasLimit = EctoplasmConfig.gasLimits.swap;
    const network = EctoplasmConfig.getNetwork();

    const deadline = Date.now() + (EctoplasmConfig.swap.deadlineMinutes * 60 * 1000);
    const slippageMultiplier = BigInt(Math.floor((1 - slippagePercent / 100) * 10000));
    const amountOutMin = quote.amountOutRaw * slippageMultiplier / BigInt(10000);

    const pathList = new CLListClass([
      CLValueBuilderClass.byteArray(hexToBytes(quote.path[0])),
      CLValueBuilderClass.byteArray(hexToBytes(quote.path[1]))
    ]);

    const args = RuntimeArgsClass.fromMap({
      amount_in: CLValueBuilderClass.u256(quote.amountInRaw.toString()),
      amount_out_min: CLValueBuilderClass.u256(amountOutMin.toString()),
      path: pathList,
      to: CLValueBuilderClass.key(CLValueBuilderClass.byteArray(publicKey.toAccountHash())),
      deadline: CLValueBuilderClass.u64(deadline)
    });

    return DeployUtilClass.makeDeploy(
      new DeployUtilClass.DeployParams(
        publicKey,
        network.chainName,
        1,
        3600000
      ),
      DeployUtilClass.ExecutableDeployItem.newStoredContractByHash(
        hexToBytes(routerHash),
        'swap_exact_tokens_for_tokens',
        args
      ),
      DeployUtilClass.standardPayment(gasLimit)
    );
  }

  async submitDeploy(signedDeploy: any): Promise<string> {
    this.ensureInit();
    return await this.client.putDeploy(signedDeploy);
  }

  async waitForDeploy(deployHash: string, timeout: number = 300000): Promise<DeployResult> {
    this.ensureInit();

    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.client.nodeClient.getDeployInfo(deployHash);

        if (result?.execution_results?.length > 0) {
          const execResult = result.execution_results[0].result;

          if (execResult.Success) {
            return { success: true, deployHash };
          } else if (execResult.Failure) {
            return {
              success: false,
              deployHash,
              error: execResult.Failure.error_message || 'Transaction failed'
            };
          }
        }
      } catch (error) {
        // Deploy not found yet, continue polling
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return { success: false, deployHash, error: 'Timeout waiting for deploy' };
  }
}

// Export singleton instance
export const CasperService = new CasperServiceClass();
export default CasperService;
