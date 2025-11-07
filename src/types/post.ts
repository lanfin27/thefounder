// Database category values (Korean)
export type CategoryDB = '트렌드' | '인사이트' | '블로그' | '성공사례';

// URL slugs for category pages (English)
export type CategorySlug = 'trends' | 'insights' | 'cases' | 'blog';

// Map database categories (Korean) to URL slugs (English)
export const CATEGORY_TO_SLUG: Record<CategoryDB, CategorySlug> = {
  '트렌드': 'trends',
  '인사이트': 'insights',
  '블로그': 'blog',
  '성공사례': 'cases',
};

// Reverse mapping: URL slugs to database categories
export const SLUG_TO_CATEGORY: Record<CategorySlug, CategoryDB> = {
  'trends': '트렌드',
  'insights': '인사이트',
  'blog': '블로그',
  'cases': '성공사례',
};

// Category information for layout and display
export interface CategoryInfo {
  slug: CategorySlug;
  label: string;
  description: string;
  layoutType: 'image-left' | 'image-right';
  icon?: string;
}

export const CATEGORIES: Record<CategorySlug, CategoryInfo> = {
  trends: {
    slug: 'trends',
    label: '트렌드',
    description: '1분 안에 파악하는 1인 창업 트렌드',
    layoutType: 'image-left', // 이미지 왼쪽 - 이미지 중심
  },
  insights: {
    slug: 'insights',
    label: '인사이트',
    description: '스타트업 세계의 다양한 인사이트를 만나보세요',
    layoutType: 'image-left', // 이미지 왼쪽 - 이미지 중심
  },
  cases: {
    slug: 'cases',
    label: '사례',
    description: '성공한 창업가들의 실제 사례',
    layoutType: 'image-right', // 이미지 오른쪽 - 글 중심
  },
  blog: {
    slug: 'blog',
    label: '블로그',
    description: '깊이 있는 분석과 인사이트',
    layoutType: 'image-right', // 이미지 오른쪽 - 글 중심
  },
};
