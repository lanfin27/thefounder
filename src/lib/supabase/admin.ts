import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Admin client for server-side operations with service role key
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'x-application-name': 'the-founder-admin'
        }
      }
    }
  )
}

// Alias for backward compatibility
export const createClient = createAdminClient

// Default export
export default createAdminClient