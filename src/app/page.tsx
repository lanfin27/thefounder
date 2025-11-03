'use client'

import { useState } from 'react'
import Link from 'next/link'
import TrendingSection from '@/components/home/TrendingSection'
import HeroSectionCompact from '@/components/home/HeroSectionCompact'
import MainContentFeed from '@/components/home/MainContentFeed'
import SidebarContent from '@/components/home/SidebarContent'

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      {/* Medium Style Header */}
      <header
        className="border-b sticky top-0 z-40"
        style={{
          backgroundColor: 'var(--surface-0)',
          borderColor: 'var(--border-100)'
        }}
      >
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-[65px]">
            {/* Logo */}
            <div className="flex items-center space-x-8">
              <Link href="/">
                <h1
                  className="text-2xl font-bold cursor-pointer"
                  style={{ color: 'var(--ink-900)' }}
                >
                  The Founder
                </h1>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm transition-colors"
                style={{
                  color: !selectedCategory ? 'var(--ink-900)' : 'var(--ink-500)'
                }}
              >
                For you
              </button>
              <button
                onClick={() => setSelectedCategory('trend')}
                className="text-sm transition-colors"
                style={{
                  color: selectedCategory === 'trend' ? 'var(--ink-900)' : 'var(--ink-500)'
                }}
              >
                트렌드
              </button>
              <button
                onClick={() => setSelectedCategory('insight')}
                className="text-sm transition-colors"
                style={{
                  color: selectedCategory === 'insight' ? 'var(--ink-900)' : 'var(--ink-500)'
                }}
              >
                인사이트
              </button>
              <button
                onClick={() => setSelectedCategory('casestudy')}
                className="text-sm transition-colors"
                style={{
                  color: selectedCategory === 'casestudy' ? 'var(--ink-900)' : 'var(--ink-500)'
                }}
              >
                사례
              </button>
              <button
                onClick={() => setSelectedCategory('blog')}
                className="text-sm transition-colors"
                style={{
                  color: selectedCategory === 'blog' ? 'var(--ink-900)' : 'var(--ink-500)'
                }}
              >
                블로그
              </button>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button style={{ color: 'var(--ink-500)' }} className="hover:text-[var(--ink-900)] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button style={{ color: 'var(--ink-500)' }} className="hover:text-[var(--ink-900)] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <Link href="/auth/login">
                <button
                  className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--ink-900)',
                    color: 'white'
                  }}
                >
                  Get started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Trending Section */}
      <TrendingSection />

      {/* Compact Hero */}
      <HeroSectionCompact />

      {/* Main 2-Column Layout */}
      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="flex gap-12">
          {/* Main Feed - Left (65%) */}
          <main className="flex-1 min-w-0">
            <MainContentFeed selectedCategory={selectedCategory} />
          </main>

          {/* Sidebar - Right (35%) */}
          <aside className="w-[368px] sticky top-24 h-fit hidden lg:block flex-shrink-0">
            <SidebarContent />
          </aside>
        </div>
      </div>
    </div>
  )
}
