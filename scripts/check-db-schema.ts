#!/usr/bin/env tsx

/**
 * Supabase 데이터베이스 스키마 확인 스크립트
 * 실행: npx tsx scripts/check-db-schema.ts
 */

// Load .env.local file
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkSchema() {
  console.log('🔍 Checking Supabase posts table schema...\n');

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

  try {
    // 테이블에서 샘플 데이터 가져오기
    console.log('📡 Fetching sample data from posts table...\n');

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying posts table:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️  Posts table is empty');
      console.log('   The table exists but contains no data.');
      console.log('   Run a Notion sync to populate it.');
      return;
    }

    const samplePost = data[0];
    const columns = Object.keys(samplePost);

    console.log('✅ Posts table exists and has data');
    console.log(`📊 Total columns: ${columns.length}\n`);

    console.log('='.repeat(60));
    console.log('📋 Column names and types:\n');

    columns.forEach((col, idx) => {
      const value = samplePost[col];
      let type: string = typeof value;

      if (value === null) {
        type = 'null';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else if (value instanceof Date) {
        type = 'date';
      }

      const preview = value === null
        ? 'null'
        : Array.isArray(value)
          ? `[${value.length} items]`
          : type === 'string' && value.length > 50
            ? `"${value.substring(0, 50)}..."`
            : type === 'string'
              ? `"${value}"`
              : String(value);

      console.log(`  ${String(idx + 1).padStart(2)}. ${col.padEnd(20)} (${type.padEnd(8)}) = ${preview}`);
    });

    console.log('\n' + '='.repeat(60));

    // 필수 컬럼 확인
    const requiredColumns = [
      'id',
      'title',
      'slug',
      'content',
      'category',
      'status',
      'published_date',
      'updated_at'
    ];

    console.log('\n🔍 Checking required columns:\n');
    let allPresent = true;

    requiredColumns.forEach(col => {
      const exists = columns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      if (!exists) allPresent = false;
    });

    console.log('\n' + '='.repeat(60));

    if (allPresent) {
      console.log('✅ All required columns are present');
    } else {
      console.log('❌ Some required columns are missing');
      console.log('\n💡 Missing columns may cause sync failures.');
      console.log('   Check your Supabase table schema.');
    }

    // 샘플 데이터 통계
    console.log('\n📊 Sample Post Statistics:');
    console.log(`   - Title: "${samplePost.title}"`);
    console.log(`   - Slug: ${samplePost.slug}`);
    console.log(`   - Category: ${samplePost.category}`);
    console.log(`   - Status: ${samplePost.status}`);
    console.log(`   - Content length: ${samplePost.content?.length || 0} characters`);
    console.log(`   - Tags: ${samplePost.tags?.length || 0} tags`);
    console.log(`   - Published: ${samplePost.published_date}`);
    console.log(`   - Updated: ${samplePost.updated_at}`);

    console.log('\n='.repeat(60));

    // 전체 포스트 수 확인
    const { count, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\n📚 Total posts in database: ${count}`);
    }

    console.log('\n✅ Database schema check complete!');

  } catch (error) {
    console.error('\n❌ Exception occurred:');
    console.error(error);
    process.exit(1);
  }
}

checkSchema();
