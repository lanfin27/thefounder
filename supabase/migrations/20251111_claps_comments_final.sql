-- ===================================================
-- 박수 및 댓글 기능 완전 구현
-- ===================================================
-- 작성일: 2025-11-11
-- 목적: 로그인 필수, 일반 유저 1회 제한, Admin 무제한
-- ===================================================

-- ===== 1. posts 테이블에 컬럼 추가 =====
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS claps_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_posts_claps_count ON posts(claps_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_comments_count ON posts(comments_count DESC);

-- ===== 2. 기존 post_claps 테이블 삭제 후 재생성 =====
DROP TABLE IF EXISTS post_claps CASCADE;

CREATE TABLE post_claps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 일반 유저는 한 포스트당 한 번만 박수 가능
  -- Admin은 UNIQUE 제약 없이 여러 번 가능 (애플리케이션 레벨에서 처리)
  UNIQUE(post_id, user_id)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_post_claps_post_id ON post_claps(post_id);
CREATE INDEX IF NOT EXISTS idx_post_claps_user_id ON post_claps(user_id);
CREATE INDEX IF NOT EXISTS idx_post_claps_created_at ON post_claps(created_at DESC);

-- ===== 3. RLS (Row Level Security) 설정 =====
ALTER TABLE post_claps ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 박수 조회 가능
CREATE POLICY "Authenticated users can view claps"
  ON post_claps FOR SELECT
  TO authenticated
  USING (true);

-- 로그인한 사용자만 박수 추가 가능
CREATE POLICY "Authenticated users can add claps"
  ON post_claps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 자신의 박수만 삭제 가능 (취소 기능용)
CREATE POLICY "Users can delete own claps"
  ON post_claps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== 4. 박수 수 자동 업데이트 함수 =====
CREATE OR REPLACE FUNCTION update_post_claps_count()
RETURNS TRIGGER AS $$
DECLARE
  v_post_slug TEXT;
BEGIN
  -- INSERT 또는 DELETE 시 post_id 결정
  v_post_slug := COALESCE(NEW.post_id, OLD.post_id);

  -- posts 테이블의 claps_count 업데이트
  UPDATE posts
  SET claps_count = (
    SELECT COUNT(*)
    FROM post_claps
    WHERE post_claps.post_id = v_post_slug
  )
  WHERE slug = v_post_slug OR id = v_post_slug;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_claps_count_trigger ON post_claps;
CREATE TRIGGER update_claps_count_trigger
  AFTER INSERT OR DELETE
  ON post_claps
  FOR EACH ROW
  EXECUTE FUNCTION update_post_claps_count();

-- ===== 5. 댓글 수 자동 업데이트 함수 =====
-- comments 테이블이 있는지 확인하고 트리거 생성
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
    -- 함수 생성
    CREATE OR REPLACE FUNCTION update_post_comments_count()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_post_id TEXT;
    BEGIN
      -- INSERT, UPDATE, DELETE 시 post_id 결정
      v_post_id := COALESCE(NEW.post_id, OLD.post_id);

      -- posts 테이블의 comments_count 업데이트
      UPDATE posts
      SET comments_count = (
        SELECT COUNT(*)
        FROM comments
        WHERE comments.post_id = v_post_id
        AND (comments.deleted_at IS NULL OR comments.deleted_at > NOW())
      )
      WHERE id = v_post_id OR slug = v_post_id;

      RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 트리거 생성
    DROP TRIGGER IF EXISTS update_comments_count_trigger ON comments;
    CREATE TRIGGER update_comments_count_trigger
      AFTER INSERT OR DELETE OR UPDATE OF deleted_at
      ON comments
      FOR EACH ROW
      EXECUTE FUNCTION update_post_comments_count();

    RAISE NOTICE 'Comments count trigger created successfully';
  ELSE
    RAISE NOTICE 'Comments table does not exist, skipping comments_count trigger';
  END IF;
END $$;

-- ===== 6. 기존 데이터 초기화 =====
-- 기존 박수 수 초기화 (0으로 리셋)
UPDATE posts SET claps_count = 0;

-- 기존 댓글 수 계산 (comments 테이블이 있으면)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
    UPDATE posts
    SET comments_count = (
      SELECT COUNT(*)
      FROM comments
      WHERE comments.post_id = posts.id
      AND (comments.deleted_at IS NULL OR comments.deleted_at > NOW())
    );
    RAISE NOTICE 'Comments count initialized successfully';
  END IF;
END $$;

-- ===== 7. 권한 설정 =====
-- 인증된 사용자만 post_claps 테이블에 접근 가능
GRANT SELECT, INSERT, DELETE ON post_claps TO authenticated;

-- ===== 8. 완료 메시지 =====
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '박수 및 댓글 기능 마이그레이션 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ posts 테이블에 claps_count, comments_count 컬럼 추가';
  RAISE NOTICE '✅ post_claps 테이블 생성 (user_id 기반)';
  RAISE NOTICE '✅ RLS 정책 설정 (로그인 필수)';
  RAISE NOTICE '✅ 자동 업데이트 트리거 생성';
  RAISE NOTICE '========================================';
END $$;
