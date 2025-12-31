import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { CasperService } from '../services/casper';
import { EctoplasmConfig } from '../config/ectoplasm';
import { parseTokenAmount, formatTokenAmount } from '../utils/format';

interface LiquidityPosition {
  pairName: string;
  tokenA: string;
  tokenB: string;
  lpBalance: string;
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

  // Positions
  positions: LiquidityPosition[];

  // Actions
  addLiquidity: () => Promise<string | null>;
  removeLiquidity: () => Promise<string | null>;
  refreshPositions: () => Promise<void>;

  // Status
  loading: boolean;
  error: string | null;
}

// Demo pools data
const DEMO_POOLS = [
  {
    name: 'ECTO/USDC',
    tokenA: 'ECTO',
    tokenB: 'USDC',
    tvl: 78400000,
    apr: 22.4,
    minStake: 50,
    lstToken: 'stECTO',
    features: ['Boosted rewards', 'Flexible'],
  },
  {
    name: 'WETH/USDC',
    tokenA: 'WETH',
    tokenB: 'USDC',
    tvl: 45200000,
    apr: 18.6,
    minStake: 0.01,
    lstToken: 'stWETH',
    features: ['Auto-compound', 'No lock'],
  },
  {
    name: 'WBTC/USDC',
    tokenA: 'WBTC',
    tokenB: 'USDC',
    tvl: 32100000,
    apr: 15.2,
    minStake: 0.001,
    lstToken: 'stWBTC',
    features: ['Auto-compound', 'Premium'],
  },
];

export function useLiquidity(): UseLiquidityResult {
  const { connected, publicKey, balances, refreshBalances } = useWallet();

  // Add liquidity state
  const [tokenA, setTokenA] = useState('USDC');
  const [tokenB, setTokenB] = useState('ECTO');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [poolShare, setPoolShare] = useState('0.00');
  const [lpTokensReceived, setLpTokensReceived] = useState('0.00');

  // Remove liquidity state
  const [lpAmount, setLpAmount] = useState('');
  const [removeTokenA, setRemoveTokenA] = useState('');
  const [removeTokenB, setRemoveTokenB] = useState('');

  // Positions
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate pool share and LP tokens when amounts change
  useEffect(() => {
    if (!amountA || parseFloat(amountA) <= 0) {
      setPoolShare('0.00');
      setLpTokensReceived('0.00');
      return;
    }

    // Demo calculation - in real implementation, this would query the pair contract
    const amountANum = parseFloat(amountA);
    const amountBNum = parseFloat(amountB) || 0;

    // Simulated pool share (would be calculated from reserves)
    const simulatedPoolShare = Math.min((amountANum * 0.001), 10).toFixed(4);
    setPoolShare(simulatedPoolShare);

    // LP tokens received (simplified - sqrt(amountA * amountB) for new pools)
    const lpTokens = Math.sqrt(amountANum * (amountBNum || amountANum)).toFixed(4);
    setLpTokensReceived(lpTokens);
  }, [amountA, amountB]);

  // Auto-calculate amountB based on amountA and pool ratio
  const handleAmountAChange = useCallback((amount: string) => {
    setAmountA(amount);

    if (!amount || parseFloat(amount) <= 0) {
      setAmountB('');
      return;
    }

    // Get demo rate between tokens
    const tokenAConfig = EctoplasmConfig.getToken(tokenA);
    const tokenBConfig = EctoplasmConfig.getToken(tokenB);

    if (tokenAConfig && tokenBConfig) {
      // Demo rates - in real implementation, query pair reserves
      const demoRates: Record<string, Record<string, number>> = {
        usdc: { ecto: 1.43, weth: 0.00043, wbtc: 0.000023 },
        ecto: { usdc: 0.70, weth: 0.0003, wbtc: 0.000016 },
        weth: { usdc: 2333, ecto: 3333, wbtc: 0.053 },
        wbtc: { usdc: 43750, ecto: 62500, weth: 18.87 },
      };

      const rate = demoRates[tokenA.toLowerCase()]?.[tokenB.toLowerCase()] || 1;
      const calculatedB = (parseFloat(amount) * rate).toFixed(6);
      setAmountB(calculatedB);
    }
  }, [tokenA, tokenB]);

  const refreshPositions = useCallback(async () => {
    if (!connected || !publicKey) {
      setPositions([]);
      return;
    }

    // Demo positions - in real implementation, query LP token balances
    // For now, show empty if not connected
    setPositions([]);
  }, [connected, publicKey]);

  useEffect(() => {
    refreshPositions();
  }, [refreshPositions]);

  const addLiquidity = useCallback(async (): Promise<string | null> => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return null;
    }

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      setError('Please enter valid amounts');
      return null;
    }

    const tokenAConfig = EctoplasmConfig.getToken(tokenA);
    const tokenBConfig = EctoplasmConfig.getToken(tokenB);

    if (!tokenAConfig?.hash || !tokenBConfig?.hash) {
      setError('Token contracts not deployed. This is a demo.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Check allowances and approve if needed
      const amountARaw = BigInt(parseTokenAmount(amountA, tokenAConfig.decimals));
      const amountBRaw = BigInt(parseTokenAmount(amountB, tokenBConfig.decimals));

      // Check Token A allowance
      const hasAllowanceA = await CasperService.checkAllowance(
        tokenAConfig.hash,
        publicKey,
        amountARaw
      );

      if (!hasAllowanceA) {
        const approveDeploy = CasperService.buildApproveDeploy(
          tokenAConfig.hash,
          amountARaw,
          publicKey
        );

        const w = window as any;
        if (!w.CasperWalletProvider) {
          throw new Error('No wallet available for signing');
        }

        const wallet = w.CasperWalletProvider();
        const signedApprove = await wallet.sign(JSON.stringify(approveDeploy), publicKey);
        const approveHash = await CasperService.submitDeploy(signedApprove);

        const result = await CasperService.waitForDeploy(approveHash);
        if (!result.success) {
          throw new Error(`${tokenA} approval failed: ${result.error}`);
        }
      }

      // Check Token B allowance
      const hasAllowanceB = await CasperService.checkAllowance(
        tokenBConfig.hash,
        publicKey,
        amountBRaw
      );

      if (!hasAllowanceB) {
        const approveDeploy = CasperService.buildApproveDeploy(
          tokenBConfig.hash,
          amountBRaw,
          publicKey
        );

        const w = window as any;
        const wallet = w.CasperWalletProvider();
        const signedApprove = await wallet.sign(JSON.stringify(approveDeploy), publicKey);
        const approveHash = await CasperService.submitDeploy(signedApprove);

        const result = await CasperService.waitForDeploy(approveHash);
        if (!result.success) {
          throw new Error(`${tokenB} approval failed: ${result.error}`);
        }
      }

      // Note: In a real implementation, we would build and submit the add_liquidity deploy here
      // For now, show demo message
      setError('Add liquidity transaction would be submitted here (demo mode)');

      // Refresh balances
      await refreshBalances();

      // Clear form
      setAmountA('');
      setAmountB('');

      return 'demo-deploy-hash';
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, tokenA, tokenB, amountA, amountB, refreshBalances]);

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

    try {
      // Note: In a real implementation, we would build and submit the remove_liquidity deploy
      setError('Remove liquidity transaction would be submitted here (demo mode)');

      await refreshBalances();
      setLpAmount('');

      return 'demo-deploy-hash';
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, lpAmount, refreshBalances]);

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
    positions,
    addLiquidity,
    removeLiquidity,
    refreshPositions,
    loading,
    error,
  };
}

export { DEMO_POOLS };
export default useLiquidity;
