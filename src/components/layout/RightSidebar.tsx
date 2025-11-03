'use client';

import Link from 'next/link';

const recommendedTopics = [
  'Programming',
  'Self Improvement',
  'Data Science',
  'Writing',
  'Relationships',
  'Technology',
  'Cryptocurrency',
  'Startup',
];

const featuredPosts = [
  {
    id: '1',
    title: '"Can\'t believe I\'m just a dateline to my friends."',
  },
  {
    id: '2',
    title: 'How to build a successful startup in 2025',
  },
  {
    id: '3',
    title: 'The future of AI and machine learning',
  },
];

export function RightSidebar() {
  return (
    <aside className="hidden xl:block w-[368px] border-l border-divider bg-white overflow-y-auto flex-shrink-0">
      <div className="py-10 px-8">
        {/* Featured Posts */}
        <section className="mb-10">
          <h2 className="text-caption font-semibold text-ink-900 mb-4">
            Featured
          </h2>
          <div className="space-y-5">
            {featuredPosts.map((post, index) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="block group"
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl font-serif font-bold text-ink-200 mt-1">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="avatar-medium w-5 h-5 bg-green-primary" />
                      <span className="text-tiny text-ink-900 font-medium">
                        The Founder
                      </span>
                    </div>
                    <h3 className="text-small font-bold text-ink-900 group-hover:underline line-clamp-2">
                      {post.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/featured"
            className="text-tiny text-green-primary hover:text-green-hover mt-4 inline-block"
          >
            See all featured
          </Link>
        </section>

        {/* Recommended topics */}
        <section className="mb-10">
          <h2 className="text-caption font-semibold text-ink-900 mb-4">
            Recommended topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {recommendedTopics.map((topic) => (
              <Link
                key={topic}
                href={`/tag/${topic.toLowerCase()}`}
                className="px-4 py-2 bg-ink-100 hover:bg-ink-200 rounded-full text-tiny text-ink-900 transition-colors"
              >
                {topic}
              </Link>
            ))}
          </div>
          <Link
            href="/explore/topics"
            className="text-tiny text-green-primary hover:text-green-hover mt-4 inline-block"
          >
            See more topics
          </Link>
        </section>

        {/* Footer Links */}
        <footer className="border-t border-divider pt-6">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-tiny text-ink-600">
            <Link href="/help" className="hover:text-ink-900">Help</Link>
            <Link href="/about" className="hover:text-ink-900">About</Link>
            <Link href="/terms" className="hover:text-ink-900">Terms</Link>
            <Link href="/privacy" className="hover:text-ink-900">Privacy</Link>
          </div>
        </footer>
      </div>
    </aside>
  );
}
