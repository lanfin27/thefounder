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
        className="p-2 hover:bg-medium-gray rounded-full transition-colors duration-medium"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-medium-black" />
        ) : (
          <Menu className="h-5 w-5 text-medium-black" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Slide-out menu */}
          <nav className="fixed top-0 right-0 bottom-0 flex flex-col w-4/5 max-w-xs bg-white shadow-xl animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-medium-gray-border">
              <Link 
                href="/" 
                className="text-xl font-serif font-bold text-medium-black"
                onClick={() => setIsOpen(false)}
              >
                The Founder
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-medium-gray rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-medium-black" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto">
              <div className="py-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-6 py-3 text-medium-black hover:bg-medium-gray text-body-small transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* User Section */}
              <div className="border-t border-medium-gray-border px-6 py-4">
                {user ? (
                  <div className="space-y-1">
                    <Link
                      href="/dashboard"
                      className="block py-3 text-medium-black hover:text-medium-green text-body-small transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      대시보드
                    </Link>
                    <Link
                      href="/valuation"
                      className="block py-3 text-medium-black hover:text-medium-green text-body-small transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      밸류에이션
                    </Link>
                    <Link
                      href="/membership"
                      className="block py-3 text-medium-black hover:text-medium-green text-body-small transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      멤버십
                    </Link>
                    <Link
                      href="/my/posts"
                      className="block py-3 text-medium-black hover:text-medium-green text-body-small transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      내가 읽은 글
                    </Link>
                    <form action="/api/auth/signout" method="POST">
                      <button
                        type="submit"
                        className="block w-full text-left py-3 text-medium-black-secondary hover:text-medium-black text-body-small transition-colors"
                      >
                        로그아웃
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      href="/auth/login"
                      className="block w-full py-3 text-center text-medium-green hover:text-medium-green-dark text-body-small font-medium transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      로그인
                    </Link>
                    <Link
                      href="/membership"
                      className="block w-full py-3 text-center rounded-full text-white bg-medium-green hover:bg-medium-green-dark text-body-small font-medium transition-all"
                      onClick={() => setIsOpen(false)}
                    >
                      시작하기
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}