import React, { useState } from 'react';
import { useLiquidity } from '../../hooks/useLiquidity';
import { useWallet } from '../../contexts/WalletContext';

interface RemoveLiquidityProps {
  pairName?: string;
  tokenA?: string;
  tokenB?: string;
  lpBalance?: string;
  onClose?: () => void;
}

export function RemoveLiquidity({
  pairName = 'ECTO/USDC',
  tokenA = 'ECTO',
  tokenB = 'USDC',
  lpBalance = '0',
  onClose,
}: RemoveLiquidityProps) {
  const { connected, connect } = useWallet();
  const { removeLiquidity, loading, error } = useLiquidity();
  const [percentage, setPercentage] = useState(100);
  const [lpAmount, setLpAmount] = useState(lpBalance);

  const handlePercentageChange = (pct: number) => {
    setPercentage(pct);
    const newAmount = (parseFloat(lpBalance) * pct / 100).toFixed(6);
    setLpAmount(newAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      await connect();
      return;
    }
    const hash = await removeLiquidity();
    if (hash && onClose) {
      onClose();
    }
  };

  // Calculate estimated outputs (demo)
  const estimatedA = (parseFloat(lpAmount) * 0.5 || 0).toFixed(4);
  const estimatedB = (parseFloat(lpAmount) * 0.5 || 0).toFixed(4);

  return (
    <div className="remove-liquidity">
      <h3>Remove Liquidity</h3>
      <p className="muted tiny">Remove your {pairName} liquidity position</p>

      <form onSubmit={handleSubmit}>
        {/* Percentage Selector */}
        <div className="percentage-selector">
          <label className="muted tiny">Amount to Remove</label>
          <div className="percentage-display">
            <span className="percentage-value">{percentage}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={percentage}
            onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
            className="percentage-slider"
          />
          <div className="percentage-buttons">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                className={`btn ghost small ${percentage === pct ? 'active' : ''}`}
                onClick={() => handlePercentageChange(pct)}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* LP Tokens */}
        <div className="remove-summary">
          <div className="summary-row">
            <span className="muted tiny">LP Tokens to Burn</span>
            <span>{lpAmount}</span>
          </div>
        </div>

        {/* Estimated Outputs */}
        <div className="remove-outputs">
          <label className="muted tiny">You Will Receive</label>
          <div className="output-row">
            <span>{tokenA}</span>
            <span>{estimatedA}</span>
          </div>
          <div className="output-row">
            <span>{tokenB}</span>
            <span>{estimatedB}</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="lp-error">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="remove-actions">
          {onClose && (
            <button
              type="button"
              className="btn ghost"
              onClick={onClose}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn primary"
            disabled={connected && (loading || parseFloat(lpAmount) <= 0)}
          >
            {!connected
              ? 'Connect Wallet'
              : loading
              ? 'Removing...'
              : 'Remove Liquidity'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RemoveLiquidity;
