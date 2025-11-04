'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { StoryCard } from '@/components/cards/StoryCard';

interface PostMeta {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  category: string;
  publishedAt?: string;
  readingTime?: number;
}

interface LatestStoriesInfiniteProps {
  initialStories: PostMeta[];
}

export function LatestStoriesInfinite({ initialStories }: LatestStoriesInfiniteProps) {
  const [stories, setStories] = useState<PostMeta[]>(initialStories);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      // TODO: 실제 API 호출로 교체
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay

      // Mock: 더미 데이터 추가
      const newStories: PostMeta[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${stories.length + i + 1}`,
        slug: `story-${stories.length + i + 1}`,
        title: `추가 스토리 ${stories.length + i + 1}: 창업가를 위한 인사이트`,
        excerpt: '더 많은 창업 인사이트와 성장 스토리를 만나보세요.',
        category: ['인사이트', '사례', '트렌드'][i % 3],
        publishedAt: 'Oct 20',
        readingTime: 8 + (i % 5),
      }));

      setStories(prev => [...prev, ...newStories]);
      setPage(prev => prev + 1);

      // Mock: 3페이지 이후 더 이상 로드 안함
      if (page >= 3) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMore();
    }
  }, [inView, hasMore, isLoading]);

  return (
    <section className="py-12 px-6">
      <div className="max-w-[680px] mx-auto">
        <h2 className="text-3xl font-bold text-ink-900 mb-8">
          Latest
        </h2>

        <div className="space-y-0">
          {stories.map((story) => (
            <StoryCard key={story.id} post={story} />
          ))}
        </div>

        {/* Intersection Observer Trigger */}
        {hasMore && (
          <div ref={ref} className="py-8 text-center">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-ink-600">
                <div className="w-5 h-5 border-2 border-green-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">더 많은 스토리 불러오는 중...</span>
              </div>
            )}
          </div>
        )}

        {!hasMore && (
          <div className="py-8 text-center text-sm text-ink-500">
            모든 스토리를 확인하셨습니다.
          </div>
        )}
      </div>
    </section>
  );
}
