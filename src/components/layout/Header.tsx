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

          {/* 🔥 오른쪽: Search 바 + 사람 아이콘 (한 줄로) */}
          <div className="flex items-center gap-3 flex-shrink-0">

            {/* 🔥 Search 바 (PC만, 클릭 가능) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Search className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Search</span>
            </button>

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
