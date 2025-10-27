# YouTube Industry Chart Implementation Guide

## 📊 Overview

토스증권 스타일의 시장 변동성 그래프를 YouTube Industry 카테고리 페이지에 구현했습니다.

## ✅ Completed Implementation

### 1. Packages Installed
```bash
npm install recharts date-fns dotenv tsx
```

- **recharts**: React 차트 라이브러리
- **date-fns**: 날짜 포맷팅
- **dotenv**: 환경변수 로드 (스크립트용)
- **tsx**: TypeScript 실행 (스크립트용)

### 2. Database Schema

**File**: `database/create-channel-history-table.sql`

테이블이 생성되어야 합니다:
```sql
CREATE TABLE youtube_channel_history (
  id UUID PRIMARY KEY,
  channel_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  date DATE NOT NULL,
  total_views BIGINT NOT NULL,
  video_count INT NOT NULL,
  views_per_video FLOAT NOT NULL,
  subscribers BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, date)
);
```

**실행 방법**:
1. Supabase Dashboard 열기: https://supabase.com/dashboard/project/frytwgfbxmbigrskarpt/editor
2. SQL Editor 탭 클릭
3. `database/create-channel-history-table.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. Run 버튼 클릭

### 3. API Endpoint

**File**: `src/app/api/youtube-industry/categories/[code]/history/route.ts`

**Features**:
- 기간별 조회 지원 (1m, 3m, 6m, 1y, all)
- 일별 평균 조회수 계산
- 변화율 계산 (일간/주간/월간)
- 샘플 데이터 자동 생성 (실제 데이터 없을 때)

**Example Request**:
```
GET /api/youtube-industry/categories/Y10/history?period=1m
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "chartData": [
      {
        "date": "2024-10-01",
        "viewsPerVideo": 5234567,
        "timestamp": 1696118400000
      }
    ],
    "currentValue": 5234567,
    "changes": {
      "daily": 2.3,
      "weekly": 5.1,
      "monthly": -1.2
    }
  }
}
```

### 4. Chart Component

**File**: `src/components/youtube-industry/CategoryChart.tsx`

**Features**:
- Toss Securities 스타일 디자인
- 영상당 조회수 라인 차트
- 일간/주간/월간 변화율 카드
- 기간 선택 버튼 (1개월/3개월/6개월/1년/전체)
- 상승(초록)/하락(빨강) 색상 표현
- 인터랙티브 툴팁
- 다크 모드 지원
- 샘플 데이터 표시 (실제 데이터 없을 때)

### 5. Category Page Integration

**File**: `src/app/youtube-industry/[category]/page.tsx`

차트가 통계 카드와 채널 목록 사이에 표시됩니다:
```
1. 헤더 (카테고리 정보)
2. 통계 카드 (4개)
3. 📊 시장 변동성 차트 ← NEW!
4. 채널 목록
```

### 6. Sample Data Generator

**File**: `scripts/generate-sample-history.ts`

**실행 방법**:
```bash
npx tsx scripts/generate-sample-history.ts
```

**What it does**:
1. 상위 카테고리 5개 조회
2. 각 카테고리별 채널 3개 선택
3. 최근 60일간의 히스토리 데이터 생성
4. 랜덤 변동 추가 (±5%)
5. 상승 추세 추가 (realistic)
6. 주말 효과 추가 (weekends boost)
7. Supabase에 삽입

## 🧪 Testing Guide

### Step 1: Create Database Table

1. Supabase SQL Editor 열기
2. `database/create-channel-history-table.sql` 실행
3. ✅ 테이블 생성 확인

### Step 2: Generate Sample Data (Optional)

실제 히스토리 데이터가 없다면:
```bash
npx tsx scripts/generate-sample-history.ts
```

출력 예시:
```
🚀 Starting sample history data generation...
✅ Found 5 categories
✅ Found 15 channels
📊 Generated 900 history records
⏳ Inserting... 900/900
✅ Sample history data generation completed!
```

### Step 3: Test the Chart

1. 브라우저에서 열기: `http://localhost:3001/youtube-industry`
2. 아무 카테고리 클릭 (예: "음악" → `/youtube-industry/Y10`)
3. 페이지 스크롤 다운
4. 차트 확인!

**Expected Results**:
- ✅ 통계 카드 아래에 차트 표시
- ✅ "영상당 조회수" 제목과 현재 값
- ✅ 변화율 카드 3개 (일간/주간/월간)
- ✅ 라인 차트 (초록/빨강/회색)
- ✅ 기간 선택 버튼 5개
- ✅ 툴팁 인터랙션
- ✅ 다크 모드 지원

### Step 4: Test Period Switching

1. "3개월" 버튼 클릭
2. ✅ 차트 데이터 다시 로딩
3. ✅ 3개월치 데이터 표시

### Step 5: Test Tooltip

