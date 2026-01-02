import { useState, useCallback, useEffect } from 'react';
import { Deploy } from 'casper-js-sdk';
import { useWallet } from '../contexts/WalletContext';
import { CasperService } from '../services/casper';
import { EctoplasmConfig } from '../config/ectoplasm';
import { parseTokenAmount, formatTokenAmount } from '../utils/format';

interface LiquidityPosition {
  pairName: string;
  pairHash: string;
  tokenA: string;
  tokenB: string;
  lpBalance: string;
  lpBalanceRaw: bigint;
  sharePercent: number;
  tokenAAmount: string;
  tokenBAmount: string;
}

interface UseLiquidityResult {
  // Add liquidity state
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  poolShare: string;
  lpTokensReceived: string;
  setTokenA: (symbol: string) => void;
  setTokenB: (symbol: string) => void;
  setAmountA: (amount: string) => void;
  setAmountB: (amount: string) => void;

  // Remove liquidity state
  lpAmount: string;
  setLpAmount: (amount: string) => void;
  removeTokenA: string;
  removeTokenB: string;

  // Reserves info
  reserveA: string;
  reserveB: string;
  totalSupply: string;
  pairExists: boolean;

  // Positions
  positions: LiquidityPosition[];

  // Actions
  addLiquidity: () => Promise<string | null>;
  removeLiquidity: () => Promise<string | null>;
  refreshPositions: () => Promise<void>;
  refreshReserves: () => Promise<void>;

  // Status
  loading: boolean;
  txStep: string;
  error: string | null;
}

// Demo pools data for display
const DEMO_POOLS = [
  {
    name: 'ECTO/USDC',
    tokenA: 'ECTO',
    tokenB: 'USDC',
    tvl: 0,
    apr: 0,
    minStake: 0,
    lstToken: 'LP-ECTO-USDC',
    features: ['AMM Pool', 'Earn Fees'],
  },
  {
    name: 'WETH/USDC',
    tokenA: 'WETH',
    tokenB: 'USDC',
    tvl: 0,
    apr: 0,
    minStake: 0,
    lstToken: 'LP-WETH-USDC',
    features: ['AMM Pool', 'Earn Fees'],
  },
  {
    name: 'WBTC/USDC',
    tokenA: 'WBTC',
    tokenB: 'USDC',
    tvl: 0,
    apr: 0,
    minStake: 0,
    lstToken: 'LP-WBTC-USDC',
    features: ['AMM Pool', 'Earn Fees'],
  },
];

