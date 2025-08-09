// generate-large-sample-excel.js
// Generate a large sample Excel file with 5,635 rows to test the import system

const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const TARGET_ROWS = 5635; // Your expected row count
const BATCH_SIZE = 1000; // Generate in batches to manage memory

// Sample data generators
const categories = ['Website', 'E-commerce', 'SaaS', 'App', 'Content', 'Service', 'Marketplace', 'Domain', 'Digital Product', 'Newsletter'];
const statuses = ['active', 'sold', 'expired', 'pending', 'reserved', 'withdrawn'];
const propertyTypes = ['established_website', 'starter_site', 'app', 'saas', 'ecommerce', 'domain', 'digital_product'];
const industries = ['Technology', 'Health & Fitness', 'Education', 'Finance', 'Entertainment', 'Fashion', 'Food & Beverage', 'Travel', 'Real Estate', 'Gaming'];
const locations = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'Japan', 'Brazil', 'India'];
const businessAges = ['< 6 months', '6-12 months', '1-2 years', '2-5 years', '5-10 years', '> 10 years'];

function generateListingBatch(startIndex, batchSize) {
    const listings = [];
    
    for (let i = 0; i < batchSize; i++) {
        const index = startIndex + i;
        
        // Generate realistic price based on category
        const categoryIndex = Math.floor(Math.random() * categories.length);
        const category = categories[categoryIndex];
        
        let basePrice;
        switch (category) {
            case 'SaaS':
                basePrice = Math.floor(Math.random() * 1000000) + 50000;
                break;
            case 'E-commerce':
                basePrice = Math.floor(Math.random() * 500000) + 20000;
                break;
            case 'Domain':
                basePrice = Math.floor(Math.random() * 50000) + 100;
                break;
            default:
                basePrice = Math.floor(Math.random() * 300000) + 5000;
        }
        
        // Calculate related financial metrics
        const monthlyRevenue = Math.floor(basePrice / (Math.random() * 20 + 15));
        const monthlyProfit = Math.floor(monthlyRevenue * (Math.random() * 0.6 + 0.2));
        const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
        
        // Generate views, watchers, and bids based on price and status
        const priceMultiplier = Math.min(basePrice / 100000, 5);
        const views = Math.floor(Math.random() * 1000 * priceMultiplier) + 100;
        const watchers = Math.floor(views * (Math.random() * 0.1 + 0.05));
        const bids = statuses[Math.floor(Math.random() * statuses.length)] === 'active' ? 
                    Math.floor(Math.random() * 15) : 0;
        
        const listing = {
            // Primary fields
            id: `FL${String(index).padStart(6, '0')}`,
            title: generateTitle(category, index),
            category: category,
            property_type: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            price: basePrice,
            listing_url: `https://flippa.com/listings/website/FL${String(index).padStart(6, '0')}`,
            
            // Dates
            end_at: generateEndDate(),
            created_at: generateCreatedDate(),
            
            // Description
            description: generateDescription(category, monthlyRevenue, monthlyProfit),
            
            // Financial metrics
            monthly_revenue: monthlyRevenue,
            monthly_profit: monthlyProfit,
            profit_margin: parseFloat(profitMargin.toFixed(2)),
            revenue_multiple: monthlyRevenue > 0 ? parseFloat((basePrice / (monthlyRevenue * 12)).toFixed(2)) : 0,
            
            // Additional info
            business_age: businessAges[Math.floor(Math.random() * businessAges.length)],
            industry: industries[Math.floor(Math.random() * industries.length)],
            location: locations[Math.floor(Math.random() * locations.length)],
            seller_name: `Seller_${Math.floor(Math.random() * 1000) + 1}`,
            
            // Engagement metrics
            views: views,
            watchers: watchers,
            bids: bids,
            
            // Auction details
            auction_type: Math.random() > 0.7 ? 'classified' : 'auction',
            buy_it_now_price: Math.random() > 0.5 ? basePrice * 1.2 : null,
            starting_price: basePrice * 0.7,
            reserve_price: Math.random() > 0.6 ? basePrice * 0.9 : null,
            
            // Additional fields
            verified: Math.random() > 0.3,
            featured: Math.random() > 0.9,
            urgent_sale: Math.random() > 0.8,
            traffic_source: ['Organic', 'Paid', 'Social', 'Direct', 'Referral'][Math.floor(Math.random() * 5)],
            monetization_method: ['Advertising', 'Subscriptions', 'E-commerce', 'Affiliate', 'Services'][Math.floor(Math.random() * 5)]
        };
        
        listings.push(listing);
    }
    
    return listings;
}

