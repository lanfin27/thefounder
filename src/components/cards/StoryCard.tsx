import Link from 'next/link';
import { Bookmark } from 'lucide-react';

interface PostMeta {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  category: string;
  publishedAt?: string;
  readingTime?: number;
}

interface StoryCardProps {
  post: PostMeta;
}

export function StoryCard({ post }: StoryCardProps) {
  return (
    <article className="group pb-10 mb-10 border-b border-ink-100 last:border-0">
      <Link href={`/${post.category}/${post.slug}`}>
        {/* 제목만 표시 - 작성자 정보 완전 제거 */}
        <h3 className="text-[22px] lg:text-[26px] font-bold text-ink-900 mb-3 leading-tight group-hover:text-green-primary transition-colors">
          {post.title}
        </h3>
      </Link>

      {/* Excerpt */}
      {post.excerpt && (
        <p className="text-[15px] lg:text-base text-ink-700 mb-4 line-clamp-2">
          {post.excerpt}
        </p>
      )}

      {/* Meta - 작성자 제거 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[13px] text-ink-600">
          <span className="badge-medium">{post.category}</span>
          {post.publishedAt && <span>{post.publishedAt}</span>}
          {post.readingTime && (
            <>
              <span>·</span>
              <span>{post.readingTime}분 읽기</span>
            </>
          )}
        </div>

        {/* Bookmark */}
        <button
          className="p-2 -mr-2 rounded-full hover:bg-ink-100 transition-colors"
          aria-label="Bookmark"
        >
          <Bookmark className="h-5 w-5 text-ink-600" />
        </button>
      </div>
    </article>
  );
}
