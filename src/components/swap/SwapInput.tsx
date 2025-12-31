import React from 'react';
import { EctoplasmConfig, TokenSymbol } from '../../config/ectoplasm';
import { useWallet } from '../../contexts/WalletContext';

interface SwapInputProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  token: string;
  onTokenChange?: (token: string) => void;
  readOnly?: boolean;
  showBalance?: boolean;
}

export function SwapInput({
  label,
  value,
  onChange,
  token,
  onTokenChange,
  readOnly = false,
  showBalance = true
}: SwapInputProps) {
  const { balances, connected } = useWallet();
  const tokenSymbols = EctoplasmConfig.getTokenSymbols();
  const balance = balances[token.toUpperCase()]?.formatted || '0';

  const handleMaxClick = () => {
    if (onChange && connected) {
      onChange(balance);
    }
  };

  return (
    <div className="swap-input-wrapper">
      <div className="swap-input-header">
        <label className="muted">{label}</label>
        {showBalance && connected && (
          <span className="muted">
            Balance: {balance} {token}
            {!readOnly && (
              <button
                type="button"
                className="btn ghost small"
                onClick={handleMaxClick}
                style={{ marginLeft: '4px', padding: '2px 6px', fontSize: '11px' }}
              >
                MAX
              </button>
            )}
          </span>
        )}
      </div>
      <div className="swap-input-row">
        <input
          type="number"
          className="swap-amount-input"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="0.0"
          readOnly={readOnly}
          min="0"
          step="any"
        />
        <select
          className="token-select"
          value={token}
          onChange={(e) => onTokenChange?.(e.target.value)}
          disabled={!onTokenChange}
        >
          {tokenSymbols.map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default SwapInput;
