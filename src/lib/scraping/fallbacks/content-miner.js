// Extract data from raw content when selectors fail
const cheerio = require('cheerio');

class ContentMiner {
  constructor() {
    // Comprehensive regex patterns for different data types
    this.patterns = {
      price: [
        /(?:asking\s*price|price)[:\s]*\$?([\d,]+(?:\.\d{2})?)\s*(?:USD)?/gi,
        /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:USD)?/g,
        /USD\s*([\d,]+(?:\.\d{2})?)/gi,
        /listed\s*(?:for|at)[:\s]*\$?([\d,]+)/gi,
        /sale\s*price[:\s]*\$?([\d,]+)/gi
      ],
      revenue: [
        /(?:monthly\s*)?revenue[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi,
        /\$\s*([\d,]+)\s*(?:\/\s*month|per\s*month|monthly)/gi,
        /(?:gross\s*)?revenue[:\s]*\$?([\d,]+)\s*(?:\/mo)?/gi,
        /making\s*\$?([\d,]+)\s*(?:per\s*month|\/month)/gi,
        /earnings[:\s]*\$?([\d,]+)\s*monthly/gi
      ],
      profit: [
        /(?:net\s*)?profit[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi,
        /(?:monthly\s*)?profit[:\s]*\$?([\d,]+)/gi,
        /net\s*income[:\s]*\$?([\d,]+)/gi,
        /\$\s*([\d,]+)\s*profit/gi,
        /margin[:\s]*\$?([\d,]+)/gi
      ],
      multiple: [
        /([\d.]+)\s*x\s*(?:revenue|profit|multiple)/gi,
        /multiple[:\s]*([\d.]+)x?/gi,
        /valued\s*at\s*([\d.]+)\s*times/gi,
        /([\d.]+)\s*times\s*(?:annual\s*)?(?:revenue|profit)/gi
      ],
      traffic: [
        /([\d,]+)\s*(?:monthly\s*)?visitors/gi,
        /([\d,]+)\s*page\s*views/gi,
        /traffic[:\s]*([\d,]+)/gi,
        /([\d,]+)\s*unique\s*visitors/gi
      ],
      age: [
        /established\s*(?:in\s*)?(\d{4})/gi,
        /(\d+)\s*years?\s*old/gi,
        /founded\s*(?:in\s*)?(\d{4})/gi,
        /since\s*(\d{4})/gi,
        /(\d+)\s*months?\s*old/gi
      ]
    };

    // Context keywords that help identify data
    this.contextKeywords = {
      price: ['asking', 'price', 'cost', 'value', 'sale', 'listed'],
      revenue: ['revenue', 'income', 'earnings', 'sales', 'monthly', 'gross'],
      profit: ['profit', 'net', 'margin', 'bottom line', 'earnings'],
      multiple: ['multiple', 'valuation', 'times', 'x'],
      traffic: ['visitors', 'traffic', 'users', 'pageviews', 'unique'],
      business: ['business', 'company', 'startup', 'site', 'platform', 'app']
    };
  }

  /**
   * Extract data from raw page text
   */
  async extractFromRawText(htmlContent, targetDataType = 'all') {
    const $ = cheerio.load(htmlContent);
    
    // Remove script and style content
    $('script, style, noscript').remove();
    
    // Get clean text content
    const fullText = $('body').text() || $.root().text();
    const cleanText = this.cleanText(fullText);
    
    // Extract based on target type
    if (targetDataType === 'all') {
      return this.extractAllDataTypes(cleanText);
    } else {
      return this.extractSpecificType(cleanText, targetDataType);
    }
  }

  /**
   * Extract specific data type from text
   */
  extractSpecificType(text, dataType) {
    const results = [];
    const patterns = this.patterns[dataType] || [];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        const value = this.parseValue(match[1], dataType);
        if (value !== null && this.isValidValue(value, dataType)) {
          // Get context around the match
          const startIndex = Math.max(0, match.index - 50);
          const endIndex = Math.min(text.length, match.index + match[0].length + 50);
          const context = text.substring(startIndex, endIndex);
          
          results.push({
            value: value,
            text: match[0],
            context: context,
            confidence: this.calculateMiningConfidence(match[0], context, dataType),
            method: 'content-mining-regex',
            pattern: pattern.source
          });
        }
      }
    }
    
    // Remove duplicates and sort by confidence
    const unique = this.removeDuplicateResults(results);
    unique.sort((a, b) => b.confidence - a.confidence);
    
