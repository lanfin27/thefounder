// Cascading selector attempts with different approaches
const SemanticDetector = require('../strategies/semantic-detector');
const VisualDetector = require('../strategies/visual-detector');
const ContextDetector = require('../strategies/context-detector');
const ContentMiner = require('./content-miner');

class SelectorCascade {
  constructor() {
    this.semanticDetector = new SemanticDetector();
    this.visualDetector = new VisualDetector();
    this.contextDetector = new ContextDetector();
    this.contentMiner = new ContentMiner();
    
    // Track performance of each strategy
    this.strategyPerformance = {
      semantic: { attempts: 0, successes: 0 },
      visual: { attempts: 0, successes: 0 },
      context: { attempts: 0, successes: 0 },
      bruteForce: { attempts: 0, successes: 0 },
      mlPatterns: { attempts: 0, successes: 0 }
    };
  }

  /**
   * Execute cascade of strategies to find data
   */
  async executeStrategy($, dataType, options = {}) {
    const results = [];
    const strategies = this.getStrategiesForDataType(dataType);
    
    console.log(`🔄 Executing cascade for ${dataType} with ${strategies.length} strategies`);
    
    for (const strategy of strategies) {
      try {
        console.log(`  → Trying ${strategy.name} strategy...`);
        this.strategyPerformance[strategy.type].attempts++;
        
        const result = await strategy.execute($, dataType, options);
        
        if (this.validateData(result, dataType)) {
          console.log(`  ✅ ${strategy.name} succeeded!`);
          this.strategyPerformance[strategy.type].successes++;
          
          results.push({
            ...result,
            strategy: strategy.name,
            confidence: this.calculateConfidence(result, strategy.type)
          });
          
          // If high confidence result, can stop early
          if (results[results.length - 1].confidence > 90) {
            break;
          }
        } else {
          console.log(`  ❌ ${strategy.name} failed validation`);
        }
      } catch (error) {
        console.log(`  ⚠️ ${strategy.name} error:`, error.message);
      }
    }
    
    // Return best result
    if (results.length > 0) {
      results.sort((a, b) => b.confidence - a.confidence);
      return results[0];
    }
    
    // All strategies failed, try emergency fallback
    console.log('  🚨 All strategies failed, trying emergency content mining...');
    return await this.emergencyFallback($, dataType);
  }

  /**
   * Get strategies for specific data type
   */
  getStrategiesForDataType(dataType) {
    const baseStrategies = [
      {
        name: 'Semantic Pattern Detection',
        type: 'semantic',
        execute: async ($, type, opts) => this.trySemanticApproach($, type, opts)
      },
      {
        name: 'Visual Layout Analysis',
        type: 'visual',
        execute: async ($, type, opts) => this.tryVisualApproach($, type, opts)
      },
      {
        name: 'Context Relationship Analysis',
        type: 'context',
        execute: async ($, type, opts) => this.tryContextApproach($, type, opts)
      },
      {
        name: 'Brute Force Search',
        type: 'bruteForce',
        execute: async ($, type, opts) => this.tryBruteForce($, type, opts)
      },
      {
        name: 'ML Pattern Recognition',
        type: 'mlPatterns',
        execute: async ($, type, opts) => this.tryMLPatterns($, type, opts)
      }
    ];
    
    // Reorder based on historical performance for this data type
    return this.optimizeStrategyOrder(baseStrategies, dataType);
  }

  /**
   * Strategy: Semantic approach
   */
  async trySemanticApproach($, dataType, options) {
    let elements;
    
    switch (dataType) {
      case 'price':
        elements = await this.semanticDetector.detectPriceElements($, options.container);
        break;
      case 'title':
        elements = await this.semanticDetector.detectTitleElements($, options.container);
        break;
      case 'revenue':
      case 'profit':
      case 'multiple':
        const metrics = await this.semanticDetector.detectMetricElements($, options.container);
        elements = metrics[dataType] || metrics[dataType + 's'] || [];
        break;
      default:
        elements = [];
    }
    
    if (elements.length > 0) {
      return {
        value: elements[0].value,
        text: elements[0].text,
        selector: elements[0].selector,
        elements: elements.slice(0, 5) // Top 5 candidates
      };
    }
    
    return null;
  }

