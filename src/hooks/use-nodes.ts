'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Node, Dependency, TaskSize, CompleteNodeResult } from '@/types/database'
import { getDefaultXpForSize } from '@/lib/constants/xp'

export function useNodes(projectId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `nodes-${projectId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('nodes')
        .select(`
          *,
          owner:profiles!owner_id (id, full_name, avatar_url, email)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as Node[]
    }
  )

  const createNode = async (nodeData: {
    title: string
    description?: string
    size: TaskSize
    branch: string
    position_x: number
    position_y: number
    xp_value?: number
  }) => {
    if (!projectId) throw new Error('No project selected')

    const xp_value = nodeData.xp_value ?? getDefaultXpForSize(nodeData.size)

    const { data, error } = await supabase
      .from('nodes')
      .insert({
        ...nodeData,
        project_id: projectId,
        xp_value,
        status: 'unlocked',
      })
      .select(`
        *,
        owner:profiles!owner_id (id, full_name, avatar_url, email)
      `)
      .single()

    if (error) throw error
    mutate()
    return data as Node
  }

  const updateNode = async (nodeId: string, updates: Partial<Node>) => {
    const { error } = await supabase
      .from('nodes')
      .update(updates)
      .eq('id', nodeId)

    if (error) throw error
    mutate()
  }

  const deleteNode = async (nodeId: string) => {
    const { error } = await supabase
      .from('nodes')
      .delete()
      .eq('id', nodeId)

    if (error) throw error
    mutate()
  }

  const claimNode = async (nodeId: string) => {
    const { data, error } = await supabase.rpc('claim_node', {
      p_node_id: nodeId,
    })

    if (error) throw error
    mutate()
    return data
  }

  const unclaimNode = async (nodeId: string) => {
    const { data, error } = await supabase.rpc('unclaim_node', {
      p_node_id: nodeId,
    })

    if (error) throw error
    mutate()
    return data
  }

  const completeNode = async (
    nodeId: string,
    completionNotes?: string
  ): Promise<CompleteNodeResult> => {
    const { data, error } = await supabase.rpc('complete_node', {
      p_node_id: nodeId,
      p_completion_notes: completionNotes || null,
    })

    if (error) throw error
    mutate()
    return data as CompleteNodeResult
  }

  const undoCompleteNode = async (nodeId: string) => {
    const { data, error } = await supabase.rpc('undo_complete_node', {
      p_node_id: nodeId,
    })

    if (error) throw error
    mutate()
    return data
  }

  return {
    nodes: data ?? [],
    isLoading,
    error,
    mutate,
    createNode,
    updateNode,
    deleteNode,
    claimNode,
    unclaimNode,
    completeNode,
    undoCompleteNode,
  }
}

export function useDependencies(projectId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `dependencies-${projectId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('dependencies')
        .select('*')
        .eq('project_id', projectId)

      if (error) throw error
      return data as Dependency[]
    }
  )

  const createDependency = async (fromNodeId: string, toNodeId: string) => {
    if (!projectId) throw new Error('No project selected')

    const { data, error } = await supabase
      .from('dependencies')
      .insert({
        project_id: projectId,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
      })
      .select()
      .single()

    if (error) throw error
    mutate()
    return data as Dependency
  }

  const deleteDependency = async (dependencyId: string) => {
    const { error } = await supabase
      .from('dependencies')
      .delete()
      .eq('id', dependencyId)

    if (error) throw error
    mutate()
  }

  return {
    dependencies: data ?? [],
    isLoading,
    error,
    mutate,
    createDependency,
    deleteDependency,
  }
}
