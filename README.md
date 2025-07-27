# The Founder - 한국 스타트업 인사이트 블로그 플랫폼

한국 스타트업 생태계의 깊이 있는 인사이트와 창업가들의 진솔한 이야기를 전하는 프리미엄 블로그 플랫폼입니다.

## 🚀 주요 기능

- **프리미엄 콘텐츠 시스템**: 멤버십 기반의 프리미엄 콘텐츠 접근 제어
- **Notion API 연동**: Notion을 CMS로 활용한 효율적인 콘텐츠 관리
- **소셜 로그인**: Google, Kakao OAuth를 통한 간편한 회원가입/로그인
- **반응형 디자인**: 모바일 최적화된 사용자 경험
- **실시간 뉴스레터**: 주간 스타트업 인사이트 구독 서비스

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React

### Backend & Services
- **Authentication**: Supabase Auth (Google, Kakao OAuth)
- **Database**: Supabase (PostgreSQL)
- **CMS**: Notion API
- **Deployment**: Vercel

## 📋 필수 환경 변수

`.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Notion API
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id
```

## 🚀 시작하기

### 1. 프로젝트 클론

```bash
git clone https://github.com/lanfin27/thefounder.git
cd thefounder
```

### 2. 의존성 설치

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. 환경 변수 설정

위의 필수 환경 변수를 `.env.local` 파일에 설정하세요.

### 4. 개발 서버 실행

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 📦 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
npm run start
```

### Vercel 배포

1. [Vercel](https://vercel.com)에 프로젝트 Import
2. 환경 변수 설정
3. 자동 배포 설정

## 🔧 Supabase 설정

### 1. 프로젝트 생성

[Supabase Dashboard](https://app.supabase.com)에서 새 프로젝트를 생성합니다.

### 2. OAuth 설정

**Google OAuth**:
1. [Google Cloud Console](https://console.cloud.google.com)에서 OAuth 2.0 클라이언트 생성
2. Redirect URI: `https://YOUR_SUPABASE_URL/auth/v1/callback`
3. Supabase Dashboard > Authentication > Providers에서 Google 활성화

**Kakao OAuth**:
1. [Kakao Developers](https://developers.kakao.com)에서 애플리케이션 생성
2. Redirect URI: `https://YOUR_SUPABASE_URL/auth/v1/callback`
3. Supabase Dashboard > Authentication > Providers에서 Kakao 활성화

### 3. 데이터베이스 스키마

```sql
-- Users table (Supabase Auth 자동 생성)

-- Profiles table (Extended)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  membership_status TEXT DEFAULT 'free',
  membership_expires_at TIMESTAMP,
  newsletter_subscribed BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## 📝 Notion CMS 설정

### 1. Notion 데이터베이스 생성

다음 속성을 가진 데이터베이스를 생성하세요:

- **Title** (제목): Title property
- **Slug** (슬러그): Text property
- **Category** (카테고리): Select property
  - Options: 스타트업, 테크, 투자, 인터뷰
- **Tags** (태그): Multi-select property
- **Premium** (프리미엄): Checkbox property
- **PublishedAt** (발행일): Date property

### 2. Notion Integration 생성

1. [Notion Integrations](https://www.notion.so/my-integrations)에서 새 Integration 생성
2. 생성한 데이터베이스에 Integration 연결
3. API Key를 `.env.local`에 추가

## 🏗 프로젝트 구조

```
the-founder/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API Routes
│   │   ├── auth/            # 인증 페이지
│   │   ├── blog/            # 블로그 페이지
│   │   └── membership/      # 멤버십 페이지
│   ├── components/          # React 컴포넌트
│   │   ├── auth/           # 인증 관련 컴포넌트
│   │   ├── blog/           # 블로그 관련 컴포넌트
│   │   ├── home/           # 홈페이지 컴포넌트
│   │   └── layout/         # 레이아웃 컴포넌트
│   ├── lib/                # 유틸리티 함수
│   │   ├── notion/         # Notion API 클라이언트
│   │   └── supabase/       # Supabase 클라이언트
│   ├── styles/             # 글로벌 스타일
│   └── types/              # TypeScript 타입 정의
├── public/                 # 정적 파일
└── package.json
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License.

## 🙏 감사의 말

- [Supabase](https://supabase.com) - 오픈소스 Firebase 대안
- [Notion](https://notion.so) - 강력한 노트 및 데이터베이스 도구
- [Vercel](https://vercel.com) - Next.js 호스팅 플랫폼