import { useState } from 'react';
import { useSwap } from '../../hooks/useSwap';
import { useWallet } from '../../contexts/WalletContext';
import { EctoplasmConfig } from '../../config/ectoplasm';

type OrderTab = 'swap' | 'limit' | 'buy' | 'sell';

export function SwapCard() {
  const { connected, connect, balances } = useWallet();
  const {
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
    executeSwap
  } = useSwap();

  const [activeTab, setActiveTab] = useState<OrderTab>('swap');
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);

  const handleSwap = async () => {
    if (!connected) {
      await connect();
      return;
    }
    const hash = await executeSwap();
    if (hash) {
      // alert handled by toast in hook
    }
  };

  const closeAllPopouts = () => {
    setShowSettings(false);
    setShowDetails(false);
    setShowNetwork(false);
  };

  const togglePopout = (popout: 'settings' | 'details' | 'network') => {
    closeAllPopouts();
    if (popout === 'settings') setShowSettings(!showSettings);
    if (popout === 'details') setShowDetails(!showDetails);
    if (popout === 'network') setShowNetwork(!showNetwork);
  };

  const canSwap = connected && quote?.valid && !loading && !quoting && parseFloat(amountIn) > 0;
  
  // Helpers for Price Impact Color
  const getImpactColor = (impact: number) => {
      if (impact < 1) return 'var(--success)';
      if (impact < 5) return 'var(--warning)';
      return 'var(--error)';
  };

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
            <button
              type="button"
              className="icon-btn"
              onClick={() => togglePopout('settings')}
              aria-haspopup="true"
              aria-expanded={showSettings}
            >
              <span className="visually-hidden">Open swap settings</span>
              <span aria-hidden="true">&#9881;&#65039;</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => togglePopout('details')}
              aria-haspopup="true"
              aria-expanded={showDetails}
            >
              <span className="visually-hidden">Open trade details</span>
              <span aria-hidden="true">&#128202;</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => togglePopout('network')}
              aria-haspopup="true"
              aria-expanded={showNetwork}
            >
              <span className="visually-hidden">Open network and wallet status</span>
              <span aria-hidden="true">&#127760;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Swap Form */}
      <form className="swap-form swap-form-compact" onSubmit={(e) => { e.preventDefault(); handleSwap(); }}>
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
              <select
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value)}
                aria-label="Sell token"
              >
                <option value="WCSPR">WCSPR</option>
                <option value="ECTO">ECTO</option>
                <option value="USDC">USDC</option>
                <option value="WETH">WETH</option>
                <option value="WBTC">WBTC</option>
              </select>
            </div>
          </div>
        </label>

        <div className="arrow-divider">
          <button
            type="button"
            className="arrow-circle"
            onClick={switchTokens}
            aria-label="Reverse tokens and amounts"
          >
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
              <select
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                aria-label="Buy token"
              >
                <option value="WCSPR">WCSPR</option>
                <option value="USDC">USDC</option>
                <option value="ECTO">ECTO</option>
                <option value="WETH">WETH</option>
                <option value="WBTC">WBTC</option>
              </select>
            </div>
          </div>
        </label>

        {error && (
          <div className="swap-error">
            {error}
          </div>
        )}

        <div className="swap-actions">
          {!connected ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => connect()}
            >
              Connect Wallet
            </button>
          ) : (
            <button
              type="submit"
              className="btn primary"
              disabled={!canSwap || loading}
            >
              {loading ? 'Swapping...' : quoting ? 'Getting quote...' : 'Swap'}
            </button>
          )}
        </div>
        
        <div className="swap-meta" aria-live="polite">
          <div className="meta-row">
            <span className="muted">Rate</span>
            <strong id="rateDisplay">
              {quote?.valid ? `1 ${tokenIn} ≈ ${quote.rate} ${tokenOut}` : '--'}
            </strong>
          </div>
          <div className="meta-row">
            <span className="muted">Network fee</span>
            <strong id="feeDisplay">~18 CSPR</strong> 
          </div>
          <div className="meta-row">
            <span className="muted">Minimum received</span>
            <strong id="minReceived">{quote?.minReceived || '--'} {tokenOut}</strong>
          </div>
           {quote?.priceImpact !== undefined && (
             <div className="meta-row">
                <span className="muted">Price Impact</span>
                <strong style={{ color: getImpactColor(quote.priceImpact) }}>
                    {quote.priceImpact.toFixed(2)}%
                </strong>
             </div>
           )}
        </div>
      </form>

      {/* Popouts */}
      <div className="swap-popouts" aria-live="polite">
        {/* Settings Popout */}
        <div className={`popout ${showSettings ? '' : 'hidden'}`} id="settingsPopout" role="dialog" aria-label="Swap settings" hidden={!showSettings}>
          <div className="popout-header">
            <strong>Settings</strong>
            <button type="button" className="icon-btn ghost" onClick={() => setShowSettings(false)}>
              <span className="visually-hidden">Close settings</span>
              <span aria-hidden="true">&#10005;</span>
            </button>
          </div>
          <div className="settings-group">
            <label className="muted">Slippage tolerance</label>
            <div className="pill-row tight">
              <button type="button" className={`pill ghost ${slippage === '0.1' ? 'active' : ''}`} onClick={() => setSlippage('0.1')}>0.1%</button>
              <button type="button" className={`pill ghost ${slippage === '0.5' ? 'active' : ''}`} onClick={() => setSlippage('0.5')}>0.5%</button>
              <button type="button" className={`pill ghost ${slippage === '1' ? 'active' : ''}`} onClick={() => setSlippage('1')}>1%</button>
              <div className="input-row tight compact">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  aria-label="Slippage tolerance"
                />
                <span className="suffix">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Popout */}
        <div className={`popout ${showDetails ? '' : 'hidden'}`} id="detailsPopout" role="dialog" aria-label="Trade details" hidden={!showDetails}>
          <div className="popout-header">
            <strong>Trade details</strong>
            <button type="button" className="icon-btn ghost" onClick={() => setShowDetails(false)}>
              <span className="visually-hidden">Close trade details</span>
              <span aria-hidden="true">&#10005;</span>
            </button>
          </div>
          <dl className="swap-breakdown">
            <div>
              <dt>Minimum received</dt>
              <dd>{quote?.minReceived || '--'} {tokenOut}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>Auto (Direct Pool)</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{EctoplasmConfig.getNetwork().name}</dd>
            </div>
            <div>
              <dt>Price impact</dt>
              <dd style={{ color: getImpactColor(quote?.priceImpact || 0) }}>
                  {quote?.priceImpact?.toFixed(2) || '0.00'}%
              </dd>
            </div>
            <div>
              <dt>Fee</dt>
              <dd>0.3%</dd>
            </div>
          </dl>
        </div>

        {/* Network Popout */}
        <div className={`popout ${showNetwork ? '' : 'hidden'}`} id="networkPopout" role="dialog" aria-label="Network and wallet" hidden={!showNetwork}>
          <div className="popout-header">
            <strong>Network</strong>
            <button type="button" className="icon-btn ghost" onClick={() => setShowNetwork(false)}>
              <span className="visually-hidden">Close network status</span>
              <span aria-hidden="true">&#10005;</span>
            </button>
          </div>
          <div className="network-status">
            <span className="status-badge subtle">{EctoplasmConfig.getNetwork().name}</span>
            <span className="status-badge subtle">{connected ? 'Wallet connected' : 'Wallet disconnected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SwapCard;
