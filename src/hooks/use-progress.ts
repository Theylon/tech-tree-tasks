'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { UserProgress, ProjectProgress, UserAchievement, Achievement, EventLog, Profile } from '@/types/database'

export function useUserProgress(projectId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `user-progress-${projectId}` : null,
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return null

      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as UserProgress | null
    }
  )

  return {
    progress: data,
    isLoading,
    error,
    mutate,
  }
}

export function useAllProgress(projectId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `all-progress-${projectId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          user:profiles!user_id (id, full_name, avatar_url, email)
        `)
        .eq('project_id', projectId)
        .order('total_xp', { ascending: false })

      if (error) throw error
      return data as (UserProgress & { user: Profile })[]
    }
  )

  return {
    allProgress: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useProjectProgress(projectId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `project-progress-${projectId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('project_progress')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as ProjectProgress | null
    }
  )

  return {
    projectProgress: data,
    isLoading,
    error,
    mutate,
  }
}

export function useAchievements(projectId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `achievements-${projectId}` : null,
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return []

      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements (*)
        `)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })

      if (error) throw error
      return data as (UserAchievement & { achievement: Achievement })[]
    }
  )

  return {
    achievements: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useActivityFeed(projectId: string | null, limit = 20) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `activity-${projectId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('event_log')
        .select(`
          *,
          user:profiles!user_id (id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as (EventLog & { user: Profile | null })[]
    }
  )

  return {
    events: data ?? [],
    isLoading,
    error,
    mutate,
  }
}
