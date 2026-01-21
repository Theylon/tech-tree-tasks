'use client'

import { ACHIEVEMENTS } from '@/lib/constants/achievements'
import { cn } from '@/lib/utils/cn'
import type { UserAchievement, Achievement } from '@/types/database'

interface AchievementsPanelProps {
  earnedAchievements: (UserAchievement & { achievement: Achievement })[]
}

export function AchievementsPanel({ earnedAchievements }: AchievementsPanelProps) {
  const earnedCodes = new Set(earnedAchievements.map((a) => a.achievement.code))

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-medium text-gray-500 uppercase">
          Achievements
        </div>
        <div className="text-xs text-gray-400">
          {earnedAchievements.length} / {ACHIEVEMENTS.length}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {ACHIEVEMENTS.map((achievement) => {
          const isEarned = earnedCodes.has(achievement.code)
          const earned = earnedAchievements.find(
            (a) => a.achievement.code === achievement.code
          )

          return (
            <div
              key={achievement.code}
              className={cn(
                'relative group flex flex-col items-center p-2 rounded-lg transition-all',
                isEarned
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-gray-50 border border-gray-100 opacity-40 grayscale'
              )}
              title={`${achievement.name}: ${achievement.description}`}
            >
              <div className="text-2xl">{achievement.icon}</div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="font-medium">{achievement.name}</div>
                <div className="text-gray-300 mt-1">{achievement.description}</div>
                {isEarned && earned && (
                  <div className="text-amber-400 mt-1 text-[10px]">
                    Earned {new Date(earned.earned_at).toLocaleDateString()}
                  </div>
                )}
                {!isEarned && (
                  <div className="text-gray-400 mt-1 text-[10px]">
                    +{achievement.xp_reward} XP reward
                  </div>
                )}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Recently earned */}
      {earnedAchievements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-2">
            Recently Earned
          </div>
          <div className="space-y-2">
            {earnedAchievements.slice(0, 3).map((ua) => (
              <div
                key={ua.id}
                className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg"
              >
                <span className="text-xl">{ua.achievement.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-800">
                    {ua.achievement.name}
                  </div>
                  <div className="text-xs text-amber-600">
                    {ua.achievement.description}
                  </div>
                </div>
                <div className="text-xs text-amber-500">
                  +{ua.achievement.xp_reward} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