  /**
   * Strategy: Visual approach
   */
  async tryVisualApproach($, dataType, options) {
    // Analyze visual positioning
    const positioned = await this.visualDetector.analyzeElementPositions($, options.container);
    
    // Get size-based candidates
    const sized = await this.visualDetector.detectBySize($, dataType);
    
    // Analyze color patterns
    const colored = await this.visualDetector.analyzeColorPatterns($);
    
    // Combine visual signals
    let candidates = [];
    
    switch (dataType) {
      case 'price':
        candidates = [
          ...(positioned.likelyPrices || []),
          ...(sized.large || []).filter(e => e.text.includes('$')),
          ...(colored.emphasis || []).filter(e => e.text.includes('$'))
        ];
        break;
        
      case 'title':
        candidates = [
          ...(positioned.likelyTitles || []),
          ...(sized.large || []).filter(e => e.text.length >= 10),
          ...(colored.emphasis || []).filter(e => e.text.length >= 10)
        ];
        break;
        
      case 'revenue':
      case 'profit':
        candidates = [
          ...(positioned.likelyMetrics || []),
          ...(sized.medium || []).filter(e => e.text.toLowerCase().includes(dataType)),
          ...(colored.positive || []).filter(e => e.text.includes('$'))
        ];
        break;
        
      case 'multiple':
        candidates = [
          ...(positioned.likelyMetrics || []),
          ...(sized.medium || []).filter(e => e.text.match(/[\d.]+x/i))
        ];
        break;
    }
    
    if (candidates.length > 0) {
      // Sort by confidence and return best
      candidates.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      
      return {
        value: candidates[0].value || this.extractValue(candidates[0].text, dataType),
        text: candidates[0].text,
        selector: candidates[0].selector,
        elements: candidates.slice(0, 5)
      };
    }
    
    return null;
  }

  /**
   * Strategy: Context approach
   */
  async tryContextApproach($, dataType, options) {
    // Find by proximity to labels
    const proximity = await this.contextDetector.findByProximity($, dataType);
    
    // Analyze hierarchy
    const hierarchy = await this.contextDetector.analyzeHierarchy($, options.container);
    
    // Detect repeating patterns
    const patterns = await this.contextDetector.detectRepeatingPatterns($);
    
    // Combine context clues
    let candidates = [];
    
    if (proximity[dataType] && proximity[dataType].length > 0) {
      candidates.push(...proximity[dataType]);
    }
    
    // Look in hierarchical structures
    for (const structure of hierarchy) {
      if (structure.dataElements[dataType]) {
        candidates.push({
          ...structure.dataElements[dataType],
          confidence: structure.confidence
        });
      }
    }
    
    // Look in repeating patterns
    for (const pattern of patterns) {
      if (pattern.dataPoints.length > 0) {
        const dataPoint = pattern.dataPoints[0][dataType];
        if (dataPoint) {
          candidates.push({
            ...dataPoint,
            confidence: pattern.confidence
          });
        }
      }
    }
    
    if (candidates.length > 0) {
      candidates.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      
      return {
        value: candidates[0].value,
        text: candidates[0].text,
        selector: candidates[0].selector,
        elements: candidates.slice(0, 5)
      };
    }
    
    return null;
  }

