// scripts/high-performance-scraper/multi-marketplace-validator.js
// Multi-Marketplace Data Validation and Enrichment System

const DataQualityValidator = require('./data-quality-validator');
const axios = require('axios');
const cheerio = require('cheerio');

class MultiMarketplaceValidator {
  constructor() {
    this.validator = new DataQualityValidator({
      strictMode: false,
      autoCorrect: true,
      mlValidation: true,
      businessRules: true,
      crossValidation: true
    });
    
    // Marketplace-specific extractors
    this.extractors = {
      flippa: new FlippaDataExtractor(),
      empire_flippers: new EmpireFlippersDataExtractor(),
      motion_invest: new MotionInvestDataExtractor(),
      microacquire: new MicroacquireDataExtractor(),
      fe_international: new FEInternationalDataExtractor(),
      investors_club: new InvestorsClubDataExtractor()
    };
    
    // Data enrichment sources
    this.enrichmentSources = {
      similarweb: new SimilarWebEnricher(),
      semrush: new SEMRushEnricher(),
      ahrefs: new AhrefsEnricher(),
      builtwith: new BuiltWithEnricher()
    };
    
    // Validation results cache
    this.validationCache = new Map();
    
    // Cross-marketplace comparison data
    this.marketComparisons = new Map();
  }

  async validateAndEnrich(rawData, marketplace) {
    console.log(`🔍 Validating and enriching ${marketplace} listing...`);
    
    try {
      // Step 1: Extract structured data using marketplace-specific extractor
      const extractor = this.extractors[marketplace];
      if (!extractor) {
        throw new Error(`No extractor available for marketplace: ${marketplace}`);
      }
      
      const structuredData = await extractor.extract(rawData);
      
      // Step 2: Initial validation
      const validation = await this.validator.validateListing(structuredData, marketplace);
      
      // Step 3: Data enrichment if validation passes basic checks
      let enrichedData = { ...structuredData };
      if (validation.qualityScore > 50) {
        enrichedData = await this.enrichData(structuredData, marketplace);
      }
      
      // Step 4: Re-validate with enriched data
      const finalValidation = await this.validator.validateListing(enrichedData, marketplace);
      
      // Step 5: Cross-marketplace comparison
      const comparison = await this.compareAcrossMarketplaces(enrichedData);
      
      // Step 6: Generate comprehensive report
      const report = {
        original: structuredData,
        enriched: enrichedData,
        validation: finalValidation,
        comparison: comparison,
        confidence: this.calculateOverallConfidence(finalValidation, comparison),
        recommendations: this.generateRecommendations(enrichedData, finalValidation, comparison)
      };
      
      // Cache the result
      this.validationCache.set(this.generateCacheKey(enrichedData), report);
      
      return report;
      
    } catch (error) {
      console.error(`❌ Validation error for ${marketplace}:`, error);
      return {
        error: error.message,
        original: rawData,
        validation: { isValid: false, errors: [{ message: error.message }] }
      };
    }
  }

  async enrichData(data, marketplace) {
    console.log('💎 Enriching data with external sources...');
    
    const enriched = { ...data };
    const enrichmentTasks = [];
    
    // Determine which enrichment sources to use based on data type
    if (data.url || data.domain) {
      // Traffic data enrichment
      if (this.enrichmentSources.similarweb) {
        enrichmentTasks.push(
          this.enrichmentSources.similarweb
            .getTrafficData(data.url || data.domain)
            .catch(err => ({ error: err.message }))
        );
      }
      
      // SEO data enrichment
      if (this.enrichmentSources.semrush) {
        enrichmentTasks.push(
          this.enrichmentSources.semrush
            .getSEOData(data.url || data.domain)
            .catch(err => ({ error: err.message }))
        );
      }
      
      // Technology stack enrichment
      if (this.enrichmentSources.builtwith) {
        enrichmentTasks.push(
          this.enrichmentSources.builtwith
            .getTechStack(data.url || data.domain)
            .catch(err => ({ error: err.message }))
        );
      }
    }
    
    // Execute all enrichment tasks in parallel
    const enrichmentResults = await Promise.all(enrichmentTasks);
    
    // Merge enrichment data
    for (const result of enrichmentResults) {
      if (!result.error) {
        Object.assign(enriched, result);
      }
    }
    
    // Add calculated metrics
    enriched.qualityMetrics = this.calculateQualityMetrics(enriched);
    enriched.growthPotential = this.assessGrowthPotential(enriched);
    enriched.riskFactors = this.identifyRiskFactors(enriched);
    
    return enriched;
  }

