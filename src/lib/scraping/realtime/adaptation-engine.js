// Real-time adaptation and optimization engine
const EventEmitter = require('events');

class AdaptationEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      adaptationMode: 'aggressive', // 'conservative', 'moderate', 'aggressive'
      realtimeMonitoring: true,
      adaptationThreshold: 0.7,
      learningWindow: 100, // Last N extractions
      optimizationInterval: 300000, // 5 minutes
      ...options
    };

    // Real-time state tracking
    this.state = {
      currentStrategies: new Map(),
      performanceMetrics: new Map(),
      adaptationHistory: [],
      optimizationQueue: [],
      isAdapting: false
    };

    // Performance tracking window
    this.performanceWindow = [];
    
    // Strategy effectiveness tracking
    this.strategyStats = new Map();
    
    // Start optimization timer
    if (this.options.realtimeMonitoring) {
      this.startOptimizationCycle();
    }
  }

  /**
   * Adapt extraction strategy during execution
   */
  async adaptDuringExecution(context) {
    const { url, targetData, currentResults, $ } = context;
    
    console.log('🔄 Real-time adaptation in progress...');
    
    // Analyze what's missing
    const missingData = this.analyzeMissingData(targetData, currentResults);
    
    // Get current performance metrics
    const performance = this.getCurrentPerformance();
    
    // Determine adaptation strategy
    const adaptationPlan = this.createAdaptationPlan(missingData, performance);
    
    // Execute adaptation
    const adaptedResults = await this.executeAdaptation(adaptationPlan, $, url);
    
    // Record adaptation outcome
    this.recordAdaptation({
      timestamp: new Date().toISOString(),
      missingData: missingData,
      plan: adaptationPlan,
      results: adaptedResults,
      success: Object.keys(adaptedResults).length > 0
    });
    
    return adaptedResults;
  }

  /**
   * Create adaptation plan based on current situation
   */
  createAdaptationPlan(missingData, performance) {
    const plan = {
      strategies: [],
      priority: 'normal',
      timeout: 10000,
      parallel: false
    };

    // Aggressive mode: Try everything
    if (this.options.adaptationMode === 'aggressive') {
      plan.strategies = [
        { type: 'deep-scan', confidence: 80 },
        { type: 'pattern-mutation', confidence: 70 },
        { type: 'context-expansion', confidence: 75 },
        { type: 'fuzzy-matching', confidence: 65 }
      ];
      plan.parallel = true;
      plan.priority = 'high';
    }
    // Moderate mode: Balanced approach
    else if (this.options.adaptationMode === 'moderate') {
      plan.strategies = [
        { type: 'pattern-mutation', confidence: 75 },
        { type: 'context-expansion', confidence: 70 }
      ];
      plan.timeout = 15000;
    }
    // Conservative mode: Minimal changes
    else {
      plan.strategies = [
        { type: 'selector-refinement', confidence: 85 }
      ];
      plan.timeout = 5000;
    }

    // Adjust based on missing data types
    if (missingData.includes('price')) {
      plan.strategies.unshift({ type: 'price-specific-scan', confidence: 90 });
    }
    
    if (missingData.includes('title')) {
      plan.strategies.unshift({ type: 'heading-detection', confidence: 85 });
    }

    return plan;
  }

  /**
   * Execute adaptation plan
   */
  async executeAdaptation(plan, $, url) {
    const results = {};
    this.state.isAdapting = true;
    
    try {
      console.log(`  📋 Executing ${plan.strategies.length} adaptation strategies...`);
      
      if (plan.parallel) {
        // Execute strategies in parallel
        const promises = plan.strategies.map(strategy => 
          this.executeStrategy(strategy, $, url)
        );
        
        const strategyResults = await Promise.all(promises);
        
        // Merge results
        strategyResults.forEach(result => {
          Object.assign(results, result);
        });
      } else {
        // Execute strategies sequentially
        for (const strategy of plan.strategies) {
          const strategyResult = await this.executeStrategy(strategy, $, url);
          Object.assign(results, strategyResult);
          
          // Stop if we found what we need
          if (Object.keys(results).length >= plan.strategies.length * 0.7) {
            break;
          }
        }
      }
    } finally {
      this.state.isAdapting = false;
    }
    
    return results;
  }

  /**
   * Execute individual adaptation strategy
   */
  async executeStrategy(strategy, $, url) {
    console.log(`    → ${strategy.type} (confidence: ${strategy.confidence}%)`);
    
    const startTime = Date.now();
    let results = {};
    
    try {
      switch (strategy.type) {
        case 'deep-scan':
          results = await this.deepScanStrategy($);
          break;
          
        case 'pattern-mutation':
          results = await this.patternMutationStrategy($);
          break;
          
        case 'context-expansion':
          results = await this.contextExpansionStrategy($);
          break;
          
        case 'fuzzy-matching':
          results = await this.fuzzyMatchingStrategy($);
          break;
          
        case 'price-specific-scan':
          results = await this.priceSpecificScan($);
          break;
          
        case 'heading-detection':
          results = await this.headingDetectionStrategy($);
          break;
          
        case 'selector-refinement':
          results = await this.selectorRefinementStrategy($);
          break;
          
        default:
          console.log(`    ⚠️ Unknown strategy: ${strategy.type}`);
      }
      
      // Track strategy performance
      const duration = Date.now() - startTime;
      this.trackStrategyPerformance(strategy.type, Object.keys(results).length > 0, duration);
      
    } catch (error) {
      console.log(`    ❌ Strategy failed: ${error.message}`);
      this.trackStrategyPerformance(strategy.type, false, Date.now() - startTime);
    }
    
    return results;
  }

  /**
   * Deep scan strategy - Exhaustive element analysis
   */
  async deepScanStrategy($) {
    const results = {};
    const candidates = [];
    
    // Scan all elements with text content
    $('*').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      
      if (!text || $elem.children().length > 3) return;
      
      // Score element based on multiple factors
      const score = this.scoreElement($elem, text);
      
      if (score.total > 0.5) {
        candidates.push({
          element: elem,
          text: text,
          score: score,
          type: score.likelyType
        });
      }
    });
    
    // Sort by score and extract data
    candidates.sort((a, b) => b.score.total - a.score.total);
    
    for (const candidate of candidates.slice(0, 10)) {
      if (candidate.type && !results[candidate.type]) {
        results[candidate.type] = {
          value: this.extractValueByType(candidate.text, candidate.type),
          text: candidate.text,
          confidence: Math.round(candidate.score.total * 100),
          method: 'deep-scan'
        };
      }
    }
    
    return results;
  }

  /**
   * Pattern mutation strategy - Try variations of known patterns
   */
  async patternMutationStrategy($) {
    const results = {};
    
    // Get known patterns and mutate them
    const mutations = [
      // Parent/child variations
      (selector) => selector.replace('>', ''),
      (selector) => selector.replace(' ', ' > '),
      
      // Class variations
      (selector) => selector.replace(/\.[^\s]+/, '[class*="$&"]'),
      (selector) => selector.replace(/\.[^\s]+/, ''),
      
      // Attribute variations
      (selector) => selector + '[data-value]',
      (selector) => selector + '[data-price]',
      
      // Pseudo-selector variations
      (selector) => selector + ':first-child',
      (selector) => selector + ':last-child',
      (selector) => selector + ':nth-child(2)'
    ];
    
    // Try mutations on common selectors
    const baseSelectors = [
      '.price', '.value', '.amount',
      '[class*="price"]', '[class*="value"]',
      'span', 'div', 'dd', 'td'
    ];
    
    for (const base of baseSelectors) {
      for (const mutate of mutations) {
        try {
          const mutated = mutate(base);
          const elements = $(mutated);
          
          if (elements.length > 0 && elements.length < 20) {
            elements.each((i, elem) => {
              const text = $(elem).text().trim();
              const dataType = this.detectDataType(text);
              
              if (dataType && !results[dataType]) {
                results[dataType] = {
                  value: this.extractValueByType(text, dataType),
                  text: text,
                  selector: mutated,
                  confidence: 70,
                  method: 'pattern-mutation'
                };
              }
            });
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }
    }
    
    return results;
  }

  /**
   * Context expansion strategy - Look at surrounding elements
   */
  async contextExpansionStrategy($) {
    const results = {};
    
    // Find elements that might be labels
    const labelSelectors = [
      'label', 'dt', 'th', 'strong', 'b',
      '[class*="label"]', '[class*="key"]'
    ];
    
    $(labelSelectors.join(', ')).each((i, elem) => {
      const $label = $(elem);
      const labelText = $label.text().toLowerCase();
      
      // Check if label indicates a data type
      const dataType = this.inferDataTypeFromLabel(labelText);
      if (!dataType || results[dataType]) return;
      
      // Look for value in various positions
      const valueSearches = [
        () => $label.next(), // Next sibling
        () => $label.parent().find('span, div').not($label), // Sibling elements
        () => $label.parent().next(), // Parent's next sibling
        () => $label.closest('tr').find('td').not($label.closest('td')), // Table cell
        () => $label.parent().parent().find('[class*="value"]') // Nearby value class
      ];
      
      for (const search of valueSearches) {
        try {
          const $value = search();
          if ($value.length > 0) {
            const text = $value.first().text().trim();
            const extractedValue = this.extractValueByType(text, dataType);
            
            if (extractedValue !== null) {
              results[dataType] = {
                value: extractedValue,
                text: text,
                label: labelText,
                confidence: 75,
                method: 'context-expansion'
              };
              break;
            }
          }
        } catch (e) {
          // Search failed, try next
        }
      }
    });
    
    return results;
  }

  /**
   * Fuzzy matching strategy - Flexible pattern matching
   */
  async fuzzyMatchingStrategy($) {
    const results = {};
    
    // Fuzzy patterns for different data types
    const fuzzyPatterns = {
      price: [
        /(?:^|\s)\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:$|\s)/,
        /(?:USD|usd)\s*(\d+(?:,\d{3})*)/i,
        /(\d{4,})\s*(?:dollars?|bucks?)/i
      ],
      revenue: [
        /(\d+k?)\s*(?:\/\s*)?(?:month|mo\b)/i,
        /monthly.*?(\d+(?:,\d{3})*)/i,
        /revenue.*?(\d+(?:,\d{3})*)/i
      ],
      multiple: [
        /(\d+(?:\.\d+)?)\s*[xX×]/,
        /multiple.*?(\d+(?:\.\d+)?)/i
      ]
    };
    
    const pageText = $('body').text();
    
    for (const [dataType, patterns] of Object.entries(fuzzyPatterns)) {
      if (results[dataType]) continue;
      
      for (const pattern of patterns) {
        const matches = pageText.match(pattern);
        if (matches && matches[1]) {
          const value = this.parseFlexibleValue(matches[1], dataType);
          
          if (value !== null) {
            results[dataType] = {
              value: value,
              text: matches[0].trim(),
              confidence: 65,
              method: 'fuzzy-matching'
            };
            break;
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Price-specific scanning
   */
  async priceSpecificScan($) {
    const results = {};
    const priceElements = [];
    
    // Find all elements containing currency symbols or patterns
    $('*:contains("$"), *:contains("USD"), *:contains("price")', 'body').each((i, elem) => {
      const $elem = $(elem);
      if ($elem.children().length > 3) return;
      
      const text = $elem.text().trim();
      const priceMatch = text.match(/\$?\s*([\d,]+(?:\.\d{2})?)/);
      
      if (priceMatch) {
        const value = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (value > 100 && value < 10000000) {
          priceElements.push({
            element: elem,
            value: value,
            text: text,
            size: parseInt($elem.css('font-size')) || 16,
            weight: $elem.css('font-weight'),
            color: $elem.css('color')
          });
        }
      }
    });
    
    // Sort by visual prominence
    priceElements.sort((a, b) => {
      // Larger font size = higher priority
      if (a.size !== b.size) return b.size - a.size;
      // Bold = higher priority
      if (a.weight === 'bold' && b.weight !== 'bold') return -1;
      if (b.weight === 'bold' && a.weight !== 'bold') return 1;
      return 0;
    });
    
    if (priceElements.length > 0) {
      results.price = {
        value: priceElements[0].value,
        text: priceElements[0].text,
        confidence: 85,
        method: 'price-specific-scan'
      };
    }
    
    return results;
  }

  /**
   * Heading detection strategy
   */
  async headingDetectionStrategy($) {
    const results = {};
    const headingCandidates = [];
    
    // Check heading tags
    $('h1, h2, h3, h4, title, [class*="title"], [class*="heading"]').each((i, elem) => {
      const text = $(elem).text().trim();
      
      if (text.length >= 10 && text.length <= 150) {
        headingCandidates.push({
          text: text,
          tag: elem.tagName.toLowerCase(),
          size: parseInt($(elem).css('font-size')) || 16,
          weight: $(elem).css('font-weight')
        });
      }
    });
    
    // Sort by heading hierarchy
    headingCandidates.sort((a, b) => {
      const tagOrder = { h1: 1, h2: 2, h3: 3, h4: 4, title: 0 };
      const aOrder = tagOrder[a.tag] ?? 10;
      const bOrder = tagOrder[b.tag] ?? 10;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.size - a.size;
    });
    
    if (headingCandidates.length > 0) {
      results.title = {
        value: headingCandidates[0].text,
        text: headingCandidates[0].text,
        confidence: 80,
        method: 'heading-detection'
      };
    }
    
    return results;
  }

  /**
   * Selector refinement strategy
   */
  async selectorRefinementStrategy($) {
    const results = {};
    
    // Try refined selectors based on common patterns
    const refinements = [
      { selector: '[itemprop="price"]', type: 'price' },
      { selector: '[property*="price"]', type: 'price' },
      { selector: '.listing-price:visible', type: 'price' },
      { selector: '[data-test*="price"]', type: 'price' },
      { selector: '[itemprop="name"]', type: 'title' },
      { selector: 'meta[property="og:title"]', type: 'title', attr: 'content' },
      { selector: '[data-revenue]', type: 'revenue', attr: 'data-revenue' },
      { selector: '.metric:contains("Revenue")', type: 'revenue' }
    ];
    
    for (const ref of refinements) {
      if (results[ref.type]) continue;
      
      try {
        const $elem = $(ref.selector);
        if ($elem.length > 0) {
          const value = ref.attr ? $elem.attr(ref.attr) : $elem.text().trim();
          const extracted = this.extractValueByType(value, ref.type);
          
          if (extracted !== null) {
            results[ref.type] = {
              value: extracted,
              text: value,
              selector: ref.selector,
              confidence: 85,
              method: 'selector-refinement'
            };
          }
        }
      } catch (e) {
        // Invalid selector
      }
    }
    
    return results;
  }

  /**
   * Helper methods
   */
  analyzeMissingData(targetData, currentResults) {
    const missing = [];
    
    for (const dataType of Object.keys(targetData)) {
      if (!currentResults[dataType]) {
        missing.push(dataType);
      }
    }
    
    return missing;
  }

  getCurrentPerformance() {
    const recent = this.performanceWindow.slice(-50);
    
    return {
      successRate: recent.filter(r => r.success).length / recent.length,
      averageTime: recent.reduce((sum, r) => sum + r.duration, 0) / recent.length,
      recentFailures: recent.filter(r => !r.success).length
    };
  }

  scoreElement($elem, text) {
    const score = {
      price: 0,
      title: 0,
      revenue: 0,
      multiple: 0,
      total: 0,
      likelyType: null
    };
    
    // Price indicators
    if (/\$[\d,]+/.test(text)) score.price += 0.4;
    if ($elem.attr('class')?.includes('price')) score.price += 0.3;
    if (parseInt($elem.css('font-size')) > 20) score.price += 0.2;
    
    // Title indicators
    if (text.length >= 10 && text.length <= 100) score.title += 0.2;
    if (/^[A-Z]/.test(text)) score.title += 0.2;
    if ($elem.is('h1, h2, h3')) score.title += 0.4;
    
    // Revenue indicators
    if (/revenue|income|earnings/i.test(text)) score.revenue += 0.3;
    if (/month|\/mo/i.test(text) && /\d/.test(text)) score.revenue += 0.4;
    
    // Multiple indicators
    if (/\d+(\.\d+)?x/i.test(text)) score.multiple += 0.5;
    if (/multiple|valuation/i.test(text)) score.multiple += 0.3;
    
    // Find highest score
    let maxScore = 0;
    for (const [type, typeScore] of Object.entries(score)) {
      if (type !== 'total' && type !== 'likelyType' && typeScore > maxScore) {
        maxScore = typeScore;
        score.likelyType = type;
      }
    }
    
    score.total = maxScore;
    return score;
  }

  detectDataType(text) {
    if (/\$[\d,]+/.test(text) && text.length < 20) return 'price';
    if (/\d+(\.\d+)?x/i.test(text)) return 'multiple';
    if (/revenue|month/i.test(text) && /\d/.test(text)) return 'revenue';
    if (text.length >= 10 && text.length <= 100 && /^[A-Z]/.test(text)) return 'title';
    return null;
  }

  inferDataTypeFromLabel(labelText) {
    const mappings = {
      price: ['price', 'asking', 'cost', 'value', 'amount'],
      revenue: ['revenue', 'income', 'earnings', 'sales'],
      profit: ['profit', 'net', 'margin'],
      multiple: ['multiple', 'valuation', 'times'],
      title: ['name', 'title', 'business', 'company']
    };
    
    for (const [dataType, keywords] of Object.entries(mappings)) {
      if (keywords.some(kw => labelText.includes(kw))) {
        return dataType;
      }
    }
    
    return null;
  }

  extractValueByType(text, dataType) {
    switch (dataType) {
      case 'price':
      case 'revenue':
      case 'profit':
        const match = text.match(/\$?\s*([\d,]+(?:\.\d{2})?)/);
        return match ? parseFloat(match[1].replace(/,/g, '')) : null;
        
      case 'multiple':
        const multipleMatch = text.match(/([\d.]+)\s*[xX×]?/);
        return multipleMatch ? parseFloat(multipleMatch[1]) : null;
        
      case 'title':
        return text.trim();
        
      default:
        return text.trim();
    }
  }

  parseFlexibleValue(value, dataType) {
    // Handle 'k' notation (e.g., "50k" = 50000)
    if (value.toLowerCase().endsWith('k')) {
      return parseFloat(value.slice(0, -1)) * 1000;
    }
    
    // Handle 'M' notation (e.g., "1.5M" = 1500000)
    if (value.toLowerCase().endsWith('m')) {
      return parseFloat(value.slice(0, -1)) * 1000000;
    }
    
    // Standard number parsing
    return parseFloat(value.replace(/,/g, ''));
  }

  trackStrategyPerformance(strategyType, success, duration) {
    if (!this.strategyStats.has(strategyType)) {
      this.strategyStats.set(strategyType, {
        attempts: 0,
        successes: 0,
        totalDuration: 0,
        lastUsed: null
      });
    }
    
    const stats = this.strategyStats.get(strategyType);
    stats.attempts++;
    if (success) stats.successes++;
    stats.totalDuration += duration;
    stats.lastUsed = new Date().toISOString();
    
    // Add to performance window
    this.performanceWindow.push({
      strategy: strategyType,
      success: success,
      duration: duration,
      timestamp: new Date().toISOString()
    });
    
    // Keep window size limited
    if (this.performanceWindow.length > this.options.learningWindow) {
      this.performanceWindow = this.performanceWindow.slice(-this.options.learningWindow);
    }
  }

  recordAdaptation(adaptation) {
    this.state.adaptationHistory.push(adaptation);
    
    // Keep history limited
    if (this.state.adaptationHistory.length > 100) {
      this.state.adaptationHistory = this.state.adaptationHistory.slice(-100);
    }
    
    // Emit event for monitoring
    this.emit('adaptation', adaptation);
  }

  /**
   * Start optimization cycle
   */
  startOptimizationCycle() {
    setInterval(() => {
      this.optimizeStrategies();
    }, this.options.optimizationInterval);
  }

  /**
   * Optimize strategy order based on performance
   */
  optimizeStrategies() {
    console.log('⚡ Optimizing adaptation strategies...');
    
    const strategyPerformance = [];
    
    for (const [strategy, stats] of this.strategyStats.entries()) {
      if (stats.attempts > 0) {
        strategyPerformance.push({
          strategy: strategy,
          successRate: stats.successes / stats.attempts,
          averageTime: stats.totalDuration / stats.attempts,
          score: (stats.successes / stats.attempts) * (1000 / (stats.totalDuration / stats.attempts))
        });
      }
    }
    
    // Sort by performance score
    strategyPerformance.sort((a, b) => b.score - a.score);
    
    // Update strategy priorities
    this.state.currentStrategies.clear();
    strategyPerformance.forEach((perf, index) => {
      this.state.currentStrategies.set(perf.strategy, {
        priority: index,
        performance: perf
      });
    });
    
    console.log('✅ Strategy optimization complete');
  }

  /**
   * Get adaptation insights
   */
  getAdaptationInsights() {
    const insights = {
      totalAdaptations: this.state.adaptationHistory.length,
      successfulAdaptations: this.state.adaptationHistory.filter(a => a.success).length,
      strategyPerformance: {},
      recentAdaptations: this.state.adaptationHistory.slice(-10),
      recommendations: []
    };
    
    // Calculate strategy performance
    for (const [strategy, stats] of this.strategyStats.entries()) {
      if (stats.attempts > 0) {
        insights.strategyPerformance[strategy] = {
          attempts: stats.attempts,
          successRate: ((stats.successes / stats.attempts) * 100).toFixed(1) + '%',
          averageTime: Math.round(stats.totalDuration / stats.attempts) + 'ms',
          lastUsed: stats.lastUsed
        };
      }
    }
    
    // Generate recommendations
    for (const [strategy, perf] of Object.entries(insights.strategyPerformance)) {
      if (parseFloat(perf.successRate) < 30) {
        insights.recommendations.push({
          type: 'low-performing-strategy',
          strategy: strategy,
          message: `Strategy "${strategy}" has low success rate (${perf.successRate})`
        });
      }
    }
    
    return insights;
  }
}

module.exports = AdaptationEngine;