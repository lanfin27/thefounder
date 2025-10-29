// Supabase DB 스키마 확인 스크립트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL,
  process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY
);

async function checkSchema() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DB Schema Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: 테이블 존재 확인
    console.log('\n1️⃣ Testing youtube_channels table...');

    const { data, error } = await supabase
      .from('youtube_channels')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Table Error:', error.message);
      console.error('Full Error:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ Table exists but NO DATA found!');
      process.exit(0);
    }

    console.log('✅ Table exists with data!');

    // Step 2: 실제 컬럼명 확인
    console.log('\n2️⃣ Actual column names in DB:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const firstRow = data[0];
    const columns = Object.keys(firstRow);

    console.log('Total columns:', columns.length);
    console.log('\nColumn list:');
    columns.forEach((col, index) => {
      const value = firstRow[col];
      const valueStr = typeof value === 'string' ? `"${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"` : value;
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${col.padEnd(25)} (${typeof value}) = ${valueStr}`);
    });

    // Step 3: 중요 컬럼 확인
    console.log('\n3️⃣ Critical columns check:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const criticalColumns = [
      'id',
      'channel_id',
      'channel_title',
      'name',
      'title',
      'subscribers',
      'subscriber_count',
      'view_count',
      'views',
      'total_views',
      'video_count',
      'videos',
      'views_per_video',
      'category_code',
      'category',
      'created_at',
      'updated_at',
    ];

    console.log('\nChecking for common column name variations:');
    criticalColumns.forEach(col => {
      if (columns.includes(col)) {
        console.log(`  ✅ ${col.padEnd(25)}: EXISTS (value: ${firstRow[col]})`);
      } else {
        console.log(`  ❌ ${col.padEnd(25)}: NOT FOUND`);
      }
    });

    // Step 4: 샘플 데이터 출력
    console.log('\n4️⃣ Sample row data (JSON):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(firstRow, null, 2));

    // Step 5: 카테고리 테이블 확인
    console.log('\n5️⃣ Checking youtube_categories table...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { data: categories, error: catError } = await supabase
      .from('youtube_categories')
      .select('*')
      .limit(1);

    if (catError) {
      console.error('❌ Categories Error:', catError.message);
    } else if (categories && categories.length > 0) {
      console.log('✅ Categories table exists!');
      console.log('Columns:', Object.keys(categories[0]).join(', '));
      console.log('\nSample category:');
      console.log(JSON.stringify(categories[0], null, 2));
    }

    // Step 6: 총 데이터 수 확인
    console.log('\n6️⃣ Data counts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { count: channelsCount, error: countError } = await supabase
      .from('youtube_channels')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✅ Total channels: ${channelsCount}`);
    }

    const { count: categoriesCount, error: catCountError } = await supabase
      .from('youtube_categories')
      .select('*', { count: 'exact', head: true });

    if (!catCountError) {
      console.log(`✅ Total categories: ${categoriesCount}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Schema check complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Next steps:');
    console.log('1. Check the "Critical columns check" section above');
    console.log('2. Use the ACTUAL column names (marked with ✅) in your code');
    console.log('3. Update page.tsx files to use correct column names\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Check .env.local file exists');
    console.error('2. Verify NEXT_PUBLIC_YT_SUPABASE_URL is set');
    console.error('3. Verify NEXT_PUBLIC_YT_SUPABASE_ANON_KEY is set');
    process.exit(1);
  }
}

checkSchema();
