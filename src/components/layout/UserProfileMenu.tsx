'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown
} from 'lucide-react'

export default function UserProfileMenu() {
  const { user, loading, signOut } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 로그아웃 처리
  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  // 로딩 중이거나 로그인하지 않은 경우
  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/auth/login"
          className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
        >
          로그인
        </Link>
        <Link
          href="/auth/signup"
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-full hover:bg-green-700 transition-colors"
        >
          시작하기
        </Link>
      </div>
    )
  }

  // 사용자 정보 추출
  const userMetadata = user.user_metadata
  const userName = userMetadata?.name || userMetadata?.full_name || user.email?.split('@')[0] || '사용자'
  const userEmail = user.email || ''
  const userAvatar = userMetadata?.avatar_url || userMetadata?.picture || null

  return (
    <div className="relative" ref={menuRef}>
      {/* 프로필 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="사용자 메뉴"
      >
        {/* 프로필 이미지 */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden border-2 border-gray-200">
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* 화살표 아이콘 */}
        <ChevronDown
          className={`w-4 h-4 text-gray-600 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn">
          {/* 사용자 정보 헤더 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {userName}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {userEmail}
            </p>
          </div>

          {/* 메뉴 항목들 */}
          <div className="py-1">
            {/* 프로필 보기 */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User className="w-5 h-5 text-gray-500" />
              <span>프로필 보기</span>
            </Link>

            {/* 설정 */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-500" />
              <span>설정</span>
            </Link>

            {/* 도움말 */}
            <Link
              href="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-gray-500" />
              <span>도움말</span>
            </Link>
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-100 my-1" />

          {/* 로그아웃 */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-500" />
            <span>로그아웃</span>
          </button>
        </div>
      )}
    </div>
  )
}
