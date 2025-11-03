'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  TrendingUp,
  Video,
  BookMarked,
  PenTool,
  Search,
  Bookmark
} from 'lucide-react';

const mainNavigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
];

const categories = [
  { name: '트렌드', href: '/trend', icon: TrendingUp, emoji: '🔥' },
  { name: '인사이트', href: '/insight', icon: Video, emoji: '🎬' },
  { name: '사례', href: '/casestudy', icon: BookMarked, emoji: '📚' },
  { name: '블로그', href: '/blog', icon: PenTool, emoji: '✍️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block w-64 border-r border-divider bg-white overflow-y-auto flex-shrink-0">
      <nav className="py-6 px-4 space-y-1">
        {/* 기본 네비게이션 */}
        {mainNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-small transition-colors ${
                isActive
                  ? 'bg-ink-100 text-ink-900 font-medium'
                  : 'text-ink-700 hover:bg-ink-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* 구분선 */}
        <div className="divider-medium my-4" />

        {/* 카테고리 */}
        <div className="py-2">
          <div className="px-4 mb-3">
            <h3 className="text-tiny font-semibold text-ink-900 uppercase tracking-wider">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-small transition-colors ${
                  isActive
                    ? 'bg-ink-100 text-ink-900 font-medium'
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
        <div className="divider-medium my-4" />

        {/* About */}
        <div className="px-4 py-2">
          <Link
            href="/about"
            className="block text-tiny text-ink-600 hover:text-ink-900 mb-2"
          >
            About The Founder
          </Link>
          <Link
            href="/newsletter"
            className="block text-tiny text-ink-600 hover:text-ink-900"
          >
            Newsletter
          </Link>
        </div>
      </nav>
    </aside>
  );
}
