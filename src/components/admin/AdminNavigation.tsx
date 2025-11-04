'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  RefreshCw,
  Youtube,
  Home,
} from 'lucide-react';

interface MenuItem {
  title: string;
  koreanTitle: string;
  description: string;
  icon: any;
  href: string;
}

export function AdminNavigation() {
  const pathname = usePathname();

  // 🚨 중요: 이 배열에 4개의 메뉴 항목이 있어야 합니다
  const menuItems: MenuItem[] = [
    {
      title: "Monitoring Dashboard",
      koreanTitle: "모니터링 대시보드",
      description: "Incremental monitoring (5,642 listings)",
      icon: BarChart3,
      href: "/admin",
    },
    {
      title: "Sync Posts",
      koreanTitle: "포스트 동기화",
      description: "Notion sync",
      icon: RefreshCw,
      href: "/admin/sync",
    },
    {
      title: "YouTube Industry Admin",
      koreanTitle: "YouTube Industry Admin",
      description: "실시간 API 사용량 및 시스템 모니터링",
      icon: Youtube,
      href: "/admin/youtube-industry",
    },
    // 🆕 4번째 메뉴: 메인 페이지 관리 (독립 메뉴)
    {
      title: "Homepage Management",
      koreanTitle: "메인 페이지 관리",
      description: "메인 페이지 포스트 선택 및 순서 관리",
      icon: Home,
      href: "/admin/homepage",
    },
  ];

  return (
    <nav className="px-4 pb-6">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-start gap-3 px-3 py-3 mb-1 rounded-lg transition-all ${
              isActive
                ? 'bg-green-50 text-green-700 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-0.5">
                {item.koreanTitle}
              </div>
              <p className="text-xs text-gray-500 leading-tight">
                {item.description}
              </p>
            </div>
          </Link>
        );
      })}

      {/* About Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <Link href="/about" className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 mb-2">
          About The Founder
        </Link>
        <Link href="/newsletter" className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900">
          Newsletter
        </Link>
      </div>
    </nav>
  );
}
