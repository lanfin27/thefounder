export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  membership_status: 'free' | 'premium'
  membership_expires_at?: string
  created_at: string
  updated_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image?: string
  author: {
    name: string
    avatar?: string
  }
  category: string
  tags: string[]
  is_premium: boolean
  published_at: string
  created_at: string
  updated_at: string
  reading_time: number
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
  properties: {
    Title: {
      title: Array<{
        plain_text: string
      }>
    }
    Slug: {
      rich_text: Array<{
        plain_text: string
      }>
    }
    Category: {
      select: {
        name: string
      }
    }
    Tags: {
      multi_select: Array<{
        name: string
      }>
    }
    Premium: {
      checkbox: boolean
    }
    PublishedAt: {
      date: {
        start: string
      }
    }
  }
}