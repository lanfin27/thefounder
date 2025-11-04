'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Menu } from 'lucide-react';
import { useSidebar } from '@/components/layout/Sidebar';

export default function Header() {
  const { toggle } = useSidebar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      {/* 🔥 max-w 컨테이너 제거 - Header가 화면 전체 폭 사용 */}
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-6">

              {/* 🚨 왼쪽: 햄버거 + 로고 (완전히 왼쪽 끝) */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={toggle}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors lg:hidden"
                  aria-label="Toggle menu"
                >
                  <Menu className="w-6 h-6 text-gray-900" />
                </button>

                <Link href="/" className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    The Founder
                  </span>
                </Link>
              </div>

              {/* 🚨 중앙: Search (flex-1로 남은 공간 모두 차지) */}
              <div className="hidden md:flex flex-1 justify-center mx-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-full text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* 🚨 오른쪽: Search Icon + Sign in + Get started (완전히 오른쪽 끝) */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Search Icon (모바일) */}
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5 text-gray-700" />
                </button>

                {/* Sign In */}
                <Link
                  href="/auth/login"
                  className="hidden sm:block text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign in
                </Link>

                {/* Get Started */}
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  Get started
                </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="px-6 pb-4 md:hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-300 focus:bg-white"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>
    </>
  );
}
