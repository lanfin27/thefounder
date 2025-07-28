-- Add membership fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'free' CHECK (membership_status IN ('free', 'premium'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Create post_views table for analytics
CREATE TABLE IF NOT EXISTS post_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  session_id TEXT,
  view_date TIMESTAMP DEFAULT NOW(),
  reading_duration INTEGER, -- in seconds
  scroll_depth NUMERIC(5,2), -- percentage
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_reading_history table
CREATE TABLE IF NOT EXISTS user_reading_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  post_id TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP DEFAULT NOW(),
  progress NUMERIC(5,2) DEFAULT 0, -- percentage
  total_reading_time INTEGER DEFAULT 0, -- in seconds
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  unsubscribed_at TIMESTAMP,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create membership_transactions table
CREATE TABLE IF NOT EXISTS membership_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'KRW',
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  provider TEXT CHECK (provider IN ('stripe', 'kakao_pay', 'naver_pay', 'toss_payments')),
  provider_transaction_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_post_views_post_id ON post_views(post_id);
CREATE INDEX idx_post_views_user_id ON post_views(user_id);
CREATE INDEX idx_post_views_view_date ON post_views(view_date DESC);
CREATE INDEX idx_user_reading_history_user_id ON user_reading_history(user_id);
CREATE INDEX idx_user_reading_history_post_id ON user_reading_history(post_id);
CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX idx_membership_transactions_user_id ON membership_transactions(user_id);

-- Enable RLS on new tables
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_views
CREATE POLICY "Anyone can insert post views" ON post_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own post views" ON post_views
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- RLS Policies for user_reading_history
CREATE POLICY "Users can view own reading history" ON user_reading_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading history" ON user_reading_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading history" ON user_reading_history
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for newsletter_subscribers
CREATE POLICY "Users can view own subscription" ON newsletter_subscribers
  FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can subscribe" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own subscription" ON newsletter_subscribers
  FOR UPDATE USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = email);

-- RLS Policies for membership_transactions
CREATE POLICY "Users can view own transactions" ON membership_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions" ON membership_transactions
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_reading_history_updated_at BEFORE UPDATE ON user_reading_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscribers_updated_at BEFORE UPDATE ON newsletter_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();