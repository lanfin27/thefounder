'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, Edit3 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'For you', href: '/' },
  { name: '트렌드', href: '/trend' },
  { name: '인사이트', href: '/insight' },
  { name: '사례', href: '/casestudy' },
  { name: '블로그', href: '/blog' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-border-light">
      <div className="container-site">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-h3 font-serif font-bold text-ink-900">
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
                    className={`text-small transition-colors relative ${
                      isActive
                        ? 'text-ink-900 font-medium'
                        : 'text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-[14px] left-0 right-0 h-[1px] bg-ink-900"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="hidden sm:flex p-2 rounded-full text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Write Button */}
            <Link
              href="/write"
              className="hidden md:flex items-center gap-2 px-4 py-2 text-small text-ink-700 hover:text-ink-900 transition-colors"
            >
              <Edit3 className="h-4 w-4" />
              <span>Write</span>
            </Link>

            {/* Sign In */}
            <Link
              href="/auth/signin"
              className="hidden md:inline-flex px-4 py-2 text-small text-ink-900 hover:bg-ink-100 rounded-full transition-colors"
            >
              Sign In
            </Link>

            {/* Get Started */}
            <Link
              href="/auth/signup"
              className="hidden md:inline-flex btn-medium-primary"
            >
              Get started
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border-light bg-white"
          >
            <nav className="container-site py-4 flex flex-col gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-3 rounded-lg text-small transition-colors ${
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

              <div className="mt-4 pt-4 border-t border-divider flex flex-col gap-2">
                <Link
                  href="/write"
                  className="px-4 py-3 rounded-lg text-small text-ink-700 hover:bg-ink-50 flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Write</span>
                </Link>
                <Link
                  href="/auth/signin"
                  className="px-4 py-3 rounded-lg text-small text-ink-700 hover:bg-ink-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn-medium-primary text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get started
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}