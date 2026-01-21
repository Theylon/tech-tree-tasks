'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Lock, CheckCircle2, Circle, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import type { TaskNodeData } from '@/lib/utils/graph'

const statusIcons = {
  locked: Lock,
  unlocked: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
}

const sizeVariants = {
  S: 'small' as const,
  M: 'medium' as const,
  L: 'large' as const,
}

const branchColors: Record<string, string> = {
  dev: 'border-l-blue-500',
  biz: 'border-l-green-500',
  launch: 'border-l-purple-500',
}

interface TaskNodeProps {
  data: TaskNodeData
  selected?: boolean
}

function TaskNodeComponent({ data, selected }: TaskNodeProps) {
  const StatusIcon = statusIcons[data.status]
  const isLocked = data.status === 'locked'
  const isCompleted = data.status === 'completed'
  const isInProgress = data.status === 'in_progress'

  const branchColor = branchColors[data.branch] || 'border-l-gray-500'

  return (
    <div
      className={cn(
        'min-w-[220px] max-w-[280px] rounded-lg border-2 border-l-4 bg-white p-4 shadow-lg transition-all',
        branchColor,
        selected && 'border-amber-500 ring-2 ring-amber-200',
        isLocked && 'opacity-60 grayscale-[30%]',
        isCompleted && 'border-green-500 bg-green-50/50 opacity-70',
        isInProgress && 'border-amber-400 bg-amber-50/30',
        !selected && !isCompleted && !isInProgress && 'border-gray-200 hover:border-gray-300'
      )}
    >
      {/* Target handle (bottom) - for incoming dependencies (bottom-up tree) */}
      <Handle
        type="target"
        position={Position.Bottom}
        className={cn(
          'h-3 w-3 rounded-full border-2 border-white',
          isLocked ? 'bg-gray-400' : 'bg-amber-500'
        )}
      />

      {/* Header: Status + Title + Size */}
      <div className="flex items-start gap-2">
        <StatusIcon
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0',
            isCompleted && 'text-green-600',
            isLocked && 'text-gray-400',
            isInProgress && 'text-amber-600',
            data.status === 'unlocked' && 'text-gray-500'
          )}
        />
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-medium leading-tight',
              isCompleted && 'text-green-800 line-through',
              isLocked && 'text-gray-500'
            )}
          >
            {data.title}
          </h3>
        </div>
        <Badge variant={sizeVariants[data.size]} className="shrink-0">
          {data.size}
        </Badge>
      </div>

      {/* Description preview */}
      {data.description && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">
          {data.description}
        </p>
      )}

      {/* Footer: Owner + XP */}
      <div className="mt-3 flex items-center justify-between">
        {data.owner ? (
          <div className="flex items-center gap-1.5">
            <Avatar
              src={data.owner.avatarUrl}
              alt={data.owner.name || 'User'}
              fallback={data.owner.name?.charAt(0)}
              size="sm"
            />
            <span className="text-xs text-gray-500 truncate max-w-[80px]">
              {data.owner.name || 'Unknown'}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">Unclaimed</span>
        )}
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-semibold',
            isCompleted ? 'text-green-600' : 'text-amber-600'
          )}
        >
          <span className="text-xs">+</span>
          {data.xpValue}
          <span className="text-xs">XP</span>
        </div>
      </div>

      {/* Completed indicator */}
      {isCompleted && data.completedAt && (
        <div className="mt-2 text-xs text-green-600 text-center border-t border-green-200 pt-2">
          Completed {new Date(data.completedAt).toLocaleDateString()}
        </div>
      )}

      {/* Source handle (top) - for outgoing dependencies (bottom-up tree) */}
      <Handle
        type="source"
        position={Position.Top}
        className={cn(
          'h-3 w-3 rounded-full border-2 border-white',
          isLocked ? 'bg-gray-400' : 'bg-amber-500'
        )}
      />
    </div>
  )
}

export const TaskNode = memo(TaskNodeComponent)