  async compareAcrossMarketplaces(listing) {
    const comparison = {
      similarListings: [],
      priceComparison: null,
      marketPosition: null,
      competitiveAnalysis: null
    };
    
    // Find similar listings in cache
    const similarCriteria = {
      category: listing.category,
      revenueRange: this.getRevenueRange(listing.revenue || listing.monthly_revenue * 12),
      priceRange: this.getPriceRange(listing.price)
    };
    
    for (const [key, cached] of this.validationCache) {
      if (this.isSimilarListing(cached.enriched, similarCriteria)) {
        comparison.similarListings.push({
          marketplace: cached.marketplace,
          title: cached.enriched.title,
          price: cached.enriched.price,
          revenue: cached.enriched.revenue,
          multiple: cached.enriched.multiple
        });
      }
    }
    
    // Calculate price comparison
    if (comparison.similarListings.length > 0) {
      const prices = comparison.similarListings.map(l => l.price);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      
      comparison.priceComparison = {
        listingPrice: listing.price,
        marketAverage: avgPrice,
        percentDifference: ((listing.price - avgPrice) / avgPrice * 100).toFixed(1),
        position: listing.price > avgPrice ? 'above_market' : 'below_market'
      };
      
      // Calculate market position
      const multiples = comparison.similarListings.map(l => l.multiple).filter(m => m);
      if (multiples.length > 0) {
        const avgMultiple = multiples.reduce((a, b) => a + b, 0) / multiples.length;
        
        comparison.marketPosition = {
          competitorCount: comparison.similarListings.length,
          avgMultiple: avgMultiple.toFixed(1),
          listingMultiple: listing.multiple,
          competitiveness: this.assessCompetitiveness(listing, comparison.similarListings)
        };
      }
    }
    
    return comparison;
  }

  calculateQualityMetrics(data) {
    const metrics = {
      dataCompleteness: 0,
      financialHealth: 0,
      growthIndicators: 0,
      assetQuality: 0,
      overall: 0
    };
    
    // Data completeness (25%)
    const importantFields = [
      'title', 'price', 'revenue', 'profit', 'multiple',
      'category', 'age', 'traffic', 'url', 'description'
    ];
    const filledFields = importantFields.filter(f => data[f]).length;
    metrics.dataCompleteness = (filledFields / importantFields.length) * 100;
    
    // Financial health (35%)
    if (data.revenue && data.profit) {
      const profitMargin = data.profit / data.revenue;
      const revenueStrength = Math.min(100, (data.revenue / 10000) * 100);
      const profitStrength = Math.min(100, (data.profit / 5000) * 100);
      
      metrics.financialHealth = (
        profitMargin * 50 +
        revenueStrength * 0.3 +
        profitStrength * 0.2
      );
    }
    
    // Growth indicators (25%)
    if (data.growth_rate) {
      metrics.growthIndicators = Math.min(100, data.growth_rate * 200);
    } else if (data.traffic_growth) {
      metrics.growthIndicators = Math.min(100, data.traffic_growth * 100);
    }
    
    // Asset quality (15%)
    let assetScore = 0;
    if (data.age && data.age > 12) assetScore += 30; // Over 1 year
    if (data.age && data.age > 24) assetScore += 20; // Over 2 years
    if (data.traffic && data.traffic > 10000) assetScore += 25;
    if (data.tech_stack && data.tech_stack.length > 5) assetScore += 25;
    metrics.assetQuality = assetScore;
    
    // Calculate overall score
    metrics.overall = (
      metrics.dataCompleteness * 0.25 +
      metrics.financialHealth * 0.35 +
      metrics.growthIndicators * 0.25 +
      metrics.assetQuality * 0.15
    );
    
    return metrics;
  }

