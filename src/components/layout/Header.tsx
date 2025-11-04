'use client';

import Link from 'next/link';
import { Search, Menu, User } from 'lucide-react';
import { useSidebar } from '@/components/layout/Sidebar';

export default function Header() {
  const { toggle } = useSidebar();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4">

        {/* 왼쪽: 햄버거 + 로고 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={toggle}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-gray-900" />
          </button>

          <Link href="/" className="flex items-center">
            <span className="text-xl md:text-2xl font-bold text-gray-900">
              The Founder
            </span>
          </Link>
        </div>

        {/* 🔥 오른쪽: Search 아이콘 + 가입 아이콘 (모바일 최적화) */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* 🔥 Search 아이콘 */}
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-gray-700" />
          </button>

          {/* 🔥 Sign In - 데스크톱만 텍스트 */}
          <Link
            href="/auth/login"
            className="hidden lg:block px-3 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
          >
            Sign in
          </Link>

          {/* 🔥 Get Started → 가입 아이콘 */}
          <Link
            href="/auth/signup"
            className="p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            aria-label="Get started"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
