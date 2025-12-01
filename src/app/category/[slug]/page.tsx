export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { getPostsByCategory } from '@/lib/posts';
import { CATEGORIES, CategorySlug } from '@/types/post';
import PostList from '@/components/sections/PostList';
import { Metadata } from 'next';
import { TrendingUp, Lightbulb, BarChart3, PenTool } from 'lucide-react';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Category icon mapping
const CATEGORY_ICONS = {
  trends: TrendingUp,
  insights: Lightbulb,
  cases: BarChart3,
  blog: PenTool,
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
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
  const { slug } = await params;

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

        {/* 카테고리 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {categoryInfo.label}
          </h1>
          <p className="text-lg text-gray-600">
            {categoryInfo.description}
          </p>
        </div>

        {/* 카테고리별 포스트 목록 */}
        <PostList
          posts={posts}
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
