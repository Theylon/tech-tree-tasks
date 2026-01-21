'use client'

import { Progress } from '@/components/ui/progress'
import { getProgressPercent, getXpToNextLevel, getXpForCurrentLevel, getXpNeededForLevel } from '@/lib/constants/xp'
import { cn } from '@/lib/utils/cn'

interface XPProgressBarProps {
  totalXP: number
  level: number
  className?: string
  showDetails?: boolean
}

export function XPProgressBar({
  totalXP,
  level,
  className,
  showDetails = true,
}: XPProgressBarProps) {
  const progressPercent = getProgressPercent(totalXP, level)
  const xpToNext = getXpToNextLevel(totalXP, level)
  const xpInLevel = getXpForCurrentLevel(totalXP, level)
  const xpNeeded = getXpNeededForLevel(level)

  return (
    <div className={cn('w-full space-y-2', className)}>
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold text-sm shadow-sm">
              {level}
            </div>
            <span className="font-medium text-gray-700">Level {level}</span>
          </div>
          <span className="text-gray-500 text-xs">
            {xpInLevel} / {xpNeeded} XP
          </span>
        </div>
      )}

      <div className="relative">
        <Progress value={progressPercent} className="h-3" />
        {/* XP sparkle effect */}
        <div
          className="absolute top-0 h-full w-1 bg-white/50 rounded-full blur-sm animate-pulse"
          style={{ left: `${Math.min(progressPercent, 98)}%` }}
        />
      </div>

      {showDetails && (
        <div className="text-xs text-gray-400 text-right">
          {xpToNext > 0 ? (
            <span>{xpToNext} XP to Level {level + 1}</span>
          ) : (
            <span className="text-amber-600 font-medium">Max Level!</span>
          )}
        </div>
      )}
    </div>
  )
}
