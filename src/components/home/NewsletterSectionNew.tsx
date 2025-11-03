'use client'

import { useState } from 'react'

export default function NewsletterSectionNew() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        setMessage('🎉 구독해주셔서 감사합니다!')
        setEmail('')
      } else {
        setMessage('이미 구독중이거나 오류가 발생했습니다.')
      }
    } catch (error) {
      setMessage('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-20 bg-gradient-to-r from-green-600 to-green-700">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            📮 매주 화요일, 1인 창업가를 위한 인사이트
          </h2>
          <p className="text-green-100 text-lg mb-8">
            검증된 창업 노하우와 트렌드를 큐레이션하여 매주 전달합니다.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소를 입력하세요"
              className="flex-1 px-6 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '구독 중...' : '구독하기'}
            </button>
          </form>

          {message && (
            <p className={`mt-4 ${message.includes('감사합니다') ? 'text-white' : 'text-red-100'}`}>
              {message}
            </p>
          )}

          <p className="text-green-100 text-sm mt-6">
            주 1회 발송되며, 언제든 구독을 취소할 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  )
}
