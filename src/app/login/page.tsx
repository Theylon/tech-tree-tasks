import { GitHubSignInButton } from '@/components/auth/github-sign-in-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">🌳</div>
          <h1 className="text-3xl font-bold text-white">Tech Tree Tasks</h1>
          <p className="mt-2 text-gray-400">
            Turn your tasks into an epic adventure
          </p>
        </div>

        <Card className="border-gray-700 bg-gray-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Welcome, Hero</CardTitle>
            <CardDescription className="text-gray-400">
              Sign in to continue your quest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GitHubSignInButton />

            <p className="mt-4 text-center text-xs text-gray-500">
              By signing in, you agree to embark on an epic journey of productivity
            </p>
          </CardContent>
        </Card>

        {/* Features preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-gray-400">
          <div>
            <div className="mb-1 text-2xl">⚔️</div>
            <div>Earn XP</div>
          </div>
          <div>
            <div className="mb-1 text-2xl">🏆</div>
            <div>Level Up</div>
          </div>
          <div>
            <div className="mb-1 text-2xl">🎖️</div>
            <div>Achievements</div>
          </div>
        </div>
      </div>
    </div>
  )
}
