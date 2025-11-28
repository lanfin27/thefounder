'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Home, Bookmark, TrendingUp, Lightbulb, BarChart3, PenTool, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';

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
  const [isOpen, setIsOpen] = useState(true); // 🔥 기본값: 열림
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  { name: '내 보관함', href: '/library', icon: Bookmark },
];

const categories = [
  { name: '트렌드', href: '/category/trends', icon: TrendingUp },
  { name: '인사이트', href: '/category/insights', icon: Lightbulb },
  { name: '사례', href: '/category/cases', icon: BarChart3 },
  { name: '블로그', href: '/category/blog', icon: PenTool },
];

// Sidebar 내부 콘텐츠 컴포넌트
function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { profile, isLoading: loading } = useUser();
  const [showAdmin, setShowAdmin] = useState(false);

  // Load cached admin status on mount
  useEffect(() => {
    const cached = localStorage.getItem('user_is_admin');
    if (cached === 'true') {
      setShowAdmin(true);
    }
  }, []);

  // Update cache when profile loads
  useEffect(() => {
    if (!loading && profile) {
      const isAdmin = profile.role === 'admin';
      setShowAdmin(isAdmin);
      localStorage.setItem('user_is_admin', isAdmin.toString());
    } else if (!loading && !profile) {
      // Clear cache if no profile (logged out)
      setShowAdmin(false);
      localStorage.setItem('user_is_admin', 'false');
    }
  }, [loading, profile]);

  return (
    <>
      {/* Header - 모바일에서만 보임 */}
      <div className="flex items-center justify-between p-6 border-b border-divider lg:hidden">
        <Link href="/" onClick={onLinkClick}>
          <span className="text-2xl font-bold text-ink-900">
            The Founder
          </span>
        </Link>
        <button
          onClick={onLinkClick}
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
              onClick={onLinkClick}
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

        {/* Admin Menu - Shows based on cached/loaded admin status */}
        {showAdmin && (
          <Link
            href="/admin"
            onClick={onLinkClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
              pathname.startsWith('/admin')
                ? 'bg-purple-50 text-purple-700 font-medium'
                : 'text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span>Admin</span>
          </Link>
        )}

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
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onLinkClick}
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
        </div>

        {/* 구분선 */}
        <div className="border-t border-divider my-4" />

        {/* About */}
        <div className="px-4 py-2 space-y-2">
          <Link
            href="/about"
            onClick={onLinkClick}
            className="block text-sm text-ink-600 hover:text-ink-900 transition-colors"
          >
            About The Founder
          </Link>
          <Link
            href="/newsletter"
            onClick={onLinkClick}
            className="block text-sm text-ink-600 hover:text-ink-900 transition-colors"
          >
            Newsletter
          </Link>
        </div>
      </nav>
    </>
  );
}

export function Sidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Mobile Backdrop - lg 미만에서만 보임 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - lg 이상에서 토글 가능 */}
      {isOpen && (
        <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-64 bg-white border-r border-divider z-30 overflow-y-auto">
          <SidebarContent />
        </aside>
      )}

      {/* Mobile Sidebar - lg 미만에서 슬라이드 */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-80 bg-white border-r border-divider z-50 overflow-y-auto"
          >
            <SidebarContent onLinkClick={close} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
