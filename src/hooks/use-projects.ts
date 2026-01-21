'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Project, ProjectMember, Profile } from '@/types/database'

interface ProjectWithMembers extends Project {
  project_members: (ProjectMember & { profiles: Profile })[]
}

export function useProjects() {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR('projects', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members (
          *,
          profiles:user_id (*)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ProjectWithMembers[]
  })

  const createProject = async (name: string, description?: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, description, owner_id: user.id })
      .select()
      .single()

    if (projectError) throw projectError

    // Add owner as member
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({ project_id: project.id, user_id: user.id, role: 'owner' })

    if (memberError) throw memberError

    // Create project progress
    await supabase
      .from('project_progress')
      .insert({ project_id: project.id })

    mutate()
    return project
  }

  return {
    projects: data ?? [],
    isLoading,
    error,
    mutate,
    createProject,
  }
}

export function useProject(projectId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `project-${projectId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_members (
            *,
            profiles:user_id (*)
          )
        `)
        .eq('id', projectId)
        .single()

      if (error) throw error
      return data as ProjectWithMembers
    }
  )

  const updateProject = async (updates: Partial<Project>) => {
    if (!projectId) return

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)

    if (error) throw error
    mutate()
  }

  const inviteMember = async (email: string) => {
    // For MVP: look up user by email and add them
    // In production, you'd send an invite email
    if (!projectId) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) throw new Error('User not found')

    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: profile.id, role: 'member' })

    if (error) throw error
    mutate()
  }

  return {
    project: data,
    isLoading,
    error,
    mutate,
    updateProject,
    inviteMember,
  }
}
