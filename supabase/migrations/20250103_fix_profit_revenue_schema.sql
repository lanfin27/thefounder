-- Fix Data Schema & Labeling Migration
-- Separates profit and revenue data for accurate financial tracking

-- Add new columns for proper data separation
ALTER TABLE flippa_listings 
ADD COLUMN IF NOT EXISTS monthly_profit BIGINT,
ADD COLUMN IF NOT EXISTS revenue_multiple DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS revenue_amount BIGINT;

-- Migrate existing data (monthly_revenue → monthly_profit)
-- This preserves existing data since it was actually profit data
UPDATE flippa_listings 
SET monthly_profit = monthly_revenue 
WHERE monthly_revenue IS NOT NULL 
  AND monthly_profit IS NULL;

-- Add indexes for new columns for performance
CREATE INDEX IF NOT EXISTS idx_flippa_listings_monthly_profit ON flippa_listings(monthly_profit);
CREATE INDEX IF NOT EXISTS idx_flippa_listings_revenue_multiple ON flippa_listings(revenue_multiple);
CREATE INDEX IF NOT EXISTS idx_flippa_listings_revenue_amount ON flippa_listings(revenue_amount);

-- Update column comments for clarity
COMMENT ON COLUMN flippa_listings.monthly_profit IS 'Monthly net profit in USD';
COMMENT ON COLUMN flippa_listings.monthly_revenue IS 'Monthly gross revenue in USD (fixed from previous misuse)';
COMMENT ON COLUMN flippa_listings.revenue_multiple IS 'Revenue multiple (e.g., 1.9x)';
COMMENT ON COLUMN flippa_listings.revenue_amount IS 'Deprecated - use monthly_revenue instead';

-- Add new columns to track both multiple types
ALTER TABLE flippa_listings 
ADD COLUMN IF NOT EXISTS profit_multiple DECIMAL(10,2);

-- Migrate existing multiple data to profit_multiple since it was profit data
UPDATE flippa_listings 
SET profit_multiple = multiple 
WHERE multiple IS NOT NULL 
  AND profit_multiple IS NULL;

-- Create index for profit_multiple
CREATE INDEX IF NOT EXISTS idx_flippa_listings_profit_multiple ON flippa_listings(profit_multiple);

-- Update multiple_text to be more descriptive
COMMENT ON COLUMN flippa_listings.multiple IS 'Deprecated - use profit_multiple or revenue_multiple';
COMMENT ON COLUMN flippa_listings.profit_multiple IS 'Profit multiple (e.g., 3.8x)';
COMMENT ON COLUMN flippa_listings.multiple_text IS 'Human readable multiple text (e.g., "3.8x profit | 1.9x revenue")';

-- Add quality tracking columns
ALTER TABLE flippa_listings 
ADD COLUMN IF NOT EXISTS has_complete_financials BOOLEAN DEFAULT FALSE;

-- Update existing records to mark complete financials
UPDATE flippa_listings 
SET has_complete_financials = TRUE 
WHERE monthly_profit IS NOT NULL 
  AND (profit_multiple IS NOT NULL OR revenue_multiple IS NOT NULL);

-- Create view for easy querying of complete financial data
CREATE OR REPLACE VIEW flippa_listings_complete AS
SELECT 
  id,
  listing_id,
  title,
  price,
  monthly_profit,
  monthly_revenue,
  profit_multiple,
  revenue_multiple,
  CASE 
    WHEN profit_multiple IS NOT NULL AND revenue_multiple IS NOT NULL THEN 
      profit_multiple || 'x profit | ' || revenue_multiple || 'x revenue'
    WHEN profit_multiple IS NOT NULL THEN 
      profit_multiple || 'x profit'
    WHEN revenue_multiple IS NOT NULL THEN 
      revenue_multiple || 'x revenue'
    ELSE multiple_text
  END as display_multiple,
  property_type,
  category,
  badges,
  url,
  quality_score,
  extraction_confidence,
  has_complete_financials,
  extraction_timestamp
FROM flippa_listings
WHERE quality_score > 0;

-- Add function to calculate missing multiples
CREATE OR REPLACE FUNCTION calculate_missing_multiples()
RETURNS void AS $$
BEGIN
  -- Calculate missing profit multiple from price and monthly profit
  UPDATE flippa_listings 
  SET profit_multiple = ROUND((price::decimal / (monthly_profit * 12))::numeric, 2)
  WHERE price IS NOT NULL 
    AND monthly_profit IS NOT NULL 
    AND monthly_profit > 0
    AND profit_multiple IS NULL;
  
  -- Calculate missing revenue multiple from price and monthly revenue
  UPDATE flippa_listings 
  SET revenue_multiple = ROUND((price::decimal / (monthly_revenue * 12))::numeric, 2)
  WHERE price IS NOT NULL 
    AND monthly_revenue IS NOT NULL 
    AND monthly_revenue > 0
    AND revenue_multiple IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to backfill any missing multiples
SELECT calculate_missing_multiples();

-- Create summary statistics view
CREATE OR REPLACE VIEW flippa_extraction_stats AS
SELECT 
  COUNT(*) as total_listings,
  COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as with_price,
  COUNT(CASE WHEN monthly_profit IS NOT NULL THEN 1 END) as with_profit,
  COUNT(CASE WHEN monthly_revenue IS NOT NULL THEN 1 END) as with_revenue,
  COUNT(CASE WHEN profit_multiple IS NOT NULL THEN 1 END) as with_profit_multiple,
  COUNT(CASE WHEN revenue_multiple IS NOT NULL THEN 1 END) as with_revenue_multiple,
  COUNT(CASE WHEN has_complete_financials = TRUE THEN 1 END) as complete_financials,
  ROUND(AVG(quality_score), 2) as avg_quality_score,
  ROUND(AVG(extraction_confidence), 2) as avg_confidence
FROM flippa_listings;

-- Add RLS policies if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'flippa_listings' 
    AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON flippa_listings
      FOR SELECT USING (true);
  END IF;
END $$;