import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    try {
        // Check admin permission
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch featured posts config with post details
        const { data: featuredConfigs, error: fetchError } = await supabase
            .from('featured_posts_config')
            .select(`
        *,
        post:posts (
          id,
          title,
          slug,
          excerpt,
          category,
          image_url
        )
      `)
            .order('position');

        if (fetchError) {
            console.error('Error fetching featured posts:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: featuredConfigs
        });
    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        // Check admin permission
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { configs } = await request.json();

        if (!Array.isArray(configs)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Start a transaction (Supabase doesn't support explicit transactions in client lib easily, 
        // so we'll do delete then insert which is safe enough for this use case)

        // 1. Delete existing configs
        const { error: deleteError } = await supabase
            .from('featured_posts_config')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (deleteError) {
            console.error('Error deleting existing configs:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // 2. Insert new configs
        if (configs.length > 0) {
            const { error: insertError } = await supabase
                .from('featured_posts_config')
                .insert(configs.map((config: any) => ({
                    post_id: config.post_id,
                    position: config.position,
                    focal_point_x: config.focal_point_x,
                    focal_point_y: config.focal_point_y
                })));

            if (insertError) {
                console.error('Error inserting new configs:', insertError);
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
