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
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      scopes: scopes?.join(' '),
      queryParams
    }
  })

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

  const { data, error } = await supabase.auth.unlinkIdentity({
    identity_id: identity.identity_id!
  })

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