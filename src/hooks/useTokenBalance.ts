import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useDex } from '../contexts/DexContext';
import { formatTokenAmount } from '../utils/format';
import * as sdk from 'casper-js-sdk';

const { PublicKey } = (sdk as any).default ?? sdk;

export interface BalanceResult {
  raw: bigint;
  formatted: string;
  decimals: number;
}

export function useTokenBalance(symbol: string) {
  const { publicKey, connected, balances } = useWallet();
  const { dex, config } = useDex();

  const [balance, setBalance] = useState<BalanceResult>({
    raw: BigInt(0),
    formatted: '0',
    decimals: 18
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with context balances immediately
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
      if (symbol.toUpperCase() === 'CSPR') {
        const raw = await dex.getCSPRBalance(publicKey);
        setBalance({ raw, formatted: formatTokenAmount(raw, 9), decimals: 9 });
      } else {
        const token = config.tokens[symbol.toUpperCase()];
        if (!token) throw new Error(`Unknown token ${symbol}`);

        let accountHash = '';
        try {
          accountHash = 'account-hash-' + PublicKey.fromHex(publicKey).accountHash().toHex();
        } catch (e) { } // handle error

        if (accountHash) {
          const raw = await dex.getTokenBalance(token.contractHash, accountHash);
          setBalance({ raw, formatted: formatTokenAmount(raw, token.decimals), decimals: token.decimals });
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error(`Error fetching ${symbol} balance:`, err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, symbol, dex, config]);

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
