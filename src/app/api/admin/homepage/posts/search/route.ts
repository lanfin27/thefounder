import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createRouteHandlerClient({ cookies });

    // Start building the query
    let queryBuilder = supabase
      .from('posts')
      .select('id, title, slug, excerpt, category, created_at, cover_image', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter if query provided
    if (query) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,excerpt.ilike.%${query}%`
      );
    }

    // Apply category filter if provided
    if (category && category !== 'all') {
      queryBuilder = queryBuilder.eq('category', category);
    }

    const { data, error, count } = await queryBuilder;

    if (error) throw error;

    // Transform data to match expected format
    const transformedData = data?.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      category: post.category,
      image_url: post.cover_image || null,
      created_at: post.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: count || 0,
      offset,
      limit
    });
  } catch (error: any) {
    console.error('Error searching posts:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Optional: Get categories for filter dropdown
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data, error } = await supabase
      .from('posts')
      .select('category')
      .eq('status', 'published');

    if (error) throw error;

    // Get unique categories
    const categories = Array.from(new Set(data?.map(p => p.category))).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
