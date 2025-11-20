const fs = require('fs');
const path = require('path');

const ULTIMATE_FIX = `'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ThumbsUp, MessageCircle } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  excerpt?: string;
  content?: string;
  category: string;
  categoryLabel?: string;
  publishedDate: string;
  coverImage?: string;
  clapsCount?: number;
  commentsCount?: number;
  readTime?: number;
}

interface LatestPostsProps {
  posts: BlogPost[];
}

function parsePostContent(post: BlogPost): {
  title: string;
  excerpt: string;
} {
  const postId = post.id.substring(0, 8);

  // Case 1: summary 필드가 이미 있는 경우
  if (post.summary && post.summary.trim()) {
    console.log(\`✅ [\${postId}] Case 1: Using summary field\`);
    return {
      title: post.title,
      excerpt: post.summary.trim()
    };
  }

  const titleText = post.title;

  // Case 2: 줄바꿈으로 분리 시도
  const lines = titleText.split('\\n').filter(line => line.trim());
  if (lines.length > 1) {
    const result = {
      title: lines[0].trim(),
      excerpt: lines.slice(1).join(' ').trim()
    };
    console.log(\`✅ [\${postId}] Case 2: Split by newline\`);
    return result;
  }

  // Case 3: 특수문자로 구분 시도
  const separators = ['」', '。', '. '];
  for (const sep of separators) {
    if (titleText.includes(sep)) {
      const firstIndex = titleText.indexOf(sep);
      const beforeSep = titleText.substring(0, firstIndex + (sep === '」' ? 1 : 0)).trim();
      const afterSep = titleText.substring(firstIndex + sep.length).trim();

      if (beforeSep.length < 100 && afterSep.length > 0) {
        console.log(\`✅ [\${postId}] Case 3: Split by separator "\${sep}"\`);
        return {
          title: beforeSep,
          excerpt: afterSep
        };
      }
    }
  }

  // Case 4: content에서 추출
  if (post.content && post.content.trim()) {
    const cleanContent = post.content
      .replace(/<[^>]*>/g, '')
      .replace(/\\s+/g, ' ')
      .trim();

    if (cleanContent.length > 0) {
      console.log(\`✅ [\${postId}] Case 4: Extract from content\`);

      if (titleText.length > 80) {
        return {
          title: titleText.substring(0, 80) + '...',
          excerpt: cleanContent.substring(0, 150) + '...'
        };
      }

      return {
        title: titleText,
        excerpt: cleanContent.substring(0, 150) + '...'
      };
    }
  }

  // Case 5: 제목만 사용
  console.warn(\`⚠️ [\${postId}] Case 5: No excerpt available, title only\`);
  return {
    title: titleText,
    excerpt: ''
  };
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return \`\${month}월 \${day}일\`;
  } catch (error) {
    return '';
  }
}

export function LatestPosts({ posts }: LatestPostsProps) {
  console.log('🟢 LatestPosts - FLEX GAP 최종 버전 2025-11-17!');
  console.log(\`📊 Posts: \${posts.length}\`);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-3xl font-bold">Latest</h2>
        <Link
          href="/posts"
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="space-y-6">
        {posts.map((post) => {
          const { title, excerpt } = parsePostContent(post);
          const excerptLength = excerpt.trim().length;
          console.log(\`📝 Post: \${post.id.substring(0, 8)} | title: \${title.substring(0, 30)}... | excerptLength: \${excerptLength} | coverImage: \${post.coverImage ? '✅' : '❌'}\`);

          return (
            <article key={post.id}>
              <Link href={\`/posts/\${post.slug}\`} className="block group">
                {/* 🔴 모바일 레이아웃 - FLEX-DIRECTION + GAP */}
                <div className="block md:hidden">
                  <div className="flex gap-3">
                    {/* 🔴 핵심: flex-direction: column + gap */}
                    <div
                      className="flex-1 min-w-0"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {/* 제목 */}
                      <h3
                        className="text-base font-semibold leading-tight text-gray-900 group-hover:text-blue-600 transition-colors"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {title}
                      </h3>

                      {/* 발췌문 */}
                      {excerpt && excerpt.trim() && (
                        <p
                          className="text-sm leading-relaxed text-gray-600"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {excerpt}
                        </p>
                      )}

                      {/* 메타 정보 - 추가 간격 */}
                      <div
                        className="flex flex-col gap-0.5"
                        style={{
                          marginTop: '4px'
                        }}
                      >
                        {/* 줄 1: 카테고리 + 날짜 */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="inline-block max-w-[80px] font-medium truncate">
                            {post.categoryLabel || post.category}
                          </span>
                          <span className="text-gray-400">·</span>
                          <time className="whitespace-nowrap flex-shrink-0">
                            {formatDate(post.publishedDate)}
                          </time>
                        </div>

                        {/* 줄 2: 읽기 시간 + 상호작용 (있을 경우만) */}
                        {(post.readTime || post.clapsCount > 0 || post.commentsCount > 0) && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {post.readTime && (
                              <>
                                <span>{post.readTime}분</span>
                                {(post.clapsCount > 0 || post.commentsCount > 0) && (
                                  <span className="text-gray-400">·</span>
                                )}
                              </>
                            )}
                            {post.clapsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ThumbsUp className="w-3 h-3" />
                                {post.clapsCount}
                              </span>
                            )}
                            {post.commentsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageCircle className="w-3 h-3" />
                                {post.commentsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 이미지 */}
                    <div className="flex-shrink-0 w-20 h-20">
                      {post.coverImage ? (
                        <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-100">
                          <Image
                            src={post.coverImage}
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="80px"
                            onError={(e) => {
                              console.log('⚠️ 이미지 로드 실패:', post.coverImage);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-md bg-gray-100 flex items-center justify-center">
                          <span className="text-xs text-gray-400">No Image</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 데스크톱 레이아웃 (768px 이상) */}
                <div className="hidden md:block">
                  <div className="flex gap-4">
                    {/* 텍스트 영역 */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* 제목 - 2줄까지 */}
                      <h3 className="text-base font-semibold leading-snug text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {title}
                      </h3>

                      {/* 발췌문 - 2줄 */}
                      {excerpt && excerpt.trim() && (
                        <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">
                          {excerpt}
                        </p>
                      )}

                      {/* 메타 정보 */}
                      <div className="space-y-1 pt-1">
                        {/* 줄 1: 카테고리 + 날짜 */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="inline-block max-w-[140px] font-medium truncate">
                            {post.categoryLabel || post.category}
                          </span>
                          <span className="text-gray-400">·</span>
                          <time className="whitespace-nowrap flex-shrink-0">
                            {formatDate(post.publishedDate)}
                          </time>
                        </div>

                        {/* 줄 2: 읽기 시간 + 상호작용 */}
                        {(post.readTime || post.clapsCount > 0 || post.commentsCount > 0) && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {post.readTime && (
                              <>
                                <span>{post.readTime}분 읽기</span>
                                {(post.clapsCount > 0 || post.commentsCount > 0) && (
                                  <span className="text-gray-400">·</span>
                                )}
                              </>
                            )}
                            {post.clapsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ThumbsUp className="w-3 h-3" />
                                {post.clapsCount}
                              </span>
                            )}
                            {post.commentsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageCircle className="w-3 h-3" />
                                {post.commentsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 데스크톱 이미지 */}
                    <div className="flex-shrink-0 w-24 h-24">
                      {post.coverImage ? (
                        <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-100">
                          <Image
                            src={post.coverImage}
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="96px"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-md bg-gray-100"></div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
`;

