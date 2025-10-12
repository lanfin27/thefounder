'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle, Star, Zap, TrendingUp } from 'lucide-react'

interface MembershipCTAProps {
  variant?: 'default' | 'compact' | 'inline'
  redirectTo?: string
}

export default function MembershipCTA({
  variant = 'default',
  redirectTo = '/auth/signup'
}: MembershipCTAProps) {
  const router = useRouter()

  const benefits = [
    { icon: Star, text: '모든 콘텐츠 무제한 열람' },
    { icon: Zap, text: '주간 뉴스레터 구독' },
    { icon: TrendingUp, text: '신규 콘텐츠 알림' },
    { icon: CheckCircle, text: '북마크 및 읽기 기록 저장' }
  ]

  if (variant === 'inline') {
    return (
      <div className="bg-medium-gray border border-medium-gray-border rounded-lg p-6 my-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="text-heading-4 font-serif text-medium-black mb-1 text-korean">
              더 많은 인사이트를 원하시나요?
            </h4>
            <p className="text-body-small text-medium-black-secondary text-korean">
              무료 회원가입으로 모든 콘텐츠를 제한 없이 읽어보세요
            </p>
          </div>
          <button
            onClick={() => router.push(redirectTo)}
            className="btn-primary text-body-small"
          >
            무료로 시작하기
          </button>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="bg-white border border-medium-gray-border rounded-lg p-6">
        <h3 className="text-heading-3 font-serif text-medium-black mb-4 text-korean">
          The Founder 회원가입
        </h3>
        <ul className="space-y-3 mb-6">
          {benefits.slice(0, 2).map((benefit, index) => (
            <li key={index} className="flex items-center gap-3">
              <benefit.icon className="w-5 h-5 text-medium-green flex-shrink-0" />
              <span className="text-body-small text-medium-black-secondary text-korean">{benefit.text}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => router.push(redirectTo)}
          className="w-full btn-primary text-body-small"
        >
          무료 가입하기
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-medium-gray-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-8 text-center border-b border-medium-gray-border">
        <h2 className="text-heading-2 font-serif text-medium-black mb-3 text-korean">
          The Founder와 함께하세요
        </h2>
        <p className="text-body-large text-medium-black-secondary text-korean">
          창업가들을 위한 깊이 있는 인사이트와 전략
        </p>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="mb-8">
          <h3 className="text-heading-4 font-serif text-medium-black mb-4 text-korean">
            회원 혜택
          </h3>
          <ul className="space-y-4">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <benefit.icon className="w-6 h-6 text-medium-green flex-shrink-0 mt-0.5" />
                <span className="text-body-small text-medium-black-secondary text-korean">{benefit.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 text-center">
          <div>
            <p className="text-heading-2 font-serif text-medium-green mb-2">
              완전 무료
            </p>
            <p className="text-body-small text-medium-black-tertiary">
              신용카드 없이 바로 시작하세요
            </p>
          </div>

          <button
            onClick={() => router.push(redirectTo)}
            className="btn-primary text-body-small px-8"
          >
            무료로 시작하기
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-medium-gray px-8 py-4 border-t border-medium-gray-border">
        <div className="flex items-center justify-center gap-6 text-caption text-medium-black-tertiary">
          <span>✓ 즉시 시작</span>
          <span>✓ 카드 정보 불필요</span>
          <span>✓ 언제든지 탈퇴</span>
        </div>
      </div>
    </div>
  )
}