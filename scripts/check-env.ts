#!/usr/bin/env tsx

/**
 * 환경변수 확인 스크립트
 * 실행: npx tsx scripts/check-env.ts
 */

// Load .env.local file
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

console.log('🔍 Checking environment variables...\n');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NOTION_TOKEN',
  'NOTION_DATABASE_ID'
];

let allPresent = true;
let hasIssues = false;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];

  if (value) {
    const previewLength = varName.includes('TOKEN') || varName.includes('KEY') ? 20 : 50;
    console.log(`✅ ${varName}:`);
    console.log(`   ${value.substring(0, previewLength)}...`);
    console.log(`   Length: ${value.length} characters`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allPresent = false;
    hasIssues = true;
  }
  console.log('');
});

console.log('='.repeat(60));

if (allPresent) {
  console.log('✅ All required environment variables are set');
  console.log('\n📋 Summary:');
  console.log(`   - NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') ? 'Valid Supabase URL' : 'Check URL format'}`);
  console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') ? 'Valid JWT format' : 'Check key format'}`);
  console.log(`   - NOTION_TOKEN: ${process.env.NOTION_TOKEN?.startsWith('secret_') ? 'Valid Notion token' : 'Check token format'}`);
  console.log(`   - NOTION_DATABASE_ID: ${process.env.NOTION_DATABASE_ID?.length === 32 ? 'Valid format' : 'Check ID length'}`);
} else {
  console.log('❌ Some environment variables are missing');
  console.log('\n💡 Tips:');
  console.log('   1. Check your .env.local file');
  console.log('   2. Restart your dev server after adding variables');
  console.log('   3. Make sure variable names match exactly');
  hasIssues = true;
}

console.log('='.repeat(60));

if (hasIssues) {
  process.exit(1);
}
