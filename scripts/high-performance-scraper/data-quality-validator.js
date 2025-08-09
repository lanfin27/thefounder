// scripts/high-performance-scraper/data-quality-validator.js
// Comprehensive Data Quality Validation System for Marketplace Data

const { performance } = require('perf_hooks');
const EventEmitter = require('events');

class DataQualityValidator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      strictMode: false,
      autoCorrect: true,
      mlValidation: true,
      businessRules: true,
      crossValidation: true,
      ...config
    };
    
    // Validation rules by marketplace
    this.marketplaceRules = {
      flippa: {
        requiredFields: ['title', 'price', 'url'],
        optionalFields: ['revenue', 'profit', 'multiple', 'category', 'age', 'traffic'],
        priceRange: { min: 1, max: 10000000 },
        multipleRange: { min: 0.1, max: 100 },
        revenueValidation: true
      },
      empire_flippers: {
        requiredFields: ['title', 'price', 'monthly_profit', 'multiple'],
        optionalFields: ['revenue', 'category', 'age', 'monetization'],
        priceRange: { min: 1000, max: 50000000 },
        multipleRange: { min: 12, max: 60 },
        profitMarginValidation: true
      },
      motion_invest: {
        requiredFields: ['title', 'price', 'monthly_revenue'],
        optionalFields: ['profit', 'multiple', 'niche', 'monetization', 'content_count'],
        priceRange: { min: 500, max: 5000000 },
        multipleRange: { min: 20, max: 50 },
        contentValidation: true
      },
      microacquire: {
        requiredFields: ['title', 'price', 'revenue', 'type'],
        optionalFields: ['profit', 'growth_rate', 'tech_stack', 'team_size'],
        priceRange: { min: 0, max: 100000000 },
        growthValidation: true,
        techStackValidation: true
      }
    };
    
    // Business value patterns
    this.businessValuePatterns = {
      highValue: {
        minRevenue: 10000,
        minProfit: 5000,
        maxMultiple: 40,
        minProfitMargin: 0.3,
        growthRate: 0.1
      },
      mediumValue: {
        minRevenue: 1000,
        minProfit: 500,
        maxMultiple: 50,
        minProfitMargin: 0.2
      },
      lowValue: {
        minRevenue: 100,
        minProfit: 50,
        maxMultiple: 60,
        minProfitMargin: 0.1
      }
    };
    
    // ML model for anomaly detection
    this.anomalyModel = {
      trained: false,
      features: new Map(),
      thresholds: new Map(),
      patterns: []
    };
    
    // Validation statistics
    this.stats = {
      totalValidated: 0,
      passed: 0,
      failed: 0,
      corrected: 0,
      byMarketplace: {},
      commonErrors: new Map(),
      qualityScores: []
    };
  }

  async validateListing(listing, marketplace = 'flippa') {
    const validation = {
      isValid: true,
      qualityScore: 0,
      errors: [],
      warnings: [],
      corrections: {},
      businessValue: null,
      confidence: 0,
      timestamp: Date.now()
    };
    
    const startTime = performance.now();
    
    try {
      // 1. Schema validation
      const schemaResult = this.validateSchema(listing, marketplace);
      validation.errors.push(...schemaResult.errors);
      validation.warnings.push(...schemaResult.warnings);
      
      // 2. Data type validation
      const typeResult = this.validateDataTypes(listing, marketplace);
      validation.errors.push(...typeResult.errors);
      if (this.config.autoCorrect && typeResult.corrections) {
        Object.assign(validation.corrections, typeResult.corrections);
        this.applyCorrections(listing, typeResult.corrections);
      }
      
      // 3. Business logic validation
      const businessResult = this.validateBusinessLogic(listing, marketplace);
      validation.errors.push(...businessResult.errors);
      validation.warnings.push(...businessResult.warnings);
      
      // 4. Range validation
      const rangeResult = this.validateRanges(listing, marketplace);
      validation.errors.push(...rangeResult.errors);
      validation.warnings.push(...rangeResult.warnings);
      
      // 5. Pattern validation
      const patternResult = this.validatePatterns(listing);
      validation.errors.push(...patternResult.errors);
      validation.warnings.push(...patternResult.warnings);
      
      // 6. Cross-field validation
      if (this.config.crossValidation) {
        const crossResult = this.validateCrossFields(listing, marketplace);
        validation.errors.push(...crossResult.errors);
        validation.warnings.push(...crossResult.warnings);
      }
      
      // 7. ML-based anomaly detection
      if (this.config.mlValidation && this.anomalyModel.trained) {
        const anomalyResult = this.detectAnomalies(listing, marketplace);
        if (anomalyResult.isAnomaly) {
          validation.warnings.push({
            field: 'ml_validation',
            message: `Anomaly detected: ${anomalyResult.reason}`,
            confidence: anomalyResult.confidence
          });
        }
      }
      
      // 8. Business value assessment
      if (this.config.businessRules) {
        validation.businessValue = this.assessBusinessValue(listing, marketplace);
      }
      
      // Calculate quality score
      validation.qualityScore = this.calculateQualityScore(listing, validation);
      validation.isValid = validation.errors.length === 0;
      validation.confidence = this.calculateConfidence(listing, validation);
      
      // Update statistics
      this.updateStatistics(marketplace, validation);
      
      // Emit validation event
      this.emit('validation_complete', {
        listing,
        marketplace,
        validation,
        duration: performance.now() - startTime
      });
      
    } catch (error) {
      validation.isValid = false;
      validation.errors.push({
        field: 'system',
        message: `Validation error: ${error.message}`,
        severity: 'critical'
      });
    }
    
    return validation;
  }

  validateSchema(listing, marketplace) {
    const result = { errors: [], warnings: [] };
    const rules = this.marketplaceRules[marketplace] || this.marketplaceRules.flippa;
    
    // Check required fields
    for (const field of rules.requiredFields) {
      if (!listing[field] && listing[field] !== 0) {
        result.errors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'high'
        });
      }
    }
    
    // Check for unexpected fields (potential extraction errors)
    const allFields = [...rules.requiredFields, ...rules.optionalFields];
    const unexpectedFields = Object.keys(listing).filter(
      field => !allFields.includes(field) && !['id', 'url', 'created_at', 'raw_data'].includes(field)
    );
    
    if (unexpectedFields.length > 0) {
      result.warnings.push({
        field: 'schema',
        message: `Unexpected fields found: ${unexpectedFields.join(', ')}`,
        severity: 'low'
      });
    }
    
    return result;
  }

  validateDataTypes(listing, marketplace) {
    const result = { errors: [], corrections: {} };
    
    // Price validation
    if (listing.price !== undefined) {
      const priceValidation = this.validateMonetaryValue(listing.price, 'price');
      if (!priceValidation.isValid) {
        result.errors.push(priceValidation.error);
      } else if (priceValidation.corrected !== undefined) {
        result.corrections.price = priceValidation.corrected;
      }
    }
    
    // Revenue validation
    if (listing.revenue !== undefined || listing.monthly_revenue !== undefined) {
      const revenueField = listing.revenue !== undefined ? 'revenue' : 'monthly_revenue';
      const revenueValidation = this.validateMonetaryValue(listing[revenueField], revenueField);
      if (!revenueValidation.isValid) {
        result.errors.push(revenueValidation.error);
      } else if (revenueValidation.corrected !== undefined) {
        result.corrections[revenueField] = revenueValidation.corrected;
      }
    }
    
    // Profit validation
    if (listing.profit !== undefined || listing.monthly_profit !== undefined) {
      const profitField = listing.profit !== undefined ? 'profit' : 'monthly_profit';
      const profitValidation = this.validateMonetaryValue(listing[profitField], profitField);
      if (!profitValidation.isValid) {
        result.errors.push(profitValidation.error);
      } else if (profitValidation.corrected !== undefined) {
        result.corrections[profitField] = profitValidation.corrected;
      }
    }
    
    // Multiple validation
    if (listing.multiple !== undefined) {
      const multipleValidation = this.validateNumericValue(listing.multiple, 'multiple', 0.1, 100);
      if (!multipleValidation.isValid) {
        result.errors.push(multipleValidation.error);
      } else if (multipleValidation.corrected !== undefined) {
        result.corrections.multiple = multipleValidation.corrected;
      }
    }
    
    // URL validation
    if (listing.url) {
      const urlValidation = this.validateUrl(listing.url);
      if (!urlValidation.isValid) {
        result.errors.push(urlValidation.error);
      }
    }
    
    // Date validation
    if (listing.age) {
      const ageValidation = this.validateAge(listing.age);
      if (!ageValidation.isValid) {
        result.errors.push(ageValidation.error);
      } else if (ageValidation.corrected !== undefined) {
        result.corrections.age = ageValidation.corrected;
      }
    }
    
    return result;
  }

  validateMonetaryValue(value, fieldName) {
    const result = { isValid: true };
    
    if (value === null || value === undefined) {
      return result;
    }
    
    // Handle string values
    if (typeof value === 'string') {
      // Try to parse monetary value
      const parsed = this.parseMonetaryValue(value);
      if (parsed !== null) {
        result.corrected = parsed;
      } else {
        result.isValid = false;
        result.error = {
          field: fieldName,
          message: `Invalid monetary value: ${value}`,
          severity: 'high'
        };
      }
    } else if (typeof value === 'number') {
      // Check for reasonable bounds
      if (value < 0) {
        result.isValid = false;
        result.error = {
          field: fieldName,
          message: `Negative monetary value: ${value}`,
          severity: 'high'
        };
      } else if (value > 1000000000) {
        result.isValid = false;
        result.error = {
          field: fieldName,
          message: `Unreasonably high monetary value: ${value}`,
          severity: 'medium'
        };
      }
    } else {
      result.isValid = false;
      result.error = {
        field: fieldName,
        message: `Invalid data type for monetary value: ${typeof value}`,
        severity: 'high'
      };
    }
    
    return result;
  }

  parseMonetaryValue(value) {
    if (typeof value !== 'string') return null;
    
    // Remove currency symbols and spaces
    let cleaned = value.replace(/[$£€¥,\s]/g, '');
    
    // Handle K/M/B suffixes
    const multipliers = {
      'k': 1000,
      'm': 1000000,
      'b': 1000000000
    };
    
    const suffix = cleaned.slice(-1).toLowerCase();
    if (multipliers[suffix]) {
      cleaned = cleaned.slice(0, -1);
      const number = parseFloat(cleaned);
      if (!isNaN(number)) {
        return number * multipliers[suffix];
      }
    }
    
    // Try direct parse
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  validateNumericValue(value, fieldName, min = null, max = null) {
    const result = { isValid: true };
    
    if (value === null || value === undefined) {
      return result;
    }
    
    // Try to convert to number
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      result.isValid = false;
      result.error = {
        field: fieldName,
        message: `Invalid numeric value: ${value}`,
        severity: 'high'
      };
    } else {
      if (min !== null && numValue < min) {
        result.isValid = false;
        result.error = {
          field: fieldName,
          message: `Value ${numValue} is below minimum ${min}`,
          severity: 'medium'
        };
      }
      if (max !== null && numValue > max) {
        result.isValid = false;
        result.error = {
          field: fieldName,
          message: `Value ${numValue} is above maximum ${max}`,
          severity: 'medium'
        };
      }
      
      if (typeof value === 'string') {
        result.corrected = numValue;
      }
    }
    
    return result;
  }

  validateUrl(url) {
    const result = { isValid: true };
    
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        result.isValid = false;
        result.error = {
          field: 'url',
          message: `Invalid URL protocol: ${parsed.protocol}`,
          severity: 'medium'
        };
      }
    } catch (error) {
      result.isValid = false;
      result.error = {
        field: 'url',
        message: `Invalid URL format: ${url}`,
        severity: 'medium'
      };
    }
    
    return result;
  }

  validateAge(age) {
    const result = { isValid: true };
    
    if (typeof age === 'string') {
      // Parse age strings like "2 years", "18 months"
      const match = age.match(/(\d+)\s*(year|month|day)/i);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        let months;
        switch (unit) {
          case 'year':
            months = value * 12;
            break;
          case 'month':
            months = value;
            break;
          case 'day':
            months = value / 30;
            break;
        }
        
        result.corrected = months;
      } else {
        result.isValid = false;
        result.error = {
          field: 'age',
          message: `Invalid age format: ${age}`,
          severity: 'low'
        };
      }
    } else if (typeof age === 'number') {
      if (age < 0 || age > 600) { // Max 50 years in months
        result.isValid = false;
        result.error = {
          field: 'age',
          message: `Invalid age value: ${age}`,
          severity: 'low'
        };
      }
    }
    
    return result;
  }

  validateBusinessLogic(listing, marketplace) {
    const result = { errors: [], warnings: [] };
    const rules = this.marketplaceRules[marketplace];
    
    // Revenue vs Profit validation
    if (listing.revenue && listing.profit) {
      if (listing.profit > listing.revenue) {
        result.errors.push({
          field: 'profit',
          message: 'Profit cannot exceed revenue',
          severity: 'high'
        });
      }
      
      const profitMargin = listing.profit / listing.revenue;
      if (profitMargin > 0.9) {
        result.warnings.push({
          field: 'profit_margin',
          message: `Unusually high profit margin: ${(profitMargin * 100).toFixed(1)}%`,
          severity: 'medium'
        });
      }
    }
    
    // Multiple validation based on price and profit
    if (listing.price && listing.multiple && listing.monthly_profit) {
      const calculatedMultiple = listing.price / (listing.monthly_profit * 12);
      const difference = Math.abs(calculatedMultiple - listing.multiple);
      
      if (difference > 5) {
        result.errors.push({
          field: 'multiple',
          message: `Multiple doesn't match price/profit calculation. Expected: ${calculatedMultiple.toFixed(1)}, Got: ${listing.multiple}`,
          severity: 'medium'
        });
      }
    }
    
    // Marketplace-specific validations
    if (marketplace === 'empire_flippers' && rules.profitMarginValidation) {
      if (listing.revenue && listing.profit) {
        const margin = listing.profit / listing.revenue;
        if (margin < 0.1) {
          result.warnings.push({
            field: 'profit_margin',
            message: 'Low profit margin for Empire Flippers listing',
            severity: 'medium'
          });
        }
      }
    }
    
    if (marketplace === 'motion_invest' && rules.contentValidation) {
      if (listing.content_count && listing.content_count < 10) {
        result.warnings.push({
          field: 'content_count',
          message: 'Low content count for Motion Invest listing',
          severity: 'low'
        });
      }
    }
    
    return result;
  }

  validateRanges(listing, marketplace) {
    const result = { errors: [], warnings: [] };
    const rules = this.marketplaceRules[marketplace];
    
    // Price range validation
    if (listing.price && rules.priceRange) {
      if (listing.price < rules.priceRange.min) {
        result.warnings.push({
          field: 'price',
          message: `Price below typical range for ${marketplace}`,
          severity: 'low'
        });
      }
      if (listing.price > rules.priceRange.max) {
        result.warnings.push({
          field: 'price',
          message: `Price above typical range for ${marketplace}`,
          severity: 'low'
        });
      }
    }
    
    // Multiple range validation
    if (listing.multiple && rules.multipleRange) {
      if (listing.multiple < rules.multipleRange.min) {
        result.warnings.push({
          field: 'multiple',
          message: `Multiple below typical range for ${marketplace}`,
          severity: 'medium'
        });
      }
      if (listing.multiple > rules.multipleRange.max) {
        result.warnings.push({
          field: 'multiple',
          message: `Multiple above typical range for ${marketplace}`,
          severity: 'medium'
        });
      }
    }
    
    return result;
  }

  validatePatterns(listing) {
    const result = { errors: [], warnings: [] };
    
    // Title validation
    if (listing.title) {
      // Check for suspicious patterns
      if (listing.title.length < 5) {
        result.errors.push({
          field: 'title',
          message: 'Title too short',
          severity: 'medium'
        });
      }
      
      if (/^[A-Z\s]+$/.test(listing.title)) {
        result.warnings.push({
          field: 'title',
          message: 'Title is all caps',
          severity: 'low'
        });
      }
      
      // Check for common spam patterns
      const spamPatterns = [
        /\b(guaranteed|instant|overnight)\b/i,
        /\${3,}/,
        /!!!+/,
        /\b(click here|buy now)\b/i
      ];
      
      for (const pattern of spamPatterns) {
        if (pattern.test(listing.title)) {
          result.warnings.push({
            field: 'title',
            message: 'Title contains spam-like patterns',
            severity: 'medium'
          });
          break;
        }
      }
    }
    
    // Category validation
    if (listing.category) {
      const validCategories = [
        'ecommerce', 'saas', 'content', 'app', 'marketplace',
        'blog', 'affiliate', 'service', 'digital', 'physical'
      ];
      
      const normalizedCategory = listing.category.toLowerCase();
      const isValid = validCategories.some(cat => 
        normalizedCategory.includes(cat) || cat.includes(normalizedCategory)
      );
      
      if (!isValid) {
        result.warnings.push({
          field: 'category',
          message: `Unusual category: ${listing.category}`,
          severity: 'low'
        });
      }
    }
    
    return result;
  }

  validateCrossFields(listing, marketplace) {
    const result = { errors: [], warnings: [] };
    
    // Revenue consistency check
    if (listing.monthly_revenue && listing.revenue) {
      const annualizedMonthly = listing.monthly_revenue * 12;
      const difference = Math.abs(annualizedMonthly - listing.revenue);
      const percentDiff = difference / listing.revenue;
      
      if (percentDiff > 0.2) {
        result.warnings.push({
          field: 'revenue_consistency',
          message: 'Monthly and annual revenue figures are inconsistent',
          severity: 'medium'
        });
      }
    }
    
    // Price to revenue ratio
    if (listing.price && listing.revenue && listing.revenue > 0) {
      const priceToRevenue = listing.price / listing.revenue;
      
      if (priceToRevenue < 0.5) {
        result.warnings.push({
          field: 'valuation',
          message: 'Price seems low relative to revenue',
          severity: 'medium'
        });
      } else if (priceToRevenue > 10) {
        result.warnings.push({
          field: 'valuation',
          message: 'Price seems high relative to revenue',
          severity: 'medium'
        });
      }
    }
    
    // Traffic to revenue correlation
    if (listing.traffic && listing.revenue) {
      const revenuePerVisitor = listing.revenue / listing.traffic;
      
      if (revenuePerVisitor > 100) {
        result.warnings.push({
          field: 'metrics',
          message: 'Unusually high revenue per visitor',
          severity: 'medium'
        });
      }
    }
    
    return result;
  }

  detectAnomalies(listing, marketplace) {
    const result = {
      isAnomaly: false,
      confidence: 0,
      reason: ''
    };
    
    // Extract features
    const features = this.extractFeatures(listing);
    
    // Compare against learned patterns
    for (const [feature, value] of features) {
      const threshold = this.anomalyModel.thresholds.get(feature);
      if (threshold) {
        const zscore = Math.abs((value - threshold.mean) / threshold.stdDev);
        if (zscore > 3) {
          result.isAnomaly = true;
          result.confidence = Math.min(0.99, zscore / 10);
          result.reason = `${feature} is ${zscore.toFixed(1)} standard deviations from normal`;
          break;
        }
      }
    }
    
    return result;
  }

  assessBusinessValue(listing, marketplace) {
    const assessment = {
      tier: 'low',
      score: 0,
      strengths: [],
      weaknesses: [],
      opportunities: [],
      risks: []
    };
    
    // Calculate key metrics
    const revenue = listing.revenue || listing.monthly_revenue * 12 || 0;
    const profit = listing.profit || listing.monthly_profit * 12 || 0;
    const profitMargin = revenue > 0 ? profit / revenue : 0;
    const multiple = listing.multiple || (listing.price && profit ? listing.price / profit : 0);
    
    // Determine tier
    if (revenue >= this.businessValuePatterns.highValue.minRevenue &&
        profit >= this.businessValuePatterns.highValue.minProfit &&
        profitMargin >= this.businessValuePatterns.highValue.minProfitMargin) {
      assessment.tier = 'high';
    } else if (revenue >= this.businessValuePatterns.mediumValue.minRevenue &&
               profit >= this.businessValuePatterns.mediumValue.minProfit) {
      assessment.tier = 'medium';
    }
    
    // Calculate score (0-100)
    let score = 0;
    
    // Revenue score (30 points)
    if (revenue > 100000) score += 30;
    else if (revenue > 50000) score += 25;
    else if (revenue > 10000) score += 20;
    else if (revenue > 5000) score += 15;
    else if (revenue > 1000) score += 10;
    else if (revenue > 0) score += 5;
    
    // Profit margin score (25 points)
    if (profitMargin > 0.5) score += 25;
    else if (profitMargin > 0.4) score += 20;
    else if (profitMargin > 0.3) score += 15;
    else if (profitMargin > 0.2) score += 10;
    else if (profitMargin > 0.1) score += 5;
    
    // Multiple score (20 points)
    if (multiple > 0 && multiple < 30) score += 20;
    else if (multiple >= 30 && multiple < 40) score += 15;
    else if (multiple >= 40 && multiple < 50) score += 10;
    else if (multiple >= 50 && multiple < 60) score += 5;
    
    // Growth potential (15 points)
    if (listing.growth_rate && listing.growth_rate > 0.2) score += 15;
    else if (listing.growth_rate && listing.growth_rate > 0.1) score += 10;
    else if (listing.traffic && listing.traffic > 10000) score += 5;
    
    // Asset quality (10 points)
    if (listing.age && listing.age > 24) score += 5; // Over 2 years old
    if (listing.category && ['saas', 'ecommerce'].includes(listing.category.toLowerCase())) score += 5;
    
    assessment.score = score;
    
    // Identify strengths
    if (revenue > 10000) assessment.strengths.push('Strong revenue');
    if (profitMargin > 0.3) assessment.strengths.push('High profit margin');
    if (multiple < 30) assessment.strengths.push('Attractive valuation');
    if (listing.age > 36) assessment.strengths.push('Established business');
    
    // Identify weaknesses
    if (revenue < 1000) assessment.weaknesses.push('Low revenue');
    if (profitMargin < 0.1) assessment.weaknesses.push('Low profit margin');
    if (multiple > 50) assessment.weaknesses.push('High valuation');
    if (!listing.traffic) assessment.weaknesses.push('No traffic data');
    
    // Identify opportunities
    if (profitMargin < 0.3 && revenue > 5000) {
      assessment.opportunities.push('Profit optimization potential');
    }
    if (listing.category === 'content' && !listing.monetization?.includes('affiliate')) {
      assessment.opportunities.push('Monetization expansion');
    }
    
    // Identify risks
    if (listing.category === 'affiliate' && revenue > 0) {
      assessment.risks.push('Single revenue source dependency');
    }
    if (multiple > 40 && profitMargin < 0.2) {
      assessment.risks.push('Overvaluation risk');
    }
    
    return assessment;
  }

  calculateQualityScore(listing, validation) {
    let score = 100;
    
    // Deduct for errors
    score -= validation.errors.length * 10;
    
    // Deduct for warnings
    score -= validation.warnings.length * 3;
    
    // Bonus for completeness
    const fields = Object.keys(listing).filter(k => 
      listing[k] !== null && listing[k] !== undefined && listing[k] !== ''
    );
    const completeness = fields.length / 15; // Assume 15 possible fields
    score += completeness * 10;
    
    // Bonus for business value
    if (validation.businessValue) {
      score += validation.businessValue.score / 5; // Max 20 bonus points
    }
    
    return Math.max(0, Math.min(100, score));
  }

  calculateConfidence(listing, validation) {
    let confidence = 1.0;
    
    // Reduce confidence for each error
    confidence -= validation.errors.length * 0.1;
    
    // Reduce confidence for each warning
    confidence -= validation.warnings.length * 0.03;
    
    // Reduce confidence for missing critical fields
    const criticalFields = ['price', 'revenue', 'profit'];
    const missingCritical = criticalFields.filter(f => !listing[f]).length;
    confidence -= missingCritical * 0.15;
    
    return Math.max(0, Math.min(1, confidence));
  }

  applyCorrections(listing, corrections) {
    for (const [field, value] of Object.entries(corrections)) {
      listing[field] = value;
      this.stats.corrected++;
    }
  }

  extractFeatures(listing) {
    const features = new Map();
    
    // Numeric features
    if (listing.price) features.set('price', listing.price);
    if (listing.revenue) features.set('revenue', listing.revenue);
    if (listing.profit) features.set('profit', listing.profit);
    if (listing.multiple) features.set('multiple', listing.multiple);
    
    // Derived features
    if (listing.revenue && listing.profit) {
      features.set('profit_margin', listing.profit / listing.revenue);
    }
    if (listing.price && listing.revenue) {
      features.set('price_to_revenue', listing.price / listing.revenue);
    }
    
    return features;
  }

  async trainAnomalyModel(listings) {
    console.log(`🤖 Training anomaly detection model with ${listings.length} listings...`);
    
    // Extract features from all listings
    const allFeatures = new Map();
    
    for (const listing of listings) {
      const features = this.extractFeatures(listing);
      
      for (const [feature, value] of features) {
        if (!allFeatures.has(feature)) {
          allFeatures.set(feature, []);
        }
        allFeatures.get(feature).push(value);
      }
    }
    
    // Calculate statistics for each feature
    for (const [feature, values] of allFeatures) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      this.anomalyModel.thresholds.set(feature, {
        mean,
        stdDev,
        min: Math.min(...values),
        max: Math.max(...values)
      });
    }
    
    this.anomalyModel.trained = true;
    console.log(`✅ Model trained with ${allFeatures.size} features`);
  }

  updateStatistics(marketplace, validation) {
    this.stats.totalValidated++;
    
    if (validation.isValid) {
      this.stats.passed++;
    } else {
      this.stats.failed++;
    }
    
    // Update marketplace stats
    if (!this.stats.byMarketplace[marketplace]) {
      this.stats.byMarketplace[marketplace] = {
        total: 0,
        passed: 0,
        failed: 0
      };
    }
    
    this.stats.byMarketplace[marketplace].total++;
    if (validation.isValid) {
      this.stats.byMarketplace[marketplace].passed++;
    } else {
      this.stats.byMarketplace[marketplace].failed++;
    }
    
    // Track common errors
    for (const error of validation.errors) {
      const key = `${error.field}:${error.message}`;
      this.stats.commonErrors.set(key, (this.stats.commonErrors.get(key) || 0) + 1);
    }
    
    // Track quality scores
    this.stats.qualityScores.push(validation.qualityScore);
  }

  async validateBatch(listings, marketplace = 'flippa') {
    console.log(`📋 Validating batch of ${listings.length} listings...`);
    
    const results = {
      valid: [],
      invalid: [],
      corrected: [],
      summary: {
        total: listings.length,
        passed: 0,
        failed: 0,
        corrected: 0,
        avgQualityScore: 0,
        businessValueDistribution: {
          high: 0,
          medium: 0,
          low: 0
        }
      }
    };
    
    const validations = await Promise.all(
      listings.map(listing => this.validateListing(listing, marketplace))
    );
    
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const validation = validations[i];
      
      if (validation.isValid) {
        results.valid.push({ listing, validation });
        results.summary.passed++;
      } else {
        results.invalid.push({ listing, validation });
        results.summary.failed++;
      }
      
      if (Object.keys(validation.corrections).length > 0) {
        results.corrected.push({ listing, corrections: validation.corrections });
        results.summary.corrected++;
      }
      
      if (validation.businessValue) {
        results.summary.businessValueDistribution[validation.businessValue.tier]++;
      }
      
      results.summary.avgQualityScore += validation.qualityScore;
    }
    
    results.summary.avgQualityScore /= listings.length;
    
    return results;
  }

  generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      statistics: {
        total: this.stats.totalValidated,
        passed: this.stats.passed,
        failed: this.stats.failed,
        corrected: this.stats.corrected,
        passRate: this.stats.totalValidated > 0 ? 
          (this.stats.passed / this.stats.totalValidated * 100).toFixed(1) + '%' : 'N/A',
        avgQualityScore: this.stats.qualityScores.length > 0 ?
          (this.stats.qualityScores.reduce((a, b) => a + b, 0) / this.stats.qualityScores.length).toFixed(1) : 'N/A'
      },
      byMarketplace: this.stats.byMarketplace,
      commonErrors: Array.from(this.stats.commonErrors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([error, count]) => ({ error, count })),
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check pass rate
    if (this.stats.totalValidated > 100) {
      const passRate = this.stats.passed / this.stats.totalValidated;
      if (passRate < 0.8) {
        recommendations.push({
          priority: 'high',
          area: 'extraction',
          message: 'Low validation pass rate indicates extraction issues',
          action: 'Review and update extraction selectors'
        });
      }
    }
    
    // Check common errors
    const topErrors = Array.from(this.stats.commonErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    for (const [error, count] of topErrors) {
      if (count > 10) {
        const [field] = error.split(':');
        recommendations.push({
          priority: 'medium',
          area: field,
          message: `Frequent errors in ${field} field`,
          action: `Improve ${field} extraction logic`
        });
      }
    }
    
    return recommendations;
  }
}

module.exports = DataQualityValidator;