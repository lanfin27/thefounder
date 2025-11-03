'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle2, TrendingUp, Users, BookOpen } from 'lucide-react'

export default function HeroSectionNew() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsLoading(false)
    setIsSubscribed(true)
    setEmail('')

    // Reset success message after 5 seconds
    setTimeout(() => setIsSubscribed(false), 5000)
  }

  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-gradient-to-br from-[var(--primary-50)] via-[var(--surface-0)] to-[var(--primary-50)]">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-6 leading-tight"
            style={{
              fontSize: 'clamp(32px, 8vw, var(--font-h1))',
              lineHeight: 'var(--line-h1)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--ink-900)'
            }}
          >
            한국 1인 창업가를 위한
            <span className="block mt-2" style={{ color: 'var(--primary-600)' }}>
              깊이 있는 인사이트
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8 leading-relaxed"
            style={{
              fontSize: 'var(--font-body-lg)',
              lineHeight: 'var(--line-body-lg)',
              color: 'var(--ink-700)'
            }}
          >
            실제로 성공한 1인 창업가들의 이야기와 인사이트,
            <br className="hidden md:block" />
            기술 트렌드를 모두 한 곳에서
          </motion.p>

          {/* Newsletter Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-12"
          >
            {!isSubscribed ? (
              <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)]"
                      size={20}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="이메일을 입력하세요"
                      required
                      className="w-full h-12 pl-11 pr-4 rounded-full border-2 border-[var(--border-200)] focus:border-[var(--primary-600)] focus:outline-none transition-colors"
                      style={{
                        fontSize: 'var(--font-body)',
                        backgroundColor: 'var(--surface-0)'
                      }}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="green"
                    size="lg"
                    loading={isLoading}
                    className="sm:w-auto w-full"
                  >
                    구독하기
                  </Button>
                </div>
              </form>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 text-[var(--success)] py-3"
              >
                <CheckCircle2 size={24} />
                <span style={{ fontSize: 'var(--font-body-lg)', fontWeight: 600 }}>
                  구독해 주셔서 감사합니다!
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-8 mb-12"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-[var(--primary-100)]">
                <Users size={20} style={{ color: 'var(--primary-600)' }} />
              </div>
              <div className="text-left">
                <div style={{
                  fontSize: 'var(--font-h3)',
                  fontWeight: 700,
                  color: 'var(--ink-900)',
                  lineHeight: 1
                }}>
                  2,341
                </div>
                <div style={{
                  fontSize: 'var(--font-body-sm)',
                  color: 'var(--ink-500)'
                }}>
                  구독자
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-[var(--primary-100)]">
                <BookOpen size={20} style={{ color: 'var(--primary-600)' }} />
              </div>
              <div className="text-left">
                <div style={{
                  fontSize: 'var(--font-h3)',
                  fontWeight: 700,
                  color: 'var(--ink-900)',
                  lineHeight: 1
                }}>
                  156
                </div>
                <div style={{
                  fontSize: 'var(--font-body-sm)',
                  color: 'var(--ink-500)'
                }}>
                  작가
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-[var(--primary-100)]">
                <TrendingUp size={20} style={{ color: 'var(--primary-600)' }} />
              </div>
              <div className="text-left">
                <div style={{
                  fontSize: 'var(--font-h3)',
                  fontWeight: 700,
                  color: 'var(--ink-900)',
                  lineHeight: 1
                }}>
                  1,024
                </div>
                <div style={{
                  fontSize: 'var(--font-body-sm)',
                  color: 'var(--ink-500)'
                }}>
                  인사이트
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/trend">
              <Button variant="green" size="lg" leftIcon={<span>🔥</span>}>
                트렌드 보기
              </Button>
            </Link>
            <Link href="/insight">
              <Button variant="outline" size="lg" leftIcon={<span>🎬</span>}>
                인사이트 보기
              </Button>
            </Link>
          </motion.div>

          {/* Stay Curious Typography */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 1 }}
            className="mt-16 font-serif italic"
            style={{
              fontSize: 'clamp(28px, 6vw, 48px)',
              color: 'var(--ink-300)',
              letterSpacing: '-0.01em'
            }}
          >
            Stay curious
          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced Decorative Elements */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.7, scale: 1 }}
        transition={{ delay: 0.2, duration: 1 }}
        className="absolute top-20 right-10 w-32 h-32 bg-[var(--primary-200)] rounded-full mix-blend-multiply filter blur-xl animate-blob"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.7, scale: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="absolute bottom-20 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.7, scale: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute top-1/2 left-1/4 w-24 h-24 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      />
    </section>
  )
}