  assessGrowthPotential(data) {
    const potential = {
      score: 0,
      factors: [],
      opportunities: []
    };
    
    // Market size opportunity
    if (data.category && data.traffic) {
      if (data.traffic < 50000 && ['saas', 'ecommerce'].includes(data.category.toLowerCase())) {
        potential.factors.push('Large addressable market');
        potential.score += 20;
      }
    }
    
    // SEO opportunity
    if (data.organic_traffic && data.total_traffic) {
      const organicPercent = data.organic_traffic / data.total_traffic;
      if (organicPercent < 0.3) {
        potential.opportunities.push('SEO optimization potential');
        potential.score += 15;
      }
    }
    
    // Monetization opportunity
    if (data.revenue && data.traffic) {
      const revenuePerVisitor = data.revenue / data.traffic;
      if (revenuePerVisitor < 0.5) {
        potential.opportunities.push('Monetization improvement potential');
        potential.score += 20;
      }
    }
    
    // Technical modernization
    if (data.tech_stack && !data.tech_stack.some(tech => 
      ['React', 'Vue', 'Angular', 'Next.js'].includes(tech)
    )) {
      potential.opportunities.push('Technical stack modernization');
      potential.score += 10;
    }
    
    // Geographic expansion
    if (data.traffic_by_country && Object.keys(data.traffic_by_country).length < 5) {
      potential.opportunities.push('Geographic expansion potential');
      potential.score += 15;
    }
    
    return potential;
  }

  identifyRiskFactors(data) {
    const risks = {
      level: 'low',
      factors: [],
      mitigations: []
    };
    
    // Revenue concentration risk
    if (data.revenue_sources) {
      const topSource = Math.max(...Object.values(data.revenue_sources));
      const totalRevenue = Object.values(data.revenue_sources).reduce((a, b) => a + b, 0);
      if (topSource / totalRevenue > 0.7) {
        risks.factors.push('High revenue concentration');
        risks.mitigations.push('Diversify revenue streams');
      }
    }
    
    // Platform dependency
    if (data.traffic_sources) {
      if (data.traffic_sources.social > 0.5 || data.traffic_sources.search > 0.7) {
        risks.factors.push('High platform dependency');
        risks.mitigations.push('Diversify traffic sources');
      }
    }
    
    // Technical debt
    if (data.tech_stack) {
      const outdatedTech = ['PHP 5', 'jQuery', 'AngularJS', 'Python 2'];
      const hasOutdated = data.tech_stack.some(tech => 
        outdatedTech.some(old => tech.includes(old))
      );
      if (hasOutdated) {
        risks.factors.push('Technical debt');
        risks.mitigations.push('Technology stack upgrade needed');
      }
    }
    
    // Competition risk
    if (data.competitors && data.competitors.length > 10) {
      risks.factors.push('High competition');
      risks.mitigations.push('Differentiation strategy needed');
    }
    
    // Determine overall risk level
    if (risks.factors.length >= 3) {
      risks.level = 'high';
    } else if (risks.factors.length >= 1) {
      risks.level = 'medium';
    }
    
    return risks;
  }

