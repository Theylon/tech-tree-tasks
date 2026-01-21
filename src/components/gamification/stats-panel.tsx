'use client'

import { XPProgressBar } from './xp-progress-bar'
import { Avatar } from '@/components/ui/avatar'
import type { UserProgress, ProjectProgress, Profile } from '@/types/database'

interface StatsPanelProps {
  userProgress: UserProgress | null | undefined
  projectProgress: ProjectProgress | null | undefined
  allProgress: (UserProgress & { user: Profile })[]
  currentUserId: string | null
}

export function StatsPanel({
  userProgress,
  projectProgress,
  allProgress,
  currentUserId,
}: StatsPanelProps) {
  const myProgress = userProgress || {
    total_xp: 0,
    level: 1,
    tasks_completed: 0,
    streak_days: 0,
  }

  const sharedXp = projectProgress?.total_xp || 0
  const sharedTasks = projectProgress?.tasks_completed || 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
      {/* Personal Stats */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase mb-3">
          Your Progress
        </div>
        <XPProgressBar
          totalXP={myProgress.total_xp}
          level={myProgress.level}
        />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {myProgress.total_xp}
            </div>
            <div className="text-xs text-amber-700">Total XP</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {myProgress.tasks_completed}
            </div>
            <div className="text-xs text-green-700">Tasks Done</div>
          </div>
        </div>
      </div>

      {/* Shared Project Progress */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-xs font-medium text-gray-500 uppercase mb-3">
          Project Total
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{sharedXp}</div>
            <div className="text-xs text-purple-700">Combined XP</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{sharedTasks}</div>
            <div className="text-xs text-blue-700">Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {allProgress.length > 1 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 uppercase mb-3">
            Team Leaderboard
          </div>
          <div className="space-y-2">
            {allProgress.map((progress, index) => (
              <div
                key={progress.id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  progress.user_id === currentUserId
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-500">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : `${index + 1}`}
                </div>
                <Avatar
                  src={progress.user?.avatar_url}
                  alt={progress.user?.full_name || 'User'}
                  fallback={progress.user?.full_name?.charAt(0)}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {progress.user?.full_name || 'Unknown'}
                    {progress.user_id === currentUserId && (
                      <span className="ml-1 text-xs text-amber-600">(you)</span>
                    )}
                  </div>
                </div>
                <div className="text-sm font-bold text-amber-600">
                  {progress.total_xp} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
