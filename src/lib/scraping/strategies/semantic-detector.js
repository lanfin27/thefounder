// Intelligent content-based element detection using semantic analysis
const cheerio = require('cheerio');

class SemanticDetector {
  constructor() {
    // Price patterns for different formats and currencies
    this.pricePatterns = [
      /\$[\d,]+\.?\d*/g,                    // $1,000,000 or $1000
      /USD\s*[\d,]+\.?\d*/gi,               // USD 1000000
      /[\d,]+\.?\d*\s*USD/gi,               // 1000000 USD
      /asking\s*price[:\s]+\$?[\d,]+/gi,   // Asking Price: $1000000
      /price[:\s]+\$?[\d,]+/gi,             // Price: 1000000
    ];

    // Revenue and profit patterns
    this.revenuePatterns = [
      /revenue[:\s]+\$?[\d,]+/gi,           // Revenue: $10,000
      /monthly\s*revenue[:\s]+\$?[\d,]+/gi, // Monthly Revenue: 10000
      /\$[\d,]+\/mo/gi,                     // $10,000/mo
      /\$[\d,]+\s*per\s*month/gi,           // $10,000 per month
    ];

    this.profitPatterns = [
      /profit[:\s]+\$?[\d,]+/gi,            // Profit: $7,000
      /monthly\s*profit[:\s]+\$?[\d,]+/gi,  // Monthly Profit: 7000
      /net\s*income[:\s]+\$?[\d,]+/gi,     // Net Income: 7000
    ];

    // Multiple patterns
    this.multiplePatterns = [
      /[\d.]+x\s*(?:revenue|profit)/gi,     // 3.2x revenue
      /multiple[:\s]+[\d.]+x?/gi,           // Multiple: 3.2x
      /[\d.]+\s*times\s*(?:revenue|profit)/gi, // 3.2 times revenue
    ];

    // Business title patterns
    this.titlePatterns = {
      minLength: 10,
      maxLength: 150,
      keywords: ['business', 'app', 'saas', 'site', 'marketplace', 'platform', 'service'],
      excludeWords: ['price', 'revenue', 'profit', 'sale', 'buy now']
    };
  }

