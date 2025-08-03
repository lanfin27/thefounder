-- Add missing columns for unified scraper compatibility
-- This migration ensures all columns referenced by the scraper exist in the database

-- The profit_multiple column was already added in previous migration
-- Check and add only if not exists to prevent errors
DO $$ 
BEGIN
  -- Add property_type if it doesn't exist (it should exist from initial schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'flippa_listings' 
                AND column_name = 'property_type') THEN
    ALTER TABLE flippa_listings ADD COLUMN property_type TEXT;
  END IF;

  -- Add badges if it doesn't exist (it should exist as TEXT[] from initial schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'flippa_listings' 
                AND column_name = 'badges') THEN
    ALTER TABLE flippa_listings ADD COLUMN badges TEXT[] DEFAULT '{}';
  END IF;

  -- Add quality_score if it doesn't exist (it should exist from initial schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'flippa_listings' 
                AND column_name = 'quality_score') THEN
    ALTER TABLE flippa_listings ADD COLUMN quality_score INTEGER DEFAULT 0;
  END IF;

  -- Add extraction_confidence if it doesn't exist (it should exist from initial schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'flippa_listings' 
                AND column_name = 'extraction_confidence') THEN
    ALTER TABLE flippa_listings ADD COLUMN extraction_confidence DECIMAL(3,2) DEFAULT 0.95;
  END IF;

  -- Add page_number if it doesn't exist (it should exist from initial schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'flippa_listings' 
                AND column_name = 'page_number') THEN
    ALTER TABLE flippa_listings ADD COLUMN page_number INTEGER DEFAULT 1;
  END IF;

  -- Add raw_data if it doesn't exist (it should exist from initial schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'flippa_listings' 
                AND column_name = 'raw_data') THEN
    ALTER TABLE flippa_listings ADD COLUMN raw_data JSONB;
  END IF;

  -- Add source if it doesn't exist (it should exist from initial schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'flippa_listings' 
                AND column_name = 'source') THEN
    ALTER TABLE flippa_listings ADD COLUMN source TEXT DEFAULT 'flippa';
  END IF;
END $$;

-- Convert badges column to JSONB for unified scraper compatibility
-- The scraper expects JSONB but the initial schema has TEXT[]
-- We'll handle both formats
ALTER TABLE flippa_listings 
ALTER COLUMN badges TYPE JSONB 
USING CASE 
  WHEN badges IS NULL THEN '[]'::JSONB
  ELSE array_to_json(badges)::JSONB
END;

-- Add indexes for new columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_flippa_property_type ON flippa_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_flippa_badges ON flippa_listings USING GIN(badges);

-- Add comment to clarify column purposes
COMMENT ON COLUMN flippa_listings.property_type IS 'Type of property (Website, SaaS, Ecommerce, etc.)';
COMMENT ON COLUMN flippa_listings.badges IS 'Array of badges/tags associated with the listing';
COMMENT ON COLUMN flippa_listings.quality_score IS 'Data quality score (0-100) based on completeness';
COMMENT ON COLUMN flippa_listings.extraction_confidence IS 'Confidence level of data extraction (0-1)';

-- Create a function to restore data from backup JSON if needed
CREATE OR REPLACE FUNCTION restore_listings_from_json(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
  listing JSONB;
  restored_count INTEGER := 0;
BEGIN
  -- Loop through each listing in the JSON array
  FOR listing IN SELECT * FROM jsonb_array_elements(json_data)
  LOOP
    -- Insert listing with all available fields
    INSERT INTO flippa_listings (
      listing_id,
      title,
      price,
      monthly_profit,
      monthly_revenue,
      profit_multiple,
      revenue_multiple,
      multiple_text,
      property_type,
      category,
      badges,
      url,
      quality_score,
      extraction_confidence,
      page_number,
      source,
      raw_data
    ) VALUES (
      listing->>'id',
      listing->>'title',
      (listing->>'price')::BIGINT,
      (listing->>'monthlyProfit')::BIGINT,
      (listing->>'monthlyRevenue')::BIGINT,
      (listing->>'profitMultiple')::DECIMAL(10,2),
      (listing->>'revenueMultiple')::DECIMAL(10,2),
      COALESCE(listing->>'multiple_text', ''),
      listing->>'propertyType',
      listing->>'category',
      COALESCE(listing->'badges', '[]'::JSONB),
      listing->>'url',
      COALESCE((listing->>'quality_score')::INTEGER, 0),
      COALESCE((listing->>'extraction_confidence')::DECIMAL(3,2), 0.95),
      COALESCE((listing->>'page_number')::INTEGER, 1),
      COALESCE(listing->>'source', 'flippa_unified'),
      listing
    )
    ON CONFLICT (listing_id, extraction_timestamp) DO UPDATE
    SET 
      title = EXCLUDED.title,
      price = EXCLUDED.price,
      monthly_profit = EXCLUDED.monthly_profit,
      monthly_revenue = EXCLUDED.monthly_revenue,
      profit_multiple = EXCLUDED.profit_multiple,
      revenue_multiple = EXCLUDED.revenue_multiple,
      multiple_text = EXCLUDED.multiple_text,
      property_type = EXCLUDED.property_type,
      badges = EXCLUDED.badges,
      quality_score = EXCLUDED.quality_score,
      raw_data = EXCLUDED.raw_data;
    
    restored_count := restored_count + 1;
  END LOOP;
  
  RETURN restored_count;
END;
$$ LANGUAGE plpgsql;

-- Update existing records to ensure data consistency
UPDATE flippa_listings 
SET has_complete_financials = TRUE 
WHERE monthly_profit IS NOT NULL 
  AND (profit_multiple IS NOT NULL OR revenue_multiple IS NOT NULL)
  AND has_complete_financials IS NULL;

-- Ensure extraction_timestamp exists with proper default
ALTER TABLE flippa_listings 
ALTER COLUMN extraction_timestamp SET DEFAULT NOW();

-- Final check: List all columns for verification
DO $$
BEGIN
  RAISE NOTICE 'Current flippa_listings columns:';
  RAISE NOTICE '%', (
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
    FROM information_schema.columns 
    WHERE table_name = 'flippa_listings'
  );
END $$;