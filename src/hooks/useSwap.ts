import { useState, useCallback, useEffect } from 'react';
import { Deploy } from 'casper-js-sdk';
import { useWallet } from '../contexts/WalletContext';
import { CasperService, SwapQuote } from '../services/casper';
import { EctoplasmConfig } from '../config/ectoplasm';

interface UseSwapResult {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  quote: SwapQuote | null;
  loading: boolean;
  quoting: boolean;
  error: string | null;
  setTokenIn: (symbol: string) => void;
  setTokenOut: (symbol: string) => void;
  setAmountIn: (amount: string) => void;
  switchTokens: () => void;
  executeSwap: (slippagePercent?: number) => Promise<string | null>;
  refreshQuote: () => Promise<void>;
}

export function useSwap(): UseSwapResult {
  const { connected, publicKey, refreshBalances } = useWallet();

  const [tokenIn, setTokenIn] = useState('WCSPR');
  const [tokenOut, setTokenOut] = useState('ECTO');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get quote when inputs change
  const refreshQuote = useCallback(async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setQuote(null);
      setAmountOut('');
      return;
    }

    setQuoting(true);
    setError(null);

    try {
      const newQuote = await CasperService.getSwapQuote(tokenIn, tokenOut, amountIn);
      setQuote(newQuote);

      if (newQuote.valid) {
        setAmountOut(newQuote.amountOut);
      } else {
        setError(newQuote.error || 'Invalid quote');
        setAmountOut('');
      }
    } catch (err: any) {
      setError(err.message);
      setQuote(null);
      setAmountOut('');
    } finally {
      setQuoting(false);
    }
  }, [tokenIn, tokenOut, amountIn]);

  // Debounce quote refresh
  useEffect(() => {
    const timeout = setTimeout(refreshQuote, 300);
    return () => clearTimeout(timeout);
  }, [refreshQuote]);

  const switchTokens = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  }, [tokenIn, tokenOut, amountIn, amountOut]);

  const executeSwap = useCallback(async (slippagePercent: number = EctoplasmConfig.swap.defaultSlippage): Promise<string | null> => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return null;
    }

    if (!quote || !quote.valid) {
      setError('Invalid quote');
      return null;
    }

    if (quote.demo) {
      setError('Demo mode: Token contracts not deployed. Swap cannot be executed.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const signerPublicKey = CasperService.normalizePublicKeyHex(publicKey);

      // Check allowance and approve if needed
      const tokenInContractHash = quote.pathContracts?.[0] ?? quote.path?.[0];
      if (tokenInContractHash) {
        const hasAllowance = await CasperService.checkAllowance(
          tokenInContractHash,
          publicKey,
          quote.amountInRaw
        );

        if (!hasAllowance) {
          const w = window as any;
          if (!w.CasperWalletProvider) {
            throw new Error('No wallet available for signing');
          }
          const wallet = w.CasperWalletProvider();

          // Build and sign approval deploy
          const approveDeploy = CasperService.buildApproveDeploy(
            tokenInContractHash,
            quote.amountInRaw,
            signerPublicKey
          );

          const approveJson = Deploy.toJSON(approveDeploy);
          const walletResponse = await wallet.sign(JSON.stringify(approveJson), signerPublicKey);
          const signedApprove = CasperService.deployFromWalletResponse(approveDeploy, walletResponse, signerPublicKey);

          // Submit + wait approval
          const approveHash = await CasperService.submitDeploy(signedApprove);
          console.log('Approval submitted:', approveHash);

          // Wait for approval
          const approveResult = await CasperService.waitForDeploy(approveHash);
          if (!approveResult.success) {
            throw new Error(`Approval failed: ${approveResult.error}`);
          }
        }
      }

      // Build swap deploy
      const w = window as any;
      if (!w.CasperWalletProvider) {
        throw new Error('No wallet available for signing');
      }
      const wallet = w.CasperWalletProvider();

      const swapDeploy = CasperService.buildSwapDeploy(quote, signerPublicKey, slippagePercent);
      const swapJson = Deploy.toJSON(swapDeploy);
      const walletResponse = await wallet.sign(JSON.stringify(swapJson), signerPublicKey);
      const signedSwap = CasperService.deployFromWalletResponse(swapDeploy, walletResponse, signerPublicKey);

      // Submit + wait swap
      const swapHash = await CasperService.submitDeploy(signedSwap);
      console.log('Swap submitted:', swapHash);

      const swapResult = await CasperService.waitForDeploy(swapHash);
      if (!swapResult.success) {
        throw new Error(`Swap failed: ${swapResult.error}`);
      }

      // Refresh balances
      await refreshBalances();

      // Clear form
      setAmountIn('');
      setAmountOut('');
      setQuote(null);

      return swapHash;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, quote, refreshBalances]);

  return {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    quote,
    loading,
    quoting,
    error,
    setTokenIn,
    setTokenOut,
    setAmountIn,
    switchTokens,
    executeSwap,
    refreshQuote
  };
}

export default useSwap;
