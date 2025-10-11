import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/monitoring/notification-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const notifier = new NotificationService()
    const notifications = await notifier.getRecentNotifications(limit)
    
    return NextResponse.json({
      success: true,
      data: notifications
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { notificationId } = body
    
    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID required' },
        { status: 400 }
      )
    }
    
    const notifier = new NotificationService()
    await notifier.markAsRead(notificationId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}