import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitHubSignInButton } from '@/components/auth/github-sign-in-button'
import { mockCreateClient } from '../mocks/supabase'

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockCreateClient(),
}))

describe('GitHubSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
    })
  })

  it('renders the button with correct text', () => {
    render(<GitHubSignInButton />)
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument()
  })

  it('renders GitHub icon', () => {
    render(<GitHubSignInButton />)
    const button = screen.getByRole('button')
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('calls signInWithOAuth when clicked', async () => {
    const mockClient = mockCreateClient()
    vi.mocked(mockCreateClient).mockReturnValue(mockClient)

    render(<GitHubSignInButton />)

    const button = screen.getByRole('button')
    await userEvent.click(button)

    expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
      },
    })
  })

  it('shows loading state when clicked', async () => {
    const mockClient = mockCreateClient()
    // Make the OAuth call hang
    mockClient.auth.signInWithOAuth.mockImplementation(() => new Promise(() => {}))
    vi.mocked(mockCreateClient).mockReturnValue(mockClient)

    render(<GitHubSignInButton />)

    const button = screen.getByRole('button')
    await userEvent.click(button)

    expect(screen.getByText('Connecting...')).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('shows error message when OAuth fails', async () => {
    const mockClient = mockCreateClient()
    mockClient.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'OAuth provider error' },
    })
    vi.mocked(mockCreateClient).mockReturnValue(mockClient)

    render(<GitHubSignInButton />)

    const button = screen.getByRole('button')
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('OAuth provider error')).toBeInTheDocument()
    })
  })

  it('re-enables button after error', async () => {
    const mockClient = mockCreateClient()
    mockClient.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'OAuth provider error' },
    })
    vi.mocked(mockCreateClient).mockReturnValue(mockClient)

    render(<GitHubSignInButton />)

    const button = screen.getByRole('button')
    await userEvent.click(button)

    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })
})
