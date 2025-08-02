const fs = require('fs');
const path = require('path');

console.log('🎯 COMPREHENSIVE FLIPPA DATA ANALYSIS');
console.log('='.repeat(60));

const dataFolder = 'C:\\Users\\KIMJAEHEON\\Desktop\\flippa-scraper-api';
const jsonlFile = path.join(dataFolder, 'dataset_flippa-scraper-api_2025-08-02_05-12-04-877.jsonl');

// Read and analyze JSONL data
const jsonlContent = fs.readFileSync(jsonlFile, 'utf8');
const lines = jsonlContent.split('\n').filter(line => line.trim());
const records = lines.map(line => {
    try {
        return JSON.parse(line);
    } catch (e) {
        return null;
    }
}).filter(r => r !== null);

console.log(`\n📊 DATASET STATISTICS:`);
console.log(`Total Records: ${records.length}`);

// Analyze categories
const categories = {};
const propertyTypes = {};
const monetizations = {};
const saleMethods = {};
const countries = {};
const priceRanges = {
    'under_1k': 0,
    '1k_10k': 0,
    '10k_100k': 0,
    '100k_1m': 0,
    'over_1m': 0
};

// Analyze fields
const allFields = new Set();
const fieldCompleteness = {};

records.forEach(record => {
    // Collect all fields
    Object.keys(record).forEach(key => {
        allFields.add(key);
        if (!fieldCompleteness[key]) fieldCompleteness[key] = 0;
        if (record[key] !== null && record[key] !== undefined && record[key] !== '') {
            fieldCompleteness[key]++;
        }
    });
    
    // Category analysis
    if (record.category) categories[record.category] = (categories[record.category] || 0) + 1;
    if (record.property_type) propertyTypes[record.property_type] = (propertyTypes[record.property_type] || 0) + 1;
    if (record.monetization) monetizations[record.monetization] = (monetizations[record.monetization] || 0) + 1;
    if (record.sale_method) saleMethods[record.sale_method] = (saleMethods[record.sale_method] || 0) + 1;
    if (record.country_name) countries[record.country_name] = (countries[record.country_name] || 0) + 1;
    
    // Price analysis
    if (record.price && typeof record.price === 'number') {
        if (record.price < 1000) priceRanges['under_1k']++;
        else if (record.price < 10000) priceRanges['1k_10k']++;
        else if (record.price < 100000) priceRanges['10k_100k']++;
        else if (record.price < 1000000) priceRanges['100k_1m']++;
        else priceRanges['over_1m']++;
    }
});

// Sort and display results
console.log(`\n🏷️ TOP CATEGORIES (${Object.keys(categories).length} total):`);
Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} (${(count/records.length*100).toFixed(1)}%)`);
});

console.log(`\n📦 TOP PROPERTY TYPES (${Object.keys(propertyTypes).length} total):`);
Object.entries(propertyTypes).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} (${(count/records.length*100).toFixed(1)}%)`);
});

console.log(`\n💰 MONETIZATION METHODS (${Object.keys(monetizations).length} total):`);
Object.entries(monetizations).sort((a, b) => b[1] - a[1]).forEach(([method, count]) => {
    console.log(`   ${method}: ${count} (${(count/records.length*100).toFixed(1)}%)`);
});

console.log(`\n💵 PRICE DISTRIBUTION:`);
Object.entries(priceRanges).forEach(([range, count]) => {
    console.log(`   ${range}: ${count} (${(count/records.length*100).toFixed(1)}%)`);
});

console.log(`\n📋 FIELD ANALYSIS (${allFields.size} unique fields):`);
console.log(`\nCRITICAL FIELDS (>90% completeness):`);
Object.entries(fieldCompleteness)
    .map(([field, count]) => [field, (count/records.length*100)])
    .filter(([field, pct]) => pct > 90)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, pct]) => {
        console.log(`   ${field}: ${pct.toFixed(1)}%`);
    });

console.log(`\nIMPORTANT FIELDS (50-90% completeness):`);
Object.entries(fieldCompleteness)
    .map(([field, count]) => [field, (count/records.length*100)])
    .filter(([field, pct]) => pct > 50 && pct <= 90)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, pct]) => {
        console.log(`   ${field}: ${pct.toFixed(1)}%`);
    });

// Key data analysis
console.log(`\n🔑 KEY DATA FIELDS ANALYSIS:`);
const keyDataLabels = new Set();
records.forEach(record => {
    if (record.key_data && Array.isArray(record.key_data)) {
        record.key_data.forEach(kd => {
            if (kd.label) keyDataLabels.add(kd.label);
        });
    }
});
console.log(`Unique key_data labels: ${Array.from(keyDataLabels).join(', ')}`);

// Integration analysis
console.log(`\n🔗 INTEGRATION ANALYSIS:`);
const integrationTypes = new Set();
let integratedListings = 0;
records.forEach(record => {
    if (record.integrations && Array.isArray(record.integrations) && record.integrations.length > 0) {
        integratedListings++;
        record.integrations.forEach(int => integrationTypes.add(int));
    }
});
console.log(`Listings with integrations: ${integratedListings} (${(integratedListings/records.length*100).toFixed(1)}%)`);
console.log(`Integration types: ${Array.from(integrationTypes).join(', ') || 'None found'}`);

// Verification analysis
console.log(`\n✅ VERIFICATION STATUS:`);
let verifiedTraffic = 0;
let verifiedRevenue = 0;
let manuallyVetted = 0;
records.forEach(record => {
    if (record.has_verified_traffic) verifiedTraffic++;
    if (record.has_verified_revenue) verifiedRevenue++;
    if (record.manually_vetted) manuallyVetted++;
});
console.log(`   Verified Traffic: ${verifiedTraffic} (${(verifiedTraffic/records.length*100).toFixed(1)}%)`);
console.log(`   Verified Revenue: ${verifiedRevenue} (${(verifiedRevenue/records.length*100).toFixed(1)}%)`);
console.log(`   Manually Vetted: ${manuallyVetted} (${(manuallyVetted/records.length*100).toFixed(1)}%)`);

// Sample listing structure
console.log(`\n📄 SAMPLE LISTING STRUCTURE:`);
const sampleListing = records.find(r => r.price > 1000 && r.revenue_average > 0) || records[0];
console.log(JSON.stringify(sampleListing, null, 2));