'use client'

import Link from 'next/link'
import { TrendingUp, Bookmark, MoreHorizontal } from 'lucide-react'

// Trending posts data
const trendingPosts = [
  {
    id: '1',
    number: '01',
    title: '2025년 주목해야 할 AI 스타트업 트렌드 10가지',
    author: 'The Founder',
    category: '트렌드',
    readingTime: 4,
  },
  {
    id: '2',
    number: '02',
    title: '토스 이승건 대표가 말하는 Product-Market Fit',
    author: 'The Founder',
    category: '인사이트',
    readingTime: 5,
  },
  {
    id: '3',
    number: '03',
    title: '월 매출 0원에서 1억까지, 6개월의 여정',
    author: 'The Founder',
    category: '사례',
    readingTime: 6,
  },
  {
    id: '4',
    number: '04',
    title: '1인 창업가를 위한 노코드 도구 총정리',
    author: 'The Founder',
    category: '트렌드',
    readingTime: 7,
  },
  {
    id: '5',
    number: '05',
    title: '실패한 스타트업에서 배운 5가지 교훈',
    author: 'The Founder',
    category: '인사이트',
    readingTime: 8,
  },
  {
    id: '6',
    number: '06',
    title: 'SaaS 제품으로 월 $10K MRR 달성하기',
    author: 'The Founder',
    category: '사례',
    readingTime: 9,
  },
]

// Latest stories data
const latestStories = [
  {
    id: '1',
    title: '토스 이승건 대표가 말하는 Product-Market Fit 찾는 법',
    excerpt: '하나의 기능으로 상황을 완전히 조작할 수 있다는 믿음. 제품 성장의 핵심은 무엇인지 토스의 사례를 통해 알아봅니다.',
    author: 'The Founder',
    category: '인사이트',
    publishedAt: 'Oct 27',
    readingTime: 11,
  },
  {
    id: '2',
    title: '당근마켓은 어떻게 지역 커뮤니티를 장악했나',
    excerpt: '하이퍼로컬 비즈니스의 성공 방정식을 당근마켓의 사례를 통해 분석합니다.',
    author: 'The Founder',
    category: '사례',
    publishedAt: 'Oct 26',
    readingTime: 9,
  },
  {
    id: '3',
    title: '개발자 없이 월 $10K MRR 달성한 노코드 SaaS 스토리',
    excerpt: 'Webflow, Airtable, Zapier만으로 글로벌 SaaS를 만든 1인 창업가의 여정',
    author: 'The Founder',
    category: '사례',
    publishedAt: 'Oct 25',
    readingTime: 15,
  },
  {
    id: '4',
    title: 'ChatGPT를 활용한 콘텐츠 자동화 시스템 구축',
    excerpt: 'AI를 활용하여 콘텐츠 제작 시간을 90% 단축한 실전 사례와 구체적인 방법론',
    author: 'The Founder',
    category: '트렌드',
    publishedAt: 'Oct 24',
    readingTime: 12,
  },
  {
    id: '5',
    title: '뉴스레터로 월 $20K 버는 1인 창업가의 비법',
    excerpt: 'Substack과 beehiiv를 활용한 뉴스레터 비즈니스 성장 전략',
    author: 'The Founder',
    category: '사례',
    publishedAt: 'Oct 23',
    readingTime: 10,
  },
]

export default function HomePage() {
  return (
    <div className="py-8">
      {/* Hero - 간소화 */}
      <section className="mb-12">
        <h1 className="text-hero font-serif font-bold text-ink-900 mb-6 leading-tight">
          한국 1인 창업가를 위한
          <br />
          <span className="text-green-primary">깊이 있는 인사이트</span>
        </h1>

        <p className="text-subtitle text-ink-700 mb-8 max-w-2xl leading-relaxed">
          실제 창업가들의 생생한 경험과 성공 사례를 통해 당신의 비즈니스를 한 단계 성장시키세요
        </p>

        <Link
          href="/explore"
          className="inline-flex items-center px-8 py-3 bg-green-primary text-white rounded-full text-base font-medium hover:bg-green-hover transition-colors"
        >
          Start reading
        </Link>
      </section>

      {/* Trending Section - Medium's "Trending on Medium" */}
      <section className="border-b border-divider py-10 -mx-6 px-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-6 w-6" />
          <h2 className="text-caption font-semibold tracking-tight uppercase">
            Trending on The Founder
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {trendingPosts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="group flex gap-4 items-start"
              >
                <span className="text-3xl font-serif font-bold text-ink-200 pt-1">
                  {post.number}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="avatar-medium w-5 h-5 bg-ink-900" />
                    <span className="text-tiny text-ink-900 font-medium">
                      {post.author}
                    </span>
                  </div>

                  <h3 className="text-caption font-bold text-ink-900 mb-2 line-clamp-2 group-hover:underline">
                    {post.title}
                  </h3>

                  <div className="flex items-center gap-2 text-tiny text-ink-600">
                    <span>{post.category}</span>
                    <span>·</span>
                    <span>{post.readingTime} min read</span>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* Latest Stories - Medium Feed Style */}
      <section className="py-12">
          <div className="mb-10">
            <h2 className="text-h3 font-serif font-bold text-ink-900 mb-2">
              Latest
            </h2>
            <p className="text-small text-ink-600">
              최신 인사이트와 성공 사례를 만나보세요
            </p>
          </div>

          <div className="space-y-10">
            {latestStories.map((story, index) => (
              <article
                key={story.id}
                className="flex gap-8 pb-10 border-b border-divider last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="avatar-medium w-6 h-6 bg-ink-300" />
                    <Link
                      href={`/author/${story.author}`}
                      className="text-tiny text-ink-900 hover:underline no-underline"
                    >
                      {story.author}
                    </Link>
                  </div>

                  <Link href={`/post/${story.id}`} className="group">
                    <h2 className="text-h3 font-serif font-bold text-ink-900 mb-2 group-hover:underline">
                      {story.title}
                    </h2>
                    <p className="text-caption text-ink-700 mb-4 line-clamp-2 hidden sm:block">
                      {story.excerpt}
                    </p>
                  </Link>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-tiny text-ink-600">
                      <span className="badge-medium">{story.category}</span>
                      <span>{story.publishedAt}</span>
                      <span>·</span>
                      <span>{story.readingTime} min read</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 -mr-2 rounded-full hover:bg-ink-100 transition-colors"
                        aria-label="Bookmark"
                      >
                        <Bookmark className="h-5 w-5 text-ink-600" />
                      </button>
                      <button
                        className="p-2 -mr-2 rounded-full hover:bg-ink-100 transition-colors"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="h-5 w-5 text-ink-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {index < 2 && (
                  <div className="hidden md:block flex-shrink-0 w-40 h-32 bg-ink-200 rounded" />
                )}
              </article>
            ))}
        </div>

        <div className="mt-10 text-center">
          <button className="px-4 py-2 border border-ink-900 text-ink-900 rounded-full text-small font-medium hover:bg-ink-900 hover:text-white transition-colors">
            Load more stories
          </button>
        </div>
      </section>
    </div>
  )
}
