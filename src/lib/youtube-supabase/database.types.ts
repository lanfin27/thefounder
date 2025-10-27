/**
 * YouTube Industry Index - Supabase Database Types
 *
 * Supabase 스키마에 대응하는 TypeScript 타입 정의
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      youtube_categories: {
        Row: {
          code: string // Y01-Y15
          name: string
          name_en: string
          emoji: string
          color: string
          description: string | null
          total_channels: number
          total_views: number
          total_videos: number
          avg_views_per_video: number
          daily_change: number
          weekly_change: number
          monthly_change: number
          market_share: number
          volatility: number
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          name_en: string
          emoji: string
          color: string
          description?: string | null
          total_channels?: number
          total_views?: number
          total_videos?: number
          avg_views_per_video?: number
          daily_change?: number
          weekly_change?: number
          monthly_change?: number
          market_share?: number
          volatility?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          name_en?: string
          emoji?: string
          color?: string
          description?: string | null
          total_channels?: number
          total_views?: number
          total_videos?: number
          avg_views_per_video?: number
          daily_change?: number
          weekly_change?: number
          monthly_change?: number
          market_share?: number
          volatility?: number
          created_at?: string
          updated_at?: string
        }
      }
      youtube_channels: {
        Row: {
          id: string // UUID
          channel_id: string // YouTube channel ID
          category_code: string // Y01-Y15
          name: string
          handle: string | null
          description: string | null
          thumbnail_url: string | null
          subscribers: number
          total_views: number
          video_count: number
          views_per_video: number
          daily_change_rate: number
          weekly_change_rate: number
          monthly_change_rate: number
          engagement_rate: number
          likes_per_video: number | null
          comments_per_video: number | null
          shorts_count: number | null
          regular_count: number | null
          shorts_ratio: number | null
          uploads_per_week: number | null
          last_upload_date: string | null
          category_rank: number
          overall_rank: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          category_code: string
          name: string
          handle?: string | null
          description?: string | null
          thumbnail_url?: string | null
          subscribers?: number
          total_views?: number
          video_count?: number
          views_per_video?: number
          daily_change_rate?: number
          weekly_change_rate?: number
          monthly_change_rate?: number
          engagement_rate?: number
          likes_per_video?: number | null
          comments_per_video?: number | null
          shorts_count?: number | null
          regular_count?: number | null
          shorts_ratio?: number | null
          uploads_per_week?: number | null
          last_upload_date?: string | null
          category_rank?: number
          overall_rank?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          category_code?: string
          name?: string
          handle?: string | null
          description?: string | null
          thumbnail_url?: string | null
          subscribers?: number
          total_views?: number
          video_count?: number
          views_per_video?: number
          daily_change_rate?: number
          weekly_change_rate?: number
          monthly_change_rate?: number
          engagement_rate?: number
          likes_per_video?: number | null
          comments_per_video?: number | null
          shorts_count?: number | null
          regular_count?: number | null
          shorts_ratio?: number | null
          uploads_per_week?: number | null
          last_upload_date?: string | null
          category_rank?: number
          overall_rank?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      youtube_metrics_history: {
        Row: {
          id: string
          category_code: string | null
          channel_id: string | null
          date: string
          value: number
          metric_type: 'views_per_video' | 'subscribers' | 'total_views' | 'engagement_rate'
          created_at: string
        }
        Insert: {
          id?: string
          category_code?: string | null
          channel_id?: string | null
          date: string
          value: number
          metric_type: 'views_per_video' | 'subscribers' | 'total_views' | 'engagement_rate'
          created_at?: string
        }
        Update: {
          id?: string
          category_code?: string | null
          channel_id?: string | null
          date?: string
          value?: number
          metric_type?: 'views_per_video' | 'subscribers' | 'total_views' | 'engagement_rate'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
