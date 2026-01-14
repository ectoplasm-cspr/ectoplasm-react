import { useState, useCallback, useEffect } from 'react';
import * as sdk from 'casper-js-sdk';
import { useWallet } from '../contexts/WalletContext';
import { useDex } from '../contexts/DexContext';
import { useToast } from '../contexts/ToastContext';
import { EctoplasmConfig } from '../config/ectoplasm';
import { formatTokenAmount, parseTokenAmount } from '../utils/format';

export interface SwapQuote {
  valid: boolean;
  amountIn: string;
  amountInRaw: bigint;
  amountOut: string;
  amountOutRaw: bigint;
  rate: string;
  priceImpact: number;
  minReceived: string;
  path: string[];
  pathContracts?: string[];
  error?: string;
  demo?: boolean;
}

const { Deploy, PublicKey } = (sdk as any).default ?? sdk;

interface UseSwapResult {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  slippage: string;
  quote: SwapQuote | null;
  loading: boolean;
  quoting: boolean;
  error: string | null;
  setTokenIn: (symbol: string) => void;
  setTokenOut: (symbol: string) => void;
  setAmountIn: (amount: string) => void;
  setSlippage: (slippage: string) => void;
  switchTokens: () => void;
  executeSwap: () => Promise<string | null>;
  refreshQuote: () => Promise<void>;
}

