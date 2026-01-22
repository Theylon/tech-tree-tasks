import { vi } from 'vitest'

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.png',
  },
}

// Mock profile data
export const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.png',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock project data
export const mockProject = {
  id: 'project-123',
  name: 'Test Project',
  description: 'A test project',
  owner_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  project_members: [
    {
      id: 'member-123',
      project_id: 'project-123',
      user_id: 'user-123',
      role: 'owner',
      joined_at: '2024-01-01T00:00:00Z',
      profiles: mockProfile,
    },
  ],
}

// Mock node data
export const mockNode = {
  id: 'node-123',
  project_id: 'project-123',
  title: 'Test Task',
  description: 'A test task',
  owner_id: null,
  status: 'unlocked',
  size: 'M',
  xp_value: 75,
  position_x: 100,
  position_y: 100,
  branch: 'dev',
  completion_notes: null,
  completed_at: null,
  completed_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Create mock Supabase client
export function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://github.com/oauth' }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  }

  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
    order: vi.fn().mockResolvedValue({ data: [mockProject], error: null }),
  })

  return {
    auth: mockAuth,
    from: mockFrom,
    ...overrides,
  }
}

// Mock the createClient function
export const mockCreateClient = vi.fn(() => createMockSupabaseClient())
