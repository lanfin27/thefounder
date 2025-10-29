// BLACKPINK 채널의 카테고리 확인 및 수정
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// ✅ Admin client 사용 (RLS 우회)
const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL,
  process.env.YT_SUPABASE_SERVICE_KEY,  // Admin key!
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function fixBlackpinkCategory() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Checking BLACKPINK Category');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: BLACKPINK 채널 조회
    const { data: channels, error: channelError } = await supabase
      .from('youtube_channels')
      .select('*')
      .ilike('name', '%BLACKPINK%');

    if (channelError || !channels || channels.length === 0) {
      console.error('❌ BLACKPINK channel not found!');
      process.exit(1);
    }

    const blackpink = channels[0];
    console.log('📺 Found BLACKPINK:');
    console.log(`   Channel ID: ${blackpink.channel_id}`);
    console.log(`   Name: ${blackpink.name}`);
    console.log(`   Current Category Code: ${blackpink.category_code}`);
    console.log();

    // Step 2: 현재 카테고리 정보 조회
    const { data: currentCategory } = await supabase
      .from('youtube_categories')
      .select('*')
      .eq('code', blackpink.category_code)
      .single();

    if (currentCategory) {
      console.log('📋 Current Category:');
      console.log(`   Code: ${currentCategory.code}`);
      console.log(`   Name: ${currentCategory.name}`);
      console.log(`   Icon: ${currentCategory.emoji || currentCategory.icon}`);
      console.log();
    }

    // Step 3: BLACKPINK는 음악 카테고리여야 함!
    const CORRECT_CATEGORY = 'Y10';  // 음악

    if (blackpink.category_code !== CORRECT_CATEGORY) {
      console.log('⚠️ BLACKPINK is in WRONG category!');
      console.log(`   Current: ${blackpink.category_code} (${currentCategory.name})`);
      console.log(`   Correct: ${CORRECT_CATEGORY} (음악)`);
      console.log();

      console.log('🔄 Fixing BLACKPINK category...\n');

      // 자동 수정
      const { error: updateError } = await supabase
        .from('youtube_channels')
        .update({
          category_code: CORRECT_CATEGORY,
          updated_at: new Date().toISOString(),
        })
        .eq('channel_id', blackpink.channel_id);

      if (updateError) {
        console.error('❌ Update failed:', updateError);
        process.exit(1);
      }

      console.log('✅ BLACKPINK category updated!');
      console.log(`   ${blackpink.category_code} (${currentCategory.name}) → ${CORRECT_CATEGORY} (음악)`);
      console.log();

      // 새로운 카테고리 정보 조회
      const { data: newCategory } = await supabase
        .from('youtube_categories')
        .select('*')
        .eq('code', CORRECT_CATEGORY)
        .single();

      console.log('📋 New Category:');
      console.log(`   Code: ${newCategory.code}`);
      console.log(`   Name: ${newCategory.name}`);
      console.log(`   Icon: ${newCategory.emoji || newCategory.icon}`);
    } else {
      console.log('✅ BLACKPINK is already in correct category!');
      console.log(`   Category: ${currentCategory.name} (${currentCategory.emoji || currentCategory.icon})`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Check complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
}

fixBlackpinkCategory();
