const fs = require('fs');
const path = require('path');

console.log('📐 page.tsx 레이아웃 수정 시작...\n');

const pagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.log('❌ src/app/page.tsx 파일을 찾을 수 없습니다!');
  process.exit(1);
}

let content = fs.readFileSync(pagePath, 'utf-8');

// 백업
fs.copyFileSync(pagePath, pagePath + '.backup-layout');
console.log('💾 백업 생성:', pagePath + '.backup-layout');

// Latest 섹션에 컨테이너 추가
// Before: <LatestPosts posts={latestPosts} />
// After: <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><LatestPosts posts={latestPosts} /></div>

// 정규식 패턴: LatestPosts 컴포넌트 찾기
const latestPattern = /(<LatestPosts\s+posts=\{latestPosts\}\s*\/>)/;

if (latestPattern.test(content)) {
  content = content.replace(
    latestPattern,
    `{/* Latest Posts Section with container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        $1
      </div>`
  );

  fs.writeFileSync(pagePath, content, 'utf-8');
  console.log('✅ page.tsx 수정 완료');
  console.log('  - Latest 섹션에 max-w-7xl 컨테이너 추가');
  console.log('  - px-4 sm:px-6 lg:px-8 (반응형 패딩)');
  console.log('  - py-12 (상하 패딩)');
} else {
  console.log('⚠️ LatestPosts 컴포넌트를 찾을 수 없습니다.');
  console.log('수동으로 다음과 같이 수정하세요:');
  console.log('');
  console.log('<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">');
  console.log('  <LatestPosts posts={latestPosts} />');
  console.log('</div>');
}

console.log('\n✅ 레이아웃 수정 완료!');
