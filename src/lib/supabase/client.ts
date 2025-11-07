import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Use main Supabase for The Founder app authentication
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Anon Key are required')
  }

  // Validation: Ensure we're using the correct Supabase instance
  console.log('[Supabase Client] Creating browser client with URL:', supabaseUrl.substring(0, 30) + '...')
  console.log('[Supabase Client] Expected URL prefix: https://jspajkepyfkmwsmoveqy')

  if (!supabaseUrl.includes('jspajkepyfkmwsmoveqy')) {
    console.error('❌ [Supabase Client] WARNING: Using incorrect Supabase URL!')
    console.error('Expected: jspajkepyfkmwsmoveqy.supabase.co')
    console.error('Got:', supabaseUrl)
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}