import React from 'react';
import { Mission } from '../../hooks/useDashboard';

interface AchievementsProps {
  missions: Mission[];
  completedMissions: string[];
  missionProgress: Record<string, number>;
  onCompleteMission: (missionId: string) => void;
}

const getMissionIcon = (type: string): string => {
  switch (type) {
    case 'Starter':
      return '🚀';
    case 'Volume':
      return '📊';
    case 'Streak':
      return '🔥';
    case 'Liquidity':
      return '💧';
    case 'Combo':
      return '⚡';
    case 'Redemption':
      return '🎁';
    default:
      return '🏆';
  }
};

const getMissionTarget = (missionId: string): number => {
  const targets: Record<string, number> = {
    'mission-0': 1,    // First trade
    'mission-1': 10000, // Volume
    'mission-2': 7,    // 7-day streak
    'mission-3': 3,    // 3 liquidity quests
    'mission-4': 5,    // 5 combo trades
    'mission-5': 3,    // 3 redemptions
  };
  return targets[missionId] || 1;
};

export function Achievements({
  missions,
  completedMissions,
  missionProgress,
  onCompleteMission,
}: AchievementsProps) {
  const completedCount = completedMissions.length;
  const totalCount = missions.length;
  const totalXpEarned = missions
    .filter(m => completedMissions.includes(m.id))
    .reduce((sum, m) => sum + m.xp, 0);

  return (
    <div className="achievements">
      <div className="achievements-header">
        <h3>Missions</h3>
        <div className="achievements-summary">
          <span className="achievement-count">
            {completedCount} / {totalCount}
          </span>
          <span className="xp-badge">+{totalXpEarned} XP earned</span>
        </div>
      </div>

      <div className="mission-grid">
        {missions.map((mission) => {
          const isCompleted = completedMissions.includes(mission.id);
          const progress = missionProgress[mission.id] || 0;
          const target = getMissionTarget(mission.id);
          const progressPercent = Math.min((progress / target) * 100, 100);

          return (
            <div
              key={mission.id}
              className={`mission-card ${isCompleted ? 'completed' : ''}`}
            >
              <div className="mission-icon">
                {getMissionIcon(mission.type)}
              </div>

              <div className="mission-content">
                <div className="mission-header">
                  <span className={`mission-type pill ${isCompleted ? 'filled' : 'subtle'}`}>
                    {mission.type}
                  </span>
                  <span className="mission-xp">+{mission.xp} XP</span>
                </div>

                <h4 className="mission-title">{mission.title}</h4>

                <div className="mission-progress">
                  <div className="mission-progress-bar">
                    <div
                      className="mission-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="mission-progress-text">
                    {progress} / {target}
                  </span>
                </div>

                {isCompleted ? (
                  <div className="mission-complete-badge">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                    </svg>
                    Completed
                  </div>
                ) : (
                  <button
                    className="btn small ghost"
                    onClick={() => onCompleteMission(mission.id)}
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Achievements;
