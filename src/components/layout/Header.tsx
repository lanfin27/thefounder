'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, Settings } from 'lucide-react';
import { useState } from 'react';
import { useSidebar } from './Sidebar';

// TODO: 실제 Supabase Auth로 교체
const TEMP_IS_ADMIN = false;

export default function Header() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);

  const isAdmin = TEMP_IS_ADMIN;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 w-full bg-white/95 backdrop-blur-sm border-b border-divider h-14">
      <div className="h-full max-w-[1400px] mx-auto px-6">
        <div className="flex h-full items-center justify-between">
          {/* Left: 햄버거 + Logo */}
          <div className="flex items-center gap-4">
            {/* 햄버거 버튼 - 모바일에서만 보임 */}
            <button
              onClick={toggle}
              className="lg:hidden p-2 -ml-2 rounded-full text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-ink-900">
                The Founder
              </span>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-full text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Admin Only */}
            {isAdmin && (
              <>
                <Link
                  href="/admin/write"
                  className="hidden md:inline-flex px-4 py-2 bg-green-primary text-white rounded-full text-sm font-medium hover:bg-green-hover transition-colors"
                >
                  Write
                </Link>
                <Link
                  href="/admin"
                  className="hidden md:flex p-2 rounded-full text-ink-700 hover:bg-ink-100 transition-colors"
                  aria-label="Admin"
                >
                  <Settings className="h-5 w-5" />
                </Link>
              </>
            )}

            {/* Sign In */}
            <Link
              href="/auth/signin"
              className="hidden md:inline-flex px-4 py-2 text-sm text-ink-900 hover:bg-ink-100 rounded-full transition-colors"
            >
              Sign In
            </Link>

            {/* Get Started */}
            <Link
              href="/auth/signup"
              className="hidden md:inline-flex px-4 py-2 bg-ink-900 text-white rounded-full text-sm font-medium hover:bg-ink-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
