-- Time series table for chart data
CREATE TABLE IF NOT EXISTS industry_multiples_timeseries (
  id SERIAL PRIMARY KEY,
  industry VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  avg_profit_multiple DECIMAL(10,2),
  avg_revenue_multiple DECIMAL(10,2),
  transaction_count INTEGER DEFAULT 0,
  total_volume DECIMAL(15,2) DEFAULT 0,
  volatility_index DECIMAL(5,4) DEFAULT 0,
  high_multiple DECIMAL(10,2),
  low_multiple DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(industry, date)
);

-- Indexes for fast chart queries
CREATE INDEX IF NOT EXISTS idx_timeseries_industry_date ON industry_multiples_timeseries(industry, date DESC);
CREATE INDEX IF NOT EXISTS idx_timeseries_date_range ON industry_multiples_timeseries(date DESC, industry);
CREATE INDEX IF NOT EXISTS idx_timeseries_recent ON industry_multiples_timeseries(date DESC) WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_timeseries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_timeseries_updated_at_trigger ON industry_multiples_timeseries;
CREATE TRIGGER update_timeseries_updated_at_trigger
  BEFORE UPDATE ON industry_multiples_timeseries
  FOR EACH ROW EXECUTE FUNCTION update_timeseries_updated_at();

-- Enable RLS
ALTER TABLE industry_multiples_timeseries ENABLE ROW LEVEL SECURITY;

-- Public read access for chart data
CREATE POLICY "Public can view timeseries data" ON industry_multiples_timeseries
  FOR SELECT USING (true);

-- Insert sample data for testing (last 30 days)
DO $$
DECLARE
  i INTEGER;
  base_value DECIMAL;
  variation DECIMAL;
BEGIN
  -- Generate data for SaaS
  base_value := 3.8;
  FOR i IN 0..29 LOOP
    variation := (random() - 0.5) * 0.4;
    INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
    VALUES (
      'SaaS', 
      CURRENT_DATE - INTERVAL '1 day' * i, 
      base_value + variation + (0.4 * (30 - i) / 30), -- Upward trend
      FLOOR(random() * 20 + 10)::INTEGER,
      FLOOR(random() * 1000000 + 500000)::DECIMAL
    ) ON CONFLICT (industry, date) DO NOTHING;
  END LOOP;

  -- Generate data for E-commerce
  base_value := 2.9;
  FOR i IN 0..29 LOOP
    variation := (random() - 0.5) * 0.3;
    INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
    VALUES (
      'E-commerce', 
      CURRENT_DATE - INTERVAL '1 day' * i, 
      base_value + variation - (0.1 * (30 - i) / 30), -- Slight downward trend
      FLOOR(random() * 15 + 5)::INTEGER,
      FLOOR(random() * 800000 + 200000)::DECIMAL
    ) ON CONFLICT (industry, date) DO NOTHING;
  END LOOP;

  -- Generate data for Content Sites
  base_value := 2.8;
  FOR i IN 0..29 LOOP
    variation := (random() - 0.5) * 0.3;
    INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
    VALUES (
      'Content Sites', 
      CURRENT_DATE - INTERVAL '1 day' * i, 
      base_value + variation + (0.3 * (30 - i) / 30), -- Moderate upward trend
      FLOOR(random() * 25 + 15)::INTEGER,
      FLOOR(random() * 500000 + 100000)::DECIMAL
    ) ON CONFLICT (industry, date) DO NOTHING;
  END LOOP;

  -- Generate data for Mobile Apps
  base_value := 4.8;
  FOR i IN 0..29 LOOP
    variation := (random() - 0.5) * 0.6;
    INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
    VALUES (
      'Mobile Apps', 
      CURRENT_DATE - INTERVAL '1 day' * i, 
      base_value + variation + (0.7 * (30 - i) / 30), -- Strong upward trend
      FLOOR(random() * 10 + 5)::INTEGER,
      FLOOR(random() * 300000 + 50000)::DECIMAL
    ) ON CONFLICT (industry, date) DO NOTHING;
  END LOOP;

  -- Generate data for 핀테크 (Fintech)
  base_value := 5.0;
  FOR i IN 0..29 LOOP
    variation := (random() - 0.5) * 0.5;
    INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
    VALUES (
      '핀테크', 
      CURRENT_DATE - INTERVAL '1 day' * i, 
      base_value + variation + (0.2 * (30 - i) / 30),
      FLOOR(random() * 12 + 8)::INTEGER,
      FLOOR(random() * 600000 + 300000)::DECIMAL
    ) ON CONFLICT (industry, date) DO NOTHING;
  END LOOP;

  -- Generate data for 헬스케어 (Healthcare)
  base_value := 4.0;
  FOR i IN 0..29 LOOP
    variation := (random() - 0.5) * 0.4;
    INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
    VALUES (
      '헬스케어', 
      CURRENT_DATE - INTERVAL '1 day' * i, 
      base_value + variation + (0.3 * (30 - i) / 30),
      FLOOR(random() * 8 + 4)::INTEGER,
      FLOOR(random() * 400000 + 200000)::DECIMAL
    ) ON CONFLICT (industry, date) DO NOTHING;
  END LOOP;

  -- Generate data for 교육 (Education)
  base_value := 2.5;
  FOR i IN 0..29 LOOP
    variation := (random() - 0.5) * 0.3;
    INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
    VALUES (
      '교육', 
      CURRENT_DATE - INTERVAL '1 day' * i, 
      base_value + variation + (0.1 * (30 - i) / 30),
      FLOOR(random() * 6 + 3)::INTEGER,
      FLOOR(random() * 200000 + 50000)::DECIMAL
    ) ON CONFLICT (industry, date) DO NOTHING;
  END LOOP;

  -- Generate data for 미디어/컨텐츠 (Media/Content)
  base_value := 3.0;
  FOR i IN 0..29 LOOP
    variation := (random() - 0.5) * 0.4;
    INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
    VALUES (
      '미디어/컨텐츠', 
      CURRENT_DATE - INTERVAL '1 day' * i, 
      base_value + variation + (0.2 * (30 - i) / 30),
      FLOOR(random() * 18 + 10)::INTEGER,
      FLOOR(random() * 350000 + 150000)::DECIMAL
    ) ON CONFLICT (industry, date) DO NOTHING;
  END LOOP;
END $$;

-- Calculate and update high/low multiples
UPDATE industry_multiples_timeseries t1
SET 
  high_multiple = (
    SELECT MAX(avg_profit_multiple) 
    FROM industry_multiples_timeseries t2 
    WHERE t2.industry = t1.industry 
    AND t2.date >= t1.date - INTERVAL '7 days' 
    AND t2.date <= t1.date
  ),
  low_multiple = (
    SELECT MIN(avg_profit_multiple) 
    FROM industry_multiples_timeseries t2 
    WHERE t2.industry = t1.industry 
    AND t2.date >= t1.date - INTERVAL '7 days' 
    AND t2.date <= t1.date
  );

-- Calculate volatility index (standard deviation over 7 days)
UPDATE industry_multiples_timeseries t1
SET volatility_index = (
  SELECT STDDEV(avg_profit_multiple)
  FROM industry_multiples_timeseries t2
  WHERE t2.industry = t1.industry
  AND t2.date >= t1.date - INTERVAL '7 days'
  AND t2.date <= t1.date
);