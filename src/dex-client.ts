/**
 * Ectoplasm DEX Client for Casper JS SDK v5
 * 
 * This client provides typed functions for interacting with the DEX contracts:
 * - Router: swap, addLiquidity, removeLiquidity
 * - Pair: getReserves
 * - Token: approve, balanceOf
 */

import * as sdk from 'casper-js-sdk';
import { blake2bHex } from 'blakejs';

const {
    RpcClient,
    HttpHandler,
    DeployUtil,
    Keys,
    CLValue,
    RuntimeArgs,
    CLAccountHash,
    CLKey,
    CLByteArray,
    CLURef,
    DeployHeader,
    ExecutableDeployItem,
    Deploy,
    Contracts,
    StoredVersionedContractByHash,
    ContractPackageHash,
    Args,
    CLTypeKey,
    Key,
    PublicKey,
    AccountHash,
    PurseIdentifier
} = (sdk as any).default ?? sdk; // Fallback to sdk if default missing

// ============ Configuration ============

export interface DexConfig {
    nodeUrl: string;
    chainName: string;
    routerPackageHash: string;
    routerContractHash: string;
    factoryHash: string;
    tokens: {
        [symbol: string]: {
            packageHash: string;
            contractHash: string;
            decimals: number;
        };
    };
    pairs: {
        [name: string]: string; // e.g., "WCSPR-ECTO": "hash-..."
    };
    // Launchpad contracts (optional - may not be deployed)
    launchpad?: {
        controllerHash: string;
        tokenFactoryHash: string;
    };
}

// ============ Launchpad Types ============

export type CurveType = 'linear' | 'sigmoid' | 'steep';

export interface LaunchParams {
    name: string;
    symbol: string;
    curveType: CurveType;
    graduationThreshold?: bigint; // Optional override (in motes)
    creatorFeeBps?: number;       // Optional override (basis points)
    deadlineDays?: number;        // Optional override
    promoBudget?: bigint;         // Marketing budget (in motes)
    description?: string;
    website?: string;
    twitter?: string;
}

export interface LaunchInfo {
    id: number;
    tokenHash: string;
    curveHash: string;
    creator: string;
    name: string;
    symbol: string;
    curveType: CurveType;
    status: 'active' | 'graduated' | 'refunding';
    createdAt: number;
}

export interface CurveState {
    tokenHash: string;
    curveType: CurveType;
    csprRaised: bigint;
    tokensSold: bigint;
    totalSupply: bigint;
    graduationThreshold: bigint;
    currentPrice: bigint;
    progress: number; // 0-100%
    status: 'active' | 'graduated' | 'refunding';
    deadline: number; // Unix timestamp
    promoBudget: bigint;
    promoReleased: bigint;
}

// ============ DEX Client ============

export class DexClient {
    private rpcClient: any;
    private config: DexConfig;

    private normalizeContractKey(key: string): string {
        const k = (key || '').trim().replace(/^0x/i, '');
        if (k.startsWith('hash-') || k.startsWith('entity-contract-') || k.startsWith('contract-')) return k;
        return `hash-${k}`;
    }

