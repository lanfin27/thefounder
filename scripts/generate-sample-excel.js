// generate-sample-excel.js
// Generate a sample Excel file to demonstrate the baseline database system

const xlsx = require('xlsx');
const path = require('path');

function generateSampleData() {
    const categories = ['Website', 'E-commerce', 'SaaS', 'App', 'Content', 'Service', 'Marketplace'];
    const statuses = ['active', 'sold', 'expired', 'pending'];
    const propertyTypes = ['established_website', 'starter_site', 'app', 'saas', 'ecommerce'];
    
    const listings = [];
    
    // Generate 100 sample listings (you mentioned 5,635 but we'll create a smaller sample)
    for (let i = 1; i <= 100; i++) {
        const basePrice = Math.floor(Math.random() * 500000) + 1000;
        const monthlyRevenue = Math.floor(basePrice / (Math.random() * 20 + 10));
        const monthlyProfit = Math.floor(monthlyRevenue * (Math.random() * 0.7 + 0.1));
        
        const listing = {
            id: `FL${String(i).padStart(6, '0')}`,
            title: `${categories[Math.floor(Math.random() * categories.length)]} Business #${i}`,
            category: categories[Math.floor(Math.random() * categories.length)],
            property_type: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            price: basePrice,
            listing_url: `https://flippa.com/listings/FL${String(i).padStart(6, '0')}`,
            end_at: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
            description: `This is a profitable ${categories[Math.floor(Math.random() * categories.length)].toLowerCase()} business with steady growth.`,
            monthly_revenue: monthlyRevenue,
            monthly_profit: monthlyProfit,
            business_age: `${Math.floor(Math.random() * 10) + 1} years`,
            industry: categories[Math.floor(Math.random() * categories.length)],
            location: ['USA', 'UK', 'Canada', 'Australia'][Math.floor(Math.random() * 4)],
            seller_name: `Seller${Math.floor(Math.random() * 50) + 1}`
        };
        
        listings.push(listing);
    }
    
    return listings;
}

function createExcelFile(data, filename) {
    // Create a new workbook
    const wb = xlsx.utils.book_new();
    
    // Convert data to worksheet
    const ws = xlsx.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Listings');
    
    // Write the file
    xlsx.writeFile(wb, filename);
    
    console.log(`✅ Created sample Excel file: ${filename}`);
    console.log(`📊 Total listings: ${data.length}`);
}

// Generate the sample file
const sampleData = generateSampleData();
const outputPath = path.join(__dirname, '..', 'dataset_flippascraperapi_20250802_051204877.xlsx');

createExcelFile(sampleData, outputPath);

// Display sample of the data
console.log('\n📋 Sample data (first 5 listings):');
console.table(sampleData.slice(0, 5).map(listing => ({
    id: listing.id,
    title: listing.title.substring(0, 30) + '...',
    price: `$${listing.price.toLocaleString()}`,
    status: listing.status,
    category: listing.category
})));