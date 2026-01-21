// Achievement definitions
export interface AchievementDef {
  code: string
  name: string
  description: string
  icon: string
  xp_reward: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: 'first_task',
    name: 'First Blood',
    description: 'Complete your first task',
    icon: '🎯',
    xp_reward: 10,
  },
  {
    code: 'ten_tasks',
    name: 'Getting Started',
    description: 'Complete 10 tasks',
    icon: '🔥',
    xp_reward: 50,
  },
  {
    code: 'fifty_tasks',
    name: 'Workhorse',
    description: 'Complete 50 tasks',
    icon: '💪',
    xp_reward: 100,
  },
  {
    code: 'hundred_tasks',
    name: 'Centurion',
    description: 'Complete 100 tasks',
    icon: '⚔️',
    xp_reward: 200,
  },
  {
    code: 'level_5',
    name: 'Apprentice',
    description: 'Reach level 5',
    icon: '🌟',
    xp_reward: 25,
  },
  {
    code: 'level_10',
    name: 'Expert',
    description: 'Reach level 10',
    icon: '👑',
    xp_reward: 50,
  },
  {
    code: 'first_large',
    name: 'Big Game Hunter',
    description: 'Complete your first L-sized task',
    icon: '🎖️',
    xp_reward: 25,
  },
  {
    code: 'streak_3',
    name: 'On a Roll',
    description: 'Complete tasks 3 days in a row',
    icon: '📈',
    xp_reward: 30,
  },
  {
    code: 'streak_7',
    name: 'Week Warrior',
    description: 'Complete tasks 7 days in a row',
    icon: '🏆',
    xp_reward: 75,
  },
  {
    code: 'unlocked_chain',
    name: 'Chain Reaction',
    description: 'Unlock 3 tasks with a single completion',
    icon: '⛓️',
    xp_reward: 40,
  },
  {
    code: 'branch_complete',
    name: 'Branch Manager',
    description: 'Complete all tasks in a branch',
    icon: '🌳',
    xp_reward: 100,
  },
  {
    code: 'collab_complete',
    name: 'Team Player',
    description: 'You and your partner each complete a task on the same day',
    icon: '🤝',
    xp_reward: 30,
  },
]

export function getAchievementByCode(code: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.code === code)
}
