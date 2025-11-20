const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔬 프로젝트 완전 조사 시작\n');
console.log('=' .repeat(60));

// 1. 현재 디렉토리
console.log('\n📁 작업 디렉토리:', process.cwd());

// 2. 모든 LatestPosts 관련 파일 찾기
console.log('\n🔍 모든 LatestPosts 파일 찾기:');
try {
  const findCmd = 'dir /s /b *LatestPosts*.tsx 2>nul';

  const result = execSync(findCmd, {
    encoding: 'utf-8',
    cwd: process.cwd(),
    shell: 'cmd.exe'
  });

  const files = result.split('\n').filter(f => f.trim());

  if (files.length === 0) {
    console.log('❌ LatestPosts 파일을 찾을 수 없습니다!');
  } else {
    files.forEach((file, i) => {
      console.log(`\n${i + 1}. ${file}`);

      // 파일 내용 확인
      const fullPath = file.trim();
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const stats = fs.statSync(fullPath);

        console.log(`   크기: ${stats.size} bytes`);
        console.log(`   수정: ${stats.mtime.toISOString()}`);

        // 중요: line-clamp 패턴 검색
        const lineClamp1Count = (content.match(/line-clamp-1/g) || []).length;
        const lineClamp2Count = (content.match(/line-clamp-2/g) || []).length;

        console.log(`   line-clamp-1 발견: ${lineClamp1Count}회 ${lineClamp1Count > 0 ? '✅' : '❌'}`);
        console.log(`   line-clamp-2 발견: ${lineClamp2Count}회 ${lineClamp2Count > 0 ? '⚠️' : '✅'}`);
        console.log(`   mb-2: ${content.includes('mb-2') ? '✅' : '❌'}`);
        console.log(`   mt-3: ${content.includes('mt-3') ? '✅' : '❌'}`);

        // 168번 줄 근처 확인
        const lines = content.split('\n');
        if (lines.length >= 168) {
          console.log(`\n   === 168번 줄 근처 코드 ===`);
          for (let i = 165; i <= 170 && i < lines.length; i++) {
            console.log(`   ${i + 1}: ${lines[i].substring(0, 80)}`);
          }
        }
      }
    });
  }
} catch (error) {
  console.log('검색 오류:', error.message);
}

// 3. page.tsx에서 어떤 컴포넌트 사용 중인지 확인
console.log('\n\n🔍 홈페이지에서 사용 중인 컴포넌트:');
const pagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
if (fs.existsSync(pagePath)) {
  const pageContent = fs.readFileSync(pagePath, 'utf-8');
  const importMatch = pageContent.match(/import.*LatestPosts.*from ['"](.+?)['"]/);

  if (importMatch) {
    console.log(`✅ Import 발견: ${importMatch[0]}`);
    console.log(`   경로: ${importMatch[1]}`);
  } else {
    console.log('❌ LatestPosts import를 찾을 수 없습니다!');
  }

  // LatestPosts 사용 확인
  if (pageContent.includes('<LatestPosts')) {
    console.log('✅ <LatestPosts /> 컴포넌트 사용 중');
  } else {
    console.log('❌ <LatestPosts /> 컴포넌트 사용 안함');
  }
} else {
  console.log('❌ src/app/page.tsx 파일을 찾을 수 없습니다!');
}

// 4. .next 빌드 캐시 확인
console.log('\n\n🔍 빌드 캐시 상태:');
const nextPath = path.join(process.cwd(), '.next');
if (fs.existsSync(nextPath)) {
  const stats = fs.statSync(nextPath);
  console.log(`⚠️ .next 폴더 존재 (수정: ${stats.mtime.toISOString()})`);

  // 캐시 파일 개수
  try {
    const countCmd = 'dir /s /b .next 2>nul | find /c /v ""';
    const count = execSync(countCmd, { encoding: 'utf-8', cwd: process.cwd(), shell: 'cmd.exe' });
    console.log(`   파일 개수: ${count.trim()}`);
  } catch (e) {
    console.log('   파일 개수 확인 실패');
  }
} else {
  console.log('✅ .next 폴더 없음 (깨끗함)');
}

// 5. node_modules 캐시 확인
console.log('\n🔍 node_modules 캐시:');
const nodeModulesCachePath = path.join(process.cwd(), 'node_modules', '.cache');
if (fs.existsSync(nodeModulesCachePath)) {
  console.log('⚠️ node_modules/.cache 존재');
} else {
  console.log('✅ node_modules/.cache 없음');
}

// 6. Next.js 설정 확인
console.log('\n\n🔍 Next.js 설정:');
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
const nextConfigMjsPath = path.join(process.cwd(), 'next.config.mjs');

if (fs.existsSync(nextConfigPath)) {
  console.log('✅ next.config.js 발견');
  const config = fs.readFileSync(nextConfigPath, 'utf-8');
  console.log(config.substring(0, 300));
} else if (fs.existsSync(nextConfigMjsPath)) {
  console.log('✅ next.config.mjs 발견');
  const config = fs.readFileSync(nextConfigMjsPath, 'utf-8');
  console.log(config.substring(0, 300));
} else {
  console.log('⚠️ next.config 파일 없음');
}

// 7. package.json 확인
console.log('\n\n🔍 프로젝트 설정:');
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  console.log(`프로젝트: ${pkg.name}`);
  console.log(`Next.js: ${pkg.dependencies?.next || 'N/A'}`);
  console.log(`React: ${pkg.dependencies?.react || 'N/A'}`);
}

console.log('\n' + '='.repeat(60));
console.log('🔬 조사 완료!\n');
