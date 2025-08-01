// Enhanced Redis connection test with detailed diagnostics
require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');

async function enhancedRedisTest() {
  console.log('🔍 Redis Cloud 연결 상세 테스트');
  console.log('=' .repeat(50));
  
  const config = {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0
  };

  console.log('📋 연결 설정:');
  console.log(`   URL: ${config.url ? config.url.replace(/:([^:@]+)@/, ':***@') : 'Not set'}`);
  console.log(`   Host: ${config.host || 'Not set'}`);
  console.log(`   Port: ${config.port || 'Not set'}`);
  console.log(`   DB: ${config.db}`);
  console.log(`   Password: ${config.password ? '*'.repeat(config.password.length) : 'Not set'}\n`);

  let redis = null;

  try {
    // Test 1: Basic connection
    console.log('1️⃣ 기본 연결 테스트...');
    
    const redisOptions = {
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('   ❌ 3회 재시도 실패');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        console.log(`   ⏳ 재시도 ${times}/3 (${delay}ms 후)...`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
      enableOfflineQueue: false,
      showFriendlyErrorStack: true
    };

    redis = new Redis(config.url, redisOptions);

    // Add error handler
    redis.on('error', (err) => {
      console.error('   Redis 에러:', err.message);
    });

    redis.on('connect', () => {
      console.log('   🔗 Redis 서버에 연결 중...');
    });

    redis.on('ready', () => {
      console.log('   ✅ Redis 서버 준비 완료');
    });

    await redis.connect();
    console.log('✅ Redis Cloud 연결 성공');

    // Test 2: Ping test
    console.log('\n2️⃣ Ping 테스트...');
    const startPing = Date.now();
    const pong = await redis.ping();
    const pingTime = Date.now() - startPing;
    console.log(`✅ Ping 응답: ${pong} (${pingTime}ms)`);

    // Test 3: Read/Write test
    console.log('\n3️⃣ 읽기/쓰기 테스트...');
    const testKey = 'thefounder:test:' + Date.now();
    const testValue = 'Hello TheFounder! 안녕하세요!';
    
    await redis.set(testKey, testValue, 'EX', 60); // 60초 후 만료
    const retrievedValue = await redis.get(testKey);
    await redis.del(testKey);
    
    if (retrievedValue === testValue) {
      console.log('✅ 읽기/쓰기 테스트 성공');
      console.log(`   저장된 값: ${testValue}`);
      console.log(`   읽어온 값: ${retrievedValue}`);
    } else {
      throw new Error('읽기/쓰기 테스트 실패');
    }

    // Test 4: Queue operations
    console.log('\n4️⃣ 큐 작업 테스트...');
    const queueName = 'thefounder:test:queue:' + Date.now();
    const jobData = { 
      type: 'test_job', 
      timestamp: Date.now(),
      data: { message: 'Flippa scraping test' }
    };
    
    await redis.lpush(queueName, JSON.stringify(jobData));
    const queueLength = await redis.llen(queueName);
    console.log(`   큐에 작업 추가됨 (현재 길이: ${queueLength})`);
    
    const jobResult = await redis.rpop(queueName);
    const parsedJob = JSON.parse(jobResult);
    
    if (parsedJob.type === 'test_job') {
      console.log('✅ 큐 작업 테스트 성공');
      console.log(`   작업 타입: ${parsedJob.type}`);
      console.log(`   작업 데이터: ${parsedJob.data.message}`);
    } else {
      throw new Error('큐 작업 테스트 실패');
    }

    // Test 5: Hash operations (for job metadata)
    console.log('\n5️⃣ 해시 작업 테스트 (작업 메타데이터)...');
    const jobId = 'job:' + Date.now();
    await redis.hset(jobId, {
      status: 'pending',
      category: 'saas',
      created_at: Date.now(),
      progress: 0
    });
    
    const jobStatus = await redis.hget(jobId, 'status');
    const jobCategory = await redis.hget(jobId, 'category');
    await redis.del(jobId);
    
    console.log('✅ 해시 작업 테스트 성공');
    console.log(`   작업 상태: ${jobStatus}`);
    console.log(`   카테고리: ${jobCategory}`);

    // Test 6: Set operations (for tracking)
    console.log('\n6️⃣ 집합 작업 테스트 (중복 방지)...');
    const processedSet = 'thefounder:processed:' + Date.now();
    const listingIds = ['listing1', 'listing2', 'listing3'];
    
    for (const id of listingIds) {
      await redis.sadd(processedSet, id);
    }
    
    const isMember = await redis.sismember(processedSet, 'listing2');
    const setSize = await redis.scard(processedSet);
    await redis.del(processedSet);
    
    console.log('✅ 집합 작업 테스트 성공');
    console.log(`   집합 크기: ${setSize}`);
    console.log(`   멤버 확인: ${isMember ? '존재' : '없음'}`);

    // Test 7: Connection info
    console.log('\n7️⃣ 연결 정보 확인...');
    const info = await redis.info('server');
    const lines = info.split('\r\n');
    const redisVersion = lines.find(line => line.startsWith('redis_version:'));
    const uptimeInSeconds = lines.find(line => line.startsWith('uptime_in_seconds:'));
    
    if (redisVersion) {
      console.log(`✅ Redis 버전: ${redisVersion.split(':')[1]}`);
    }
    if (uptimeInSeconds) {
      const uptime = parseInt(uptimeInSeconds.split(':')[1]);
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      console.log(`✅ 서버 가동시간: ${days}일 ${hours}시간`);
    }

    // Test 8: Memory usage
    console.log('\n8️⃣ 메모리 사용량 확인...');
    const memoryInfo = await redis.info('memory');
    const usedMemory = memoryInfo.match(/used_memory_human:(.+)/);
    const maxMemory = memoryInfo.match(/maxmemory_human:(.+)/);
    
    if (usedMemory) {
      console.log(`   사용 중인 메모리: ${usedMemory[1].trim()}`);
    }
    if (maxMemory && maxMemory[1].trim() !== '0B') {
      console.log(`   최대 메모리: ${maxMemory[1].trim()}`);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 모든 Redis Cloud 테스트 성공!');
    console.log('🚀 TheFounder 스크래핑 시스템 준비 완료!');
    console.log('=' .repeat(50));
    
    console.log('\n📊 테스트 요약:');
    console.log('   ✅ 기본 연결');
    console.log('   ✅ Ping 응답 시간: ' + pingTime + 'ms');
    console.log('   ✅ 읽기/쓰기 작업');
    console.log('   ✅ 큐 작업 (Bull 호환)');
    console.log('   ✅ 해시 작업 (메타데이터)');
    console.log('   ✅ 집합 작업 (중복 방지)');
    console.log('   ✅ 서버 정보 조회');
    
    return true;

  } catch (error) {
    console.error('\n❌ Redis Cloud 연결 실패:', error.message);
    
    console.log('\n🔧 문제 해결 가이드:');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('📍 연결 거부됨 - 다음을 확인하세요:');
      console.log('   1. Redis Cloud 데이터베이스가 실행 중인지 확인');
      console.log('   2. 호스트 주소가 정확한지 확인');
      console.log('   3. 포트 번호가 정확한지 확인');
      console.log('   4. 방화벽이 연결을 차단하지 않는지 확인');
    } else if (error.message.includes('WRONGPASS') || error.message.includes('NOAUTH')) {
      console.log('🔑 인증 실패 - 다음을 확인하세요:');
      console.log('   1. 비밀번호가 정확한지 확인');
      console.log('   2. Redis Cloud 대시보드에서 비밀번호 재확인');
      console.log('   3. URL에 "default:" 사용자명이 포함되어 있는지 확인');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log('⏱️ 연결 시간 초과 - 다음을 확인하세요:');
      console.log('   1. 인터넷 연결 상태 확인');
      console.log('   2. Redis Cloud 지역 설정 확인');
      console.log('   3. VPN 사용 시 연결 확인');
    }
    
    console.log('\n💡 추가 도움말:');
    console.log('1. Redis Cloud 대시보드로 이동');
    console.log('2. 데이터베이스 선택 후 "Connect" 클릭');
    console.log('3. "Redis CLI" 섹션의 연결 정보 확인');
    console.log('4. 다시 설정: node scripts/setup-redis-cloud.js');
    
    return false;
  } finally {
    if (redis) {
      await redis.disconnect();
      console.log('\n🔒 Redis 연결 종료됨');
    }
  }
}

// Run the test
enhancedRedisTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('예상치 못한 오류:', err);
    process.exit(1);
  });