import { notFound } from 'next/navigation';
import { getPostsByCategory } from '@/lib/posts';
import { CATEGORIES, CategorySlug } from '@/types/post';
import CategoryPosts from '@/components/sections/CategoryPosts';
import { Metadata } from 'next';
import { TrendingUp, Lightbulb, BarChart3, PenTool } from 'lucide-react';

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

// Category icon mapping
const CATEGORY_ICONS = {
  trends: TrendingUp,
  insights: Lightbulb,
  cases: BarChart3,
  blog: PenTool,
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = params;
  const categoryInfo = CATEGORIES[slug as CategorySlug];

  if (!categoryInfo) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: `${categoryInfo.label} | The Founder`,
    description: categoryInfo.description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;

  console.log(`\n🔍 [CategoryPage] Rendering page for slug: "${slug}"`);

  // 카테고리 존재 확인
  const categoryInfo = CATEGORIES[slug as CategorySlug];
  if (!categoryInfo) {
    console.error(`❌ [CategoryPage] Category not found: "${slug}"`);
    notFound();
  }

  console.log(`✅ [CategoryPage] Category info found:`, categoryInfo);

  // 해당 카테고리의 포스트 가져오기
  const posts = await getPostsByCategory(slug as CategorySlug);
  console.log(`✅ [CategoryPage] Received ${posts.length} posts for category "${slug}"`);

  const Icon = CATEGORY_ICONS[slug as CategorySlug];

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 카테고리 헤더 - Enhanced */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            {Icon && (
              <div className="p-2 bg-green-50 rounded-lg">
                <Icon className="w-6 h-6 text-green-600" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {categoryInfo.label}
              </h2>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {posts.length}개의 글
              </span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {categoryInfo.label}
          </h1>
          <p className="text-lg text-gray-600">
            {categoryInfo.description}
          </p>
        </div>

        {/* 카테고리별 포스트 목록 */}
        <CategoryPosts
          posts={posts}
          layoutType={categoryInfo.layoutType}
          categorySlug={slug as CategorySlug}
        />
      </div>
    </div>
  );
}

// 정적 경로 생성
export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((slug) => ({
    slug,
  }));
}
