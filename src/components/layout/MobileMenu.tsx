'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface MobileMenuProps {
  navigation: Array<{ name: string; href: string }>
  user: User | null
}

export default function MobileMenu({ navigation, user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-founder-primary hover:bg-gray-100 focus:outline-none"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsOpen(false)} />
          
          <nav className="fixed top-0 right-0 bottom-0 flex flex-col w-5/6 max-w-sm py-6 px-6 bg-white border-l overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="text-2xl font-bold text-founder-primary" onClick={() => setIsOpen(false)}>
                The Founder
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-md text-gray-700 hover:text-founder-primary hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-founder-primary px-3 py-2 text-base font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-200">
              {user ? (
                <div className="space-y-4">
                  <Link
                    href="/membership"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-founder-primary"
                    onClick={() => setIsOpen(false)}
                  >
                    멤버십
                  </Link>
                  <Link
                    href="/my/posts"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-founder-primary"
                    onClick={() => setIsOpen(false)}
                  >
                    내가 읽은 글
                  </Link>
                  <form action="/api/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-founder-primary"
                    >
                      로그아웃
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="block w-full px-4 py-2 text-center border border-transparent text-base font-medium rounded-md text-white bg-founder-primary hover:bg-opacity-90"
                  onClick={() => setIsOpen(false)}
                >
                  로그인
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}