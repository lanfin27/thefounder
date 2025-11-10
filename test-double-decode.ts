/**
 * Test to demonstrate double-decoding corruption
 */

// Simulating what happens with AWS security token
const originalToken = 'ASIAZI2LB4665PRNW3UW/20251110/us-west-2/s3/aws4_request'
console.log('\n🔍 Testing Double-Decoding Issue\n')
console.log('1. Original Token:', originalToken)

// Step 1: Token gets encoded when creating proxy URL
const encodedOnce = encodeURIComponent(originalToken)
console.log('2. Encoded once:', encodedOnce)

// Step 2: Browser encodes it AGAIN when making request
const encodedTwice = encodeURIComponent(encodedOnce)
console.log('3. Encoded twice (by browser):', encodedTwice)

// Step 3: searchParams.get() auto-decodes ONCE
const afterSearchParams = decodeURIComponent(encodedTwice)
console.log('4. After searchParams.get() (auto-decoded once):', afterSearchParams)
console.log('   ✅ This should match step 2 (encodedOnce)')
console.log('   Match:', afterSearchParams === encodedOnce)

// Step 4: Our code calls decodeURIComponent() AGAIN (WRONG!)
const afterOurDecode = decodeURIComponent(afterSearchParams)
console.log('5. After our decodeURIComponent() (decoded TWICE):', afterOurDecode)
console.log('   ❌ This corrupts the token!')
console.log('   Match original:', afterOurDecode === originalToken)

console.log('\n💡 Solution: Remove the decodeURIComponent() call in image-proxy route!')
console.log('   searchParams.get() already gives us the properly decoded URL.\n')
