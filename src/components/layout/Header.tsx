'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Menu, User, X } from 'lucide-react';
import { useSidebar } from '@/components/layout/Sidebar';
import SearchModal from '@/components/search/SearchModal';

export default function Header() {
  const { toggle } = useSidebar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">

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

          {/* 🔥 중앙: Search 바 (PC만) */}
          <div className="hidden lg:flex flex-1 justify-center mx-8">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="relative w-full max-w-md"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                readOnly
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-full text-sm cursor-pointer hover:bg-gray-100 transition-colors"
              />
            </button>
          </div>

          {/* 오른쪽: Search 아이콘 (모바일) + 사람 아이콘 */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* 🔥 Search 아이콘 (모바일만) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="lg:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-700" />
            </button>

            {/* 사람 아이콘 */}
            <Link
              href="/auth/signup"
              className="p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              aria-label="Sign up"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 🔥 Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
