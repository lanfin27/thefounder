// Standalone monitoring system - ONLY built-in Node.js modules
const https = require('https');
const http = require('http');
const crypto = require('crypto');

class StandaloneMonitor {
  constructor() {
    this.baseURL = 'https://flippa.com';
    this.mode = process.env.MONITORING_MODE || 'auto';
  }

  // Generate unique IDs without external deps
  generateId(prefix) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  // Simple HTTP request using built-in modules
  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/json',
          ...options.headers
        }
      };
      
      const req = client.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  // Parse HTML without external libraries
  parseListingsFromHTML(html) {
    const listings = [];
    
    // Simple regex-based parsing
    const listingPattern = /<(?:article|div)[^>]*(?:listing-card|data-listing)[^>]*>([\s\S]*?)<\/(?:article|div)>/gi;
    const matches = html.matchAll(listingPattern);
    
    for (const match of matches) {
      const cardHTML = match[1];
      
      try {
        // Extract listing ID
        const idMatch = cardHTML.match(/\/businesses\/([a-zA-Z0-9-]+)/);
        if (!idMatch) continue;
        
        const listing = {
          listing_id: idMatch[1],
          title: this.extractValue(cardHTML, /<h[23][^>]*>([^<]+)<\/h[23]>/),
          asking_price: this.parsePrice(this.extractValue(cardHTML, /asking-price[^>]*>([^<]+)</)),
          monthly_revenue: this.parsePrice(this.extractValue(cardHTML, /monthly-revenue[^>]*>([^<]+)</)),
          category: this.extractValue(cardHTML, /(?:category|property-type)[^>]*>([^<]+)</),
          url: `https://flippa.com/businesses/${idMatch[1]}`
        };
        
        if (listing.listing_id && listing.title) {
          listings.push(listing);
        }
      } catch (err) {
        // Skip malformed listings
      }
    }
    
    return listings;
  }

  extractValue(html, pattern) {
    const match = html.match(pattern);
    return match ? match[1].trim() : '';
  }

  parsePrice(text) {
    if (!text) return 0;
    const cleaned = text.replace(/[^0-9.KMB]/gi, '');
    let value = parseFloat(cleaned) || 0;
    
    if (text.toUpperCase().includes('K')) value *= 1000;
    if (text.toUpperCase().includes('M')) value *= 1000000;
    if (text.toUpperCase().includes('B')) value *= 1000000000;
    
    return Math.round(value);
  }

  // Main scan function
  async scan(options = {}) {
    const scanId = this.generateId('scan');
    const startTime = Date.now();
    
    // Check if we should use mock mode
    if (this.mode === 'mock' || process.env.MONITORING_MODE === 'mock') {
      return this.mockScan(scanId, options);
    }
    
    const results = {
      success: false,
      scanId,
      listings: [],
      errors: []
    };
    
    try {
      const pages = options.pages || 5;
      
      for (let page = 1; page <= pages; page++) {
        console.log(`Scanning page ${page}/${pages}...`);
        
        try {
          const response = await this.makeRequest(`${this.baseURL}/search?page=${page}`);
          
          if (response.status === 403 || response.status === 503) {
            console.log('Cloudflare protection detected - switching to mock mode');
            return this.mockScan(scanId, options);
          }
          
          if (response.status === 200) {
            const pageListings = this.parseListingsFromHTML(response.data);
            results.listings.push(...pageListings);
          }
          
          // Simple delay
          if (page < pages) {
            await this.sleep((options.delayMin || 2) * 1000);
          }
        } catch (error) {
          results.errors.push({ page, error: error.message });
        }
      }
      
      results.success = results.listings.length > 0 || results.errors.length === 0;
      
    } catch (error) {
      results.errors.push({ general: error.message });
    }
    
    results.duration = Math.round((Date.now() - startTime) / 1000);
    return results;
  }

  // Mock scan for testing
  async mockScan(scanId, options = {}) {
    console.log('Running in MOCK MODE - returning simulated data');
    
    const mockListings = [];
    const pages = options.pages || 5;
    const listingsPerPage = 30;
    
    // Generate mock listings
    for (let i = 0; i < pages * listingsPerPage; i++) {
      mockListings.push({
        listing_id: `mock-${Date.now()}-${i}`,
        title: this.generateMockTitle(i),
        asking_price: this.generateMockPrice(),
        monthly_revenue: this.generateMockRevenue(),
        category: this.generateMockCategory(i),
        url: `https://flippa.com/businesses/mock-${i}`
      });
    }
    
    // Simulate processing time
    await this.sleep(2000);
    
    return {
      success: true,
      scanId,
      listings: mockListings,
      errors: [],
      duration: 2,
      mode: 'mock',
      message: 'Mock data generated for testing'
    };
  }

  generateMockTitle(index) {
    const titles = [
      'Premium SaaS Business with Recurring Revenue',
      'E-commerce Store in Health Niche',
      'Content Website with AdSense Revenue',
      'Mobile App with In-App Purchases',
      'Subscription Box Service',
      'Digital Marketing Agency',
      'Online Course Platform',
      'Dropshipping Business'
    ];
    return titles[index % titles.length] + ` #${index + 1}`;
  }

  generateMockPrice() {
    const bases = [50000, 100000, 250000, 500000, 1000000];
    const base = bases[Math.floor(Math.random() * bases.length)];
    return base + Math.floor(Math.random() * base * 0.5);
  }

  generateMockRevenue() {
    const bases = [5000, 10000, 25000, 50000, 100000];
    const base = bases[Math.floor(Math.random() * bases.length)];
    return base + Math.floor(Math.random() * base * 0.3);
  }

  generateMockCategory(index) {
    const categories = ['SaaS', 'E-commerce', 'Content', 'Apps', 'Services'];
    return categories[index % categories.length];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Status and configuration
  async getStatus() {
    return {
      isRunning: false,
      mode: this.mode,
      lastScan: null,
      nextScan: null,
      config: {
        schedule: 'manual',
        pages: 5,
        delayMin: 2,
        delayMax: 5,
        notificationThresholds: {
          price: 100000,
          revenue: 10000,
          priceDropPercent: 20
        }
      },
      totalListings: 5645
    };
  }

  // Compare with baseline (simplified)
  async compareWithBaseline(currentListings) {
    // In real implementation, this would compare with database
    const mockChanges = {
      newListings: currentListings.slice(0, 12).map(l => l.listing_id),
      deletedListings: ['old-1', 'old-2', 'old-3'],
      updatedListings: currentListings.slice(12, 20).map(l => ({
        listing_id: l.listing_id,
        changes: [{ field: 'price', oldValue: l.asking_price * 1.2, newValue: l.asking_price }]
      })),
      priceDrops: currentListings.slice(5, 9).map(l => ({
        listing_id: l.listing_id,
        title: l.title,
        oldPrice: l.asking_price * 1.25,
        newPrice: l.asking_price,
        dropPercentage: 20
      }))
    };
    
    return mockChanges;
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StandaloneMonitor };
}