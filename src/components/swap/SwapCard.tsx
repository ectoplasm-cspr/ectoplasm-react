import React, { useState } from 'react';
import { useSwap } from '../../hooks/useSwap';
import { useWallet } from '../../contexts/WalletContext';
import { SwapInput } from './SwapInput';
import { EctoplasmConfig } from '../../config/ectoplasm';

export function SwapCard() {
  const { connected, connect } = useWallet();
  const {
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
    executeSwap
  } = useSwap();

  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState(EctoplasmConfig.swap.defaultSlippage.toString());

  const handleSwap = async () => {
    if (!connected) {
      await connect();
      return;
    }

    const hash = await executeSwap();
    if (hash) {
      alert(`Swap submitted! Deploy hash: ${hash}`);
    }
  };

  const canSwap = connected && quote?.valid && !loading && !quoting && parseFloat(amountIn) > 0;
  const isDemo = quote?.demo;

  return (
    <div className="pump-card swap-card">
      <div className="swap-header">
        <h2>Swap</h2>
        <button
          className="btn ghost icon-btn"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Swap settings"
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div className="swap-settings">
          <label>
            Slippage tolerance
            <div className="slippage-options">
              {['0.1', '0.5', '1.0'].map((val) => (
                <button
                  key={val}
                  className={`btn ghost small ${slippage === val ? 'active' : ''}`}
                  onClick={() => setSlippage(val)}
                >
                  {val}%
                </button>
              ))}
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                min="0.1"
                max="50"
                step="0.1"
                className="slippage-input"
              />
              <span>%</span>
            </div>
          </label>
        </div>
      )}

      <SwapInput
        label="You pay"
        value={amountIn}
        onChange={setAmountIn}
        token={tokenIn}
        onTokenChange={setTokenIn}
      />

      <div className="swap-arrow-wrapper">
        <button
          className="btn ghost icon-btn swap-arrow"
          onClick={switchTokens}
          aria-label="Switch tokens"
        >
          ↓
        </button>
      </div>

      <SwapInput
        label="You receive"
        value={amountOut}
        token={tokenOut}
        onTokenChange={setTokenOut}
        readOnly
      />

      {quote && quote.valid && (
        <div className="swap-details">
          <div className="swap-detail-row">
            <span className="muted">Rate</span>
            <span>1 {tokenIn} = {quote.rate} {tokenOut}</span>
          </div>
          <div className="swap-detail-row">
            <span className="muted">Price Impact</span>
            <span className={parseFloat(quote.priceImpact) > 5 ? 'text-warning' : ''}>
              {quote.priceImpact}%
            </span>
          </div>
          {quote.minReceived && (
            <div className="swap-detail-row">
              <span className="muted">Min received</span>
              <span>{quote.minReceived} {tokenOut}</span>
            </div>
          )}
          <div className="swap-detail-row">
            <span className="muted">Fee</span>
            <span>{EctoplasmConfig.swap.feePercent}%</span>
          </div>
          {isDemo && (
            <div className="swap-demo-notice">
              Demo mode - using simulated rates
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="swap-error">
          {error}
        </div>
      )}

      <button
        className="btn primary full large"
        onClick={handleSwap}
        disabled={connected && (!canSwap || loading)}
      >
        {!connected
          ? 'Connect Wallet'
          : loading
          ? 'Swapping...'
          : quoting
          ? 'Getting quote...'
          : isDemo
          ? 'Swap (Demo)'
          : 'Swap'}
      </button>
    </div>
  );
}

export default SwapCard;