export function useLiquidity(): UseLiquidityResult {
  const { connected, publicKey, balances, refreshBalances } = useWallet();

  // Add liquidity state
  const [tokenA, setTokenA] = useState('ECTO');
  const [tokenB, setTokenB] = useState('USDC');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [poolShare, setPoolShare] = useState('0.00');
  const [lpTokensReceived, setLpTokensReceived] = useState('0.00');

  // Remove liquidity state
  const [lpAmount, setLpAmount] = useState('');
  const [removeTokenA, setRemoveTokenA] = useState('');
  const [removeTokenB, setRemoveTokenB] = useState('');

  // Reserves info
  const [reserveA, setReserveA] = useState('0');
  const [reserveB, setReserveB] = useState('0');
  const [totalSupply, setTotalSupply] = useState('0');
  const [pairExists, setPairExists] = useState(false);

  // Positions
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);

  // Status
  const [loading, setLoading] = useState(false);
  const [txStep, setTxStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch reserves when tokens change
  const refreshReserves = useCallback(async () => {
    const tokenAConfig = EctoplasmConfig.getToken(tokenA);
    const tokenBConfig = EctoplasmConfig.getToken(tokenB);

    if (!tokenAConfig?.hash || !tokenBConfig?.hash) {
      setReserveA('0');
      setReserveB('0');
      setTotalSupply('0');
      setPairExists(false);
      return;
    }

    // First check if we have a hardcoded pair address (works without SDK)
    const configuredPair = EctoplasmConfig.getConfiguredPairAddress(tokenAConfig.hash, tokenBConfig.hash);

    if (configuredPair) {
      // Pair exists in config - mark as available
      setPairExists(true);

      // Try to fetch reserves if SDK available, otherwise show zeros
      if (CasperService.isAvailable()) {
        try {
          const reserves = await CasperService.getPairReserves(tokenAConfig.hash, tokenBConfig.hash);
          const supply = await CasperService.getLPTokenTotalSupply(configuredPair);

          setReserveA(formatTokenAmount(reserves.reserveA.toString(), tokenAConfig.decimals));
          setReserveB(formatTokenAmount(reserves.reserveB.toString(), tokenBConfig.decimals));
          setTotalSupply(formatTokenAmount(supply.toString(), 18));
        } catch (err) {
          console.error('Error fetching reserves:', err);
          setReserveA('0');
          setReserveB('0');
          setTotalSupply('0');
        }
      } else {
        // SDK not available but pair exists - show zeros for reserves
        setReserveA('0');
        setReserveB('0');
        setTotalSupply('0');
      }
      return;
    }

    // No hardcoded pair - try to query Factory if SDK available
    if (!CasperService.isAvailable()) {
      setPairExists(false);
      setReserveA('0');
      setReserveB('0');
      setTotalSupply('0');
      return;
    }

    try {
      const pairAddress = await CasperService.getPairAddress(tokenAConfig.hash, tokenBConfig.hash);

      if (!pairAddress) {
        setPairExists(false);
        setReserveA('0');
        setReserveB('0');
        setTotalSupply('0');
        return;
      }

      setPairExists(true);

      const reserves = await CasperService.getPairReserves(tokenAConfig.hash, tokenBConfig.hash);
      const supply = await CasperService.getLPTokenTotalSupply(pairAddress);

      setReserveA(formatTokenAmount(reserves.reserveA.toString(), tokenAConfig.decimals));
      setReserveB(formatTokenAmount(reserves.reserveB.toString(), tokenBConfig.decimals));
      setTotalSupply(formatTokenAmount(supply.toString(), 18));
    } catch (err) {
      console.error('Error fetching reserves:', err);
      setPairExists(false);
    }
  }, [tokenA, tokenB]);

  useEffect(() => {
    refreshReserves();
  }, [refreshReserves]);

  // Calculate pool share and LP tokens when amounts change
  useEffect(() => {
    const calculateEstimates = async () => {
      if (!amountA || parseFloat(amountA) <= 0) {
        setPoolShare('0.00');
        setLpTokensReceived('0.00');
        return;
      }

      const tokenAConfig = EctoplasmConfig.getToken(tokenA);
      const tokenBConfig = EctoplasmConfig.getToken(tokenB);

      if (!tokenAConfig?.hash || !tokenBConfig?.hash) {
        setPoolShare('0.00');
        setLpTokensReceived('0.00');
        return;
      }

      try {
        const amountARaw = BigInt(parseTokenAmount(amountA, tokenAConfig.decimals));
        const amountBRaw = amountB ? BigInt(parseTokenAmount(amountB, tokenBConfig.decimals)) : BigInt(0);

        const pairAddress = await CasperService.getPairAddress(tokenAConfig.hash, tokenBConfig.hash);

        if (!pairAddress) {
          // New pool - estimate based on sqrt formula
          if (amountARaw > BigInt(0) && amountBRaw > BigInt(0)) {
            const lpTokens = CasperService.estimateLPTokens(
              amountARaw, amountBRaw, BigInt(0), BigInt(0), BigInt(0)
            );
            setLpTokensReceived(formatTokenAmount(lpTokens.toString(), 18));
            setPoolShare('100.00');
          }
          return;
        }

        const reserves = await CasperService.getPairReserves(tokenAConfig.hash, tokenBConfig.hash);
        const supply = await CasperService.getLPTokenTotalSupply(pairAddress);

        const lpTokens = CasperService.estimateLPTokens(
          amountARaw, amountBRaw, reserves.reserveA, reserves.reserveB, supply
        );

        const share = CasperService.calculatePoolShare(lpTokens, supply);

        setLpTokensReceived(formatTokenAmount(lpTokens.toString(), 18));
        setPoolShare(share.toFixed(4));
      } catch (err) {
        console.error('Error calculating estimates:', err);
      }
    };

    calculateEstimates();
  }, [amountA, amountB, tokenA, tokenB]);

  // Auto-calculate amountB based on amountA and pool ratio
  const handleAmountAChange = useCallback(async (amount: string) => {
    setAmountA(amount);

    if (!amount || parseFloat(amount) <= 0) {
      setAmountB('');
      return;
    }

    const tokenAConfig = EctoplasmConfig.getToken(tokenA);
    const tokenBConfig = EctoplasmConfig.getToken(tokenB);

    if (!tokenAConfig?.hash || !tokenBConfig?.hash) {
      return;
    }

    try {
      const pairAddress = await CasperService.getPairAddress(tokenAConfig.hash, tokenBConfig.hash);

      if (!pairAddress) {
        // No existing pool - user sets both amounts freely
        return;
      }

      const reserves = await CasperService.getPairReserves(tokenAConfig.hash, tokenBConfig.hash);

      if (reserves.reserveA > BigInt(0) && reserves.reserveB > BigInt(0)) {
        // Calculate optimal amountB based on current ratio
        const amountARaw = BigInt(parseTokenAmount(amount, tokenAConfig.decimals));
        const amountBOptimal = (amountARaw * reserves.reserveB) / reserves.reserveA;
        setAmountB(formatTokenAmount(amountBOptimal.toString(), tokenBConfig.decimals));
      }
    } catch (err) {
      console.error('Error calculating optimal amount:', err);
    }
  }, [tokenA, tokenB]);

  const refreshPositions = useCallback(async () => {
    if (!connected || !publicKey) {
      setPositions([]);
      return;
    }

    if (!CasperService.isAvailable()) {
      setPositions([]);
      return;
    }

    try {
      const newPositions: LiquidityPosition[] = [];

      // Check all configured pairs
      for (const [pairName, pairHash] of Object.entries(EctoplasmConfig.contracts.pairs)) {
        const lpBalance = await CasperService.getLPTokenBalance(pairHash, publicKey);

        if (lpBalance.raw > BigInt(0)) {
          const [tokenASymbol, tokenBSymbol] = pairName.split('/');
          const tokenAConfig = EctoplasmConfig.getToken(tokenASymbol);
          const tokenBConfig = EctoplasmConfig.getToken(tokenBSymbol);

          if (tokenAConfig?.hash && tokenBConfig?.hash) {
            const reserves = await CasperService.getPairReserves(tokenAConfig.hash, tokenBConfig.hash);
            const supply = await CasperService.getLPTokenTotalSupply(pairHash);

            // Calculate share and underlying amounts
            const sharePercent = supply > BigInt(0)
              ? Number((lpBalance.raw * BigInt(10000)) / supply) / 100
              : 0;

            const tokenAAmount = supply > BigInt(0)
              ? (lpBalance.raw * reserves.reserveA) / supply
              : BigInt(0);

            const tokenBAmount = supply > BigInt(0)
              ? (lpBalance.raw * reserves.reserveB) / supply
              : BigInt(0);

            newPositions.push({
              pairName,
              pairHash,
              tokenA: tokenASymbol,
              tokenB: tokenBSymbol,
              lpBalance: lpBalance.formatted,
              lpBalanceRaw: lpBalance.raw,
              sharePercent,
              tokenAAmount: formatTokenAmount(tokenAAmount.toString(), tokenAConfig.decimals),
              tokenBAmount: formatTokenAmount(tokenBAmount.toString(), tokenBConfig.decimals),
            });
          }
        }
      }

      setPositions(newPositions);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setPositions([]);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    refreshPositions();
  }, [refreshPositions]);

  const addLiquidity = useCallback(async (): Promise<string | null> => {
    console.log('[addLiquidity] Starting with Router approach...');
    console.log('[addLiquidity] connected:', connected);
    console.log('[addLiquidity] publicKey:', publicKey);

    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return null;
    }

    const signerPublicKey = CasperService.normalizePublicKeyHex(publicKey);

    console.log('[addLiquidity] amountA:', amountA, 'amountB:', amountB);
    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      setError('Please enter valid amounts');
      return null;
    }

    const tokenAConfig = EctoplasmConfig.getToken(tokenA);
    const tokenBConfig = EctoplasmConfig.getToken(tokenB);

    console.log('[addLiquidity] tokenA:', tokenA, 'config:', tokenAConfig);
    console.log('[addLiquidity] tokenB:', tokenB, 'config:', tokenBConfig);

    if (!tokenAConfig?.hash || !tokenBConfig?.hash) {
      setError('Token contracts not available');
      return null;
    }

    // Verify pair exists (Router will fail if it doesn't)
    console.log('[addLiquidity] Getting pair address for', tokenAConfig.hash, tokenBConfig.hash);
    const pairAddress = await CasperService.getPairAddress(tokenAConfig.hash, tokenBConfig.hash);
    console.log('[addLiquidity] pairAddress:', pairAddress);

    if (!pairAddress) {
      setError('Pair does not exist. Please contact admin to create it.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const w = window as any;
      if (!w.CasperWalletProvider) {
        throw new Error('No wallet available for signing');
      }
      const wallet = w.CasperWalletProvider();

      const amountARaw = BigInt(parseTokenAmount(amountA, tokenAConfig.decimals));
      const amountBRaw = BigInt(parseTokenAmount(amountB, tokenBConfig.decimals));

      // Calculate minimum amounts with 1% slippage tolerance
      const slippageMultiplier = BigInt(9900); // 99% = 1% slippage
      const amountAMin = (amountARaw * slippageMultiplier) / BigInt(10000);
      const amountBMin = (amountBRaw * slippageMultiplier) / BigInt(10000);

      console.log('[addLiquidity] amountARaw:', amountARaw.toString());
      console.log('[addLiquidity] amountBRaw:', amountBRaw.toString());
      console.log('[addLiquidity] amountAMin:', amountAMin.toString());
      console.log('[addLiquidity] amountBMin:', amountBMin.toString());

      // Step 1: Approve Token A (if needed)
      setTxStep(`Checking ${tokenA} allowance...`);
      const hasAllowanceA = await CasperService.checkAllowance(tokenAConfig.hash, publicKey, amountARaw);
      console.log('[addLiquidity] hasAllowanceA:', hasAllowanceA);

      if (!hasAllowanceA) {
        setTxStep(`Approving ${tokenA}...`);
        console.log('[addLiquidity] Building approve deploy for tokenA...');

        const approveADeploy = CasperService.buildApproveDeploy(
          tokenAConfig.hash,
          amountARaw,
          signerPublicKey
        );

        const approveAJson = Deploy.toJSON(approveADeploy);
        console.log('[addLiquidity] Requesting wallet signature for approve A...');
        const walletResponseA = await wallet.sign(JSON.stringify(approveAJson), signerPublicKey);

        if (walletResponseA.cancelled) {
          throw new Error('User cancelled the transaction');
        }

        const signedApproveA = CasperService.deployFromWalletResponse(approveADeploy, walletResponseA, signerPublicKey);

        const approveAHash = await CasperService.submitDeploy(signedApproveA);
        console.log('[addLiquidity] approveAHash:', approveAHash);

        setTxStep(`Waiting for ${tokenA} approval...`);
        const resultA = await CasperService.waitForDeploy(approveAHash);
        if (!resultA.success) {
          throw new Error(`${tokenA} approval failed: ${resultA.error}`);
        }
        console.log('[addLiquidity] Token A approved successfully');
      }

      // Step 2: Approve Token B (if needed)
      setTxStep(`Checking ${tokenB} allowance...`);
      const hasAllowanceB = await CasperService.checkAllowance(tokenBConfig.hash, publicKey, amountBRaw);
      console.log('[addLiquidity] hasAllowanceB:', hasAllowanceB);

      if (!hasAllowanceB) {
        setTxStep(`Approving ${tokenB}...`);
        console.log('[addLiquidity] Building approve deploy for tokenB...');

        const approveBDeploy = CasperService.buildApproveDeploy(
          tokenBConfig.hash,
          amountBRaw,
          signerPublicKey
        );

        const approveBJson = Deploy.toJSON(approveBDeploy);
        console.log('[addLiquidity] Requesting wallet signature for approve B...');
        const walletResponseB = await wallet.sign(JSON.stringify(approveBJson), signerPublicKey);

        if (walletResponseB.cancelled) {
          throw new Error('User cancelled the transaction');
        }

        const signedApproveB = CasperService.deployFromWalletResponse(approveBDeploy, walletResponseB, signerPublicKey);

        const approveBHash = await CasperService.submitDeploy(signedApproveB);
        console.log('[addLiquidity] approveBHash:', approveBHash);

        setTxStep(`Waiting for ${tokenB} approval...`);
        const resultB = await CasperService.waitForDeploy(approveBHash);
        if (!resultB.success) {
          throw new Error(`${tokenB} approval failed: ${resultB.error}`);
        }
        console.log('[addLiquidity] Token B approved successfully');
      }

      // Step 3: Call add_liquidity on Router
      setTxStep('Adding liquidity...');
      console.log('[addLiquidity] Building add_liquidity deploy...');

      const addLiquidityDeploy = CasperService.buildAddLiquidityDeploy(
        tokenAConfig.hash,
        tokenBConfig.hash,
        amountARaw,
        amountBRaw,
        amountAMin,
        amountBMin,
        signerPublicKey
      );

      const addLiquidityJson = Deploy.toJSON(addLiquidityDeploy);
      console.log('[addLiquidity] Requesting wallet signature for add_liquidity...');
      const walletResponseLiquidity = await wallet.sign(JSON.stringify(addLiquidityJson), signerPublicKey);

      if (walletResponseLiquidity.cancelled) {
        throw new Error('User cancelled the transaction');
      }

      const signedAddLiquidity = CasperService.deployFromWalletResponse(addLiquidityDeploy, walletResponseLiquidity, signerPublicKey);

      const addLiquidityHash = await CasperService.submitDeploy(signedAddLiquidity);
      console.log('[addLiquidity] addLiquidityHash:', addLiquidityHash);

      setTxStep('Waiting for confirmation...');
      const resultLiquidity = await CasperService.waitForDeploy(addLiquidityHash);
      if (!resultLiquidity.success) {
        throw new Error(`Add liquidity failed: ${resultLiquidity.error}`);
      }

      // Success! Refresh everything
      console.log('[addLiquidity] Success! Refreshing...');
      setTxStep('');
      await refreshBalances();
      await refreshPositions();
      await refreshReserves();

      // Clear form
      setAmountA('');
      setAmountB('');

      return addLiquidityHash;
    } catch (err: any) {
      console.error('[addLiquidity] Error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
      setTxStep('');
    }
  }, [connected, publicKey, tokenA, tokenB, amountA, amountB, refreshBalances, refreshPositions, refreshReserves]);

  const removeLiquidity = useCallback(async (): Promise<string | null> => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return null;
    }

    if (!lpAmount || parseFloat(lpAmount) <= 0) {
      setError('Please enter LP amount to remove');
      return null;
    }

    setLoading(true);
    setError(null);
    setTxStep('Remove liquidity coming soon...');

    try {
      // TODO: Implement remove liquidity
      // 1. Transfer LP tokens to Pair contract
      // 2. Call burn(to) on Pair to receive underlying tokens

      setError('Remove liquidity feature coming soon');
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
      setTxStep('');
    }
  }, [connected, publicKey, lpAmount]);

  return {
    tokenA,
    tokenB,
    amountA,
    amountB,
    poolShare,
    lpTokensReceived,
    setTokenA,
    setTokenB,
    setAmountA: handleAmountAChange,
    setAmountB,
    lpAmount,
    setLpAmount,
    removeTokenA,
    removeTokenB,
    reserveA,
    reserveB,
    totalSupply,
    pairExists,
    positions,
    addLiquidity,
    removeLiquidity,
    refreshPositions,
    refreshReserves,
    loading,
    txStep,
    error,
  };
}

export { DEMO_POOLS };
export default useLiquidity;
