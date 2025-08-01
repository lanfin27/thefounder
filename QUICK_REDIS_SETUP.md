# 🚀 Redis Cloud 빠른 설정 가이드

현재 Redis 연결이 실패하고 있습니다. Redis Cloud를 사용하여 즉시 해결하세요!

## 즉시 실행 명령어:

```bash
npm run setup:redis-cloud
```

이 명령어가:
1. 브라우저에서 Redis Cloud 가입 페이지를 자동으로 엽니다
2. 단계별로 안내를 제공합니다
3. 연결 정보를 자동으로 .env.local에 저장합니다
4. 연결을 자동으로 테스트합니다

## 수동 설정 (5분):

### 1. Redis Cloud 가입
- https://redis.com/try-free/ 방문
- 이메일로 가입 (무료)

### 2. 데이터베이스 생성
- "New database" 클릭
- Plan: "Fixed" (무료) 선택
- Region: "ap-northeast-2" (Seoul) 선택
- "Create database" 클릭

### 3. 연결 정보 복사
데이터베이스 생성 후:
- "Connect" 버튼 클릭
- "Redis CLI" 탭에서 정보 확인
- 전체 Redis URL 복사 (redis://default:password@host:port)

### 4. 자동 설정 실행
```bash
npm run setup:redis-cloud
```
프롬프트에서 'y' 입력 후 URL 붙여넣기

## 완료 확인:

```bash
npm run test:redis-enhanced
```

✅ 모든 테스트가 통과하면 준비 완료!

## 다음 단계:
1. `npm run dev` (개발 서버 시작)
2. `node scripts/start-scraping.js` (스크래핑 시작)

---
💡 전체 과정은 5분 이내에 완료됩니다!