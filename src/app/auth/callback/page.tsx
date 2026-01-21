'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // Get the code from URL
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const errorParam = params.get('error')
      const errorDescription = params.get('error_description')

      if (errorParam) {
        setError(errorDescription || errorParam)
        return
      }

      if (!code) {
        setError('No authorization code received')
        return
      }

      // Exchange the code for a session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Exchange error:', exchangeError)
        setError(exchangeError.message)
        return
      }

      // Success - redirect to projects
      router.replace('/projects')
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Authentication Error</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <a href="/login" className="text-amber-500 hover:underline">
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="text-4xl mb-4">🌳</div>
        <div className="text-white text-xl mb-2">Completing sign in...</div>
        <div className="text-gray-400">Please wait</div>
      </div>
    </div>
  )
}