1. 차트 위에 마우스 오버
2. ✅ 날짜와 값 표시
3. ✅ 포맷: "10.9M", "yyyy-MM-dd"

## 📁 File Structure

```
the-founder/
├── database/
│   └── create-channel-history-table.sql         ← SQL 스크립트
├── scripts/
│   └── generate-sample-history.ts               ← 샘플 데이터 생성
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── youtube-industry/
│   │   │       └── categories/
│   │   │           └── [code]/
│   │   │               └── history/
│   │   │                   └── route.ts          ← API 엔드포인트
│   │   └── youtube-industry/
│   │       └── [category]/
│   │           └── page.tsx                      ← 차트 추가됨
│   └── components/
│       └── youtube-industry/
│           └── CategoryChart.tsx                 ← 차트 컴포넌트
└── docs/
    └── youtube-industry-chart-implementation.md ← 이 문서
```

## 🎨 Design Features

### Color Scheme

- **Positive (상승)**: Green (#10b981)
- **Negative (하락)**: Red (#ef4444)
- **Neutral**: Gray (#6b7280)

### Chart Style

- **토스증권 스타일 디자인**
- 깔끔한 라인 차트
- 그리드 선 표시
- 인터랙티브 툴팁
- 반응형 디자인

### Responsive Design

- 데스크톱: 넓은 차트
- 태블릿: 중간 크기
- 모바일: 작은 차트 (스크롤 가능)

## 🔧 Configuration

### Environment Variables

Required in `.env.local`:
```env
# YouTube Industry Supabase
NEXT_PUBLIC_YT_SUPABASE_URL=https://frytwgfbxmbigrskarpt.supabase.co
NEXT_PUBLIC_YT_SUPABASE_ANON_KEY=eyJ...
YT_SUPABASE_SERVICE_KEY=eyJ...  # For script only
```

### API Periods

| Period | Days | Description |
|--------|------|-------------|
| 1m     | 30   | 1개월       |
| 3m     | 90   | 3개월       |
| 6m     | 180  | 6개월       |
| 1y     | 365  | 1년         |
| all    | 1000 | 전체        |

## 🚀 Deployment Checklist

- [x] Packages installed
- [x] Database table created
- [x] API endpoint implemented
- [x] Chart component created
- [x] Page integration completed
- [x] Sample data script ready
- [ ] **Database table created in Supabase** ← USER ACTION REQUIRED
- [ ] Sample data generated (optional)
- [ ] Tested on localhost
- [ ] Tested on production

## 📊 Data Flow

```
1. User visits category page
   ↓
2. CategoryChart component loads
   ↓
3. Fetch /api/youtube-industry/categories/[code]/history?period=1m
   ↓
4. API queries youtube_channel_history table
   ↓
5. Calculate daily averages and changes
   ↓
6. Return chartData, currentValue, changes
   ↓
7. Chart renders with recharts
   ↓
8. User interacts (period change, tooltip)
```

## 💡 Future Enhancements

### 1. Comparison Chart
```typescript
// 여러 산업 동시 비교
<CategoryComparisonChart categories={['Y10', 'Y01', 'Y02']} />
```

### 2. Volume Chart
```typescript
// 영상 업로드 수 바 차트
<BarChart data={uploadData}>
  <Bar dataKey="videoCount" fill="#3b82f6" />
</BarChart>
```

### 3. Heatmap
```typescript
// 요일별/시간대별 업로드 패턴
<HeatmapChart data={patternData} />
```

### 4. Real-time Updates
```typescript
// 실시간 데이터 업데이트
useEffect(() => {
  const interval = setInterval(() => {
    loadChartData()
  }, 60000) // 1분마다
  return () => clearInterval(interval)
}, [])
```

## 🐛 Troubleshooting

### Issue 1: "supabaseKey is required"
**Solution**: Check environment variables in `.env.local`

### Issue 2: "Table youtube_channel_history doesn't exist"
**Solution**: Run the SQL script in Supabase SQL Editor

### Issue 3: Chart shows "샘플 데이터"
**Solution**: Run `npx tsx scripts/generate-sample-history.ts`

### Issue 4: No data in chart
**Solutions**:
1. Check if table exists
2. Check if data exists in table
3. Check API endpoint response
4. Check browser console for errors

### Issue 5: Chart not responsive
**Solution**: Check ResponsiveContainer wrapper in CategoryChart.tsx

## 📞 Support

For issues or questions:
1. Check browser console (F12)
2. Check API logs in terminal
3. Check Supabase logs
4. Review this documentation

## 🎉 Conclusion

토스증권 스타일의 시장 변동성 그래프가 성공적으로 구현되었습니다!

**Next Steps**:
1. Supabase에서 테이블 생성
2. (Optional) 샘플 데이터 생성
3. 브라우저에서 테스트
4. 프로덕션 배포

**Test URL**: `http://localhost:3001/youtube-industry/Y10`

Enjoy your new market volatility chart! 🚀📊
