'use client'

import { useRouter } from 'next/navigation'
import CommentSection from './CommentSection'

export default function CommentSectionWrapper({ postId }: { postId: string }) {
  const router = useRouter()

  const handleCommentChange = () => {
    // Wait for database trigger to complete
    setTimeout(() => {
      router.refresh()
    }, 200)
  }

  return <CommentSection postId={postId} onCommentChange={handleCommentChange} />
}
