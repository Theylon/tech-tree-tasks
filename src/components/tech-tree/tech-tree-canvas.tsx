'use client'

import { useCallback, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type OnConnect,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TaskNode } from './task-node'
import { DependencyEdge, EdgeMarkerDefs } from './dependency-edge'
import { useTechTreeStore } from '@/stores/tech-tree-store'
import { wouldCreateCycle, type TaskNodeData } from '@/lib/utils/graph'
import { cn } from '@/lib/utils/cn'

const nodeTypes = { task: TaskNode }
const edgeTypes = { dependency: DependencyEdge }

interface TechTreeCanvasProps {
  initialNodes: Node<TaskNodeData>[]
  initialEdges: Edge[]
  onNodePositionChange: (nodeId: string, x: number, y: number) => void
  onCreateDependency: (fromId: string, toId: string) => void
  onNodeSelect: (nodeId: string | null) => void
  userId: string | null
}

export function TechTreeCanvas({
  initialNodes,
  initialEdges,
  onNodePositionChange,
  onCreateDependency,
  onNodeSelect,
  userId,
}: TechTreeCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { filters, setSelectedNode } = useTechTreeStore()

  // Update nodes when initialNodes change
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  // Update edges when initialEdges change
  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  // Filter nodes based on current filters
  const filteredNodes = useMemo(() => {
    return nodes.map((node) => {
      const data = node.data as TaskNodeData
      let visible = true

      // Filter by status
      if (filters.status !== 'all' && data.status !== filters.status) {
        visible = false
      }

      // Filter by owner
      if (filters.owner === 'me' && data.owner?.id !== userId) {
        visible = false
      } else if (filters.owner === 'other' && data.owner?.id === userId) {
        visible = false
      } else if (filters.owner === 'unassigned' && data.owner !== null) {
        visible = false
      }

      // Filter by branch
      if (filters.branch !== 'all' && data.branch !== filters.branch) {
        visible = false
      }

      return {
        ...node,
        hidden: !visible,
        style: visible ? {} : { opacity: 0.3 },
      }
    })
  }, [nodes, filters, userId])

  // Handle node drag end - persist position
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodePositionChange(node.id, node.position.x, node.position.y)
    },
    [onNodePositionChange]
  )

  // Validate connection before creating
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      // Prevent self-connection
      if (connection.source === connection.target) return false

      // Prevent duplicate connections
      const exists = edges.some(
        (e) =>
          e.source === connection.source && e.target === connection.target
      )
      if (exists) return false

      // Prevent cycles
      if (
        connection.source &&
        connection.target &&
        wouldCreateCycle(edges, connection.source, connection.target)
      ) {
        return false
      }

      return true
    },
    [edges]
  )

  // Handle connection creation
  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (
        connection.source &&
        connection.target &&
        isValidConnection(connection)
      ) {
        onCreateDependency(connection.source, connection.target)
        setEdges((eds) =>
          addEdge({ ...connection, type: 'dependency' }, eds)
        )
      }
    },
    [onCreateDependency, setEdges, isValidConnection]
  )

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id)
      onNodeSelect(node.id)
    },
    [setSelectedNode, onNodeSelect]
  )

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    onNodeSelect(null)
  }, [setSelectedNode, onNodeSelect])

  return (
    <div className="h-full w-full bg-gray-50">
      <EdgeMarkerDefs />
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: '#f59e0b', strokeWidth: 2 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          nodeColor={(node) => {
            const data = node.data as TaskNodeData
            if (data.status === 'completed') return '#22c55e'
            if (data.status === 'in_progress') return '#f59e0b'
            if (data.status === 'locked') return '#9ca3af'
            return '#6b7280'
          }}
        />

        {/* Branch Legend */}
        <Panel position="top-left" className="bg-white/90 backdrop-blur rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="text-xs font-medium text-gray-500 mb-2">Branches</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-xs text-gray-600">Dev</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-xs text-gray-600">Biz</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-xs text-gray-600">Launch</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
