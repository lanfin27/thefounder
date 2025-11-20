const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('💣 Nuclear Clean 시작...\n');

const toDelete = [
  '.next',
  'node_modules/.cache',
  '.turbo',
  'out',
  '.vercel',
  'tsconfig.tsbuildinfo'
];

toDelete.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`🗑️  삭제 중: ${dir}`);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      console.log(`✅ 삭제 완료: ${dir}`);
    } catch (e) {
      console.log(`⚠️  삭제 실패: ${dir} (${e.message})`);
    }
  } else {
    console.log(`⏭️  없음: ${dir}`);
  }
});

console.log('\n💣 Nuclear Clean 완료!\n');
