import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Check Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Check Admin Role
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // 3. Get Post IDs from body
        const { postIds } = await request.json();

        if (!Array.isArray(postIds) || postIds.length === 0) {
            return NextResponse.json({ error: 'Invalid request: postIds array required' }, { status: 400 });
        }

        // 4. Delete Posts using Service Role (Bypass RLS)
        const { createServiceClient } = await import('@/lib/supabase/service');
        const serviceClient = createServiceClient();

        const { error: deleteError, count } = await serviceClient
            .from('posts')
            .delete({ count: 'exact' })
            .in('id', postIds);

        if (deleteError) {
            console.error('Error deleting posts:', deleteError);
            return NextResponse.json({ error: 'Failed to delete posts' }, { status: 500 });
        }

        console.log(`Deleted ${count} posts`);

        if (count === 0) {
            console.warn('⚠️ No posts were deleted. Check if IDs exist.');
        }

        return NextResponse.json({ success: true, count });

    } catch (error) {
        console.error('Unexpected error in delete posts API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
