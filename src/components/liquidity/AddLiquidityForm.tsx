import React, { useEffect } from 'react';
import { useLiquidity } from '../../hooks/useLiquidity';
import { useWallet } from '../../contexts/WalletContext';
import { EctoplasmConfig } from '../../config/ectoplasm';

interface AddLiquidityFormProps {
  defaultTokenA?: string;
  defaultTokenB?: string;
}

export function AddLiquidityForm({ defaultTokenA, defaultTokenB }: AddLiquidityFormProps) {
  const { connected, connect, balances } = useWallet();
  const {
    tokenA,
    tokenB,
    amountA,
    amountB,
    poolShare,
    lpTokensReceived,
    setTokenA,
    setTokenB,
    setAmountA,
    setAmountB,
    reserveA,
    reserveB,
    totalSupply,
    pairExists,
    addLiquidity,
    loading,
    txStep,
    error,
  } = useLiquidity();

  // Set default tokens if provided
  useEffect(() => {
    if (defaultTokenA && defaultTokenA !== 'CSPR') {
      setTokenA(defaultTokenA);
    }
    if (defaultTokenB && defaultTokenB !== 'CSPR') {
      setTokenB(defaultTokenB);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTokenA, defaultTokenB]);

  const tokenSymbols = EctoplasmConfig.getTokenSymbols().filter(s => s !== 'CSPR');
  const balanceA = balances[tokenA]?.formatted || '0';
  const balanceB = balances[tokenB]?.formatted || '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      await connect();
      return;
    }
    await addLiquidity();
  };

  const handleMaxA = () => {
    if (connected && balanceA) {
      setAmountA(balanceA);
    }
  };

  const handleMaxB = () => {
    if (connected && balanceB) {
      setAmountB(balanceB);
    }
  };

  const isFirstLiquidity = parseFloat(reserveA) === 0 && parseFloat(reserveB) === 0;

  return (
    <form onSubmit={handleSubmit} className="lp-form">
      {/* Pool Info Banner */}
      {pairExists && (
        <div className="pool-info-banner">
          <div className="pool-info-row">
            <span className="muted tiny">Pool Reserves</span>
            <span className="tiny">
              {reserveA} {tokenA} / {reserveB} {tokenB}
            </span>
          </div>
          {isFirstLiquidity && (
            <div className="pool-info-row">
              <span className="chip warning tiny">First Liquidity Provider</span>
              <span className="muted tiny">You set the initial price</span>
            </div>
          )}
        </div>
      )}

      {!pairExists && (
        <div className="pool-info-banner warning">
          <span className="muted tiny">Pair not found. Contact admin to create it.</span>
        </div>
      )}

      {/* Token A Input */}
      <div className="token-row">
        <div className="token-field">
          <label className="muted tiny">Token A</label>
          <div className="input-row">
            <input
              type="number"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="0.00"
              step="any"
              min="0"
              className="token-amount-input"
              disabled={loading}
            />
            <select
              value={tokenA}
              onChange={(e) => setTokenA(e.target.value)}
              className="token-select"
              disabled={loading}
            >
              {tokenSymbols.map((sym) => (
                <option key={sym} value={sym} disabled={sym === tokenB}>
                  {sym}
                </option>
              ))}
            </select>
          </div>
          {connected && (
            <span className="balance muted tiny">
              Balance: {balanceA}
              <button
                type="button"
                onClick={handleMaxA}
                className="btn ghost tiny"
                style={{ marginLeft: '4px', padding: '2px 4px' }}
                disabled={loading}
              >
                MAX
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Plus Separator */}
      <div className="lp-separator">
        <span>+</span>
      </div>

      {/* Token B Input */}
      <div className="token-row">
        <div className="token-field">
          <label className="muted tiny">Token B</label>
          <div className="input-row">
            <input
              type="number"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              placeholder="0.00"
              step="any"
              min="0"
              className="token-amount-input"
              disabled={loading || (!isFirstLiquidity && pairExists)}
            />
            <select
              value={tokenB}
              onChange={(e) => setTokenB(e.target.value)}
              className="token-select"
              disabled={loading}
            >
              {tokenSymbols.map((sym) => (
                <option key={sym} value={sym} disabled={sym === tokenA}>
                  {sym}
                </option>
              ))}
            </select>
          </div>
          {connected && (
            <span className="balance muted tiny">
              Balance: {balanceB}
              {isFirstLiquidity && (
                <button
                  type="button"
                  onClick={handleMaxB}
                  className="btn ghost tiny"
                  style={{ marginLeft: '4px', padding: '2px 4px' }}
                  disabled={loading}
                >
                  MAX
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="lp-summary">
        <div className="lp-summary-row">
          <span className="muted tiny">Pool Share</span>
          <span>{poolShare}%</span>
        </div>
        <div className="lp-summary-row">
          <span className="muted tiny">LP Tokens Received</span>
          <span>{lpTokensReceived}</span>
        </div>
        {totalSupply !== '0' && (
          <div className="lp-summary-row">
            <span className="muted tiny">Total LP Supply</span>
            <span>{totalSupply}</span>
          </div>
        )}
      </div>

      {/* Transaction Progress */}
      {txStep && (
        <div className="tx-progress">
          <div className="tx-step active">
            <span className="spinner"></span>
            <span>{txStep}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="lp-error">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="btn primary full"
        disabled={(connected && loading) || !pairExists}
      >
        {!connected
          ? 'Connect Wallet'
          : loading
          ? txStep || 'Processing...'
          : !pairExists
          ? 'Pair Not Available'
          : 'Add Liquidity'}
      </button>

      {/* Info Text */}
      {connected && pairExists && !loading && (
        <p className="muted tiny" style={{ marginTop: '8px', textAlign: 'center' }}>
          Adding liquidity requires 3 transactions: Transfer {tokenA}, Transfer {tokenB}, then Mint LP tokens.
        </p>
      )}
    </form>
  );
}

export default AddLiquidityForm;
