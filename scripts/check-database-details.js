const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

console.log('📊 Checking Database Details');
console.log('=' .repeat(60));

const dbPath = path.join(__dirname, '..', 'data', 'flippa_baseline.db');

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database not found at:', dbPath);
  process.exit(1);
}

try {
  const db = new Database(dbPath, { readonly: true });
  
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n📋 Tables found:', tables.map(t => t.name).join(', '));
  
  // Check each table for records
  tables.forEach(table => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`\n📊 Table: ${table.name}`);
      console.log(`   Records: ${count.count}`);
      
      // Get columns
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log(`   Columns: ${columns.map(c => c.name).join(', ')}`);
      
      // Get sample record
      if (count.count > 0) {
        const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 1`).get();
        console.log(`   Sample fields:`, Object.keys(sample));
      }
    } catch (error) {
      console.log(`   Error reading table ${table.name}:`, error.message);
    }
  });
  
  // Specific check for listings
  const listingsTable = tables.find(t => t.name.includes('listing'));
  if (listingsTable) {
    console.log(`\n✅ Main listings table: ${listingsTable.name}`);
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${listingsTable.name}`).get();
    console.log(`   Total listings: ${count.count}`);
  }
  
  db.close();
} catch (error) {
  console.error('Error:', error);
}