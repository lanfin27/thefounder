# Flippa Listings Schema Analysis Summary

**Generated on:** 2025-08-07  
**Script:** `scripts/check-flippa-columns.js`  
**Database:** Supabase (https://uwuynyftjhkwkdxzdaqc.supabase.co)  
**Table:** `flippa_listings`  
**Total Records:** 5,642

## 📊 Table Schema

| No. | Column Name         | Data Type | Nullable | Description |
|-----|---------------------|-----------|----------|-------------|
| 01. | id                  | integer   | NOT NULL | Auto-generated serial primary key |
| 02. | session_id          | text      | NOT NULL | Migration batch tracking ID (FK constraint) |
| 03. | url                 | text      | NOT NULL | Flippa listing URL (unique identifier) |
| 04. | title               | text      | NOT NULL | Listing title from Flippa |
| 05. | asking_price        | integer   | NOT NULL | Listing price in USD |
| 06. | monthly_revenue     | integer   | NOT NULL | Monthly revenue in USD |
| 07. | monthly_profit      | integer   | NOT NULL | Monthly profit in USD |
| 08. | age_months          | integer   | NOT NULL | Business age in months |
| 09. | page_views_monthly  | integer   | NOT NULL | Monthly page views count |
| 10. | category            | text      | NOT NULL | Business category from Flippa |
| 11. | description         | text      | NOT NULL | Full listing description |
| 12. | technologies        | text      | NULLABLE | Technology stack (optional) |
| 13. | scraped_at          | text      | NOT NULL | When data was scraped |
| 14. | created_at          | text      | NOT NULL | Database record creation time |

## 🔧 Migration-Ready INSERT Statement

```sql
INSERT INTO flippa_listings (
    id,
    session_id,
    url,
    title,
    asking_price,
    monthly_revenue,
    monthly_profit,
    age_months,
    page_views_monthly,
    category,
    description,
    technologies,
    scraped_at,
    created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
) ON CONFLICT (url) DO UPDATE SET
    session_id = EXCLUDED.session_id,
    title = EXCLUDED.title,
    asking_price = EXCLUDED.asking_price,
    monthly_revenue = EXCLUDED.monthly_revenue,
    monthly_profit = EXCLUDED.monthly_profit,
    age_months = EXCLUDED.age_months,
    page_views_monthly = EXCLUDED.page_views_monthly,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    technologies = EXCLUDED.technologies,
    scraped_at = EXCLUDED.scraped_at;
```

## 📝 JavaScript Object Template

```javascript
const flippaListingData = {
    id: null, // Auto-generated primary key
    session_id: 'migration_session_' + Date.now(), // Migration tracking
    url: scraped.url, // Unique identifier from Flippa
    title: scraped.title || 'Untitled Listing', // From scraped data
    asking_price: parseInt(scraped.asking_price) || 0, // Parse from currency string
    monthly_revenue: parseInt(scraped.monthly_revenue) || 0, // Parse from currency string
    monthly_profit: parseInt(scraped.monthly_profit) || 0, // Parse from currency string
    age_months: parseInt(scraped.age_months) || 0, // Business age in months
    page_views_monthly: parseInt(scraped.page_views_monthly) || 0, // Monthly page views
    category: scraped.category || 'Website', // Flippa category
    description: scraped.description || '', // HTML content may need cleaning
    technologies: scraped.technologies || null, // Tech stack used
    scraped_at: new Date().toISOString(), // Migration timestamp
    created_at: new Date().toISOString() // Database timestamp
};
```

## 🚀 Batch Insert Function for Migration

```javascript
async function insertFlippaListings(listings) {
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < listings.length; i += batchSize) {
        const batch = listings.slice(i, i + batchSize);
        
        const { data, error } = await supabase
            .from('flippa_listings')
            .upsert(batch, {
                onConflict: 'url',
                ignoreDuplicates: false
            })
            .select();
            
        if (error) {
            console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, error);
            throw error;
        }
        
        results.push(...data);
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(listings.length/batchSize)}`);
    }
    
    return results;
}
```

## ✅ Data Validation Function

```javascript
function validateFlippaListing(listing) {
    const errors = [];
    
    // Required field validation
    if (!listing.url) errors.push('URL is required');
    if (!listing.title) errors.push('Title is required');
    if (!listing.category) errors.push('Category is required');
    
    // Type validation
    if (typeof listing.asking_price !== 'number') errors.push('asking_price must be number');
    if (typeof listing.monthly_revenue !== 'number') errors.push('monthly_revenue must be number');
    if (typeof listing.monthly_profit !== 'number') errors.push('monthly_profit must be number');
    
    // Range validation
    if (listing.asking_price < 0) errors.push('asking_price cannot be negative');
    if (listing.monthly_revenue < 0) errors.push('monthly_revenue cannot be negative');
    
    return {
        isValid: errors.length === 0,
        errors
    };
}
```

## 📋 Sample Data

The database currently contains 5,642 records with examples like:

1. **Service Business #1** - $134,228 asking price, $4,256/month revenue
2. **Digital Product Business #2** - $41,701 asking price, $1,410/month revenue
3. **Newsletter Business #3** - $77,011 asking price, $4,583/month revenue

## ⚠️ Important Notes for Migration

1. **Foreign Key Constraint**: `session_id` has a foreign key constraint that must be satisfied
2. **URL is Unique**: The `url` field serves as the natural unique identifier
3. **Integer Types**: All financial and numeric fields are stored as integers (not decimal)
4. **Text Timestamps**: Date fields are stored as text (ISO format)
5. **Batch Processing**: Use batches of 100 records for optimal performance
6. **Upsert Strategy**: Use ON CONFLICT (url) for handling duplicates

## 🎯 Migration Strategy Recommendations

1. **Pre-validate all data** using the validation function
2. **Handle session_id** by creating valid sessions first
3. **Parse numeric fields** carefully from string formats
4. **Clean HTML content** in descriptions if needed
5. **Use batch processing** for large datasets
6. **Monitor progress** with logging between batches
7. **Test with small batches** before full migration

## 🔧 Usage

Run the schema analysis script:
```bash
node scripts/check-flippa-columns.js
```

Run database connection test only:
```bash
node scripts/check-flippa-columns.js --test
```

The script provides comprehensive schema analysis, migration templates, and database connectivity testing to ensure successful data migration to the Supabase `flippa_listings` table.