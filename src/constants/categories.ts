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
    id: 'trend',
    koreanName: '트렌드',
    englishName: 'Trend',
    slug: 'trend',
    description: '최신 스타트업 트렌드와 시장 동향'
  },
  {
    id: 'insight',
    koreanName: '인사이트',
    englishName: 'Insight',
    slug: 'insight',
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
    id: 'casestudy',
    koreanName: '성공사례',
    englishName: 'Case Study',
    slug: 'casestudy',
    description: '성공한 스타트업의 성장 스토리'
  }
]

// Category mapping from old to new system
export const CATEGORY_MAPPING: Record<string, string> = {
  '뉴스레터': 'trend',
  'newsletter': 'trend',
  'SaaS': 'insight',
  'saas': 'insight',
  '블로그': 'blog',
  'blog': 'blog',
  '창업': 'casestudy',
  'startup': 'casestudy',
  '산업트렌드': '',
  'charts': ''
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find(cat => cat.slug === slug)
}

export function mapOldCategoryToNew(oldCategory: string): string {
  return CATEGORY_MAPPING[oldCategory] || oldCategory
}