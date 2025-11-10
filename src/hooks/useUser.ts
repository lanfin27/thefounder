'use client'

/**
 * useUser Hook
 * Client-side hook for user authentication and profile management
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/user'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchUser() {
      try {
        setLoading(true)
        setError(null)
        console.log('🔍 [useUser] Starting fetchUser...')

        // Get current auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
          console.error('❌ [useUser] Auth error:', authError)
          throw authError
        }

        console.log('✅ [useUser] Auth user:', user ? {
          id: user.id,
          email: user.email,
          emailConfirmed: !!user.email_confirmed_at
        } : 'null')

        setUser(user)

        if (user) {
          // Get user profile
          console.log('🔍 [useUser] Fetching profile for user ID:', user.id)

          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError) {
            console.error('⚠️ [useUser] Profile error:', {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint
            })

            if (profileError.code !== 'PGRST116') {
              // PGRST116 = no rows returned (profile doesn't exist yet)
              throw profileError
            } else {
              console.log('⚠️ [useUser] Profile not found (PGRST116) - user has no profile yet')
            }
          } else {
            console.log('✅ [useUser] Profile loaded:', {
              id: profile?.id,
              email: profile?.email,
              role: profile?.role,
              createdAt: profile?.created_at
            })
          }

          setProfile(profile)
        } else {
          console.log('ℹ️ [useUser] No authenticated user, setting profile to null')
          setProfile(null)
        }
      } catch (err) {
        console.error('❌ [useUser] Unexpected error:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      } finally {
        setLoading(false)
        console.log('📊 [useUser] fetchUser completed')
      }
    }

    // Initial fetch
    fetchUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useUser] Auth event:', event)

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUser()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const isAdmin = profile?.role === 'admin'
  const isUser = profile?.role === 'user'

  // Log whenever the returned values change
  useEffect(() => {
    console.log('📊 [useUser] Hook state updated:', {
      hasUser: !!user,
      userEmail: user?.email,
      hasProfile: !!profile,
      profileEmail: profile?.email,
      role: profile?.role,
      isAdmin,
      isUser,
      loading
    })
  }, [user, profile, loading, isAdmin, isUser])

  return {
    user,
    profile,
    loading,
    error,
    isAdmin,
    isUser,
  }
}
