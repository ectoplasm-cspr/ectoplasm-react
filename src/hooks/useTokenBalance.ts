import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { CasperService, BalanceResult } from '../services/casper';
import { EctoplasmConfig } from '../config/ectoplasm';

export function useTokenBalance(symbol: string) {
  const { publicKey, connected, balances } = useWallet();
  const [balance, setBalance] = useState<BalanceResult>({
    raw: BigInt(0),
    formatted: '0',
    decimals: 18
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get balance from context if available
  useEffect(() => {
    if (balances[symbol.toUpperCase()]) {
      setBalance(balances[symbol.toUpperCase()]);
    }
  }, [balances, symbol]);

  const refresh = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance({ raw: BigInt(0), formatted: '0', decimals: 18 });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = EctoplasmConfig.getToken(symbol);
      if (!token) {
        throw new Error(`Unknown token: ${symbol}`);
      }

      let result: BalanceResult;
      if (symbol.toUpperCase() === 'CSPR') {
        result = await CasperService.getNativeBalance(publicKey);
      } else if (token.hash) {
        result = await CasperService.getTokenBalance(token.hash, publicKey);
      } else {
        result = { raw: BigInt(0), formatted: '0', decimals: token.decimals };
      }

      setBalance(result);
    } catch (err: any) {
      setError(err.message);
      console.error(`Error fetching ${symbol} balance:`, err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, symbol]);

  return {
    balance: balance.formatted,
    balanceRaw: balance.raw,
    decimals: balance.decimals,
    loading,
    error,
    refresh
  };
}

export default useTokenBalance;
