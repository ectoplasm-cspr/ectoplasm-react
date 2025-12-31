import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useDashboard } from '../hooks';
import { QuestList, XPTracker, Achievements, RewardsPanel } from '../components/dashboard';

type DashboardTab = 'quests' | 'missions' | 'rewards';

export function Dashboard() {
  const { connected, balances } = useWallet();
  const [activeTab, setActiveTab] = useState<DashboardTab>('quests');

  const {
    // Level/XP
    level,
    currentXp,
    nextLevelXp,
    levelProgress,
    totalXp,
    streak,

    // Daily tasks
    dailyTasks,
    completedTasks,
    dailyProgress,
    earnedDailyXp,
    totalDailyXp,

    // Weekly quests
    weeklyQuests,
    completedQuests,
    questProgress,

    // Missions
    missions,
    completedMissions,
    missionProgress,

    // Rewards
    rewards,
    redeemedRewards,

    // Actions
    completeTask,
    progressQuest,
    completeMission,
    redeemReward,
    resetProgress,
  } = useDashboard();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'quests':
        return (
          <QuestList
            dailyTasks={dailyTasks}
            completedTasks={completedTasks}
            onCompleteTask={completeTask}
            weeklyQuests={weeklyQuests}
            completedQuests={completedQuests}
            questProgress={questProgress}
            onProgressQuest={progressQuest}
            dailyProgress={dailyProgress}
            earnedDailyXp={earnedDailyXp}
            totalDailyXp={totalDailyXp}
          />
        );
      case 'missions':
        return (
          <Achievements
            missions={missions}
            completedMissions={completedMissions}
            missionProgress={missionProgress}
            onCompleteMission={completeMission}
          />
        );
      case 'rewards':
        return (
          <RewardsPanel
            rewards={rewards}
            redeemedRewards={redeemedRewards}
            currentXp={totalXp}
            onRedeemReward={redeemReward}
          />
        );
    }
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-copy">
            <div className="brand-badge">
              <img src="/assets/electoplasmlogo.png" width="26" height="26" alt="" />
              <span>Your dashboard</span>
            </div>
            <h1>Track your progress</h1>
            <p className="lead">
              Complete quests, earn XP, and unlock rewards as you trade on Ectoplasm.
              Level up to access exclusive perks and trading bonuses.
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="section">
        <div className="container">
          <div className="dashboard-layout">
            {/* Sidebar: XP Tracker + Balances */}
            <aside className="dashboard-sidebar">
              <XPTracker
                level={level}
                currentXp={currentXp}
                nextLevelXp={nextLevelXp}
                levelProgress={levelProgress}
                totalXp={totalXp}
                streak={streak}
              />

              {connected && (
                <div className="pump-card balances-card">
                  <h4>Your Balances</h4>
                  <ul className="balance-list">
                    {Object.entries(balances).map(([symbol, balance]) => (
                      <li key={symbol}>
                        <span>{symbol}</span>
                        <strong>{balance.formatted}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Demo Reset Button */}
              <button
                className="btn ghost small"
                onClick={resetProgress}
                style={{ marginTop: '1rem', opacity: 0.6 }}
              >
                Reset Progress (Demo)
              </button>
            </aside>

            {/* Main Content Area */}
            <div className="dashboard-main">
              {/* Tab Navigation */}
              <div className="dashboard-tabs">
                <button
                  className={`tab-btn ${activeTab === 'quests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('quests')}
                >
                  <span className="tab-icon">📋</span>
                  Quests
                  <span className="tab-badge">
                    {completedTasks.length}/{dailyTasks.length}
                  </span>
                </button>
                <button
                  className={`tab-btn ${activeTab === 'missions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('missions')}
                >
                  <span className="tab-icon">🏆</span>
                  Missions
                  <span className="tab-badge">
                    {completedMissions.length}/{missions.length}
                  </span>
                </button>
                <button
                  className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rewards')}
                >
                  <span className="tab-icon">🎁</span>
                  Rewards
                  <span className="tab-badge">
                    {redeemedRewards.length}/{rewards.length}
                  </span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="dashboard-content">
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="dashboard-stats">
            <div className="stat-summary-card">
              <span className="stat-icon">📈</span>
              <div className="stat-info">
                <span className="stat-value">{completedTasks.length + completedQuests.length}</span>
                <span className="stat-label">Tasks completed today</span>
              </div>
            </div>
            <div className="stat-summary-card">
              <span className="stat-icon">⚡</span>
              <div className="stat-info">
                <span className="stat-value">{earnedDailyXp}</span>
                <span className="stat-label">XP earned today</span>
              </div>
            </div>
            <div className="stat-summary-card">
              <span className="stat-icon">🎯</span>
              <div className="stat-info">
                <span className="stat-value">{completedMissions.length}</span>
                <span className="stat-label">Missions completed</span>
              </div>
            </div>
            <div className="stat-summary-card">
              <span className="stat-icon">🔓</span>
              <div className="stat-info">
                <span className="stat-value">{redeemedRewards.length}</span>
                <span className="stat-label">Rewards redeemed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How XP Works Section */}
      <section className="section alt">
        <div className="container">
          <h2>How XP Works</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Complete Tasks</h3>
              <p>
                Daily tasks reset each day. Complete them all to maximize your XP
                gains and maintain your streak.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔥</div>
              <h3>Build Streaks</h3>
              <p>
                Log in and complete at least one task daily to build your streak.
                Higher streaks unlock XP multipliers.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Redeem Rewards</h3>
              <p>
                Spend your XP on exclusive rewards like fee rebates, priority slots,
                and trading boosts.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
