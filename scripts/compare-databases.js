const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

console.log('📊 Comparing SQLite vs Supabase Data');
console.log('=' .repeat(60));

async function compareData() {
  // SQLite Data
  console.log('\n📁 SQLite Database (flippa_baseline.db):');
  try {
    const dbPath = path.join(__dirname, '..', 'data', 'flippa_baseline.db');
    const db = new Database(dbPath, { readonly: true });
    
    const sqliteCount = db.prepare('SELECT COUNT(*) as count FROM baseline_listings').get();
    console.log(`  ✅ Total records: ${sqliteCount.count}`);
    
    const categories = db.prepare('SELECT DISTINCT category FROM baseline_listings').all();
    console.log(`  📊 Categories: ${categories.length} unique`);
    
    const priceRange = db.prepare('SELECT MIN(price) as min, MAX(price) as max FROM baseline_listings WHERE price > 0').get();
    console.log(`  💰 Price range: $${priceRange.min} - $${priceRange.max}`);
    
    db.close();
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Supabase Data
  console.log('\n☁️  Supabase Database (flippa_listings):');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { count, error } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    console.log(`  ${count > 0 ? '✅' : '❌'} Total records: ${count || 0}`);
    
    if (count > 0) {
      const { data: categories } = await supabase
        .from('flippa_listings')
        .select('category')
        .limit(1000);
      
      const uniqueCategories = [...new Set(categories.map(c => c.category))];
      console.log(`  📊 Categories: ${uniqueCategories.length} unique`);
    } else {
      console.log(`  ⚠️  No data to analyze`);
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('1. Run migration: node scripts/migrate-sqlite-to-supabase-adaptive.js');
  console.log('2. Use fixed page: /admin/scraping-status-fixed');
  console.log('3. Or update original page to use /api/scraping/database-stats');
}

compareData();