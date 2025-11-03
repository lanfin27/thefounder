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

interface CategoryGridProps {
  categoryPosts: CategoryPost[];
}

// 카테고리 설정
const categoryConfig: Record<string, {
  label: string;
  description: string;
}> = {
  'insight': {
    label: '인사이트',
    description: '1인 창업에 필요한 실전 인사이트와 깊이 있는 분석',
  },
  'casestudy': {
    label: '성공사례',
    description: '실제로 성공한 창업가들의 생생한 이야기와 전략',
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

export function CategoryGrid({ categoryPosts }: CategoryGridProps) {
  console.log('🗂️ CategoryGrid 컴포넌트 렌더링:', {
    categories: categoryPosts.map(cp => ({
      category: cp.category,
      count: cp.posts.length
    }))
  });

  return (
    <div className="py-16 bg-white">
      <div className="max-w-container mx-auto px-6">
        {categoryPosts.map(({ category, posts }) => {
          const config = categoryConfig[category];

          console.log(`  📁 ${category} 카테고리 렌더링:`, {
            hasConfig: !!config,
            postsCount: posts?.length || 0,
            posts: posts?.map(p => p.title)
          });

          if (!config) {
            console.warn(`⚠️ ${category} 카테고리 설정이 없습니다`);
            return null;
          }

          if (!posts || posts.length === 0) {
            console.warn(`⚠️ ${category} 카테고리에 포스트가 없습니다`);
            return (
              <section key={category} className="mb-20 last:mb-0">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
                  <div>
                    <h2 className="text-h2 font-serif font-bold text-text-primary mb-2">
                      {config.label}
                    </h2>
                    <p className="text-text-secondary">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Empty State */}
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-2">📭 {config.label} 카테고리에 아직 콘텐츠가 없습니다</p>
                  <p className="text-sm text-gray-500">곧 좋은 콘텐츠로 찾아뵙겠습니다.</p>
                </div>
              </section>
            );
          }

          return (
            <section key={category} className="mb-20 last:mb-0">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
                <div>
                  <h2 className="text-h2 font-serif font-bold text-text-primary mb-2">
                    {config.label}
                  </h2>
                  <p className="text-text-secondary">
                    {config.description}
                  </p>
                </div>
                <Link
                  href={`/${category}`}
                  className="text-accent hover:text-accent/80 font-medium flex items-center gap-1"
                >
                  전체보기
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Posts Grid */}
              <div className="grid md:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/${category}/${post.slug}`}
                    className="group"
                  >
                    {/* Thumbnail */}
                    {post.cover_image && (
                      <div className="relative h-48 bg-gray-100 mb-4 overflow-hidden">
                        <Image
                          src={post.cover_image}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-h3 font-serif font-bold text-text-primary mb-2 group-hover:text-accent transition-colors line-clamp-2">
                      {post.title}
                    </h3>

                    {/* Date */}
                    <p className="text-small text-text-secondary">
                      {formatDate(post.published_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
