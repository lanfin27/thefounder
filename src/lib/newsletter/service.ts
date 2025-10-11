import { createClient } from '@/lib/supabase/server'

interface NewsletterSubscription {
  email: string
  userId?: string
  source?: string
  tags?: string[]
}

export async function subscribeToNewsletter({
  email,
  userId,
  source = 'website',
  tags = []
}: NewsletterSubscription) {
  const supabase = await createClient()

  try {
    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return { success: true, message: 'Already subscribed' }
      }
      
      // Reactivate subscription
      const { error } = await supabase
        .from('newsletter_subscribers')
        .update({
          status: 'active',
          unsubscribed_at: null,
          user_id: userId || existing.user_id,
          tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error
      
      return { success: true, message: 'Subscription reactivated' }
    }

    // Create new subscription
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email,
        user_id: userId,
        source,
        tags,
        status: 'active'
      })

    if (error) throw error

    return { success: true, message: 'Successfully subscribed' }
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return { success: false, message: 'Failed to subscribe' }
  }
}

export async function unsubscribeFromNewsletter(email: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('email', email)

    if (error) throw error

    return { success: true, message: 'Successfully unsubscribed' }
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return { success: false, message: 'Failed to unsubscribe' }
  }
}

export async function getNewsletterSubscription(emailOrUserId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .or(`email.eq.${emailOrUserId},user_id.eq.${emailOrUserId}`)
    .single()

  return data
}

export async function updateUserNewsletterPreference(userId: string, subscribed: boolean) {
  const supabase = await createClient()

  try {
    // Update profile preference
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        newsletter_subscribed: subscribed,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) throw profileError

    // Get user email
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.email) {
      if (subscribed) {
        await subscribeToNewsletter({
          email: user.email,
          userId,
          source: 'profile_settings'
        })
      } else {
        await unsubscribeFromNewsletter(user.email)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Newsletter preference update error:', error)
    return { success: false, error }
  }
}