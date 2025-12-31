import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { Modal } from '../common/Modal';
import { RemoveLiquidity } from './RemoveLiquidity';

interface Position {
  pairName: string;
  tokenA: string;
  tokenB: string;
  lpBalance: string;
  sharePercent: number;
  tokenAAmount: string;
  tokenBAmount: string;
}

interface PositionsListProps {
  positions: Position[];
}

export function PositionsList({ positions }: PositionsListProps) {
  const { connected, connect } = useWallet();
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  if (!connected) {
    return (
      <div className="positions-empty">
        <p className="muted">Connect your wallet to view your liquidity positions.</p>
        <button className="btn primary" onClick={connect}>
          Connect Wallet
        </button>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="positions-empty">
        <p className="muted">You don't have any liquidity positions yet.</p>
        <p className="muted tiny">Add liquidity to a pool to start earning rewards.</p>
      </div>
    );
  }

  return (
    <>
      <div className="positions-list">
        {positions.map((position, index) => (
          <div key={index} className="position-card">
            <div className="position-header">
              <div className="position-pair">
                <div className="avatar">{position.tokenA.charAt(0)}</div>
                <div className="avatar overlap">{position.tokenB.charAt(0)}</div>
                <strong>{position.pairName}</strong>
              </div>
              <span className="pill subtle">LP</span>
            </div>

            <div className="position-stats">
              <div className="stat">
                <span className="muted tiny">Your LP Tokens</span>
                <span>{position.lpBalance}</span>
              </div>
              <div className="stat">
                <span className="muted tiny">Pool Share</span>
                <span>{position.sharePercent.toFixed(4)}%</span>
              </div>
            </div>

            <div className="position-tokens">
              <div className="token-amount">
                <span>{position.tokenA}</span>
                <span>{position.tokenAAmount}</span>
              </div>
              <div className="token-amount">
                <span>{position.tokenB}</span>
                <span>{position.tokenBAmount}</span>
              </div>
            </div>

            <div className="position-actions">
              <button
                className="btn ghost small"
                onClick={() => setSelectedPosition(position)}
              >
                Remove
              </button>
              <button className="btn primary small">
                Add More
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Remove Liquidity Modal */}
      <Modal
        isOpen={!!selectedPosition}
        onClose={() => setSelectedPosition(null)}
      >
        {selectedPosition && (
          <RemoveLiquidity
            pairName={selectedPosition.pairName}
            tokenA={selectedPosition.tokenA}
            tokenB={selectedPosition.tokenB}
            lpBalance={selectedPosition.lpBalance}
            onClose={() => setSelectedPosition(null)}
          />
        )}
      </Modal>
    </>
  );
}

export default PositionsList;
