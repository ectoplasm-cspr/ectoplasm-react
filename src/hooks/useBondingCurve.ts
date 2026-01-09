import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useDex } from '../contexts/DexContext';
import type { CurveState, CurveType } from '../dex-client';

export interface UseBondingCurveResult {
  // Curve state
  curveState: CurveState | null;
  isLoading: boolean;
  error: string | null;

  // Derived values
  currentPrice: bigint;
  progress: number;
  status: 'active' | 'graduated' | 'refunding';
  csprRaised: bigint;
  tokensSold: bigint;
  isRefundable: boolean;

  // Actions
  buyTokens: (csprAmount: bigint, slippageBps?: number) => Promise<string | null>;
  sellTokens: (tokenAmount: bigint, slippageBps?: number) => Promise<string | null>;
  claimRefund: () => Promise<string | null>;
  graduate: () => Promise<string | null>;

  // Quotes
  getQuoteBuy: (csprAmount: bigint) => Promise<bigint>;
  getQuoteSell: (tokenAmount: bigint) => Promise<bigint>;

  // Refresh
  refresh: () => Promise<void>;

  // Transaction state
  isPending: boolean;
  txError: string | null;
}

// Mock curve state for demo when contracts not deployed
function getMockCurveState(curveHash: string): CurveState {
  // Generate deterministic mock data based on hash
  const hashNum = parseInt(curveHash.slice(-8), 16) || 0;
  const progress = (hashNum % 100);
  const csprRaised = BigInt(progress * 500) * BigInt(1_000_000_000);
  const tokensSold = BigInt(progress * 10000) * BigInt(10 ** 18);

  return {
    tokenHash: `hash-${curveHash.slice(-64)}`,
    curveType: (['linear', 'sigmoid', 'steep'] as CurveType[])[hashNum % 3],
    csprRaised,
    tokensSold,
    totalSupply: BigInt(1_000_000) * BigInt(10 ** 18),
    graduationThreshold: BigInt(50_000) * BigInt(1_000_000_000),
    currentPrice: BigInt(1_000_000_000) + BigInt(progress * 10_000_000),
    progress,
    status: progress >= 100 ? 'graduated' : 'active',
    deadline: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    promoBudget: BigInt(1000) * BigInt(1_000_000_000),
    promoReleased: BigInt(progress * 10) * BigInt(1_000_000_000),
  };
}

