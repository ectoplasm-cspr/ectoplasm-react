import { useState, useEffect, useCallback } from 'react';

// Dashboard Data Constants
export const DASHBOARD_DATA = {
  dailyTasks: [
    { id: 0, title: 'Check-in and claim streak bonus', xp: 40 },
    { id: 1, title: 'Complete one swap on Casper', xp: 120 },
    { id: 2, title: 'Stake liquidity into any $ECTO pair', xp: 200 },
    { id: 3, title: 'Vote on one governance proposal', xp: 90 },
    { id: 4, title: 'Claim today\'s login reward chest', xp: 60 },
    { id: 5, title: 'Finish a 3-trade combo route', xp: 140 },
  ],
  weeklyQuests: [
    { id: 'quest-0', title: 'Clear 5 swaps with <0.5% slippage', reward: 'Badge + 200 XP', xp: 200, target: 5, actionType: 'swap' as const },
    { id: 'quest-1', title: 'Provide liquidity for 3 consecutive days', reward: 'Boosted APR day', xp: 150, target: 3, actionType: 'liquidity' as const },
    { id: 'quest-2', title: 'Complete 10 trades across different pairs', reward: 'Trading bonus + 180 XP', xp: 180, target: 10, actionType: 'pair' as const },
  ],
  missions: [
    { id: 'mission-0', title: 'Create your first trade', xp: 120, type: 'Starter' },
    { id: 'mission-1', title: 'Hit 10,000 CSPR volume', xp: 350, type: 'Volume' },
    { id: 'mission-2', title: '7-day login streak', xp: 280, type: 'Streak' },
    { id: 'mission-3', title: 'Complete 3 liquidity quests', xp: 320, type: 'Liquidity' },
    { id: 'mission-4', title: 'Combo trader', xp: 260, type: 'Combo' },
    { id: 'mission-5', title: 'Prize redemption run', xp: 220, type: 'Redemption' },
  ],
  rewards: [
    { id: 'reward-0', title: 'Swap fee rebate', cost: 400, detail: '5% off for 24h' },
    { id: 'reward-1', title: 'Launchpad priority slot', cost: 900, detail: 'Jump queue for next cohort' },
    { id: 'reward-2', title: 'Trading boost', cost: 700, detail: '1.2x rewards on trades for 48h' },
  ],
};

// Types
export interface DailyTask {
  id: number;
  title: string;
  xp: number;
}

export interface WeeklyQuest {
  id: string;
  title: string;
  reward: string;
  xp: number;
  target: number;
  actionType: 'swap' | 'liquidity' | 'pair';
}

export interface Mission {
  id: string;
  title: string;
  xp: number;
  type: string;
}

export interface Reward {
  id: string;
  title: string;
  cost: number;
  detail: string;
}

export interface DashboardMetrics {
  swaps: number;
  swapVolume: number;
  liquidityDays: string[];
  pairsTraded: string[];
  comboTrades: number;
  redemptions: number;
}

export interface DashboardState {
  streak: number;
  xp: number;
  lastCheckIn: string | null;
  completedTasks: number[];
  completedQuests: string[];
  completedMissions: string[];
  redeemedRewards: string[];
  metrics: DashboardMetrics;
  questProgress: Record<string, number>;
  missionProgress: Record<string, number>;
}

const STORAGE_KEY = 'ecto_dashboard_state';

const getDefaultState = (): DashboardState => ({
  streak: 0,
  xp: 0,
  lastCheckIn: null,
  completedTasks: [],
  completedQuests: [],
  completedMissions: [],
  redeemedRewards: [],
  metrics: {
    swaps: 0,
    swapVolume: 0,
    liquidityDays: [],
    pairsTraded: [],
    comboTrades: 0,
    redemptions: 0,
  },
  questProgress: {
    'quest-0': 0,
    'quest-1': 0,
    'quest-2': 0,
  },
  missionProgress: {
    'mission-0': 0,
    'mission-1': 0,
    'mission-2': 0,
    'mission-3': 0,
    'mission-4': 0,
    'mission-5': 0,
  },
});

const loadState = (): DashboardState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new fields
      return { ...getDefaultState(), ...parsed };
    }
  } catch (e) {
    console.error('Failed to load dashboard state:', e);
  }
  return getDefaultState();
};

const saveState = (state: DashboardState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save dashboard state:', e);
  }
};

// XP level calculation
export const calculateLevel = (xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } => {
  // Each level requires progressively more XP
  const baseXp = 100;
  const multiplier = 1.5;

  let level = 1;
  let totalXpRequired = 0;
  let currentLevelXp = baseXp;

  while (xp >= totalXpRequired + currentLevelXp) {
    totalXpRequired += currentLevelXp;
    level++;
    currentLevelXp = Math.floor(baseXp * Math.pow(multiplier, level - 1));
  }

  const currentXp = xp - totalXpRequired;
  const progress = (currentXp / currentLevelXp) * 100;

  return { level, currentXp, nextLevelXp: currentLevelXp, progress };
};

