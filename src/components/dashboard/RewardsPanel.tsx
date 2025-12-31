import React from 'react';
import { Reward } from '../../hooks/useDashboard';

interface RewardsPanelProps {
  rewards: Reward[];
  redeemedRewards: string[];
  currentXp: number;
  onRedeemReward: (rewardId: string) => void;
}

export function RewardsPanel({
  rewards,
  redeemedRewards,
  currentXp,
  onRedeemReward,
}: RewardsPanelProps) {
  return (
    <div className="rewards-panel">
      <div className="rewards-header">
        <h3>Reward Shop</h3>
        <div className="xp-balance">
          <span className="xp-icon">⭐</span>
          <span className="xp-amount">{currentXp.toLocaleString()} XP</span>
          <span className="muted">available</span>
        </div>
      </div>

      <ul className="reward-list">
        {rewards.map((reward) => {
          const isRedeemed = redeemedRewards.includes(reward.id);
          const canAfford = currentXp >= reward.cost;

          return (
            <li
              key={reward.id}
              className={`reward-card ${isRedeemed ? 'redeemed' : ''} ${!canAfford && !isRedeemed ? 'locked' : ''}`}
            >
              <div className="reward-info">
                <h4 className="reward-title">{reward.title}</h4>
                <p className="reward-detail muted">{reward.detail}</p>
              </div>

              <div className="reward-action">
                <div className="reward-cost">
                  <span className="xp-icon">⭐</span>
                  <span className="cost-amount">{reward.cost}</span>
                </div>

                {isRedeemed ? (
                  <span className="reward-redeemed-badge">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                    </svg>
                    Redeemed
                  </span>
                ) : (
                  <button
                    className={`btn small ${canAfford ? 'primary' : ''}`}
                    onClick={() => onRedeemReward(reward.id)}
                    disabled={!canAfford}
                  >
                    {canAfford ? 'Redeem' : 'Not enough XP'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rewards-footer">
        <p className="muted tiny">
          Rewards refresh weekly. Earn XP by completing tasks, quests, and missions.
        </p>
      </div>
    </div>
  );
}

export default RewardsPanel;
