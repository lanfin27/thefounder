import Link from 'next/link';
import Image from 'next/image';

interface Post {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover_image: string | null;
  published_at: string;
}

interface CategoryPost {
  category: string;
  posts: Post[];
}

interface CategorySectionsProps {
  categoryPosts: CategoryPost[];
}

// 카테고리 설정 (현재 DB 기준)
const categoryConfig: Record<string, {
  label: string;
  icon: string;
  description: string;
  color: string;
}> = {
  'insight': {
    label: '인사이트',
    icon: '💡',
    description: '1인 창업에 필요한 실전 인사이트와 깊이 있는 분석',
    color: 'from-purple-600 to-purple-700',
  },
  'casestudy': {
    label: '성공사례',
    icon: '📈',
    description: '실제로 성공한 창업가들의 생생한 이야기와 전략',
    color: 'from-blue-600 to-blue-700',
  },
};

// 날짜 포맷
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function CategorySections({ categoryPosts }: CategorySectionsProps) {
  return (
    <div className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {categoryPosts.map(({ category, posts }) => {
          const config = categoryConfig[category];

          // 설정이 없거나 포스트가 없으면 스킵
          if (!config || !posts || posts.length === 0) {
            return null;
          }

          return (
            <section key={category} className="mb-20 last:mb-0">
              {/* 카테고리 헤더 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{config.icon}</span>
                    <h2 className="text-3xl font-bold text-gray-900">
                      {config.label}
                    </h2>
                  </div>
                  <p className="text-gray-600 sm:ml-14">
                    {config.description}
                  </p>
                </div>
                <Link
                  href={`/${category}`}
                  className={`hidden sm:inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r ${config.color} text-white font-medium hover:shadow-lg transition-all hover:scale-105`}
                >
                  전체보기
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* 포스트 그리드 */}
              <div className="grid gap-6 sm:grid-cols-2">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/${category}/${post.slug}`}
                    className="group flex gap-4 p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    {/* 썸네일 */}
                    <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                      {post.cover_image ? (
                        <Image
                          src={post.cover_image}
                          alt={post.title}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          {config.icon}
                        </div>
                      )}
                    </div>

                    {/* 콘텐츠 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(post.published_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* 모바일 전체보기 버튼 */}
              <div className="mt-6 sm:hidden text-center">
                <Link
                  href={`/${category}`}
                  className={`inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r ${config.color} text-white font-medium`}
                >
                  {config.label} 전체보기
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
