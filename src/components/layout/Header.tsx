'use client';

import Link from 'next/link';
import { Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useSidebar } from './Sidebar';

export default function Header() {
  const { toggle, isOpen } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        {/* 🚨 중요: Container를 넓게 (패딩 최소화) */}
        <div className="w-full max-w-[1400px] mx-auto px-4">
          {/* 🚨 중요: justify-between으로 양끝 배치 강제 */}
          <div className="flex items-center justify-between h-16 gap-4">

            {/* 🚨 왼쪽: 햄버거 + 로고 (flex-shrink-0) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={toggle}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isOpen ? (
                  <X className="w-6 h-6 text-gray-900" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-900" />
                )}
              </button>

              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">
                  The Founder
                </span>
              </Link>
            </div>

            {/* 🚨 중앙: Search (flex-1, 데스크톱만) */}
            <div className="hidden md:flex flex-1 justify-center mx-8">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-full text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* 🚨 오른쪽: Search Icon (모바일) + Sign in + Get started */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Search Icon (모바일) */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </button>

              {/* Sign In */}
              <Link
                href="/auth/login"
                className="hidden sm:block text-sm font-normal text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>

              {/* Get Started */}
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-gray-900 text-white text-sm font-normal rounded-full hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {searchOpen && (
            <div className="pb-4 md:hidden">
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
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={toggle}
          />
          <div className="fixed top-0 left-0 h-full w-64 bg-white z-50 shadow-xl lg:hidden">
            <div className="p-4">
              <button
                onClick={toggle}
                className="mb-4 p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
              {/* Sidebar navigation items */}
            </div>
          </div>
        </>
      )}
    </>
  );
}
