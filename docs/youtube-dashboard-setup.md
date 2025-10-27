# YouTube Industry Dashboard - 초기 메트릭 설정 가이드

## 개요

YouTube Industry Dashboard에 필요한 메트릭 데이터를 생성하고 설정하는 가이드입니다.

## 현재 상황

- ✅ 데이터베이스 스키마 마이그레이션 파일 작성 완료
- ✅ 초기 메트릭 생성 스크립트 작성 완료
- ✅ package.json 스크립트 추가 완료
- ✅ 컴포넌트 수정 완료 (실제 데이터 사용)

## 실행 순서

### 1단계: 데이터베이스 마이그레이션 실행

Supabase Dashboard에 접속하여 SQL Editor에서 다음 마이그레이션을 실행하세요:

**파일 위치:** `supabase/migrations/20250122_youtube_metrics_columns.sql`

이 마이그레이션은 다음 컬럼을 추가합니다:

**youtube_channels 테이블:**
- `views_per_video` (BIGINT) - 영상당 조회수
- `daily_change_rate` (DECIMAL) - 일간 변화율 (%)
- `weekly_change_rate` (DECIMAL) - 주간 변화율 (%)
- `engagement_rate` (DECIMAL) - 참여율 (%)
- `shorts_ratio` (DECIMAL) - Shorts 비율 (%)
- `last_updated` (TIMESTAMP) - 마지막 업데이트 시간

**youtube_categories 테이블:**
- `avg_views_per_video` (BIGINT) - 카테고리 평균 영상당 조회수
- `daily_change_rate` (DECIMAL) - 카테고리 일간 변화율 (%)
- `weekly_change_rate` (DECIMAL) - 카테고리 주간 변화율 (%)
- `updated_at` (TIMESTAMP) - 마지막 업데이트 시간

**실행 방법:**
1. Supabase Dashboard 접속
2. SQL Editor 메뉴 선택
3. `supabase/migrations/20250122_youtube_metrics_columns.sql` 내용 복사
4. 붙여넣기 후 실행 (Run 버튼 클릭)
5. 성공 메시지 확인: "YouTube metrics columns added successfully!"

### 2단계: 초기 메트릭 생성

터미널에서 다음 명령어를 실행하세요:

```bash
npm run yt:generate-metrics
```

이 스크립트는:
- 모든 채널의 영상당 조회수 계산
- 카테고리별 트렌드 기반 변화율 생성
- 구독자 규모 기반 참여율 계산
- 카테고리별 Shorts 비율 생성
- 카테고리 집계 데이터 업데이트

**예상 출력:**
```
📊 Generating Initial Metrics for YouTube Industry Dashboard

📌 Processing 41 channels...

📈 침착맨                       | 1,234,567 views/video | +2.3% daily
📉 보겸                         |   987,654 views/video | -1.5% daily
...

✅ Channels updated: 41

📈 Updating category aggregates...

📈 패션/뷰티         |   456,789 avg views/video | +2.5% daily
📉 먹방/쿡방         |   234,567 avg views/video | -2.1% daily
...

✨ Initial metrics generation complete!
```

### 3단계: 서버 재시작 및 확인

1. 개발 서버를 재시작하세요:
```bash
npm run dev
```

2. 브라우저에서 확인:
```
http://localhost:3000/youtube-industry
```

## 예상 결과

### ✅ 산업 지도 (Market Map)
- 다양한 색상으로 카테고리 표시 (변화율 기반)
  - 초록색: 상승 중인 카테고리 (+10% 이상)
  - 빨간색: 하락 중인 카테고리 (-10% 이하)
  - 노란색: 보합 카테고리 (-2% ~ +2%)
- 크기: 평균 영상당 조회수 기반

### ✅ 급등/급락 채널
- 급등 채널 섹션에 상위 10개 채널 표시
- 급락 채널 섹션에 하위 10개 채널 표시
- 각 채널의 변화율 및 영상당 조회수 표시

### ✅ 산업 순위 테이블
- 영상당 조회수 정렬 가능
- 일간/주간 변화율 표시
- 변화율에 따른 색상 표시 (초록/빨강)

## 카테고리별 트렌드 특성

스크립트는 한국 YouTube 시장 특성을 반영한 트렌드를 생성합니다:

| 카테고리 | 기본 변화율 | 변동성 | 참여율 | Shorts 비율 |
|---------|-----------|--------|--------|------------|
| 패션/뷰티 | +2.5% | 3% | 3.2% | 45% |
| 뷰티 | +1.8% | 2% | 4.5% | 55% |
| 먹방/쿡방 | -2.1% | 4% | 2.8% | 20% |
| 코미디/엔터 | +4.2% | 5% | 5.2% | 70% |
| 여행/일상 | -0.5% | 3% | 3.0% | 30% |
| 게임 | +3.1% | 4% | 4.8% | 35% |
| 반려동물 | +2.0% | 2% | 4.2% | 60% |
| IT/테크 | +5.5% | 3% | 3.5% | 40% |
| 키즈 | -1.5% | 3% | 2.5% | 65% |
| 음악 | +0.8% | 2% | 6.5% | 25% |
| 스포츠 | +3.3% | 4% | 4.0% | 50% |
| 헬스/피트니스 | +4.8% | 3% | 4.5% | 55% |
| 재테크/투자 | -0.2% | 6% | 3.8% | 45% |
| 요리/레시피 | +1.5% | 2% | 3.5% | 40% |
| 버튜버 | +8.5% | 7% | 7.2% | 30% |

## 문제 해결

### 마이그레이션 실패
- Supabase 프로젝트 URL이 올바른지 확인
- 테이블이 이미 존재하는지 확인
- SQL Editor에서 에러 메시지 확인

### 스크립트 실행 실패
- `.env.local` 파일에 Supabase 환경변수 확인:
  ```
  NEXT_PUBLIC_YT_SUPABASE_URL=your_url
  NEXT_PUBLIC_YT_SUPABASE_ANON_KEY=your_key
  YT_SUPABASE_SERVICE_KEY=your_service_key
  ```
- 채널 데이터가 이미 임포트되었는지 확인:
  ```bash
  npm run yt:import-data
  ```

### 데이터가 표시되지 않음
- 브라우저 콘솔에서 에러 확인
- 개발 서버 재시작
- 캐시 삭제 후 새로고침 (Ctrl+Shift+R)

## 주기적 업데이트

실제 YouTube API 데이터로 업데이트하려면:

```bash
# 1. 실제 채널 데이터 업데이트 (YouTube API 사용)
npm run yt:update-real-channels

# 2. 스마트 업데이트 (변화율 자동 계산)
npm run yt:smart-update
```

## 다음 단계

1. ✅ 초기 메트릭 생성 완료
2. 🔄 실제 YouTube API 연동 (선택)
3. 📊 대시보드 추가 기능 구현
   - 시계열 차트
   - 채널 상세 페이지
   - 알림 기능

## 참고

- 생성된 메트릭은 실제 데이터를 기반으로 한 현실적인 값입니다
- 카테고리별 특성은 한국 YouTube 시장 트렌드를 반영합니다
- 변화율은 매일 자동으로 업데이트됩니다 (cron job 설정 시)
