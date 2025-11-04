'use client';

import Link from 'next/link';
import { Search, Menu } from 'lucide-react';
import { useSidebar } from '@/components/layout/Sidebar';

export default function Header() {
  const { toggle } = useSidebar();

  return (
    <header className="bg-white border-b border-gray-200">
      {/* 🔥 max-w 제거! 직접 flex 사용 */}
      <div className="flex items-center justify-between h-16 px-6">

        {/* 🔥 왼쪽: 햄버거 + 로고 + Search (한 줄로!) */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* 햄버거 메뉴 - 항상 표시 */}
          <button
            onClick={toggle}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-gray-900" />
          </button>

          {/* 로고 */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">
              The Founder
            </span>
          </Link>

          {/* 🔥 Search - 로고 바로 옆 (데스크톱만) */}
          <div className="hidden md:flex items-center ml-4">
            <div className="relative w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-full text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 🔥 오른쪽: Search Icon (모바일) + Sign in + Get started */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Search Icon (모바일만) */}
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-gray-700" />
          </button>

          {/* Sign In */}
          <Link
            href="/auth/login"
            className="hidden sm:block text-sm text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap"
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
    </header>
  );
}
