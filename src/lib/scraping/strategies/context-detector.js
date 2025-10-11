// Context and relationship analysis for intelligent element detection
const cheerio = require('cheerio');

class ContextDetector {
  constructor() {
    // Label patterns that indicate nearby data
    this.labelPatterns = {
      price: [
        /asking\s*price/i,
        /price/i,
        /cost/i,
        /value/i,
        /amount/i,
        /sale\s*price/i
      ],
      revenue: [
        /revenue/i,
        /monthly\s*revenue/i,
        /gross\s*revenue/i,
        /sales/i,
        /income/i,
        /earnings/i
      ],
      profit: [
        /profit/i,
        /net\s*income/i,
        /net\s*profit/i,
        /monthly\s*profit/i,
        /ebitda/i,
        /margin/i
      ],
      multiple: [
        /multiple/i,
        /valuation/i,
        /x\s*revenue/i,
        /x\s*profit/i,
        /times/i
      ],
      traffic: [
        /visitors/i,
        /traffic/i,
        /page\s*views/i,
        /unique\s*visitors/i,
        /monthly\s*visitors/i
      ]
    };

    // Common data structures
    this.dataStructures = {
      table: ['table', 'tbody', 'thead', 'tr', 'td', 'th'],
      list: ['ul', 'ol', 'dl', 'li', 'dt', 'dd'],
      grid: ['grid', 'row', 'col', 'cell'],
      card: ['card', 'panel', 'box', 'container']
    };

    // Proximity thresholds (in DOM distance)
    this.proximityThresholds = {
      immediate: 1,    // Direct sibling or child
      close: 2,        // Within 2 DOM levels
      nearby: 3,       // Within 3 DOM levels
      related: 5       // Within 5 DOM levels
    };
  }

  /**
   * Find elements by their proximity to labels
   */
  async findByProximity($, targetType = 'all') {
    const results = {
      price: [],
      revenue: [],
      profit: [],
      multiple: [],
      traffic: []
    };

    // Search for label elements
    $('*').each((i, elem) => {
      const text = $(elem).text().trim().toLowerCase();
      if (!text || text.length > 50) return; // Skip long texts

      // Check each label pattern
      for (const [dataType, patterns] of Object.entries(this.labelPatterns)) {
        if (targetType !== 'all' && targetType !== dataType) continue;

        for (const pattern of patterns) {
          if (pattern.test(text)) {
            // Found a label, now look for nearby data
            const nearbyData = this.findNearbyData($, elem, dataType);
            if (nearbyData.length > 0) {
              results[dataType].push(...nearbyData);
            }
          }
        }
      }
    });

    // Remove duplicates and sort by confidence
    Object.keys(results).forEach(key => {
      const unique = this.removeDuplicates(results[key]);
      results[key] = unique.sort((a, b) => b.confidence - a.confidence);
    });

    return results;
  }

  /**
   * Find data elements near a label
   */
  findNearbyData($, labelElem, dataType) {
    const foundData = [];
    const labelText = $(labelElem).text().toLowerCase();

    // Strategy 1: Check immediate siblings
    const nextSibling = $(labelElem).next();
    if (nextSibling.length) {
      const siblingData = this.extractDataFromElement($, nextSibling[0], dataType);
      if (siblingData) {
        foundData.push({
          ...siblingData,
          proximity: 'immediate-sibling',
          confidence: 90,
          labelText: labelText,
          method: 'context-proximity-sibling'
        });
      }
    }

    // Strategy 2: Check within same parent
    const parent = $(labelElem).parent();
    parent.children().each((i, child) => {
      if (child === labelElem) return;
      const childData = this.extractDataFromElement($, child, dataType);
      if (childData) {
        foundData.push({
          ...childData,
          proximity: 'same-parent',
          confidence: 80,
          labelText: labelText,
          method: 'context-proximity-parent'
        });
      }
    });

    // Strategy 3: Check table structure (label in th, data in td)
    if ($(labelElem).is('th') || $(labelElem).parent().is('th')) {
      const cellIndex = $(labelElem).index();
      const row = $(labelElem).closest('tr');
      const dataRows = row.siblings('tr');
      
      dataRows.each((i, dataRow) => {
        const dataCell = $(dataRow).find('td').eq(cellIndex);
        if (dataCell.length) {
          const cellData = this.extractDataFromElement($, dataCell[0], dataType);
          if (cellData) {
            foundData.push({
              ...cellData,
              proximity: 'table-structure',
              confidence: 85,
              labelText: labelText,
              method: 'context-table-column'
            });
          }
        }
      });
    }

    // Strategy 4: Check definition list structure (dt/dd)
    if ($(labelElem).is('dt')) {
      const dd = $(labelElem).next('dd');
      if (dd.length) {
        const ddData = this.extractDataFromElement($, dd[0], dataType);
        if (ddData) {
          foundData.push({
            ...ddData,
            proximity: 'definition-list',
            confidence: 95,
            labelText: labelText,
            method: 'context-definition-list'
          });
        }
      }
    }

    // Strategy 5: Check nested structure (label contains data)
    const nestedData = this.findNestedData($, labelElem, dataType);
    if (nestedData) {
      foundData.push({
        ...nestedData,
        proximity: 'nested',
        confidence: 75,
        labelText: labelText,
        method: 'context-nested'
      });
    }

    return foundData;
  }

