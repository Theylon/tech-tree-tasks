import type { Node as DBNode, Dependency, TaskStatus } from '@/types/database'
import type { Node, Edge } from '@xyflow/react'

export interface TaskNodeData extends Record<string, unknown> {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  size: 'S' | 'M' | 'L'
  xpValue: number
  branch: string
  owner: {
    id: string
    name: string | null
    avatarUrl: string | null
  } | null
  completionNotes: string | null
  completedAt: string | null
}

export function transformToReactFlowNodes(dbNodes: DBNode[]): Node<TaskNodeData>[] {
  return dbNodes.map((node) => ({
    id: node.id,
    type: 'task',
    position: { x: node.position_x, y: node.position_y },
    data: {
      id: node.id,
      title: node.title,
      description: node.description,
      status: node.status,
      size: node.size,
      xpValue: node.xp_value,
      branch: node.branch,
      owner: node.owner
        ? {
            id: node.owner.id,
            name: node.owner.full_name,
            avatarUrl: node.owner.avatar_url,
          }
        : null,
      completionNotes: node.completion_notes,
      completedAt: node.completed_at,
    },
    draggable: node.status !== 'completed',
  }))
}

export function transformToReactFlowEdges(dependencies: Dependency[]): Edge[] {
  return dependencies.map((dep) => ({
    id: dep.id,
    source: dep.from_node_id,
    target: dep.to_node_id,
    type: 'dependency',
    animated: false,
  }))
}

// Check for cycles in the dependency graph
export function wouldCreateCycle(
  edges: Edge[],
  newSource: string,
  newTarget: string
): boolean {
  // Build adjacency list
  const graph = new Map<string, string[]>()

  for (const edge of edges) {
    if (!graph.has(edge.source)) graph.set(edge.source, [])
    graph.get(edge.source)!.push(edge.target)
  }

  // Add proposed edge
  if (!graph.has(newSource)) graph.set(newSource, [])
  graph.get(newSource)!.push(newTarget)

  // DFS from newTarget to see if we can reach newSource
  const visited = new Set<string>()
  const stack = [newTarget]

  while (stack.length > 0) {
    const node = stack.pop()!
    if (node === newSource) return true // Cycle detected
    if (visited.has(node)) continue
    visited.add(node)

    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      stack.push(neighbor)
    }
  }

  return false
}

// Calculate position for a new node
export function calculateNewNodePosition(
  existingNodes: Node<TaskNodeData>[],
  branch: string,
  branchIndex: number
): { x: number; y: number } {
  // Filter nodes by branch
  const branchNodes = existingNodes.filter(
    (n) => n.data.branch === branch
  )

  // Base X position depends on branch index (spread branches horizontally)
  const baseX = branchIndex * 300

  if (branchNodes.length === 0) {
    // First node in branch - start at bottom (high Y = bottom in our bottom-up tree)
    return { x: baseX, y: 500 }
  }

  // Find the node with lowest Y (highest in the tree, since we go bottom-up)
  const topNode = branchNodes.reduce((prev, curr) =>
    prev.position.y < curr.position.y ? prev : curr
  )

  // Place new node above (lower Y value)
  return { x: baseX, y: topNode.position.y - 150 }
}

// Get branches from nodes
export function getBranches(nodes: DBNode[]): string[] {
  const branches = new Set(nodes.map((n) => n.branch))
  return Array.from(branches)
}
