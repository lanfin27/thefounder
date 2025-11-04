'use client';

import Link from 'next/link';
import { TrendingUp, Bookmark, Sparkles } from 'lucide-react';

// Mock data
const founderPicks = [
  {
    id: '1',
    title: '위대한 창업가를 만드는 30가지 조건',
    category: '인사이트',
    readingTime: 8,
  },
  {
    id: '2',
    title: '코딩은 AI가 한다, 창업자는?',
    category: '트렌드',
    readingTime: 6,
  },
  {
    id: '3',
    title: 'SaaS로 월 $10K MRR 달성하기',
    category: '사례',
    readingTime: 10,
  },
];

const topics = [
  { name: '🔥 트렌드', href: '/trend', count: 24 },
  { name: '🎬 인사이트', href: '/insight', count: 31 },
  { name: '📚 사례', href: '/case', count: 42 },
  { name: '✍️ 블로그', href: '/blog', count: 18 },
];

export function RightSidebar() {
  return (
    <aside className="hidden xl:block fixed right-0 top-14 bottom-0 w-[368px] border-l border-divider bg-white overflow-y-auto">
      <div className="py-8 px-6 space-y-8">
        {/* Founder Picks */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-green-primary" />
            <h3 className="text-base font-bold text-ink-900">
              Founder Picks
            </h3>
          </div>
          <div className="space-y-4">
            {founderPicks.map((pick) => (
              <Link
                key={pick.id}
                href={`/post/${pick.id}`}
                className="block group"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink-900 leading-snug group-hover:text-green-primary transition-colors line-clamp-2">
                    {pick.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-ink-600">
                    <span className="badge-small">{pick.category}</span>
                    <span>·</span>
                    <span>{pick.readingTime}분 읽기</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/featured"
            className="inline-flex items-center gap-1 mt-4 text-sm text-green-primary hover:text-green-hover font-medium transition-colors"
          >
            전체 보기
            <span className="text-lg">→</span>
          </Link>
        </section>

        {/* Divider */}
        <div className="border-t border-divider" />

        {/* Topics */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-primary" />
            <h3 className="text-base font-bold text-ink-900">
              Topics
            </h3>
          </div>
          <div className="space-y-2">
            {topics.map((topic) => (
              <Link
                key={topic.name}
                href={topic.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-ink-50 transition-colors group"
              >
                <span className="text-sm text-ink-700 group-hover:text-ink-900">
                  {topic.name}
                </span>
                <span className="text-xs text-ink-500">
                  {topic.count}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-divider" />

        {/* Reading List */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bookmark className="h-5 w-5 text-green-primary" />
            <h3 className="text-base font-bold text-ink-900">
              Reading List
            </h3>
          </div>
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ink-50 mb-3">
              <Bookmark className="h-6 w-6 text-ink-400" />
            </div>
            <p className="text-sm text-ink-600 mb-4">
              북마크한 글이 없습니다
            </p>
            <Link
              href="/bookmarks"
              className="inline-flex px-4 py-2 bg-ink-900 text-white rounded-full text-sm font-medium hover:bg-ink-800 transition-colors"
            >
              둘러보기
            </Link>
          </div>
        </section>

        {/* Footer Links */}
        <div className="pt-4 border-t border-divider">
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-ink-500">
            <Link href="/about" className="hover:text-ink-900 transition-colors">
              About
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-ink-900 transition-colors">
              Terms
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-ink-900 transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/contact" className="hover:text-ink-900 transition-colors">
              Contact
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            © 2024 The Founder. All rights reserved.
          </p>
        </div>
      </div>
    </aside>
  );
}
