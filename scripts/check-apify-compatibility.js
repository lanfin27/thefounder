// scripts/check-apify-compatibility.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function checkApifyCompatibility() {
  console.log('🔍 CHECKING APIFY COMPATIBILITY');
  console.log('=' .repeat(60));
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Load current data
  const { data: listings, error } = await supabase
    .from('flippa_listings')
    .select('*')
    .limit(100);
  
  if (error || !listings || listings.length === 0) {
    console.log('❌ No listings found');
    return;
  }
  
  console.log(`📊 Checking ${listings.length} listings for Apify compatibility`);
  
  // Define Apify core fields
  const apifyCoreFields = {
    id: 'listing_id',
    title: 'title',
    property_name: 'title',
    listing_url: 'url',
    price: 'price',
    revenue_average: 'monthly_revenue',
    profit_average: 'monthly_profit',
    multiple: 'multiple',
    revenue_multiple: 'multiple',
    category: 'category',
    property_type: 'raw_data',
    monetization: 'raw_data',
    country_name: 'raw_data',
    currency_label: 'raw_data',
    formatted_age_in_years: 'raw_data',
    has_verified_revenue: 'raw_data',
    has_verified_traffic: 'raw_data',
    status: 'raw_data',
    sale_method: 'raw_data',
    sale_method_title: 'raw_data',
    summary: 'raw_data'
  };
  
  // Calculate compatibility
  const compatibility = {
    coreFields: {},
    totalFields: 151,
    currentFields: 0,
    missingFields: []
  };
  
  // Check each core field
  Object.entries(apifyCoreFields).forEach(([apifyField, dbField]) => {
    let hasField = false;
    let sampleValue = null;
    
    if (dbField === 'raw_data') {
      // Check in raw_data JSON
      const withField = listings.filter(l => {
        const rawData = l.raw_data || {};
        return rawData[apifyField] !== undefined;
      });
      hasField = withField.length > 0;
      if (hasField) {
        sampleValue = withField[0].raw_data[apifyField];
      }
    } else {
      // Check direct field
      const withField = listings.filter(l => l[dbField] !== null && l[dbField] !== undefined);
      hasField = withField.length > 0;
      if (hasField) {
        sampleValue = withField[0][dbField];
      }
    }
    
    compatibility.coreFields[apifyField] = {
      exists: hasField,
      coverage: hasField ? '✅' : '❌',
      sampleValue: sampleValue
    };
    
    if (hasField) {
      compatibility.currentFields++;
    } else {
      compatibility.missingFields.push(apifyField);
    }
  });
  
  // Generate Apify-compatible export
  const apifyExport = listings.map(listing => {
    const apifyListing = {
      // Core identity fields
      id: listing.listing_id || '',
      title: listing.title || '',
      property_name: listing.title || '',
      listing_url: listing.url || '',
      
      // Financial fields
      price: listing.price || 0,
      revenue_average: listing.monthly_revenue || 0,
      profit_average: listing.monthly_profit || 0,
      multiple: listing.multiple || 0,
      revenue_multiple: listing.multiple || 0,
      
      // Classification fields
      category: listing.category || 'Internet',
      property_type: 'Website',
      monetization: 'E-commerce',
      
      // Location & Currency
      country_name: 'United States',
      currency_label: 'USD $',
      
      // Age & Establishment
      formatted_age_in_years: '<1 year',
      
      // Verification & Status
      has_verified_revenue: false,
      has_verified_traffic: false,
      status: 'open',
      
      // Sale Information
      sale_method: 'classified',
      sale_method_title: 'Buy It Now',
      
      // Content
      summary: listing.title || 'Premium online business opportunity',
      
      // Default values for remaining fields
      action_button_text: 'View Listing',
      action_class: 'primary',
      age_label: 'Site Age',
      broker_seller: false,
      confidential: false,
      early_access_listing: false,
      editors_choice: false,
      listing_watchable: true,
      managed_by_flippa: false,
      manually_vetted: false,
      open_listing: true,
      open_to_offer: false,
      bid_count: 0,
      
      // Key data structure
      key_data: {
        0: { label: 'Type', value: 'Website' },
        1: { label: 'Industry', value: listing.category || 'Internet' },
        2: { label: 'Monetization', value: 'E-commerce' },
        3: { label: 'Site Age', value: '<1 year' },
        4: { label: 'Net Profit', value: listing.monthly_profit ? `$${listing.monthly_profit}` : '$0' }
      }
    };
    
    return apifyListing;
  });
  
  console.log('\n📊 APIFY COMPATIBILITY ANALYSIS:');
  console.log('================================');
  console.log(`Total Apify Fields: ${compatibility.totalFields}`);
  console.log(`Currently Mapped: ${compatibility.currentFields}`);
  console.log(`Missing Fields: ${compatibility.missingFields.length}`);
  
  console.log('\n🔍 CORE FIELD MAPPING:');
  Object.entries(compatibility.coreFields).forEach(([field, info]) => {
    console.log(`${info.coverage} ${field}: ${info.exists ? 'Mapped' : 'Missing'}`);
    if (info.sampleValue !== null) {
      console.log(`   Sample: ${JSON.stringify(info.sampleValue).slice(0, 50)}`);
    }
  });
  
  // Save Apify-compatible export
  const exportData = {
    timestamp: new Date().toISOString(),
    total: apifyExport.length,
    format: 'Apify-compatible',
    listings: apifyExport
  };
  
  fs.writeFileSync(`apify-compatible-export-${Date.now()}.json`, JSON.stringify(exportData, null, 2));
  
  console.log(`\n💾 Saved Apify-compatible export with ${apifyExport.length} listings`);
  console.log('📄 File: apify-compatible-export-[timestamp].json');
  
  // Show sample Apify listing
  console.log('\n📝 SAMPLE APIFY-FORMATTED LISTING:');
  console.log(JSON.stringify(apifyExport[0], null, 2).slice(0, 500) + '...');
}

checkApifyCompatibility().catch(console.error);