// 현재 DB의 카테고리 상태 상세 확인
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL,
  process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY
);

async function checkCurrentCategories() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Current Categories in DB');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const { data: categories, error } = await supabase
      .from('youtube_categories')
      .select('*')
      .order('code', { ascending: true });

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('📋 Current Categories:\n');
    categories.forEach(cat => {
      console.log(`${cat.code} | ${cat.emoji || cat.icon || '❓'} | "${cat.name}" | Desc: "${cat.description || 'N/A'}"`);
    });

    // 중복 아이콘 확인
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Checking for duplicate icons:\n');

    const iconMap = {};
    categories.forEach(cat => {
      const icon = cat.emoji || cat.icon;
      if (!iconMap[icon]) {
        iconMap[icon] = [];
      }
      iconMap[icon].push(`${cat.code} (${cat.name})`);
    });

    let hasDuplicates = false;
    Object.entries(iconMap).forEach(([icon, codes]) => {
      if (codes.length > 1) {
        console.log(`❌ Duplicate icon "${icon}": ${codes.join(', ')}`);
        hasDuplicates = true;
      }
    });

    if (!hasDuplicates) {
      console.log('✅ No duplicate icons found');
    }

    // BLACKPINK 확인
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Checking BLACKPINK:\n');

    const { data: blackpink } = await supabase
      .from('youtube_channels')
      .select('*')
      .ilike('name', '%BLACKPINK%')
      .single();

    if (blackpink) {
      const category = categories.find(cat => cat.code === blackpink.category_code);
      console.log('Channel:', blackpink.name);
      console.log('Category Code:', blackpink.category_code);
      console.log('Category Name:', category?.name || 'NOT FOUND');
      console.log('Category Icon:', category?.emoji || category?.icon || 'NOT FOUND');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
}

checkCurrentCategories();
