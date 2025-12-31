import React from 'react';

interface XPTrackerProps {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  levelProgress: number;
  totalXp: number;
  streak: number;
}

export function XPTracker({
  level,
  currentXp,
  nextLevelXp,
  levelProgress,
  totalXp,
  streak,
}: XPTrackerProps) {
  const getStreakEmoji = () => {
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '✨';
    if (streak >= 3) return '🌟';
    return '💫';
  };

  const getStreakLabel = () => {
    if (streak >= 30) return 'Legendary';
    if (streak >= 14) return 'Epic';
    if (streak >= 7) return 'Hot';
    if (streak >= 3) return 'Warming up';
    return 'Starting';
  };

  return (
    <div className="xp-tracker">
      {/* Level Badge */}
      <div className="level-display">
        <div className="level-badge">
          <span className="level-number">{level}</span>
          <span className="level-label">Level</span>
        </div>

        <div className="level-info">
          <div className="level-progress-header">
            <span className="current-xp">{currentXp.toLocaleString()} XP</span>
            <span className="muted">/ {nextLevelXp.toLocaleString()} XP</span>
          </div>

          <div className="level-progress-bar">
            <div
              className="level-progress-fill"
              style={{ width: `${levelProgress}%` }}
            />
          </div>

          <p className="muted tiny">
            {Math.floor(nextLevelXp - currentXp).toLocaleString()} XP to level {level + 1}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="xp-stats">
        <div className="stat-card">
          <span className="stat-value">{totalXp.toLocaleString()}</span>
          <span className="stat-label">Total XP</span>
        </div>

        <div className="stat-card streak">
          <div className="streak-display">
            <span className="streak-emoji">{getStreakEmoji()}</span>
            <span className="stat-value">{streak}</span>
          </div>
          <span className="stat-label">
            Day Streak
            <span className="streak-tier">{getStreakLabel()}</span>
          </span>
        </div>
      </div>

      {/* Streak Bonus Info */}
      {streak > 0 && (
        <div className="streak-bonus-info">
          <p className="muted tiny">
            {streak >= 7
              ? `+${Math.min(streak, 30)}% XP bonus from streak!`
              : `Keep it up! ${7 - streak} more days for XP bonus.`}
          </p>
        </div>
      )}
    </div>
  );
}

export default XPTracker;
