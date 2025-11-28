/**
 * SEO 체크 스크립트
 * 필수 SEO 파일들과 설정이 올바르게 구성되어 있는지 확인합니다.
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 The Founder SEO 체크 시작...\n')

let hasErrors = false
let warnings = []

// 필수 파일 체크
console.log('📁 필수 파일 확인...')
const requiredFiles = [
  { path: 'public/manifest.json', name: 'Web Manifest' },
  { path: 'src/app/sitemap.ts', name: 'Sitemap' },
  { path: 'src/app/robots.ts', name: 'Robots.txt' },
  { path: 'src/components/seo/StructuredData.tsx', name: '구조화된 데이터' },
  { path: 'next.config.js', name: 'Next.js 설정' },
]

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file.path)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file.name}: ${file.path}`)
  } else {
    console.log(`❌ ${file.name}: ${file.path} - 파일이 없습니다`)
    hasErrors = true
  }
})

// 필수 이미지 파일 체크 (경고만)
console.log('\n🖼️  SEO 이미지 파일 확인...')
const imageFiles = [
  'public/og-image.png',
  'public/favicon.ico',
  'public/icon-192x192.png',
  'public/icon-512x512.png',
  'public/apple-touch-icon.png'
]

imageFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`⚠️  ${file} - 생성 필요`)
    warnings.push(`${file} 이미지를 생성해야 합니다`)
  }
})

// 환경 변수 체크
console.log('\n🔐 환경 변수 확인...')
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')

  const requiredEnvVars = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
  ]

  const optionalEnvVars = [
    'NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION',
    'NEXT_PUBLIC_NAVER_SITE_VERIFICATION',
  ]

  requiredEnvVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✅ ${varName}`)
    } else {
      console.log(`❌ ${varName} - 설정 필요`)
      hasErrors = true
    }
  })

  optionalEnvVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✅ ${varName}`)
    } else {
      console.log(`⚠️  ${varName} - 나중에 설정 (선택)`)
      warnings.push(`${varName}를 나중에 설정하세요 (Google/Naver 웹마스터 도구 인증용)`)
    }
  })
} else {
  console.log('❌ .env.local 파일이 없습니다')
  hasErrors = true
}

// layout.tsx 메타데이터 체크
console.log('\n📄 메타데이터 구현 확인...')
const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx')
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8')

  if (layoutContent.includes('export const metadata: Metadata')) {
    console.log('✅ 루트 레이아웃 메타데이터 설정됨')
  } else {
    console.log('❌ 루트 레이아웃 메타데이터 누락')
    hasErrors = true
  }

  if (layoutContent.includes('OrganizationSchema') || layoutContent.includes('WebSiteSchema')) {
    console.log('✅ 구조화된 데이터 스키마 포함됨')
  } else {
    console.log('⚠️  구조화된 데이터 스키마가 layout.tsx에 포함되지 않음')
    warnings.push('layout.tsx에 OrganizationSchema와 WebSiteSchema를 추가하세요')
  }
} else {
  console.log('❌ src/app/layout.tsx 파일이 없습니다')
  hasErrors = true
}

// package.json 스크립트 체크
console.log('\n🔧 NPM 스크립트 확인...')
const packageJsonPath = path.join(process.cwd(), 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  if (packageJson.scripts && packageJson.scripts['seo:check']) {
    console.log('✅ SEO 체크 스크립트 등록됨')
  } else {
    console.log('⚠️  package.json에 seo:check 스크립트 추가 권장')
    warnings.push('package.json에 "seo:check": "node scripts/seo-check.js"를 추가하세요')
  }
}

// 최종 결과
console.log('\n' + '='.repeat(50))
console.log('📊 SEO 체크 결과')
console.log('='.repeat(50))

if (hasErrors) {
  console.log('\n❌ 오류가 발견되었습니다. 위의 항목들을 수정해야 합니다.')
  process.exit(1)
} else if (warnings.length > 0) {
  console.log('\n⚠️  경고: 다음 항목들을 확인하세요:\n')
  warnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning}`)
  })
  console.log('\n✅ 필수 항목은 모두 준비되었습니다!')
} else {
  console.log('\n✅ 모든 SEO 필수 항목이 완벽하게 설정되었습니다! 🎉')
}

console.log('\n📚 다음 단계:')
console.log('1. 이미지 파일들을 생성하세요 (OG 이미지, Favicon 등)')
console.log('2. Google Search Console과 네이버 웹마스터 도구에 사이트를 등록하세요')
console.log('3. 환경 변수에 인증 코드를 추가하세요')
console.log('4. npm run build를 실행하여 빌드가 성공하는지 확인하세요')
console.log('5. SEO-SETUP-GUIDE.md 파일을 참고하여 설정을 완료하세요')
console.log('')
