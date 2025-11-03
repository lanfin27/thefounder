'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

const recommendedTopics = [
  '스타트업',
  'AI',
  '마케팅',
  'SaaS',
  '부트스트래핑',
  '그로스해킹',
  '콘텐츠'
]

const authorsToFollow = [
  { name: '김창업', bio: '연속 창업가, 3번의 Exit 경험', avatar: '/avatars/1.jpg' },
  { name: '이스타트', bio: 'B2B SaaS 전문가', avatar: '/avatars/2.jpg' },
  { name: '박마케팅', bio: '그로스 마케터, 전 토스 마케팅 리드', avatar: '/avatars/3.jpg' }
]

const footerLinks = [
  { label: 'Help', href: '/help' },
  { label: 'Status', href: '/status' },
  { label: 'About', href: '/about' },
  { label: 'Careers', href: '/careers' },
  { label: 'Press', href: '/press' },
  { label: 'Blog', href: '/blog' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' }
]

export default function SidebarContent() {
  return (
    <div className="space-y-10">
      {/* Recommended Topics */}
      <section>
        <h3
          className="font-semibold mb-4 text-sm"
          style={{ color: 'var(--ink-900)' }}
        >
          Recommended topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {recommendedTopics.map(topic => (
            <button
              key={topic}
              className="px-4 py-2 rounded-full text-sm transition-colors hover:bg-[var(--surface-100)]"
              style={{
                backgroundColor: 'var(--surface-50)',
                color: 'var(--ink-700)'
              }}
            >
              {topic}
            </button>
          ))}
        </div>
        <Link href="/explore/topics">
          <button
            className="mt-4 text-sm font-medium hover:text-[var(--primary-600)] transition-colors"
            style={{ color: 'var(--success)' }}
          >
            See more topics
          </button>
        </Link>
      </section>

      {/* Who to follow */}
      <section>
        <h3
          className="font-semibold mb-4 text-sm"
          style={{ color: 'var(--ink-900)' }}
        >
          Who to follow
        </h3>
        <div className="space-y-4">
          {authorsToFollow.map(author => (
            <div key={author.name} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--surface-100)' }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium text-sm mb-1"
                    style={{ color: 'var(--ink-900)' }}
                  >
                    {author.name}
                  </div>
                  <div
                    className="text-xs line-clamp-2"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    {author.bio}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 text-sm px-4 py-1"
              >
                Follow
              </Button>
            </div>
          ))}
        </div>
        <Link href="/explore/people">
          <button
            className="mt-4 text-sm font-medium hover:text-[var(--primary-600)] transition-colors"
            style={{ color: 'var(--success)' }}
          >
            See more suggestions
          </button>
        </Link>
      </section>

      {/* Recently Saved */}
      <section>
        <h3
          className="font-semibold mb-4 text-sm"
          style={{ color: 'var(--ink-900)' }}
        >
          Recently Saved
        </h3>
        <div className="space-y-3">
          <p
            className="text-sm"
            style={{ color: 'var(--ink-500)' }}
          >
            저장한 글이 없습니다. 관심있는 글을 북마크하여 나중에 읽어보세요.
          </p>
          <Link href="/me/list/saved">
            <button
              className="text-sm font-medium hover:text-[var(--primary-600)] transition-colors"
              style={{ color: 'var(--success)' }}
            >
              See all saved stories
            </button>
          </Link>
        </div>
      </section>

      {/* Footer Links */}
      <section className="pt-6 border-t" style={{ borderColor: 'var(--border-100)' }}>
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {footerLinks.map(link => (
            <Link key={link.label} href={link.href}>
              <button
                className="text-xs hover:text-[var(--ink-900)] transition-colors"
                style={{ color: 'var(--ink-500)' }}
              >
                {link.label}
              </button>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
