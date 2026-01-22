import { describe, it, expect } from 'vitest'
import {
  wouldCreateCycle,
  transformToReactFlowNodes,
  transformToReactFlowEdges,
  calculateNewNodePosition,
  getBranches,
} from '@/lib/utils/graph'
import type { Edge } from '@xyflow/react'

describe('wouldCreateCycle', () => {
  it('returns false for empty graph', () => {
    const edges: Edge[] = []
    expect(wouldCreateCycle(edges, 'A', 'B')).toBe(false)
  })

  it('returns false for valid DAG edge', () => {
    const edges: Edge[] = [
      { id: '1', source: 'A', target: 'B' },
      { id: '2', source: 'B', target: 'C' },
    ]
    expect(wouldCreateCycle(edges, 'C', 'D')).toBe(false)
  })

  it('returns true when edge would create direct cycle', () => {
    const edges: Edge[] = [
      { id: '1', source: 'A', target: 'B' },
    ]
    // Adding B -> A would create cycle
    expect(wouldCreateCycle(edges, 'B', 'A')).toBe(true)
  })

  it('returns true when edge would create indirect cycle', () => {
    const edges: Edge[] = [
      { id: '1', source: 'A', target: 'B' },
      { id: '2', source: 'B', target: 'C' },
      { id: '3', source: 'C', target: 'D' },
    ]
    // Adding D -> A would create cycle A -> B -> C -> D -> A
    expect(wouldCreateCycle(edges, 'D', 'A')).toBe(true)
  })

  it('handles complex graph without creating cycle', () => {
    const edges: Edge[] = [
      { id: '1', source: 'A', target: 'B' },
      { id: '2', source: 'A', target: 'C' },
      { id: '3', source: 'B', target: 'D' },
      { id: '4', source: 'C', target: 'D' },
    ]
    // Adding D -> E is fine
    expect(wouldCreateCycle(edges, 'D', 'E')).toBe(false)
  })

  it('detects cycle in complex diamond graph', () => {
    const edges: Edge[] = [
      { id: '1', source: 'A', target: 'B' },
      { id: '2', source: 'A', target: 'C' },
      { id: '3', source: 'B', target: 'D' },
      { id: '4', source: 'C', target: 'D' },
    ]
    // Adding D -> A would create cycle
    expect(wouldCreateCycle(edges, 'D', 'A')).toBe(true)
  })
})

describe('transformToReactFlowNodes', () => {
  it('transforms empty array', () => {
    expect(transformToReactFlowNodes([])).toEqual([])
  })

  it('transforms single node correctly', () => {
    const dbNodes = [{
      id: 'node-1',
      project_id: 'project-1',
      title: 'Test Task',
      description: 'A test task',
      owner_id: null,
      owner: null,
      status: 'unlocked' as const,
      size: 'M' as const,
      xp_value: 75,
      position_x: 100,
      position_y: 200,
      branch: 'dev',
      completion_notes: null,
      completed_at: null,
      completed_by: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }]

    const result = transformToReactFlowNodes(dbNodes)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'node-1',
      type: 'task',
      position: { x: 100, y: 200 },
      data: {
        id: 'node-1',
        title: 'Test Task',
        description: 'A test task',
        status: 'unlocked',
        size: 'M',
        xpValue: 75,
        branch: 'dev',
        owner: null,
        completionNotes: null,
        completedAt: null,
      },
      draggable: true,
    })
  })

  it('sets draggable to false for completed nodes', () => {
    const dbNodes = [{
      id: 'node-1',
      project_id: 'project-1',
      title: 'Completed Task',
      description: null,
      owner_id: 'user-1',
      owner: {
        id: 'user-1',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      status: 'completed' as const,
      size: 'S' as const,
      xp_value: 50,
      position_x: 0,
      position_y: 0,
      branch: 'biz',
      completion_notes: 'Done!',
      completed_at: '2024-01-02T00:00:00Z',
      completed_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    }]

    const result = transformToReactFlowNodes(dbNodes)

    expect(result[0].draggable).toBe(false)
    expect(result[0].data.owner).toEqual({
      id: 'user-1',
      name: 'Test User',
      avatarUrl: null,
    })
  })
})

describe('transformToReactFlowEdges', () => {
  it('transforms empty array', () => {
    expect(transformToReactFlowEdges([])).toEqual([])
  })

  it('transforms dependencies correctly', () => {
    const dependencies = [
      {
        id: 'dep-1',
        project_id: 'project-1',
        from_node_id: 'node-1',
        to_node_id: 'node-2',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    const result = transformToReactFlowEdges(dependencies)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'dep-1',
      source: 'node-1',
      target: 'node-2',
      type: 'dependency',
      animated: false,
    })
  })
})

describe('calculateNewNodePosition', () => {
  it('returns starting position for empty branch', () => {
    const result = calculateNewNodePosition([], 'dev', 0)
    expect(result).toEqual({ x: 0, y: 500 })
  })

  it('calculates correct X based on branch index', () => {
    const result1 = calculateNewNodePosition([], 'dev', 0)
    const result2 = calculateNewNodePosition([], 'biz', 1)
    const result3 = calculateNewNodePosition([], 'launch', 2)

    expect(result1.x).toBe(0)
    expect(result2.x).toBe(300)
    expect(result3.x).toBe(600)
  })

  it('places new node above highest existing node in branch', () => {
    const existingNodes = [
      {
        id: '1',
        type: 'task',
        position: { x: 0, y: 500 },
        data: { id: '1', title: 'Task 1', branch: 'dev', description: null, status: 'unlocked' as const, size: 'M' as const, xpValue: 75, owner: null, completionNotes: null, completedAt: null },
      },
      {
        id: '2',
        type: 'task',
        position: { x: 0, y: 350 },
        data: { id: '2', title: 'Task 2', branch: 'dev', description: null, status: 'unlocked' as const, size: 'M' as const, xpValue: 75, owner: null, completionNotes: null, completedAt: null },
      },
    ]

    const result = calculateNewNodePosition(existingNodes, 'dev', 0)
    // Should be 150 above the highest node (y: 350)
    expect(result.y).toBe(200)
  })

  it('ignores nodes from other branches', () => {
    const existingNodes = [
      {
        id: '1',
        type: 'task',
        position: { x: 0, y: 100 },
        data: { id: '1', title: 'Task 1', branch: 'biz', description: null, status: 'unlocked' as const, size: 'M' as const, xpValue: 75, owner: null, completionNotes: null, completedAt: null },
      },
    ]

    const result = calculateNewNodePosition(existingNodes, 'dev', 0)
    // Should return starting position since no 'dev' nodes exist
    expect(result).toEqual({ x: 0, y: 500 })
  })
})

describe('getBranches', () => {
  it('returns empty array for empty nodes', () => {
    expect(getBranches([])).toEqual([])
  })

  it('returns unique branches', () => {
    const nodes = [
      { branch: 'dev' },
      { branch: 'biz' },
      { branch: 'dev' },
      { branch: 'launch' },
    ] as any[]

    const result = getBranches(nodes)
    expect(result).toHaveLength(3)
    expect(result).toContain('dev')
    expect(result).toContain('biz')
    expect(result).toContain('launch')
  })
})
