import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBondingCurve } from '../hooks/useBondingCurve';
import { useWallet } from '../contexts/WalletContext';
import { useDex } from '../contexts/DexContext';

// Format CSPR amount (motes to CSPR)
function formatCspr(motes: bigint): string {
  const cspr = Number(motes) / 1_000_000_000;
  if (cspr >= 1_000_000) return `${(cspr / 1_000_000).toFixed(2)}M`;
  if (cspr >= 1_000) return `${(cspr / 1_000).toFixed(2)}K`;
  return cspr.toFixed(2);
}

// Format token amount (with 18 decimals)
function formatTokens(amount: bigint): string {
  const tokens = Number(amount) / 1e18;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(2)}K`;
  return tokens.toFixed(4);
}

export function LaunchpadToken() {
  const { curveHash } = useParams<{ curveHash: string }>();
  const { connected, publicKey } = useWallet();
  const { dex: dexClient } = useDex();

  const {
    curveState,
    isLoading,
    error,
    currentPrice,
    progress,
    status,
    csprRaised,
    tokensSold,
    isRefundable,
    buyTokens,
    sellTokens,
    claimRefund,
    graduate,
    getQuoteBuy,
    getQuoteSell,
    refresh,
    isPending,
    txError,
  } = useBondingCurve(curveHash || null);

  // Trade form state
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [inputAmount, setInputAmount] = useState('');
  const [outputQuote, setOutputQuote] = useState<bigint>(0n);
  const [isQuoting, setIsQuoting] = useState(false);

  // User's token balance (would need to fetch from token contract)
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>(0n);

  // Get quote when input changes
  useEffect(() => {
    const getQuote = async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0) {
        setOutputQuote(0n);
        return;
      }

      setIsQuoting(true);
      try {
        if (tradeMode === 'buy') {
          const csprMotes = BigInt(Math.floor(parseFloat(inputAmount) * 1_000_000_000));
          const quote = await getQuoteBuy(csprMotes);
          setOutputQuote(quote);
        } else {
          const tokenAmount = BigInt(Math.floor(parseFloat(inputAmount) * 1e18));
          const quote = await getQuoteSell(tokenAmount);
          setOutputQuote(quote);
        }
      } catch (err) {
        console.error('Quote error:', err);
        setOutputQuote(0n);
      } finally {
        setIsQuoting(false);
      }
    };

    const debounce = setTimeout(getQuote, 300);
    return () => clearTimeout(debounce);
  }, [inputAmount, tradeMode, getQuoteBuy, getQuoteSell]);

  // Handle trade
  const handleTrade = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return;

    if (tradeMode === 'buy') {
      const csprMotes = BigInt(Math.floor(parseFloat(inputAmount) * 1_000_000_000));
      await buyTokens(csprMotes);
    } else {
      const tokenAmount = BigInt(Math.floor(parseFloat(inputAmount) * 1e18));
      await sellTokens(tokenAmount);
    }

    // Reset form on success
    if (!txError) {
      setInputAmount('');
      setOutputQuote(0n);
    }
  };

  if (isLoading && !curveState) {
    return (
      <main>
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading token data...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !curveState) {
    return (
      <main>
        <div className="container">
          <div className="error-state">
            <h2>Error</h2>
            <p>{error}</p>
            <Link to="/launchpad" className="btn primary">Back to Launchpad</Link>
          </div>
        </div>
      </main>
    );
  }

  const curveTypeLabel = curveState?.curveType
    ? curveState.curveType.charAt(0).toUpperCase() + curveState.curveType.slice(1)
    : 'Unknown';

  const statusLabel = {
    active: 'Live',
    graduated: 'Graduated',
    refunding: 'Refunding',
  }[status] || 'Unknown';

  const statusClass = {
    active: 'status-live',
    graduated: 'status-graduated',
    refunding: 'status-refunding',
  }[status] || '';

  return (
    <main>
      {/* Header */}
      <section className="section">
        <div className="container">
          <Link to="/launchpad" className="back-link">&larr; Back to Launchpad</Link>

          <div className="token-header">
            <div className="token-info">
              <h1>Token Details</h1>
              <p className="muted">Curve: {curveHash?.slice(0, 16)}...{curveHash?.slice(-8)}</p>
            </div>
            <div className="token-status">
              <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
              <span className="curve-type-badge">{curveTypeLabel} Curve</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section">
        <div className="container">
          <div className="token-detail-grid">
            {/* Left: Progress & Stats */}
            <div className="token-stats-card">
              <h3>Bonding Curve Progress</h3>

              {/* Progress Bar */}
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
                <div className="progress-labels">
                  <span>{progress.toFixed(1)}% Complete</span>
                  <span>
                    {formatCspr(csprRaised)} / {formatCspr(curveState?.graduationThreshold || 0n)} CSPR
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">CSPR Raised</span>
                  <span className="stat-value">{formatCspr(csprRaised)} CSPR</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tokens Sold</span>
                  <span className="stat-value">{formatTokens(tokensSold)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Current Price</span>
                  <span className="stat-value">{formatCspr(currentPrice)} CSPR</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Supply</span>
                  <span className="stat-value">{formatTokens(curveState?.totalSupply || 0n)}</span>
                </div>
              </div>

              {/* Promo Budget */}
              {curveState && curveState.promoBudget > 0n && (
                <div className="promo-section">
                  <h4>Marketing Budget</h4>
                  <div className="promo-stats">
                    <span>Released: {formatCspr(curveState.promoReleased)} CSPR</span>
                    <span>Total: {formatCspr(curveState.promoBudget)} CSPR</span>
                  </div>
                </div>
              )}

              {/* Graduation / Refund Actions */}
              <div className="curve-actions">
                {status === 'active' && progress >= 100 && (
                  <button
                    className="btn primary"
                    onClick={graduate}
                    disabled={isPending}
                  >
                    {isPending ? 'Graduating...' : 'Graduate to DEX'}
                  </button>
                )}

                {isRefundable && (
                  <button
                    className="btn warning"
                    onClick={claimRefund}
                    disabled={isPending}
                  >
                    {isPending ? 'Claiming...' : 'Claim Refund'}
                  </button>
                )}
              </div>
            </div>

            {/* Right: Trade Panel */}
            <div className="trade-card">
              <h3>Trade</h3>

              {/* Trade Mode Tabs */}
              <div className="trade-tabs">
                <button
                  className={`trade-tab ${tradeMode === 'buy' ? 'active' : ''}`}
                  onClick={() => {
                    setTradeMode('buy');
                    setInputAmount('');
                    setOutputQuote(0n);
                  }}
                >
                  Buy
                </button>
                <button
                  className={`trade-tab ${tradeMode === 'sell' ? 'active' : ''}`}
                  onClick={() => {
                    setTradeMode('sell');
                    setInputAmount('');
                    setOutputQuote(0n);
                  }}
                >
                  Sell
                </button>
              </div>

              {/* Input */}
              <div className="trade-input-group">
                <label>
                  {tradeMode === 'buy' ? 'You Pay (CSPR)' : 'You Sell (Tokens)'}
                </label>
                <input
                  type="number"
                  className="trade-input"
                  placeholder="0.00"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  disabled={isPending || status !== 'active'}
                />
              </div>

              {/* Output Quote */}
              <div className="trade-output-group">
                <label>
                  {tradeMode === 'buy' ? 'You Receive (Tokens)' : 'You Receive (CSPR)'}
                </label>
                <div className="trade-output">
                  {isQuoting ? (
                    <span className="quote-loading">Calculating...</span>
                  ) : (
                    <span>
                      {tradeMode === 'buy'
                        ? formatTokens(outputQuote)
                        : formatCspr(outputQuote)
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* Trade Button */}
              {!connected ? (
                <button className="btn primary full-width" disabled>
                  Connect Wallet
                </button>
              ) : status !== 'active' ? (
                <button className="btn primary full-width" disabled>
                  Trading Closed
                </button>
              ) : (
                <button
                  className="btn primary full-width"
                  onClick={handleTrade}
                  disabled={isPending || !inputAmount || parseFloat(inputAmount) <= 0}
                >
                  {isPending
                    ? `${tradeMode === 'buy' ? 'Buying' : 'Selling'}...`
                    : `${tradeMode === 'buy' ? 'Buy' : 'Sell'} Tokens`
                  }
                </button>
              )}

              {/* Error Display */}
              {txError && (
                <div className="trade-error">
                  {txError}
                </div>
              )}

              {/* Slippage Notice */}
              <p className="trade-notice">
                1% slippage tolerance applied
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Token Contract Info */}
      <section className="section alt">
        <div className="container">
          <h3>Contract Details</h3>
          <div className="contract-info">
            <div className="contract-row">
              <span className="contract-label">Curve Contract:</span>
              <code className="contract-value">{curveHash}</code>
            </div>
            {curveState?.tokenHash && (
              <div className="contract-row">
                <span className="contract-label">Token Contract:</span>
                <code className="contract-value">{curveState.tokenHash}</code>
              </div>
            )}
            <div className="contract-row">
              <span className="contract-label">Curve Type:</span>
              <span className="contract-value">{curveTypeLabel}</span>
            </div>
            <div className="contract-row">
              <span className="contract-label">Deadline:</span>
              <span className="contract-value">
                {curveState?.deadline
                  ? new Date(curveState.deadline).toLocaleDateString()
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LaunchpadToken;
