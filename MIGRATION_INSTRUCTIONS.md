# YouTube Channel Management Migration 실행 가이드

## 📋 현재 상황

채널 검증 API에서 다음 에러 발생:
```
column youtube_channels.status does not exist
```

**원인**: 데이터베이스 Migration이 실행되지 않음

**증거**:
- YouTube API는 정상 작동 중 ✅
- 채널 정보 정상 조회됨: "우낌표" 채널 (구독자 278,000명)
- 데이터베이스에 `status` 컬럼이 없어서 duplicate check 실패 ❌

---

## 🎯 해결 방법

### ✅ 준비 완료 파일

1. **Combined Migration SQL** ✅
   - 파일: `supabase/combined_migration.sql`
   - 내용: 두 개의 migration 파일 통합
   - 용도: Supabase Dashboard에서 직접 실행

2. **Verification SQL** ✅
   - 파일: `supabase/verify_migration.sql`
   - 용도: Migration 실행 후 검증

3. **코드 개선** ✅
   - `AddChannelModal.tsx` 입력 검증 강화
   - 디버깅 로그 추가

---

## 📝 Migration 실행 방법

### 방법 1: Supabase Dashboard에서 실행 (권장)

1. **Supabase Dashboard 접속**
   ```
   https://supabase.com/dashboard/project/frytwgfbxmbigrskarpt
   ```

2. **SQL Editor 열기**
   - 좌측 메뉴에서 "SQL Editor" 클릭

3. **Migration SQL 복사 및 실행**
   - `supabase/combined_migration.sql` 파일 전체 내용 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭 (또는 `Ctrl+Enter`)

4. **결과 확인**
   - 성공 메시지 확인:
     ```
     Migration completed successfully!
     total_columns: 21 (또는 그 이상)
     ```

5. **검증 실행**
   - `supabase/verify_migration.sql` 파일 내용 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭

6. **검증 결과 확인**
   - 모든 체크 항목에 ✅ 표시 확인
   - `status` 컬럼 존재 확인
   - 인덱스 생성 확인

---

### 방법 2: Supabase CLI 사용 (선택)

```bash
# 1. the-founder 디렉토리로 이동
cd C:\Users\KIMJAEHEON\the-founder

# 2. Supabase CLI 설치 (없는 경우)
npm install -g supabase

# 3. Supabase 프로젝트 링크 (최초 1회)
npx supabase link --project-ref frytwgfbxmbigrskarpt

# 4. Migration 실행
npx supabase db push

# 5. 검증
npx supabase db diff
```

**주의**: CLI 방법은 프로젝트 설정이 필요하므로, **Dashboard 방법을 권장**합니다.

---

## 🔍 Migration 내용 요약

### Migration 1: Basic Columns (20250124)
추가되는 컬럼:
- `title` VARCHAR(255) - 채널 이름
- `description` TEXT - 채널 설명
- `thumbnail_url` TEXT - 썸네일 URL
- `subscribers` BIGINT - 구독자 수
- `total_views` BIGINT - 총 조회수
- `video_count` BIGINT - 영상 개수
- `updated_at` TIMESTAMPTZ - 업데이트 시각

추가되는 인덱스:
- `idx_youtube_channels_title`
- `idx_youtube_channels_subscribers`
- `idx_youtube_channels_total_views`
- `idx_youtube_channels_video_count`
- `idx_youtube_channels_updated_at`

추가되는 트리거:
- `update_youtube_channels_updated_at_trigger` - updated_at 자동 갱신

### Migration 2: Management Columns (20250125)
추가되는 컬럼:
- `is_active` BOOLEAN - 활성화 여부
- `status` VARCHAR(50) - 상태 ('active', 'inactive', 'error', 'deleted')
- `error_message` TEXT - 에러 메시지
- `last_error_at` TIMESTAMPTZ - 마지막 에러 시각
- `added_by` VARCHAR(100) - 추가한 관리자
- `added_at` TIMESTAMPTZ - 추가 시각
- `notes` TEXT - 관리자 메모
- `deleted_by` VARCHAR(100) - 삭제한 관리자
- `deleted_at` TIMESTAMPTZ - 삭제 시각
- `deletion_reason` TEXT - 삭제 사유

추가되는 인덱스:
- `idx_youtube_channels_is_active`
- `idx_youtube_channels_status`
- `idx_youtube_channels_category_active`
- `idx_youtube_channels_error_status`
- `idx_youtube_channels_last_error`

