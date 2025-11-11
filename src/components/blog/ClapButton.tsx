'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

  const handleClap = async () => {
    if (isClapping) return

    setIsClapping(true)
    console.log('[ClapButton] Clap button clicked, current count:', totalClaps)

    try {
      const response = await fetch(`/api/posts/${postSlug}/clap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      console.log('✅ Clap API Response:', {
        success: data.success,
        oldCount: totalClaps,
        newCount: data.totalClaps,
        isAdmin: data.isAdmin,
        fullResponse: data,
      })

      // 인증 필요 (로그인 필수!) - 바로 리다이렉트
      if (response.status === 401 || data.requiresAuth) {
        console.log('[ClapButton] Unauthorized, redirecting to login')
        router.push('/auth/login')
        return
      }

      // 이미 박수함
      if (data.alreadyClapped) {
        console.log('[ClapButton] User already clapped')
        alert('이미 박수를 보냈습니다! 👏')
        setUserHasClapped(true)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clap')
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
        alert(`박수 완료! 총 ${data.totalClaps}개 (Admin 모드)`)
      } else {
        alert('박수를 보냈습니다! 👏')
      }
    } catch (error: any) {
      console.error('[ClapButton] Failed to clap:', error)
      alert(error.message || '박수를 보내지 못했습니다')
    } finally {
      setIsClapping(false)
    }
  }

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        id={`clap-${postSlug}`}
        onClick={handleClap}
        disabled={isClapping || (!isAdmin && userHasClapped)}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-full
          border border-gray-300
          ${
            userHasClapped && !isAdmin
              ? 'bg-green-50 border-green-500'
              : 'hover:border-gray-500 hover:bg-gray-50'
          }
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          relative
          group
        `}
        aria-label="박수 보내기"
        title={
          !isAdmin && userHasClapped
            ? '이미 박수를 보냈습니다'
            : isAdmin
            ? 'Admin: 무제한 박수 가능'
            : '박수 보내기'
        }
      >
        <span
          className={`transition-transform ${
            !isAdmin && userHasClapped ? '' : 'group-hover:scale-110'
          }`}
        >
          👏
        </span>

        {/* 박수 완료 표시 */}
        {!isAdmin && userHasClapped && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            ✓
          </span>
        )}

        {/* Admin 표시 */}
        {isAdmin && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            A
          </span>
        )}
      </button>

      {showCount && (
        <span className="text-sm text-gray-600 font-medium">
          {totalClaps.toLocaleString()}
        </span>
      )}

      {/* Admin용 박수 목록 버튼 */}
      {isAdmin && clappers.length > 0 && (
        <button
          onClick={() => setShowClappers(!showClappers)}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          {showClappers ? '숨기기' : '목록'}
        </button>
      )}

      {/* Admin용 박수한 사용자 목록 */}
      {isAdmin && showClappers && clappers.length > 0 && (
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
