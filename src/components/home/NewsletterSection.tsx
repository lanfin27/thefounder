'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // TODO: Implement newsletter subscription
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    setEmail('')
    
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  return (
    <section className="py-16 md:py-20 bg-medium-gray border-t border-medium-gray-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-medium-green-light mb-6">
            <Mail className="w-6 h-6 text-medium-green" />
          </div>
          
          <h2 className="text-heading-2 font-serif text-medium-black mb-4 text-korean">
            매주 금요일, 인사이트를 받아보세요
          </h2>
          
          <p className="text-body-large text-medium-black-secondary mb-8 text-korean">
            한국 스타트업 생태계의 가장 핫한 소식과 트렌드를
            <br className="hidden md:block" />
            매주 요약해서 전달해 드립니다.
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소를 입력하세요"
              required
              className="input-field flex-1"
            />
            
            <button
              type="submit"
              disabled={isSubmitting || isSubmitted}
              className="btn-primary text-body-small disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitted ? '구독 완료!' : isSubmitting ? '처리 중...' : '구독하기'}
            </button>
          </form>
          
          <p className="text-caption text-medium-black-tertiary mt-4">
            주 1회 발송되며, 언제든 구독을 취소할 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  )
}