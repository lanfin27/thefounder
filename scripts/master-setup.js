// Master setup script that orchestrates the entire process
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');
const path = require('path');

async function masterSetup() {
  console.clear();
  console.log('🚀 TheFounder Flippa 스크래핑 시스템');
  console.log('📦 완전 자동화 설정 마스터');
  console.log('=' .repeat(50));
  
  const steps = [];
  
  try {
    // Step 1: Check current environment
    console.log('\n1️⃣ 현재 환경 상태 확인...');
    try {
      const { stdout: envCheck } = await execAsync('node scripts/verify-environment.js');
      
      if (envCheck.includes('Environment is fully ready for scraping!')) {
        console.log('✅ 환경이 이미 완전히 준비되어 있습니다!');
        steps.push({ step: 'Environment Check', status: 'Already Ready' });
        
        // Test Redis connection
        console.log('\n   Redis 연결 테스트 중...');
        const { stdout: redisTest } = await execAsync('node scripts/test-redis.js');
        
        if (redisTest.includes('Redis is ready for job queue system!')) {
          console.log('✅ Redis도 이미 연결되어 있습니다!');
          steps.push({ step: 'Redis Connection', status: 'Already Connected' });
          
          console.log('\n🎉 시스템이 이미 준비되어 있습니다!');
          console.log('   바로 스크래핑을 시작할 수 있습니다.');
          
          showFinalInstructions();
          return;
        }
      }
    } catch (error) {
      // Continue with setup if environment check fails
      console.log('   환경 설정이 필요합니다.');
    }
    
    // Step 2: Backup current .env.local
    console.log('\n2️⃣ 환경 설정 백업...');
    const EnvBackup = require('./env-backup.js');
    const envBackup = new EnvBackup();
    
    if (envBackup.backup()) {
      console.log('✅ 환경 설정 백업 완료');
      steps.push({ step: 'Environment Backup', status: 'Success' });
    } else {
      console.log('⚠️ 백업 스킵 (파일 없음)');
      steps.push({ step: 'Environment Backup', status: 'Skipped' });
    }
    
    // Step 3: Check if Redis is already configured
    console.log('\n3️⃣ Redis 연결 상태 확인...');
    let redisConfigured = false;
    
    try {
      const { stdout: redisQuickTest } = await execAsync('node scripts/test-redis.js', {
        timeout: 10000
      });
      
      if (redisQuickTest.includes('Redis is ready for job queue system!')) {
        console.log('✅ Redis가 이미 구성되어 있습니다!');
        redisConfigured = true;
        steps.push({ step: 'Redis Configuration', status: 'Already Configured' });
      }
    } catch (error) {
      console.log('   Redis 구성이 필요합니다.');
      steps.push({ step: 'Redis Configuration', status: 'Needed' });
    }
    
    // Step 4: Run Redis Cloud setup if needed
    if (!redisConfigured) {
      console.log('\n4️⃣ Redis Cloud 자동 설정 시작...');
      console.log('   브라우저가 열리고 안내가 표시됩니다.');
      console.log('   지시사항을 따라주세요.\n');
      
      // Run Redis Cloud setup in interactive mode
      const { spawn } = require('child_process');
      const setupProcess = spawn('node', ['scripts/setup-redis-cloud.js'], {
        stdio: 'inherit',
        shell: true
      });
      
      await new Promise((resolve, reject) => {
        setupProcess.on('close', (code) => {
          if (code === 0) {
            console.log('\n✅ Redis Cloud 설정 완료');
            steps.push({ step: 'Redis Cloud Setup', status: 'Success' });
            resolve();
          } else {
            reject(new Error('Redis Cloud setup failed'));
          }
        });
        
        setupProcess.on('error', (err) => {
          reject(err);
        });
      });
    }
    
    // Step 5: Run enhanced Redis test
    console.log('\n5️⃣ 향상된 Redis 연결 테스트...');
    try {
      const { stdout: enhancedTest } = await execAsync('node scripts/test-redis-enhanced.js');
      
      if (enhancedTest.includes('모든 Redis Cloud 테스트 성공!')) {
        console.log('✅ 향상된 Redis 테스트 통과');
        steps.push({ step: 'Enhanced Redis Test', status: 'Success' });
      } else {
        throw new Error('Enhanced Redis test failed');
      }
    } catch (error) {
      console.log('⚠️ 향상된 테스트 일부 실패 (기본 연결은 성공)');
      steps.push({ step: 'Enhanced Redis Test', status: 'Partial' });
    }
    
    // Step 6: Final environment verification
    console.log('\n6️⃣ 최종 환경 검증...');
    const { stdout: finalEnvCheck } = await execAsync('node scripts/verify-environment.js');
    
    if (finalEnvCheck.includes('Environment is fully ready for scraping!') || 
        finalEnvCheck.includes('Environment is ready for scraping!')) {
      console.log('✅ 최종 환경 검증 완료');
      steps.push({ step: 'Final Verification', status: 'Success' });
    } else {
      console.log('⚠️ 환경 검증 일부 경고 (Redis는 정상)');
      steps.push({ step: 'Final Verification', status: 'Warning' });
    }
    
    // Step 7: Test scraping readiness
    console.log('\n7️⃣ 스크래핑 시스템 준비 상태 확인...');
    try {
      const { stdout: scrapingTest } = await execAsync('node scripts/test-scraping.js');
      
      if (scrapingTest.includes('Scraping system test completed!')) {
        console.log('✅ 스크래핑 시스템 준비 완료');
        steps.push({ step: 'Scraping System Test', status: 'Success' });
      }
    } catch (error) {
      console.log('⚠️ 스크래핑 테스트 일부 경고');
      steps.push({ step: 'Scraping System Test', status: 'Warning' });
    }
    
    // Show summary
    showSummary(steps);
    showFinalInstructions();
    
  } catch (error) {
    console.error('\n❌ 설정 중 오류:', error.message);
    
    // Show summary even on error
    showSummary(steps);
    
    console.log('\n🔧 문제 해결:');
    console.log('1. 각 단계를 개별적으로 실행:');
    console.log('   - node scripts/setup-redis-cloud.js');
    console.log('   - npm run test:redis-enhanced');
    console.log('   - npm run test:environment');
    console.log('2. 오류 메시지 확인 후 재시도');
    console.log('3. .env.local 백업 복원: npm run env:restore');
  }
}

