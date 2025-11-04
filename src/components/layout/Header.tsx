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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-4">
              {/* Hamburger Menu */}
              <button
                onClick={toggle}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>

              {/* Logo */}
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">
                  The Founder
                </span>
              </Link>
            </div>

            {/* Center: Search (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-full focus:outline-none focus:border-gray-300 focus:bg-white transition-colors text-sm"
                />
              </div>
            </div>

            {/* Right: Search Icon (Mobile) + Sign in + Get started */}
            <div className="flex items-center gap-4">
              {/* Search Icon (Mobile) */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Sign In */}
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>

              {/* Get Started */}
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {searchOpen && (
            <div className="pb-4 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-gray-300 focus:bg-white text-sm"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
