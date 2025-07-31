'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative bg-white pt-20 md:pt-24 pb-16 md:pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="text-heading-1 font-serif text-medium-black mb-6 text-korean">
            한국 스타트업 생태계의
            <span className="block text-medium-green mt-2">깊이 있는 인사이트</span>
          </h1>
          
          <p className="text-body-large text-medium-black-secondary mb-10 leading-relaxed text-korean">
            창업가들의 진솔한 이야기와 성장 전략을 만나보세요.
            <br className="hidden md:block" />
            매주 금요일, 가장 중요한 소식을 전해드립니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/membership"
              className="btn-primary text-body-small"
            >
              프리미엄 시작하기
            </Link>
            
            <button
              onClick={() => {
                document.getElementById('industry-charts')?.scrollIntoView({ 
                  behavior: 'smooth' 
                })
              }}
              className="btn-secondary text-body-small flex items-center gap-2"
            >
              📊 실시간 차트 보기
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}