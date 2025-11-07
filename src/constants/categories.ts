export interface Category {
  id: string
  koreanName: string
  englishName: string
  slug: string
  description?: string
  icon?: string
}

export const CATEGORIES: Category[] = [
  {
    id: 'trends',
    koreanName: '트렌드',
    englishName: 'Trends',
    slug: 'trends',
    description: '최신 스타트업 트렌드와 시장 동향'
  },
  {
    id: 'insights',
    koreanName: '인사이트',
    englishName: 'Insights',
    slug: 'insights',
    description: '깊이 있는 비즈니스 분석과 전략'
  },
  {
    id: 'blog',
    koreanName: '블로그',
    englishName: 'Blog',
    slug: 'blog',
    description: '창업가들의 경험과 노하우 공유'
  },
  {
    id: 'cases',
    koreanName: '성공사례',
    englishName: 'Cases',
    slug: 'cases',
    description: '성공한 스타트업의 성장 스토리'
  }
]

// Map Korean database categories to URL slugs
export const CATEGORY_MAPPING: Record<string, string> = {
  '트렌드': 'trends',
  '인사이트': 'insights',
  '블로그': 'blog',
  '성공사례': 'cases',
  // Legacy mappings
  '뉴스레터': 'trends',
  'SaaS': 'insights',
  '창업': 'cases',
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find(cat => cat.slug === slug)
}

export function mapOldCategoryToNew(oldCategory: string): string {
  return CATEGORY_MAPPING[oldCategory] || oldCategory
}