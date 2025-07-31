-- Create valuation-related tables for the startup valuation dashboard feature

-- Valuations table to store user valuation calculations
CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  country TEXT DEFAULT 'KR',
  currency TEXT DEFAULT 'KRW',
  valuation_method TEXT NOT NULL CHECK (valuation_method IN ('dcf', 'multiple', 'comparable', 'venture')),
  input_data JSONB NOT NULL,
  results JSONB NOT NULL,
  notes TEXT,
  is_draft BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Flippa listings table for market comparison data
CREATE TABLE IF NOT EXISTS flippa_listings (
  id SERIAL PRIMARY KEY,
  flippa_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  asking_price DECIMAL(15, 2),
  monthly_revenue DECIMAL(15, 2),
  monthly_profit DECIMAL(15, 2),
  profit_multiple DECIMAL(8, 2),
  revenue_multiple DECIMAL(8, 2),
  industry VARCHAR(255),
  business_type VARCHAR(255),
  listing_status VARCHAR(50) DEFAULT 'active',
  listing_date DATE,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Industry multiples table for benchmark data
CREATE TABLE IF NOT EXISTS industry_multiples (
  id SERIAL PRIMARY KEY,
  industry VARCHAR(255) NOT NULL,
  country VARCHAR(2) DEFAULT 'KR',
  avg_profit_multiple DECIMAL(8, 2),
  median_profit_multiple DECIMAL(8, 2),
  min_profit_multiple DECIMAL(8, 2),
  max_profit_multiple DECIMAL(8, 2),
  avg_revenue_multiple DECIMAL(8, 2),
  median_revenue_multiple DECIMAL(8, 2),
  min_revenue_multiple DECIMAL(8, 2),
  max_revenue_multiple DECIMAL(8, 2),
  sample_size INTEGER,
  data_source VARCHAR(255),
  date_calculated DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(industry, country, date_calculated)
);

-- Saved valuation templates for users
CREATE TABLE IF NOT EXISTS valuation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  valuation_method TEXT NOT NULL,
  template_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Company profiles for recurring valuations
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  country TEXT DEFAULT 'KR',
  currency TEXT DEFAULT 'KRW',
  company_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, company_name)
);

-- Create indexes for better query performance
CREATE INDEX idx_valuations_user_id ON valuations(user_id);
CREATE INDEX idx_valuations_company_name ON valuations(company_name);
CREATE INDEX idx_valuations_industry ON valuations(industry);
CREATE INDEX idx_valuations_created_at ON valuations(created_at DESC);

CREATE INDEX idx_flippa_listings_industry ON flippa_listings(industry);
CREATE INDEX idx_flippa_listings_profit_multiple ON flippa_listings(profit_multiple);
CREATE INDEX idx_flippa_listings_revenue_multiple ON flippa_listings(revenue_multiple);
CREATE INDEX idx_flippa_listings_listing_date ON flippa_listings(listing_date DESC);

CREATE INDEX idx_industry_multiples_industry_country ON industry_multiples(industry, country);
CREATE INDEX idx_industry_multiples_date ON industry_multiples(date_calculated DESC);

CREATE INDEX idx_valuation_templates_user_id ON valuation_templates(user_id);
CREATE INDEX idx_valuation_templates_public ON valuation_templates(is_public) WHERE is_public = true;

CREATE INDEX idx_company_profiles_user_id ON company_profiles(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flippa_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_multiples ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Valuations: Users can only manage their own valuations
CREATE POLICY "Users can view own valuations" ON valuations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own valuations" ON valuations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own valuations" ON valuations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own valuations" ON valuations
  FOR DELETE USING (auth.uid() = user_id);

-- Flippa listings: Public read access, admin write access
CREATE POLICY "Public can view flippa listings" ON flippa_listings
  FOR SELECT USING (true);

-- Industry multiples: Public read access, admin write access
CREATE POLICY "Public can view industry multiples" ON industry_multiples
  FOR SELECT USING (true);

-- Valuation templates: Users manage own, can view public
CREATE POLICY "Users can view own templates" ON valuation_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own templates" ON valuation_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON valuation_templates
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON valuation_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Company profiles: Users can only manage their own
CREATE POLICY "Users can view own company profiles" ON company_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own company profiles" ON company_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company profiles" ON company_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own company profiles" ON company_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_valuations_updated_at BEFORE UPDATE ON valuations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industry_multiples_updated_at BEFORE UPDATE ON industry_multiples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_valuation_templates_updated_at BEFORE UPDATE ON valuation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RPC function for incrementing template use count
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE valuation_templates
  SET use_count = use_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;