console.log('🔧 FLEX GAP 최종 버전 생성 중...\n');

const filePath = path.join(process.cwd(), 'src', 'components', 'sections', 'LatestPosts.tsx');

// 백업
if (fs.existsSync(filePath)) {
  const backupPath = filePath + '.backup-flex-gap';
  fs.copyFileSync(filePath, backupPath);
  console.log(`💾 백업 생성: ${backupPath}`);
}

// 수정
fs.writeFileSync(filePath, ULTIMATE_FIX, 'utf-8');
console.log(`✅ 파일 수정 완료: ${filePath}`);

// 검증
const content = fs.readFileSync(filePath, 'utf-8');
console.log('\n🔍 검증:');
console.log('  FLEX GAP 버전:', content.includes('FLEX GAP 최종 버전') ? '✅' : '❌');
console.log('  flexDirection:', content.includes("flexDirection: 'column'") ? '✅' : '❌');
console.log('  gap 8px:', content.includes("gap: '8px'") ? '✅' : '❌');
console.log('  marginTop 4px:', content.includes("marginTop: '4px'") ? '✅' : '❌');

// 중요 코드 라인 확인
const lines = content.split('\n');
console.log('\n📄 중요 코드 라인:');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('flexDirection') || lines[i].includes("gap: '8px'")) {
    console.log(`  Line ${i + 1}: ${lines[i].trim()}`);
  }
}

console.log('\n✅ FLEX GAP 최종 버전 생성 완료!');
