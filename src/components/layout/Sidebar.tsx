'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  User,
  FileText,
  BarChart3,
  Users,
  TrendingUp,
  Video,
  BookMarked,
  PenTool
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Library', href: '/library', icon: BookOpen },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Stories', href: '/stories', icon: FileText },
  { name: 'Stats', href: '/stats', icon: BarChart3 },
];

const categories = [
  { name: '트렌드', href: '/trend', icon: TrendingUp },
  { name: '인사이트', href: '/insight', icon: Video },
  { name: '사례', href: '/casestudy', icon: BookMarked },
  { name: '블로그', href: '/blog', icon: PenTool },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block w-64 border-r border-divider bg-white sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
      <nav className="py-6 px-4 space-y-1">
        {/* 기본 네비게이션 */}
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-small transition-colors ${
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

        {/* Following 섹션 */}
        <div className="py-2">
          <button className="w-full flex items-center justify-between px-4 py-2 text-small text-ink-700 hover:bg-ink-50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <span>Following</span>
            </div>
          </button>

          <div className="mt-2 px-4">
            <p className="text-tiny text-ink-600">
              Find writers and publications to follow.
            </p>
            <Link
              href="/explore/writers"
              className="text-tiny text-green-primary hover:text-green-hover mt-2 inline-block"
            >
              See suggestions
            </Link>
          </div>
        </div>

        {/* 구분선 */}
        <div className="divider-medium my-4" />

        {/* 카테고리 */}
        <div className="py-2">
          <div className="px-4 mb-2">
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
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-small transition-colors ${
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
        </div>
      </nav>
    </aside>
  );
}
