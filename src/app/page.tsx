import { Suspense } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedPosts } from '@/lib/notion/client'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'The Founder - 스타트업 인사이트 플랫폼',
  description: '스타트업 창업자들을 위한 인사이트와 경험을 공유합니다.',
  keywords: ['창업', '스타트업', '비즈니스', '인사이트', '리더십', '성장'],
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              스타트업 여정의 모든 순간을 함께
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              창업자들이 직접 전하는 진솔한 이야기와 실전 인사이트를 만나보세요.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <Link
                href="/posts"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                콘텐츠 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Trending on The Founder
          </h2>
          <Suspense fallback={<TrendingSkeletons />}>
            <TrendingPosts />
          </Suspense>
        </div>
      </section>

      {/* Recommended Content */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Recommended for you
          </h2>
          <Suspense fallback={<ContentSkeletons />}>
            <RecommendedPosts />
          </Suspense>
        </div>
      </section>

      {/* Topics Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Topics to follow
          </h2>
          <div className="flex flex-wrap gap-3">
            {['스타트업', 'SaaS', '마케팅', '성장', '리더십', 'AI', '투자', '테크'].map((topic) => (
              <Link
                key={topic}
                href={`/posts?category=${topic}`}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {topic}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            매주 최신 인사이트를 받아보세요
          </h2>
          <p className="text-gray-600 mb-6">
            스타트업 생태계의 최신 트렌드와 인사이트를 이메일로 전달해드립니다.
          </p>
          <form className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              placeholder="이메일 주소를 입력하세요"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              구독하기
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

async function TrendingPosts() {
  const posts = await getPublishedPosts()
  const trendingPosts = posts.slice(0, 3)

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {trendingPosts.map((post) => (
        <TrendingCard key={post.id} post={post} />
      ))}
    </div>
  )
}

async function RecommendedPosts() {
  const posts = await getPublishedPosts()
  const recommendedPosts = posts.slice(3, 9)

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recommendedPosts.map((post) => (
        <ContentCard key={post.id} post={post} />
      ))}
    </div>
  )
}

function TrendingCard({ post }: { post: any }) {
  const title = post.properties.제목?.title[0]?.plain_text || '제목 없음'
  const summary = post.properties.요약?.rich_text[0]?.plain_text || ''
  const category = post.properties.카테고리?.select?.name || ''
  const slug = post.properties.Slug?.rich_text[0]?.plain_text || post.id

  return (
    <Link
      href={`/blog/${slug}`}
      className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
    >
      {category && (
        <span className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
          {category}
        </span>
      )}
      <h3 className="mt-2 text-lg font-semibold text-gray-900 line-clamp-2">
        {title}
      </h3>
      {summary && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-3">
          {summary}
        </p>
      )}
    </Link>
  )
}

function ContentCard({ post }: { post: any }) {
  const title = post.properties.제목?.title[0]?.plain_text || '제목 없음'
  const summary = post.properties.요약?.rich_text[0]?.plain_text || ''
  const category = post.properties.카테고리?.select?.name || ''
  const slug = post.properties.Slug?.rich_text[0]?.plain_text || post.id
  const imageUrl = post.properties.커버이미지?.files?.[0]?.file?.url

  return (
    <Link
      href={`/blog/${slug}`}
      className="block bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
    >
      {imageUrl && (
        <div className="aspect-w-16 aspect-h-9 bg-gray-200">
          <img
            src={imageUrl}
            alt={title}
            className="object-cover w-full h-48"
          />
        </div>
      )}
      <div className="p-6">
        {category && (
          <span className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
            {category}
          </span>
        )}
        <h3 className="mt-2 text-lg font-semibold text-gray-900 line-clamp-2">
          {title}
        </h3>
        {summary && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-3">
            {summary}
          </p>
        )}
      </div>
    </Link>
  )
}

function TrendingSkeletons() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 bg-white border border-gray-200 rounded-lg animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      ))}
    </div>
  )
}

function ContentSkeletons() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-lg overflow-hidden border border-gray-200 animate-pulse">
          <div className="h-48 bg-gray-200" />
          <div className="p-6">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}