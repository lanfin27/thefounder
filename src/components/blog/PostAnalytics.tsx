'use client'

import { useReadingProgress } from '@/hooks/useReadingProgress'

interface PostAnalyticsProps {
  postId: string
  userId?: string
  enabled?: boolean
}

export default function PostAnalytics({ postId, userId, enabled = true }: PostAnalyticsProps) {
  useReadingProgress({ postId, userId, enabled })
  
  return null
}