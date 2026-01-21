'use client'

import { useCallback, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Filter, Users, Settings } from 'lucide-react'
import { useProject } from '@/hooks/use-projects'
import { useNodes, useDependencies } from '@/hooks/use-nodes'
import { useUserProgress, useAllProgress, useProjectProgress, useAchievements } from '@/hooks/use-progress'
import { useAuth } from '@/hooks/use-auth'
import { useTechTreeStore } from '@/stores/tech-tree-store'
import { TechTreeCanvas } from '@/components/tech-tree/tech-tree-canvas'
import { TaskDetailPanel } from '@/components/tech-tree/task-detail-panel'
import { StatsPanel } from '@/components/gamification/stats-panel'
import { AchievementsPanel } from '@/components/gamification/achievements-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { transformToReactFlowNodes, transformToReactFlowEdges, calculateNewNodePosition, getBranches } from '@/lib/utils/graph'
import type { TaskSize } from '@/types/database'

const BRANCHES = ['dev', 'biz', 'launch']

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const { user, profile, signOut } = useAuth()
  const { project, isLoading: projectLoading, inviteMember } = useProject(projectId)
  const {
    nodes,
    isLoading: nodesLoading,
    createNode,
    updateNode,
    deleteNode,
    claimNode,
    unclaimNode,
    completeNode,
    undoCompleteNode,
    mutate: mutateNodes,
  } = useNodes(projectId)
  const { dependencies, createDependency, mutate: mutateDeps } = useDependencies(projectId)
  const { progress, mutate: mutateProgress } = useUserProgress(projectId)
  const { allProgress, mutate: mutateAllProgress } = useAllProgress(projectId)
  const { projectProgress, mutate: mutateProjectProgress } = useProjectProgress(projectId)
  const { achievements, mutate: mutateAchievements } = useAchievements(projectId)

  const { selectedNodeId, setSelectedNode, isDetailPanelOpen, setDetailPanelOpen, filters, setFilter } = useTechTreeStore()

  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskSize, setNewTaskSize] = useState<TaskSize>('M')
  const [newTaskBranch, setNewTaskBranch] = useState('dev')
  const [creating, setCreating] = useState(false)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const [showFilters, setShowFilters] = useState(false)

  // Transform nodes/edges for React Flow
  const reactFlowNodes = useMemo(
    () => transformToReactFlowNodes(nodes),
    [nodes]
  )
  const reactFlowEdges = useMemo(
    () => transformToReactFlowEdges(dependencies),
    [dependencies]
  )

  // Get selected node
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  )

  // Get branches from nodes
  const existingBranches = useMemo(() => getBranches(nodes), [nodes])
  const allBranches = [...new Set([...BRANCHES, ...existingBranches])]

  // Handlers
  const handleNodePositionChange = useCallback(
    async (nodeId: string, x: number, y: number) => {
      await updateNode(nodeId, { position_x: x, position_y: y })
    },
    [updateNode]
  )

  const handleCreateDependency = useCallback(
    async (fromId: string, toId: string) => {
      await createDependency(fromId, toId)
    },
    [createDependency]
  )

  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      setSelectedNode(nodeId)
      setDetailPanelOpen(!!nodeId)
    },
    [setSelectedNode, setDetailPanelOpen]
  )

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setCreating(true)
    try {
      const branchIndex = allBranches.indexOf(newTaskBranch)
      const position = calculateNewNodePosition(reactFlowNodes, newTaskBranch, branchIndex)

      await createNode({
        title: newTaskTitle,
        size: newTaskSize,
        branch: newTaskBranch,
        position_x: position.x,
        position_y: position.y,
      })

      setNewTaskTitle('')
      setShowCreateTask(false)
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      await inviteMember(inviteEmail)
      setInviteEmail('')
      setShowInvite(false)
    } catch (error) {
      console.error('Error inviting:', error)
      alert('Could not find user with that email')
    } finally {
      setInviting(false)
    }
  }

  const refreshAll = () => {
    mutateNodes()
    mutateDeps()
    mutateProgress()
    mutateAllProgress()
    mutateProjectProgress()
    mutateAchievements()
  }

  if (projectLoading || nodesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Project not found</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌳</span>
            <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Team */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {project.project_members.map((member) => (
                <Avatar
                  key={member.id}
                  src={member.profiles?.avatar_url}
                  alt={member.profiles?.full_name || 'Member'}
                  fallback={member.profiles?.full_name?.charAt(0)}
                  size="sm"
                  className="border-2 border-white"
                />
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowInvite(true)}>
              <Users className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>

          {/* Create Task */}
          <Button size="sm" onClick={() => setShowCreateTask(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>

          {/* User */}
          <Avatar
            src={profile?.avatar_url}
            alt={profile?.full_name || 'User'}
            fallback={profile?.full_name?.charAt(0)}
          />
        </div>
      </header>

      {/* Filters Bar */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Status:</span>
            {['all', 'unlocked', 'in_progress', 'completed', 'locked'].map((status) => (
              <Badge
                key={status}
                variant={filters.status === status ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => setFilter('status', status as typeof filters.status)}
              >
                {status}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Owner:</span>
            {['all', 'me', 'other', 'unassigned'].map((owner) => (
              <Badge
                key={owner}
                variant={filters.owner === owner ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => setFilter('owner', owner as typeof filters.owner)}
              >
                {owner}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Branch:</span>
            <Badge
              variant={filters.branch === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('branch', 'all')}
            >
              All
            </Badge>
            {allBranches.map((branch) => (
              <Badge
                key={branch}
                variant={filters.branch === branch ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => setFilter('branch', branch)}
              >
                {branch}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Tech Tree Canvas */}
        <div className="flex-1 relative">
          <TechTreeCanvas
            initialNodes={reactFlowNodes}
            initialEdges={reactFlowEdges}
            onNodePositionChange={handleNodePositionChange}
            onCreateDependency={handleCreateDependency}
            onNodeSelect={handleNodeSelect}
            userId={user?.id || null}
          />

          {/* Create Task Modal */}
          {showCreateTask && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-96">
                <h3 className="text-lg font-bold mb-4">Create New Task</h3>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Title</label>
                    <Input
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm text-gray-600">Size</label>
                      <div className="flex gap-2 mt-1">
                        {(['S', 'M', 'L'] as TaskSize[]).map((size) => (
                          <Badge
                            key={size}
                            variant={newTaskSize === size ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setNewTaskSize(size)}
                          >
                            {size}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1">
                      <label className="text-sm text-gray-600">Branch</label>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {BRANCHES.map((branch) => (
                          <Badge
                            key={branch}
                            variant={newTaskBranch === branch ? 'default' : 'outline'}
                            className="cursor-pointer capitalize"
                            onClick={() => setNewTaskBranch(branch)}
                          >
                            {branch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" loading={creating} className="flex-1">
                      Create Task
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateTask(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Invite Modal */}
          {showInvite && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-96">
                <h3 className="text-lg font-bold mb-4">Invite Team Member</h3>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <Input
                      type="email"
                      placeholder="teammate@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      They must have an account to be added
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" loading={inviting} className="flex-1">
                      Invite
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowInvite(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Stats */}
        <div className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0">
          <StatsPanel
            userProgress={progress}
            projectProgress={projectProgress}
            allProgress={allProgress}
            currentUserId={user?.id || null}
          />

          <div className="mt-4">
            <AchievementsPanel earnedAchievements={achievements} />
          </div>
        </div>

        {/* Task Detail Panel */}
        {selectedNode && (
          <TaskDetailPanel
            node={selectedNode}
            dependencies={dependencies}
            allNodes={nodes}
            userId={user?.id || null}
            isOpen={isDetailPanelOpen}
            onClose={() => {
              setSelectedNode(null)
              setDetailPanelOpen(false)
            }}
            onClaim={async () => {
              await claimNode(selectedNode.id)
              refreshAll()
            }}
            onUnclaim={async () => {
              await unclaimNode(selectedNode.id)
              refreshAll()
            }}
            onComplete={async (notes) => {
              const result = await completeNode(selectedNode.id, notes)
              refreshAll()
              return result
            }}
            onUndoComplete={async () => {
              await undoCompleteNode(selectedNode.id)
              refreshAll()
            }}
            onDelete={async () => {
              await deleteNode(selectedNode.id)
              setSelectedNode(null)
              refreshAll()
            }}
            onUpdate={async (updates) => {
              await updateNode(selectedNode.id, updates)
              refreshAll()
            }}
          />
        )}
      </div>
    </div>
  )
}
