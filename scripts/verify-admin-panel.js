// Verify admin panel and dashboard setup

const path = require('path')
const fs = require('fs')

console.log('🔍 Verifying Admin Panel Setup')
console.log('==============================\n')

const checkList = [
  // Utility files
  { name: 'Utils', file: 'src/lib/utils.ts', type: 'utility' },
  { name: 'Constants', file: 'src/lib/constants.ts', type: 'utility' },
  { name: 'Types', file: 'src/lib/types.ts', type: 'utility' },
  { name: 'Supabase Utils', file: 'src/lib/supabase.ts', type: 'utility' },
  { name: 'Validation', file: 'src/lib/validation.ts', type: 'utility' },
  { name: 'Error Handling', file: 'src/lib/error-handling.ts', type: 'utility' },
  
  // UI Components
  { name: 'Card', file: 'src/components/ui/Card.tsx', type: 'component' },
  { name: 'Button', file: 'src/components/ui/Button.tsx', type: 'component' },
  { name: 'Input', file: 'src/components/ui/Input.tsx', type: 'component' },
  { name: 'Select', file: 'src/components/ui/Select.tsx', type: 'component' },
  
  // Dashboard Components
  { name: 'Dashboard Client', file: 'src/components/dashboard/DashboardClient.tsx', type: 'component' },
  
  // Admin Pages
  { name: 'Admin Layout', file: 'src/app/admin/layout.tsx', type: 'page' },
  { name: 'Admin Home', file: 'src/app/admin/page.tsx', type: 'page' },
  { name: 'Flippa Dashboard', file: 'src/app/admin/flippa-listings/page.tsx', type: 'page' },
  
  // API Endpoints
  { name: 'Stats API', file: 'src/app/api/dashboard/stats/route.ts', type: 'api' },
  { name: 'Listings API', file: 'src/app/api/dashboard/listings/route.ts', type: 'api' },
  { name: 'Metrics API', file: 'src/app/api/dashboard/metrics/route.ts', type: 'api' },
  { name: 'Charts API', file: 'src/app/api/dashboard/charts/route.ts', type: 'api' },
  { name: 'Search API', file: 'src/app/api/dashboard/search/route.ts', type: 'api' },
  { name: 'Export API', file: 'src/app/api/dashboard/export/route.ts', type: 'api' }
]

let allGood = true
const results = {
  utility: { total: 0, found: 0 },
  component: { total: 0, found: 0 },
  page: { total: 0, found: 0 },
  api: { total: 0, found: 0 }
}

// Check each file
checkList.forEach(item => {
  const filePath = path.join(__dirname, '..', item.file)
  const exists = fs.existsSync(filePath)
  
  results[item.type].total++
  if (exists) {
    results[item.type].found++
    console.log(`✅ ${item.name}`)
  } else {
    console.log(`❌ ${item.name} - NOT FOUND`)
    allGood = false
  }
})

// Check dependencies
console.log('\n📦 Checking Dependencies')
console.log('------------------------')
const packagePath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

const requiredDeps = ['clsx', 'tailwind-merge']
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`)
  } else {
    console.log(`❌ ${dep}: NOT INSTALLED`)
    allGood = false
  }
})

// Summary
console.log('\n📊 Summary')
console.log('----------')
Object.entries(results).forEach(([type, counts]) => {
  const percentage = Math.round((counts.found / counts.total) * 100)
  console.log(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${counts.found}/${counts.total} (${percentage}%)`)
})

// Routes
console.log('\n🔗 Admin Panel Routes')
console.log('--------------------')
console.log('Main Admin: http://localhost:3000/admin')
console.log('Flippa Dashboard: http://localhost:3000/admin/flippa-listings')
console.log('Test Page: http://localhost:3000/admin-test')

// Final verdict
console.log('\n' + '='.repeat(50))
if (allGood) {
  console.log('✅ Admin panel setup is complete!')
  console.log('\nTo start the application:')
  console.log('  npm run dev')
  console.log('\nThen access:')
  console.log('  http://localhost:3000/admin')
} else {
  console.log('❌ Some components are missing. Please check the errors above.')
}

// Check tsconfig
console.log('\n🔧 TypeScript Configuration')
console.log('---------------------------')
const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json')
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
if (tsconfig.compilerOptions.paths && tsconfig.compilerOptions.paths['@/*']) {
  console.log('✅ Path alias configured: @/* → ' + tsconfig.compilerOptions.paths['@/*'][0])
} else {
  console.log('❌ Path alias not configured')
}