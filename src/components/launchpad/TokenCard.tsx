import React from 'react';
import { Link } from 'react-router-dom';
import { formatCompact } from '../../utils/format';

interface TokenCardProps {
  id: string;
  name: string;
  symbol: string;
  change24h: number;
  liquidity: number;
  status: 'live' | 'launching' | 'ended';
  curveHash?: string;
  progress?: number;
}

export function TokenCard({
  id,
  name,
  symbol,
  change24h,
  liquidity,
  status,
  curveHash,
  progress,
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

  // Use curveHash for real tokens, or id for mock tokens
  const linkTo = curveHash ? `/launchpad/${curveHash}` : `/launchpad/${id}`;

  return (
    <Link to={linkTo} className="token-table-row clickable" role="row">
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
        {progress !== undefined && status === 'live' && (
          <div className="progress-mini">
            <div className="progress-mini-bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>
    </Link>
  );
}

export default TokenCard;
