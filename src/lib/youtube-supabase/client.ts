/**
 * YouTube Industry Index - Dedicated Supabase Client
 *
 * 별도의 Supabase 인스턴스를 사용하여 YouTube 데이터 관리
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Public client (client-side에서 사용)
export const ytSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false // YouTube 대시보드는 인증 불필요
    }
  }
)

// Admin client (server-side API routes에서만 사용)
export const ytSupabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

// Helper function to check connection
export async function checkYouTubeSupabaseConnection() {
  try {
    const { data, error } = await ytSupabase
      .from('youtube_categories')
      .select('code')
      .limit(1)

    if (error) throw error
    return { connected: true, data }
  } catch (error) {
    console.error('[YouTube Supabase] Connection failed:', error)
    return { connected: false, error }
  }
}

export default ytSupabase
