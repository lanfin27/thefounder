# The Founder - 배포 체크리스트

이 체크리스트를 사용하여 배포 전후 모든 필수 단계를 확인하세요.

---

## 배포 전 체크리스트 (Pre-Deployment)

### 코드 준비
- [x] 프로덕션 빌드 테스트 완료 (`npm run build`)
- [x] TypeScript 에러 수정 완료 (40+ 에러 해결)
- [x] 빌드 설정 최적화 완료 (`next.config.js`)
- [x] API 라우트 lazy initialization 적용
- [ ] 로컬에서 프로덕션 모드 테스트 (`npm run start`)
- [ ] 콘솔 에러/경고 확인 및 해결
- [ ] 사용하지 않는 코드/패키지 제거

### Git 저장소
- [ ] 모든 변경사항 커밋 완료
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 민감한 정보가 코드에 하드코딩되지 않았는지 확인
- [ ] `main` 브랜치로 병합 완료
- [ ] GitHub에 푸시 완료

### 환경 변수 준비
- [ ] 모든 필수 환경 변수 목록 작성
- [ ] Supabase 키 준비
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_KEY`
- [ ] Kakao OAuth 키 준비
  - [ ] `KAKAO_CLIENT_ID`
  - [ ] `KAKAO_CLIENT_SECRET`
- [ ] NextAuth Secret 생성
  - [ ] `NEXTAUTH_SECRET` (openssl rand -base64 32)
- [ ] 사이트 URL 준비
  - [ ] `NEXT_PUBLIC_SITE_URL`

### 외부 서비스 준비
- [ ] Supabase 프로젝트 활성화 확인
- [ ] Kakao 개발자 콘솔 앱 설정 확인
- [ ] Notion API 키 준비 (사용하는 경우)
- [ ] Redis 설정 준비 (사용하는 경우)

---

## Vercel 배포 단계

### 1단계: Vercel 프로젝트 생성
- [ ] Vercel 계정 생성/로그인
- [ ] 새 프로젝트 생성
- [ ] GitHub 저장소 연결
- [ ] 저장소 import 완료

### 2단계: 프로젝트 설정
- [ ] Framework Preset: Next.js 확인
- [ ] Root Directory: `./` 확인
- [ ] Build Command: `npm run build` 확인
- [ ] Output Directory: `.next` 확인
- [ ] Install Command: `npm install` 확인
- [ ] Node.js 버전 설정: `NODE_VERSION=18.17.0`

### 3단계: 환경 변수 설정
- [ ] Vercel Dashboard → Settings → Environment Variables 접속
- [ ] 필수 환경 변수 추가:
  - [ ] `NEXT_PUBLIC_SITE_URL` (임시 .vercel.app URL)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_KEY`
  - [ ] `KAKAO_CLIENT_ID`
  - [ ] `KAKAO_CLIENT_SECRET`
  - [ ] `NEXTAUTH_SECRET`
- [ ] 선택적 환경 변수 추가 (필요한 경우):
  - [ ] `REDIS_HOST`
  - [ ] `REDIS_PORT`
  - [ ] `REDIS_PASSWORD`
  - [ ] `NOTION_API_KEY`
  - [ ] `NOTION_DATABASE_ID`
- [ ] 모든 환경에 적용 (Production, Preview, Development)

### 4단계: 첫 배포
- [ ] "Deploy" 버튼 클릭
- [ ] 배포 로그 모니터링
- [ ] 배포 완료 대기 (2-5분)
- [ ] 배포 상태 확인: Success

---

## Kakao OAuth 설정

### Redirect URI 설정
- [ ] Kakao Developers Console 접속
- [ ] 내 애플리케이션 선택
- [ ] 제품 설정 → Kakao 로그인 선택
- [ ] Redirect URI 등록:
  ```
  https://[your-vercel-url].vercel.app/api/auth/callback/kakao
  ```
- [ ] 저장 완료

### 활성화 설정
- [ ] Kakao 로그인 활성화 ON
- [ ] OpenID Connect 활성화 (선택사항)
- [ ] 동의 항목 설정:
  - [ ] 닉네임 (필수)
  - [ ] 프로필 사진 (선택)
  - [ ] 카카오계정(이메일) (필수)