추가되는 제약조건:
- `youtube_channels_status_check` - status 값 검증

---

## ✅ Migration 실행 후 확인 사항

### 1. 데이터베이스 확인
```sql
-- 컬럼 수 확인 (최소 19개 이상)
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'youtube_channels';

-- status 컬럼 존재 확인
SELECT column_name FROM information_schema.columns
WHERE table_name = 'youtube_channels' AND column_name = 'status';
```

### 2. 애플리케이션 테스트

**브라우저에서 테스트**:
```
http://localhost:3000/admin/youtube-industry/channels
```

**테스트 순서**:
1. "채널 추가" 버튼 클릭
2. 다음 URL 중 하나 입력:
   - `https://www.youtube.com/@우낌표`
   - `https://www.youtube.com/@ktintapov`
   - `UCvpvxehqmA95v9Q5RS6B_DQ`
3. "검증" 버튼 클릭
4. 채널 정보 미리보기 확인 (썸네일, 제목, 구독자 수)
5. 카테고리 선택
6. "채널 추가" 버튼 클릭
7. 성공 메시지 확인

**터미널 로그 확인**:
```
[Verify API] === START ===
[Verify API] Input: https://www.youtube.com/@...
[URLParser] === START ===
[URLParser] Detected type: handle
[URLParser] Resolving handle via YouTube API: @...
[YouTubeService] === VERIFY CHANNEL START ===
[YouTubeService] ✓ Channel found: { title: '...', subscribers: '...', videos: '...' }
[Verify API] ✓ Duplicate check passed
[Verify API] ✓ Verification complete
POST /api/admin/youtube/channels/verify 200 in XXXms
```

---

## 🐛 트러블슈팅

### 문제 1: Migration 실행 시 에러 발생

**에러**: `column already exists`
**해결**: 정상입니다. Migration은 idempotent하게 작성되어 있어 이미 존재하는 컬럼은 건너뜁니다.

### 문제 2: Supabase 연결 에러

**에러**: `getaddrinfo ENOTFOUND uwuynyftjhkwkdxzdaqc.supabase.co`
**원인**: 네트워크 연결 문제
**해결**:
- 인터넷 연결 확인
- VPN 사용 중이면 비활성화
- 방화벽 설정 확인
- 잠시 후 재시도

### 문제 3: 채널 검증 계속 실패

**체크리스트**:
- [ ] Migration 실행 완료?
- [ ] `status` 컬럼 존재 확인?
- [ ] YouTube API Key 설정됨? (`.env.local`)
- [ ] 인터넷 연결 정상?
- [ ] 터미널 로그에서 실제 에러 확인

---

## 📊 예상 결과

### Migration 실행 전
```
❌ column youtube_channels.status does not exist
```

### Migration 실행 후
```
✅ [YouTubeService] ✓ Channel found: { title: '우낌표', subscribers: '278000', videos: '68' }
✅ [Verify API] ✓ Duplicate check passed
✅ [Verify API] ✓ Verification complete
✅ POST /api/admin/youtube/channels/verify 200
```

---

## 📞 완료 보고

Migration 실행 후 다음을 확인하고 보고해주세요:

### ✅ 체크리스트
- [ ] `combined_migration.sql` 실행 완료
- [ ] `verify_migration.sql` 실행 완료
- [ ] 모든 검증 항목 ✅ 표시
- [ ] 채널 검증 테스트 성공
- [ ] 채널 추가 테스트 성공
- [ ] 채널 목록에 새 채널 표시 확인

### 📝 보고 형식
```
✅ Migration 실행 완료

실행 방법: [Dashboard / CLI]
실행 시간: [시간]

검증 결과:
- 컬럼 수: [숫자]개
- status 컬럼: ✅ 존재
- 인덱스: ✅ 생성됨
- 제약조건: ✅ 생성됨

테스트 결과:
- @handle 형식: [✅/❌]
- 채널 ID: [✅/❌]
- 채널 추가: [✅/❌]

비고: [추가 내용]
```

---

## 🚀 다음 단계

Migration 완료 후:
1. 실제 채널 데이터 수집 시작
2. 자동 업데이트 스케줄러 설정
3. 에러 모니터링 대시보드 구축
4. 성능 최적화

---

**생성일**: 2025-01-25
**프로젝트**: YouTube Industry - The Founder
**담당**: Claude Code
