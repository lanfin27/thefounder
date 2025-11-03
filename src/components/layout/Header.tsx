'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, Settings } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'For you', href: '/' },
  { name: 'Following', href: '/following' },
];

// TODO: 실제 Supabase Auth로 교체
const TEMP_IS_ADMIN = false;

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // TODO: 실제 로그인 상태 체크
  const isLoggedIn = false;
  const isAdmin = TEMP_IS_ADMIN;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-border-light h-14">
      <div className="h-full max-w-none mx-auto px-6">
        <div className="flex h-full items-center justify-between">
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-8">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 rounded-full text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-xl font-serif font-bold text-ink-900">
                The Founder
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`text-small transition-colors relative h-14 flex items-center ${
                      isActive
                        ? 'text-ink-900 font-medium'
                        : 'text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-[1px] bg-ink-900"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
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

            {/* Admin Only: Write + Settings */}
            {isAdmin && (
              <>
                <Link
                  href="/admin/write"
                  className="hidden md:inline-flex px-4 py-2 bg-green-primary text-white rounded-full text-small font-medium hover:bg-green-hover transition-colors"
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

            {/* Sign In / User Menu */}
            {!isLoggedIn ? (
              <>
                <Link
                  href="/auth/signin"
                  className="hidden md:inline-flex px-4 py-2 text-small text-ink-900 hover:bg-ink-100 rounded-full transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="hidden md:inline-flex px-4 py-2 bg-ink-900 text-white rounded-full text-small font-medium hover:bg-ink-800 transition-colors"
                >
                  Get started
                </Link>
              </>
            ) : (
              <button className="w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center text-small font-medium">
                U
              </button>
            )}
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border-light"
            >
              <div className="py-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search The Founder"
                    className="w-full pl-10 pr-4 py-2 bg-ink-50 border border-border-light rounded-full text-small focus:outline-none focus:border-ink-900 transition-colors"
                    autoFocus
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden absolute top-14 left-0 right-0 bg-white border-b border-divider shadow-lg"
          >
            <nav className="px-6 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-4 py-3 rounded-lg text-small transition-colors ${
                      isActive
                        ? 'bg-ink-100 text-ink-900 font-medium'
                        : 'text-ink-700 hover:bg-ink-50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                );
              })}

              {isAdmin && (
                <>
                  <div className="divider-medium my-2" />
                  <Link
                    href="/admin/write"
                    className="block px-4 py-3 rounded-lg text-small text-ink-700 hover:bg-ink-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Write
                  </Link>
                  <Link
                    href="/admin"
                    className="block px-4 py-3 rounded-lg text-small text-ink-700 hover:bg-ink-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                </>
              )}

              <div className="divider-medium my-2" />

              {!isLoggedIn && (
                <>
                  <Link
                    href="/auth/signin"
                    className="block px-4 py-3 rounded-lg text-small text-ink-700 hover:bg-ink-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block px-4 py-3 bg-ink-900 text-white rounded-lg text-small font-medium text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get started
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
