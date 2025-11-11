-- ===================================================
-- Profiles 테이블에 role 컬럼 추가
-- ===================================================
-- 작성일: 2025-11-11
-- 목적: Admin 권한 관리를 위한 role 필드 추가
-- ===================================================

-- profiles 테이블 확인 및 생성
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- role 컬럼 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    RAISE NOTICE 'Role column added to profiles table';
  ELSE
    RAISE NOTICE 'Role column already exists in profiles table';
  END IF;
END $$;

-- RLS 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 프로필 조회 가능
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 모든 사용자가 다른 사용자의 기본 정보 조회 가능 (이메일, 이름)
CREATE POLICY IF NOT EXISTS "Users can view other profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 사용자는 자신의 프로필만 업데이트 가능
CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 신규 사용자 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (이미 있으면 무시)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 기존 사용자들에게 role 설정 (없으면 'user')
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- 권한 설정
GRANT SELECT, UPDATE ON profiles TO authenticated;

RAISE NOTICE 'Profiles table and role column configured successfully';
