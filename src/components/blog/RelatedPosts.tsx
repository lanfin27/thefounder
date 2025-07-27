import { BlogPost } from '@/types'
import { getAllPosts } from '@/lib/notion/converter'
import PostCard from './PostCard'

interface RelatedPostsProps {
  currentPost: BlogPost
}

export default async function RelatedPosts({ currentPost }: RelatedPostsProps) {
  const allPosts = await getAllPosts()
  
  // Get related posts from same category
  const relatedPosts = allPosts
    .filter(post => 
      post.id !== currentPost.id && 
      post.category === currentPost.category
    )
    .slice(0, 3)
  
  if (relatedPosts.length === 0) {
    return null
  }
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        관련 글
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}