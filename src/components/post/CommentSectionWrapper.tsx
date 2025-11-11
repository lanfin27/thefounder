'use client'

import { useRouter } from 'next/navigation'
import CommentSection from './CommentSection'

export default function CommentSectionWrapper({ postId }: { postId: string }) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('[CommentSectionWrapper] 🎬 Wrapper rendered')
  console.log(`[CommentSectionWrapper] 📝 Received postId:`, postId)
  console.log(`[CommentSectionWrapper] 📝 postId type:`, typeof postId)
  console.log(`[CommentSectionWrapper] 📝 postId truthy:`, !!postId)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const router = useRouter()

  const handleCommentChange = () => {
    console.log('[CommentSectionWrapper] Comment changed, refreshing page data...')
    // Wait for database trigger to complete
    setTimeout(() => {
      router.refresh()
    }, 200)
  }

  return <CommentSection postId={postId} onCommentChange={handleCommentChange} />
}
