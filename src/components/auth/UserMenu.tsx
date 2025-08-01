'use client'

import { User } from '@/types'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface UserMenuProps {
  user: User
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full hover:bg-medium-gray transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-medium-green flex items-center justify-center text-white font-medium text-sm">
          {user.name?.[0] || user.email[0].toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-medium-gray-border py-1 z-50">
          <div className="px-4 py-3 border-b border-medium-gray-border">
            <p className="text-body-small font-medium text-medium-black">{user.name || '사용자'}</p>
            <p className="text-caption text-medium-black-tertiary mt-0.5">{user.email}</p>
          </div>

          <Link
            href="/membership"
            className="block px-4 py-2 text-body-small text-medium-black hover:bg-medium-gray transition-colors"
            onClick={() => setIsOpen(false)}
          >
            {user.membership_status === 'premium' ? '프리미엄 멤버십' : '멤버십 가입하기'}
          </Link>

          <Link
            href="/my/posts"
            className="block px-4 py-2 text-body-small text-medium-black hover:bg-medium-gray transition-colors"
            onClick={() => setIsOpen(false)}
          >
            내가 읽은 글
          </Link>

          <Link
            href="/dashboard"
            className="block px-4 py-2 text-body-small text-medium-black hover:bg-medium-gray transition-colors"
            onClick={() => setIsOpen(false)}
          >
            대시보드
          </Link>

          <div className="border-t border-medium-gray-border mt-1">
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 text-body-small text-medium-black-tertiary hover:bg-medium-gray hover:text-medium-black transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  )
}