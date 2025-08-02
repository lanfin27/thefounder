// Flippa Data Processor - Validation and Transformation Pipeline

const Joi = require('joi');
const _ = require('lodash');
const moment = require('moment');

class FlippaDataProcessor {
  constructor() {
    // Validation schemas based on Apify data structure
    this.schemas = this.initializeSchemas();
    
    // Transformation rules
    this.transformations = this.initializeTransformations();
  }

  initializeSchemas() {
    return {
      listing: Joi.object({
        id: Joi.string().required(),
        title: Joi.string().min(3).required(),
        price: Joi.number().min(0).required(),
        listing_url: Joi.string().uri().required(),
        
        // Financial fields
        multiple: Joi.number().min(0).max(100).optional(),
        revenue_multiple: Joi.number().min(0).max(100).optional(),
        profit_average: Joi.number().min(0).optional(),
        revenue_average: Joi.number().min(0).optional(),
        ttm_revenue: Joi.number().min(0).optional(),
        
        // Business fields
        property_type: Joi.string().valid('Ecommerce', 'Content', 'SaaS', 'Service', 'App', 'Domain').optional(),
        category: Joi.string().optional(),
        monetization: Joi.string().optional(),
        established_at: Joi.number().min(0).max(100).optional(),
        country_name: Joi.string().optional(),
        
        // Verification fields
        has_verified_traffic: Joi.boolean().optional(),
        has_verified_revenue: Joi.boolean().optional(),
        manually_vetted: Joi.boolean().optional(),
        
        // Quality fields
        _qualityScore: Joi.number().min(0).max(100).required(),
        _extractionConfidence: Joi.number().min(0).max(100).required()
      })
    };
  }

  initializeTransformations() {
    return {
      // Normalize business types
      property_type: (value) => {
        const mapping = {
          'ecommerce': 'Ecommerce',
          'e-commerce': 'Ecommerce',
          'content': 'Content',
          'blog': 'Content',
          'saas': 'SaaS',
          'software': 'SaaS',
          'service': 'Service',
          'app': 'App',
          'domain': 'Domain'
        };
        return mapping[value?.toLowerCase()] || value;
      },
      
      // Normalize monetization methods
      monetization: (value) => {
        const mapping = {
          'dropship': 'Dropshipping',
          'drop shipping': 'Dropshipping',
          'ecom': 'Ecommerce',
          'affiliate': 'Affiliate Sales',
          'ads': 'Advertising',
          'adsense': 'Advertising',
          'subscription': 'Services & Subscriptions'
        };
        return mapping[value?.toLowerCase()] || value;
      },
      
      // Clean and normalize URLs
      listing_url: (value, listing) => {
        if (!value && listing.id) {
          return `https://flippa.com/${listing.id}`;
        }
        return value?.startsWith('http') ? value : `https://flippa.com${value}`;
      }
    };
  }

  async processListings(listings) {
    const processed = [];
    const errors = [];
    
    for (const listing of listings) {
      try {
        // Apply transformations
        const transformed = this.transform(listing);
        
        // Validate
        const validated = await this.validate(transformed);
        
        // Enrich with calculated fields
        const enriched = this.enrich(validated);
        
        // Check for duplicates
        if (!this.isDuplicate(enriched, processed)) {
          processed.push(enriched);
        }
        
      } catch (error) {
        errors.push({
          listing: listing.id || 'unknown',
          error: error.message
        });
      }
    }
    
    return {
      processed,
      errors,
      stats: this.generateStats(processed, errors)
    };
  }

  transform(listing) {
    const transformed = { ...listing };
    
    Object.entries(this.transformations).forEach(([field, transformer]) => {
      if (transformed[field] !== undefined) {
        transformed[field] = transformer(transformed[field], transformed);
      }
    });
    
    return transformed;
  }

  async validate(listing) {
    const { error, value } = this.schemas.listing.validate(listing, {
      stripUnknown: true,
      abortEarly: false
    });
    
    if (error) {
      throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }
    
    return value;
  }

  enrich(listing) {
    const enriched = { ...listing };
    
    // Calculate profit margin
    if (enriched.revenue_average && enriched.profit_average) {
      enriched.profit_margin = ((enriched.profit_average / enriched.revenue_average) * 100).toFixed(2);
    }
    
    // Calculate annual values
    if (enriched.revenue_average) {
      enriched.annual_revenue = enriched.revenue_average * 12;
    }
    if (enriched.profit_average) {
      enriched.annual_profit = enriched.profit_average * 12;
    }
    
    // Categorize by size
    if (enriched.price) {
      if (enriched.price < 10000) enriched.size_category = 'small';
      else if (enriched.price < 100000) enriched.size_category = 'medium';
      else if (enriched.price < 1000000) enriched.size_category = 'large';
      else enriched.size_category = 'enterprise';
    }
    
    // Add processing metadata
    enriched._processed_at = new Date().toISOString();
    enriched._processor_version = '1.0';
    
    return enriched;
  }

  isDuplicate(listing, existingListings) {
    return existingListings.some(existing => existing.id === listing.id);
  }

  generateStats(processed, errors) {
    const categoryDistribution = _.countBy(processed, 'category');
    const propertyTypeDistribution = _.countBy(processed, 'property_type');
    const avgQualityScore = _.meanBy(processed, '_qualityScore');
    const verificationRate = (processed.filter(l => 
      l.has_verified_traffic || l.has_verified_revenue
    ).length / processed.length) * 100;
    
    return {
      totalProcessed: processed.length,
      totalErrors: errors.length,
      successRate: ((processed.length / (processed.length + errors.length)) * 100).toFixed(2),
      avgQualityScore: avgQualityScore?.toFixed(2) || 0,
      verificationRate: verificationRate.toFixed(2),
      categoryDistribution,
      propertyTypeDistribution
    };
  }
}

module.exports = FlippaDataProcessor;
