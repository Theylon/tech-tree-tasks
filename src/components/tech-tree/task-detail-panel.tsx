'use client'

import { useState } from 'react'
import { X, Lock, CheckCircle2, PlayCircle, Circle, Undo2, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import type { Node, Dependency } from '@/types/database'
import type { CompleteNodeResult } from '@/types/database'

interface TaskDetailPanelProps {
  node: Node
  dependencies: Dependency[]
  allNodes: Node[]
  userId: string | null
  isOpen: boolean
  onClose: () => void
  onClaim: () => Promise<void>
  onUnclaim: () => Promise<void>
  onComplete: (notes?: string) => Promise<CompleteNodeResult>
  onUndoComplete: () => Promise<void>
  onDelete: () => Promise<void>
  onUpdate: (updates: Partial<Node>) => Promise<void>
}

const statusConfig = {
  locked: { icon: Lock, label: 'Locked', color: 'text-gray-500' },
  unlocked: { icon: Circle, label: 'Unlocked', color: 'text-gray-600' },
  in_progress: { icon: PlayCircle, label: 'In Progress', color: 'text-amber-600' },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-600' },
}

const sizeVariants = {
  S: 'small' as const,
  M: 'medium' as const,
  L: 'large' as const,
}

export function TaskDetailPanel({
  node,
  dependencies,
  allNodes,
  userId,
  isOpen,
  onClose,
  onClaim,
  onUnclaim,
  onComplete,
  onUndoComplete,
  onDelete,
  onUpdate,
}: TaskDetailPanelProps) {
  const [loading, setLoading] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [result, setResult] = useState<CompleteNodeResult | null>(null)

  const status = statusConfig[node.status]
  const StatusIcon = status.icon
  const isOwner = node.owner_id === userId
  const canClaim = !node.owner_id && node.status !== 'completed'
  const canComplete = (isOwner || !node.owner_id) && node.status !== 'completed'
  const canUndo = node.status === 'completed'

  // Get prerequisite nodes
  const prereqs = dependencies
    .filter((d) => d.to_node_id === node.id)
    .map((d) => allNodes.find((n) => n.id === d.from_node_id))
    .filter(Boolean) as Node[]

  const incompletePrereqs = prereqs.filter((p) => p.status !== 'completed')

  const handleClaim = async () => {
    setLoading(true)
    try {
      await onClaim()
    } finally {
      setLoading(false)
    }
  }

  const handleUnclaim = async () => {
    setLoading(true)
    try {
      await onUnclaim()
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await onComplete(completionNotes || undefined)
      setResult(res)
      setShowCompleteForm(false)
      setCompletionNotes('')
    } finally {
      setLoading(false)
    }
  }

  const handleUndoComplete = async () => {
    setLoading(true)
    try {
      await onUndoComplete()
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return
    setLoading(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('h-5 w-5', status.color)} />
          <span className={cn('text-sm font-medium', status.color)}>
            {status.label}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title & Size */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{node.title}</h2>
            <Badge variant={sizeVariants[node.size]}>{node.size}</Badge>
          </div>
          {node.description && (
            <p className="mt-2 text-sm text-gray-600">{node.description}</p>
          )}
        </div>

        {/* XP Reward */}
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="text-lg font-bold text-amber-700">
              +{node.xp_value} XP
            </div>
            <div className="text-xs text-amber-600">Complete to earn</div>
          </div>
        </div>

        {/* Completion Result */}
        {result && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-2">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircle2 className="h-5 w-5" />
              Task Completed!
            </div>
            <div className="text-sm text-green-600">
              +{result.xp_gained} XP earned
            </div>
            {result.level_up && (
              <div className="text-sm text-green-600 font-bold">
                Level Up! Now level {result.level}
              </div>
            )}
            {result.achievements_earned.length > 0 && (
              <div className="space-y-1">
                {result.achievements_earned.map((a) => (
                  <div
                    key={a.code}
                    className="text-sm text-green-600 flex items-center gap-1"
                  >
                    <span>{a.icon}</span>
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Owner */}
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">
            Assigned To
          </div>
          {node.owner ? (
            <div className="flex items-center gap-2">
              <Avatar
                src={node.owner.avatar_url}
                alt={node.owner.full_name || 'User'}
                fallback={node.owner.full_name?.charAt(0)}
              />
              <span className="text-sm text-gray-900">
                {node.owner.full_name || node.owner.email}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">Unclaimed</span>
          )}
        </div>

        {/* Prerequisites */}
        {prereqs.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">
              Prerequisites ({prereqs.length})
            </div>
            <div className="space-y-2">
              {prereqs.map((prereq) => (
                <div
                  key={prereq.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm',
                    prereq.status === 'completed'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {prereq.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  {prereq.title}
                </div>
              ))}
            </div>
            {incompletePrereqs.length > 0 && node.status !== 'completed' && (
              <p className="mt-2 text-xs text-amber-600">
                Warning: {incompletePrereqs.length} prerequisite(s) not completed
              </p>
            )}
          </div>
        )}

        {/* Branch */}
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">
            Branch
          </div>
          <Badge variant="outline" className="capitalize">
            {node.branch}
          </Badge>
        </div>

        {/* Completion Notes */}
        {node.completion_notes && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">
              Completion Notes
            </div>
            <p className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
              {node.completion_notes}
            </p>
          </div>
        )}

        {/* Complete Form */}
        {showCompleteForm && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700">
              Add completion notes (optional)
            </div>
            <Input
              placeholder="What did you accomplish?"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleComplete} loading={loading} className="flex-1">
                Complete Task
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCompleteForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {canClaim && (
          <Button
            onClick={handleClaim}
            loading={loading}
            className="w-full"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Claim Task
          </Button>
        )}

        {isOwner && node.status === 'in_progress' && (
          <Button
            variant="outline"
            onClick={handleUnclaim}
            loading={loading}
            className="w-full"
          >
            Release Task
          </Button>
        )}

        {canComplete && !showCompleteForm && (
          <Button
            onClick={() => setShowCompleteForm(true)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}

        {canUndo && (
          <Button
            variant="outline"
            onClick={handleUndoComplete}
            loading={loading}
            className="w-full"
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Undo Completion
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={handleDelete}
          loading={loading}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Task
        </Button>
      </div>
    </div>
  )
}
