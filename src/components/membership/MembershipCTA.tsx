'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Star, Zap, TrendingUp } from 'lucide-react'
import { OAuthButtons } from '@/components/auth/OAuthButtons'

interface MembershipCTAProps {
  variant?: 'default' | 'compact' | 'inline'
  showAuth?: boolean
  redirectTo?: string
}

export default function MembershipCTA({ 
  variant = 'default',
  showAuth = false,
  redirectTo = '/membership'
}: MembershipCTAProps) {
  const [showAuthOptions, setShowAuthOptions] = useState(showAuth)
  const router = useRouter()

  const benefits = [
    { icon: Star, text: '모든 프리미엄 콘텐츠 무제한 열람' },
    { icon: Zap, text: '주간 뉴스레터 독점 구독' },
    { icon: TrendingUp, text: '신규 콘텐츠 우선 알림' },
    { icon: CheckCircle, text: '커뮤니티 액세스' }
  ]

  if (variant === 'inline') {
    return (
      <div className="bg-gradient-to-r from-founder-primary/5 to-founder-secondary/5 rounded-lg p-6 my-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              더 많은 인사이트를 원하시나요?
            </h4>
            <p className="text-sm text-gray-600">
              프리미엄 멤버십으로 모든 콘텐츠를 제한 없이 읽어보세요
            </p>
          </div>
          <button
            onClick={() => router.push(redirectTo)}
            className="px-6 py-2.5 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
          >
            프리미엄 시작하기
          </button>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          The Founder 프리미엄
        </h3>
        <ul className="space-y-3 mb-6">
          {benefits.slice(0, 2).map((benefit, index) => (
            <li key={index} className="flex items-center gap-3">
              <benefit.icon className="w-5 h-5 text-founder-primary flex-shrink-0" />
              <span className="text-sm text-gray-700">{benefit.text}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => router.push(redirectTo)}
          className="w-full px-6 py-3 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
        >
          월 9,900원으로 시작하기
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-founder-primary to-founder-secondary p-8 text-white">
        <h2 className="text-3xl font-bold mb-3">
          The Founder 프리미엄
        </h2>
        <p className="text-lg text-white/90">
          창업가들을 위한 깊이 있는 인사이트와 전략
        </p>
      </div>

      {/* Content */}
      <div className="p-8">
        {!showAuthOptions ? (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                프리미엄 멤버십 혜택
              </h3>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <benefit.icon className="w-6 h-6 text-founder-primary flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setShowAuthOptions(true)}
                className="w-full px-6 py-4 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all duration-200 transform hover:scale-[1.02]"
              >
                프리미엄 시작하기
              </button>
              
              <div className="text-center">
                <p className="text-gray-600">
                  <span className="text-2xl font-bold text-gray-900">월 9,900원</span>
                  <span className="text-sm text-gray-500 ml-2">언제든지 해지 가능</span>
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                계정을 만들고 시작하세요
              </h3>
              <p className="text-gray-600">
                간편하게 로그인하고 프리미엄 멤버십을 시작하세요
              </p>
            </div>

            <OAuthButtons 
              redirectTo="/membership/subscribe"
              className="max-w-sm mx-auto"
            />

            <div className="text-center">
              <button
                onClick={() => setShowAuthOptions(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                돌아가기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
          <span>✓ 7일 무료 체험</span>
          <span>✓ 언제든지 해지</span>
          <span>✓ 100% 환불 보장</span>
        </div>
      </div>
    </div>
  )
}