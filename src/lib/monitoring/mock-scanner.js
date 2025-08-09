// Mock scanner for testing without real scraping or external dependencies
class MockScanner {
  constructor() {
    this.mockData = {
      categories: ['SaaS', 'E-commerce', 'Content', 'Apps', 'Services', 'Marketplace', 'Agency'],
      priceRanges: [10000, 25000, 50000, 100000, 250000, 500000, 1000000],
      revenueRanges: [1000, 5000, 10000, 25000, 50000, 100000]
    };
  }

  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async scan(options = {}) {
    console.log('🎭 Mock Scanner: Generating simulated Flippa data...');
    
    const pages = options.pages || 5;
    const listingsPerPage = 30;
    const totalListings = pages * listingsPerPage;
    
    const listings = [];
    const scanId = options.scanId || this.generateId('mock-scan');
    
    // Generate realistic mock listings
    for (let i = 0; i < totalListings; i++) {
      const listing = this.generateMockListing(i);
      listings.push(listing);
    }
    
    // Simulate scan time
    await this.sleep(2000);
    
    return {
      success: true,
      scanId,
      listings,
      errors: [],
      duration: 2,
      mode: 'mock',
      stats: {
        total: listings.length,
        byCategory: this.groupByCategory(listings),
        priceRange: this.analyzePriceRange(listings),
        revenueRange: this.analyzeRevenueRange(listings)
      }
    };
  }

  generateMockListing(index) {
    const id = `listing-${Date.now()}-${index}`;
    const category = this.randomChoice(this.mockData.categories);
    const basePrice = this.randomChoice(this.mockData.priceRanges);
    const baseRevenue = this.randomChoice(this.mockData.revenueRanges);
    
    // Add some variation
    const priceVariation = 0.8 + Math.random() * 0.4; // 80% to 120%
    const revenueVariation = 0.7 + Math.random() * 0.6; // 70% to 130%
    
    const listing = {
      listing_id: id,
      title: this.generateTitle(category, index),
      asking_price: Math.round(basePrice * priceVariation),
      monthly_revenue: Math.round(baseRevenue * revenueVariation),
      monthly_profit: Math.round(baseRevenue * revenueVariation * 0.3), // 30% profit margin
      category: category,
      url: `https://flippa.com/businesses/${id}`,
      age_months: Math.floor(Math.random() * 60) + 6, // 6-66 months
      page_views_monthly: Math.floor(Math.random() * 100000) + 1000,
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Add some high-value listings
    if (index % 20 === 0) {
      listing.asking_price = listing.asking_price * 5;
      listing.monthly_revenue = listing.monthly_revenue * 5;
      listing.title = '⭐ Premium ' + listing.title;
    }
    
    return listing;
  }

  generateTitle(category, index) {
    const templates = {
      'SaaS': [
        'AI-Powered {tool} Platform with {revenue}',
        'Cloud-Based {service} Solution - {metric}',
        'Subscription {product} Service with Recurring Revenue'
      ],
      'E-commerce': [
        '{niche} Online Store - {revenue}/month',
        'Dropshipping Business in {market}',
        'Established {product} Brand with {metric}'
      ],
      'Content': [
        '{niche} Blog Network - {traffic} Monthly Visitors',
        'Authority Site in {topic} Niche',
        'Content Platform with {metric}'
      ],
      'Apps': [
        '{platform} App with {users} Active Users',
        'Mobile Game - {revenue} Monthly Revenue',
        '{category} App with In-App Purchases'
      ],
      'Services': [
        'Digital Marketing Agency - {clients}',
        'Online {service} Business',
        'Freelance Platform for {niche}'
      ],
      'Marketplace': [
        '{niche} Marketplace Platform',
        'B2B Trading Platform - {metric}',
        'Peer-to-Peer {service} Marketplace'
      ],
      'Agency': [
        '{service} Agency with {clients} Clients',
        'Full-Service {niche} Agency',
        'Remote {service} Team Business'
      ]
    };
    
    const categoryTemplates = templates[category] || templates['SaaS'];
    const template = this.randomChoice(categoryTemplates);
    
    // Replace placeholders
    const replacements = {
      tool: this.randomChoice(['Analytics', 'CRM', 'Project Management', 'HR', 'Sales']),
      service: this.randomChoice(['Automation', 'Integration', 'Optimization', 'Management']),
      product: this.randomChoice(['Software', 'Tool', 'Platform', 'System']),
      niche: this.randomChoice(['Tech', 'Health', 'Finance', 'Education', 'Fashion']),
      market: this.randomChoice(['US', 'Global', 'Europe', 'Asia', 'UK']),
      topic: this.randomChoice(['Technology', 'Business', 'Lifestyle', 'Finance', 'Health']),
      platform: this.randomChoice(['iOS', 'Android', 'Cross-Platform', 'Web']),
      users: this.randomChoice(['10K', '50K', '100K', '500K']),
      clients: this.randomChoice(['20+', '50+', '100+', '200+']),
      traffic: this.randomChoice(['50K', '100K', '250K', '500K']),
      revenue: this.randomChoice(['$5K', '$10K', '$25K', '$50K']),
      metric: this.randomChoice(['Growing 20% MoM', 'Profitable', '90% Retention', 'Award-Winning'])
    };
    
    let title = template;
    Object.keys(replacements).forEach(key => {
      title = title.replace(`{${key}}`, replacements[key]);
    });
    
    return title + ` #${index + 1}`;
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  groupByCategory(listings) {
    const groups = {};
    listings.forEach(listing => {
      groups[listing.category] = (groups[listing.category] || 0) + 1;
    });
    return groups;
  }

  analyzePriceRange(listings) {
    const ranges = {
      'Under $50K': 0,
      '$50K-$100K': 0,
      '$100K-$500K': 0,
      'Over $500K': 0
    };
    
    listings.forEach(listing => {
      if (listing.asking_price < 50000) ranges['Under $50K']++;
      else if (listing.asking_price < 100000) ranges['$50K-$100K']++;
      else if (listing.asking_price < 500000) ranges['$100K-$500K']++;
      else ranges['Over $500K']++;
    });
    
    return ranges;
  }

  analyzeRevenueRange(listings) {
    const ranges = {
      'Under $5K': 0,
      '$5K-$10K': 0,
      '$10K-$50K': 0,
      'Over $50K': 0
    };
    
    listings.forEach(listing => {
      if (listing.monthly_revenue < 5000) ranges['Under $5K']++;
      else if (listing.monthly_revenue < 10000) ranges['$5K-$10K']++;
      else if (listing.monthly_revenue < 50000) ranges['$10K-$50K']++;
      else ranges['Over $50K']++;
    });
    
    return ranges;
  }

  async extractComparisonData(listings) {
    const map = new Map();
    listings.forEach(listing => {
      map.set(listing.listing_id, listing);
    });
    return map;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MockScanner };
}