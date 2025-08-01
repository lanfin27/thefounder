# Redis Cloud 자동 설정 가이드 - TheFounder

## 🚀 빠른 시작 (1분 설정)

### 자동 설정 실행
```bash
npm run setup:redis-cloud
```

이 명령어 하나로 모든 설정이 자동으로 진행됩니다!

## 📋 자동 설정 프로세스

### 1. **브라우저 자동 열기**
- Redis Cloud 가입 페이지가 자동으로 열립니다
- 열리지 않으면: https://redis.com/try-free/

### 2. **대화형 가이드**
스크립트가 단계별로 안내합니다:
- 계정 생성 가이드
- 데이터베이스 생성 가이드
- 연결 정보 입력 프롬프트

### 3. **자동 환경 설정**
- `.env.local` 자동 백업
- Redis 연결 정보 자동 업데이트
- 연결 테스트 자동 실행

## 🎯 전체 마스터 설정

모든 것을 한 번에 설정하려면:
```bash
npm run setup:master
```

이 명령어는:
1. 환경 백업
2. Redis Cloud 설정
3. 향상된 연결 테스트
4. 전체 시스템 검증

## 📊 사용 가능한 명령어

### Redis 관련
```bash
# Redis Cloud 설정
npm run setup:redis-cloud

# 기본 Redis 테스트
npm run test:redis

# 향상된 Redis 테스트 (상세 진단)
npm run test:redis-enhanced
```

### 환경 설정 관리
```bash
# 환경 파일 백업
npm run env:backup

# 환경 파일 복원
npm run env:restore

# 변경사항 확인
npm run env:diff

# 백업 목록 보기
npm run env:list
```

### 시스템 검증
```bash
# 전체 환경 검증
npm run test:environment

# 스크래핑 시스템 테스트
npm run test:scraping

# 완전 설정 검증
npm run setup:scraping
```

## 🔧 문제 해결

### Redis 연결 실패
```bash
# 1. 연결 정보 재확인
npm run env:diff

# 2. Redis Cloud 대시보드에서 정보 확인
# 3. 다시 설정
npm run setup:redis-cloud
```

### 환경 설정 문제
```bash
# 백업에서 복원
npm run env:restore

# 수동으로 .env.local 편집
```

## 📝 Redis Cloud 계정 정보

### 무료 플랜 제한
- 30MB 메모리
- 1개 데이터베이스
- 30일 비활성 시 일시 정지

### 추천 설정
- Region: ap-northeast-2 (Seoul)
- Provider: AWS
- Plan: Fixed (Free)

## 🚨 중요 참고사항

1. **비밀번호 보안**
   - Redis 비밀번호는 안전하게 보관
   - .env.local은 git에 커밋하지 않음

2. **백업 관리**
   - 설정 변경 전 항상 백업
   - `.env.local.backup` 파일 확인

3. **연결 URL 형식**
   ```
   redis://default:password@host:port
   ```
   - 'default'는 Redis Cloud의 기본 사용자명

## 📚 추가 리소스

- [Redis Cloud 문서](https://docs.redis.com/latest/rc/)
- [TheFounder 스크래핑 가이드](./SCRAPING_SETUP_STATUS.md)
- [문제 해결 가이드](./TROUBLESHOOTING.md)

## ✅ 설정 완료 후

1. 데이터베이스 마이그레이션 실행
2. 개발 서버 시작: `npm run dev`
3. 스크래핑 시작: `node scripts/start-scraping.js`
4. 모니터링: `node scripts/monitor-progress.js`

---

💡 **팁**: 전체 과정은 보통 5-10분이 소요됩니다. 자동 스크립트를 사용하면 실수 없이 빠르게 설정할 수 있습니다!