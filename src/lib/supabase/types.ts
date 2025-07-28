// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          membership_status: 'free' | 'premium'
          membership_expires_at: string | null
          newsletter_subscribed: boolean
          email_verified: boolean
          onboarding_completed: boolean
          stripe_customer_id: string | null
          subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      posts: {
        Row: {
          id: string
          title: string
          slug: string
          summary: string | null
          content: string | null
          cover: string | null
          author: string | null
          category: '뉴스레터' | 'SaaS' | '블로그' | '창업' | null
          tags: string[]
          is_premium: boolean
          status: '초안' | '검토중' | '발행' | null
          published_date: string | null
          reading_time: number | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['posts']['Row']>
        Update: Partial<Database['public']['Tables']['posts']['Row']>
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          user_id: string | null
          session_id: string | null
          view_date: string
          reading_duration: number | null
          scroll_depth: number | null
          referrer: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['post_views']['Row']>
        Update: Partial<Database['public']['Tables']['post_views']['Row']>
      }
      user_reading_history: {
        Row: {
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
        Insert: Partial<Database['public']['Tables']['user_reading_history']['Row']>
        Update: Partial<Database['public']['Tables']['user_reading_history']['Row']>
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          user_id: string | null
          subscribed_at: string
          unsubscribed_at: string | null
          status: 'active' | 'unsubscribed' | 'bounced'
          source: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['newsletter_subscribers']['Row']>
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Row']>
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['bookmarks']['Row']>
        Update: Partial<Database['public']['Tables']['bookmarks']['Row']>
      }
      membership_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          provider: 'stripe' | 'kakao_pay' | 'naver_pay' | 'toss_payments'
          provider_transaction_id: string | null
          metadata: Record<string, any> | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['membership_transactions']['Row']>
        Update: Partial<Database['public']['Tables']['membership_transactions']['Row']>
      }
    }
  }
}