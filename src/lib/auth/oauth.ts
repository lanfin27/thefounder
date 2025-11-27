import { createClient } from '@/lib/supabase/client'

export type OAuthProvider = 'google' | 'kakao'

interface OAuthConfig {
  provider: OAuthProvider
  redirectTo?: string
  scopes?: string[]
  queryParams?: Record<string, string>
}

export async function signInWithOAuth({
  provider,
  redirectTo = '/dashboard',
  scopes,
  queryParams = {}
}: OAuthConfig) {
  console.log(`[OAuth] Initiating ${provider} sign in...`, {
    redirectTo,
    origin: typeof window !== 'undefined' ? window.location.origin : 'unknown'
  })

  const supabase = createClient()

  // Google-specific query params for refresh token
  const providerQueryParams = provider === 'google'
    ? {
        access_type: 'offline',
        prompt: 'consent',
        ...queryParams
      }
    : queryParams

  const callbackUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`

  console.log(`[OAuth] Callback URL:`, callbackUrl)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
      scopes: scopes?.join(' '),
      queryParams: providerQueryParams
    }
  })

  if (error) {
    console.error(`[OAuth] ${provider} sign in error:`, {
      message: error.message,
      status: error.status,
      name: error.name
    })
  } else {
    console.log(`[OAuth] ✅ ${provider} OAuth redirect initiated`)
  }

  return { data, error }
}

export async function linkOAuthAccount(provider: OAuthProvider) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo: `${window.location.origin}/profile?linked=true`
    }
  })

  return { data, error }
}

export async function unlinkOAuthAccount(provider: OAuthProvider) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: new Error('No user found') }
  }

  const identity = user.identities?.find(id => id.provider === provider)
  
  if (!identity) {
    return { error: new Error(`No ${provider} identity found`) }
  }

  const { data, error } = await supabase.auth.unlinkIdentity(identity as any)

  return { data, error }
}

export function getOAuthProviderInfo(provider: OAuthProvider) {
  const providers = {
    google: {
      name: 'Google',
      icon: 'google',
      color: '#4285F4',
      bgColor: '#ffffff',
      textColor: '#3c4043'
    },
    kakao: {
      name: 'Kakao',
      icon: 'kakao',
      color: '#FEE500',
      bgColor: '#FEE500',
      textColor: '#000000'
    }
  }

  return providers[provider]
}