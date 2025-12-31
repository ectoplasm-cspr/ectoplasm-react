import React, { useState } from 'react';
import { formatCompact } from '../../utils/format';
import { Modal } from '../common/Modal';

interface PoolCardProps {
  name: string;
  tokenA: string;
  tokenB: string;
  tvl: number;
  apr: number;
  minStake: number;
  lstToken: string;
  features: string[];
}

export function PoolCard({
  name,
  tokenA,
  tokenB,
  tvl,
  apr,
  minStake,
  lstToken,
  features,
}: PoolCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getAvatarLetter = () => {
    return tokenA.charAt(0).toUpperCase();
  };

  return (
    <>
      <div className="pool-row" role="row">
        <div className="col pair" role="cell">
          <div className="pair-label">
            <div className="avatar">{getAvatarLetter()}</div>
            <div>
              <strong>{name} Liquid Staking</strong>
              <div className="muted tiny">
                {features.slice(0, 2).join(' · ')}
              </div>
            </div>
          </div>
        </div>
        <div className="col fee" role="cell">
          <span className="pill subtle">{lstToken}</span>
        </div>
        <div className="col tvl" role="cell">
          ${formatCompact(tvl)}
        </div>
        <div className="col vol" role="cell">
          {minStake} {tokenA}
        </div>
        <div className="col apr" role="cell">
          <div className="apr">{apr}%</div>
        </div>
        <div className="col action" role="cell">
          <button
            className="btn primary small"
            onClick={() => setShowDetails(true)}
          >
            View Pool
          </button>
        </div>
      </div>

      {/* Pool Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`${name} Liquid Staking Pool`}
      >
        <div className="pool-details">
          <div className="pool-stats-grid">
            <div className="stat-item">
              <div className="muted tiny">Total Value Locked</div>
              <div className="stat-value">${formatCompact(tvl)}</div>
            </div>
            <div className="stat-item">
              <div className="muted tiny">APR</div>
              <div className="stat-value apr-value">{apr}%</div>
            </div>
          </div>

          <div className="pool-stats-grid">
            <div className="stat-item">
              <div className="muted tiny">Min. Stake</div>
              <div className="stat-value-sm">{minStake} {tokenA}</div>
            </div>
            <div className="stat-item">
              <div className="muted tiny">LST Token</div>
              <div className="stat-value-sm">{lstToken}</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="muted tiny">Liquidity Provided to DEX</div>
            <div className="stat-value-sm">
              ${formatCompact(tvl * 0.78)} (78% utilized)
            </div>
          </div>

          <div className="pool-features">
            <div className="muted tiny">Pool Features</div>
            <div className="feature-pills">
              {features.map((feature, i) => (
                <span key={i} className="pill subtle">{feature}</span>
              ))}
              <span className="pill success subtle">Live</span>
            </div>
          </div>

          <div className="pool-actions">
            <button
              className="btn primary full"
              onClick={() => setShowDetails(false)}
            >
              Stake {tokenA}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default PoolCard;
