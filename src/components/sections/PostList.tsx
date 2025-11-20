import Link from 'next/link';
import Image from 'next/image';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { BlogPost } from '@/types';
import { CategorySlug } from '@/types/post';
import { parsePostContent } from '@/utils/content';
import BookmarkButton from '@/components/posts/BookmarkButton';

interface PostListProps {
    posts: BlogPost[];
    categorySlug?: CategorySlug; // Optional for general posts page
    emptyMessage?: string;
}

function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}월 ${day}일`;
    } catch (error) {
        return '';
    }
}

export default function PostList({ posts, categorySlug, emptyMessage }: PostListProps) {
    if (posts.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">
                    {emptyMessage || (categorySlug
                        ? `아직 게시된 ${categorySlug === 'trends' ? '트렌드' : categorySlug === 'insights' ? '인사이트' : categorySlug === 'cases' ? '사례' : '블로그'} 글이 없습니다.`
                        : '아직 게시된 글이 없습니다.')}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {posts.map((post) => {
                const { title, excerpt } = parsePostContent(post);

                return (
                    <article key={post.id} className="py-10 border-b border-gray-100 last:border-0 first:pt-2 group">
                        {/* 🔴 모바일 레이아웃 - 카드 형태 */}
                        <div className="block md:hidden">
                            <div className="flex flex-col gap-3">
                                {/* 이미지 */}
                                <Link href={`/posts/${post.slug}`} className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 block">
                                    {post.cover ? (
                                        <Image
                                            src={post.cover}
                                            alt={title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 300px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                            No Image
                                        </div>
                                    )}
                                </Link>

                                {/* 텍스트 영역 */}
                                <div className="flex flex-col gap-2">
                                    <Link href={`/posts/${post.slug}`} className="block">
                                        <h3 className="text-lg font-bold leading-snug text-gray-900 line-clamp-2">
                                            {title}
                                        </h3>
                                        {excerpt && excerpt.trim() && (
                                            <p className="text-sm leading-relaxed text-gray-600 line-clamp-2 mt-1">
                                                {excerpt}
                                            </p>
                                        )}
                                    </Link>

                                    {/* 메타 정보 & 북마크 */}
                                    <div className="flex justify-between items-end pt-1">
                                        <Link href={`/posts/${post.slug}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                                            <span className="font-medium text-gray-700">
                                                {post.categoryLabel || post.category}
                                            </span>
                                            <span className="text-gray-300">·</span>
                                            <time className="whitespace-nowrap">
                                                {formatDate(post.publishedDate)}
                                            </time>
                                            {post.readingTime && (
                                                <>
                                                    <span className="text-gray-300">·</span>
                                                    <span>{post.readingTime}분</span>
                                                </>
                                            )}
                                            {((post.clapsCount || 0) > 0 || (post.commentsCount || 0) > 0) && (
                                                <div className="flex items-center gap-2 ml-0.5">
                                                    {(post.clapsCount || 0) > 0 && (
                                                        <span className="flex items-center gap-0.5">
                                                            <ThumbsUp className="w-3 h-3" />
                                                            {post.clapsCount}
                                                        </span>
                                                    )}
                                                    {(post.commentsCount || 0) > 0 && (
                                                        <span className="flex items-center gap-0.5">
                                                            <MessageCircle className="w-3 h-3" />
                                                            {post.commentsCount}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </Link>

                                        {/* 북마크 버튼 */}
                                        <div className="z-10">
                                            <BookmarkButton postId={post.slug} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 데스크톱 레이아웃 (768px 이상) */}
                        <div className="hidden md:block">
                            <div className="flex gap-6 items-start">
                                {/* 텍스트 영역 */}
                                <div className="flex-1 min-w-0 space-y-3">
                                    <Link href={`/posts/${post.slug}`} className="block">
                                        <h3 className="text-xl lg:text-2xl font-bold leading-tight text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {title}
                                        </h3>
                                        {excerpt && excerpt.trim() && (
                                            <p
                                                className="text-base text-gray-600 line-clamp-2 leading-relaxed mt-3"
                                                style={{
                                                    maxHeight: '52px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}
                                            >
                                                {excerpt}
                                            </p>
                                        )}
                                    </Link>

                                    {/* 메타 정보 & 북마크 */}
                                    <div className="flex justify-between items-center pt-2">
                                        <Link href={`/posts/${post.slug}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                                            <span className="font-medium text-gray-700">
                                                {post.categoryLabel || post.category}
                                            </span>
                                            <span className="text-gray-300">·</span>
                                            <time className="whitespace-nowrap">
                                                {formatDate(post.publishedDate)}
                                            </time>
                                            {post.readingTime && (
                                                <>
                                                    <span className="text-gray-300">·</span>
                                                    <span>{post.readingTime}분 읽기</span>
                                                </>
                                            )}
                                            {((post.clapsCount || 0) > 0 || (post.commentsCount || 0) > 0) && (
                                                <div className="flex items-center gap-3 ml-1">
                                                    {(post.clapsCount || 0) > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <ThumbsUp className="w-3.5 h-3.5" />
                                                            {post.clapsCount}
                                                        </span>
                                                    )}
                                                    {(post.commentsCount || 0) > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                            {post.commentsCount}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </Link>

                                        {/* 북마크 버튼 */}
                                        <div className="z-10">
                                            <BookmarkButton postId={post.slug} />
                                        </div>
                                    </div>
                                </div>

                                {/* 이미지 */}
                                <Link href={`/posts/${post.slug}`} className="flex-shrink-0 w-40 h-28 lg:w-60 lg:h-40 block">
                                    {post.cover ? (
                                        <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-100">
                                            <Image
                                                src={post.cover}
                                                alt={title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                sizes="(max-width: 1024px) 160px, 240px"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full rounded-md bg-gray-100"></div>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
