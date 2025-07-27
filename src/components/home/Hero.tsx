'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-founder-dark to-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            한국 스타트업 생태계의
            <span className="text-founder-primary block mt-2">깊이 있는 인사이트</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-300 mb-8 leading-relaxed">
            창업가들의 진솔한 이야기, 투자 트렌드, 기술 혁신을 담아냅니다.
            <br />
            프리미엄 콘텐츠로 더 깊이 있는 정보를 만나보세요.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/membership"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-founder-dark bg-founder-primary hover:bg-opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              프리미엄 멤버십 시작하기
            </Link>
            
            <Link
              href="/blog"
              className="inline-flex items-center px-6 py-3 border border-gray-500 text-base font-medium rounded-lg text-white hover:bg-white hover:text-founder-dark transition-all duration-300"
            >
              블로그 둘러보기
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}