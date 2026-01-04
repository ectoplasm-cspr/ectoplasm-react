import { useState, useCallback, useEffect } from 'react';
import * as sdk from 'casper-js-sdk';
import { useWallet } from '../contexts/WalletContext';
import { useDex } from '../contexts/DexContext';
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
  lpAmount: string;
  setLpAmount: (amount: string) => void;
  removeTokenA: string;
  setRemoveTokenA: (symbol: string) => void;
  removeTokenB: string;
  setRemoveTokenB: (symbol: string) => void;
  reserveA: string;
  reserveB: string;
  totalSupply: string;
  pairExists: boolean;
  positions: LiquidityPosition[];
  addLiquidity: () => Promise<string | null>;
  removeLiquidity: () => Promise<string | null>;
  refreshPositions: () => Promise<void>;
  refreshReserves: () => Promise<void>;
  loading: boolean;
  txStep: string;
  error: string | null;
}

const { Deploy, PublicKey } = (sdk as any).default ?? sdk;

// BigInt Sqrt
function sqrt(value: bigint): bigint {
  if (value < 0n) throw new Error("negative sqrt");
  if (value < 2n) return value;
  let newX = value / 2n;
  let oldX = 0n;
  while (newX !== oldX && newX !== oldX - 1n) {
    oldX = newX;
    newX = (value / newX + newX) / 2n;
  }
  return newX;
}

function estimateLPTokens(
  amountA: bigint,
  amountB: bigint,
  reserveA: bigint,
  reserveB: bigint,
  totalSupply: bigint
): bigint {
  if (totalSupply === 0n) {
    const product = amountA * amountB;
    const root = sqrt(product);
    const MINIMUM_LIQUIDITY = 1000n;
    return root > MINIMUM_LIQUIDITY ? root - MINIMUM_LIQUIDITY : 0n;
  }
  const sideA = (amountA * totalSupply) / reserveA;
  const sideB = (amountB * totalSupply) / reserveB;
  return sideA < sideB ? sideA : sideB;
}

