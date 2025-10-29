// 카테고리 동기화 상태 확인
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL,
  process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY
);

async function checkCategorySync() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Category Sync Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: 카테고리 테이블 확인
    console.log('\n1️⃣ Checking youtube_categories table...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { data: categories, error: catError } = await supabase
      .from('youtube_categories')
      .select('*')
      .order('code', { ascending: true });

    if (catError) {
      console.error('❌ Categories Error:', catError.message);
      process.exit(1);
    }

    console.log(`✅ Found ${categories.length} categories in DB`);
    console.log('\nCategory List:');
    categories.forEach((cat, index) => {
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. [${cat.code}] ${cat.icon || cat.emoji || '📁'} ${cat.name}`);
    });

    // Step 2: 채널 데이터 확인
    console.log('\n2️⃣ Checking youtube_channels table...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { data: channels, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('*')
      .order('subscribers', { ascending: false });

    if (channelsError) {
      console.error('❌ Channels Error:', channelsError.message);
      process.exit(1);
    }

    console.log(`✅ Found ${channels.length} channels in DB`);

    // Step 3: BANGTANTV 채널 상세 확인
    console.log('\n3️⃣ Checking BANGTANTV channel specifically...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const bangtanChannels = channels.filter(ch =>
      ch.name?.includes('BANGTAN') ||
      ch.channel_title?.includes('BANGTAN') ||
      ch.title?.includes('BANGTAN')
    );

    if (bangtanChannels.length === 0) {
      console.warn('⚠️ BANGTANTV channel NOT FOUND in database!');
    } else {
      console.log(`✅ Found ${bangtanChannels.length} matching channel(s):`);
      bangtanChannels.forEach((ch, index) => {
        console.log(`\n  Channel ${index + 1}:`);
        console.log(`    - ID: ${ch.id}`);
        console.log(`    - Channel ID: ${ch.channel_id}`);
        console.log(`    - Name: ${ch.name || ch.channel_title || ch.title || 'N/A'}`);
        console.log(`    - Category Code: ${ch.category_code || 'N/A'}`);
        console.log(`    - Subscribers: ${ch.subscribers?.toLocaleString() || 0}`);
        console.log(`    - Total Views: ${ch.total_views?.toLocaleString() || 0}`);
        console.log(`    - Status: ${ch.status || 'N/A'}`);
        console.log(`    - Active: ${ch.is_active}`);
        console.log(`    - Updated: ${ch.updated_at || 'N/A'}`);

        // 카테고리 매칭 확인
        const matchingCategory = categories.find(cat => cat.code === ch.category_code);
        if (matchingCategory) {
          console.log(`    - ✅ Category Match: [${matchingCategory.code}] ${matchingCategory.icon || matchingCategory.emoji || ''} ${matchingCategory.name}`);
        } else {
          console.log(`    - ❌ Category NOT FOUND for code: ${ch.category_code}`);
        }
      });
    }

    // Step 4: 카테고리별 채널 분포
    console.log('\n4️⃣ Channel distribution by category...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const categoryDistribution = {};
    categories.forEach(cat => {
      categoryDistribution[cat.code] = {
        name: cat.name,
        icon: cat.icon || cat.emoji || '📁',
        count: 0,
        channels: []
      };
    });

    // 카테고리 없는 채널 추적
    categoryDistribution['UNKNOWN'] = {
      name: 'Unknown/Unassigned',
      icon: '❓',
      count: 0,
      channels: []
    };

    channels.forEach(ch => {
      const code = ch.category_code || 'UNKNOWN';
      if (categoryDistribution[code]) {
        categoryDistribution[code].count++;
        categoryDistribution[code].channels.push({
          name: ch.name || ch.channel_title || ch.title || 'Unknown',
          subscribers: ch.subscribers || 0
        });
      } else {
        categoryDistribution['UNKNOWN'].count++;
        categoryDistribution['UNKNOWN'].channels.push({
          name: ch.name || ch.channel_title || ch.title || 'Unknown',
          subscribers: ch.subscribers || 0,
          invalidCode: code
        });
      }
    });

    // 분포 출력
    Object.entries(categoryDistribution)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([code, info]) => {
        if (info.count > 0) {
          console.log(`\n  [${code}] ${info.icon} ${info.name}: ${info.count} channels`);

          // 상위 3개 채널 표시
          const topChannels = info.channels
            .sort((a, b) => b.subscribers - a.subscribers)
            .slice(0, 3);

          topChannels.forEach((ch, index) => {
            const invalidCode = ch.invalidCode ? ` (Invalid code: ${ch.invalidCode})` : '';
            console.log(`    ${index + 1}. ${ch.name} - ${ch.subscribers.toLocaleString()} subscribers${invalidCode}`);
          });

          if (info.count > 3) {
            console.log(`    ... and ${info.count - 3} more`);
          }
        }
      });

    // Step 5: 데이터 일관성 검증
    console.log('\n5️⃣ Data consistency check...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const orphanChannels = channels.filter(ch => {
      if (!ch.category_code) return true;
      return !categories.some(cat => cat.code === ch.category_code);
    });

    if (orphanChannels.length === 0) {
      console.log('✅ All channels have valid category assignments');
    } else {
      console.log(`⚠️ Found ${orphanChannels.length} channels with invalid/missing categories:`);
      orphanChannels.forEach((ch, index) => {
        console.log(`  ${index + 1}. ${ch.name || ch.channel_title || 'Unknown'} - category_code: "${ch.category_code || 'NULL'}"`);
      });
    }

    // Step 6: 중복 카테고리 코드 확인
    console.log('\n6️⃣ Checking for duplicate category codes...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const categoryCodeCounts = {};
    categories.forEach(cat => {
      categoryCodeCounts[cat.code] = (categoryCodeCounts[cat.code] || 0) + 1;
    });

    const duplicates = Object.entries(categoryCodeCounts).filter(([code, count]) => count > 1);
    if (duplicates.length === 0) {
      console.log('✅ No duplicate category codes found');
    } else {
      console.log('❌ Found duplicate category codes:');
      duplicates.forEach(([code, count]) => {
        console.log(`  - Code "${code}" appears ${count} times`);
      });
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Categories: ${categories.length}`);
    console.log(`Total Channels: ${channels.length}`);
    console.log(`Channels with valid categories: ${channels.length - orphanChannels.length}`);
    console.log(`Orphan channels: ${orphanChannels.length}`);
    console.log(`Duplicate category codes: ${duplicates.length}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Category sync check complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Next steps:');
    console.log('1. Check the BANGTANTV channel details above');
    console.log('2. Verify the category_code matches expectations');
    console.log('3. Check for any orphan channels or invalid categories');
    console.log('4. Test the Admin and User pages to compare displayed categories\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Check .env.local file exists');
    console.error('2. Verify NEXT_PUBLIC_YT_SUPABASE_URL is set');
    console.error('3. Verify NEXT_PUBLIC_YT_SUPABASE_ANON_KEY is set');
    process.exit(1);
  }
}

checkCategorySync();
