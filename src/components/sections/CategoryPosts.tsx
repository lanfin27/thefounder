import { BlogPost } from '@/types';
import { CategorySlug } from '@/types/post';
import PostCardImageLeft from '@/components/posts/PostCardImageLeft';
import PostCardImageRight from '@/components/posts/PostCardImageRight';

interface CategoryPostsProps {
  posts: BlogPost[];
  layoutType: 'image-left' | 'image-right';
  categorySlug: CategorySlug;
}

export default function CategoryPosts({ posts, layoutType, categorySlug }: CategoryPostsProps) {
  console.log(`\n📄 [CategoryPosts] Rendering for category: "${categorySlug}"`);
  console.log(`📄 [CategoryPosts] Layout type: ${layoutType}`);
  console.log(`📄 [CategoryPosts] Posts count: ${posts.length}`);

  if (posts.length === 0) {
    console.warn(`⚠️  [CategoryPosts] No posts to display for "${categorySlug}"`);
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">아직 게시된 {categorySlug === 'trends' ? '트렌드' : categorySlug === 'insights' ? '인사이트' : categorySlug === 'cases' ? '사례' : '블로그'} 글이 없습니다.</p>
      </div>
    );
  }

  console.log(`✅ [CategoryPosts] Rendering ${posts.length} posts with "${layoutType}" layout`);
  posts.forEach((post, index) => {
    console.log(`  ${index + 1}. "${post.title}" (category: ${post.category})`);
  });

  return (
    <div className="space-y-8">
      {posts.map((post) => (
        <div key={post.id}>
          {layoutType === 'image-left' ? (
            <PostCardImageLeft post={post} />
          ) : (
            <PostCardImageRight post={post} />
          )}
          <div className="mt-8 border-b border-gray-200" />
        </div>
      ))}
    </div>
  );
}