  /**
   * Detect price elements by analyzing content patterns
   */
  async detectPriceElements($, parentSelector = '') {
    const priceElements = [];
    const searchScope = parentSelector ? $(parentSelector) : $.root();

    // Search all text nodes for price patterns
    searchScope.find('*').each((i, elem) => {
      const text = $(elem).text().trim();
      const html = $(elem).html();
      
      // Skip if element has child elements (to avoid duplicates)
      if ($(elem).children().length > 0 && !$(elem).hasClass('price')) return;

      for (const pattern of this.pricePatterns) {
        const matches = text.match(pattern);
        if (matches) {
          const priceValue = this.extractNumericValue(matches[0]);
          
          if (priceValue > 1000) { // Likely asking price if > $1000
            priceElements.push({
              element: elem,
              selector: this.generateSelector($, elem),
              value: priceValue,
              text: text,
              confidence: this.calculatePriceConfidence(elem, $, priceValue),
              method: 'semantic-pattern'
            });
          }
        }
      }
    });

    // Sort by confidence and return top candidates
    return priceElements.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect title elements using content analysis
   */
  async detectTitleElements($, parentSelector = '') {
    const titleElements = [];
    const searchScope = parentSelector ? $(parentSelector) : $.root();

    searchScope.find('*').each((i, elem) => {
      const text = $(elem).text().trim();
      
      // Skip if has many children (likely container)
      if ($(elem).children().length > 2) return;

      if (this.looksLikeTitle(text, elem, $)) {
        titleElements.push({
          element: elem,
          selector: this.generateSelector($, elem),
          text: text,
          confidence: this.calculateTitleConfidence(elem, $, text),
          method: 'semantic-title'
        });
      }
    });

    return titleElements.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect metric elements (revenue, profit, multiples)
   */
  async detectMetricElements($, parentSelector = '') {
    const metrics = {
      revenue: [],
      profit: [],
      multiples: []
    };
    const searchScope = parentSelector ? $(parentSelector) : $.root();

    searchScope.find('*').each((i, elem) => {
      const text = $(elem).text().trim();
      
      // Skip containers
      if ($(elem).children().length > 2) return;

      // Check for revenue
      for (const pattern of this.revenuePatterns) {
        if (pattern.test(text)) {
          metrics.revenue.push({
            element: elem,
            selector: this.generateSelector($, elem),
            value: this.extractNumericValue(text),
            text: text,
            confidence: this.calculateMetricConfidence(elem, $, 'revenue'),
            method: 'semantic-revenue'
          });
        }
      }

      // Check for profit
      for (const pattern of this.profitPatterns) {
        if (pattern.test(text)) {
          metrics.profit.push({
            element: elem,
            selector: this.generateSelector($, elem),
            value: this.extractNumericValue(text),
            text: text,
            confidence: this.calculateMetricConfidence(elem, $, 'profit'),
            method: 'semantic-profit'
          });
        }
      }

      // Check for multiples
      for (const pattern of this.multiplePatterns) {
        if (pattern.test(text)) {
          metrics.multiples.push({
            element: elem,
            selector: this.generateSelector($, elem),
            value: this.extractMultipleValue(text),
            text: text,
            confidence: this.calculateMetricConfidence(elem, $, 'multiple'),
            method: 'semantic-multiple'
          });
        }
      }
    });

    // Sort each metric type by confidence
    Object.keys(metrics).forEach(key => {
      metrics[key].sort((a, b) => b.confidence - a.confidence);
    });

    return metrics;
  }

  /**
   * Helper: Check if text looks like a business title
   */
  looksLikeTitle(text, elem, $) {
    // Length check
    if (text.length < this.titlePatterns.minLength || 
        text.length > this.titlePatterns.maxLength) {
      return false;
    }

    // Exclude if contains price/metric words
    const lowerText = text.toLowerCase();
    for (const exclude of this.titlePatterns.excludeWords) {
      if (lowerText.includes(exclude)) return false;
    }

    // Check for business keywords (bonus points)
    let hasBusinessKeyword = false;
    for (const keyword of this.titlePatterns.keywords) {
      if (lowerText.includes(keyword)) {
        hasBusinessKeyword = true;
        break;
      }
    }

    // Check if it's in a heading tag or has large font
    const tagName = elem.tagName?.toLowerCase();
    const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
    const hasLargeFont = $(elem).css('font-size')?.includes('large') || 
                        parseInt($(elem).css('font-size')) > 16;

    // Must have proper capitalization or be a heading
    const hasProperCaps = /^[A-Z]/.test(text) || isHeading;

    return hasProperCaps && (hasBusinessKeyword || isHeading || hasLargeFont);
  }

  /**
   * Calculate confidence score for price detection
   */
  calculatePriceConfidence(elem, $, value) {
    let confidence = 50; // Base confidence

    // Boost if element has price-related class/id
    const classAttr = $(elem).attr('class') || '';
    const idAttr = $(elem).attr('id') || '';
    if (/price|cost|amount|value/i.test(classAttr + idAttr)) {
      confidence += 30;
    }

    // Boost if near "asking price" text
    const surroundingText = $(elem).parent().text().toLowerCase();
    if (surroundingText.includes('asking') || surroundingText.includes('price')) {
      confidence += 20;
    }

    // Boost for reasonable price range
    if (value >= 10000 && value <= 100000000) {
      confidence += 10;
    }

    // Boost if formatted with commas
    if ($(elem).text().includes(',')) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Calculate confidence score for title detection
   */
  calculateTitleConfidence(elem, $, text) {
    let confidence = 40;

    // Boost for heading tags
    const tagName = elem.tagName?.toLowerCase();
    if (['h1', 'h2', 'h3'].includes(tagName)) {
      confidence += 30;
    }

    // Boost for title-like classes
    const classAttr = $(elem).attr('class') || '';
    if (/title|name|heading|business/i.test(classAttr)) {
      confidence += 25;
    }

    // Boost if it's a link
    if (tagName === 'a' || $(elem).find('a').length > 0) {
      confidence += 15;
    }

    // Boost for business keywords
    const lowerText = text.toLowerCase();
    for (const keyword of this.titlePatterns.keywords) {
      if (lowerText.includes(keyword)) {
        confidence += 10;
        break;
      }
    }

    return Math.min(confidence, 100);
  }

  /**
   * Calculate confidence score for metric detection
   */
  calculateMetricConfidence(elem, $, metricType) {
    let confidence = 60;

    // Boost for metric-related classes
    const classAttr = $(elem).attr('class') || '';
    if (new RegExp(metricType, 'i').test(classAttr)) {
      confidence += 25;
    }

    // Boost if in a data table or list
    const parent = $(elem).parent();
    if (parent.is('td') || parent.is('li') || parent.is('dd')) {
      confidence += 15;
    }

    // Boost if near related labels
    const prevText = $(elem).prev().text().toLowerCase();
    const parentText = parent.text().toLowerCase();
    if (prevText.includes(metricType) || parentText.includes(metricType)) {
      confidence += 20;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Extract numeric value from text
   */
  extractNumericValue(text) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Extract multiple value (e.g., "3.2x" -> 3.2)
   */
  extractMultipleValue(text) {
    const match = text.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Generate a reliable selector for an element
   */
  generateSelector($, elem) {
    const tag = elem.tagName?.toLowerCase();
    const id = $(elem).attr('id');
    const classes = $(elem).attr('class');
    
    // Prefer ID if available
    if (id) {
      return `#${id}`;
    }
    
    // Use specific classes
    if (classes) {
      const classList = classes.split(' ')
        .filter(c => c && !c.includes('active') && !c.includes('hover'))
        .slice(0, 2);
      if (classList.length > 0) {
        return `${tag}.${classList.join('.')}`;
      }
    }
    
    // Fall back to tag + position
    const parent = $(elem).parent();
    const index = parent.children(tag).index(elem);
    return `${parent.prop('tagName')?.toLowerCase()} > ${tag}:nth-child(${index + 1})`;
  }

  /**
   * Validate detected elements contain expected data
   */
  validateDetection(detectedElements, expectedType) {
    if (!detectedElements || detectedElements.length === 0) {
      return false;
    }

    switch (expectedType) {
      case 'price':
        // Price should be a reasonable number
        const price = detectedElements[0].value;
        return price > 1000 && price < 1000000000;
        
      case 'title':
        // Title should be reasonable length
        const title = detectedElements[0].text;
        return title.length >= 10 && title.length <= 150;
        
      case 'revenue':
      case 'profit':
        // Revenue/profit should be positive
        const value = detectedElements[0].value;
        return value > 0 && value < 100000000;
        
      case 'multiple':
        // Multiple should be reasonable
        const multiple = detectedElements[0].value;
        return multiple > 0.1 && multiple < 100;
        
      default:
        return true;
    }
  }
}

module.exports = SemanticDetector;