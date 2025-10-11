import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import UserMenu from '@/components/auth/UserMenu'
import MobileMenu from './MobileMenu'
import { SearchButton } from './HeaderClient'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const navigation = [
    { name: '홈', href: '/' },
    { name: '트렌드', href: '/posts?category=trend' },
    { name: '인사이트', href: '/posts?category=insight' },
    { name: '블로그', href: '/posts?category=blog' },
    { name: '성공사례', href: '/posts?category=casestudy' }
  ]

  return (
    <header className="fixed top-0 z-40 w-full bg-white border-b border-medium-gray-border">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl md:text-3xl font-serif font-bold text-medium-black tracking-tight">
                The Founder
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-medium-black-secondary hover:text-medium-black text-body-small font-normal transition-colors duration-medium"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search Icon */}
            <SearchButton />

            {user ? (
              <>
                <Link
                  href="/membership"
                  className="hidden md:inline-flex items-center px-5 py-2 text-sm font-medium text-medium-green hover:text-medium-green-dark transition-colors duration-medium"
                >
                  멤버십
                </Link>
                {/* Admin Dashboard Link - show only for admin users */}
                {user.email === 'admin@thefounder.com' && (
                  <Link
                    href="/admin/scraping"
                    className="hidden md:inline-flex items-center px-5 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors duration-medium"
                  >
                    대시보드
                  </Link>
                )}
                <UserMenu user={{
                  id: user.id,
                  email: user.email!,
                  name: user.user_metadata?.name,
                  avatar_url: user.user_metadata?.avatar_url,
                  membership_status: 'free',
                  created_at: user.created_at,
                  updated_at: user.updated_at || user.created_at,
                }} />
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden md:inline-flex items-center text-sm font-medium text-medium-green hover:text-medium-green-dark transition-colors duration-medium"
                >
                  로그인
                </Link>
                <Link
                  href="/membership"
                  className="hidden md:inline-flex items-center px-5 py-2 text-sm font-medium rounded-full text-white bg-medium-green hover:bg-medium-green-dark transition-all duration-medium"
                >
                  시작하기
                </Link>
              </>
            )}
            
            <MobileMenu navigation={navigation} user={user} />
          </div>
        </div>
      </nav>
    </header>
  )
}