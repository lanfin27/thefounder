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
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Featured large post */}
          {mockFeaturedPosts[0] && (
            <article className="lg:col-span-1 article-card group">
              <Link href={`/posts/${mockFeaturedPosts[0].id}`} className="block">
                <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden rounded-lg">
                  <Image
                    src={mockFeaturedPosts[0].cover_image}
                    alt={mockFeaturedPosts[0].title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {mockFeaturedPosts[0].is_premium && (
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium text-white bg-medium-green">
                      Premium
                    </div>
                  )}
                </div>
                
                <div className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-caption font-medium text-medium-green">
                      {mockFeaturedPosts[0].category}
                    </span>
                    <span className="text-caption text-medium-black-tertiary">
                      {formatDistanceToNow(new Date(mockFeaturedPosts[0].published_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </div>
                  
                  <h2 className="text-heading-3 font-serif text-medium-black mb-3 line-clamp-2 group-hover:text-medium-green transition-colors text-korean">
                    {mockFeaturedPosts[0].title}
                  </h2>
                  
                  <p className="text-body-medium text-medium-black-secondary line-clamp-3 mb-4 text-korean">
                    {mockFeaturedPosts[0].excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-medium-gray" />
                      <div>
                        <p className="text-body-small font-medium text-medium-black">
                          {mockFeaturedPosts[0].author.name}
                        </p>
                        <p className="text-caption text-medium-black-tertiary">
                          {mockFeaturedPosts[0].reading_time}분 읽기
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          )}

          {/* Side posts */}
          <div className="space-y-6">
            {mockFeaturedPosts.slice(1).map((post) => (
              <article key={post.id} className="article-card group">
                <Link href={`/posts/${post.id}`} className="flex gap-6">
                  <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={post.cover_image}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {post.is_premium && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium text-white bg-medium-green">
                        Premium
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-caption font-medium text-medium-green">
                        {post.category}
                      </span>
                      <span className="text-caption text-medium-black-tertiary">
                        {formatDistanceToNow(new Date(post.published_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    </div>
                    
                    <h3 className="text-heading-4 font-serif text-medium-black mb-2 line-clamp-2 group-hover:text-medium-green transition-colors text-korean">
                      {post.title}
                    </h3>
                    
                    <p className="text-body-small text-medium-black-secondary line-clamp-2 mb-3 text-korean">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-medium text-medium-black">
                        {post.author.name}
                      </span>
                      <span className="text-caption text-medium-black-tertiary">
                        · {post.reading_time}분 읽기
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>

        {/* More posts section */}
        <div className="mt-16 pt-16 border-t border-medium-gray-border">
          <h2 className="text-heading-3 font-serif text-medium-black mb-8 text-center">
            더 많은 인사이트
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockFeaturedPosts.map((post) => (
              <article key={post.id} className="article-card group">
                <Link href={`/posts/${post.id}`}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-medium-gray" />
                      <span className="text-body-small font-medium text-medium-black">
                        {post.author.name}
                      </span>
                    </div>
                    
                    <h3 className="text-heading-4 font-serif text-medium-black line-clamp-2 group-hover:text-medium-green transition-colors text-korean">
                      {post.title}
                    </h3>
                    
                    <p className="text-body-small text-medium-black-secondary line-clamp-3 text-korean">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center gap-3 text-caption text-medium-black-tertiary">
                      <span>{post.reading_time}분 읽기</span>
                      <span>·</span>
                      <span>
                        {formatDistanceToNow(new Date(post.published_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
        
        <div className="text-center mt-12">
          <Link
            href="/posts"
            className="btn-secondary text-body-small"
          >
            모든 글 보기
          </Link>
        </div>
      </div>
    </section>
  )
}