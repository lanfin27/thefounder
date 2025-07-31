export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  bio?: string
  website?: string
  membership_status: 'free' | 'premium'
  membership_expires_at?: string
  newsletter_subscribed?: boolean
  email_verified?: boolean
  onboarding_completed?: boolean
  stripe_customer_id?: string
  subscription_id?: string
  created_at: string
  updated_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  cover?: string
  author: string
  category: '뉴스레터' | 'SaaS' | '블로그' | '창업'
  tags: string[]
  isPremium: boolean
  status: '초안' | '검토중' | '발행'
  publishedDate: string
  createdAt: string
  updatedAt: string
  readingTime: number
}

export interface MembershipPlan {
  id: string
  name: string
  price: number
  duration: 'monthly' | 'yearly'
  features: string[]
}

export interface NotionPage {
  id: string
  created_time: string
  last_edited_time: string
  cover?: {
    type: 'external' | 'file'
    external?: {
      url: string
    }
    file?: {
      url: string
    }
  }
  properties: {
    '제목': {
      title: Array<{
        plain_text: string
      }>
    }
    '요약': {
      rich_text: Array<{
        plain_text: string
      }>
    }
    '카테고리': {
      select: {
        name: '뉴스레터' | 'SaaS' | '블로그' | '창업'
      } | null
    }
    '태그': {
      multi_select: Array<{
        name: string
      }>
    }
    '커버이미지': {
      files: Array<{
        name: string
        type: 'external' | 'file'
        external?: {
          url: string
        }
        file?: {
          url: string
        }
      }>
    }
    '프리미엄': {
      checkbox: boolean
    }
    '상태': {
      select: {
        name: '초안' | '검토중' | '발행'
      } | null
    }
    '발행일': {
      date: {
        start: string
      } | null
    }
    'Slug': {
      rich_text: Array<{
        plain_text: string
      }>
    }
    '작성자': {
      select: {
        name: string
      } | null
    }
  }
}

export interface PostView {
  id: string
  post_id: string
  user_id?: string
  session_id?: string
  view_date: string
  reading_duration?: number
  scroll_depth?: number
  referrer?: string
  user_agent?: string
  created_at: string
}

export interface UserReadingHistory {
  id: string
  user_id: string
  post_id: string
  started_at: string
  last_read_at: string
  progress: number
  total_reading_time: number
  completed: boolean
  created_at: string
  updated_at: string
}

export interface NewsletterSubscriber {
  id: string
  email: string
  user_id?: string
  subscribed_at: string
  unsubscribed_at?: string
  status: 'active' | 'unsubscribed' | 'bounced'
  source?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface MembershipTransaction {
  id: string
  user_id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  provider: 'stripe' | 'kakao_pay' | 'naver_pay' | 'toss_payments'
  provider_transaction_id?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface ReadPost {
  id: string
  user_id: string
  post_id: string
  read_at: string
  reading_time?: number
}

// Valuation Types
export type ValuationMethod = 'dcf' | 'multiple' | 'comparable' | 'venture'
export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY'
export type Country = 'KR' | 'US' | 'JP' | 'CN' | 'SG' | 'OTHER'

export interface ValuationInput {
  // Common fields
  revenue?: number
  profit?: number
  growth_rate?: number
  
  // DCF specific
  free_cash_flow?: number
  discount_rate?: number
  terminal_growth_rate?: number
  projection_years?: number
  
  // Multiple specific
  selected_multiple?: number
  multiple_type?: 'revenue' | 'profit' | 'ebitda'
  
  // Comparable specific
  comparable_companies?: string[]
  
  // Venture specific
  stage?: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'later'
  total_addressable_market?: number
  market_share?: number
  burn_rate?: number
  runway_months?: number
}

export interface ValuationResult {
  valuation: number
  method: ValuationMethod
  confidence_level?: 'low' | 'medium' | 'high'
  
  // Method-specific results
  dcf_details?: {
    present_value: number
    terminal_value: number
    enterprise_value: number
    equity_value: number
  }
  
  multiple_details?: {
    applied_multiple: number
    base_metric: number
    base_metric_type: string
  }
  
  comparable_details?: {
    peer_average_multiple: number
    peer_median_multiple: number
    selected_peers: string[]
  }
  
  sensitivity_analysis?: {
    base_case: number
    optimistic: number
    pessimistic: number
  }
  
  key_metrics?: {
    revenue_multiple?: number
    profit_multiple?: number
    growth_adjusted_multiple?: number
  }
}

export interface Valuation {
  id: string
  user_id: string
  company_name: string
  industry: string
  country: Country
  currency: Currency
  valuation_method: ValuationMethod
  input_data: ValuationInput
  results: ValuationResult
  notes?: string
  is_draft: boolean
  created_at: string
  updated_at: string
}

export interface FlippaListing {
  id: number
  flippa_id: string
  title: string
  url?: string
  asking_price?: number
  monthly_revenue?: number
  monthly_profit?: number
  profit_multiple?: number
  revenue_multiple?: number
  industry?: string
  business_type?: string
  listing_status: 'active' | 'sold' | 'expired'
  listing_date?: string
  scraped_at: string
  created_at: string
}

export interface IndustryMultiple {
  id: number
  industry: string
  country: Country
  avg_profit_multiple?: number
  median_profit_multiple?: number
  min_profit_multiple?: number
  max_profit_multiple?: number
  avg_revenue_multiple?: number
  median_revenue_multiple?: number
  min_revenue_multiple?: number
  max_revenue_multiple?: number
  sample_size?: number
  data_source?: string
  date_calculated: string
  created_at: string
  updated_at: string
}

export interface ValuationTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  industry?: string
  valuation_method: ValuationMethod
  template_data: Partial<ValuationInput>
  is_public: boolean
  use_count: number
  created_at: string
  updated_at: string
}

export interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  industry?: string
  country: Country
  currency: Currency
  company_data?: {
    founded_year?: number
    employee_count?: number
    website?: string
    description?: string
    key_metrics?: Record<string, number>
  }
  created_at: string
  updated_at: string
}

// Industry categories following Korean market
export const INDUSTRY_CATEGORIES = [
  'SaaS',
  '이커머스',
  '핀테크',
  '헬스케어',
  '교육',
  '미디어/컨텐츠',
  '물류/유통',
  '제조',
  '부동산',
  'AI/머신러닝',
  '블록체인/크립토',
  '모빌리티',
  '푸드테크',
  '뷰티/패션',
  '여행/레저',
  'B2B 서비스',
  '기타'
] as const

export type IndustryCategory = typeof INDUSTRY_CATEGORIES[number]