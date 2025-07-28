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