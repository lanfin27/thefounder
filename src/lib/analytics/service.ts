import { createClient } from '@/lib/supabase/server'

interface PostMetrics {
  totalViews: number
  uniqueViewers: number
  avgReadingTime: number
  completionRate: number
  bookmarkCount: number
}

interface ViewStats {
  date: string
  views: number
}

export async function getPostMetrics(postId: string): Promise<PostMetrics> {
  const supabase = await createClient()

  // Get view counts
  const { count: totalViews } = await supabase
    .from('post_views')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)

  // Get unique viewers
  const { data: uniqueViewersData } = await supabase
    .from('post_views')
    .select('user_id, session_id')
    .eq('post_id', postId)

  const uniqueViewers = new Set(
    uniqueViewersData?.map(v => v.user_id || v.session_id) || []
  ).size

  // Get reading time stats
  const { data: readingData } = await supabase
    .from('user_reading_history')
    .select('total_reading_time, progress, completed')
    .eq('post_id', postId)

  const avgReadingTime = readingData?.length
    ? readingData.reduce((acc, curr) => acc + (curr.total_reading_time || 0), 0) / readingData.length
    : 0

  const completionRate = readingData?.length
    ? (readingData.filter(r => r.completed).length / readingData.length) * 100
    : 0

  // Get bookmark count
  const { count: bookmarkCount } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)

  return {
    totalViews: totalViews || 0,
    uniqueViewers,
    avgReadingTime: Math.round(avgReadingTime / 60), // Convert to minutes
    completionRate: Math.round(completionRate),
    bookmarkCount: bookmarkCount || 0
  }
}

export async function getPostViewHistory(
  postId: string, 
  days: number = 7
): Promise<ViewStats[]> {
  const supabase = await createClient()
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('post_views')
    .select('view_date')
    .eq('post_id', postId)
    .gte('view_date', startDate.toISOString())
    .order('view_date', { ascending: true })

  // Group by date
  const viewsByDate = new Map<string, number>()
  
  data?.forEach(view => {
    const date = new Date(view.view_date).toISOString().split('T')[0]
    viewsByDate.set(date, (viewsByDate.get(date) || 0) + 1)
  })

  // Fill missing dates
  const stats: ViewStats[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    stats.unshift({
      date: dateStr,
      views: viewsByDate.get(dateStr) || 0
    })
  }

  return stats
}

export async function getUserEngagementMetrics(userId: string) {
  const supabase = await createClient()

  // Total posts read
  const { count: totalRead } = await supabase
    .from('user_reading_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Completed posts
  const { count: completedPosts } = await supabase
    .from('user_reading_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)

  // Total reading time
  const { data: readingTimeData } = await supabase
    .from('user_reading_history')
    .select('total_reading_time')
    .eq('user_id', userId)

  const totalReadingTime = readingTimeData?.reduce(
    (acc, curr) => acc + (curr.total_reading_time || 0), 
    0
  ) || 0

  // Bookmarks
  const { count: totalBookmarks } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Reading streak
  const { data: recentReading } = await supabase
    .from('user_reading_history')
    .select('last_read_at')
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false })
    .limit(30)

  const readingStreak = calculateReadingStreak(
    recentReading?.map(r => r.last_read_at) || []
  )

  return {
    totalRead: totalRead || 0,
    completedPosts: completedPosts || 0,
    totalReadingHours: (totalReadingTime / 3600).toFixed(1),
    totalBookmarks: totalBookmarks || 0,
    readingStreak,
    completionRate: totalRead ? Math.round((completedPosts || 0) / totalRead * 100) : 0
  }
}

function calculateReadingStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  const sortedDates = dates
    .map(d => new Date(d).toISOString().split('T')[0])
    .sort()
    .reverse()

  let streak = 1
  let currentDate = new Date(sortedDates[0])

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i])
    const dayDiff = Math.floor(
      (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (dayDiff === 1) {
      streak++
      currentDate = prevDate
    } else {
      break
    }
  }

  return streak
}