  calculateOverallConfidence(validation, comparison) {
    let confidence = validation.confidence || 0.5;
    
    // Boost confidence if we have comparison data
    if (comparison.similarListings.length > 5) {
      confidence += 0.1;
    }
    
    // Boost for data completeness
    if (validation.qualityScore > 80) {
      confidence += 0.1;
    }
    
    // Reduce for anomalies
    if (comparison.priceComparison && 
        Math.abs(parseFloat(comparison.priceComparison.percentDifference)) > 50) {
      confidence -= 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  generateRecommendations(data, validation, comparison) {
    const recommendations = [];
    
    // Pricing recommendations
    if (comparison.priceComparison) {
      if (comparison.priceComparison.percentDifference > 20) {
        recommendations.push({
          type: 'pricing',
          priority: 'high',
          message: 'Listing is priced above market average',
          action: 'Consider price adjustment or highlight unique value propositions'
        });
      } else if (comparison.priceComparison.percentDifference < -20) {
        recommendations.push({
          type: 'pricing',
          priority: 'medium',
          message: 'Listing is priced below market average',
          action: 'Verify pricing accuracy or investigate potential issues'
        });
      }
    }
    
    // Data quality recommendations
    if (validation.qualityScore < 70) {
      recommendations.push({
        type: 'data_quality',
        priority: 'high',
        message: 'Incomplete listing data',
        action: 'Request additional information from seller'
      });
    }
    
    // Business recommendations
    if (validation.businessValue) {
      if (validation.businessValue.tier === 'low' && data.price > 50000) {
        recommendations.push({
          type: 'valuation',
          priority: 'high',
          message: 'High price for low-tier business',
          action: 'Conduct thorough due diligence'
        });
      }
      
      validation.businessValue.opportunities.forEach(opp => {
        recommendations.push({
          type: 'opportunity',
          priority: 'medium',
          message: opp,
          action: 'Consider post-acquisition strategy'
        });
      });
    }
    
    return recommendations;
  }

  getRevenueRange(revenue) {
    if (revenue < 1000) return 'under_1k';
    if (revenue < 10000) return '1k_10k';
    if (revenue < 50000) return '10k_50k';
    if (revenue < 100000) return '50k_100k';
    if (revenue < 500000) return '100k_500k';
    return 'over_500k';
  }

  getPriceRange(price) {
    if (price < 10000) return 'under_10k';
    if (price < 50000) return '10k_50k';
    if (price < 100000) return '50k_100k';
    if (price < 500000) return '100k_500k';
    if (price < 1000000) return '500k_1m';
    return 'over_1m';
  }

  isSimilarListing(listing, criteria) {
    return (
      listing.category === criteria.category &&
      this.getRevenueRange(listing.revenue || listing.monthly_revenue * 12) === criteria.revenueRange &&
      this.getPriceRange(listing.price) === criteria.priceRange
    );
  }

  generateCacheKey(data) {
    return `${data.marketplace || 'unknown'}_${data.id || data.url || Date.now()}`;
  }

  assessCompetitiveness(listing, similarListings) {
    const scores = {
      price: 0,
      multiple: 0,
      revenue: 0
    };
    
    // Compare price
    const avgPrice = similarListings.reduce((sum, l) => sum + l.price, 0) / similarListings.length;
    scores.price = listing.price < avgPrice ? 1 : 0;
    
    // Compare multiple
    const multiples = similarListings.map(l => l.multiple).filter(m => m);
    if (multiples.length > 0) {
      const avgMultiple = multiples.reduce((sum, m) => sum + m, 0) / multiples.length;
      scores.multiple = listing.multiple < avgMultiple ? 1 : 0;
    }
    
    // Overall competitiveness
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    
    if (totalScore >= 2) return 'highly_competitive';
    if (totalScore >= 1) return 'competitive';
    return 'less_competitive';
  }
}

// Marketplace-specific extractors
class FlippaDataExtractor {
  async extract(rawData) {
    const data = typeof rawData === 'string' ? this.parseHTML(rawData) : rawData;
    
    return {
      marketplace: 'flippa',
      id: data.id || this.extractId(data),
      title: data.title || '',
      price: this.parsePrice(data.price),
      revenue: this.parsePrice(data.revenue || data.monthly_revenue),
      profit: this.parsePrice(data.profit || data.monthly_profit),
      multiple: this.parseMultiple(data.multiple),
      category: data.category || 'Website',
      age: this.parseAge(data.age),
      traffic: this.parseTraffic(data.traffic),
      url: data.url || '',
      description: data.description || ''
    };
  }
  
  parseHTML(html) {
    const $ = cheerio.load(html);
    // Implementation would parse Flippa-specific HTML
    return {};
  }
  
  extractId(data) {
    return data.listing_id || data.url?.match(/\d+/)?.[0] || null;
  }
  
  parsePrice(value) {
    if (!value) return null;
    if (typeof value === 'number') return value;
    
    const cleaned = value.replace(/[^0-9.,KMB]/gi, '');
    let number = parseFloat(cleaned.replace(/,/g, ''));
    
    if (value.toUpperCase().includes('K')) number *= 1000;
    if (value.toUpperCase().includes('M')) number *= 1000000;
    
    return number || null;
  }
  
  parseMultiple(value) {
    if (!value) return null;
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || null;
  }
  
  parseAge(value) {
    if (!value) return null;
    if (typeof value === 'number') return value;
    
    const match = value.match(/(\d+)\s*(year|month|day)/i);
    if (!match) return null;
    
    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'year': return num * 12;
      case 'month': return num;
      case 'day': return num / 30;
      default: return null;
    }
  }
  
  parseTraffic(value) {
    if (!value) return null;
    return this.parsePrice(value);
  }
}

class EmpireFlippersDataExtractor {
  async extract(rawData) {
    // Empire Flippers specific extraction logic
    return {
      marketplace: 'empire_flippers',
      // ... extracted fields
    };
  }
}

class MotionInvestDataExtractor {
  async extract(rawData) {
    // Motion Invest specific extraction logic
    return {
      marketplace: 'motion_invest',
      // ... extracted fields
    };
  }
}

class MicroacquireDataExtractor {
  async extract(rawData) {
    // Microacquire specific extraction logic
    return {
      marketplace: 'microacquire',
      // ... extracted fields
    };
  }
}

class FEInternationalDataExtractor {
  async extract(rawData) {
    // FE International specific extraction logic
    return {
      marketplace: 'fe_international',
      // ... extracted fields
    };
  }
}

class InvestorsClubDataExtractor {
  async extract(rawData) {
    // Investors Club specific extraction logic
    return {
      marketplace: 'investors_club',
      // ... extracted fields
    };
  }
}

// Enrichment sources (stubs for demonstration)
class SimilarWebEnricher {
  async getTrafficData(domain) {
    // Simulated enrichment
    return {
      total_traffic: Math.floor(Math.random() * 100000) + 10000,
      organic_traffic: Math.floor(Math.random() * 50000) + 5000,
      traffic_sources: {
        search: 0.4,
        direct: 0.3,
        social: 0.2,
        referral: 0.1
      },
      traffic_by_country: {
        US: 0.4,
        UK: 0.2,
        CA: 0.1,
        AU: 0.1,
        Other: 0.2
      }
    };
  }
}

class SEMRushEnricher {
  async getSEOData(domain) {
    return {
      organic_keywords: Math.floor(Math.random() * 5000) + 500,
      backlinks: Math.floor(Math.random() * 10000) + 1000,
      domain_authority: Math.floor(Math.random() * 50) + 20
    };
  }
}

class AhrefsEnricher {
  async getBacklinkData(domain) {
    return {
      referring_domains: Math.floor(Math.random() * 1000) + 100,
      backlinks: Math.floor(Math.random() * 10000) + 1000,
      domain_rating: Math.floor(Math.random() * 70) + 20
    };
  }
}

class BuiltWithEnricher {
  async getTechStack(domain) {
    const techOptions = [
      'WordPress', 'Shopify', 'React', 'Node.js', 'PHP',
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Nginx',
      'Apache', 'Cloudflare', 'AWS', 'Google Analytics'
    ];
    
    const count = Math.floor(Math.random() * 5) + 3;
    const tech_stack = [];
    
    for (let i = 0; i < count; i++) {
      const tech = techOptions[Math.floor(Math.random() * techOptions.length)];
      if (!tech_stack.includes(tech)) {
        tech_stack.push(tech);
      }
    }
    
    return { tech_stack };
  }
}

module.exports = MultiMarketplaceValidator;