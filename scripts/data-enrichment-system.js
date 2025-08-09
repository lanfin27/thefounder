// scripts/data-enrichment-system.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class DataEnrichmentSystem {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.enrichmentStats = {
      totalProcessed: 0,
      enrichedListings: 0,
      priceChanges: 0,
      newDataFields: 0,
      errors: 0,
      startTime: new Date()
    };
    this.priceHistory = new Map();
  }

  async executeDataEnrichment() {
    console.log('🔍 DATA ENRICHMENT SYSTEM STARTING');
    console.log('🎯 Enhancing existing listings with detailed information');
    
    // Step 1: Load existing listings
    const existingListings = await this.loadExistingListings();
    console.log(`📊 Loaded ${existingListings.length} existing listings`);
    
    // Step 2: Analyze and categorize listings
    await this.analyzeAndCategorizeListings(existingListings);
    
    // Step 3: Calculate market insights
    await this.calculateMarketInsights(existingListings);
    
    // Step 4: Generate trend analysis
    await this.generateTrendAnalysis(existingListings);
    
    // Step 5: Create enriched database views
    await this.createEnrichedMetrics(existingListings);
    
    return this.generateEnrichmentReport();
  }

  async loadExistingListings() {
    const { data, error } = await this.supabase
      .from('flippa_listings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error loading listings:', error);
      return [];
    }
    
    return data || [];
  }

  async analyzeAndCategorizeListings(listings) {
    console.log('📊 Analyzing and categorizing listings...');
    
    const categories = {
      'ecommerce': ['store', 'shop', 'ecommerce', 'products', 'dropship'],
      'content': ['blog', 'content', 'article', 'news', 'magazine'],
      'saas': ['saas', 'software', 'app', 'subscription', 'service'],
      'affiliate': ['affiliate', 'commission', 'amazon', 'review'],
      'marketplace': ['marketplace', 'platform', 'directory', 'listing'],
      'community': ['forum', 'community', 'social', 'network']
    };
    
    let categorized = 0;
    
    for (const listing of listings) {
      const title = (listing.title || '').toLowerCase();
      const rawData = listing.raw_data || {};
      const description = (rawData.description || '').toLowerCase();
      const combinedText = `${title} ${description}`;
      
      let detectedCategory = 'other';
      let categoryScore = 0;
      
      // Detect category based on keywords
      for (const [category, keywords] of Object.entries(categories)) {
        const score = keywords.filter(keyword => combinedText.includes(keyword)).length;
        if (score > categoryScore) {
          detectedCategory = category;
          categoryScore = score;
        }
      }
      
      // Calculate additional metrics
      const enrichedData = {
        category: detectedCategory,
        categoryScore: categoryScore,
        priceRange: this.calculatePriceRange(listing.price),
        multipleRange: this.calculateMultipleRange(listing.multiple),
        revenueRange: this.calculateRevenueRange(listing.monthly_revenue),
        qualityScore: this.calculateQualityScore(listing),
        marketPosition: null, // Will be calculated after all listings are categorized
        enrichedAt: new Date().toISOString()
      };
      
      // Update listing with enriched data
      const { error } = await this.supabase
        .from('flippa_listings')
        .update({
          category: detectedCategory,
          raw_data: {
            ...rawData,
            enrichment: enrichedData
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', listing.id);
      
      if (!error) {
        categorized++;
        this.enrichmentStats.enrichedListings++;
      } else {
        console.error(`❌ Error enriching listing ${listing.id}:`, error);
        this.enrichmentStats.errors++;
      }
      
      if (categorized % 50 === 0) {
        console.log(`✅ Categorized ${categorized} listings...`);
      }
    }
    
    console.log(`📊 Successfully categorized ${categorized} listings`);
  }

  calculatePriceRange(price) {
    if (!price) return 'unknown';
    if (price < 1000) return 'micro';
    if (price < 10000) return 'small';
    if (price < 50000) return 'medium';
    if (price < 250000) return 'large';
    return 'enterprise';
  }

  calculateMultipleRange(multiple) {
    if (!multiple) return 'unknown';
    if (multiple < 1) return 'distressed';
    if (multiple < 2) return 'below-market';
    if (multiple < 3) return 'market';
    if (multiple < 4) return 'above-market';
    return 'premium';
  }

  calculateRevenueRange(revenue) {
    if (!revenue) return 'unknown';
    if (revenue < 500) return 'starter';
    if (revenue < 2000) return 'growing';
    if (revenue < 10000) return 'established';
    if (revenue < 50000) return 'scaled';
    return 'enterprise';
  }

  calculateQualityScore(listing) {
    let score = 0;
    let factors = 0;
    
    // Title quality
    if (listing.title && listing.title.length > 10) {
      score += 20;
      factors++;
    }
    
    // Price data
    if (listing.price && listing.price > 0) {
      score += 20;
      factors++;
    }
    
    // Revenue data
    if (listing.monthly_revenue && listing.monthly_revenue > 0) {
      score += 25;
      factors++;
    }
    
    // Multiple data
    if (listing.multiple && listing.multiple > 0) {
      score += 20;
      factors++;
    }
    
    // URL data
    if (listing.url && listing.url.includes('flippa')) {
      score += 15;
      factors++;
    }
    
    return factors > 0 ? Math.round(score) : 0;
  }

  async calculateMarketInsights(listings) {
    console.log('📈 Calculating market insights...');
    
    const insights = {
      byCategory: {},
      byPriceRange: {},
      byMultipleRange: {},
      overall: {
        totalListings: listings.length,
        totalMarketValue: 0,
        averagePrice: 0,
        medianPrice: 0,
        averageMultiple: 0,
        averageRevenue: 0
      }
    };
    
    // Calculate insights by category
    const categories = [...new Set(listings.map(l => l.category || 'other'))];
    
    for (const category of categories) {
      const categoryListings = listings.filter(l => l.category === category);
      const prices = categoryListings.map(l => l.price).filter(p => p > 0);
      const multiples = categoryListings.map(l => l.multiple).filter(m => m > 0);
      const revenues = categoryListings.map(l => l.monthly_revenue).filter(r => r > 0);
      
      insights.byCategory[category] = {
        count: categoryListings.length,
        marketShare: (categoryListings.length / listings.length * 100).toFixed(1),
        averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
        medianPrice: prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0,
        averageMultiple: multiples.length > 0 ? (multiples.reduce((a, b) => a + b, 0) / multiples.length).toFixed(1) : 0,
        averageRevenue: revenues.length > 0 ? Math.round(revenues.reduce((a, b) => a + b, 0) / revenues.length) : 0,
        priceRange: {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0
        }
      };
    }
    
    // Calculate overall insights
    const allPrices = listings.map(l => l.price).filter(p => p > 0);
    const allMultiples = listings.map(l => l.multiple).filter(m => m > 0);
    const allRevenues = listings.map(l => l.monthly_revenue).filter(r => r > 0);
    
    insights.overall.totalMarketValue = allPrices.reduce((a, b) => a + b, 0);
    insights.overall.averagePrice = allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0;
    insights.overall.medianPrice = allPrices.length > 0 ? allPrices.sort((a, b) => a - b)[Math.floor(allPrices.length / 2)] : 0;
    insights.overall.averageMultiple = allMultiples.length > 0 ? (allMultiples.reduce((a, b) => a + b, 0) / allMultiples.length).toFixed(1) : 0;
    insights.overall.averageRevenue = allRevenues.length > 0 ? Math.round(allRevenues.reduce((a, b) => a + b, 0) / allRevenues.length) : 0;
    
    // Save insights
    fs.writeFileSync(`market-insights-${Date.now()}.json`, JSON.stringify(insights, null, 2));
    console.log('📊 Market insights calculated and saved');
    
    this.enrichmentStats.newDataFields += Object.keys(insights.byCategory).length * 6;
  }

  async generateTrendAnalysis(listings) {
    console.log('📊 Generating trend analysis...');
    
    // Group listings by creation date
    const listingsByDate = {};
    
    listings.forEach(listing => {
      const date = new Date(listing.created_at).toISOString().split('T')[0];
      if (!listingsByDate[date]) {
        listingsByDate[date] = [];
      }
      listingsByDate[date].push(listing);
    });
    
    // Calculate daily trends
    const dailyTrends = Object.entries(listingsByDate).map(([date, dayListings]) => {
      const prices = dayListings.map(l => l.price).filter(p => p > 0);
      const multiples = dayListings.map(l => l.multiple).filter(m => m > 0);
      
      return {
        date,
        listingCount: dayListings.length,
        averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
        averageMultiple: multiples.length > 0 ? (multiples.reduce((a, b) => a + b, 0) / multiples.length).toFixed(1) : 0,
        totalValue: prices.reduce((a, b) => a + b, 0),
        categories: this.countCategories(dayListings)
      };
    });
    
    // Calculate trends
    const trends = {
      daily: dailyTrends,
      summary: {
        totalDays: dailyTrends.length,
        averageListingsPerDay: (listings.length / dailyTrends.length).toFixed(1),
        priceTrend: this.calculateTrend(dailyTrends.map(d => d.averagePrice)),
        multipleTrend: this.calculateTrend(dailyTrends.map(d => parseFloat(d.averageMultiple))),
        volumeTrend: this.calculateTrend(dailyTrends.map(d => d.listingCount))
      }
    };
    
    // Save trend analysis
    fs.writeFileSync(`trend-analysis-${Date.now()}.json`, JSON.stringify(trends, null, 2));
    console.log('📈 Trend analysis saved');
  }

  countCategories(listings) {
    const counts = {};
    listings.forEach(listing => {
      const category = listing.category || 'other';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }

  calculateTrend(values) {
    if (values.length < 2) return 'insufficient-data';
    
    const validValues = values.filter(v => v > 0);
    if (validValues.length < 2) return 'insufficient-data';
    
    const firstHalf = validValues.slice(0, Math.floor(validValues.length / 2));
    const secondHalf = validValues.slice(Math.floor(validValues.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg * 100).toFixed(1);
    
    if (Math.abs(changePercent) < 5) return 'stable';
    if (changePercent > 0) return `increasing (+${changePercent}%)`;
    return `decreasing (${changePercent}%)`;
  }

  async createEnrichedMetrics(listings) {
    console.log('🏗️ Creating enriched metrics...');
    
    // Calculate percentiles for better market positioning
    const prices = listings.map(l => l.price).filter(p => p > 0).sort((a, b) => a - b);
    const multiples = listings.map(l => l.multiple).filter(m => m > 0).sort((a, b) => a - b);
    
    const pricePercentiles = {
      p10: prices[Math.floor(prices.length * 0.1)],
      p25: prices[Math.floor(prices.length * 0.25)],
      p50: prices[Math.floor(prices.length * 0.5)],
      p75: prices[Math.floor(prices.length * 0.75)],
      p90: prices[Math.floor(prices.length * 0.9)]
    };
    
    const multiplePercentiles = {
      p10: multiples[Math.floor(multiples.length * 0.1)],
      p25: multiples[Math.floor(multiples.length * 0.25)],
      p50: multiples[Math.floor(multiples.length * 0.5)],
      p75: multiples[Math.floor(multiples.length * 0.75)],
      p90: multiples[Math.floor(multiples.length * 0.9)]
    };
    
    // Update listings with market position
    for (const listing of listings) {
      if (listing.price && listing.price > 0) {
        let pricePosition = 'bottom-10%';
        if (listing.price >= pricePercentiles.p90) pricePosition = 'top-10%';
        else if (listing.price >= pricePercentiles.p75) pricePosition = 'top-25%';
        else if (listing.price >= pricePercentiles.p50) pricePosition = 'median';
        else if (listing.price >= pricePercentiles.p25) pricePosition = 'bottom-25%';
        
        const rawData = listing.raw_data || {};
        rawData.enrichment = rawData.enrichment || {};
        rawData.enrichment.marketPosition = pricePosition;
        
        await this.supabase
          .from('flippa_listings')
          .update({
            raw_data: rawData,
            updated_at: new Date().toISOString()
          })
          .eq('id', listing.id);
      }
    }
    
    // Save percentile data
    const enrichedMetrics = {
      timestamp: new Date().toISOString(),
      totalListings: listings.length,
      pricePercentiles,
      multiplePercentiles,
      categoryDistribution: this.countCategories(listings),
      qualityDistribution: this.calculateQualityDistribution(listings)
    };
    
    fs.writeFileSync(`enriched-metrics-${Date.now()}.json`, JSON.stringify(enrichedMetrics, null, 2));
    console.log('✅ Enriched metrics created');
  }

  calculateQualityDistribution(listings) {
    const distribution = {
      'excellent': 0,
      'good': 0,
      'fair': 0,
      'poor': 0
    };
    
    listings.forEach(listing => {
      const score = this.calculateQualityScore(listing);
      if (score >= 80) distribution.excellent++;
      else if (score >= 60) distribution.good++;
      else if (score >= 40) distribution.fair++;
      else distribution.poor++;
    });
    
    return distribution;
  }

  generateEnrichmentReport() {
    const runtime = (new Date() - this.enrichmentStats.startTime) / 1000 / 60;
    
    console.log('\n🔍 DATA ENRICHMENT COMPLETE!');
    console.log('═'.repeat(50));
    console.log(`⏱️ Runtime: ${runtime.toFixed(1)} minutes`);
    console.log(`📊 Total Processed: ${this.enrichmentStats.totalProcessed}`);
    console.log(`✨ Enriched Listings: ${this.enrichmentStats.enrichedListings}`);
    console.log(`📈 Price Changes Tracked: ${this.enrichmentStats.priceChanges}`);
    console.log(`📋 New Data Fields: ${this.enrichmentStats.newDataFields}`);
    console.log(`❌ Errors: ${this.enrichmentStats.errors}`);
    console.log(`📈 Success Rate: ${((this.enrichmentStats.enrichedListings / Math.max(1, this.enrichmentStats.totalProcessed)) * 100).toFixed(1)}%`);
    
    return {
      success: this.enrichmentStats.enrichedListings > 0,
      stats: this.enrichmentStats
    };
  }
}

// Execute data enrichment system
new DataEnrichmentSystem().executeDataEnrichment().catch(console.error);