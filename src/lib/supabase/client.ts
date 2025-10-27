import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 🔥 Priority: YouTube Industry Supabase if available, otherwise main Supabase
  const supabaseUrl =
    process.env.NEXT_PUBLIC_YT_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL!

  const supabaseKey =
    process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Anon Key are required')
  }

  console.log('[Supabase Client] Creating browser client with URL:', supabaseUrl.substring(0, 30) + '...')

  return createBrowserClient(supabaseUrl, supabaseKey)
}