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

  return createBrowserClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        console.log('🍪 [Supabase Client] Getting cookie:', name)

        // Try localStorage first (more reliable)
        if (typeof window !== 'undefined') {
          try {
            const value = localStorage.getItem(`sb-${name}`)
            if (value) {
              console.log('✅ [Supabase Client] Found in localStorage')
              return value
            }
          } catch (e) {
            console.log('⚠️ [Supabase Client] localStorage get failed:', e)
          }
        }

        // Fallback to document.cookie
        if (typeof document !== 'undefined') {
          const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))

          if (!cookie) {
            console.log('❌ [Supabase Client] Cookie not found')
            return null
          }

          const value = cookie.split('=')[1]
          console.log('✅ [Supabase Client] Found in document.cookie')

          // Handle base64 encoded cookies
          try {
            if (value.startsWith('base64-')) {
              const decoded = atob(value.replace('base64-', ''))
              console.log('✅ [Supabase Client] Decoded base64 cookie')
              return decoded
            }
            return decodeURIComponent(value)
          } catch (error) {
            console.error('❌ [Supabase Client] Cookie decode error:', error)
            return value
          }
        }

        return null
      },
      set(name: string, value: string, options: any) {
        console.log('🍪 [Supabase Client] Setting cookie:', name)

        // Save to localStorage for reliability
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`sb-${name}`, value)
            console.log('✅ [Supabase Client] Saved to localStorage')
          } catch (e) {
            console.error('❌ [Supabase Client] localStorage set failed:', e)
          }
        }

        // Also save to document.cookie
        if (typeof document !== 'undefined') {
          const cookieStr = `${name}=${encodeURIComponent(value)}; path=/; ${
            options.maxAge ? `max-age=${options.maxAge}` : ''
          }; SameSite=Lax`
          document.cookie = cookieStr
          console.log('✅ [Supabase Client] Saved to document.cookie')
        }
      },
      remove(name: string, options: any) {
        console.log('🗑️ [Supabase Client] Removing cookie:', name)

        // Remove from localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`sb-${name}`)
            console.log('✅ [Supabase Client] Removed from localStorage')
          } catch (e) {
            console.error('❌ [Supabase Client] localStorage remove failed:', e)
          }
        }

        // Remove from document.cookie
        if (typeof document !== 'undefined') {
          document.cookie = `${name}=; path=/; max-age=0`
          console.log('✅ [Supabase Client] Removed from document.cookie')
        }
      }
    }
  })
}