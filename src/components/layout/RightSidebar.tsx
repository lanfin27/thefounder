'use client';

import Link from 'next/link';
import { TrendingUp, Bookmark, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Topic {
  id: string;
  label: string;
  count: number;
}

interface FounderPick {
  id: string;
  title: string;
  slug: string;
  category: string;
  readingTime: number;
}

// Initial mock data - Will be replaced by API
const INITIAL_FOUNDER_PICKS: FounderPick[] = [
  {
    id: '1',
    title: '위대한 창업가를 만드는 30가지 조건',
    slug: 'founder-qualities',
    category: '인사이트',
    readingTime: 8,
  },
  {
    id: '2',
    title: '코딩은 AI가 한다, 창업자는?',
    slug: 'ai-coding-founder-role',
    category: '트렌드',
    readingTime: 6,
  },
  {
    id: '3',
    title: 'SaaS로 월 $10K MRR 달성하기',
    slug: 'saas-10k-mrr',
    category: '사례',
    readingTime: 10,
  },
];

const INITIAL_TOPICS: Topic[] = [
  { id: 'startup', label: '스타트업', count: 24 },
  { id: 'ai', label: 'AI', count: 31 },
  { id: 'saas', label: 'SaaS', count: 42 },
  { id: 'marketing', label: '마케팅', count: 18 },
  { id: 'product', label: '제품개발', count: 15 },
  { id: 'growth', label: '성장전략', count: 22 },
  { id: 'funding', label: '투자유치', count: 12 },
  { id: 'solo', label: '1인창업', count: 28 },
];

export function RightSidebar() {
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
  const [founderPicks, setFounderPicks] = useState<FounderPick[]>(INITIAL_FOUNDER_PICKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from API
    loadHomepageConfig();
  }, []);

  const loadHomepageConfig = async () => {
    try {
      // Fetch featured topics from API
      const topicsResponse = await fetch('/api/topics?featured=true');
      if (topicsResponse.ok) {
        const topicsData = await topicsResponse.json();
        if (topicsData.topics && topicsData.topics.length > 0) {
          setTopics(topicsData.topics);
        }
      }

      // Fetch founder picks from API
      const picksResponse = await fetch('/api/founder-picks');
      if (picksResponse.ok) {
        const picksData = await picksResponse.json();
        if (picksData.picks && picksData.picks.length > 0) {
          setFounderPicks(picksData.picks);
        }
      }
    } catch (error) {
      console.error('Failed to load homepage config:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="hidden xl:block fixed right-0 top-14 bottom-0 w-[368px] border-l border-divider bg-white overflow-y-auto">
      <div className="py-10 px-8 font-sans">
        {/* Founder Picks */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-green-primary" />
            <h2 className="text-sm font-bold text-ink-900 font-sans">
              Founder Picks
            </h2>
          </div>

          <div className="space-y-5">
            {founderPicks.map((post, index) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="block group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-[28px] font-bold text-ink-200 leading-none mt-1">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-ink-900 group-hover:underline line-clamp-2 leading-snug mb-1">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-ink-600">
                      <span className="px-2 py-0.5 bg-ink-100 rounded">
                        {post.category}
                      </span>
                      <span>{post.readingTime}분</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Link
            href="/posts"
            className="inline-block text-[13px] text-green-primary hover:text-green-hover font-medium mt-4"
          >
            전체 보기 →
          </Link>
        </section>

        {/* Topics (키워드 기반) */}
        <section className="mb-10">
          <h2 className="text-sm font-bold text-ink-900 mb-4 font-sans">
            Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${encodeURIComponent(topic.label)}`}
                className="group inline-flex items-center gap-2 px-3 py-1.5 bg-ink-100 hover:bg-ink-200 rounded-full transition-colors"
              >
                <span className="text-[13px] text-ink-900 font-medium">
                  {topic.label}
                </span>
                <span className="text-[11px] text-ink-600">
                  {topic.count}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/topics"
            className="inline-block text-[13px] text-green-primary hover:text-green-hover font-medium mt-4"
          >
            더 많은 토픽 →
          </Link>
        </section>

        {/* Reading List */}
        <section className="mb-10 p-5 bg-ink-50 rounded-xl">
          <h2 className="text-sm font-bold text-ink-900 mb-3 font-sans">
            Reading List
          </h2>
          <div className="flex items-start gap-3 mb-4">
            <Bookmark className="h-5 w-5 text-ink-600 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-ink-700 leading-relaxed">
              북마크를 클릭하여 글을 저장하고 나중에 읽을 수 있습니다
            </p>
          </div>
          <button className="w-full px-4 py-2 bg-ink-900 text-white rounded-lg text-[13px] font-medium hover:bg-ink-800 transition-colors">
            둘러보기
          </button>
        </section>

        {/* Footer */}
        <footer className="border-t border-divider pt-6">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-ink-600">
            <Link href="/about" className="hover:text-ink-900">About</Link>
            <Link href="/terms" className="hover:text-ink-900">Terms</Link>
            <Link href="/privacy" className="hover:text-ink-900">Privacy</Link>
            <Link href="/contact" className="hover:text-ink-900">Contact</Link>
          </div>
          <p className="text-[12px] text-ink-400 mt-4">
            © 2025 The Founder. All rights reserved.
          </p>
        </footer>
      </div>
    </aside>
  );
}