### Web 플랫폼 등록
- [ ] 플랫폼 → Web 플랫폼 등록
- [ ] 사이트 도메인 등록:
  ```
  https://[your-vercel-url].vercel.app
  ```
- [ ] 저장 완료

---

## 배포 후 검증

### 기본 기능 테스트
- [ ] 홈페이지 접속 및 로드 확인
  - [ ] URL: https://[your-vercel-url].vercel.app
  - [ ] 메인 콘텐츠 정상 표시
  - [ ] 이미지 로딩 정상
  - [ ] 레이아웃 정상

- [ ] 포스트 목록 페이지
  - [ ] URL: /posts
  - [ ] 포스트 목록 표시
  - [ ] 페이지네이션 작동
  - [ ] 검색 기능 작동 (있는 경우)

- [ ] 개별 포스트 페이지
  - [ ] URL: /posts/[slug]
  - [ ] 포스트 내용 표시
  - [ ] 이미지 로딩
  - [ ] 메타데이터 (제목, 설명) 확인

- [ ] 카테고리 페이지
  - [ ] URL: /category/[slug]
  - [ ] 카테고리별 포스트 필터링
  - [ ] 정상 작동 확인

### 인증 기능 테스트
- [ ] 로그인 버튼 표시
- [ ] Kakao 로그인 클릭
- [ ] Kakao 로그인 페이지 리다이렉트
- [ ] 로그인 성공 및 홈으로 리다이렉트
- [ ] 사용자 정보 표시 확인
- [ ] 로그아웃 기능 작동

### SEO 검증
- [ ] 페이지 소스 보기에서 메타태그 확인
  - [ ] `<title>` 태그
  - [ ] `<meta name="description">`
  - [ ] Open Graph 태그
  - [ ] Twitter Card 태그
- [ ] sitemap.xml 접속 확인
  - [ ] URL: /sitemap.xml
  - [ ] 정상 XML 출력
- [ ] robots.txt 접속 확인
  - [ ] URL: /robots.txt
  - [ ] 정상 내용 출력

### 성능 테스트
- [ ] Lighthouse 실행
  - [ ] Performance > 80
  - [ ] Accessibility > 90
  - [ ] Best Practices > 80
  - [ ] SEO > 90
- [ ] Core Web Vitals 확인
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] FID (First Input Delay) < 100ms
  - [ ] CLS (Cumulative Layout Shift) < 0.1

### 에러 확인
- [ ] Vercel Runtime Logs 확인
  - [ ] 심각한 에러 없음
  - [ ] Redis 경고는 무시 가능
- [ ] Browser Console 확인
  - [ ] JavaScript 에러 없음
  - [ ] 네트워크 에러 없음

---

## 배포 후 설정

### 환경 변수 업데이트
- [ ] `NEXT_PUBLIC_SITE_URL`을 실제 도메인으로 업데이트
- [ ] Kakao Redirect URI를 실제 도메인으로 업데이트
- [ ] Vercel에서 재배포 (환경 변수 변경 반영)

### 도메인 설정 (선택사항)
- [ ] Vercel Dashboard → Settings → Domains
- [ ] 커스텀 도메인 추가
- [ ] DNS 설정:
  - [ ] A 레코드: 76.76.21.21
  - [ ] CNAME 레코드: cname.vercel-dns.com
- [ ] SSL 인증서 자동 발급 확인
- [ ] 도메인 접속 테스트

### 검색 엔진 등록
- [ ] Google Search Console
  - [ ] 속성 추가
  - [ ] 소유권 확인
  - [ ] Sitemap 제출: /sitemap.xml
  - [ ] 색인 요청

- [ ] Naver 웹마스터 도구
  - [ ] 사이트 등록
  - [ ] 소유 확인
  - [ ] Sitemap 제출: /sitemap.xml
  - [ ] 사이트 검증

### Analytics 설정 (선택사항)
- [ ] Google Analytics
  - [ ] GA4 프로퍼티 생성
  - [ ] 측정 ID 획득
  - [ ] `NEXT_PUBLIC_GA_ID` 환경 변수 추가
  - [ ] 재배포 및 추적 확인

- [ ] Vercel Analytics
  - [ ] Vercel Dashboard → Analytics
  - [ ] Enable Analytics
  - [ ] 데이터 수집 확인