export function useLiquidity(): UseLiquidityResult {
  const { connected, publicKey, refreshBalances } = useWallet();
  const { dex, config } = useDex();

  const [tokenA, setTokenA] = useState('ECTO');
  const [tokenB, setTokenB] = useState('USDC');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [poolShare, setPoolShare] = useState('0.00');
  const [lpTokensReceived, setLpTokensReceived] = useState('0.00');

  const [lpAmount, setLpAmount] = useState('');
  const [removeTokenA, setRemoveTokenA] = useState('');
  const [removeTokenB, setRemoveTokenB] = useState('');

  const [reserveA, setReserveA] = useState('0');
  const [reserveB, setReserveB] = useState('0');
  const [totalSupply, setTotalSupply] = useState('0');
  const [pairExists, setPairExists] = useState(false);

  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [txStep, setTxStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refreshReserves = useCallback(async () => {
    const tA = config.tokens[tokenA];
    const tB = config.tokens[tokenB];
    if (!tA || !tB) return;

    try {
      // Get Pair Address
      const pairAddr = await dex.getPairAddress(tA.packageHash, tB.packageHash);
      if (!pairAddr) {
        setPairExists(false);
        setReserveA('0');
        setReserveB('0');
        setTotalSupply('0');
        return;
      }
      setPairExists(true);

      const reserves = await dex.getPairReserves(pairAddr);
      const supply = await dex.getTotalSupply(pairAddr);

      const isTokenAStart = dex.isToken0(tA.packageHash, tB.packageHash);
      const rA = isTokenAStart ? reserves.reserve0 : reserves.reserve1;
      const rB = isTokenAStart ? reserves.reserve1 : reserves.reserve0;

      setReserveA(formatTokenAmount(rA, tA.decimals));
      setReserveB(formatTokenAmount(rB, tB.decimals));
      setTotalSupply(formatTokenAmount(supply, 18));
    } catch (e) {
      console.error(e);
      setPairExists(false);
    }
  }, [tokenA, tokenB, dex, config]);

  useEffect(() => {
    refreshReserves();
  }, [refreshReserves]);

  useEffect(() => {
    if (!amountA || parseFloat(amountA) <= 0) {
      setPoolShare('0.00');
      setLpTokensReceived('0.00');
      return;
    }

    const calc = async () => {
      const tA = config.tokens[tokenA];
      const tB = config.tokens[tokenB];
      if (!tA || !tB) return;

      try {
        const pairAddr = await dex.getPairAddress(tA.packageHash, tB.packageHash);
        if (!pairAddr) {
          // Estimation for new pool
          if (amountA && amountB) {
            const aRaw = BigInt(parseTokenAmount(amountA, tA.decimals));
            const bRaw = BigInt(parseTokenAmount(amountB, tB.decimals));
            const est = estimateLPTokens(aRaw, bRaw, 0n, 0n, 0n);
            setLpTokensReceived(formatTokenAmount(est, 18));
            setPoolShare('100.00');
          }
          return;
        }

        const reserves = await dex.getPairReserves(pairAddr);
        const supply = await dex.getTotalSupply(pairAddr);

        const isTokenAStart = dex.isToken0(tA.packageHash, tB.packageHash);
        const rA = isTokenAStart ? reserves.reserve0 : reserves.reserve1;
        const rB = isTokenAStart ? reserves.reserve1 : reserves.reserve0;

        const aRaw = BigInt(parseTokenAmount(amountA, tA.decimals));
        const bRaw = amountB ? BigInt(parseTokenAmount(amountB, tB.decimals)) : 0n;

        const est = estimateLPTokens(aRaw, bRaw, rA, rB, supply);
        setLpTokensReceived(formatTokenAmount(est, 18));

        const share = supply > 0n ? Number(est * 10000n / (supply + est)) / 100 : 100;
        setPoolShare(share.toFixed(2));
      } catch (e) { console.error(e); }
    };
    calc();
  }, [amountA, amountB, tokenA, tokenB, dex, config]);

  const handleAmountAChange = useCallback(async (val: string) => {
    setAmountA(val);
    if (!val || parseFloat(val) <= 0) { setAmountB(''); return; }

    const tA = config.tokens[tokenA];
    const tB = config.tokens[tokenB];
    if (!tA || !tB) return;

    try {
      const pairAddr = await dex.getPairAddress(tA.packageHash, tB.packageHash);
      if (!pairAddr) return; // Independent input for new pool

      const reserves = await dex.getPairReserves(pairAddr);
      const isTokenAStart = dex.isToken0(tA.packageHash, tB.packageHash);
      const rA = isTokenAStart ? reserves.reserve0 : reserves.reserve1;
      const rB = isTokenAStart ? reserves.reserve1 : reserves.reserve0;

      if (rA > 0n && rB > 0n) {
        const aRaw = BigInt(parseTokenAmount(val, tA.decimals));
        const bRaw = aRaw * rB / rA;
        setAmountB(formatTokenAmount(bRaw, tB.decimals));
      }
    } catch (e) { }
  }, [tokenA, tokenB, dex, config]);

  const refreshPositions = useCallback(async () => {
    if (!connected || !publicKey) { setPositions([]); return; }

    const accHash = `account-hash-${PublicKey.fromHex(publicKey).accountHash().toHex()}`;
    const newPos: LiquidityPosition[] = [];

    // We don't have list of all pairs easily unless we getAllPairs and iterate
    // Assuming known config pairs or we iterate all
    try {
      const allPairs = await dex.getAllPairs();
      // For each pair, check balance
      for (const pairAddr of allPairs) {
        const bal = await dex.getTokenBalance(pairAddr, accHash);
        if (bal > 0n) {
          // Need to identify tokens for this pair
          // DexClient doesn't expose pair->tokens map easily unless we query Factory or have it in config
          // For now, rely on config.pairs if populated or try to reverse map
          // EctoplasmConfig has 'pairs' mapping name -> hash.

          // Find name from hash
          const entry = Object.entries(config.pairs).find(([k, v]) => v === pairAddr);
          // If not found in config, we might skip or generic name
          if (!entry) continue; // Skip unknown pairs for UI clarity

          const pairName = entry[0];
          const [sA, sB] = pairName.split('-'); // e.g. WCSPR-ECTO

          const tA = config.tokens[sA];
          const tB = config.tokens[sB];
          if (!tA || !tB) continue;

          const reserves = await dex.getPairReserves(pairAddr);
          const supply = await dex.getTotalSupply(pairAddr);

          const isTokenAStart = dex.isToken0(tA.packageHash, tB.packageHash);
          const rA = isTokenAStart ? reserves.reserve0 : reserves.reserve1;
          const rB = isTokenAStart ? reserves.reserve1 : reserves.reserve0;

          const shareA = supply > 0n ? (bal * rA / supply) : 0n;
          const shareB = supply > 0n ? (bal * rB / supply) : 0n;
          const sharePct = supply > 0n ? Number(bal * 10000n / supply) / 100 : 0;

          newPos.push({
            pairName,
            pairHash: pairAddr,
            tokenA: sA,
            tokenB: sB,
            lpBalance: formatTokenAmount(bal, 18),
            lpBalanceRaw: bal,
            sharePercent: sharePct,
            tokenAAmount: formatTokenAmount(shareA, tA.decimals),
            tokenBAmount: formatTokenAmount(shareB, tB.decimals)
          });
        }
      }
      setPositions(newPos);
    } catch (e) { console.error(e); }

  }, [connected, publicKey, dex, config]);

  useEffect(() => { refreshPositions(); }, [refreshPositions]);

  const addLiquidity = useCallback(async (): Promise<string | null> => {
    if (!connected || !publicKey) { setError("Connect wallet"); return null; }
    if (!amountA || !amountB) { setError("Enter amounts"); return null; }

    const tA = config.tokens[tokenA];
    const tB = config.tokens[tokenB];
    if (!tA || !tB) return null;

    setLoading(true);
    setError(null);
    setTxStep('Preparing...');

    let txHash = null;

    try {
      const senderKey = PublicKey.fromHex(publicKey);
      const aRaw = BigInt(parseTokenAmount(amountA, tA.decimals));
      const bRaw = BigInt(parseTokenAmount(amountB, tB.decimals));

      // Approve A
      setTxStep(`Approving ${tokenA}...`);
      const w = (window as any).CasperWalletProvider && (window as any).CasperWalletProvider();
      if (!w) throw new Error("No wallet");

      const approveA = dex.makeApproveTokenDeploy(tA.packageHash, config.routerPackageHash, aRaw, senderKey);
      const sigA = await w.sign(JSON.stringify(Deploy.toJSON(approveA)), publicKey);
      const deployA = Deploy.toJSON(approveA);
      deployA.approvals = [{ signer: publicKey, signature: sigA }];
      const hashA = await dex.sendDeployRaw(deployA);
      await dex.waitForDeploy(hashA);

      // Approve B
      setTxStep(`Approving ${tokenB}...`);
      const approveB = dex.makeApproveTokenDeploy(tB.packageHash, config.routerPackageHash, bRaw, senderKey);
      const sigB = await w.sign(JSON.stringify(Deploy.toJSON(approveB)), publicKey);
      const deployB = Deploy.toJSON(approveB);
      deployB.approvals = [{ signer: publicKey, signature: sigB }];
      const hashB = await dex.sendDeployRaw(deployB);
      await dex.waitForDeploy(hashB);

      // Add Liquidity
      setTxStep('adding liquidity...');
      const minA = aRaw * 99n / 100n;
      const minB = bRaw * 99n / 100n;

      const accHash = `account-hash-${senderKey.accountHash().toHex()}`;

      const addLiq = dex.makeAddLiquidityDeploy(
        tA.packageHash,
        tB.packageHash,
        aRaw, bRaw, minA, minB,
        accHash,
        Date.now() + 1800000,
        senderKey
      );

      const sigLiq = await w.sign(JSON.stringify(Deploy.toJSON(addLiq)), publicKey);
      const deployLiq = Deploy.toJSON(addLiq);
      deployLiq.approvals = [{ signer: publicKey, signature: sigLiq }];

      setTxStep('Broadcasting...');
      txHash = await dex.sendDeployRaw(deployLiq);

      setTxStep('Success!');
      await refreshBalances();
      await refreshReserves();
      await refreshPositions();

      return txHash;

    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
      setTxStep('');
    }
  }, [connected, publicKey, amountA, amountB, tokenA, tokenB, dex, config, refreshBalances, refreshReserves, refreshPositions]);

  const removeLiquidity = useCallback(async (): Promise<string | null> => {
    // Stub for now or implement similar to addLiquidity
    return null;
  }, []);

  return {
    tokenA, tokenB, amountA, amountB, poolShare, lpTokensReceived,
    setTokenA, setTokenB, setAmountA: handleAmountAChange, setAmountB,
    lpAmount, setLpAmount, removeTokenA, setRemoveTokenA, removeTokenB, setRemoveTokenB,
    reserveA, reserveB, totalSupply, pairExists, positions,
    addLiquidity, removeLiquidity, refreshPositions, refreshReserves,
    loading, txStep, error
  };
}

export default useLiquidity;
