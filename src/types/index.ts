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
    Title: {
      title: Array<{
        plain_text: string
      }>
    }
    Summary: {
      rich_text: Array<{
        plain_text: string
      }>
    }
    Category: {
      select: {
        name: '뉴스레터' | 'SaaS' | '블로그' | '창업'
      }
    }
    Tags: {
      multi_select: Array<{
        name: string
      }>
    }
    Cover: {
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
    'Is Premium': {
      checkbox: boolean
    }
    Status: {
      select: {
        name: '초안' | '검토중' | '발행'
      }
    }
    'Published Date': {
      date: {
        start: string
      } | null
    }
    Slug: {
      rich_text: Array<{
        plain_text: string
      }>
    }
    Author: {
      select: {
        name: string
      }
    }
  }
}