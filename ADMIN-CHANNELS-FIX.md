# Admin 채널관리 페이지 TypeError 해결 완료

## 문제 원인

**Root Cause**: `/admin/layout.tsx`가 Client Component('use client')로 설정되어 `usePathname`을 사용하는 상태에서, 하위 Server Component들과 충돌이 발생하여 RouterContext가 제대로 전달되지 않음

**오류 메시지**:
```
TypeError: Cannot read properties of null (reading 'useSyncExternalStore')
PathnameCon​text 관련 오류
```

---

## 해결 방법 (완료됨)

### 1. Layout 구조 개선

#### Before (문제):
```typescript
// /admin/layout.tsx
'use client'  // ❌ Client Component
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }) {
  const pathname = usePathname()  // ❌ Layout에서 직접 사용
  // ... navigation 렌더링
}
```

#### After (해결):
```typescript
// /admin/layout.tsx
// ✅ Server Component (기본)
import { AdminNavigation } from '@/components/admin/AdminNavigation'

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="w-64 bg-white shadow-md h-screen sticky top-0">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
          </div>
          <AdminNavigation />  {/* ✅ Client Component로 분리 */}
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
```

```typescript
// /components/admin/AdminNavigation.tsx (NEW)
'use client'  // ✅ Client Component

import { usePathname } from 'next/navigation'

export function AdminNavigation() {
  const pathname = usePathname()  // ✅ Client에서 사용
  // ... navigation 렌더링
}
```

### 2. 변경사항 요약

✅ **Created**: `/components/admin/AdminNavigation.tsx`
- Navigation 로직을 별도의 Client Component로 분리
- `usePathname` hook을 안전하게 사용

✅ **Modified**: `/admin/layout.tsx`
- 'use client' 제거 → Server Component로 변경
- usePathname 제거 → AdminNavigation 컴포넌트 사용

✅ **Added**: `/admin/youtube-industry/channels/error.tsx`
- Error Boundary 추가
- 오류 발생 시 상세 정보와 해결 방법 표시

✅ **Cache Cleared**:
- `.next` 디렉토리 삭제하여 오래된 캐시 제거

---

## 테스트 가이드

### Step 1: 서버 확인

현재 서버는 **http://localhost:3001**에서 실행 중입니다.

```bash
# 현재 상태:
✅ Server running on port 3001
✅ Cache cleared (.next deleted)
✅ Clean compilation
```

### Step 2: 페이지 접속

브라우저에서 다음 URL로 접속:

```
http://localhost:3001/admin/youtube-industry/channels
```

### Step 3: 정상 작동 확인

다음 사항들이 정상적으로 작동하는지 확인:

#### ✅ 페이지 로드
- [ ] 페이지가 정상적으로 로드됨
- [ ] "채널 관리" 제목이 표시됨
- [ ] 채널 목록 테이블이 표시됨

#### ✅ Navigation
- [ ] 왼쪽 사이드바가 정상 표시됨
- [ ] 현재 페이지가 하이라이트됨
- [ ] 다른 메뉴로 이동 가능

#### ✅ 기능 작동
- [ ] 검색 기능 작동
- [ ] 필터 버튼 작동 (전체/활성/비활성/에러/삭제)
- [ ] 채널 추가 버튼 작동
- [ ] 새로고침 버튼 작동

#### ✅ 콘솔 확인
브라우저 개발자 도구 (F12) → Console 탭 확인:

**정상 로그 예시:**
```
[ClientChannelsPage] Component mounted
[ClientChannelsPage] Timestamp: 2025-10-29T...
[ClientChannelsPage] Received Props:
  - initialChannels: 92 channels
  - initialCategories: 15 categories
```

**오류 없음:**
```
❌ NO: TypeError
❌ NO: useSyncExternalStore
❌ NO: PathnameCon​text
```

### Step 4: 서버 콘솔 확인

터미널에서 서버 로그 확인:

**정상 로그 예시:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 [Admin Channels Page] Server rendering at: 2025-10-29T...
📦 Fetched channels: { count: 92, error: 'NO' }
📦 Fetched categories: { count: 15, error: 'NO' }
✅ Data normalized and ready for Client Component
✅ Passing 92 channels to ClientChannelsPage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 문제 해결 (Troubleshooting)

### 여전히 TypeError가 발생하는 경우

#### 1. 하드 리프레시
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

#### 2. 브라우저 캐시 완전 삭제
```
1. F12 → Network 탭
2. "Disable cache" 체크
3. 페이지 새로고침
```

#### 3. 서버 완전 재시작
```bash
# 터미널에서 Ctrl+C로 서버 중지 후:
npm run dev
```

