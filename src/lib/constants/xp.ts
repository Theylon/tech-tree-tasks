import type { TaskSize } from '@/types/database'

// XP rewards by task size
export const TASK_XP: Record<TaskSize, number> = {
  S: 25,
  M: 75,
  L: 200,
}

// XP thresholds for each level
// Level N requires XP_THRESHOLDS[N-1] total XP
export const XP_THRESHOLDS = [
  0,      // Level 1: 0 XP
  100,    // Level 2: 100 XP
  300,    // Level 3: 300 XP
  600,    // Level 4: 600 XP
  1000,   // Level 5: 1000 XP
  1500,   // Level 6: 1500 XP
  2100,   // Level 7: 2100 XP
  2800,   // Level 8: 2800 XP
  3600,   // Level 9: 3600 XP
  4500,   // Level 10: 4500 XP
  5500,   // Level 11+
]

export const MAX_LEVEL = XP_THRESHOLDS.length

export function calculateLevel(totalXp: number): number {
  let level = 1
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (totalXp >= XP_THRESHOLDS[i]) {
      level = i + 1
    } else {
      break
    }
  }
  return level
}

export function getXpForCurrentLevel(totalXp: number, level: number): number {
  const currentThreshold = XP_THRESHOLDS[level - 1] || 0
  return totalXp - currentThreshold
}

export function getXpNeededForLevel(level: number): number {
  const currentThreshold = XP_THRESHOLDS[level - 1] || 0
  const nextThreshold = XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1]
  return nextThreshold - currentThreshold
}

export function getXpToNextLevel(totalXp: number, level: number): number {
  const nextThreshold = XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1]
  return Math.max(0, nextThreshold - totalXp)
}

export function getProgressPercent(totalXp: number, level: number): number {
  const xpInLevel = getXpForCurrentLevel(totalXp, level)
  const xpNeeded = getXpNeededForLevel(level)
  return Math.min(100, (xpInLevel / xpNeeded) * 100)
}

export function getDefaultXpForSize(size: TaskSize): number {
  return TASK_XP[size]
}
