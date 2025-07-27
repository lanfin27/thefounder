import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import UserMenu from '@/components/auth/UserMenu'
import MobileMenu from './MobileMenu'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const navigation = [
    { name: '홈', href: '/' },
    { name: '뉴스레터', href: '/posts?category=뉴스레터' },
    { name: 'SaaS', href: '/posts?category=SaaS' },
    { name: '블로그', href: '/posts?category=블로그' },
    { name: '창업', href: '/posts?category=창업' },
  ]

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-founder-primary">The Founder</span>
            </Link>
            
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-gray-700 hover:text-founder-primary px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/(protected)/dashboard"
                  className="hidden md:inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-founder-primary transition-colors"
                >
                  대시보드
                </Link>
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
              <Link
                href="/auth/login"
                className="hidden md:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-founder-primary hover:bg-opacity-90 transition-colors"
              >
                로그인
              </Link>
            )}
            
            <MobileMenu navigation={navigation} user={user} />
          </div>
        </div>
      </nav>
    </header>
  )
}