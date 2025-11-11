'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function HeroSectionCompact() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
    setIsSubscribed(true)
    setEmail('')

    setTimeout(() => setIsSubscribed(false), 4000)
  }

  return (
    <section className="bg-[var(--surface-0)] border-b border-[var(--border-100)] py-12">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
          style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 700,
            color: 'var(--ink-900)',
            lineHeight: 1.2
          }}
        >
          한국 1인 창업가를 위한{' '}
          <span style={{ color: 'var(--primary-600)' }}>깊이 있는 인사이트</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8"
          style={{
            fontSize: 'var(--font-body-lg)',
            color: 'var(--ink-600)',
            lineHeight: 1.6
          }}
        >
          실제로 성공한 창업가들의 인터뷰와 트렌드 분석을 매주 받아보세요
        </motion.p>

        {!isSubscribed ? (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            onSubmit={handleSubmit}
            className="max-w-md mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  size={18}
                  style={{ color: 'var(--ink-400)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  required
                  className="w-full h-12 pl-10 pr-4 rounded-full border-2 border-[var(--border-200)] focus:border-[var(--primary-600)] focus:outline-none transition-colors"
                  style={{
                    fontSize: 'var(--font-body)',
                    backgroundColor: 'var(--surface-0)',
                    color: 'var(--ink-900)'
                  }}
                />
              </div>
              <Button
                type="submit"
                variant="green"
                size="lg"
                loading={isLoading}
                className="sm:w-auto w-full whitespace-nowrap"
              >
                무료 구독
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 py-3"
            style={{ color: 'var(--success)' }}
          >
            <CheckCircle2 size={20} />
            <span style={{ fontSize: 'var(--font-body)', fontWeight: 600 }}>
              구독해주셔서 감사합니다!
            </span>
          </motion.div>
        )}
      </div>
    </section>
  )
}
