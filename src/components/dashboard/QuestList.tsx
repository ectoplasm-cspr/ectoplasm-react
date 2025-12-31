import React from 'react';
import { DailyTask, WeeklyQuest } from '../../hooks/useDashboard';

interface QuestListProps {
  dailyTasks: DailyTask[];
  completedTasks: number[];
  onCompleteTask: (taskId: number) => void;
  weeklyQuests: WeeklyQuest[];
  completedQuests: string[];
  questProgress: Record<string, number>;
  onProgressQuest: (questId: string) => void;
  dailyProgress: number;
  earnedDailyXp: number;
  totalDailyXp: number;
}

export function QuestList({
  dailyTasks,
  completedTasks,
  onCompleteTask,
  weeklyQuests,
  completedQuests,
  questProgress,
  onProgressQuest,
  dailyProgress,
  earnedDailyXp,
  totalDailyXp,
}: QuestListProps) {
  return (
    <div className="quest-list">
      {/* Daily Tasks Section */}
      <div className="quest-section">
        <div className="quest-header">
          <h3>Daily Tasks</h3>
          <div className="quest-progress-summary">
            <span className="xp-badge">+{earnedDailyXp} / {totalDailyXp} XP</span>
          </div>
        </div>

        <div className="daily-progress-bar">
          <div
            className="daily-progress-fill"
            style={{ width: `${dailyProgress}%` }}
          />
        </div>
        <p className="muted tiny">
          {completedTasks.length} of {dailyTasks.length} tasks completed
        </p>

        <ul className="task-list">
          {dailyTasks.map((task) => {
            const isCompleted = completedTasks.includes(task.id);
            return (
              <li
                key={task.id}
                className={`task-item ${isCompleted ? 'completed' : ''}`}
              >
                <button
                  className="task-checkbox"
                  onClick={() => !isCompleted && onCompleteTask(task.id)}
                  disabled={isCompleted}
                  aria-label={isCompleted ? 'Task completed' : 'Complete task'}
                >
                  {isCompleted ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                    </svg>
                  ) : (
                    <span className="checkbox-empty" />
                  )}
                </button>
                <div className="task-content">
                  <span className="task-title">{task.title}</span>
                  <span className="task-xp">+{task.xp} XP</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Weekly Quests Section */}
      <div className="quest-section">
        <div className="quest-header">
          <h3>Weekly Quests</h3>
          <span className="pill subtle">Resets Monday</span>
        </div>

        <ul className="quest-cards">
          {weeklyQuests.map((quest) => {
            const isCompleted = completedQuests.includes(quest.id);
            const progress = questProgress[quest.id] || 0;
            const progressPercent = (progress / quest.target) * 100;

            return (
              <li
                key={quest.id}
                className={`quest-card ${isCompleted ? 'completed' : ''}`}
              >
                <div className="quest-card-header">
                  <span className={`quest-type-badge ${quest.actionType}`}>
                    {quest.actionType}
                  </span>
                  {isCompleted && (
                    <span className="quest-complete-badge">Complete</span>
                  )}
                </div>

                <h4 className="quest-title">{quest.title}</h4>

                <div className="quest-progress">
                  <div className="quest-progress-bar">
                    <div
                      className="quest-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="quest-progress-text">
                    {progress} / {quest.target}
                  </span>
                </div>

                <div className="quest-reward">
                  <span className="muted">Reward:</span>
                  <span className="quest-reward-text">{quest.reward}</span>
                </div>

                {!isCompleted && (
                  <button
                    className="btn small"
                    onClick={() => onProgressQuest(quest.id)}
                  >
                    Progress +1
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default QuestList;
