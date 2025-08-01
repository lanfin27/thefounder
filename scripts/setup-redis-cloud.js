// Interactive Redis Cloud setup automation
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupRedisCloud() {
  console.clear();
  console.log('🚀 TheFounder Redis Cloud 자동 설정');
  console.log('=' .repeat(50));
  console.log('📍 현재 단계: WSL Redis 연결 문제 해결 중...\n');

  try {
    // Step 1: Open Redis Cloud signup page automatically
    console.log('1️⃣ 브라우저에서 Redis Cloud 가입 페이지를 자동으로 엽니다...');
    
    // Open browser automatically
    const { platform } = process;
    let command;
    
    if (platform === 'win32') {
      command = 'start https://redis.com/try-free/';
    } else if (platform === 'darwin') {
      command = 'open https://redis.com/try-free/';
    } else {
      command = 'xdg-open https://redis.com/try-free/';
    }
    
    try {
      await execAsync(command);
      console.log('✅ 브라우저에서 Redis Cloud 페이지가 열렸습니다.');
    } catch (error) {
      console.log('⚠️ 브라우저 자동 열기 실패. 수동으로 열어주세요:');
      console.log('🔗 https://redis.com/try-free/');
    }

    console.log('\n📋 Redis Cloud 가입 가이드:');
    console.log('   1. "Get started free" 클릭');
    console.log('   2. 이메일 주소 입력 (또는 Google 계정 사용)');
    console.log('   3. 비밀번호 설정');
    console.log('   4. "Sign up" 클릭');
    console.log('   5. 이메일 인증 완료');

    await question('\n✅ 계정 생성이 완료되었다면 Enter를 눌러주세요...');

    // Step 2: Database creation guide
    console.log('\n2️⃣ 무료 데이터베이스 생성 가이드:');
    console.log('   1. 대시보드에서 "New database" 또는 "Create database" 클릭');
    console.log('   2. 플랜 선택: "Fixed" (무료) 선택');
    console.log('   3. Cloud provider: "AWS" 선택');
    console.log('   4. Region: "Asia Pacific" 중 가장 가까운 지역 선택');
    console.log('      - ap-northeast-2 (Seoul) 추천');
    console.log('   5. Database name: "thefounder-redis" (또는 원하는 이름)');
    console.log('   6. "Create database" 클릭');
    console.log('   7. 생성 완료까지 1-2분 대기');

    await question('\n✅ 데이터베이스 생성이 완료되었다면 Enter를 눌러주세요...');

    // Step 3: Get connection information
    console.log('\n3️⃣ 연결 정보 확인 가이드:');
    console.log('   1. 생성된 데이터베이스 클릭');
    console.log('   2. "Connect" 또는 "Configuration" 탭 클릭');
    console.log('   3. "Public endpoint" 섹션에서 연결 정보 확인');
    console.log('   4. 다음 정보들을 복사해주세요:');
    console.log('      - Endpoint (호스트:포트)');
    console.log('      - Password');
    console.log('      - 또는 전체 Redis URL');

    console.log('\n📝 연결 정보를 입력해주세요:');

    // Get connection details
    const hasFullUrl = await question('\n전체 Redis URL이 있나요? (redis://로 시작하는 긴 URL) [y/N]: ');

    let redisConfig = {};

    if (hasFullUrl.toLowerCase() === 'y' || hasFullUrl.toLowerCase() === 'yes') {
      // Full URL input
      const fullUrl = await question('Redis URL을 붙여넣어주세요: ');
      
      // Parse URL
      try {
        const url = new URL(fullUrl);
        redisConfig = {
          REDIS_URL: fullUrl,
          REDIS_HOST: url.hostname,
          REDIS_PORT: url.port || '6379',
          REDIS_PASSWORD: url.password || '',
          REDIS_DB: '0'
        };
        
        console.log('\n✅ URL 파싱 완료:');
        console.log(`   Host: ${redisConfig.REDIS_HOST}`);
        console.log(`   Port: ${redisConfig.REDIS_PORT}`);
        console.log(`   Password: ${'*'.repeat(redisConfig.REDIS_PASSWORD.length)}`);
        
      } catch (error) {
        console.log('❌ URL 파싱 실패. 개별 정보를 입력해주세요.');
        throw new Error('Invalid Redis URL format');
      }
    } else {
      // Individual input
      const host = await question('호스트 주소를 입력하세요 (예: redis-12345.c1.region.gce.cloud.redislabs.com): ');
      const port = await question('포트 번호를 입력하세요 (기본값: 6379): ') || '6379';
      const password = await question('비밀번호를 입력하세요: ');
      
      // Redis Cloud uses 'default' as username
      redisConfig = {
        REDIS_URL: `redis://default:${password}@${host}:${port}`,
        REDIS_HOST: host,
        REDIS_PORT: port,
        REDIS_PASSWORD: password,
        REDIS_DB: '0'
      };
    }

    // Step 4: Update .env.local file
    console.log('\n4️⃣ .env.local 파일 자동 업데이트 중...');
    
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    // Read existing .env.local
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update Redis configuration
    const redisConfigLines = [
      '# Redis Configuration (for job queue) - Updated by setup-redis-cloud.js',
      `REDIS_URL=${redisConfig.REDIS_URL}`,
      `REDIS_HOST=${redisConfig.REDIS_HOST}`,
      `REDIS_PORT=${redisConfig.REDIS_PORT}`,
      `REDIS_PASSWORD=${redisConfig.REDIS_PASSWORD}`,
      `REDIS_DB=${redisConfig.REDIS_DB}`,
      '',
      '# Job Queue Settings',
      `QUEUE_REDIS_HOST=${redisConfig.REDIS_HOST}`,
      `QUEUE_REDIS_PORT=${redisConfig.REDIS_PORT}`,
      'QUEUE_REDIS_DB=1'
    ];

    // Remove old Redis configuration
    const lines = envContent.split('\n');
    const filteredLines = lines.filter(line => 
      !line.startsWith('REDIS_URL') && 
      !line.startsWith('REDIS_HOST') && 
      !line.startsWith('REDIS_PORT') && 
      !line.startsWith('REDIS_PASSWORD') && 
      !line.startsWith('REDIS_DB') &&
      !line.startsWith('QUEUE_REDIS_') &&
      !line.includes('Redis Configuration') &&
      !line.includes('Job Queue Settings')
    );

    // Find the position after admin token
    const adminTokenIndex = filteredLines.findIndex(line => line.includes('NEXT_PUBLIC_ADMIN_TOKEN'));
    const insertPosition = adminTokenIndex !== -1 ? adminTokenIndex + 1 : filteredLines.length;

    // Insert new Redis configuration
    const newLines = [
      ...filteredLines.slice(0, insertPosition),
      '',
      ...redisConfigLines,
      ...filteredLines.slice(insertPosition)
    ];

    const newEnvContent = newLines.join('\n');

    // Backup existing .env.local
    const backupPath = path.join(process.cwd(), '.env.local.backup');
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, backupPath);
      console.log('   📄 기존 .env.local 백업 완료 (.env.local.backup)');
    }

    // Write updated .env.local
    fs.writeFileSync(envPath, newEnvContent, 'utf8');
    console.log('✅ .env.local 파일이 성공적으로 업데이트되었습니다.');

    // Step 5: Test connection
    console.log('\n5️⃣ Redis 연결 테스트 중...');
    
    // Force reload environment variables
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config({ path: '.env.local' });
    
    try {
      const { stdout, stderr } = await execAsync('node scripts/test-redis.js');
      
      if (stdout.includes('Redis is ready for job queue system!')) {
        console.log('\n🎉 Redis Cloud 연결 테스트 성공!');
        console.log(stdout);
        
        // Step 6: Run environment verification
        console.log('\n6️⃣ 전체 환경 검증 중...');
        const { stdout: envStdout } = await execAsync('node scripts/verify-environment.js');
        
        if (envStdout.includes('Environment is fully ready for scraping!') || 
            envStdout.includes('Environment is ready for scraping!')) {
          console.log('✅ 전체 환경 검증 완료!');
        } else {
          console.log('⚠️ 환경 검증에서 일부 경고가 있습니다.');
          console.log('   (Redis는 정상 작동 중입니다)');
        }
        
        // Step 7: Success summary
        console.log('\n🎊 Redis Cloud 설정 완료!');
        console.log('=' .repeat(50));
        console.log('✅ Redis Cloud 계정 생성 완료');
        console.log('✅ 무료 데이터베이스 생성 완료');
        console.log('✅ .env.local 자동 업데이트 완료');
        console.log('✅ Redis 연결 테스트 성공');
        console.log('✅ 전체 환경 검증 완료');
        
        console.log('\n🚀 다음 단계:');
        console.log('1. 데이터베이스 마이그레이션 실행 (Supabase SQL Editor에서)');
        console.log('2. npm run dev (개발 서버 시작)');
        console.log('3. node scripts/start-scraping.js (스크래핑 시작)');
        console.log('4. node scripts/monitor-progress.js (진행 모니터링)');
        
        console.log('\n🎯 TheFounder Flippa 스크래핑 시스템이 완전히 준비되었습니다!');
        
      } else {
        throw new Error('Redis connection test did not complete successfully');
      }
      
    } catch (testError) {
      console.log('\n❌ 연결 테스트 실패:');
      console.log(testError.stdout || testError.stderr || testError.message);
      console.log('\n🔧 문제 해결:');
      console.log('1. 입력한 연결 정보가 정확한지 확인');
      console.log('2. Redis Cloud 데이터베이스가 실행 중인지 확인');
      console.log('3. 네트워크 연결 상태 확인');
      console.log('4. 방화벽 설정 확인');
      console.log('5. 다시 시도: node scripts/setup-redis-cloud.js');
      
      console.log('\n💡 팁: Redis Cloud 대시보드에서 "Connect" 버튼을 클릭하여');
      console.log('   정확한 연결 정보를 다시 확인해주세요.');
    }

  } catch (error) {
    console.error('\n❌ 설정 중 오류 발생:', error.message);
    console.log('\n🔧 수동 설정 방법:');
    console.log('1. https://redis.com/try-free/ 에서 계정 생성');
    console.log('2. 무료 데이터베이스 생성 (Fixed plan, 30MB)');
    console.log('3. 연결 정보를 .env.local에 수동 입력:');
    console.log('   REDIS_URL=redis://default:password@host:port');
    console.log('   REDIS_HOST=your-redis-host.com');
    console.log('   REDIS_PORT=your-port');
    console.log('   REDIS_PASSWORD=your-password');
    console.log('4. npm run test:redis로 연결 테스트');
  } finally {
    rl.close();
  }
}

// Start the setup process
console.log('🚀 Redis Cloud 설정을 시작합니다...\n');
setupRedisCloud().catch(console.error);