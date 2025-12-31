import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';

type OrderTab = 'swap' | 'limit' | 'buy' | 'sell';

export function LandingSwapCard() {
  const { balances } = useWallet();
  const [activeTab, setActiveTab] = useState<OrderTab>('swap');
  const [tokenIn] = useState('CSPR');
  const [tokenOut] = useState('ECTO');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut] = useState('');

  return (
    <div className="hero-card swap-shell" aria-labelledby="swap-heading-title">
      {/* Toolbar with tabs and icons */}
      <div className="swap-toolbar compact">
        <div className="swap-quick-actions" aria-label="Swap controls">
          <div className="swap-tabs" role="tablist" aria-label="Order type">
            <button
              type="button"
              className={`pill ${activeTab === 'swap' ? 'active' : 'ghost'}`}
              onClick={() => setActiveTab('swap')}
              role="tab"
              aria-selected={activeTab === 'swap'}
            >
              Swap
            </button>
            <button
              type="button"
              className={`pill ${activeTab === 'limit' ? 'active' : 'ghost'}`}
              onClick={() => setActiveTab('limit')}
              role="tab"
              aria-selected={activeTab === 'limit'}
            >
              Limit
            </button>
            <button
              type="button"
              className={`pill ${activeTab === 'buy' ? 'active' : 'ghost'}`}
              onClick={() => setActiveTab('buy')}
              role="tab"
              aria-selected={activeTab === 'buy'}
            >
              Buy
            </button>
            <button
              type="button"
              className={`pill ${activeTab === 'sell' ? 'active' : 'ghost'}`}
              onClick={() => setActiveTab('sell')}
              role="tab"
              aria-selected={activeTab === 'sell'}
            >
              Sell
            </button>
          </div>
          <div className="quick-icons" aria-label="Inline tools">
            <button type="button" className="icon-btn" aria-label="Settings">
              <span aria-hidden="true">&#9881;&#65039;</span>
            </button>
            <button type="button" className="icon-btn" aria-label="Details">
              <span aria-hidden="true">&#128202;</span>
            </button>
            <button type="button" className="icon-btn" aria-label="Network">
              <span aria-hidden="true">&#127760;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Swap Form Preview */}
      <form className="swap-form swap-form-compact" onSubmit={(e) => e.preventDefault()}>
        <label className="token-row">
          <div className="token-row-top">
            <span className="muted">Sell</span>
            <span className="balance">Balance: {balances[tokenIn]?.formatted || '0'}</span>
          </div>
          <div className="token-input">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              min="0"
              step="any"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              aria-label="Sell amount"
            />
            <div className="token-selector">
              <select value={tokenIn} disabled aria-label="Sell token">
                <option value="CSPR">CSPR</option>
                <option value="ECTO">ECTO</option>
              </select>
            </div>
          </div>
        </label>

        <div className="arrow-divider">
          <button type="button" className="arrow-circle" aria-label="Reverse tokens">
            &#8645;
          </button>
        </div>

        <label className="token-row">
          <div className="token-row-top">
            <span className="muted">Buy</span>
            <span className="balance">Estimated</span>
          </div>
          <div className="token-input">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              min="0"
              step="any"
              value={amountOut}
              readOnly
              aria-label="Buy amount"
            />
            <div className="token-selector">
              <select value={tokenOut} disabled aria-label="Buy token">
                <option value="ECTO">ECTO</option>
                <option value="CSPR">CSPR</option>
              </select>
            </div>
          </div>
        </label>

        <div className="swap-actions">
          <Link className="btn primary full" to="/swap" data-activate-swap>
            Let's Begin
          </Link>
        </div>
      </form>
    </div>
  );
}

export default LandingSwapCard;
