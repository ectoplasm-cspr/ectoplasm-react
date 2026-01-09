import React from 'react';
import { TokenCard } from './TokenCard';
import { LaunchpadToken } from '../../hooks/useLaunchpad';

interface TokenLibraryProps {
  tokens: LaunchpadToken[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'growth' | 'liquidity' | 'recent';
  onSortChange: (sort: 'growth' | 'liquidity' | 'recent') => void;
  statusFilter: 'all' | 'live' | 'launching' | 'ended';
  onStatusFilterChange: (status: 'all' | 'live' | 'launching' | 'ended') => void;
}

export function TokenLibrary({
  tokens,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
}: TokenLibraryProps) {
  return (
    <div className="token-library">
      {/* Controls */}
      <div className="table-controls">
        <div className="search-field">
          <label className="inline">
            Filter
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or symbol"
              className="search-input"
            />
          </label>
        </div>

        <div className="filter-controls">
          {/* Status Filter */}
          <div className="status-filters">
            {(['all', 'live', 'launching', 'ended'] as const).map((status) => (
              <button
                key={status}
                className={`pill ${statusFilter === status ? 'filled' : ''}`}
                onClick={() => onStatusFilterChange(status)}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="sort-select"
            aria-label="Sort tokens"
          >
            <option value="recent">Most Recent</option>
            <option value="growth">Highest Growth</option>
            <option value="liquidity">Most Liquidity</option>
          </select>
        </div>

        <span className="muted result-count">
          Showing {tokens.length} tokens
        </span>
      </div>

      {/* Token Table */}
      <div className="token-table" role="table" aria-label="Launchpad token library">
        <div className="token-table-head" role="row">
          <div className="col name" role="columnheader">Name</div>
          <div className="col symbol" role="columnheader">Symbol</div>
          <div className="col change" role="columnheader">24h</div>
          <div className="col liquidity" role="columnheader">Liquidity</div>
          <div className="col status" role="columnheader">Status</div>
        </div>

        <div className="token-table-body" role="rowgroup">
          {tokens.map((token) => (
            <TokenCard
              key={token.id}
              id={token.id}
              name={token.name}
              symbol={token.symbol}
              change24h={token.change24h}
              liquidity={token.liquidity}
              status={token.status}
              curveHash={token.curveHash}
              progress={token.progress}
            />
          ))}

          {tokens.length === 0 && (
            <div className="token-empty">
              <p className="muted">No tokens found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TokenLibrary;