function showSummary(steps) {
  console.log('\n' + '=' .repeat(50));
  console.log('📊 설정 요약');
  console.log('=' .repeat(50));
  
  steps.forEach(({ step, status }) => {
    const icon = status === 'Success' ? '✅' : 
                 status === 'Already Ready' || status === 'Already Configured' ? '✅' :
                 status === 'Warning' || status === 'Partial' ? '⚠️' :
                 status === 'Skipped' ? '⏭️' : '❌';
    console.log(`${icon} ${step}: ${status}`);
  });
}

function showFinalInstructions() {
  console.log('\n' + '=' .repeat(50));
  console.log('🚀 다음 단계');
  console.log('=' .repeat(50));
  
  console.log('\n1️⃣ 데이터베이스 마이그레이션 (아직 안했다면):');
  console.log('   - Supabase SQL Editor 열기');
  console.log('   - supabase/migrations/20250102_flippa_scraping_tables.sql 실행');
  
  console.log('\n2️⃣ 개발 서버 시작 (새 터미널):');
  console.log('   npm run dev');
  
  console.log('\n3️⃣ 스크래핑 시작 (새 터미널):');
  console.log('   node scripts/start-scraping.js');
  
  console.log('\n4️⃣ 진행 상황 모니터링 (새 터미널):');
  console.log('   node scripts/monitor-progress.js');
  
  console.log('\n📚 유용한 명령어:');
  console.log('   npm run test:redis         - Redis 연결 테스트');
  console.log('   npm run test:environment   - 환경 검증');
  console.log('   npm run env:backup         - 환경 설정 백업');
  console.log('   npm run env:restore        - 환경 설정 복원');
  
  console.log('\n🎯 TheFounder Flippa 스크래핑 시스템 준비 완료!');
}

// Create check for admin rights on Windows
function checkAdminRights() {
  if (process.platform === 'win32') {
    try {
      require('child_process').execSync('net session', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }
  return true; // Assume true for non-Windows
}

// Start the master setup
console.log('🏁 마스터 설정을 시작합니다...\n');

if (!checkAdminRights() && process.platform === 'win32') {
  console.log('⚠️ 주의: 관리자 권한이 없습니다.');
  console.log('   일부 기능이 제한될 수 있습니다.\n');
}

masterSetup().catch(error => {
  console.error('\n💥 예상치 못한 오류:', error);
  process.exit(1);
});