// COMPREHENSIVE FLIPPA SCRAPING STRATEGY FOR THEFOUNDER
// Based on analysis of 5,635 real Flippa listings from Apify scraper

const FlippaScrapingStrategy = {
  // =====================================================
  // 1. FIELD MAPPING STRATEGY (82 unique fields identified)
  // =====================================================
  fieldMapping: {
    // CRITICAL FIELDS (100% completeness in Apify data)
    critical: {
      id: { 
        selector: '[data-listing-id], [id^="listing-"]',
        attribute: 'data-listing-id',
        fallback: (element) => element.id?.replace('listing-', ''),
        validation: 'required|numeric',
        thefounderField: 'listing_id'
      },
      title: {
        selector: '.listing-title, h2.title, .property-title',
        text: true,
        validation: 'required|min:10',
        thefounderField: 'title'
      },
      price: {
        selector: '.price, .listing-price, [data-price]',
        parse: (text) => parseInt(text.replace(/[^0-9]/g, '')),
        validation: 'required|numeric|min:1',
        thefounderField: 'asking_price'
      },
      category: {
        selector: '.category-tag, .listing-category, [data-category]',
        text: true,
        validation: 'required|in:categories',
        thefounderField: 'industry'
      },
      property_type: {
        selector: '.property-type, .listing-type, [data-type]',
        text: true,
        validation: 'required|in:propertyTypes',
        thefounderField: 'business_type'
      },
      monetization: {
        selector: '.monetization-method, [data-monetization]',
        text: true,
        validation: 'required',
        thefounderField: 'monetization_method'
      },
      status: {
        selector: '.listing-status, [data-status]',
        text: true,
        default: 'open',
        thefounderField: 'listing_status'
      }
    },

    // IMPORTANT FIELDS (50-90% completeness)
    important: {
      revenue_average: {
        selector: '.revenue-avg, [data-revenue]',
        parse: (text) => parseFloat(text.replace(/[^0-9.]/g, '')),
        validation: 'numeric|min:0',
        thefounderField: 'monthly_revenue'
      },
      profit_average: {
        selector: '.profit-avg, [data-profit]',
        parse: (text) => parseFloat(text.replace(/[^0-9.-]/g, '')),
        validation: 'numeric',
        thefounderField: 'monthly_profit'
      },
      multiple: {
        selector: '.multiple-value, [data-multiple]',
        parse: (text) => parseFloat(text.replace('x', '')),
        validation: 'numeric|min:0',
        thefounderField: 'profit_multiple'
      },
      revenue_multiple: {
        selector: '.revenue-multiple, [data-revenue-multiple]',
        parse: (text) => parseFloat(text.replace('x', '')),
        validation: 'numeric|min:0',
        thefounderField: 'revenue_multiple'
      },
      country_name: {
        selector: '.location, .country, [data-country]',
        text: true,
        thefounderField: 'location'
      },
      established_at: {
        selector: '.age, .established, [data-age]',
        parse: (text) => {
          const match = text.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        },
        thefounderField: 'business_age_years'
      }
    },

    // VERIFICATION FIELDS
    verification: {
      has_verified_traffic: {
        selector: '.verified-traffic, [data-verified-traffic]',
        parse: (element) => element.classList.contains('verified') || element.dataset.verifiedTraffic === 'true',
        thefounderField: 'traffic_verified'
      },
      has_verified_revenue: {
        selector: '.verified-revenue, [data-verified-revenue]',
        parse: (element) => element.classList.contains('verified') || element.dataset.verifiedRevenue === 'true',
        thefounderField: 'revenue_verified'
      },
      manually_vetted: {
        selector: '.vetted-badge, .manually-vetted',
        exists: true,
        thefounderField: 'flippa_vetted'
      }
    },

    // INTEGRATION FIELDS
    integrations: {
      integrations: {
        selector: '.integration-icon, .tech-stack img',
        multiple: true,
        attribute: 'alt',
        thefounderField: 'tech_stack'
      }
    },

    // KEY DATA EXTRACTION (found in all listings)
    keyData: {
      selector: '.key-data-item, .listing-detail',
      multiple: true,
      parse: (elements) => {
        const data = {};
        elements.forEach(el => {
          const label = el.querySelector('.label')?.textContent?.trim();
          const value = el.querySelector('.value')?.textContent?.trim();
          if (label && value) {
            data[label.toLowerCase().replace(/\s+/g, '_')] = value;
          }
        });
        return data;
      }
    }
  },

  // =====================================================
  // 2. CATEGORY-SPECIFIC EXTRACTION STRATEGIES
  // =====================================================
  categoryStrategies: {
    'Ecommerce': {
      priority: 1, // 43.1% of listings
      specificFields: {
        shopify_store: '.shopify-badge, [data-platform="shopify"]',
        woocommerce: '.woo-badge, [data-platform="woocommerce"]',
        inventory_value: '.inventory-value, [data-inventory]',
        supplier_count: '.suppliers, [data-suppliers]',
        sku_count: '.sku-count, .product-count'
      },
      validationRules: {
        requiresRevenue: true,
        minPrice: 100
      }
    },
    'Content': {
      priority: 2, // 18.0% of listings
      specificFields: {
        traffic_sources: '.traffic-source',
        content_count: '.post-count, .article-count',
        domain_authority: '.da-score, .authority-score',
        backlinks: '.backlink-count'
      }
    },
    'SaaS': {
      priority: 3, // 9.0% of listings
      specificFields: {
        mrr: '.mrr, [data-mrr]',
        user_count: '.users, .customers',
        churn_rate: '.churn, [data-churn]',
        tech_stack: '.tech-stack .technology'
      }
    },
    'Service': {
      priority: 4, // 7.3% of listings
      specificFields: {
        client_count: '.clients, .customer-count',
        service_type: '.service-type',
        team_size: '.team-size',
        contract_value: '.contract-value'
      }
    }
  },

  // =====================================================
  // 3. MONETIZATION METHOD STRATEGIES
  // =====================================================
  monetizationStrategies: {
    'Dropshipping': { // 23.5% of listings
      requiredFields: ['supplier_info', 'shipping_times', 'profit_margins'],
      warningFlags: ['low_margins', 'long_shipping']
    },
    'Ecommerce': { // 18.8% of listings
      requiredFields: ['inventory_details', 'fulfillment_method', 'return_rate'],
      qualityIndicators: ['brand_strength', 'repeat_customers']
    },
    'Services & Subscriptions': { // 11.7% of listings
      requiredFields: ['recurring_revenue', 'customer_lifetime_value', 'service_delivery'],
      metrics: ['mrr', 'arr', 'ltv', 'cac']
    },
    'Affiliate Sales': { // 11.4% of listings
      requiredFields: ['affiliate_programs', 'commission_rates', 'conversion_rates'],
      platforms: ['amazon', 'clickbank', 'shareasale', 'cj']
    },
    'Ads': { // 9.6% of listings
      requiredFields: ['traffic_stats', 'ad_networks', 'rpm', 'cpm'],
      networks: ['adsense', 'ezoic', 'mediavine', 'adthrive']
    }
  },

  // =====================================================
  // 4. DATA QUALITY VALIDATION RULES
  // =====================================================
  validationRules: {
    // Price validation based on distribution
    priceValidation: {
      min: 1,
      max: 10000000,
      suspicious_thresholds: {
        too_low: 10, // Less than $10 is suspicious
        too_high_for_category: {
          'Content': 500000,
          'Ecommerce': 1000000,
          'SaaS': 2000000
        }
      }
    },

    // Multiple validation
    multipleValidation: {
      profit_multiple_range: [0, 10], // Typical range
      revenue_multiple_range: [0, 5],
      suspicious_multiple: 15 // Anything above this needs verification
    },

    // Required field combinations
    requiredCombinations: [
      ['price', 'category', 'property_type'],
      ['title', 'summary'],
      ['monetization', 'revenue_average']
    ],

    // Data consistency checks
    consistencyChecks: {
      profit_vs_revenue: (data) => {
        if (data.profit_average && data.revenue_average) {
          return data.profit_average <= data.revenue_average;
        }
        return true;
      },
      multiple_calculation: (data) => {
        if (data.price && data.profit_average && data.profit_average > 0) {
          const calculatedMultiple = data.price / (data.profit_average * 12);
          return Math.abs(calculatedMultiple - data.multiple) < 0.5;
        }
        return true;
      }
    }
  },

  // =====================================================
  // 5. EXTRACTION PRIORITY & PERFORMANCE
  // =====================================================
  extractionStrategy: {
    // Batch processing for performance
    batchSize: 20,
    
    // Priority order for extraction
    extractionOrder: [
      'critical', // Always extract first
      'important', // Extract if available
      'verification', // Important for quality
      'integrations', // Additional context
      'category_specific' // Based on detected category
    ],

    // Retry strategy for failed extractions
    retryStrategy: {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true
    },

    // Performance optimizations
    optimizations: {
      useIntersectionObserver: true, // For lazy loading
      parallelExtraction: true,
      cacheSelectors: true,
      minimizeReflows: true
    }
  },

  // =====================================================
  // 6. INTEGRATION WITH THEFOUNDER
  // =====================================================
  thefounderIntegration: {
    // Field mapping to TheFounder schema
    schemaMapping: {
      listing_id: 'id',
      title: 'title',
      asking_price: 'price',
      industry: 'category',
      business_type: 'property_type',
      listing_status: 'status',
      monthly_revenue: 'revenue_average',
      monthly_profit: 'profit_average',
      profit_multiple: 'multiple',
      revenue_multiple: 'revenue_multiple',
      location: 'country_name',
      business_age_years: 'established_at',
      monetization_method: 'monetization',
      traffic_verified: 'has_verified_traffic',
      revenue_verified: 'has_verified_revenue',
      flippa_vetted: 'manually_vetted',
      tech_stack: 'integrations'
    },

    // Data transformation rules
    transformations: {
      price: (value) => Math.round(value),
      monthly_revenue: (value) => Math.round(value || 0),
      monthly_profit: (value) => Math.round(value || 0),
      business_age_years: (value) => {
        if (typeof value === 'string') {
          if (value.includes('<1')) return 0;
          const match = value.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }
        return value || 0;
      },
      profit_multiple: (value) => parseFloat(value || 0).toFixed(2),
      revenue_multiple: (value) => parseFloat(value || 0).toFixed(2)
    },

    // Quality scoring for TheFounder
    qualityScore: (listing) => {
      let score = 0;
      
      // Verification bonuses
      if (listing.traffic_verified) score += 20;
      if (listing.revenue_verified) score += 30;
      if (listing.flippa_vetted) score += 25;
      
      // Data completeness
      const requiredFields = ['price', 'category', 'monetization', 'title'];
      const hasRequired = requiredFields.every(field => listing[field]);
      if (hasRequired) score += 15;
      
      // Financial data
      if (listing.monthly_revenue > 0) score += 5;
      if (listing.monthly_profit > 0) score += 5;
      
      return Math.min(score, 100);
    }
  }
};

// Export the strategy
module.exports = FlippaScrapingStrategy;