    return unique[0] || null;
  }

  /**
   * Extract all data types
   */
  extractAllDataTypes(text) {
    const data = {};
    
    for (const dataType of Object.keys(this.patterns)) {
      const result = this.extractSpecificType(text, dataType);
      if (result) {
        data[dataType] = result;
      }
    }
    
    // Also try to extract business title
    const title = this.extractBusinessTitle(text);
    if (title) {
      data.title = title;
    }
    
    return data;
  }

  /**
   * Analyze script tags for embedded data
   */
  async analyzeScriptTags($) {
    const data = {};
    
    $('script').each((i, script) => {
      const content = $(script).html();
      if (!content) return;
      
      // Look for JSON-LD structured data
      if ($(script).attr('type') === 'application/ld+json') {
        try {
          const jsonData = JSON.parse(content);
          const extracted = this.extractFromStructuredData(jsonData);
          Object.assign(data, extracted);
        } catch (e) {
          // Invalid JSON, skip
        }
      }
      
      // Look for JavaScript variables containing data
      const jsData = this.extractFromJavaScript(content);
      Object.assign(data, jsData);
    });
    
    return data;
  }

  /**
   * Mine data from element attributes
   */
  async mineDataAttributes($) {
    const data = {};
    const dataElements = $('[data-price], [data-revenue], [data-profit], [data-listing]');
    
    dataElements.each((i, elem) => {
      const $elem = $(elem);
      
      // Check various data attributes
      const attributes = {
        price: $elem.attr('data-price') || $elem.attr('data-asking-price'),
        revenue: $elem.attr('data-revenue') || $elem.attr('data-monthly-revenue'),
        profit: $elem.attr('data-profit') || $elem.attr('data-net-profit'),
        listingId: $elem.attr('data-listing') || $elem.attr('data-listing-id'),
        multiple: $elem.attr('data-multiple') || $elem.attr('data-valuation')
      };
      
      for (const [key, value] of Object.entries(attributes)) {
        if (value) {
          const parsed = this.parseValue(value, key);
          if (parsed !== null) {
            data[key] = {
              value: parsed,
              text: value,
              selector: this.generateAttributeSelector($elem, key),
              confidence: 90, // High confidence for data attributes
              method: 'data-attribute-mining'
            };
          }
        }
      }
    });
    
    // Also check meta tags
    const metaData = this.extractFromMetaTags($);
    Object.assign(data, metaData);
    
    return data;
  }

  /**
   * Extract from structured data (JSON-LD)
   */
  extractFromStructuredData(jsonData) {
    const data = {};
    
    // Handle different schema types
    if (jsonData['@type'] === 'Product' || jsonData['@type'] === 'Offer') {
      if (jsonData.price || jsonData.offers?.price) {
        data.price = {
          value: parseFloat(jsonData.price || jsonData.offers.price),
          text: String(jsonData.price || jsonData.offers.price),
          confidence: 95,
          method: 'structured-data-jsonld'
        };
      }
      
      if (jsonData.name) {
        data.title = {
          value: jsonData.name,
          text: jsonData.name,
          confidence: 95,
          method: 'structured-data-jsonld'
        };
      }
    }
    
    // Look for custom properties
    for (const [key, value] of Object.entries(jsonData)) {
      if (key.toLowerCase().includes('revenue') && typeof value === 'number') {
        data.revenue = {
          value: value,
          text: String(value),
          confidence: 90,
          method: 'structured-data-jsonld'
        };
      }
      if (key.toLowerCase().includes('profit') && typeof value === 'number') {
        data.profit = {
          value: value,
          text: String(value),
          confidence: 90,
          method: 'structured-data-jsonld'
        };
      }
    }
    
    return data;
  }

  /**
   * Extract from JavaScript variables
   */
  extractFromJavaScript(scriptContent) {
    const data = {};
    
    // Common patterns for JS variables containing data
    const patterns = [
      /(?:var|let|const)\s+listing\s*=\s*({[^}]+})/,
      /(?:var|let|const)\s+data\s*=\s*({[^}]+})/,
      /window\.listing\s*=\s*({[^}]+})/,
      /price['"]\s*:\s*["']?\$?([\d,]+)/,
      /revenue['"]\s*:\s*["']?\$?([\d,]+)/,
      /askingPrice['"]\s*:\s*([\d,]+)/
    ];
    
    for (const pattern of patterns) {
      const match = scriptContent.match(pattern);
      if (match) {
        try {
          // Try to parse as JSON
          if (match[1].startsWith('{')) {
            const jsonStr = match[1].replace(/'/g, '"');
            const obj = JSON.parse(jsonStr);
            const extracted = this.extractFromObject(obj);
            Object.assign(data, extracted);
          } else {
            // Direct value extraction
            const value = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(value)) {
              const dataType = pattern.source.includes('price') ? 'price' : 
                              pattern.source.includes('revenue') ? 'revenue' : 'value';
              data[dataType] = {
                value: value,
                text: match[0],
                confidence: 75,
                method: 'javascript-variable'
              };
            }
          }
        } catch (e) {
          // Parsing failed, continue
        }
      }
    }
    
    // Look for API endpoints
    const apiData = this.extractAPIEndpoints(scriptContent);
    if (apiData.length > 0) {
      data.apiEndpoints = apiData;
    }
    
    return data;
  }

  /**
   * Extract from meta tags
   */
  extractFromMetaTags($) {
    const data = {};
    
    // OpenGraph tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) {
      data.title = {
        value: ogTitle,
        text: ogTitle,
        confidence: 85,
        method: 'meta-tag-og'
      };
    }
    
    const ogPrice = $('meta[property="product:price:amount"]').attr('content');
    if (ogPrice) {
      data.price = {
        value: parseFloat(ogPrice),
        text: ogPrice,
        confidence: 90,
        method: 'meta-tag-product'
      };
    }
    
    // Custom meta tags
    $('meta[name*="price"], meta[name*="revenue"], meta[name*="listing"]').each((i, meta) => {
      const name = $(meta).attr('name');
      const content = $(meta).attr('content');
      
      if (content) {
        const dataType = this.detectDataTypeFromString(name);
        if (dataType) {
          const value = this.parseValue(content, dataType);
          if (value !== null) {
            data[dataType] = {
              value: value,
              text: content,
              confidence: 80,
              method: 'meta-tag-custom'
            };
          }
        }
      }
    });
    
    return data;
  }

  /**
   * Extract business title from text
   */
  extractBusinessTitle(text) {
    // Look for patterns that indicate business titles
    const patterns = [
      /^([A-Z][A-Za-z0-9\s&.-]{5,50})(?:\s*[-–—]\s*)/m,
      /(?:business|company|startup|app|platform|site):\s*([A-Za-z0-9\s&.-]+)/i,
      /([A-Z][A-Za-z0-9\s&.-]{5,50})\s*(?:for sale|is listed)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const title = match[1].trim();
        if (title.length >= 5 && title.length <= 100) {
          return {
            value: title,
            text: title,
            confidence: 70,
            method: 'content-mining-title'
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract API endpoints from JavaScript
   */
  extractAPIEndpoints(scriptContent) {
    const endpoints = [];
    const patterns = [
      /(?:fetch|axios|ajax)\s*\(\s*["'](\/api\/[^"']+)["']/g,
      /url\s*:\s*["'](\/api\/[^"']+)["']/g,
      /endpoint\s*:\s*["'](\/[^"']+)["']/g
    ];
    
    for (const pattern of patterns) {
      const matches = [...scriptContent.matchAll(pattern)];
      for (const match of matches) {
        endpoints.push({
          url: match[1],
          confidence: 60,
          method: 'javascript-api-discovery'
        });
      }
    }
    
    return [...new Set(endpoints.map(e => e.url))].map(url => 
      endpoints.find(e => e.url === url)
    );
  }

  /**
   * Helper methods
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  parseValue(text, dataType) {
    if (!text) return null;
    
    // Remove common symbols and parse
    const cleaned = text.toString().replace(/[$,]/g, '');
    const value = parseFloat(cleaned);
    
    if (isNaN(value)) return null;
    
    // Additional validation based on type
    switch (dataType) {
      case 'age':
        // If it's a year, convert to age
        if (value > 1900 && value < new Date().getFullYear()) {
          return new Date().getFullYear() - value;
        }
        return value;
        
      case 'multiple':
        // Multiples should be reasonable
        return value > 0 && value < 100 ? value : null;
        
      default:
        return value;
    }
  }

  isValidValue(value, dataType) {
    switch (dataType) {
      case 'price':
        return value > 100 && value < 1000000000;
      case 'revenue':
      case 'profit':
        return value >= 0 && value < 100000000;
      case 'multiple':
        return value > 0 && value < 100;
      case 'traffic':
        return value > 0 && value < 1000000000;
      case 'age':
        return value >= 0 && value < 100;
      default:
        return true;
    }
  }

  calculateMiningConfidence(matchText, context, dataType) {
    let confidence = 50; // Base confidence for content mining
    
    // Check if context contains relevant keywords
    const keywords = this.contextKeywords[dataType] || [];
    for (const keyword of keywords) {
      if (context.toLowerCase().includes(keyword)) {
        confidence += 10;
      }
    }
    
    // Higher confidence for complete phrases
    if (matchText.includes(dataType)) {
      confidence += 15;
    }
    
    // Check proximity to labels
    const labelPattern = new RegExp(`${dataType}[:\\s]`, 'i');
    if (labelPattern.test(context)) {
      confidence += 20;
    }
    
    return Math.min(confidence, 85); // Cap at 85 for mined data
  }

  removeDuplicateResults(results) {
    const seen = new Map();
    
    return results.filter(result => {
      const key = `${result.value}-${result.method}`;
      if (seen.has(key)) {
        // Keep the one with higher confidence
        const existing = seen.get(key);
        if (result.confidence > existing.confidence) {
          seen.set(key, result);
          return true;
        }
        return false;
      }
      seen.set(key, result);
      return true;
    });
  }

  extractFromObject(obj) {
    const data = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const dataType = this.detectDataTypeFromString(key);
      if (dataType && value) {
        const parsed = this.parseValue(value, dataType);
        if (parsed !== null) {
          data[dataType] = {
            value: parsed,
            text: String(value),
            confidence: 80,
            method: 'javascript-object'
          };
        }
      }
    }
    
    return data;
  }

  detectDataTypeFromString(str) {
    const lower = str.toLowerCase();
    
    if (lower.includes('price') || lower.includes('asking')) return 'price';
    if (lower.includes('revenue')) return 'revenue';
    if (lower.includes('profit')) return 'profit';
    if (lower.includes('multiple') || lower.includes('valuation')) return 'multiple';
    if (lower.includes('traffic') || lower.includes('visitor')) return 'traffic';
    if (lower.includes('title') || lower.includes('name')) return 'title';
    
    return null;
  }

  generateAttributeSelector($elem, attrType) {
    const tag = $elem.prop('tagName')?.toLowerCase();
    const attrName = $elem.attr(`data-${attrType}`) ? `data-${attrType}` : 
                     Object.keys($elem.attr() || {}).find(a => a.includes(attrType));
    
    if (attrName) {
      return `${tag}[${attrName}]`;
    }
    
    return tag;
  }

  /**
   * Deep content analysis for hidden data
   */
  async deepContentAnalysis(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const hidden = {};
    
    // Check hidden inputs
    $('input[type="hidden"]').each((i, input) => {
      const name = $(input).attr('name');
      const value = $(input).attr('value');
      
      if (name && value) {
        const dataType = this.detectDataTypeFromString(name);
        if (dataType) {
          const parsed = this.parseValue(value, dataType);
          if (parsed !== null) {
            hidden[dataType] = {
              value: parsed,
              text: value,
              confidence: 70,
              method: 'hidden-input'
            };
          }
        }
      }
    });
    
    // Check data in comments
    const comments = this.extractFromComments(htmlContent);
    Object.assign(hidden, comments);
    
    // Check inline styles for data
    const styleData = this.extractFromStyles($);
    Object.assign(hidden, styleData);
    
    return hidden;
  }

  extractFromComments(html) {
    const data = {};
    const commentPattern = /<!--\s*(.*?)\s*-->/gs;
    const matches = [...html.matchAll(commentPattern)];
    
    for (const match of matches) {
      const comment = match[1];
      // Check if comment contains data
      for (const [dataType, patterns] of Object.entries(this.patterns)) {
        for (const pattern of patterns) {
          const dataMatch = comment.match(pattern);
          if (dataMatch) {
            const value = this.parseValue(dataMatch[1], dataType);
            if (value !== null) {
              data[dataType] = {
                value: value,
                text: dataMatch[0],
                confidence: 60,
                method: 'html-comment'
              };
            }
          }
        }
      }
    }
    
    return data;
  }

  extractFromStyles($) {
    const data = {};
    
    // Sometimes data is hidden in CSS custom properties
    $('style').each((i, style) => {
      const content = $(style).html();
      if (!content) return;
      
      // Look for CSS variables with data
      const varPattern = /--([^:]+):\s*["']?\$?([\d,]+)/g;
      const matches = [...content.matchAll(varPattern)];
      
      for (const match of matches) {
        const varName = match[1];
        const dataType = this.detectDataTypeFromString(varName);
        
        if (dataType) {
          const value = this.parseValue(match[2], dataType);
          if (value !== null) {
            data[dataType] = {
              value: value,
              text: match[0],
              confidence: 55,
              method: 'css-variable'
            };
          }
        }
      }
    });
    
    return data;
  }
}

module.exports = ContentMiner;