  /**
   * Strategy: Brute force search
   */
  async tryBruteForce($, dataType, options) {
    console.log('    🔨 Starting brute force search...');
    const candidates = [];
    
    // Search all elements
    $('*').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      
      // Skip if too many children or too long
      if ($elem.children().length > 5 || text.length > 500) return;
      
      const value = this.extractValue(text, dataType);
      if (value !== null && this.isValidValue(value, dataType)) {
        candidates.push({
          element: elem,
          selector: this.generateSelector($, elem),
          text: text,
          value: value,
          confidence: this.calculateBruteForceConfidence(elem, $, dataType)
        });
      }
    });
    
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.confidence - a.confidence);
      
      return {
        value: candidates[0].value,
        text: candidates[0].text,
        selector: candidates[0].selector,
        elements: candidates.slice(0, 5)
      };
    }
    
    return null;
  }

  /**
   * Strategy: ML-like pattern recognition
   */
  async tryMLPatterns($, dataType, options) {
    console.log('    🧠 Applying ML pattern recognition...');
    
    // Simulate ML pattern recognition
    const features = this.extractPageFeatures($);
    const patterns = this.matchKnownPatterns(features, dataType);
    
    if (patterns.length > 0) {
      const bestPattern = patterns[0];
      const elements = $(bestPattern.selector);
      
      if (elements.length > 0) {
        const values = elements.map((i, elem) => ({
          text: $(elem).text().trim(),
          value: this.extractValue($(elem).text().trim(), dataType),
          selector: this.generateSelector($, elem),
          confidence: bestPattern.confidence
        })).get();
        
        const valid = values.filter(v => v.value !== null);
        if (valid.length > 0) {
          return {
            value: valid[0].value,
            text: valid[0].text,
            selector: valid[0].selector,
            elements: valid.slice(0, 5)
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Emergency fallback when all strategies fail
   */
  async emergencyFallback($, dataType) {
    console.log('  🆘 Emergency content mining fallback...');
    
    // Try content mining as last resort
    const mined = await this.contentMiner.extractFromRawText($.html(), dataType);
    
    if (mined && mined.value !== null) {
      return {
        value: mined.value,
        text: mined.text,
        selector: null, // No selector in emergency mode
        confidence: 30, // Low confidence
        strategy: 'emergency-content-mining'
      };
    }
    
    return null;
  }

  /**
   * Validate extracted data
   */
  validateData(result, dataType) {
    if (!result || result.value === null || result.value === undefined) {
      return false;
    }
    
    switch (dataType) {
      case 'price':
        return typeof result.value === 'number' && 
               result.value > 100 && 
               result.value < 1000000000;
               
      case 'title':
        return typeof result.text === 'string' && 
               result.text.length >= 5 && 
               result.text.length <= 200;
               
      case 'revenue':
      case 'profit':
        return typeof result.value === 'number' && 
               result.value >= 0 && 
               result.value < 100000000;
               
      case 'multiple':
        return typeof result.value === 'number' && 
               result.value > 0 && 
               result.value < 100;
               
      default:
        return true;
    }
  }

  /**
   * Calculate confidence based on strategy and result
   */
  calculateConfidence(result, strategyType) {
    let confidence = 50; // Base confidence
    
    // Strategy-based confidence
    const strategyConfidence = {
      semantic: 85,
      visual: 75,
      context: 80,
      bruteForce: 60,
      mlPatterns: 70
    };
    
    confidence = strategyConfidence[strategyType] || 50;
    
    // Adjust based on result quality
    if (result.elements && result.elements.length > 1) {
      // Multiple candidates found
      confidence += 10;
    }
    
    if (result.selector) {
      // Has specific selector
      confidence += 5;
    }
    
    // Adjust based on historical performance
    const perf = this.strategyPerformance[strategyType];
    if (perf.attempts > 0) {
      const successRate = perf.successes / perf.attempts;
      confidence = confidence * (0.5 + successRate * 0.5);
    }
    
    return Math.min(Math.round(confidence), 100);
  }

  /**
   * Optimize strategy order based on performance
   */
  optimizeStrategyOrder(strategies, dataType) {
    // Calculate efficiency score for each strategy
    const scored = strategies.map(strategy => {
      const perf = this.strategyPerformance[strategy.type];
      const efficiency = perf.attempts > 0 
        ? perf.successes / perf.attempts 
        : 0.5; // Default efficiency
      
      return {
        ...strategy,
        efficiency: efficiency
      };
    });
    
    // Sort by efficiency (best performing first)
    scored.sort((a, b) => b.efficiency - a.efficiency);
    
    return scored;
  }

  /**
   * Helper methods
   */
  extractValue(text, dataType) {
    if (!text) return null;
    
    switch (dataType) {
      case 'price':
      case 'revenue':
      case 'profit':
        const match = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
        if (match) {
          return parseFloat(match[1].replace(/,/g, ''));
        }
        break;
        
      case 'title':
        return text.trim();
        
      case 'multiple':
        const multipleMatch = text.match(/([\d.]+)x?/i);
        if (multipleMatch) {
          return parseFloat(multipleMatch[1]);
        }
        break;
    }
    
    return null;
  }

  isValidValue(value, dataType) {
    if (value === null || value === undefined) return false;
    
    switch (dataType) {
      case 'price':
        return value > 100 && value < 1000000000;
      case 'revenue':
      case 'profit':
        return value >= 0 && value < 100000000;
      case 'multiple':
        return value > 0 && value < 100;
      case 'title':
        return value.length >= 5 && value.length <= 200;
      default:
        return true;
    }
  }

  calculateBruteForceConfidence(elem, $, dataType) {
    let confidence = 40; // Base confidence for brute force
    
    // Check element properties
    const $elem = $(elem);
    const classes = $elem.attr('class') || '';
    const id = $elem.attr('id') || '';
    
    // Boost for relevant classes/ids
    if (new RegExp(dataType, 'i').test(classes + id)) {
      confidence += 20;
    }
    
    // Boost for appropriate element types
    const tag = elem.tagName?.toLowerCase();
    if (['span', 'div', 'p', 'td', 'dd'].includes(tag)) {
      confidence += 10;
    }
    
    // Boost if not deeply nested
    let depth = 0;
    let current = $elem;
    while (current.parent().length && depth < 10) {
      current = current.parent();
      depth++;
    }
    if (depth < 5) {
      confidence += 10;
    }
    
    return confidence;
  }

  extractPageFeatures($) {
    return {
      hasDataAttributes: $('[data-price], [data-revenue], [data-listing]').length > 0,
      hasSchema: $('[itemtype], [itemprop]').length > 0,
      hasGrid: $('.grid, .row, .listings').length > 0,
      hasTable: $('table').length > 0,
      hasCurrency: $.html().includes('$') || $.html().includes('USD'),
      totalElements: $('*').length
    };
  }

  matchKnownPatterns(features, dataType) {
    const patterns = [];
    
    // Common patterns based on features
    if (features.hasDataAttributes) {
      patterns.push({
        selector: `[data-${dataType}]`,
        confidence: 90
      });
    }
    
    if (features.hasSchema) {
      const itemprops = {
        price: 'price',
        title: 'name',
        revenue: 'revenue',
        profit: 'profit'
      };
      
      if (itemprops[dataType]) {
        patterns.push({
          selector: `[itemprop="${itemprops[dataType]}"]`,
          confidence: 85
        });
      }
    }
    
    // Common class patterns
    const classPatterns = {
      price: ['.price', '.listing-price', '.ask-price', '.amount'],
      title: ['.title', '.listing-title', '.name', '.business-name'],
      revenue: ['.revenue', '.monthly-revenue', '.gross-revenue'],
      profit: ['.profit', '.net-profit', '.monthly-profit'],
      multiple: ['.multiple', '.valuation', '.price-multiple']
    };
    
    if (classPatterns[dataType]) {
      classPatterns[dataType].forEach(cls => {
        patterns.push({
          selector: cls,
          confidence: 70
        });
      });
    }
    
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  generateSelector($, elem) {
    const tag = elem.tagName?.toLowerCase();
    const id = $(elem).attr('id');
    const classes = $(elem).attr('class');
    
    if (id) return `#${id}`;
    
    if (classes) {
      const classList = classes.split(' ').filter(c => c).slice(0, 2);
      if (classList.length > 0) {
        return `${tag}.${classList.join('.')}`;
      }
    }
    
    return tag || 'element';
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {};
    
    for (const [strategy, perf] of Object.entries(this.strategyPerformance)) {
      stats[strategy] = {
        attempts: perf.attempts,
        successes: perf.successes,
        successRate: perf.attempts > 0 ? (perf.successes / perf.attempts * 100).toFixed(1) + '%' : 'N/A'
      };
    }
    
    return stats;
  }
}

module.exports = SelectorCascade;