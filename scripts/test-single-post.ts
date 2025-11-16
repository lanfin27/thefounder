#!/usr/bin/env tsx

/**
 * 단일 포스트 저장 테스트 스크립트
 * 실행: npx tsx scripts/test-single-post.ts
 */

// Load .env.local file
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function testSinglePost() {
  console.log('🧪 Testing single post update...\n');

  // 환경변수 확인
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 테스트용 포스트 데이터
  const testPost = {
    id: 'test-' + Date.now(),
    title: '🧪 TEST POST - ' + new Date().toISOString(),
    slug: 'test-post-' + Date.now(),
    content: `
      <h2>Test Post</h2>
      <p>This is a test post created at ${new Date().toISOString()}</p>
      <ol>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ol>
      <p>This post was created by the test-single-post.ts script.</p>
    `,
    summary: 'This is a test post to verify database connectivity',
    category: 'Test',
    tags: ['test', 'debug'],
    status: 'published',
    published_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: 'Test Script',
    reading_time: 1,
    claps_count: 0,
    comments_count: 0,
    is_premium: false
  };

  console.log('📝 Test post data:');
  console.log('   ID:', testPost.id);
  console.log('   Title:', testPost.title);
  console.log('   Slug:', testPost.slug);
  console.log('   Category:', testPost.category);
  console.log('   Tags:', testPost.tags.join(', '));
  console.log('   Content length:', testPost.content.length, 'characters');
  console.log('');

  try {
    console.log('🚀 Upserting test post to Supabase...\n');

    const { data, error } = await supabase
      .from('posts')
      .upsert(testPost, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('❌ Upsert failed:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      process.exit(1);
    }

    console.log('✅ Test post saved successfully!\n');

    if (data && data.length > 0) {
      console.log('📊 Returned data:');
      const savedPost = data[0];
      console.log('   ID:', savedPost.id);
      console.log('   Title:', savedPost.title);
      console.log('   Slug:', savedPost.slug);
      console.log('   Updated at:', savedPost.updated_at);
      console.log('');
    }

    console.log('='.repeat(60));

    // 저장된 포스트 다시 조회
    console.log('\n🔍 Verifying saved post...\n');

    const { data: fetchedData, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', testPost.id)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch saved post:');
      console.error('   Message:', fetchError.message);
      process.exit(1);
    }

    console.log('✅ Post verified in database!');
    console.log('   Title:', fetchedData.title);
    console.log('   Content preview:', fetchedData.content.substring(0, 100) + '...');
    console.log('');

    console.log('='.repeat(60));

    // 정리 - 테스트 포스트 삭제
    console.log('\n🗑️  Cleaning up test post...\n');

    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', testPost.id);

    if (deleteError) {
      console.warn('⚠️  Failed to delete test post (you may need to delete it manually):');
      console.warn('   ID:', testPost.id);
      console.warn('   Message:', deleteError.message);
    } else {
      console.log('✅ Test post deleted successfully');
    }

    console.log('\n='.repeat(60));
    console.log('\n🎉 Database connectivity test PASSED!');
    console.log('   Your Supabase connection is working correctly.');
    console.log('   You can now proceed with Notion sync.\n');

  } catch (error) {
    console.error('\n❌ Exception occurred:');
    console.error(error);
    process.exit(1);
  }
}

testSinglePost();
