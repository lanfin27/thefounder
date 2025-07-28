import { createClient } from '@/lib/supabase/server'
import { User } from '@/types'

export type MembershipStatus = 'free' | 'premium'

interface SubscriptionCheck {
  status: MembershipStatus
  expiresAt?: Date
  isActive: boolean
}

export async function checkUserSubscription(userId?: string): Promise<SubscriptionCheck> {
  if (!userId) {
    return {
      status: 'free',
      isActive: false
    }
  }

  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_status, membership_expires_at')
    .eq('id', userId)
    .single()

  if (!profile || profile.membership_status !== 'premium') {
    return {
      status: 'free',
      isActive: false
    }
  }

  // Check if membership is still valid
  if (profile.membership_expires_at) {
    const expiresAt = new Date(profile.membership_expires_at)
    const now = new Date()
    
    if (expiresAt < now) {
      // Membership has expired, update the status
      await supabase
        .from('profiles')
        .update({ membership_status: 'free' })
        .eq('id', userId)
      
      return {
        status: 'free',
        isActive: false
      }
    }
    
    return {
      status: 'premium',
      expiresAt,
      isActive: true
    }
  }

  return {
    status: 'premium',
    isActive: true
  }
}

export async function canAccessPremiumContent(userId?: string, postId?: string): Promise<boolean> {
  const subscription = await checkUserSubscription(userId)
  return subscription.status === 'premium' && subscription.isActive
}

export async function updateUserSubscription(
  userId: string, 
  status: MembershipStatus,
  expiresAt?: Date
): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('profiles')
    .update({
      membership_status: status,
      membership_expires_at: expiresAt?.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  return !error
}

export async function recordSubscriptionTransaction(
  userId: string,
  amount: number,
  provider: 'stripe' | 'kakao_pay' | 'naver_pay' | 'toss_payments',
  providerTransactionId: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('membership_transactions')
    .insert({
      user_id: userId,
      amount,
      currency: 'KRW',
      status: 'completed',
      provider,
      provider_transaction_id: providerTransactionId,
      metadata
    })

  return !error
}