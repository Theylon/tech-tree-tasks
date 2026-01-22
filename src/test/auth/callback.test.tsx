import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AuthCallbackPage from '@/app/auth/callback/page'
import { mockCreateClient, mockUser } from '../mocks/supabase'

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockCreateClient(),
}))

// Mock window.location
const mockReplace = vi.fn()
Object.defineProperty(window, 'location', {
  value: {
    search: '',
    href: 'http://localhost:3000/auth/callback',
  },
  writable: true,
})

// Mock next/navigation
const mockRouterReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}))

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.search = ''
  })

  it('shows error when no code in URL', async () => {
    // With no code, the callback immediately shows error
    window.location.search = ''
    render(<AuthCallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('No authorization code received')).toBeInTheDocument()
    })
  })

  it('shows error when no code is provided', async () => {
    window.location.search = ''

    render(<AuthCallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Authentication Error')).toBeInTheDocument()
      expect(screen.getByText('No authorization code received')).toBeInTheDocument()
    })
  })

  it('shows error when error param is present', async () => {
    window.location.search = '?error=access_denied&error_description=User%20denied%20access'

    render(<AuthCallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Authentication Error')).toBeInTheDocument()
      expect(screen.getByText('User denied access')).toBeInTheDocument()
    })
  })

  it('exchanges code for session and redirects on success', async () => {
    window.location.search = '?code=test-auth-code'

    const mockClient = mockCreateClient()
    mockClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    })

    vi.mocked(mockCreateClient).mockReturnValue(mockClient)

    render(<AuthCallbackPage />)

    await waitFor(() => {
      expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('test-auth-code')
      expect(mockRouterReplace).toHaveBeenCalledWith('/projects')
    })
  })

  it('shows error when code exchange fails', async () => {
    window.location.search = '?code=invalid-code'

    const mockClient = mockCreateClient()
    mockClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid code' },
    })

    vi.mocked(mockCreateClient).mockReturnValue(mockClient)

    render(<AuthCallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Authentication Error')).toBeInTheDocument()
      expect(screen.getByText('Invalid code')).toBeInTheDocument()
    })
  })

  it('shows back to login link on error', async () => {
    window.location.search = '?error=test_error'

    render(<AuthCallbackPage />)

    await waitFor(() => {
      const link = screen.getByText('Back to Login')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/login')
    })
  })
})
