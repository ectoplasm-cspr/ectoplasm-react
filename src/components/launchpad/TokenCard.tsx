import React from 'react';
import { formatCompact } from '../../utils/format';

interface TokenCardProps {
  name: string;
  symbol: string;
  change24h: number;
  liquidity: number;
  status: 'live' | 'launching' | 'ended';
}

export function TokenCard({
  name,
  symbol,
  change24h,
  liquidity,
  status,
}: TokenCardProps) {
  const getStatusClass = () => {
    switch (status) {
      case 'live':
        return 'status-live';
      case 'launching':
        return 'status-launching';
      case 'ended':
        return 'status-ended';
      default:
        return '';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'live':
        return 'Live';
      case 'launching':
        return 'Launching';
      case 'ended':
        return 'Ended';
      default:
        return status;
    }
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <div className="token-table-row" role="row">
      <div className="col name" role="cell">
        <div className="token-info">
          <div className="token-avatar">
            {symbol.charAt(0)}
          </div>
          <div>
            <strong>{name}</strong>
            <span className="muted tiny">{symbol}</span>
          </div>
        </div>
      </div>
      <div className="col symbol" role="cell">
        <span className="pill subtle">{symbol}</span>
      </div>
      <div className="col change" role="cell">
        <span className={change24h >= 0 ? 'text-success' : 'text-danger'}>
          {formatChange(change24h)}
        </span>
      </div>
      <div className="col liquidity" role="cell">
        ${formatCompact(liquidity)}
      </div>
      <div className="col status" role="cell">
        <span className={`status-badge ${getStatusClass()}`}>
          {getStatusLabel()}
        </span>
      </div>
    </div>
  );
}

export default TokenCard;
