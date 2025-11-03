import Link from 'next/link'
import PostCard from '@/components/cards/PostCard'

interface Post {
  id: string
  title: string
  slug: string
  category: string
  cover_image?: string | null
  summary?: string | null
  published_at?: string
  author?: string | null
  reading_time?: number | null
}

interface CategorySectionProps {
  title: string
  description: string
  emoji: string
  posts: Post[]
  category: string
  columns?: number
}

export default function CategorySectionNew({
  title,
  description,
  emoji,
  posts,
  category,
  columns = 3
}: CategorySectionProps) {
  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {emoji} {title}
            </h2>
            <p className="text-gray-600">{description}</p>
          </div>
          <Link href={`/${category}`}>
            <span className="text-green-600 hover:text-green-700 font-medium hover:underline transition-all">
              더보기 →
            </span>
          </Link>
        </div>

        <div className={`grid grid-cols-1 ${
          columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
          columns === 3 ? 'md:grid-cols-2 lg:grid-cols-3' :
          'md:grid-cols-2'
        } gap-6`}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} category={category} />
          ))}
        </div>
      </div>
    </section>
  )
}
