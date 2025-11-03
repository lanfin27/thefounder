'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Home, Search, Bookmark, TrendingUp, Video, BookMarked, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Sidebar Context
const SidebarContext = createContext<{
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen(prev => !prev),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

const mainNavigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
];

const categories = [
  { name: '트렌드', href: '/trend', icon: TrendingUp, emoji: '🔥' },
  { name: '인사이트', href: '/insight', icon: Video, emoji: '🎬' },
  { name: '사례', href: '/case', icon: BookMarked, emoji: '📚' },
  { name: '블로그', href: '/blog', icon: PenTool, emoji: '✍️' },
];

export function Sidebar() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-white border-r border-divider z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-divider">
              <Link href="/" onClick={close}>
                <span className="text-2xl font-bold text-ink-900">
                  The Founder
                </span>
              </Link>
              <button
                onClick={close}
                className="p-2 rounded-full hover:bg-ink-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="py-6 px-4 space-y-1">
              {/* 기본 네비게이션 */}
              {mainNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={close}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-green-light text-green-primary font-medium'
                        : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* 구분선 */}
              <div className="border-t border-divider my-4" />

              {/* 카테고리 */}
              <div className="py-2">
                <div className="px-4 mb-3">
                  <h3 className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
                    카테고리
                  </h3>
                </div>

                {categories.map((item) => {
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={close}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-green-light text-green-primary font-medium'
                          : 'text-ink-700 hover:bg-ink-50'
                      }`}
                    >
                      <span className="text-lg">{item.emoji}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* 구분선 */}
              <div className="border-t border-divider my-4" />

              {/* About */}
              <div className="px-4 py-2 space-y-2">
                <Link
                  href="/about"
                  onClick={close}
                  className="block text-sm text-ink-600 hover:text-ink-900 transition-colors"
                >
                  About The Founder
                </Link>
                <Link
                  href="/newsletter"
                  onClick={close}
                  className="block text-sm text-ink-600 hover:text-ink-900 transition-colors"
                >
                  Newsletter
                </Link>
              </div>
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
