import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">
              The Founder
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/posts"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              콘텐츠
            </Link>
            <Link
              href="/posts?category=뉴스레터"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              뉴스레터
            </Link>
            <Link
              href="/posts?category=SaaS"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              SaaS
            </Link>
            <Link
              href="/about"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              About
            </Link>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/my/posts"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  내 글
                </Link>
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  시작하기
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function UserMenu({ user }: { user: any }) {
  return (
    <div className="relative">
      <button className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
        {user.email?.[0]?.toUpperCase() || 'U'}
      </button>
    </div>
  )
}