import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to projects
  if (user) {
    redirect('/projects')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center">
          <div className="text-8xl mb-6">🌳</div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Tech Tree Tasks
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Turn your project into an epic adventure. Track tasks as a tech tree,
            earn XP, level up, and unlock achievements with your team.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
          >
            Start Your Quest
            <span className="text-xl">⚔️</span>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="text-4xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Gamified Progress
            </h3>
            <p className="text-gray-400">
              Earn XP for completing tasks, level up your character, and unlock
              achievements. Make productivity feel like a game.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="text-4xl mb-4">🌳</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Tech Tree Visualization
            </h3>
            <p className="text-gray-400">
              See your project as an interactive skill tree. Visualize dependencies,
              track progress, and understand what unlocks next.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Team Collaboration
            </h3>
            <p className="text-gray-400">
              Work together with your team. Claim tasks, see who&apos;s working on what,
              and compete on the leaderboard.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold text-white mb-2">Create Project</h4>
              <p className="text-sm text-gray-400">
                Set up your project with branches for different work areas
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold text-white mb-2">Add Tasks</h4>
              <p className="text-sm text-gray-400">
                Create tasks and connect them with dependencies
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold text-white mb-2">Claim & Complete</h4>
              <p className="text-sm text-gray-400">
                Claim tasks and mark them done to earn XP
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold text-white mb-2">Level Up!</h4>
              <p className="text-sm text-gray-400">
                Watch your progress, unlock achievements, and level up
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <p className="text-gray-400 mb-4">Ready to make productivity epic?</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          Built with Next.js, Supabase, and React Flow
        </div>
      </footer>
    </div>
  )
}