export function useDashboard() {
  const [state, setState] = useState<DashboardState>(loadState);

  // Save state on changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Check if daily tasks should reset (new day)
  useEffect(() => {
    const today = new Date().toDateString();
    if (state.lastCheckIn && state.lastCheckIn !== today) {
      // New day - reset daily tasks but keep other progress
      setState(prev => ({
        ...prev,
        completedTasks: [],
      }));
    }
  }, [state.lastCheckIn]);

  // Complete a daily task
  const completeTask = useCallback((taskId: number) => {
    setState(prev => {
      if (prev.completedTasks.includes(taskId)) return prev;

      const task = DASHBOARD_DATA.dailyTasks.find(t => t.id === taskId);
      if (!task) return prev;

      const today = new Date().toDateString();
      const isNewDay = prev.lastCheckIn !== today;
      const newStreak = isNewDay ? prev.streak + 1 : prev.streak;

      return {
        ...prev,
        completedTasks: [...prev.completedTasks, taskId],
        xp: prev.xp + task.xp,
        lastCheckIn: today,
        streak: newStreak,
      };
    });
  }, []);

  // Progress a weekly quest
  const progressQuest = useCallback((questId: string, amount: number = 1) => {
    setState(prev => {
      if (prev.completedQuests.includes(questId)) return prev;

      const quest = DASHBOARD_DATA.weeklyQuests.find(q => q.id === questId);
      if (!quest) return prev;

      const newProgress = Math.min((prev.questProgress[questId] || 0) + amount, quest.target);
      const isComplete = newProgress >= quest.target;

      return {
        ...prev,
        questProgress: {
          ...prev.questProgress,
          [questId]: newProgress,
        },
        completedQuests: isComplete
          ? [...prev.completedQuests, questId]
          : prev.completedQuests,
        xp: isComplete ? prev.xp + quest.xp : prev.xp,
      };
    });
  }, []);

  // Complete a mission
  const completeMission = useCallback((missionId: string) => {
    setState(prev => {
      if (prev.completedMissions.includes(missionId)) return prev;

      const mission = DASHBOARD_DATA.missions.find(m => m.id === missionId);
      if (!mission) return prev;

      return {
        ...prev,
        completedMissions: [...prev.completedMissions, missionId],
        xp: prev.xp + mission.xp,
      };
    });
  }, []);

  // Redeem a reward
  const redeemReward = useCallback((rewardId: string) => {
    setState(prev => {
      if (prev.redeemedRewards.includes(rewardId)) return prev;

      const reward = DASHBOARD_DATA.rewards.find(r => r.id === rewardId);
      if (!reward || prev.xp < reward.cost) return prev;

      return {
        ...prev,
        redeemedRewards: [...prev.redeemedRewards, rewardId],
        xp: prev.xp - reward.cost,
        metrics: {
          ...prev.metrics,
          redemptions: prev.metrics.redemptions + 1,
        },
      };
    });
  }, []);

  // Record a swap (for tracking metrics)
  const recordSwap = useCallback((volume: number, pair: string) => {
    setState(prev => {
      const newPairs = prev.metrics.pairsTraded.includes(pair)
        ? prev.metrics.pairsTraded
        : [...prev.metrics.pairsTraded, pair];

      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          swaps: prev.metrics.swaps + 1,
          swapVolume: prev.metrics.swapVolume + volume,
          pairsTraded: newPairs,
        },
      };
    });
  }, []);

  // Record liquidity provision
  const recordLiquidity = useCallback(() => {
    setState(prev => {
      const today = new Date().toDateString();
      const newDays = prev.metrics.liquidityDays.includes(today)
        ? prev.metrics.liquidityDays
        : [...prev.metrics.liquidityDays, today];

      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          liquidityDays: newDays,
        },
      };
    });
  }, []);

  // Reset all progress (for testing/demo)
  const resetProgress = useCallback(() => {
    setState(getDefaultState());
  }, []);

  // Calculate derived values
  const levelInfo = calculateLevel(state.xp);
  const dailyProgress = (state.completedTasks.length / DASHBOARD_DATA.dailyTasks.length) * 100;
  const totalDailyXp = DASHBOARD_DATA.dailyTasks.reduce((sum, t) => sum + t.xp, 0);
  const earnedDailyXp = state.completedTasks.reduce((sum, taskId) => {
    const task = DASHBOARD_DATA.dailyTasks.find(t => t.id === taskId);
    return sum + (task?.xp || 0);
  }, 0);

  return {
    // State
    state,

    // Level/XP info
    level: levelInfo.level,
    currentXp: levelInfo.currentXp,
    nextLevelXp: levelInfo.nextLevelXp,
    levelProgress: levelInfo.progress,
    totalXp: state.xp,

    // Streak
    streak: state.streak,

    // Daily tasks
    dailyTasks: DASHBOARD_DATA.dailyTasks,
    completedTasks: state.completedTasks,
    dailyProgress,
    totalDailyXp,
    earnedDailyXp,

    // Weekly quests
    weeklyQuests: DASHBOARD_DATA.weeklyQuests,
    completedQuests: state.completedQuests,
    questProgress: state.questProgress,

    // Missions
    missions: DASHBOARD_DATA.missions,
    completedMissions: state.completedMissions,
    missionProgress: state.missionProgress,

    // Rewards
    rewards: DASHBOARD_DATA.rewards,
    redeemedRewards: state.redeemedRewards,

    // Metrics
    metrics: state.metrics,

    // Actions
    completeTask,
    progressQuest,
    completeMission,
    redeemReward,
    recordSwap,
    recordLiquidity,
    resetProgress,
  };
}
