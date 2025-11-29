import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Fetch all homepage configs
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data, error } = await supabase
      .from('homepage_config')
      .select('*')
      .eq('is_active', true)
      .order('config_type');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching homepage config:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Update homepage config
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    const { config_type, selected_posts, display_order } = body;

    // Validate required fields
    if (!config_type || !selected_posts) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: config_type, selected_posts'
      }, { status: 400 });
    }

    // Check admin permission
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Forbidden: Admin access required'
      }, { status: 403 });
    }

    // Upsert config (update if exists, insert if not)
    const { data, error } = await supabase
      .from('homepage_config')
      .upsert({
        config_type,
        selected_posts,
        display_order: display_order || selected_posts.map((_: any, idx: number) => idx),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'config_type'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error saving homepage config:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Remove posts from config
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const config_type = searchParams.get('config_type');

    if (!config_type) {
      return NextResponse.json({
        success: false,
        error: 'Missing config_type parameter'
      }, { status: 400 });
    }

    // Check admin permission
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Clear selected posts for this config type
    const { data, error } = await supabase
      .from('homepage_config')
      .update({
        selected_posts: [],
        display_order: [],
        updated_by: user.id
      })
      .eq('config_type', config_type)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error deleting homepage config:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