### 모니터링 설정
- [ ] Vercel Dashboard에서 배포 상태 모니터링 설정
- [ ] 알림 설정 (배포 실패, 에러 등)
- [ ] Supabase Dashboard에서 DB 사용량 확인
- [ ] 성능 메트릭 정기 확인 일정 수립

---

## 지속적 통합/배포 (CI/CD)

### GitHub Actions 설정 (선택사항)
- [ ] `.github/workflows` 디렉토리 생성
- [ ] 테스트 workflow 설정
- [ ] 린트 workflow 설정
- [ ] PR 시 자동 테스트 실행 확인

### Vercel 자동 배포
- [ ] `main` 브랜치 푸시 시 자동 배포 확인
- [ ] PR 생성 시 프리뷰 배포 확인
- [ ] 배포 알림 설정 (Slack, Discord 등)

---

## 보안 체크리스트

### 환경 변수
- [ ] `.env` 파일이 Git에 커밋되지 않았는지 재확인
- [ ] 모든 시크릿 키가 Vercel 환경 변수에만 존재
- [ ] 개발용 키와 프로덕션 키 분리 사용

### API 보안
- [ ] Supabase Row Level Security (RLS) 설정 확인
- [ ] API 라우트 인증/권한 확인
- [ ] CORS 설정 확인

### 헤더 보안
- [ ] `next.config.js`의 보안 헤더 확인:
  - [ ] `X-Frame-Options: SAMEORIGIN`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-XSS-Protection: 1; mode=block`
  - [ ] `Referrer-Policy: origin-when-cross-origin`

---

## 백업 및 롤백 계획

### 배포 전 백업
- [ ] 현재 프로덕션 배포 URL 기록
- [ ] Supabase 데이터베이스 백업 (필요시)
- [ ] 환경 변수 백업 (안전한 곳에 저장)

### 롤백 절차
- [ ] Vercel Dashboard에서 이전 배포 확인
- [ ] 문제 발생 시 이전 배포로 롤백 방법 숙지
- [ ] 롤백 후 테스트 절차 준비

---

## 문서화

### 업데이트할 문서
- [ ] README.md 업데이트
  - [ ] 배포 URL 추가
  - [ ] 설치 및 실행 방법 최신화
- [ ] CHANGELOG.md 작성 (선택사항)
  - [ ] 주요 변경사항 기록
  - [ ] 버전 정보 추가

### 팀 공유 (해당되는 경우)
- [ ] 배포 URL 팀에 공유
- [ ] 환경 변수 안전한 방법으로 공유
- [ ] 배포 프로세스 문서화

---

## 최종 확인

### 모든 환경 테스트
- [ ] 데스크톱 브라우저 (Chrome, Firefox, Safari, Edge)
- [ ] 모바일 브라우저 (iOS Safari, Android Chrome)
- [ ] 다양한 화면 크기 (모바일, 태블릿, 데스크톱)

### 프로덕션 준비 완료
- [ ] 모든 기능 정상 작동
- [ ] 성능 기준 충족
- [ ] SEO 최적화 완료
- [ ] 보안 설정 완료
- [ ] 모니터링 설정 완료

---

## 배포 완료 후

### 알림
- [ ] 이해관계자에게 배포 완료 알림
- [ ] 사용자에게 새 기능 공지 (필요시)

### 모니터링
- [ ] 첫 24시간 동안 집중 모니터링
- [ ] 에러 로그 정기 확인
- [ ] 사용자 피드백 수집

### 개선
- [ ] 성능 메트릭 분석
- [ ] 사용자 행동 분석
- [ ] 개선 사항 백로그 작성

---

## 체크리스트 완료 날짜

- **배포 전 체크리스트 완료**: _____________
- **Vercel 배포 완료**: _____________
- **배포 후 검증 완료**: _____________
- **최종 승인**: _____________

---

## 참고 문서

- [VERCEL-DEPLOYMENT-GUIDE.md](./VERCEL-DEPLOYMENT-GUIDE.md) - 상세 배포 가이드
- [DEPLOYMENT-REPORT.md](./DEPLOYMENT-REPORT.md) - 배포 작업 보고서
- [README.md](./README.md) - 프로젝트 개요
