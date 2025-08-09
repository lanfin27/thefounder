// Verify dashboard can access all 5,645+ Supabase records
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyDashboardData() {
  console.log('🔍 Verifying Dashboard Data Access')
  console.log('==================================\n')

  try {
    // 1. Check total count
    console.log('📊 Checking total listings count...')
    const { count: totalCount, error: countError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })

    if (countError) throw countError
    console.log(`✅ Total listings: ${totalCount.toLocaleString()}`)

    // 2. Check categories
    console.log('\n📊 Checking categories...')
    const { data: categories, error: catError } = await supabase
      .from('flippa_listings')
      .select('category')
      .not('category', 'is', null)
      .limit(1000)

    if (catError) throw catError
    const uniqueCategories = [...new Set(categories.map(c => c.category))]
    console.log(`✅ Unique categories: ${uniqueCategories.length}`)
    console.log(`   Top 5: ${uniqueCategories.slice(0, 5).join(', ')}`)

    // 3. Check price distribution
    console.log('\n📊 Checking price distribution...')
    const { data: priceData, error: priceError } = await supabase
      .from('flippa_listings')
      .select('asking_price')
      .not('asking_price', 'is', null)
      .gt('asking_price', 0)
      .limit(1000)

    if (priceError) throw priceError
    const prices = priceData.map(p => p.asking_price)
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    console.log(`✅ Average price: $${Math.round(avgPrice).toLocaleString()}`)
    console.log(`   Min: $${Math.min(...prices).toLocaleString()}`)
    console.log(`   Max: $${Math.max(...prices).toLocaleString()}`)

    // 4. Check field completion
    console.log('\n📊 Checking field completion rates...')
    const { data: sample, error: sampleError } = await supabase
      .from('flippa_listings')
      .select('*')
      .limit(100)

    if (sampleError) throw sampleError
    
    const fields = ['title', 'url', 'asking_price', 'monthly_revenue', 'category', 'description']
    const completion = {}
    
    fields.forEach(field => {
      const filled = sample.filter(s => s[field] && s[field] !== '').length
      completion[field] = Math.round((filled / sample.length) * 100)
    })

    console.log('✅ Field completion rates:')
    Object.entries(completion).forEach(([field, rate]) => {
      console.log(`   ${field}: ${rate}%`)
    })

    // 5. Test API endpoints
    console.log('\n📊 Testing dashboard API endpoints...')
    const endpoints = [
      'http://localhost:3000/api/dashboard/stats',
      'http://localhost:3000/api/dashboard/listings?limit=5',
      'http://localhost:3000/api/dashboard/metrics?type=overview'
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint)
        const data = await response.json()
        console.log(`✅ ${endpoint.split('/').pop()}: ${data.success ? 'Working' : 'Failed'}`)
      } catch (error) {
        console.log(`❌ ${endpoint.split('/').pop()}: Failed to fetch`)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('✅ VERIFICATION COMPLETE')
    console.log('='.repeat(50))
    console.log(`Total Records: ${totalCount.toLocaleString()}`)
    console.log(`Dashboard Status: ${totalCount >= 5645 ? 'Ready' : 'Data Missing'}`)
    console.log('\nAccess the dashboard at:')
    console.log('👉 http://localhost:3000/admin/flippa-listings')

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message)
  }
}

// Run verification
verifyDashboardData().catch(console.error)