  /**
   * Analyze DOM hierarchy to find data patterns
   */
  async analyzeHierarchy($, containerSelector) {
    const container = containerSelector ? $(containerSelector) : $('body');
    const hierarchyPatterns = [];

    // Find repeating structures (likely listing containers)
    const potentialContainers = this.findRepeatingStructures($, container);
    
    for (const pattern of potentialContainers) {
      const analysis = {
        selector: pattern.selector,
        count: pattern.count,
        structure: this.analyzeStructure($, pattern.elements[0]),
        dataElements: this.extractDataFromStructure($, pattern.elements[0]),
        confidence: this.calculateStructureConfidence(pattern),
        method: 'context-hierarchy'
      };
      
      hierarchyPatterns.push(analysis);
    }

    return hierarchyPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect repeating patterns across the page
   */
  async detectRepeatingPatterns($, minRepetitions = 3) {
    const patterns = [];
    const analyzedSelectors = new Set();

    // Find elements that appear multiple times with similar structure
    $('*').each((i, elem) => {
      const classes = $(elem).attr('class');
      if (!classes || analyzedSelectors.has(classes)) return;
      
      analyzedSelectors.add(classes);
      const selector = '.' + classes.split(' ').filter(c => c).join('.');
      const similar = $(selector);
      
      if (similar.length >= minRepetitions) {
        const pattern = {
          selector: selector,
          count: similar.length,
          elements: similar.toArray(),
          structure: this.getElementStructure($, similar.first()),
          dataPoints: this.analyzePatternData($, similar),
          confidence: 0,
          method: 'context-repeating-pattern'
        };
        
        pattern.confidence = this.calculatePatternConfidence(pattern);
        patterns.push(pattern);
      }
    });

    // Also check for patterns by tag + position
    const tagPatterns = this.findTagPatterns($);
    patterns.push(...tagPatterns);

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find repeating structures in the DOM
   */
  findRepeatingStructures($, container) {
    const structures = new Map();
    
    container.find('*').each((i, elem) => {
      // Skip text nodes and elements with many children
      if ($(elem).children().length === 0 || $(elem).children().length > 20) return;
      
      const signature = this.getStructureSignature($, elem);
      if (!structures.has(signature)) {
        structures.set(signature, []);
      }
      structures.get(signature).push(elem);
    });

    // Filter to only repeating structures
    const repeating = [];
    for (const [signature, elements] of structures.entries()) {
      if (elements.length >= 3) {
        repeating.push({
          signature: signature,
          count: elements.length,
          elements: elements,
          selector: this.generateCommonSelector($, elements)
        });
      }
    }

    return repeating;
  }

  /**
   * Extract data from an element based on expected type
   */
  extractDataFromElement($, elem, dataType) {
    const text = $(elem).text().trim();
    if (!text) return null;

    let value = null;
    let isValid = false;

    switch (dataType) {
      case 'price':
        value = this.extractPrice(text);
        isValid = value > 0;
        break;
      case 'revenue':
      case 'profit':
        value = this.extractCurrency(text);
        isValid = value > 0;
        break;
      case 'multiple':
        value = this.extractMultiple(text);
        isValid = value > 0 && value < 100;
        break;
      case 'traffic':
        value = this.extractNumber(text);
        isValid = value > 0;
        break;
    }

    if (!isValid) return null;

    return {
      element: elem,
      selector: this.generateSelector($, elem),
      text: text,
      value: value,
      dataType: dataType
    };
  }

  /**
   * Find data nested within a label element
   */
  findNestedData($, labelElem, dataType) {
    const text = $(labelElem).text();
    const labelOnly = $(labelElem).clone().children().remove().end().text();
    
    // Check if the full text contains more than just the label
    if (text.length > labelOnly.length + 5) {
      // Remove the label part and try to extract data
      const dataText = text.replace(labelOnly, '').trim();
      const value = this.extractValueByType(dataText, dataType);
      
      if (value !== null) {
        return {
          element: labelElem,
          selector: this.generateSelector($, labelElem),
          text: dataText,
          value: value,
          dataType: dataType
        };
      }
    }

    // Check child elements
    const children = $(labelElem).children();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childData = this.extractDataFromElement($, child, dataType);
      if (childData) {
        return childData;
      }
    }

    return null;
  }

  /**
   * Analyze structure of an element
   */
  analyzeStructure($, elem) {
    const structure = {
      tag: elem.tagName?.toLowerCase(),
      childCount: $(elem).children().length,
      depth: this.getDepth($, elem),
      textNodes: this.countTextNodes($, elem),
      hasLinks: $(elem).find('a').length > 0,
      hasImages: $(elem).find('img').length > 0,
      dataElements: []
    };

    // Identify potential data elements within structure
    $(elem).find('*').each((i, child) => {
      const text = $(child).clone().children().remove().end().text().trim();
      if (text && this.looksLikeData(text)) {
        structure.dataElements.push({
          selector: this.generateSelector($, child),
          text: text,
          type: this.guessDataType(text)
        });
      }
    });

    return structure;
  }

  /**
   * Extract data from a structured element
   */
  extractDataFromStructure($, elem) {
    const data = {
      price: null,
      title: null,
      revenue: null,
      profit: null,
      multiple: null,
      traffic: null
    };

    $(elem).find('*').each((i, child) => {
      const text = $(child).text().trim();
      if (!text || text.length > 200) return;

      // Try to identify data type and extract
      if (!data.price && this.looksLikePrice(text)) {
        data.price = {
          element: child,
          selector: this.generateSelector($, child),
          value: this.extractPrice(text),
          text: text
        };
      }
      if (!data.title && this.looksLikeTitle(text)) {
        data.title = {
          element: child,
          selector: this.generateSelector($, child),
          text: text
        };
      }
      if (!data.revenue && text.toLowerCase().includes('revenue')) {
        const value = this.extractCurrency(text);
        if (value > 0) {
          data.revenue = {
            element: child,
            selector: this.generateSelector($, child),
            value: value,
            text: text
          };
        }
      }
      if (!data.profit && text.toLowerCase().includes('profit')) {
        const value = this.extractCurrency(text);
        if (value > 0) {
          data.profit = {
            element: child,
            selector: this.generateSelector($, child),
            value: value,
            text: text
          };
        }
      }
    });

    return data;
  }

  /**
   * Get structure signature for comparison
   */
  getStructureSignature($, elem) {
    const children = $(elem).children();
    const signature = [
      elem.tagName?.toLowerCase(),
      children.length,
      children.map((i, child) => child.tagName?.toLowerCase()).get().join(',')
    ].join('|');
    
    return signature;
  }

  /**
   * Get element structure details
   */
  getElementStructure($, elem) {
    return {
      tag: elem.prop('tagName')?.toLowerCase(),
      classes: elem.attr('class')?.split(' ') || [],
      childTags: elem.children().map((i, child) => 
        $(child).prop('tagName')?.toLowerCase()
      ).get(),
      depth: this.getDepth($, elem),
      textLength: elem.text().length
    };
  }

  /**
   * Analyze data within pattern elements
   */
  analyzePatternData($, elements) {
    const dataPoints = [];
    
    elements.each((i, elem) => {
      const data = this.extractDataFromStructure($, elem);
      if (Object.values(data).some(v => v !== null)) {
        dataPoints.push(data);
      }
    });
    
    return dataPoints;
  }

  /**
   * Find patterns based on tag structure
   */
  findTagPatterns($) {
    const patterns = [];
    const tagCombos = new Map();
    
    $('*').each((i, elem) => {
      const parent = $(elem).parent();
      if (!parent.length) return;
      
      const combo = `${parent.prop('tagName')?.toLowerCase()}>${elem.tagName?.toLowerCase()}`;
      if (!tagCombos.has(combo)) {
        tagCombos.set(combo, []);
      }
      tagCombos.get(combo).push(elem);
    });
    
    for (const [combo, elements] of tagCombos.entries()) {
      if (elements.length >= 5) {
        patterns.push({
          selector: combo,
          count: elements.length,
          elements: elements.slice(0, 10), // Limit for performance
          structure: this.getElementStructure($, $(elements[0])),
          dataPoints: this.analyzePatternData($, $(elements.slice(0, 5))),
          confidence: 0,
          method: 'context-tag-pattern'
        });
      }
    }
    
    return patterns;
  }

  /**
   * Calculate confidence for a structure pattern
   */
  calculateStructureConfidence(pattern) {
    let confidence = 50;
    
    // More repetitions = higher confidence
    if (pattern.count >= 10) confidence += 20;
    else if (pattern.count >= 5) confidence += 10;
    
    // Has consistent data = higher confidence
    if (pattern.dataElements && pattern.dataElements.length > 0) {
      confidence += 15;
    }
    
    // Reasonable structure depth
    if (pattern.structure && pattern.structure.depth >= 2 && pattern.structure.depth <= 5) {
      confidence += 10;
    }
    
    return Math.min(confidence, 100);
  }

  /**
   * Calculate confidence for a repeating pattern
   */
  calculatePatternConfidence(pattern) {
    let confidence = 40;
    
    // More instances = higher confidence
    confidence += Math.min(pattern.count * 5, 30);
    
    // Consistent data across instances
    if (pattern.dataPoints.length > 0) {
      const consistency = pattern.dataPoints.length / Math.min(pattern.count, 5);
      confidence += consistency * 20;
    }
    
    // Complex enough structure
    if (pattern.structure.childTags.length >= 3) {
      confidence += 10;
    }
    
    return Math.min(confidence, 100);
  }

  /**
   * Helper methods for data extraction
   */
  extractPrice(text) {
    const match = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
  }

  extractCurrency(text) {
    return this.extractPrice(text);
  }

  extractMultiple(text) {
    const match = text.match(/([\d.]+)x?/i);
    if (match) {
      return parseFloat(match[1]);
    }
    return 0;
  }

  extractNumber(text) {
    const match = text.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''));
    }
    return 0;
  }

  extractValueByType(text, dataType) {
    switch (dataType) {
      case 'price': return this.extractPrice(text);
      case 'revenue':
      case 'profit': return this.extractCurrency(text);
      case 'multiple': return this.extractMultiple(text);
      case 'traffic': return this.extractNumber(text);
      default: return null;
    }
  }

  /**
   * Check if text looks like data
   */
  looksLikeData(text) {
    return /[\d$,.]/.test(text) && text.length < 100;
  }

  looksLikePrice(text) {
    return /\$[\d,]+/.test(text) || /[\d,]+\s*(USD|usd)/.test(text);
  }

  looksLikeTitle(text) {
    return text.length >= 10 && text.length <= 100 && 
           /^[A-Z]/.test(text) && !this.looksLikeData(text);
  }

  guessDataType(text) {
    if (this.looksLikePrice(text)) return 'price';
    if (text.toLowerCase().includes('revenue')) return 'revenue';
    if (text.toLowerCase().includes('profit')) return 'profit';
    if (/[\d.]+x/i.test(text)) return 'multiple';
    if (/[\d,]+/.test(text)) return 'metric';
    return 'unknown';
  }

  /**
   * Utility methods
   */
  getDepth($, elem) {
    let depth = 0;
    let current = $(elem);
    while (current.parent().length && depth < 10) {
      current = current.parent();
      depth++;
    }
    return depth;
  }

  countTextNodes($, elem) {
    let count = 0;
    $(elem).contents().each((i, node) => {
      if (node.nodeType === 3 && node.nodeValue?.trim()) {
        count++;
      }
    });
    return count;
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
    
    const parent = $(elem).parent();
    const index = parent.children(tag).index(elem);
    return `${parent.prop('tagName')?.toLowerCase()} > ${tag}:nth-child(${index + 1})`;
  }

  generateCommonSelector($, elements) {
    if (elements.length === 0) return '';
    
    const first = $(elements[0]);
    const classes = first.attr('class');
    if (classes) {
      return '.' + classes.split(' ').filter(c => c)[0];
    }
    
    return first.prop('tagName')?.toLowerCase();
  }

  removeDuplicates(dataArray) {
    const seen = new Set();
    return dataArray.filter(item => {
      const key = `${item.selector}-${item.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

module.exports = ContextDetector;