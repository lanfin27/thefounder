// Quick API test for listings endpoint
require('dotenv').config({ path: '.env.local' });

const baseURL = 'http://localhost:3000';
const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';

console.log('Testing /api/listings endpoint...\n');

// Test with curl command
const curlCommand = `curl -s -w "\\nHTTP Status: %{http_code}\\n" -H "x-admin-token: ${adminToken}" "${baseURL}/api/listings?limit=5"`;

console.log('Run this command to test the endpoint:');
console.log(curlCommand);

console.log('\n\nOr use this PowerShell command:');
console.log(`Invoke-WebRequest -Uri "${baseURL}/api/listings?limit=5" -Headers @{"x-admin-token"="${adminToken}"} | Select-Object StatusCode, Content`);

console.log('\n\nExpected response:');
console.log('- Status: 200');
console.log('- Body: JSON with listings, pagination, categories, and summary');
console.log('\nIf you get a 500 error, check the Next.js console for detailed error messages.');