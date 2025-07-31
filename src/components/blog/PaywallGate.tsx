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
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: truncatedContent }}
        />
        
        {/* Gradient overlay */}
        <div className="premium-blur" />
      </div>

      {/* Paywall CTA */}
      <div className="relative -mt-32 px-4">
        <div className="bg-white border border-medium-gray-border rounded-lg overflow-hidden max-w-2xl mx-auto">
          {/* Header */}
          <div className="p-8 text-center border-b border-medium-gray-border">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-medium-green-light rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-medium-green" />
              </div>
            </div>
            <h3 className="text-heading-3 font-serif text-medium-black mb-2 text-korean">
              프리미엄 콘텐츠를 만나보세요
            </h3>
            <p className="text-body-medium text-medium-black-secondary text-korean">
              The Founder의 모든 인사이트를 제한 없이 읽어보세요
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {!isUserLoggedIn ? (
              <div className="space-y-6">
                <p className="text-center text-body-small text-medium-black-secondary mb-6">
                  로그인하고 프리미엄 멤버십을 시작하세요
                </p>
                
                <OAuthButtons 
                  redirectTo={`/posts/${postId}`}
                  className="max-w-sm mx-auto"
                />
                
                <div className="text-center">
                  <span className="text-caption text-medium-black-tertiary">
                    이미 계정이 있으신가요?{' '}
                    <button
                      onClick={() => router.push(`/auth/login?next=/posts/${postId}`)}
                      className="text-medium-green font-medium hover:underline"
                    >
                      이메일로 로그인
                    </button>
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-medium-gray rounded-lg p-6">
                  <h4 className="text-heading-4 font-serif text-medium-black mb-4 text-korean">
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
                        <CheckCircle className="w-5 h-5 text-medium-green flex-shrink-0 mt-0.5" />
                        <span className="text-body-small text-medium-black-secondary text-korean">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4 text-center">
                  <button
                    onClick={() => router.push('/membership')}
                    className="btn-primary text-body-small inline-flex items-center gap-2 px-8"
                  >
                    프리미엄 시작하기
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  
                  <p className="text-caption text-medium-black-tertiary">
                    월 9,900원 • 언제든지 해지 가능
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-medium-gray px-8 py-4 border-t border-medium-gray-border">
            <p className="text-caption text-center text-medium-black-tertiary">
              현재 <span className="font-medium text-medium-black">{postTitle}</span> 외{' '}
              <span className="font-medium text-medium-black">127개</span>의 프리미엄 콘텐츠를 읽을 수 있어요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}