export function useBondingCurve(curveHash: string | null): UseBondingCurveResult {
  const { connected, publicKey, activePublicKey, signDeploy } = useWallet();
  const { dexClient } = useDex();

  // State
  const [curveState, setCurveState] = useState<CurveState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Derived values
  const currentPrice = curveState?.currentPrice ?? 0n;
  const progress = curveState?.progress ?? 0;
  const status = curveState?.status ?? 'active';
  const csprRaised = curveState?.csprRaised ?? 0n;
  const tokensSold = curveState?.tokensSold ?? 0n;

  // Check if refund is available (past deadline and not graduated)
  const isRefundable = curveState
    ? curveState.status === 'active' && Date.now() > curveState.deadline
    : false;

  // Fetch curve state
  const refresh = useCallback(async () => {
    if (!curveHash) {
      setCurveState(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!dexClient || !dexClient.isLaunchpadConfigured()) {
        // Demo mode - use mock data
        const mockState = getMockCurveState(curveHash);
        setCurveState(mockState);
        return;
      }

      const state = await dexClient.getCurveState(curveHash);
      if (state) {
        setCurveState(state);
      } else {
        // Fallback to mock if contract query fails
        console.warn('Failed to fetch curve state, using mock data');
        setCurveState(getMockCurveState(curveHash));
      }
    } catch (err: any) {
      console.error('Error fetching curve state:', err);
      setError(err.message || 'Failed to fetch curve state');
      // Use mock data on error
      setCurveState(getMockCurveState(curveHash));
    } finally {
      setIsLoading(false);
    }
  }, [curveHash, dexClient]);

  // Load state on mount or when curveHash changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Buy tokens
  const buyTokens = useCallback(async (
    csprAmount: bigint,
    slippageBps: number = 100 // 1% default slippage
  ): Promise<string | null> => {
    if (!curveHash || !connected || !activePublicKey || !dexClient) {
      setTxError('Wallet not connected or curve not selected');
      return null;
    }

    setIsPending(true);
    setTxError(null);

    try {
      if (!dexClient.isLaunchpadConfigured()) {
        // Demo mode
        console.log('Demo mode: Buy tokens', { curveHash, csprAmount: csprAmount.toString() });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await refresh();
        return `demo-buy-${Date.now().toString(16)}`;
      }

      // Get quote for minimum tokens out
      const expectedTokens = await dexClient.getQuoteBuy(curveHash, csprAmount);
      const minTokensOut = expectedTokens * BigInt(10000 - slippageBps) / 10000n;

      // Build and sign deploy
      const deploy = dexClient.makeBuyTokensDeploy(
        curveHash,
        csprAmount,
        minTokensOut,
        activePublicKey
      );
      const signedDeploy = await signDeploy(deploy);

      if (!signedDeploy) {
        throw new Error('Failed to sign deploy');
      }

      const deployHash = await dexClient.sendDeploy(signedDeploy);
      console.log('Buy tokens deploy sent:', deployHash);

      // Wait for confirmation
      await dexClient.waitForDeploy(deployHash);

      // Refresh state
      await refresh();

      return deployHash;
    } catch (err: any) {
      console.error('Buy tokens failed:', err);
      setTxError(err.message || 'Failed to buy tokens');
      return null;
    } finally {
      setIsPending(false);
    }
  }, [curveHash, connected, activePublicKey, dexClient, signDeploy, refresh]);

  // Sell tokens
  const sellTokens = useCallback(async (
    tokenAmount: bigint,
    slippageBps: number = 100 // 1% default slippage
  ): Promise<string | null> => {
    if (!curveHash || !connected || !activePublicKey || !dexClient) {
      setTxError('Wallet not connected or curve not selected');
      return null;
    }

    setIsPending(true);
    setTxError(null);

    try {
      if (!dexClient.isLaunchpadConfigured()) {
        // Demo mode
        console.log('Demo mode: Sell tokens', { curveHash, tokenAmount: tokenAmount.toString() });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await refresh();
        return `demo-sell-${Date.now().toString(16)}`;
      }

      // Get quote for minimum CSPR out
      const expectedCspr = await dexClient.getQuoteSell(curveHash, tokenAmount);
      const minCsprOut = expectedCspr * BigInt(10000 - slippageBps) / 10000n;

      // Build and sign deploy
      const deploy = dexClient.makeSellTokensDeploy(
        curveHash,
        tokenAmount,
        minCsprOut,
        activePublicKey
      );
      const signedDeploy = await signDeploy(deploy);

      if (!signedDeploy) {
        throw new Error('Failed to sign deploy');
      }

      const deployHash = await dexClient.sendDeploy(signedDeploy);
      console.log('Sell tokens deploy sent:', deployHash);

      // Wait for confirmation
      await dexClient.waitForDeploy(deployHash);

      // Refresh state
      await refresh();

      return deployHash;
    } catch (err: any) {
      console.error('Sell tokens failed:', err);
      setTxError(err.message || 'Failed to sell tokens');
      return null;
    } finally {
      setIsPending(false);
    }
  }, [curveHash, connected, activePublicKey, dexClient, signDeploy, refresh]);

  // Claim refund
  const claimRefund = useCallback(async (): Promise<string | null> => {
    if (!curveHash || !connected || !activePublicKey || !dexClient) {
      setTxError('Wallet not connected or curve not selected');
      return null;
    }

    if (!isRefundable) {
      setTxError('Refund not available');
      return null;
    }

    setIsPending(true);
    setTxError(null);

    try {
      if (!dexClient.isLaunchpadConfigured()) {
        // Demo mode
        console.log('Demo mode: Claim refund', { curveHash });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await refresh();
        return `demo-refund-${Date.now().toString(16)}`;
      }

      const deploy = dexClient.makeClaimRefundDeploy(curveHash, activePublicKey);
      const signedDeploy = await signDeploy(deploy);

      if (!signedDeploy) {
        throw new Error('Failed to sign deploy');
      }

      const deployHash = await dexClient.sendDeploy(signedDeploy);
      console.log('Claim refund deploy sent:', deployHash);

      await dexClient.waitForDeploy(deployHash);
      await refresh();

      return deployHash;
    } catch (err: any) {
      console.error('Claim refund failed:', err);
      setTxError(err.message || 'Failed to claim refund');
      return null;
    } finally {
      setIsPending(false);
    }
  }, [curveHash, connected, activePublicKey, dexClient, signDeploy, isRefundable, refresh]);

  // Graduate to DEX
  const graduate = useCallback(async (): Promise<string | null> => {
    if (!curveHash || !connected || !activePublicKey || !dexClient) {
      setTxError('Wallet not connected or curve not selected');
      return null;
    }

    if (progress < 100) {
      setTxError('Graduation threshold not reached');
      return null;
    }

    setIsPending(true);
    setTxError(null);

    try {
      if (!dexClient.isLaunchpadConfigured()) {
        // Demo mode
        console.log('Demo mode: Graduate', { curveHash });
        await new Promise(resolve => setTimeout(resolve, 3000));
        await refresh();
        return `demo-graduate-${Date.now().toString(16)}`;
      }

      const deploy = dexClient.makeGraduateDeploy(curveHash, activePublicKey);
      const signedDeploy = await signDeploy(deploy);

      if (!signedDeploy) {
        throw new Error('Failed to sign deploy');
      }

      const deployHash = await dexClient.sendDeploy(signedDeploy);
      console.log('Graduate deploy sent:', deployHash);

      await dexClient.waitForDeploy(deployHash);
      await refresh();

      return deployHash;
    } catch (err: any) {
      console.error('Graduation failed:', err);
      setTxError(err.message || 'Failed to graduate');
      return null;
    } finally {
      setIsPending(false);
    }
  }, [curveHash, connected, activePublicKey, dexClient, signDeploy, progress, refresh]);

  // Get quote for buying
  const getQuoteBuy = useCallback(async (csprAmount: bigint): Promise<bigint> => {
    if (!curveHash || !dexClient) {
      return 0n;
    }

    try {
      if (!dexClient.isLaunchpadConfigured()) {
        // Demo mode - simple linear estimate
        const price = curveState?.currentPrice || BigInt(1_000_000_000);
        return (csprAmount * BigInt(10 ** 18)) / price;
      }

      return await dexClient.getQuoteBuy(curveHash, csprAmount);
    } catch (err) {
      console.error('Get quote buy failed:', err);
      return 0n;
    }
  }, [curveHash, dexClient, curveState]);

  // Get quote for selling
  const getQuoteSell = useCallback(async (tokenAmount: bigint): Promise<bigint> => {
    if (!curveHash || !dexClient) {
      return 0n;
    }

    try {
      if (!dexClient.isLaunchpadConfigured()) {
        // Demo mode - simple linear estimate
        const price = curveState?.currentPrice || BigInt(1_000_000_000);
        return (tokenAmount * price) / BigInt(10 ** 18);
      }

      return await dexClient.getQuoteSell(curveHash, tokenAmount);
    } catch (err) {
      console.error('Get quote sell failed:', err);
      return 0n;
    }
  }, [curveHash, dexClient, curveState]);

  return {
    curveState,
    isLoading,
    error,
    currentPrice,
    progress,
    status,
    csprRaised,
    tokensSold,
    isRefundable,
    buyTokens,
    sellTokens,
    claimRefund,
    graduate,
    getQuoteBuy,
    getQuoteSell,
    refresh,
    isPending,
    txError,
  };
}

export default useBondingCurve;
