import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

const mockFeaturedPosts = [
  {
    id: '1',
    title: '토스가 유니콘이 된 비결: 금융의 민주화를 향한 여정',
    excerpt: '토스는 어떻게 한국의 대표 핀테크 유니콘이 되었을까? 이승건 대표의 창업 이야기와 토스의 성장 전략을 들어본다.',
    author: { name: '김지현', avatar: '/avatars/author1.jpg' },
    category: '인터뷰',
    cover_image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop',
    published_at: '2024-01-15',
    reading_time: 12,
    is_premium: true,
  },
  {
    id: '2',
    title: '2024년 한국 스타트업 투자 트렌드: VC들이 주목하는 분야',
    excerpt: '글로벌 경기 침체에도 불구하고 한국 스타트업 투자는 어디로 향하고 있을까? 주요 VC들의 인사이트를 모았다.',
    author: { name: '박준형', avatar: '/avatars/author2.jpg' },
    category: '투자',
    cover_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
    published_at: '2024-01-12',
    reading_time: 8,
    is_premium: false,
  },
  {
    id: '3',
    title: 'AI 시대, 한국 스타트업의 기회와 도전',
    excerpt: 'ChatGPT 이후 급변하는 AI 생태계. 한국 스타트업들은 어떻게 대응하고 있을까? 주요 사례들을 분석한다.',
    author: { name: '이서연', avatar: '/avatars/author3.jpg' },
    category: '테크',
    cover_image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    published_at: '2024-01-10',
    reading_time: 10,
    is_premium: true,
  },
]

export default function FeaturedPosts() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            주목할 만한 콘텐츠
          </h2>
          <p className="text-lg text-gray-600">
            이번 주 가장 많은 사랑을 받은 글들을 만나보세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockFeaturedPosts.map((post) => (
            <article
              key={post.id}
              className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <Link href={`/blog/${post.id}`}>
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {post.is_premium && (
                    <div className="absolute top-4 right-4 bg-founder-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                      Premium
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-xs font-medium text-founder-primary">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(post.published_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-founder-primary transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-600 line-clamp-2 mb-4">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                      <span className="text-sm text-gray-700">{post.author.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {post.reading_time}분 읽기
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Link
            href="/blog"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            모든 글 보기
          </Link>
        </div>
      </div>
    </section>
  )
}