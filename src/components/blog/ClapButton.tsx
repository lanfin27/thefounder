'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatCount } from '@/lib/utils/format'

interface Clapper {
  userId: string
  email: string
  name: string
  clappedAt: string
}

interface ClapButtonProps {
  postSlug: string
  initialClaps: number
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ClapButton({
  postSlug,
  initialClaps,
  showCount = true,
  size = 'md',
}: ClapButtonProps) {
  const router = useRouter()
  const [totalClaps, setTotalClaps] = useState(initialClaps)
  const [userHasClapped, setUserHasClapped] = useState(false)
  const [isClapping, setIsClapping] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showClappers, setShowClappers] = useState(false)
  const [clappers, setClappers] = useState<Clapper[]>([])

  // 초기 데이터 로드
  useEffect(() => {
    fetchClapStatus()
  }, [postSlug])

  const fetchClapStatus = async () => {
    try {
      const response = await fetch(`/api/posts/${postSlug}/clap`)
      const data = await response.json()

      setTotalClaps(data.totalClaps || 0)
      setUserHasClapped(data.userHasClapped || false)
      setIsAdmin(data.isAdmin || false)

      if (data.clappers) {
        setClappers(data.clappers)
      }
    } catch (error) {
      console.error('Failed to fetch clap status:', error)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 박수 추가 함수 (Admin: 무제한, 일반: 토글 일부)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleAddClap = async () => {
    if (isClapping) return

    setIsClapping(true)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[ClapButton] ➕ Adding clap')
    console.log('[ClapButton] 📊 Current state:', {
      isAdmin,
      totalClaps,
      userHasClapped,
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      const response = await fetch(`/api/posts/${postSlug}/clap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      console.log('✅ Clap API Response (POST):', {
        success: data.success,
        oldCount: totalClaps,
        newCount: data.totalClaps,
        userHasClapped: data.userHasClapped,
        fullResponse: data,
      })

      // 인증 필요 (로그인 필수!) - 바로 리다이렉트
      if (response.status === 401 || data.requiresAuth) {
        console.log('[ClapButton] Unauthorized, redirecting to login')
        router.push('/auth/login')
        return
      }

      // POST 요청 시: 이미 박수함 (일반 사용자만 체크)
      if (!isAdmin && data.alreadyClapped) {
        console.log('[ClapButton] User already clapped')
        alert('이미 박수를 보냈습니다! 👏')
        setUserHasClapped(true)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add clap')
      }

      // 성공 - 강제로 상태 업데이트
      setTotalClaps((prev) => {
        console.log(`🔄 Updating claps in UI: ${prev} → ${data.totalClaps}`)
        return data.totalClaps
      })

      setUserHasClapped(true)

      // Admin인 경우 박수자 목록 표시
      if (data.isAdmin && data.clappers) {
        setClappers(data.clappers)
        console.log('👑 Admin: Showing', data.clappers.length, 'clappers')
      }

      // 페이지 전체 새로고침 (Next.js 서버 컴포넌트 데이터 동기화)
      router.refresh()
      console.log('🔄 Router refresh called')

      // 애니메이션
      const button = document.getElementById(`clap-${postSlug}`)
      button?.classList.add('animate-clap')
      setTimeout(() => {
        button?.classList.remove('animate-clap')
      }, 300)

      // 성공 메시지
      if (isAdmin) {
        console.log(`박수 추가 완료! 총 ${data.totalClaps}개`)
      } else {
        alert('박수를 보냈습니다! 👏')
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[ClapButton] ✅ Clap 추가 SUCCESS!')
      console.log('[ClapButton] 📊 New state:', {
        userHasClapped: true,
        totalClaps: data.totalClaps,
      })
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('[ClapButton] ❌ Clap 추가 FAILED:', error)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      alert(error.message || '박수를 추가하지 못했습니다')
    } finally {
      setIsClapping(false)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 박수 취소 함수 (Admin 전용 또는 일반 토글 일부)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleRemoveClap = async () => {
    if (isClapping) return

    setIsClapping(true)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[ClapButton] 🗑️ Removing clap')
    console.log('[ClapButton] 📊 Current state:', {
      isAdmin,
      totalClaps,
      userHasClapped,
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      const response = await fetch(`/api/posts/${postSlug}/clap`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      console.log('✅ Clap API Response (DELETE):', {
        success: data.success,
        oldCount: totalClaps,
        newCount: data.totalClaps,
        userHasClapped: data.userHasClapped,
        fullResponse: data,
      })

      // 인증 필요 (로그인 필수!) - 바로 리다이렉트
      if (response.status === 401 || data.requiresAuth) {
        console.log('[ClapButton] Unauthorized, redirecting to login')
        router.push('/auth/login')
        return
      }

      // DELETE 요청 시: 박수 없음 (이미 취소됨)
      if (data.notClapped) {
        console.log('[ClapButton] Clap not found (already removed)')
        if (!isAdmin) {
          alert('이미 박수가 취소되었습니다')
        }
        setUserHasClapped(false)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove clap')
      }

      // 성공 - 강제로 상태 업데이트
      setTotalClaps((prev) => {
        console.log(`🔄 Updating claps in UI: ${prev} → ${data.totalClaps}`)
        return data.totalClaps
      })

      setUserHasClapped(false)

      // 페이지 전체 새로고침 (Next.js 서버 컴포넌트 데이터 동기화)
      router.refresh()
      console.log('🔄 Router refresh called')

      // 애니메이션
      const button = document.getElementById(`clap-${postSlug}`)
      button?.classList.add('animate-clap')
      setTimeout(() => {
        button?.classList.remove('animate-clap')
      }, 300)

      // 성공 메시지
      if (isAdmin) {
        console.log(`박수 취소 완료! 현재 ${data.totalClaps}개`)
      } else {
        alert(`박수가 취소되었습니다. 현재 ${data.totalClaps}개`)
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[ClapButton] ✅ Clap 취소 SUCCESS!')
      console.log('[ClapButton] 📊 New state:', {
        userHasClapped: false,
        totalClaps: data.totalClaps,
      })
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('[ClapButton] ❌ Clap 취소 FAILED:', error)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      alert(error.message || '박수를 취소하지 못했습니다')
    } finally {
      setIsClapping(false)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 일반 사용자 토글 함수
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleRegularClick = async () => {
    if (userHasClapped) {
      await handleRemoveClap()
    } else {
      await handleAddClap()
    }
  }

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Admin UI: 2개 버튼 (추가 + 취소)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        {/* 박수 카운트 표시 */}
        {showCount && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            👏 {formatCount(totalClaps)}
          </span>
        )}

        {/* 박수 추가 버튼 (Admin 전용) */}
        <button
          onClick={handleAddClap}
          disabled={isClapping}
          className="
            inline-flex items-center gap-1.5 px-3 py-1.5
            text-sm font-medium
            text-green-700 dark:text-green-400
            bg-green-50 dark:bg-green-900/20
            border border-green-200 dark:border-green-800
            rounded-lg
            hover:bg-green-100 dark:hover:bg-green-900/30
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          "
          title="박수 추가 (Admin 전용, 무제한)"
        >
          <span className="text-base">➕</span>
          <span>추가</span>
        </button>

        {/* 박수 취소 버튼 (Admin 전용) */}
        <button
          onClick={handleRemoveClap}
          disabled={isClapping}
          className="
            inline-flex items-center gap-1.5 px-3 py-1.5
            text-sm font-medium
            text-red-700 dark:text-red-400
            bg-red-50 dark:bg-red-900/20
            border border-red-200 dark:border-red-800
            rounded-lg
            hover:bg-red-100 dark:hover:bg-red-900/30
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          "
          title="박수 취소 (Admin 전용, 무제한)"
        >
          <span className="text-base">➖</span>
          <span>취소</span>
        </button>

        {/* Admin 표시 뱃지 */}
        <span className="
          px-2 py-0.5 text-xs font-semibold
          text-purple-700 dark:text-purple-400
          bg-purple-100 dark:bg-purple-900/30
          rounded-full
        ">
          Admin
        </span>

        {/* Admin용 박수 목록 버튼 */}
        {clappers.length > 0 && (
          <button
            onClick={() => setShowClappers(!showClappers)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {showClappers ? '숨기기' : '목록'}
          </button>
        )}

        {/* Admin용 박수한 사용자 목록 */}
        {showClappers && clappers.length > 0 && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 min-w-[320px] max-h-[400px] overflow-y-auto">
            <h4 className="font-bold text-sm mb-3">
              박수한 사용자 ({clappers.length}명)
            </h4>
            <div className="space-y-2">
              {clappers.map((clapper, index) => (
                <div
                  key={clapper.userId + index}
                  className="text-xs border-b pb-2 last:border-0"
                >
                  <div className="font-medium text-gray-900">
                    {clapper.name || clapper.email}
                  </div>
                  <div className="text-gray-600">{clapper.email}</div>
                  <div className="text-gray-400">
                    {new Date(clapper.clappedAt).toLocaleString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 일반 사용자 UI: Medium 스타일!
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <button
      id={`clap-${postSlug}`}
      onClick={handleRegularClick}
      disabled={isClapping}
      className="
        group
        flex items-center gap-2
        px-3 py-2
        rounded-md
        transition-all duration-200
        hover:bg-gray-50
        disabled:opacity-50 disabled:cursor-not-allowed
      "
      aria-label={userHasClapped ? '박수 취소' : '박수 보내기'}
      title={userHasClapped ? '박수 취소하기 (클릭)' : '박수 보내기'}
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 박수 아이콘 - Medium 스타일 (얇은 선) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <svg
        className={`w-6 h-6 transition-colors duration-200 ${
          userHasClapped
            ? 'text-green-600' // 클릭 시: 녹색
            : 'text-gray-500 group-hover:text-gray-700' // 기본: 회색, 호버: 진한 회색
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Thumbs up 아이콘 */}
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 박수 수 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showCount && (
        <span className={`text-sm font-medium transition-colors duration-200 ${
          userHasClapped
            ? 'text-gray-900' // 클릭 시: 진한 회색
            : 'text-gray-600 group-hover:text-gray-900' // 기본: 회색, 호버: 진한 회색
        }`}>
          {formatCount(totalClaps)}
        </span>
      )}
    </button>
  )
}