export function useSwap(): UseSwapResult {
  const { connected, publicKey } = useWallet();
  const { dex, config } = useDex();
  const { showToast, removeToast } = useToast();

  const [tokenIn, setTokenIn] = useState('WCSPR');
  const [tokenOut, setTokenOut] = useState('ECTO');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('5.0'); // Default 5.0% for testnet
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshQuote = useCallback(async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setQuote(null);
      setAmountOut('');
      return;
    }

    setQuoting(true);
    setError(null);

    try {
      const tIn = config.tokens[tokenIn];
      const tOut = config.tokens[tokenOut];

      if (!tIn || !tOut) throw new Error("Invalid token configuration");

      const pairAddr = await dex.getPairAddress(tIn.packageHash!, tOut.packageHash!);

      if (!pairAddr) throw new Error('Liquidity pool not found');

      const reserves = await dex.getPairReserves(pairAddr);

      // Determine reserves based on token sort order
      const isTokenIn0 = dex.isToken0(tIn.packageHash!, tOut.packageHash!);
      const reserveIn = isTokenIn0 ? reserves.reserve0 : reserves.reserve1;
      const reserveOut = isTokenIn0 ? reserves.reserve1 : reserves.reserve0;

      if (reserveIn === 0n || reserveOut === 0n) throw new Error('Insufficient liquidity');

      const decimalsIn = tIn.decimals;
      const decimalsOut = tOut.decimals;

      const amountInRaw = BigInt(parseTokenAmount(amountIn, decimalsIn));
      const amountOutRaw = dex.getAmountOut(amountInRaw, reserveIn, reserveOut);
      const amountOutFormatted = formatTokenAmount(amountOutRaw, decimalsOut);

      // Price Impact Calculation
      // ideal = amountIn * (reserveOut / reserveIn) 
      // Note: Must adjust for decimals if they differ for the "price" ratio
      // simplified: impact = (ideal_output - actual_output) / ideal_output

      // We calculate prices as numbers for impact estimation
      const rIn = Number(reserveIn) / (10 ** decimalsIn); // normalized reserve
      const rOut = Number(reserveOut) / (10 ** decimalsOut); // normalized reserve
      const currentPrice = rOut / rIn;

      const inputVal = Number(amountIn);
      const outputVal = Number(amountOutFormatted);

      const idealOutput = inputVal * currentPrice;
      const priceImpact = ((idealOutput - outputVal) / idealOutput) * 100;

      // Minimum Received
      const slippagePercent = parseFloat(slippage) || 0;
      const minReceivedRaw = amountOutRaw * BigInt(Math.floor((100 - slippagePercent) * 100)) / 10000n;
      const minReceived = formatTokenAmount(minReceivedRaw, decimalsOut);

      setQuote({
        valid: true,
        amountIn,
        amountInRaw,
        amountOut: amountOutFormatted,
        amountOutRaw,
        rate: (outputVal / inputVal).toFixed(6),
        priceImpact: Math.max(0, priceImpact),
        minReceived,
        path: [tokenIn, tokenOut],
        pathContracts: [tIn.contractHash!, tOut.contractHash!],
        demo: false
      });
      setAmountOut(amountOutFormatted);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setQuote(null);
      setAmountOut('');
    } finally {
      setQuoting(false);
    }
  }, [tokenIn, tokenOut, amountIn, slippage, dex, config]);

  // Debounce quote
  useEffect(() => {
    const timeout = setTimeout(refreshQuote, 300);
    return () => clearTimeout(timeout);
  }, [refreshQuote]);

  const switchTokens = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    // Quote will refresh automatically due to effect
  }, [tokenOut, tokenIn, amountOut]);

  const executeSwap = useCallback(async (): Promise<string | null> => {
    if (!connected || !publicKey) {
      showToast('error', 'Please connect your wallet');
      return null;
    }
    if (!quote || !quote.valid) {
      showToast('error', 'Invalid quote');
      return null;
    }

    setLoading(true);
    let pendingId: string | null = null;

    try {
      const senderKey = PublicKey.fromHex(publicKey);
      const tIn = config.tokens[tokenIn];
      const tOut = config.tokens[tokenOut];
      const ownerAccountHash = `account-hash-${senderKey.accountHash().toHex()}`;

      // Helper to extract signature as hex
      const getSignatureHex = (providerRes: any) => {
        if (typeof providerRes === 'string') return providerRes;
        if (providerRes.signature) {
          const sig = providerRes.signature;
          if (typeof sig === 'string') return sig;
          if (typeof sig === 'object') {
            // Convert byte-like object to hex string
            return Object.values(sig).map((b: any) => Number(b).toString(16).padStart(2, '0')).join('');
          }
        }
        return '';
      };

      // Check current allowance
      pendingId = Date.now().toString();
      showToast('pending', 'Checking allowance...');

      const currentAllowance = await dex.getAllowance(
        tIn.packageHash!,
        ownerAccountHash,
        config.routerPackageHash
      );

      if (pendingId) removeToast(pendingId);

      let needsApproval = currentAllowance < quote.amountInRaw;

      // Get wallet provider (needed for both approval and swap)
      const w = window as any;
      const walletProvider = w.CasperWalletProvider && w.CasperWalletProvider();
      if (!walletProvider) throw new Error("Wallet provider not found");

      // 1. Approve (if needed)
      if (needsApproval) {
        pendingId = Date.now().toString();
        showToast('pending', 'Step 1/2: Sign Approval...');

        const approveDeploy = dex.makeApproveTokenDeploy(
          tIn.packageHash!,
          config.routerPackageHash,
          quote.amountInRaw,
          publicKey
        );

        const approveJson = Deploy.toJSON(approveDeploy);
        const approveRes = await walletProvider.sign(JSON.stringify(approveJson), publicKey);

        if (approveRes.cancelled) throw new Error('Approval cancelled');

        let approveSignature = getSignatureHex(approveRes);

        // Prepend algorithm tag if missing (Casper RPC expects tagged signatures)
        // Signatures are 64 bytes (128 hex). Tagged signatures are 65 bytes (130 hex).
        if (approveSignature.length === 128 && publicKey) {
          const algoTag = publicKey.substring(0, 2); // '01' for Ed25519, '02' for Secp256k1
          approveSignature = algoTag + approveSignature;
        }

        // Attach sig
        if (approveJson.approvals) approveJson.approvals.push({ signer: publicKey, signature: approveSignature });
        else approveJson.approvals = [{ signer: publicKey, signature: approveSignature }];

        if (pendingId) removeToast(pendingId);
        pendingId = Date.now().toString();
        showToast('pending', 'Step 1/2: Waiting for approval confirmation...');

        const approveHash = await dex.sendDeployRaw(approveJson);
        console.log(`📡 Waiting for approval deploy: ${approveHash}`);
        await dex.waitForDeploy(approveHash);
      }

      // 2. Swap
      pendingId = (Date.now() + 1).toString();
      const swapStepLabel = needsApproval ? 'Step 2/2' : 'Step 1/1';
      showToast('pending', `${swapStepLabel}: Sign Swap...`);

      // Recalculate min output based on current quote to be safe
      const slippagePercent = parseFloat(slippage) || 0.5;
      const minAmountOutRaw = BigInt(quote.amountOutRaw) * BigInt(Math.floor((100 - slippagePercent) * 100)) / 10000n;

      const swapDeploy = dex.makeSwapExactTokensForTokensDeploy(
        quote.amountInRaw,
        minAmountOutRaw,
        [tIn.packageHash!, tOut.packageHash!], // Use package hashes
        `account-hash-${senderKey.accountHash().toHex()}`,
        Date.now() + 1800000, // 30 mins
        publicKey
      );

      const swapJson = Deploy.toJSON(swapDeploy);
      const swapRes = await walletProvider.sign(JSON.stringify(swapJson), publicKey);

      if (swapRes.cancelled) throw new Error('Swap cancelled');

      let swapSignature = getSignatureHex(swapRes);

      // Prepend algorithm tag if missing
      if (swapSignature.length === 128 && publicKey) {
        const algoTag = publicKey.substring(0, 2);
        swapSignature = algoTag + swapSignature;
      }

      if (swapJson.approvals) swapJson.approvals.push({ signer: publicKey, signature: swapSignature });
      else swapJson.approvals = [{ signer: publicKey, signature: swapSignature }];

      if (pendingId) removeToast(pendingId);
      showToast('pending', 'Broadcasting Swap...');

      const txHash = await dex.sendDeployRaw(swapJson);
      showToast('success', 'Swap submitted!', txHash);

      setAmountIn('');
      setAmountOut('');
      setQuote(null);

      return txHash;

    } catch (err: any) {
      console.error(err);
      if (pendingId) removeToast(pendingId);
      showToast('error', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, quote, dex, config, slippage, showToast, removeToast]);

  return {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    slippage,
    quote,
    loading,
    quoting,
    error,
    setTokenIn,
    setTokenOut,
    setAmountIn,
    setSlippage,
    switchTokens,
    executeSwap,
    refreshQuote
  };
}
