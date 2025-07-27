-- Extend profiles table for blog subscriptions and additional fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create read_posts table for tracking user reading history
CREATE TABLE IF NOT EXISTS read_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  post_id TEXT NOT NULL,
  read_at TIMESTAMP DEFAULT NOW(),
  reading_time INTEGER,
  UNIQUE(user_id, post_id)
);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  post_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create follows table for user-to-user following
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS on new tables
ALTER TABLE read_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for read_posts
CREATE POLICY "Users can view own read posts" ON read_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read posts" ON read_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read posts" ON read_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own read posts" ON read_posts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for bookmarks
CREATE POLICY "Users can view own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Users can view all follows" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Create function to update user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();