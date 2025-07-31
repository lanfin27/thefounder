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
    <div className="max-w-4xl mx-auto">
      <h2 className="text-heading-3 font-serif text-medium-black mb-8 text-center text-korean">
        더 읽어보기
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {relatedPosts.map((post) => (
          <PostCard key={post.id} post={post} variant="compact" />
        ))}
      </div>
    </div>
  )
}