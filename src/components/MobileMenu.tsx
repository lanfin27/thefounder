'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-[65px] left-0 right-0 bg-white border-b shadow-lg">
          <nav className="flex flex-col p-4 space-y-4">
            <Link href="/trend" className="text-lg" onClick={() => setIsOpen(false)}>
              🔥 트렌드
            </Link>
            <Link href="/insight" className="text-lg" onClick={() => setIsOpen(false)}>
              🎬 인사이트
            </Link>
            <Link href="/casestudy" className="text-lg" onClick={() => setIsOpen(false)}>
              📚 사례
            </Link>
            <Link href="/blog" className="text-lg" onClick={() => setIsOpen(false)}>
              ✍️ 블로그
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}
