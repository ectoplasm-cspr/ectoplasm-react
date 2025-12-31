import React from 'react';
import { useLiquidity } from '../../hooks/useLiquidity';
import { useWallet } from '../../contexts/WalletContext';
import { EctoplasmConfig } from '../../config/ectoplasm';

export function AddLiquidityForm() {
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
    addLiquidity,
    loading,
    error,
  } = useLiquidity();

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

  return (
    <form onSubmit={handleSubmit} className="lp-form">
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
            />
            <select
              value={tokenA}
              onChange={(e) => setTokenA(e.target.value)}
              className="token-select"
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
            />
            <select
              value={tokenB}
              onChange={(e) => setTokenB(e.target.value)}
              className="token-select"
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
              <button
                type="button"
                onClick={handleMaxB}
                className="btn ghost tiny"
                style={{ marginLeft: '4px', padding: '2px 4px' }}
              >
                MAX
              </button>
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
      </div>

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
        disabled={connected && loading}
      >
        {!connected
          ? 'Connect Wallet'
          : loading
          ? 'Processing...'
          : 'Add Liquidity'}
      </button>
    </form>
  );
}

export default AddLiquidityForm;
