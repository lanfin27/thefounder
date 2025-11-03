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

const whoToFollow = [
  {
    id: '1',
    name: 'Will Lockett',
    role: 'Independent journalist',
  },
  {
    id: '2',
    name: 'ILLUMINATION',
    role: 'Publication',
  },
  {
    id: '3',
    name: 'The Startup',
    role: 'Publication',
  },
];

const staffPicks = [
  {
    id: '1',
    author: 'Author Name',
    title: '"Can\'t believe I\'m just a dateline to my friends."',
  },
  {
    id: '2',
    author: 'Jane Smith',
    title: 'How to build a successful startup in 2025',
  },
  {
    id: '3',
    author: 'John Doe',
    title: 'The future of AI and machine learning',
  },
];

export function RightSidebar() {
  return (
    <aside className="hidden xl:block w-80 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto py-10 px-6">
      {/* Staff Picks */}
      <section className="mb-10">
        <h2 className="text-caption font-semibold text-ink-900 mb-4">
          Staff Picks
        </h2>
        <div className="space-y-4">
          {staffPicks.map((pick) => (
            <Link
              key={pick.id}
              href={`/post/${pick.id}`}
              className="block group"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="avatar-medium w-5 h-5 bg-ink-300 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-tiny text-ink-900 font-medium">
                    {pick.author}
                  </p>
                </div>
              </div>
              <h3 className="text-caption font-bold text-ink-900 group-hover:underline line-clamp-2">
                {pick.title}
              </h3>
            </Link>
          ))}
        </div>
        <Link
          href="/explore"
          className="text-tiny text-green-primary hover:text-green-hover mt-4 inline-block"
        >
          See the full list
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

      {/* Who to follow */}
      <section className="mb-10">
        <h2 className="text-caption font-semibold text-ink-900 mb-4">
          Who to follow
        </h2>
        <div className="space-y-4">
          {whoToFollow.map((user) => (
            <div key={user.id} className="flex items-start justify-between">
              <Link href={`/user/${user.id}`} className="flex items-start gap-3 flex-1">
                <div className="avatar-medium w-8 h-8 bg-ink-300 flex-shrink-0" />
                <div>
                  <p className="text-small font-semibold text-ink-900">
                    {user.name}
                  </p>
                  <p className="text-tiny text-ink-600">
                    {user.role}
                  </p>
                </div>
              </Link>
              <button className="px-4 py-1 border border-ink-900 rounded-full text-tiny font-medium text-ink-900 hover:bg-ink-900 hover:text-white transition-colors">
                Follow
              </button>
            </div>
          ))}
        </div>
        <Link
          href="/explore/people"
          className="text-tiny text-green-primary hover:text-green-hover mt-4 inline-block"
        >
          See more suggestions
        </Link>
      </section>

      {/* Footer Links */}
      <footer className="border-t border-divider pt-6">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-tiny text-ink-600">
          <Link href="/help" className="hover:text-ink-900">Help</Link>
          <Link href="/about" className="hover:text-ink-900">About</Link>
          <Link href="/careers" className="hover:text-ink-900">Careers</Link>
          <Link href="/terms" className="hover:text-ink-900">Terms</Link>
          <Link href="/privacy" className="hover:text-ink-900">Privacy</Link>
        </div>
      </footer>
    </aside>
  );
}
