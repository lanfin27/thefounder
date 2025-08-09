const path = require('path');
const fs = require('fs');

console.log('📊 Analyzing The Founder Project Database Status');
console.log('=' .repeat(60));

// Check database files
const databases = [
  { name: 'flippa_baseline.db', path: path.join(__dirname, '..', 'data', 'flippa_baseline.db') },
  { name: 'flippa_baseline_large.db', path: path.join(__dirname, '..', 'data', 'flippa_baseline_large.db') }
];

console.log('\n📁 Database Files:');
databases.forEach(db => {
  if (fs.existsSync(db.path)) {
    const stats = fs.statSync(db.path);
    console.log(`  ✅ ${db.name}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.log(`  ❌ ${db.name}: Not found`);
  }
});

// Try to connect and count records
try {
  const Database = require('better-sqlite3');
  
  databases.forEach(db => {
    if (fs.existsSync(db.path)) {
      try {
        const database = new Database(db.path, { readonly: true });
        
        // Get table names
        const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        console.log(`\n📋 Tables in ${db.name}:`, tables.map(t => t.name).join(', '));
        
        // Check listings table
        const listingsTable = tables.find(t => t.name === 'listings');
        if (listingsTable) {
          const count = database.prepare("SELECT COUNT(*) as count FROM listings").get();
          console.log(`  📈 Total listings: ${count.count}`);
          
          // Get sample data
          const sample = database.prepare("SELECT * FROM listings LIMIT 3").all();
          console.log(`  📄 Sample listing:`, Object.keys(sample[0] || {}).join(', '));
        }
        
        database.close();
      } catch (error) {
        console.log(`  ❌ Error reading ${db.name}:`, error.message);
      }
    }
  });
} catch (error) {
  console.log('\n⚠️  better-sqlite3 not available, checking with basic fs');
  
  // Basic file check
  const dbPath = path.join(__dirname, '..', 'data', 'flippa_baseline.db');
  if (fs.existsSync(dbPath)) {
    console.log(`\n✅ Database file exists at: ${dbPath}`);
    console.log(`   Size: ${(fs.statSync(dbPath).size / 1024 / 1024).toFixed(2)} MB`);
  }
}

// Check Supabase connection
console.log('\n🌐 Supabase Configuration:');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
  console.log(`  URL: ${supabaseUrl ? '✅ Configured' : '❌ Not found'}`);
} else {
  console.log('  ❌ .env.local not found');
}