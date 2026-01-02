/**
 * CasperService - Blockchain interaction module for Ectoplasm DEX
 * TypeScript port for React application
 */

import {
  Args,
  CLTypeByteArray,
  CLValue,
  ContractHash,
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  Key,
  PublicKey,
  StoredContractByHash
} from 'casper-js-sdk';
import { blake2bHex } from 'blakejs';
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
  // Contract hashes used for ERC-20/CEP-18 approvals and allowance checks.
  // In Odra mode, Router/Factory operate on package hashes (Odra Address), but token approvals still target the token contract hash.
  pathContracts?: string[];
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
  private initialized: boolean = false;
  private sdkAvailable: boolean = false;
  private initError: string | null = null;

  private pairAddressCache: Map<string, string | null> = new Map();

  normalizePublicKeyHex(value: string): string {
    const hex = value.replace(/^0x/i, '').trim();
    const prefix = hex.slice(0, 2).toLowerCase();
    if (prefix === '00' || prefix === '01' || prefix === '02') return hex;
    // Some providers return the raw 32-byte ED25519 key without the algorithm tag.
    if (hex.length === 64) return `01${hex}`;
    return hex;
  }

  normalizeContractHashHex(value: string): string {
    const v = (value || '').trim().replace(/^0x/i, '');
    return v.replace(/^(hash-|entity-contract-)/, '');
  }

  private parsePublicKey(hex: string): PublicKey {
    return PublicKey.fromHex(this.normalizePublicKeyHex(hex));
  }

  /**
   * Initialize the Casper client
   */
  init(): boolean {
    if (this.initialized) return this.sdkAvailable;

    // v5 SDK no longer exposes CasperClient; this service uses direct RPC `fetch` calls.
    // Treat initialization as available if we're in a browser environment.
    this.initialized = true;
    this.sdkAvailable = true;
    return true;
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
    if (!this.sdkAvailable) {
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
      const publicKey = this.parsePublicKey(publicKeyHex);
      const accountHash = publicKey.accountHash().toPrefixedString();
      const contractHash = tokenHash.replace(/^(hash-|entity-contract-)/, '');

      console.log('[getTokenBalance] Derived values:', { accountHash, contractHash });

      // Standard CEP-18 ContractNamedKey dictionary query is unreliable for Odra tokens.
      // When running in Odra mode, skip it to avoid noisy RPC errors.
      if (EctoplasmConfig.contractVersion !== 'odra') {
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
      }

      // Fallback for Odra-style CEP-18 storage:
      // Resolve dictionary seed URef from token named keys (balances/state) and query by URef.
      try {
        const odraBalance = await this.queryOdraTokenBalanceByURef(tokenHash, accountHash);
        console.log('[getTokenBalance] Odra(URef) query result:', odraBalance.toString());
        if (odraBalance > BigInt(0)) {
          return {
            raw: odraBalance,
            formatted: formatTokenAmount(odraBalance.toString(), decimals),
            decimals
          };
        }
      } catch (e) {
        console.log('[getTokenBalance] Odra(URef) query failed:', e);
      }

      return { raw: BigInt(0), formatted: '0', decimals };
    } catch (error: any) {
      console.error('[getTokenBalance] Error:', error);
      return { raw: BigInt(0), formatted: '0', decimals };
    }
  }

  private async getStateRootHash(): Promise<string> {
    const network = EctoplasmConfig.getNetwork();
    const res = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'chain_get_state_root_hash' })
    });
    const json = await res.json();
    const stateRootHash = json?.result?.state_root_hash;
    if (!stateRootHash) {
      throw new Error('Could not get state root hash');
    }
    return stateRootHash;
  }

  private async queryOdraTokenBalanceByURef(tokenHash: string, accountHash: string): Promise<bigint> {
    const network = EctoplasmConfig.getNetwork();
    const stateRootHash = await this.getStateRootHash();

    const cleanTokenHash = tokenHash.replace(/^(hash-|entity-contract-)/, '');
    const contractKeys = [`entity-contract-${cleanTokenHash}`, `hash-${cleanTokenHash}`];

    // 1) Find the seed URef for balances.
    let balancesURef: string | null = null;
    for (const key of contractKeys) {
      const res = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'state_get_item',
          params: { state_root_hash: stateRootHash, key, path: [] }
        })
      });
      const json = await res.json();
      if (json?.error) continue;

      const namedKeys = json?.result?.stored_value?.Contract?.named_keys;
      if (!Array.isArray(namedKeys)) continue;

      balancesURef = namedKeys.find((k: any) => k?.name === 'balances')?.key
        ?? namedKeys.find((k: any) => k?.name === 'state')?.key
        ?? null;
      if (balancesURef) break;
    }

    if (!balancesURef) {
      throw new Error(`No 'balances' or 'state' named key found for ${tokenHash}`);
    }

    // 2) Try candidate dictionary keys.
    const rawAccountHash = accountHash.replace('account-hash-', '');
    const candidates = this.getBalanceKeyCandidates(accountHash, rawAccountHash);

    for (const dictKey of candidates) {
      const val = await this.queryDictionaryValueByURef(stateRootHash, balancesURef, dictKey);
      if (val !== null) return val;
    }

    return BigInt(0);
  }

  private async queryDictionaryValueByURef(stateRootHash: string, seedURef: string, dictKey: string): Promise<bigint | null> {
    const network = EctoplasmConfig.getNetwork();
    try {
      const res = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'state_get_dictionary_item',
          params: {
            state_root_hash: stateRootHash,
            dictionary_identifier: {
              URef: {
                seed_uref: seedURef,
                dictionary_item_key: dictKey
              }
            }
          }
        })
      });
      const json = await res.json();
      if (json?.error) return null;

      const parsed = json?.result?.stored_value?.CLValue?.parsed;
      return this.parseU256Like(parsed);
    } catch {
      return null;
    }
  }

  private parseU256Like(parsed: any): bigint | null {
    try {
      if (parsed === null || parsed === undefined) return null;
      if (typeof parsed === 'string' || typeof parsed === 'number') {
        return BigInt(parsed.toString());
      }
      if (Array.isArray(parsed)) {
        // List<U8> little-endian bytes, sometimes with a 1-byte length prefix.
        let bytes = parsed as number[];
        if (bytes.length > 0 && bytes[0] === bytes.length - 1) {
          bytes = bytes.slice(1);
        }
        let result = BigInt(0);
        for (let i = 0; i < bytes.length; i++) {
          result += BigInt(bytes[i]) * (BigInt(256) ** BigInt(i));
        }
        return result;
      }
      return null;
    } catch {
      return null;
    }
  }

  private getBalanceKeyCandidates(accountHash: string, rawAccountHash: string): string[] {
    const candidates: string[] = [];

    // Common / naive candidates
    candidates.push('balances');
    candidates.push(`balances_${accountHash}`);
    candidates.push(`balance_${accountHash}`);
    candidates.push(`balances${accountHash}`);
    candidates.push(accountHash);
    candidates.push(rawAccountHash);

    // CEP-18 base64(Key(AccountHash))
    try {
      const keyBytes = new Uint8Array(33);
      keyBytes[0] = 0x00;
      keyBytes.set(hexToBytes(rawAccountHash), 1);
      candidates.push(btoa(String.fromCharCode(...keyBytes)));
    } catch {
      // ignore
    }

    // Odra hashed keys (index + tag + account-hash) -> blake2b-256
    candidates.push(this.generateOdraKey(5, rawAccountHash, false));
    for (let i = 0; i <= 10; i++) {
      if (i === 5) continue;
      candidates.push(this.generateOdraKey(i, rawAccountHash, false));
      candidates.push(this.generateOdraKey(i, rawAccountHash, true));
    }

    return candidates;
  }

  private generateOdraKey(index: number, accountHashHex: string, littleEndian: boolean): string {
    const indexBytes = new Uint8Array(4);
    new DataView(indexBytes.buffer).setUint32(0, index, littleEndian);
    const tagBytes = new Uint8Array([0]);
    const hashBytes = new Uint8Array(accountHashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const combined = new Uint8Array(indexBytes.length + tagBytes.length + hashBytes.length);
    combined.set(indexBytes);
    combined.set(tagBytes, indexBytes.length);
    combined.set(hashBytes, indexBytes.length + tagBytes.length);
    return blake2bHex(combined, undefined, 32);
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

    // ContractNamedKey expects a legacy contract key (hash-...).
    // On current nodes this call fails with `Failed to parse query key` when using `entity-contract-...`.
    for (const prefix of ['hash-']) {
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
        const publicKey = PublicKey.fromHex(publicKeyHex);
        const accountHash = publicKey.accountHash().toPrefixedString();
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

    const cacheKey = this.makePairCacheKey(tokenA, tokenB);
    if (this.pairAddressCache.has(cacheKey)) {
      const cached = this.pairAddressCache.get(cacheKey)!;
      console.log('[CasperService.getPairAddress] cache hit:', { cacheKey, cached });
      return cached;
    }

    // Configured pairs are keyed by token symbols; resolve from either contract-hash or package-hash inputs.
    const configuredPair = EctoplasmConfig.getConfiguredPairAddress(tokenA, tokenB);
    console.log('[CasperService.getPairAddress] configuredPair from config:', configuredPair);
    if (configuredPair) {
      this.pairAddressCache.set(cacheKey, configuredPair);
      return configuredPair;
    }

    if (EctoplasmConfig.contractVersion === 'odra') {
      const tokenAConfig = EctoplasmConfig.getTokenByPackageHash(tokenA) || EctoplasmConfig.getTokenByHash(tokenA);
      const tokenBConfig = EctoplasmConfig.getTokenByPackageHash(tokenB) || EctoplasmConfig.getTokenByHash(tokenB);
      if (tokenAConfig && tokenBConfig) {
        const key1 = `${tokenAConfig.symbol}/${tokenBConfig.symbol}`;
        const key2 = `${tokenBConfig.symbol}/${tokenAConfig.symbol}`;
        const pairAddress = EctoplasmConfig.contracts.pairs[key1] || EctoplasmConfig.contracts.pairs[key2] || null;
        console.log('[CasperService.getPairAddress] configuredPair via symbols:', { key1, key2, pairAddress });
        if (pairAddress) {
          this.pairAddressCache.set(cacheKey, pairAddress);
          return pairAddress;
        }
      }
    }

    this.ensureInit();

    try {
      const factoryHash = EctoplasmConfig.contracts.factory;
      console.log('[CasperService.getPairAddress] factoryHash:', factoryHash);

      const stateRootHash = await this.getStateRootHash();
      const [token0, token1] = this.sortTokens(tokenA, tokenB);
      const token0Hex = token0.replace(/^(hash-|entity-contract-)/, '');
      const token1Hex = token1.replace(/^(hash-|entity-contract-)/, '');

      // In Odra, all contract state is stored in a single 'state' dictionary
      // Dictionary keys are computed as blake2b(field_index ++ key_bytes)
      const isOdra = EctoplasmConfig.contractVersion === 'odra';
      const dictionaryName = isOdra ? 'state' : 'pairs';
      const candidates = isOdra
        ? this.getOdraPairKeyCandidates(token0Hex, token1Hex)
        : [`${token0Hex}_${token1Hex}`];

      console.log('[CasperService.getPairAddress] Query params:', {
        isOdra,
        dictionaryName,
        token0Hex,
        token1Hex,
        candidatesCount: candidates.length
      });

      for (const pairKey of candidates) {
        const response = await fetch(EctoplasmConfig.getNetwork().rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'state_get_dictionary_item',
            params: {
              state_root_hash: stateRootHash,
              dictionary_identifier: {
                ContractNamedKey: {
                  key: factoryHash.startsWith('hash-') ? factoryHash : `hash-${factoryHash}`,
                  dictionary_name: dictionaryName,
                  dictionary_item_key: pairKey
                }
              }
            }
          })
        });
        const json = await response.json();
        
        console.log('[CasperService.getPairAddress] Query result:', {
          pairKey: pairKey.substring(0, 16) + '...',
          hasError: !!json?.error,
          error: json?.error?.message,
          hasValue: !!json?.result?.stored_value
        });
        
        if (json?.error) continue;

        const parsed = json?.result?.stored_value?.CLValue?.parsed;
        if (typeof parsed === 'string' && parsed.length) {
          console.log('[CasperService.getPairAddress] ✓ Found pair:', { pairKey, parsed });
          this.pairAddressCache.set(cacheKey, parsed);
          return parsed;
        }
      }

      console.log('[CasperService.getPairAddress] ✗ Pair not found after checking all candidates');
      this.pairAddressCache.set(cacheKey, null);
      return null;
    } catch (error: any) {
      console.log('[CasperService.getPairAddress] Error:', error.message);
      if (error.message?.includes('ValueNotFound') || error.message?.includes('Failed to find')) {
        this.pairAddressCache.set(cacheKey, null);
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

  private makePairCacheKey(tokenA: string, tokenB: string): string {
    const [t0, t1] = this.sortTokens(tokenA, tokenB);
    return `${t0.toLowerCase()}::${t1.toLowerCase()}`;
  }

  private generateOdraMappingKey(index: number, payload: Uint8Array, littleEndian: boolean): string {
    const indexBytes = new Uint8Array(4);
    new DataView(indexBytes.buffer).setUint32(0, index, littleEndian);
    const combined = new Uint8Array(indexBytes.length + payload.length);
    combined.set(indexBytes);
    combined.set(payload, indexBytes.length);
    return blake2bHex(combined, undefined, 32);
  }

  private odraAddressBytes(hashHex: string, tag: number): Uint8Array {
    const clean = hashHex.replace(/^(hash-|entity-contract-)/, '').replace(/^0x/i, '');
    const hex = clean.length === 64 ? clean : clean.padStart(64, '0');
    const out = new Uint8Array(33);
    out[0] = tag;
    out.set(hexToBytes(hex), 1);
    return out;
  }

  private getOdraPairKeyCandidates(token0Hex: string, token1Hex: string): string[] {
    const candidates: string[] = [];
    
    // Odra Mapping key = blake2b(index_bytes[4] ++ key.to_bytes())
    // For Factory contract, 'pairs' is the 4th field (index 3):
    // 0: fee_to, 1: fee_to_setter, 2: pair_factory, 3: pairs
    // The tuple (Address, Address) serializes as:
    // - First Address bytes (33 bytes: 1 tag byte + 32 hash bytes)
    // - Second Address bytes (33 bytes: 1 tag byte + 32 hash bytes)
    
    const pairsFieldIndex = 3;
    
    // Odra uses big-endian for index
    const indexBytes = new Uint8Array(4);
    new DataView(indexBytes.buffer).setUint32(0, pairsFieldIndex, false); // big-endian
    
    // Casper Address serialization:
    // Tag byte: 0 for Account, 1 for Contract (package hash)
    // Token addresses are contract package hashes, so tag = 1
    const contractTag = 1;
    
    const addr0 = new Uint8Array(33);
    addr0[0] = contractTag;
    addr0.set(hexToBytes(token0Hex.padStart(64, '0')), 1);
    
    const addr1 = new Uint8Array(33);
    addr1[0] = contractTag;
    addr1.set(hexToBytes(token1Hex.padStart(64, '0')), 1);
    
    // Combine: index_bytes ++ addr0 ++ addr1
    const combined = new Uint8Array(4 + 33 + 33);
    combined.set(indexBytes, 0);
    combined.set(addr0, 4);
    combined.set(addr1, 4 + 33);
    
    const hashed = blake2bHex(combined, undefined, 32);
    candidates.push(hashed);
    
    console.log('[getOdraPairKeyCandidates] Generated key:', {
      pairsFieldIndex,
      token0Hex,
      token1Hex,
      indexBytesHex: Array.from(indexBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
      addr0Hex: Array.from(addr0).map(b => b.toString(16).padStart(2, '0')).join(''),
      addr1Hex: Array.from(addr1).map(b => b.toString(16).padStart(2, '0')).join(''),
      combinedHex: Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join(''),
      hashedKey: hashed
    });
    
    return candidates;
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

    // Odra contracts use package-hash "addresses" internally for Router/Factory.
    // Without package hashes we cannot discover pairs/reserves on-chain.
    const isOdra = EctoplasmConfig.contractVersion === 'odra';
    if (isOdra && (!tokenIn.packageHash || !tokenOut.packageHash)) {
      return {
        valid: false,
        error: `Missing package hash for ${tokenInSymbol} or ${tokenOutSymbol}`,
        amountIn: '0',
        amountInRaw: BigInt(0),
        amountOut: '0',
        amountOutRaw: BigInt(0),
        priceImpact: '0',
        rate: '0'
      };
    }

    if (!this.isAvailable()) {
      return this.getDemoQuote(tokenInSymbol, tokenOutSymbol, amountIn);
    }

    try {
      const amountInRaw = BigInt(parseTokenAmount(amountIn, tokenIn.decimals));

      // Pair discovery/reserves: Odra uses package hashes; non-Odra uses contract hashes.
      const reserves = await this.getPairReserves(
        isOdra ? tokenIn.packageHash! : tokenIn.hash,
        isOdra ? tokenOut.packageHash! : tokenOut.hash
      );

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
        // Router path uses Odra Address values (package hashes) in Odra mode.
        path: isOdra ? [tokenIn.packageHash!, tokenOut.packageHash!] : [tokenIn.hash, tokenOut.hash],
        // Approvals/allowances must target the token contract hashes.
        pathContracts: [tokenIn.hash, tokenOut.hash],
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
      const accountHash = this.parsePublicKey(ownerPublicKey).accountHash().toPrefixedString();
      const routerHash = EctoplasmConfig.contracts.router;
      const ownerKey = accountHash.replace('account-hash-', '');
      const spenderKey = routerHash.replace('hash-', '');
      const allowanceKey = `${ownerKey}_${spenderKey}`;

      const stateRootHash = await this.getStateRootHash();
      const res = await fetch(EctoplasmConfig.getNetwork().rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'state_get_dictionary_item',
          params: {
            state_root_hash: stateRootHash,
            dictionary_identifier: {
              ContractNamedKey: {
                key: tokenHash.startsWith('hash-') ? tokenHash : `hash-${tokenHash}`,
                dictionary_name: 'allowances',
                dictionary_item_key: allowanceKey
              }
            }
          }
        })
      });
      const json = await res.json();
      const parsed = json?.result?.stored_value?.CLValue?.parsed;
      const currentAllowance = this.parseU256Like(parsed) ?? BigInt(0);
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

    const publicKey = this.parsePublicKey(publicKeyHex);
    const routerHash = EctoplasmConfig.contracts.router;
    const gasLimit = EctoplasmConfig.gasLimits.approve;
    const network = EctoplasmConfig.getNetwork();

    const args = Args.fromMap({
      spender: CLValue.newCLKey(Key.newKey(routerHash)),
      amount: CLValue.newCLUInt256(amount.toString())
    });

    const session = new ExecutableDeployItem();
    session.storedContractByHash = new StoredContractByHash(
      ContractHash.newContract(this.normalizeContractHashHex(tokenHash)),
      'approve',
      args
    );
    const payment = ExecutableDeployItem.standardPayment(gasLimit);
    const header = DeployHeader.default();
    header.account = publicKey;
    header.chainName = network.chainName;
    header.gasPrice = 1;
    return Deploy.makeDeploy(header, payment, session);
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

    const publicKey = this.parsePublicKey(publicKeyHex);
    const routerHash = EctoplasmConfig.contracts.router;
    const gasLimit = EctoplasmConfig.gasLimits.swap;
    const network = EctoplasmConfig.getNetwork();

    const deadline = Date.now() + (EctoplasmConfig.swap.deadlineMinutes * 60 * 1000);
    const slippageMultiplier = BigInt(Math.floor((1 - slippagePercent / 100) * 10000));
    const amountOutMin = quote.amountOutRaw * slippageMultiplier / BigInt(10000);

    const path = CLValue.newCLList(new CLTypeByteArray(32), [
      CLValue.newCLByteArray(hexToBytes(quote.path[0])),
      CLValue.newCLByteArray(hexToBytes(quote.path[1]))
    ]);

    const args = Args.fromMap({
      amount_in: CLValue.newCLUInt256(quote.amountInRaw.toString()),
      amount_out_min: CLValue.newCLUInt256(amountOutMin.toString()),
      path,
      to: CLValue.newCLKey(Key.newKey(publicKey.accountHash().toPrefixedString())),
      deadline: CLValue.newCLUint64(deadline)
    });

    const session = new ExecutableDeployItem();
    session.storedContractByHash = new StoredContractByHash(
      ContractHash.newContract(this.normalizeContractHashHex(routerHash)),
      'swap_exact_tokens_for_tokens',
      args
    );
    const payment = ExecutableDeployItem.standardPayment(gasLimit);
    const header = DeployHeader.default();
    header.account = publicKey;
    header.chainName = network.chainName;
    header.gasPrice = 1;
    return Deploy.makeDeploy(header, payment, session);
  }

  deployFromWalletResponse(unsignedDeploy: Deploy, walletResult: any, signerPublicKeyHex: string): Deploy {
    if (walletResult?.cancelled) {
      throw new Error('Transaction cancelled by user');
    }

    const signerPk = this.parsePublicKey(signerPublicKeyHex);

    // Some wallet versions return just the signature hex as a string.
    if (typeof walletResult === 'string') {
      const trimmed = walletResult.trim();
      const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
      if (!looksJson) {
        const clean = trimmed.replace(/^0x/i, '');
        return Deploy.setSignature(unsignedDeploy, hexToBytes(clean), signerPk);
      }
    }

    // CasperWallet usually returns `{ signature: "<hex>" }` for a signed deploy.
    const directSig = walletResult?.signature;
    if (typeof directSig === 'string' && directSig.length) {
      const clean = directSig.trim().replace(/^0x/i, '');
      return Deploy.setSignature(unsignedDeploy, hexToBytes(clean), signerPk);
    }

    if (directSig instanceof Uint8Array) {
      return Deploy.setSignature(unsignedDeploy, directSig, signerPk);
    }

    // Some variants return a JSON string or object containing `approvals[0].signature`.
    const payload = typeof walletResult === 'string'
      ? JSON.parse(walletResult)
      : (walletResult?.deploy ?? walletResult);

    const approvals = payload?.approvals ?? payload?.deploy?.approvals;
    const approvalSig = Array.isArray(approvals) ? approvals?.[0]?.signature : undefined;
    if (typeof approvalSig === 'string' && approvalSig.length) {
      const clean = approvalSig.trim().replace(/^0x/i, '');
      // Wallet sometimes includes the algo tag byte; Deploy.setSignature expects raw signature bytes.
      const signerTag = this.normalizePublicKeyHex(signerPublicKeyHex).slice(0, 2).toLowerCase();
      const rawSig = clean.slice(0, 2).toLowerCase() === signerTag ? clean.slice(2) : clean;
      return Deploy.setSignature(unsignedDeploy, hexToBytes(rawSig), signerPk);
    }

    throw new Error('Wallet did not return a signature');
  }

  async submitDeploy(signedDeploy: any): Promise<string> {
    console.log('[CasperService.submitDeploy] signedDeploy:', signedDeploy);
    console.log('[CasperService.submitDeploy] signedDeploy type:', typeof signedDeploy);
    console.log('[CasperService.submitDeploy] has hash?', signedDeploy?.hash);
    console.log('[CasperService.submitDeploy] has approvals?', signedDeploy?.approvals);

    this.ensureInit();

    // Convert Deploy object to JSON for RPC submission
    let deployJson: any;
    if (signedDeploy instanceof Deploy) {
      console.log('[CasperService.submitDeploy] Converting Deploy object to JSON...');
      deployJson = Deploy.toJSON(signedDeploy);
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

    // Extract just the deploy if wrapped
    const deployData = deployJson.deploy || deployJson;

    const findSuspiciousBase16 = (value: any, path: string, out: Array<{ path: string; value: string; reason: string }>) => {
      if (value === null || value === undefined) return;
      if (typeof value === 'string') {
        const v = value.trim();
        const hasHashPrefix = /^(hash-|entity-contract-)/.test(v);
        const maybeHex = /^[0-9a-fA-F]+$/.test(v.replace(/^0x/i, ''));
        const hex = v.replace(/^0x/i, '');
        if (hasHashPrefix) out.push({ path, value: v, reason: 'has hash-/entity-contract- prefix' });
        if (maybeHex && (hex.length % 2 !== 0)) out.push({ path, value: v, reason: `odd-length hex (${hex.length})` });
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, i) => findSuspiciousBase16(item, `${path}[${i}]`, out));
        return;
      }
      if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          findSuspiciousBase16(v, path ? `${path}.${k}` : k, out);
        }
      }
    };

    // Minimal debug info to quickly identify malformed fields.
    try {
      console.log('[CasperService.submitDeploy] deploy.header.account:', deployData?.header?.account);
      console.log('[CasperService.submitDeploy] deploy.hash:', deployData?.hash);
      console.log('[CasperService.submitDeploy] deploy.body_hash:', deployData?.body_hash);
      console.log('[CasperService.submitDeploy] deploy.approvals:', deployData?.approvals);
      const suspects: Array<{ path: string; value: string; reason: string }> = [];
      findSuspiciousBase16(deployData, 'deploy', suspects);
      if (suspects.length) {
        console.warn('[CasperService.submitDeploy] Suspicious base16 fields:', suspects);
      }
    } catch (e) {
      console.warn('[CasperService.submitDeploy] Debug scan failed:', e);
    }

    // Guard against non-canonical wallet deploy JSON (camelCase keys, different session shape).
    if (deployData?.header?.chainName && !deployData?.header?.chain_name) {
      throw new Error('Non-canonical deploy JSON detected; submit a Deploy instance or Deploy.toJSON() output');
    }

    // Normalize approval signatures: node expects tag byte (00/01/02) prefix.
    if (Array.isArray(deployData?.approvals)) {
      for (const approval of deployData.approvals) {
        if (!approval || typeof approval.signature !== 'string') continue;
        const sig = approval.signature.replace(/^0x/i, '');
        const first = sig.slice(0, 2).toLowerCase();
        const allowed = new Set(['00', '01', '02']);
        if (!allowed.has(first)) {
          const signer = (approval.signer || '').replace(/^0x/i, '');
          const signerTag = signer.slice(0, 2).toLowerCase();
          const tag = allowed.has(signerTag) ? signerTag : '01';
          approval.signature = `${tag}${sig}`;
        }
      }
    }

    console.log('[CasperService.submitDeploy] Submitting via direct RPC...');
    const network = EctoplasmConfig.getNetwork();

    // Use direct fetch to submit deploy via account_put_deploy RPC method
    const response = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'account_put_deploy',
        params: {
          deploy: deployData
        }
      })
    });

    const result = await response.json();
    console.log('[CasperService.submitDeploy] RPC response:', result);

    if (result.error) {
      console.error('[CasperService.submitDeploy] RPC error:', result.error);
      throw new Error(result.error.message || `RPC error: ${JSON.stringify(result.error)}`);
    }

    const deployHash = result.result?.deploy_hash;
    if (!deployHash) {
      throw new Error('No deploy hash returned from RPC');
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
        const res = await fetch(EctoplasmConfig.getNetwork().rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'info_get_deploy',
            params: { deploy_hash: deployHash }
          })
        });
        const rpc = await res.json();
        const result = rpc?.result as any;
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

    const publicKey = this.parsePublicKey(publicKeyHex);
    const routerHash = EctoplasmConfig.contracts.router;
    const gasLimit = EctoplasmConfig.gasLimits.addLiquidity;
    const network = EctoplasmConfig.getNetwork();

    // Default deadline: 20 minutes from now
    const deadline = deadlineMs || (Date.now() + EctoplasmConfig.swap.deadlineMinutes * 60 * 1000);

    console.log('  routerHash:', routerHash);
    console.log('  gasLimit:', gasLimit);
    console.log('  deadline:', deadline);


    const args = Args.fromMap({
      token_a: CLValue.newCLKey(Key.newKey(tokenAHash)),
      token_b: CLValue.newCLKey(Key.newKey(tokenBHash)),
      amount_a_desired: CLValue.newCLUInt256(amountADesired.toString()),
      amount_b_desired: CLValue.newCLUInt256(amountBDesired.toString()),
      amount_a_min: CLValue.newCLUInt256(amountAMin.toString()),
      amount_b_min: CLValue.newCLUInt256(amountBMin.toString()),
      to: CLValue.newCLKey(Key.newKey(publicKey.accountHash().toPrefixedString())),
      deadline: CLValue.newCLUint64(deadline)
    });

    const session = new ExecutableDeployItem();
    session.storedContractByHash = new StoredContractByHash(
      ContractHash.newContract(this.normalizeContractHashHex(routerHash)),
      'add_liquidity',
      args
    );
    const payment = ExecutableDeployItem.standardPayment(gasLimit);
    const header = DeployHeader.default();
    header.account = publicKey;
    header.chainName = network.chainName;
    header.gasPrice = 1;
    const deploy = Deploy.makeDeploy(header, payment, session);

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

    const publicKey = this.parsePublicKey(publicKeyHex);
    const gasLimit = EctoplasmConfig.gasLimits.approve; // Similar gas to approve
    const network = EctoplasmConfig.getNetwork();

    console.log('  gasLimit:', gasLimit);
    console.log('  chainName:', network.chainName);

    const args = Args.fromMap({
      recipient: CLValue.newCLKey(Key.newKey(recipientHash)),
      amount: CLValue.newCLUInt256(amount.toString())
    });

    const session = new ExecutableDeployItem();
    session.storedContractByHash = new StoredContractByHash(
      ContractHash.newContract(this.normalizeContractHashHex(tokenHash)),
      'transfer',
      args
    );

    const payment = ExecutableDeployItem.standardPayment(gasLimit);
    const header = DeployHeader.default();
    header.account = publicKey;
    header.chainName = network.chainName;
    header.gasPrice = 1;
    const deploy = Deploy.makeDeploy(header, payment, session);

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

    const publicKey = this.parsePublicKey(recipientPublicKeyHex);
    const gasLimit = EctoplasmConfig.gasLimits.addLiquidity;
    const network = EctoplasmConfig.getNetwork();

    console.log('  gasLimit:', gasLimit);
    console.log('  chainName:', network.chainName);

    const args = Args.fromMap({
      to: CLValue.newCLKey(Key.newKey(publicKey.accountHash().toPrefixedString()))
    });

    const session = new ExecutableDeployItem();
    session.storedContractByHash = new StoredContractByHash(
      ContractHash.newContract(this.normalizeContractHashHex(pairHash)),
      'mint',
      args
    );

    const payment = ExecutableDeployItem.standardPayment(gasLimit);
    const header = DeployHeader.default();
    header.account = publicKey;
    header.chainName = network.chainName;
    header.gasPrice = 1;
    const deploy = Deploy.makeDeploy(header, payment, session);

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
      const publicKey = this.parsePublicKey(publicKeyHex);
      const accountHash = publicKey.accountHash().toPrefixedString();
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
