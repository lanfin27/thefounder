'use client'

import { useState, useEffect } from 'react'
import { Mail, Check, X } from 'lucide-react'
import { updateUserNewsletterPreference } from '@/lib/newsletter/service'

interface NewsletterToggleProps {
  userId: string
  initialSubscribed?: boolean
  onUpdate?: (subscribed: boolean) => void
}

export default function NewsletterToggle({ 
  userId, 
  initialSubscribed = false,
  onUpdate 
}: NewsletterToggleProps) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    setSubscribed(initialSubscribed)
  }, [initialSubscribed])

  const handleToggle = async () => {
    setLoading(true)
    setMessage(null)

    const newValue = !subscribed
    const result = await updateUserNewsletterPreference(userId, newValue)

    if (result.success) {
      setSubscribed(newValue)
      setMessage({
        type: 'success',
        text: newValue ? '뉴스레터 구독이 활성화되었습니다.' : '뉴스레터 구독이 해지되었습니다.'
      })
      onUpdate?.(newValue)
    } else {
      setMessage({
        type: 'error',
        text: '설정 변경에 실패했습니다. 다시 시도해주세요.'
      })
    }

    setLoading(false)
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">주간 뉴스레터</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            매주 화요일, 한국 스타트업 생태계의 핵심 인사이트를 이메일로 받아보세요.
          </p>
          
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${subscribed ? 'bg-founder-primary' : 'bg-gray-200'}
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${subscribed ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {message && (
        <div className={`
          mt-4 flex items-center gap-2 text-sm rounded-lg p-3
          ${message.type === 'success' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
          }
        `}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {subscribed && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">구독 중인 콘텐츠</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-500" />
              주간 스타트업 트렌드 분석
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-500" />
              신규 투자 및 M&A 소식
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-500" />
              창업가 인터뷰 하이라이트
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}