function generateTitle(category, index) {
    const adjectives = ['Premium', 'Profitable', 'Established', 'Growing', 'Automated', 'Passive', 'High-Traffic', 'Niche', 'Branded', 'Turnkey'];
    const suffixes = ['Business', 'Website', 'Platform', 'Store', 'Service', 'App', 'Portal', 'Network', 'Solution', 'System'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${adjective} ${category} ${suffix} #${index}`;
}

function generateDescription(category, revenue, profit) {
    const templates = [
        `Well-established ${category.toLowerCase()} business generating $${revenue.toLocaleString()} in monthly revenue with $${profit.toLocaleString()} profit. Fully automated with minimal time investment required.`,
        `Profitable ${category.toLowerCase()} with proven track record. Monthly revenue of $${revenue.toLocaleString()} and growing. Perfect for entrepreneurs looking for passive income.`,
        `Turn-key ${category.toLowerCase()} business with established customer base. Currently earning $${profit.toLocaleString()} monthly profit with potential for growth.`,
        `High-quality ${category.toLowerCase()} operation with streamlined processes. Revenue: $${revenue.toLocaleString()}/month. All assets and training included.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
}

function generateEndDate() {
    const daysFromNow = Math.floor(Math.random() * 30) + 1;
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
}

function generateCreatedDate() {
    const daysAgo = Math.floor(Math.random() * 180) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
}

async function createLargeExcelFile() {
    console.log(`🚀 Generating Large Sample Excel File`);
    console.log(`=====================================`);
    console.log(`Target rows: ${TARGET_ROWS.toLocaleString()}`);
    console.log(`Batch size: ${BATCH_SIZE.toLocaleString()}\n`);

    const startTime = Date.now();
    const allListings = [];

    // Generate data in batches
    for (let i = 0; i < TARGET_ROWS; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, TARGET_ROWS - i);
        console.log(`📊 Generating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(TARGET_ROWS / BATCH_SIZE)} (rows ${i + 1}-${i + batchSize})...`);
        
        const batch = generateListingBatch(i + 1, batchSize);
        allListings.push(...batch);
        
        // Show memory usage
        const memUsage = process.memoryUsage();
        console.log(`   Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    }

    console.log(`\n✅ Generated ${allListings.length.toLocaleString()} listings`);

    // Create workbook with multiple sheets to test multi-sheet handling
    console.log('\n📄 Creating Excel workbook...');
    const wb = xlsx.utils.book_new();

    // Main sheet with all listings
    const mainSheet = xlsx.utils.json_to_sheet(allListings);
    xlsx.utils.book_append_sheet(wb, mainSheet, 'All Listings');

    // Additional sheet with active listings only
    const activeListings = allListings.filter(l => l.status === 'active').slice(0, 1000);
    const activeSheet = xlsx.utils.json_to_sheet(activeListings);
    xlsx.utils.book_append_sheet(wb, activeSheet, 'Active Listings');

    // Summary sheet
    const summary = [{
        'Total Listings': allListings.length,
        'Active': allListings.filter(l => l.status === 'active').length,
        'Sold': allListings.filter(l => l.status === 'sold').length,
        'Average Price': Math.round(allListings.reduce((sum, l) => sum + l.price, 0) / allListings.length),
        'Total Value': allListings.reduce((sum, l) => sum + l.price, 0),
        'Categories': [...new Set(allListings.map(l => l.category))].length,
        'Generated Date': new Date().toISOString()
    }];
    const summarySheet = xlsx.utils.json_to_sheet(summary);
    xlsx.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Write the file
    const outputPath = path.join(__dirname, '..', 'dataset_flippascraperapi_20250802_051204877_large.xlsx');
    console.log('💾 Writing Excel file...');
    
    // Write with compression for smaller file size
    xlsx.writeFile(wb, outputPath, {
        compression: true,
        bookType: 'xlsx'
    });

    const fileStats = fs.statSync(outputPath);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`\n✅ Large Excel file created successfully!`);
    console.log(`📁 File: ${outputPath}`);
    console.log(`📊 Size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏱️ Time: ${duration.toFixed(2)} seconds`);
    console.log(`📋 Sheets: ${wb.SheetNames.join(', ')}`);

    // Display sample data
    console.log('\n📋 Sample data (first 5 listings):');
    console.table(allListings.slice(0, 5).map(listing => ({
        id: listing.id,
        title: listing.title.substring(0, 30) + '...',
        price: `$${listing.price.toLocaleString()}`,
        revenue: `$${listing.monthly_revenue.toLocaleString()}`,
        status: listing.status,
        category: listing.category
    })));

    // Category distribution
    console.log('\n📊 Category Distribution:');
    const categoryCount = {};
    allListings.forEach(l => {
        categoryCount[l.category] = (categoryCount[l.category] || 0) + 1;
    });
    Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
            console.log(`  ${cat}: ${count.toLocaleString()} (${((count / allListings.length) * 100).toFixed(1)}%)`);
        });

    return outputPath;
}

// Run the generator
if (require.main === module) {
    createLargeExcelFile()
        .then(filepath => {
            console.log('\n🎯 Next steps:');
            console.log('1. Import this file into the baseline database:');
            console.log(`   node scripts/setup-baseline-database-large.js "${filepath}"`);
            console.log('\n2. Or rename it to the expected filename:');
            console.log('   dataset_flippascraperapi_20250802_051204877.xlsx');
        })
        .catch(error => {
            console.error('❌ Error generating file:', error);
            process.exit(1);
        });
}

module.exports = { createLargeExcelFile };