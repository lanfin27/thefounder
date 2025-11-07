-- Update posts category constraint to match Notion categories
-- From: ('뉴스레터', 'SaaS', '블로그', '창업')
-- To: ('트렌드', '인사이트', '블로그', '성공사례')

-- Drop the old constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;

-- Add new constraint with correct Notion categories
ALTER TABLE posts ADD CONSTRAINT posts_category_check
  CHECK (category IN ('트렌드', '인사이트', '블로그', '성공사례'));

-- Update existing posts to use new category values (if any exist)
UPDATE posts SET category = '트렌드' WHERE category = '뉴스레터';
UPDATE posts SET category = '인사이트' WHERE category = 'SaaS';
UPDATE posts SET category = '성공사례' WHERE category = '창업';
-- '블로그' stays the same