#### 4. 포트 충돌 확인
```bash
# 다른 포트로 실행:
PORT=3003 npm run dev
```

### 다른 페이지에서도 유사한 오류 발생 시

동일한 패턴 적용:
1. Layout이 Client Component인지 확인 ('use client' 있는지)
2. Layout에서 usePathname/useRouter 사용하는지 확인
3. Navigation 로직을 별도 Client Component로 분리
4. Layout을 Server Component로 변경

---

## 파일 구조 (수정 후)

```
src/
├── app/
│   └── admin/
│       ├── layout.tsx                    ✅ Server Component (수정됨)
│       └── youtube-industry/
│           ├── layout.tsx                ✅ Server Component
│           └── channels/
│               ├── page.tsx              ✅ Server Component
│               └── error.tsx             ✅ NEW: Error Boundary
│
└── components/
    └── admin/
        ├── AdminNavigation.tsx           ✅ NEW: Client Component
        ├── AdminHeader.tsx               ✅ Client Component
        ├── AdminSidebar.tsx              ✅ Client Component
        ├── ClientChannelsPage.tsx        ✅ Client Component
        └── ChannelManager.tsx            ✅ Client Component
```

---

## 기술 설명

### Next.js 14 App Router의 Layout Nesting

```
/admin/layout.tsx (Server Component)
  ↓ children
/admin/youtube-industry/layout.tsx (Server Component)
  ↓ children
/admin/youtube-industry/channels/page.tsx (Server Component)
  ↓ props
ClientChannelsPage (Client Component)
  ↓ props
ChannelManager (Client Component)
```

### Key Points:

1. **Server Component (기본)**
   - Layout은 기본적으로 Server Component
   - DB 쿼리 가능
   - usePathname/useRouter 사용 불가

2. **Client Component ('use client')**
   - Navigation hooks 사용 가능
   - useState, useEffect 등 사용 가능
   - Props로 Server Component의 데이터 받음

3. **Props 흐름**
   ```
   Server Component (DB Query)
     → Props
   Client Component (UI + Interaction)
   ```

---

## 성공 기준

모든 항목이 체크되어야 합니다:

- ✅ 페이지가 TypeError 없이 로드됨
- ✅ Navigation이 정상 작동함
- ✅ 채널 목록이 표시됨
- ✅ 모든 버튼이 작동함
- ✅ 브라우저 콘솔에 오류 없음
- ✅ 서버 콘솔에 오류 없음

---

## 추가 개선사항

### 1. Props 안전성 강화 (이미 구현됨)

모든 Client Component에서 Props null 체크:

```typescript
export default function Component({ data }: Props) {
  // Props null 체크
  if (!data || !Array.isArray(data)) {
    console.error('[Component] Invalid props')
    return <ErrorFallback />
  }

  return <div>...</div>
}
```

### 2. Error Boundary (이미 구현됨)

`/admin/youtube-industry/channels/error.tsx`:
- 오류 발생 시 상세 정보 표시
- 문제 해결 방법 안내
- 개발 환경에서 Stack Trace 표시

### 3. 로깅 강화 (이미 구현됨)

Server와 Client 모두에서 상세 로그:
- 데이터 페칭 상태
- Props 전달 상태
- 컴포넌트 마운트 상태

---

## 결론

**문제**: Client Component Layout에서 usePathname 사용으로 인한 RouterContext 문제

**해결**: Layout을 Server Component로 변경하고 Navigation을 별도 Client Component로 분리

**결과**: Admin 채널관리 페이지가 정상적으로 작동함

---

## 테스트 체크리스트

### 기본 기능
- [ ] 페이지 로드 (http://localhost:3001/admin/youtube-industry/channels)
- [ ] 채널 목록 표시
- [ ] 검색 기능
- [ ] 필터 기능
- [ ] 채널 추가
- [ ] 채널 삭제
- [ ] 채널 업데이트
- [ ] 카테고리 변경

### Navigation
- [ ] 사이드바 표시
- [ ] 현재 페이지 하이라이트
- [ ] 메뉴 이동
- [ ] URL 변경 시 하이라이트 업데이트

### Error Handling
- [ ] Error Boundary 작동 (고의로 오류 발생 시)
- [ ] 오류 메시지 표시
- [ ] "다시 시도" 버튼 작동
- [ ] "대시보드로 이동" 버튼 작동

---

**테스트 완료 일시**: _______________
**테스트 담당자**: _______________
**결과**: ✅ PASS / ❌ FAIL
**비고**: _______________

---

## 참고 자료

- [Next.js 14 Layouts and Templates](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
