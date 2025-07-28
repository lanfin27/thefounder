'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ArrowRight, CheckCircle } from 'lucide-react'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { createClient } from '@/lib/supabase/client'

interface PaywallGateProps {
  children: React.ReactNode
  truncatedContent: string
  isUserLoggedIn: boolean
  isPremiumContent: boolean
  postTitle: string
  postId: string
}

export default function PaywallGate({
  children,
  truncatedContent,
  isUserLoggedIn,
  isPremiumContent,
  postTitle,
  postId
}: PaywallGateProps) {
  const [showPaywall, setShowPaywall] = useState(false)
  const [userMembership, setUserMembership] = useState<'free' | 'premium'>('free')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkMembership = async () => {
      if (isUserLoggedIn) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('membership_status')
            .eq('id', user.id)
            .single()
          
          if (profile?.membership_status === 'premium') {
            setUserMembership('premium')
          }
        }
      }
    }

    checkMembership()
  }, [isUserLoggedIn, supabase])

  useEffect(() => {
    if (isPremiumContent && userMembership === 'free') {
      setShowPaywall(true)
    }
  }, [isPremiumContent, userMembership])

  if (!isPremiumContent || userMembership === 'premium') {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Truncated content with gradient overlay */}
      <div className="relative">
        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: truncatedContent }}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
      </div>

      {/* Paywall CTA */}
      <div className="relative -mt-16 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-founder-primary to-founder-secondary p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">
              프리미엄 콘텐츠를 만나보세요
            </h3>
            <p className="text-center text-white/90">
              The Founder의 모든 인사이트를 제한 없이 읽어보세요
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {!isUserLoggedIn ? (
              <div className="space-y-6">
                <p className="text-center text-gray-600 mb-6">
                  로그인하고 프리미엄 멤버십을 시작하세요
                </p>
                
                <OAuthButtons 
                  redirectTo={`/posts/${postId}`}
                  className="max-w-sm mx-auto"
                />
                
                <div className="text-center">
                  <span className="text-sm text-gray-500">
                    이미 계정이 있으신가요?{' '}
                    <button
                      onClick={() => router.push(`/auth/login?next=/posts/${postId}`)}
                      className="text-founder-primary font-medium hover:underline"
                    >
                      이메일로 로그인
                    </button>
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    프리미엄 멤버십 혜택
                  </h4>
                  <ul className="space-y-3">
                    {[
                      '모든 프리미엄 콘텐츠 무제한 열람',
                      '주간 뉴스레터 독점 구독',
                      '신규 콘텐츠 우선 알림',
                      '저자와의 독점 Q&A 세션',
                      '커뮤니티 액세스'
                    ].map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => router.push('/membership')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    프리미엄 시작하기
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      월 9,900원 • 언제든지 해지 가능
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500">
              현재 <span className="font-semibold">{postTitle}</span> 외{' '}
              <span className="font-semibold">127개</span>의 프리미엄 콘텐츠를 읽을 수 있어요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}