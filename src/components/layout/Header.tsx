'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navigation = [
  { name: '트렌드', href: '/trend' },
  { name: '인사이트', href: '/insight' },
  { name: '사례', href: '/casestudy' },
  { name: '블로그', href: '/blog' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-surface-0 border-b border-border-100">
      <nav className="container mx-auto px-4 max-w-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <h1 className="text-h3 font-bold text-ink-900">
                The Founder
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-body-sm text-ink-500 hover:text-ink-900 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <button
              className="text-ink-500 hover:text-ink-900 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <Link href="/auth/login" className="hidden md:inline-flex">
              <button className="text-body-sm text-ink-500 hover:text-ink-900 transition-colors">
                로그인
              </button>
            </Link>

            <Link href="/membership" className="hidden md:inline-flex">
              <button className="px-4 py-2 text-body-sm font-medium bg-ink-900 text-white rounded-full hover:bg-ink-700 transition-colors">
                시작하기
              </button>
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-ink-500 hover:text-ink-900 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border-100 bg-surface-0"
          >
            <div className="container mx-auto px-4 py-6 space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block text-body text-ink-700 hover:text-ink-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-border-100 space-y-3">
                <Link
                  href="/auth/login"
                  className="block text-body text-ink-700 hover:text-ink-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  로그인
                </Link>
                <Link
                  href="/membership"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <button className="w-full px-4 py-2 text-body-sm font-medium bg-ink-900 text-white rounded-full hover:bg-ink-700 transition-colors">
                    시작하기
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}