-- Migration script to add comprehensive data columns to flippa_listings table

-- Add price-related columns
ALTER TABLE flippa_listings 
ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT 'asking',
ADD COLUMN IF NOT EXISTS sold_price DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS original_price DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2);

-- Add listing status
ALTER TABLE flippa_listings
ADD COLUMN IF NOT EXISTS listing_status VARCHAR(20) DEFAULT 'active';

-- Add badges as JSON array
ALTER TABLE flippa_listings
ADD COLUMN IF NOT EXISTS badges TEXT[];

-- Add geography
ALTER TABLE flippa_listings
ADD COLUMN IF NOT EXISTS geography VARCHAR(100);

-- Add confidential flag
ALTER TABLE flippa_listings
ADD COLUMN IF NOT EXISTS confidential BOOLEAN DEFAULT FALSE;

-- Add currency column for multi-currency support
ALTER TABLE flippa_listings
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_flippa_listings_price_type ON flippa_listings(price_type);
CREATE INDEX IF NOT EXISTS idx_flippa_listings_listing_status ON flippa_listings(listing_status);
CREATE INDEX IF NOT EXISTS idx_flippa_listings_profit_multiple ON flippa_listings(profit_multiple);
CREATE INDEX IF NOT EXISTS idx_flippa_listings_revenue_multiple ON flippa_listings(revenue_multiple);

-- Update existing records to have default values
UPDATE flippa_listings 
SET price_type = 'asking',
    listing_status = 'active'
WHERE price_type IS NULL;