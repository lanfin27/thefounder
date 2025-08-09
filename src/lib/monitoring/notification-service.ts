// Notification service for alerts and updates
import { createServerClient } from '@/lib/supabase'
import { generateId } from '@/lib/utils'

interface NotificationPayload {
  type: string
  priority: 'high' | 'normal' | 'low'
  [key: string]: any
}

export class NotificationService {
  private supabase: ReturnType<typeof createServerClient>
  
  constructor() {
    this.supabase = createServerClient()
  }

  async sendBatch(notifications: NotificationPayload[], scanId: string): Promise<void> {
    console.log(`📨 Sending ${notifications.length} notifications...`)
    
    const notificationRecords = notifications.map(notification => ({
      notification_id: generateId('notif'),
      notification_type: 'dashboard', // For now, just dashboard notifications
      priority: notification.priority,
      subject: this.generateSubject(notification),
      content: notification,
      listing_id: notification.listingId || notification.listing?.listing_id,
      status: 'pending',
      created_at: new Date().toISOString()
    }))
    
    // Insert into notification queue
    const { error } = await this.supabase
      .from('notification_queue')
      .insert(notificationRecords)
    
    if (error) {
      console.error('Error queuing notifications:', error)
    }
    
    // Process high priority notifications immediately
    const highPriority = notificationRecords.filter(n => n.priority === 'high')
    if (highPriority.length > 0) {
      await this.processNotifications(highPriority)
    }
  }

  private generateSubject(notification: NotificationPayload): string {
    switch (notification.type) {
      case 'high_value_listing':
        return `High-Value Listing: ${notification.listing.title}`
      case 'high_revenue_listing':
        return `High-Revenue Listing: ${notification.listing.title}`
      case 'price_drop':
        return `Price Drop Alert: ${notification.title} (-${notification.dropPercentage.toFixed(0)}%)`
      case 'trending_categories':
        return `Trending Categories: ${notification.categories.join(', ')}`
      default:
        return 'Flippa Monitoring Alert'
    }
  }

  private async processNotifications(notifications: any[]): Promise<void> {
    // For now, just mark them as sent
    // In production, this would send actual emails/webhooks
    
    const ids = notifications.map(n => n.notification_id)
    
    await this.supabase
      .from('notification_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .in('notification_id', ids)
    
    console.log(`✅ Processed ${notifications.length} high-priority notifications`)
  }

  // Get recent notifications for dashboard
  async getRecentNotifications(limit: number = 10): Promise<any[]> {
    const { data } = await this.supabase
      .from('notification_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return data || []
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await this.supabase
      .from('notification_queue')
      .update({ status: 'read' })
      .eq('notification_id', notificationId)
  }

  // Email notification template
  generateEmailContent(notification: NotificationPayload): string {
    let html = `
      <h2>Flippa Monitoring Alert</h2>
      <p><strong>${this.generateSubject(notification)}</strong></p>
    `
    
    switch (notification.type) {
      case 'high_value_listing':
      case 'high_revenue_listing':
        html += `
          <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0;">
            <h3>${notification.listing.title}</h3>
            <p><strong>Price:</strong> $${notification.listing.asking_price.toLocaleString()}</p>
            <p><strong>Monthly Revenue:</strong> $${notification.listing.monthly_revenue.toLocaleString()}</p>
            <p><strong>Category:</strong> ${notification.listing.category}</p>
            <p><strong>URL:</strong> <a href="${notification.listing.url}">${notification.listing.url}</a></p>
          </div>
        `
        break
        
      case 'price_drop':
        html += `
          <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0;">
            <h3>${notification.title}</h3>
            <p><strong>Old Price:</strong> $${notification.oldPrice.toLocaleString()}</p>
            <p><strong>New Price:</strong> $${notification.newPrice.toLocaleString()}</p>
            <p><strong>Drop:</strong> -${notification.dropPercentage.toFixed(0)}%</p>
          </div>
        `
        break
        
      case 'trending_categories':
        html += `
          <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0;">
            <p><strong>Trending Categories:</strong> ${notification.categories.join(', ')}</p>
            <p><strong>New Listings:</strong> ${notification.newListingsCount}</p>
          </div>
        `
        break
    }
    
    html += `
      <hr>
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from Flippa Monitoring System.
        <br>
        Access the dashboard at: <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/flippa-listings">Admin Dashboard</a>
      </p>
    `
    
    return html
  }

  // Webhook payload generator
  generateWebhookPayload(notification: NotificationPayload): any {
    return {
      event: 'flippa_monitoring_alert',
      type: notification.type,
      priority: notification.priority,
      timestamp: new Date().toISOString(),
      data: notification
    }
  }
}