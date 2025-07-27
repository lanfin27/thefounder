'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'

export default function PremiumGate() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent z-10" />
      
      <div className="relative z-20 flex flex-col items-center justify-center py-16 px-8 bg-white rounded-2xl shadow-lg border border-gray-100 mt-8">
        <div className="w-16 h-16 bg-founder-primary/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-founder-primary" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          프리미엄 콘텐츠입니다
        </h3>
        
        <p className="text-gray-600 text-center mb-8 max-w-md">
          이 글은 The Founder 프리미엄 멤버만 읽을 수 있습니다.
          <br />
          멤버십에 가입하고 모든 콘텐츠를 무제한으로 이용하세요.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/membership"
            className="inline-flex items-center px-6 py-3 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
          >
            프리미엄 시작하기
          </Link>
          
          <Link
            href="/auth/login"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            로그인
          </Link>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            <span className="font-medium">프리미엄 혜택:</span> 모든 콘텐츠 무제한 열람 • 주간 뉴스레터 • 신규 콘텐츠 알림
          </p>
        </div>
      </div>
    </div>
  )
}