    private normalizeStateRootHash(value: any): string {
        if (!value) return value;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            // SDK variants: Digest / stateRootHash object
            if (typeof (value as any).toHex === 'function') return (value as any).toHex();
            if (typeof (value as any).toString === 'function') return (value as any).toString();
        }
        return String(value);
    }

    constructor(config: DexConfig) {
        this.config = config;
        // Use the configured node URL (it might be a proxy e.g. /_casper/testnet)
        this.rpcClient = new RpcClient(new HttpHandler(config.nodeUrl));
    }

    // ============ Read Functions ============

    /**
     * Get the current reserves for a pair
     */
    async getPairReserves(pairHash: string): Promise<{ reserve0: bigint; reserve1: bigint }> {
        try {
            const stateRootWrapper = await this.rpcClient.getStateRootHashLatest();
            const stateRootHash = this.normalizeStateRootHash(stateRootWrapper.stateRootHash);

            // The Factory returns package hashes, but we need contract hashes to query state
            // Resolve package hash to contract hash
            let contractHash = pairHash;
            if (pairHash.startsWith('hash-')) {
                // Query the package to get the active contract hash
                try {
                    const packageData: any = await this.rpcRequest('state_get_item', {
                        state_root_hash: stateRootHash,
                        key: pairHash,
                        path: []
                    });

                    // Extract contract hash from package
                    const versions = packageData.stored_value?.ContractPackage?.versions;
                    if (versions && versions.length > 0) {
                        // Get the latest version's contract hash
                        const latestVersion = versions[versions.length - 1];
                        contractHash = latestVersion.contract_hash;

                        // Convert contract- prefix to hash- for RPC compatibility
                        if (contractHash.startsWith('contract-')) {
                            contractHash = contractHash.replace('contract-', 'hash-');
                        }

                        // console.log(`DEBUG: Resolved package ${pairHash} to contract ${contractHash}`);
                    }
                } catch (e) {
                    console.warn(`DEBUG: Could not resolve package hash, trying as-is`, e);
                }
            }

            // Actual Odra Storage Layout (discovered via testing):
            // 0-2: lp_token (SubModule - takes multiple indices)
            // 3: token0 (Var<Address>)
            // 4: reserve1 (Var<U256>)  ← Note: reserve1 comes before reserve0!
            // 5: reserve0 (Var<U256>)
            // 6: token1 (Var<Address>) - likely

            const reserve0Key = this.generateOdraVarKey(5);  // Changed from 3 to 5
            const reserve1Key = this.generateOdraVarKey(4);  // Stays at 4

            const reserve0Val = await this.queryStateValue(stateRootHash, contractHash, reserve0Key);
            const reserve1Val = await this.queryStateValue(stateRootHash, contractHash, reserve1Key);

            return {
                reserve0: reserve0Val || 0n,
                reserve1: reserve1Val || 0n
            };
        } catch (e) {
            console.error(`Error fetching reserves for ${pairHash}:`, e);
            return { reserve0: 0n, reserve1: 0n };
        }
    }

    private generateOdraVarKey(index: number): string {
        // Index: 4 bytes (Big Endian)
        // No Tag

        const indexBytes = new Uint8Array(4);
        new DataView(indexBytes.buffer).setUint32(0, index, false); // Big Endian

        // If it is a Var, it might just be the index hashed.
        const combined = new Uint8Array(indexBytes.length);
        combined.set(indexBytes);

        return blake2bHex(combined, undefined, 32);
    }

    private async queryStateValue(stateRoot: string, contractHash: string, key: string): Promise<any | null> {
        const cleanContractHash = this.normalizeContractKey(contractHash);

        try {
            const contractData: any = await this.rpcRequest('state_get_item', {
                state_root_hash: stateRoot,
                key: cleanContractHash,
                path: []
            });

            const namedKeys = contractData.stored_value?.Contract?.named_keys;
            // For Vars, they are usually in the 'state' dictionary
            const stateURef = namedKeys?.find((k: any) => k.name === 'state')?.key;

            if (!stateURef) return null;

            const val = await this.queryDictionaryValue(stateRoot, stateURef, key);
            return val;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get the pair address for two tokens
     */
    async getPairAddress(tokenA: string, tokenB: string): Promise<string | null> {
        try {
            const stateRootWrapper = await this.rpcClient.getStateRootHashLatest();
            const stateRootHash = this.normalizeStateRootHash(stateRootWrapper.stateRootHash);

            const factoryHash = this.config.factoryHash;

            // Serialize Keys
            const keyA = this.serializeKey(tokenA);
            const keyB = this.serializeKey(tokenB);

            // Sort Keys (Odra/Casper logic: compare bytes)
            let first = keyA;
            let second = keyB;
            if (this.compareBytes(keyA, keyB) > 0) {
                first = keyB;
                second = keyA;
            }

            // Construct Mapping Key: (Address, Address) -> Serialized A + Serialized B
            const mappingKey = new Uint8Array(first.length + second.length);
            mappingKey.set(first);
            mappingKey.set(second, first.length);

            // Factory 'pairs' mapping is likely Index 3
            // 0: fee_to
            // 1: fee_to_setter
            // 2: pair_factory
            // 3: pairs
            // Factory 'pairs' mapping found at Index 4 (No Tag)
            const storageKey = this.generateOdraMappingKey(4, mappingKey);

            // Query State
            const val = await this.queryStateValue(stateRootHash, factoryHash, storageKey);

            if (typeof val === 'string') {
                return val;
            }
            return null;
        } catch (e) {
            console.error(`Error fetching pair address`, e);
            return null;
        }
    }

    /**
     * Get all existing pairs from Factory
     * Returns array of pair addresses
     */
    async getAllPairs(): Promise<string[]> {
        const stateRoot = await this.normalizeStateRootHash(
            (await this.rpcClient.getStateRootHashLatest()).stateRootHash
        );

        const factoryHash = this.config.factoryHash;

        try {
            // all_pairs_length is at index 6 (Var<Option<Address>> takes 2 indices)
            const lengthKey = this.generateOdraVarKey(6);
            const length = await this.queryStateValue(stateRoot, factoryHash, lengthKey);

            if (!length || typeof length !== 'bigint' || length === 0n) {
                return []; // No pairs exist
            }

            const pairCount = Number(length);
            const pairs: string[] = [];

            // all_pairs mapping is at index 5
            for (let i = 0; i < pairCount; i++) {
                const indexBytes = new Uint8Array(4);
                new DataView(indexBytes.buffer).setUint32(0, i, true); // Little Endian for u32

                const pairKey = this.generateOdraMappingKey(5, indexBytes);
                const pairAddr = await this.queryStateValue(stateRoot, factoryHash, pairKey);

                if (pairAddr && typeof pairAddr === 'string') {
                    pairs.push(pairAddr);
                }
            }

            return pairs;
        } catch (e) {
            console.error('Error fetching all pairs:', e);
            return [];
        }
    }

    /**
     * Determine if tokenA is token0 (lesser sort order)
     */
    public isToken0(tokenA: string, tokenB: string): boolean {
        const keyA = this.serializeKey(tokenA);
        const keyB = this.serializeKey(tokenB);
        return this.compareBytes(keyA, keyB) < 0;
    }

    // Helper: Compare two byte arrays
    private compareBytes(a: Uint8Array, b: Uint8Array): number {
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
            if (a[i] !== b[i]) return a[i] - b[i];
        }
        return a.length - b.length;
    }

    // Helper: Serialize a Key string (hash-... or account-hash-...) into bytes [Tag, 32bytes]
    private serializeKey(keyStr: string): Uint8Array {
        let tag = 1; // Default to Hash (Contract/Package)
        let clean = keyStr;
        if (keyStr.startsWith('account-hash-')) {
            tag = 0; // Account
            clean = keyStr.replace('account-hash-', '');
        } else if (keyStr.startsWith('hash-')) {
            tag = 1; // Hash
            clean = keyStr.replace('hash-', '');
        } else if (keyStr.startsWith('contract-package-')) {
            tag = 1; // Treat Package as Hash in Key serialization usually? 
            // Actually, Key has variants. 
            // Account = 0
            // Hash = 1
            // URef = 2
            // ...
            // There is no separate Package variant in standard Key, usually stored as Hash.
            clean = keyStr.replace('contract-package-', '');
        }

        const bytes = new Uint8Array(33);
        bytes[0] = tag;
        const hashBytes = new Uint8Array(clean.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
        bytes.set(hashBytes, 1);
        return bytes;
    }

    // Optimized Generator for Mapping Keys (Index + KeyBytes) - NO TAG used
    private generateOdraMappingKey(index: number, keyBytes: Uint8Array): string {
        const indexBytes = new Uint8Array(4);
        new DataView(indexBytes.buffer).setUint32(0, index, false); // Big Endian

        const combined = new Uint8Array(indexBytes.length + keyBytes.length);
        combined.set(indexBytes);
        combined.set(keyBytes, indexBytes.length);

        return blake2bHex(combined, undefined, 32);
    }

    /**
     * Get native CSPR balance
     */
    async getCSPRBalance(publicKeyHex: string): Promise<bigint> {
        try {
            const publicKey = PublicKey.fromHex(publicKeyHex);

            // 1. Get Account Info to find Main Purse
            const accountInfo = await this.rpcClient.getAccountInfo(null, { publicKey });
            const account = accountInfo.account || accountInfo;

            if (!account || !account.mainPurse) {
                return 0n;
            }

            // 2. Query Balance using state_get_balance directly via rpcRequest
            const stateRoot = await this.rpcClient.getStateRootHashLatest();
            const balanceResult = await this.rpcRequest('state_get_balance', {
                state_root_hash: this.normalizeStateRootHash(stateRoot.stateRootHash),
                purse_uref: account.mainPurse
            });

            return BigInt(balanceResult.balance_value);
        } catch (e) {
            console.error('Error fetching CSPR balance:', e);
            return 0n;
        }
    }

    /**
     * Get token balance for an account
     */
    async getTokenBalance(tokenContractHash: string, accountHash: string): Promise<bigint> {
        try {
            const stateRootWrapper = await this.rpcClient.getStateRootHashLatest();
            const stateRootHash = this.normalizeStateRootHash(stateRootWrapper.stateRootHash);

            const cleanTokenHash = this.normalizeContractKey(tokenContractHash);

            // Get Contract State
            const contractData: any = await this.rpcRequest('state_get_item', {
                state_root_hash: stateRootHash,
                key: cleanTokenHash,
                path: []
            });

            const namedKeys = contractData.stored_value?.Contract?.named_keys;

            // Determine Dictionary Root (prefer 'balances', fallback to 'state')
            let balancesURef = namedKeys?.find((k: any) => k.name === 'balances')?.key;
            if (!balancesURef) {
                balancesURef = namedKeys?.find((k: any) => k.name === 'state')?.key;
            }

            if (!balancesURef) {
                console.warn(`No 'balances' or 'state' dictionary found for ${tokenContractHash}`);
                return 0n;
            }

            // Try all candidate keys
            const rawAccountHash = accountHash.replace('account-hash-', '');
            const candidates = this.getBalanceKeyCandidates(accountHash, rawAccountHash);

            for (const key of candidates) {
                // Add delay to avoid 429 Too Many Requests
                await this.sleep(100);

                const val = await this.queryDictionaryValue(stateRootHash, balancesURef, key);
                if (val !== null) {
                    // console.log(`Found balance at key ${key}`);
                    return val;
                }
            }

            return 0n;
        } catch (e) {
            console.error(`Error fetching token balance for ${tokenContractHash}:`, e);
            return 0n;
        }
    }

    /**
     * Get token allowance for owner -> spender
     */
    async getAllowance(
        tokenPackageHash: string,
        ownerAccountHash: string,
        spenderPackageHash: string
    ): Promise<bigint> {
        try {
            const stateRootWrapper = await this.rpcClient.getStateRootHashLatest();
            const stateRootHash = this.normalizeStateRootHash(stateRootWrapper.stateRootHash);

            const cleanTokenHash = this.normalizeContractKey(tokenPackageHash);

            // Get Contract State to find the entry point
            const contractData: any = await this.rpcRequest('state_get_item', {
                state_root_hash: stateRootHash,
                key: cleanTokenHash,
                path: []
            });

            const namedKeys = contractData.stored_value?.Contract?.named_keys;
            const entryPointsURef = namedKeys?.find((k: any) => k.name === '__entry_points')?.key;

            if (!entryPointsURef) {
                console.warn(`No entry points found for ${tokenPackageHash}`);
                return 0n;
            }

            // Call the allowance method on the contract
            // The allowance method signature: allowance(owner: Address, spender: Address) -> U256
            const result = await this.rpcRequest('query_global_state', {
                state_root_hash: stateRootHash,
                key: cleanTokenHash,
                path: ['allowance']
            });

            // For now, return 0 as we need to properly invoke the contract method
            // This requires using state_get_dictionary_item with the correct key format
            // which Odra generates from the (Address, Address) tuple

            // TODO: Implement proper contract method invocation or use the correct Odra key format
            console.warn('getAllowance: Contract method invocation not yet implemented, returning 0');
            return 0n;
        } catch (e) {
            console.error(`Error fetching allowance for ${tokenPackageHash}:`, e);
            return 0n;
        }
    }

    /**
     * Get total supply of a token (ERC20 / LP Token)
     */
    async getTotalSupply(tokenContractHash: string): Promise<bigint> {
        try {
            const stateRootWrapper = await this.rpcClient.getStateRootHashLatest();
            const stateRootHash = this.normalizeStateRootHash(stateRootWrapper.stateRootHash);
            const cleanHash = this.normalizeContractKey(tokenContractHash);

            const contractData: any = await this.rpcRequest('state_get_item', {
                state_root_hash: stateRootHash,
                key: cleanHash,
                path: []
            });
            const namedKeys = contractData.stored_value?.Contract?.named_keys;
            const totalSupplyURef = namedKeys?.find((k: any) => k.name === 'total_supply')?.key;

            if (!totalSupplyURef) return 0n;

            const res = await this.rpcRequest('state_get_item', {
                state_root_hash: stateRootHash,
                key: totalSupplyURef,
                path: []
            });

            if (res.stored_value?.CLValue?.parsed) {
                return BigInt(res.stored_value.CLValue.parsed);
            }
            return 0n;
        } catch (e) {
            console.error('Error fetching total supply:', e);
            return 0n;
        }
    }



    private async queryDictionaryValue(stateRoot: string, uref: string, key: string): Promise<any | null> {

        try {
            const dictData: any = await this.rpcRequest('state_get_dictionary_item', {
                state_root_hash: stateRoot,
                dictionary_identifier: {
                    URef: {
                        seed_uref: uref,
                        dictionary_item_key: key
                    }
                }
            });

            if (dictData.stored_value?.CLValue) {
                const clValue = dictData.stored_value.CLValue;

                // Handle Key Type (e.g. ContractPackageHash)
                if (clValue.cl_type?.Key || clValue.cl_type === "Key") {
                    if (typeof clValue.parsed === 'string') {
                        return clValue.parsed;
                    }
                    if (typeof clValue.parsed === 'object' && clValue.parsed.Hash) {
                        return `hash-${clValue.parsed.Hash}`;
                    }
                    if (typeof clValue.parsed === 'object' && clValue.parsed.Account) {
                        return `account-hash-${clValue.parsed.Account}`;
                    }
                    if (typeof clValue.parsed === 'object' && clValue.parsed.ContractPackage) {
                        return `hash-${clValue.parsed.ContractPackage}`;
                    }
                }

                // Handle U256 / Numeric
                let val: bigint;

                try {
                    if (typeof clValue.parsed === 'string') {
                        // Check if it looks like a hash
                        if (clValue.parsed.startsWith('hash-') || clValue.parsed.startsWith('contract-')) {
                            return clValue.parsed;
                        }
                        return BigInt(clValue.parsed);
                    } else if (typeof clValue.parsed === 'number') {
                        val = BigInt(clValue.parsed);
                    } else if (Array.isArray(clValue.parsed)) {
                        const bytes = clValue.parsed as number[];

                        // SPECIAL CASE: 33-byte array is likely a serialized Key (1 byte tag + 32 bytes hash)
                        if (bytes.length === 33 && (bytes[0] === 0 || bytes[0] === 1)) {
                            const tag = bytes[0];
                            const hashBytes = bytes.slice(1);
                            const hashHex = hashBytes.map(b => b.toString(16).padStart(2, '0')).join('');

                            if (tag === 0) {
                                return `account-hash-${hashHex}`;
                            } else if (tag === 1) {
                                return `hash-${hashHex}`;
                            }
                        }

                        // Handle serialized U256 as List<U8> (Little Endian bytes)
                        let content = bytes;

                        // Heuristic: If first byte equals remaining length, it's likely a length prefix.
                        if (bytes.length > 0 && bytes[0] === bytes.length - 1) {
                            content = bytes.slice(1);
                        }

                        // Parse Little Endian Bytes
                        let result = BigInt(0);
                        for (let i = 0; i < content.length; i++) {
                            result += BigInt(content[i]) * (BigInt(256) ** BigInt(i));
                        }
                        val = result;
                    } else {
                        return null;
                    }
                    // console.log(`Token Balance Found: ${val.toString()}`);
                    return val;
                } catch (parseError: any) {
                    return null;
                }
            }
        } catch (e: any) {
            // Key not found
        }
        return null;
    }

    private getBalanceKeyCandidates(accountHash: string, rawAccountHash: string): string[] {
        const candidates: string[] = [];

        // 1. Optimized Odra Key (Index 5 Big Endian) - Most likely hit for our contracts
        candidates.push(this.generateOdraKey(5, rawAccountHash, false));

        // 2. Standard Named Keys (Fallbacks)
        // candidates.push('balances');
        // candidates.push(`balances_${accountHash}`);
        // candidates.push(`balance_${accountHash}`);
        // candidates.push(`balances${accountHash}`);
        // candidates.push(accountHash);
        // candidates.push(rawAccountHash);

        // 3. Fallback Range (only if above fail)
        // Only check a few likely others if primary fails
        // candidates.push(this.generateOdraKey(0, rawAccountHash, false)); 


        return candidates;
    }

    private generateOdraKey(index: number, accountHashHex: string, littleEndian: boolean): string {
        // Index: 4 bytes
        // Tag: 1 byte (0 for Account)
        // Hash: 32 bytes
        const indexBytes = new Uint8Array(4);
        new DataView(indexBytes.buffer).setUint32(0, index, littleEndian);

        const tagBytes = new Uint8Array([0]); // Account tag is likely 0

        // Hex string to Uint8Array
        const hashBytes = new Uint8Array(accountHashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        const combined = new Uint8Array(indexBytes.length + tagBytes.length + hashBytes.length);
        combined.set(indexBytes);
        combined.set(tagBytes, indexBytes.length);
        combined.set(hashBytes, indexBytes.length + tagBytes.length);

        // Return 32-byte hash (64 hex chars)
        return blake2bHex(combined, undefined, 32);
    }

    // Raw RPC helper
    async rpcRequest(method: string, params: any): Promise<any> {
        const body = {
            jsonrpc: '2.0',
            id: new Date().getTime(),
            method: method,
            params: params
        };
        const response = await fetch(this.config.nodeUrl, { // Use config.nodeUrl
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (result.error) throw new Error(`${result.error.code}: ${result.error.message}`);
        return result.result;
    }

    /**
     * Calculate output amount for a swap (constant product formula)
     */
    getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
        if (amountIn <= 0n) throw new Error('Insufficient input amount');
        if (reserveIn <= 0n || reserveOut <= 0n) throw new Error('Insufficient liquidity');

        const amountInWithFee = amountIn * 997n;
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn * 1000n + amountInWithFee;
        return numerator / denominator;
    }

    // ============ Write Functions ============

    /**
     * Approve Router to spend tokens
     */
    makeApproveTokenDeploy(
        tokenPackageHash: string,
        spenderHash: string,
        amount: bigint,
        senderPublicKey: typeof PublicKey,
    ): any {
        const spenderKey = Key.newKey(spenderHash.includes('hash-') ? spenderHash : 'hash-' + spenderHash);

        const args = Args.fromMap({
            spender: CLValue.newCLKey(spenderKey),
            amount: CLValue.newCLUInt256(amount.toString()),
        });

        return this.buildDeploy(
            tokenPackageHash,
            'approve',
            args,
            '3000000000', // 3 CSPR
            senderPublicKey
        );
    }

    /**
     * Swap exact tokens for tokens
     */
    makeSwapExactTokensForTokensDeploy(
        amountIn: bigint,
        amountOutMin: bigint,
        path: string[], // Array of token contract hashes
        to: string, // Recipient account hash
        deadline: number, // Unix timestamp in milliseconds
        senderPublicKey: typeof PublicKey,
    ): any {
        // Build path as List<Key>
        const pathKeys = path.map(hash =>
            CLValue.newCLKey(Key.newKey(hash.startsWith('hash-') ? hash : 'hash-' + hash))
        );

        const args = Args.fromMap({
            amount_in: CLValue.newCLUInt256(amountIn.toString()),
            amount_out_min: CLValue.newCLUInt256(amountOutMin.toString()),
            path: CLValue.newCLList(CLTypeKey, pathKeys),
            to: CLValue.newCLKey(Key.newKey(to)),
            deadline: CLValue.newCLUint64(BigInt(deadline)),
        });

        return this.buildDeploy(
            this.config.routerPackageHash,
            'swap_exact_tokens_for_tokens',
            args,
            '15000000000', // 15 CSPR
            senderPublicKey
        );
    }

    /**
     * Add liquidity to a pair
     */
    makeAddLiquidityDeploy(
        tokenA: string,
        tokenB: string,
        amountADesired: bigint,
        amountBDesired: bigint,
        amountAMin: bigint,
        amountBMin: bigint,
        to: string,
        deadline: number,
        senderPublicKey: typeof PublicKey,
    ): any {
        const args = Args.fromMap({
            token_a: CLValue.newCLKey(Key.newKey(tokenA.startsWith('hash-') ? tokenA : 'hash-' + tokenA)),
            token_b: CLValue.newCLKey(Key.newKey(tokenB.startsWith('hash-') ? tokenB : 'hash-' + tokenB)),
            amount_a_desired: CLValue.newCLUInt256(amountADesired.toString()),
            amount_b_desired: CLValue.newCLUInt256(amountBDesired.toString()),
            amount_a_min: CLValue.newCLUInt256(amountAMin.toString()),
            amount_b_min: CLValue.newCLUInt256(amountBMin.toString()),
            to: CLValue.newCLKey(Key.newKey(to)),
            deadline: CLValue.newCLUint64(BigInt(deadline)),
        });

        return this.buildDeploy(
            this.config.routerPackageHash,
            'add_liquidity',
            args,
            '500000000000', // 300 CSPR (bootstrap can be very expensive; unused is refunded)
            senderPublicKey
        );
    }

    /**
     * Remove liquidity from a pair
     */
    makeRemoveLiquidityDeploy(
        tokenA: string,
        tokenB: string,
        liquidity: bigint,
        amountAMin: bigint,
        amountBMin: bigint,
        to: string,
        deadline: number,
        senderPublicKey: typeof PublicKey,
    ): any {
        const args = Args.fromMap({
            token_a: CLValue.newCLKey(Key.newKey(tokenA.startsWith('hash-') ? tokenA : 'hash-' + tokenA)),
            token_b: CLValue.newCLKey(Key.newKey(tokenB.startsWith('hash-') ? tokenB : 'hash-' + tokenB)),
            liquidity: CLValue.newCLUInt256(liquidity.toString()),
            amount_a_min: CLValue.newCLUInt256(amountAMin.toString()),
            amount_b_min: CLValue.newCLUInt256(amountBMin.toString()),
            to: CLValue.newCLKey(Key.newKey(to)),
            deadline: CLValue.newCLUint64(BigInt(deadline)),
        });

        return this.buildDeploy(
            this.config.routerPackageHash,
            'remove_liquidity',
            args,
            '15000000000', // 15 CSPR
            senderPublicKey
        );
    }

    /**
     * Mint tokens (for testing only - requires minter permissions)
     */
    makeMintTokenDeploy(
        tokenPackageHash: string,
        to: string,
        amount: bigint,
        senderPublicKey: typeof PublicKey,
    ): any {
        const args = Args.fromMap({
            to: CLValue.newCLKey(Key.newKey(to)),
            amount: CLValue.newCLUInt256(amount.toString()),
        });

        return this.buildDeploy(
            tokenPackageHash,
            'mint',
            args,
            '5000000000', // 5 CSPR
            senderPublicKey
        );
    }

    // ============ Launchpad Functions ============

    /**
     * Check if launchpad contracts are configured
     */
    isLaunchpadConfigured(): boolean {
        return !!(this.config.launchpad?.controllerHash && this.config.launchpad?.tokenFactoryHash);
    }

    /**
     * Create a new token launch via TokenFactory
     */
    makeCreateLaunchDeploy(
        params: LaunchParams,
        senderPublicKey: typeof PublicKey,
    ): any {
        if (!this.config.launchpad?.tokenFactoryHash) {
            throw new Error('Launchpad contracts not configured');
        }

        // Map curve type to u8
        const curveTypeMap: Record<CurveType, number> = {
            'linear': 0,
            'sigmoid': 1,
            'steep': 2,
        };

        const argsMap: Record<string, any> = {
            name: CLValue.newCLString(params.name),
            symbol: CLValue.newCLString(params.symbol),
            curve_type: CLValue.newCLUint8(curveTypeMap[params.curveType]),
            graduation_threshold: params.graduationThreshold
                ? CLValue.newCLOption({ type: 'U512', value: CLValue.newCLUInt512(params.graduationThreshold.toString()) })
                : CLValue.newCLOption({ type: 'U512', value: null }),
            creator_fee_bps: params.creatorFeeBps !== undefined
                ? CLValue.newCLOption({ type: 'U64', value: CLValue.newCLUint64(BigInt(params.creatorFeeBps)) })
                : CLValue.newCLOption({ type: 'U64', value: null }),
            deadline_days: params.deadlineDays !== undefined
                ? CLValue.newCLOption({ type: 'U64', value: CLValue.newCLUint64(BigInt(params.deadlineDays)) })
                : CLValue.newCLOption({ type: 'U64', value: null }),
            promo_budget: params.promoBudget
                ? CLValue.newCLOption({ type: 'U512', value: CLValue.newCLUInt512(params.promoBudget.toString()) })
                : CLValue.newCLOption({ type: 'U512', value: null }),
            description: params.description
                ? CLValue.newCLOption({ type: 'String', value: CLValue.newCLString(params.description) })
                : CLValue.newCLOption({ type: 'String', value: null }),
            website: params.website
                ? CLValue.newCLOption({ type: 'String', value: CLValue.newCLString(params.website) })
                : CLValue.newCLOption({ type: 'String', value: null }),
            twitter: params.twitter
                ? CLValue.newCLOption({ type: 'String', value: CLValue.newCLString(params.twitter) })
                : CLValue.newCLOption({ type: 'String', value: null }),
        };

        const args = Args.fromMap(argsMap);

        return this.buildDeploy(
            this.config.launchpad.tokenFactoryHash,
            'create_launch',
            args,
            '80000000000', // 80 CSPR
            senderPublicKey
        );
    }

    /**
     * Buy tokens from bonding curve (with CSPR payment)
     */
    makeBuyTokensDeploy(
        curveHash: string,
        csprAmount: bigint,
        minTokensOut: bigint,
        senderPublicKey: typeof PublicKey,
    ): any {
        const args = Args.fromMap({
            min_tokens_out: CLValue.newCLUInt256(minTokensOut.toString()),
        });

        // Note: For payable entry points, the payment amount IS the CSPR being sent
        // The contract will receive the payment amount as the purchase amount
        return this.buildDeploy(
            curveHash,
            'buy',
            args,
            csprAmount.toString(), // This is the payment/purchase amount
            senderPublicKey
        );
    }

    /**
     * Sell tokens back to bonding curve
     */
    makeSellTokensDeploy(
        curveHash: string,
        tokenAmount: bigint,
        minCsprOut: bigint,
        senderPublicKey: typeof PublicKey,
    ): any {
        const args = Args.fromMap({
            amount: CLValue.newCLUInt256(tokenAmount.toString()),
            min_cspr_out: CLValue.newCLUInt512(minCsprOut.toString()),
        });

        return this.buildDeploy(
            curveHash,
            'sell',
            args,
            '10000000000', // 10 CSPR gas
            senderPublicKey
        );
    }

    /**
     * Claim refund from a failed/expired launch
     */
    makeClaimRefundDeploy(
        curveHash: string,
        senderPublicKey: typeof PublicKey,
    ): any {
        const args = Args.fromMap({});

        return this.buildDeploy(
            curveHash,
            'claim_refund',
            args,
            '5000000000', // 5 CSPR gas
            senderPublicKey
        );
    }

    /**
     * Graduate a launch to DEX (when threshold is reached)
     */
    makeGraduateDeploy(
        curveHash: string,
        senderPublicKey: typeof PublicKey,
    ): any {
        const args = Args.fromMap({});

        return this.buildDeploy(
            curveHash,
            'graduate',
            args,
            '50000000000', // 50 CSPR gas (creates DEX pair)
            senderPublicKey
        );
    }

    /**
     * Get launch count from TokenFactory
     */
    async getLaunchCount(): Promise<number> {
        if (!this.config.launchpad?.tokenFactoryHash) {
            return 0;
        }

        try {
            const stateRootWrapper = await this.rpcClient.getStateRootHashLatest();
            const stateRootHash = this.normalizeStateRootHash(stateRootWrapper.stateRootHash);
            const factoryHash = this.normalizeContractKey(this.config.launchpad.tokenFactoryHash);

            const contractData: any = await this.rpcRequest('state_get_item', {
                state_root_hash: stateRootHash,
                key: factoryHash,
                path: []
            });

            const namedKeys = contractData.stored_value?.Contract?.named_keys;
            const launchCountURef = namedKeys?.find((k: any) => k.name === 'launch_count')?.key;

            if (!launchCountURef) return 0;

            const res = await this.rpcRequest('state_get_item', {
                state_root_hash: stateRootHash,
                key: launchCountURef,
                path: []
            });

            if (res.stored_value?.CLValue?.parsed) {
                return Number(res.stored_value.CLValue.parsed);
            }
            return 0;
        } catch (e) {
            console.error('Error fetching launch count:', e);
            return 0;
        }
    }

    /**
     * Get launches (paginated)
     */
    async getLaunches(offset: number = 0, limit: number = 20): Promise<LaunchInfo[]> {
        if (!this.config.launchpad?.tokenFactoryHash) {
            return [];
        }

        // For now, return empty array - real implementation would query the contract
        // This would require calling get_launches entry point or reading from dictionaries
        console.warn('getLaunches: Full implementation requires contract deployment');
        return [];
    }

    /**
     * Get bonding curve state
     */
    async getCurveState(curveHash: string): Promise<CurveState | null> {
        try {
            const stateRootWrapper = await this.rpcClient.getStateRootHashLatest();
            const stateRootHash = this.normalizeStateRootHash(stateRootWrapper.stateRootHash);
            const cleanHash = this.normalizeContractKey(curveHash);

            const contractData: any = await this.rpcRequest('state_get_item', {
                state_root_hash: stateRootHash,
                key: cleanHash,
                path: []
            });

            const namedKeys = contractData.stored_value?.Contract?.named_keys;
            if (!namedKeys) return null;

            // Read key storage values
            const getURefValue = async (name: string): Promise<any> => {
                const uref = namedKeys.find((k: any) => k.name === name)?.key;
                if (!uref) return null;
                const res = await this.rpcRequest('state_get_item', {
                    state_root_hash: stateRootHash,
                    key: uref,
                    path: []
                });
                return res.stored_value?.CLValue?.parsed;
            };

            const tokenHash = await getURefValue('token_hash') || '';
            const curveType = await getURefValue('curve_type') || 0;
            const csprRaised = BigInt(await getURefValue('cspr_raised') || 0);
            const tokensSold = BigInt(await getURefValue('tokens_sold') || 0);
            const totalSupply = BigInt(await getURefValue('total_supply') || 0);
            const graduationThreshold = BigInt(await getURefValue('graduation_threshold') || 0);
            const status = await getURefValue('status') || 0;
            const deadline = Number(await getURefValue('deadline') || 0);
            const promoBudget = BigInt(await getURefValue('promo_budget') || 0);
            const promoReleased = BigInt(await getURefValue('promo_released') || 0);

            // Calculate current price (simplified - actual would call get_price entry point)
            const progress = graduationThreshold > 0n
                ? Number((csprRaised * 100n) / graduationThreshold)
                : 0;

            const curveTypeMap: Record<number, CurveType> = { 0: 'linear', 1: 'sigmoid', 2: 'steep' };
            const statusMap: Record<number, 'active' | 'graduated' | 'refunding'> = {
                0: 'active', 1: 'graduated', 2: 'refunding'
            };

            return {
                tokenHash: typeof tokenHash === 'string' ? tokenHash : '',
                curveType: curveTypeMap[curveType] || 'linear',
                csprRaised,
                tokensSold,
                totalSupply,
                graduationThreshold,
                currentPrice: 0n, // Would need to call contract
                progress,
                status: statusMap[status] || 'active',
                deadline,
                promoBudget,
                promoReleased,
            };
        } catch (e) {
            console.error('Error fetching curve state:', e);
            return null;
        }
    }

    /**
     * Get quote for buying tokens
     */
    async getQuoteBuy(curveHash: string, csprAmount: bigint): Promise<bigint> {
        // This would call the contract's get_quote_buy entry point
        // For now, return 0 - real implementation after deployment
        console.warn('getQuoteBuy: Requires contract deployment for accurate quotes');
        return 0n;
    }

    /**
     * Get quote for selling tokens
     */
    async getQuoteSell(curveHash: string, tokenAmount: bigint): Promise<bigint> {
        // This would call the contract's get_quote_sell entry point
        console.warn('getQuoteSell: Requires contract deployment for accurate quotes');
        return 0n;
    }

    // ============ Utility Functions ============

    /**
     * Wait for a deploy to complete
     */
    async waitForDeploy(deployHash: string, maxTries: number = 24, sleepMs: number = 5000): Promise<boolean> {
        console.log(`⏳ Waiting for deploy ${deployHash}...`);
        for (let i = 0; i < maxTries; i++) {
            try {
                // Use getDeploy instead of getDeployInfo for newer SDK
                const result = await this.rpcClient.getDeploy(deployHash);
                // console.log('Deploy Info:', JSON.stringify(result, null, 2));

                // Based on logs, the structure is executionInfo -> executionResult
                if (result.executionInfo) {
                    const error = result.executionInfo.executionResult?.errorMessage;
                    if (error) {
                        throw new Error(`Deploy failed: ${error}`);
                    }
                    console.log(`✅ Deploy ${deployHash} completed successfully`);
                    return true;
                }
                console.log(`⏳ Attempt ${i + 1}/${maxTries}: Deploy not yet executed...`);
            } catch (e: any) {
                // If it's a deploy execution error, rethrow it
                if (e.message?.includes('Deploy failed:')) {
                    throw e;
                }
                // Otherwise, deploy not found yet, continue polling
                console.log(`⏳ Attempt ${i + 1}/${maxTries}: ${e.message || 'Deploy not found'}`);
            }
            await this.sleep(sleepMs);
        }
        throw new Error(`Deploy ${deployHash} timed out after ${(maxTries * sleepMs) / 1000}s`);
    }

    // ============ Private Helpers ============

    private buildDeploy(
        contractHash: string,
        entryPoint: string,
        args: any,
        paymentAmount: string,
        senderPublicKey: typeof PublicKey,
    ): any {
        const header = DeployHeader.default();
        header.account = senderPublicKey;
        header.chainName = this.config.chainName;
        // Don't override ttl - default() already sets it to 30 min Duration object
        header.gasPrice = 1;

        const session = new ExecutableDeployItem();
        // Use StoredVersionedContractByHash with package hash for Casper 2.0
        // Constructor: (hash, entryPoint, args, version)
        // FIX: The Node expects RAW HEX (32 bytes) for the hash field in JSON RPC for StoredVersionedContractByHash.
        // We must strip the prefix keys (hash- or contract-package-) so that toJSON produces raw hex.
        const cleanHash = contractHash.replace(/^(hash-|contract-package-)/, '');
        session.storedVersionedContractByHash = new StoredVersionedContractByHash(
            ContractPackageHash.newContractPackage(cleanHash),
            entryPoint,
            args,
            null // null = latest version
        );

        const payment = ExecutableDeployItem.standardPayment(paymentAmount);
        const deploy = Deploy.makeDeploy(header, payment, session);

        return deploy;
    }

    private parseAccountHash(accountHash: string): any {
        // Parse account-hash-... format
        const { AccountHash } = (sdk as any).default ?? (sdk as any);
        const clean = accountHash.replace(/^account-hash-/, '');
        return AccountHash.fromHex(clean);
    }

    /**
     * Send a signed deploy
     */
    public async sendDeploy(deploy: any): Promise<string> {
        // Use sendDeployRaw to bypass SDK internal serialization issues if any
        const deployJson = Deploy.toJSON(deploy);
        return this.sendDeployRaw(deployJson);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendDeployRaw(deployJson: any): Promise<string> {
        // Construct the RPC request manually
        const body = {
            jsonrpc: '2.0',
            id: new Date().getTime(),
            method: 'account_put_deploy',
            params: [deployJson]
        };

        console.log("Sending Deploy Payload:", JSON.stringify(body, null, 2));

        const response = await fetch(this.config.nodeUrl, { // Use config.nodeUrl
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        console.log("Deploy Result:", result);

        if (result.error) {
            throw new Error(`RPC Error: ${result.error.code} - ${result.error.message}`);
        }

        const deployHash = result.result.deploy_hash;
        console.log(`✅ Deploy submitted successfully. Hash: ${deployHash}`);
        return deployHash;
    }
}
