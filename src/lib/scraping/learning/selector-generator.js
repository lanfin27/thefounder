// Automatic selector creation and testing system
const cheerio = require('cheerio');

class SelectorGenerator {
  constructor() {
    // Selector strategies in order of preference
    this.strategies = [
      'id',           // #elementId
      'class',        // .className
      'attribute',    // [data-type="value"]
      'tag-class',    // tag.className
      'nth-child',    // parent > tag:nth-child(n)
      'text-content', // :contains("text")
      'xpath',        // Complex XPath expressions
      'css-path'      // Full CSS path
    ];

    // Common attribute patterns for data elements
    this.dataAttributes = [
      'data-id', 'data-type', 'data-value', 'data-listing',
      'data-price', 'data-revenue', 'data-metric',
      'itemtype', 'itemprop', 'role', 'aria-label'
    ];

    // Selector mutation operations
    this.mutations = [
      'parent',       // Go to parent element
      'child',        // Go to first child
      'sibling',      // Go to next sibling
      'ancestor',     // Go up multiple levels
      'descendant'    // Go down to any descendant
    ];
  }

  /**
   * Generate variations of a working selector
   */
  generateVariations(baseSelector, maxVariations = 10) {
    const variations = new Set([baseSelector]);
    
    // Strategy 1: Simplify selector
    variations.add(this.simplifySelector(baseSelector));
    
    // Strategy 2: Make more specific
    variations.add(this.makeMoreSpecific(baseSelector));
    
    // Strategy 3: Make more general
    variations.add(this.makeMoreGeneral(baseSelector));
    
    // Strategy 4: Use different attributes
    const attrVariations = this.generateAttributeVariations(baseSelector);
    attrVariations.forEach(v => variations.add(v));
    
    // Strategy 5: Use position-based selectors
    const posVariations = this.generatePositionalVariations(baseSelector);
    posVariations.forEach(v => variations.add(v));
    
    // Strategy 6: Use parent-child relationships
    const relVariations = this.generateRelationshipVariations(baseSelector);
    relVariations.forEach(v => variations.add(v));
    
    // Remove empty or invalid variations
    const validVariations = Array.from(variations)
      .filter(v => v && v.length > 0)
      .slice(0, maxVariations);
    
    return validVariations;
  }

  /**
   * Discover new patterns by analyzing page structure
   */
  async discoverNewPatterns($, targetDataType) {
    const patterns = [];
    const candidates = this.findCandidateElements($, targetDataType);
    
    for (const candidate of candidates) {
      const selectors = this.generateSelectorsForElement($, candidate.element);
      
      for (const selector of selectors) {
        try {
          // Test if selector is unique and reliable
          const matches = $(selector);
          if (matches.length === 1 || this.isRepeatingPattern(matches)) {
            patterns.push({
              selector: selector,
              dataType: targetDataType,
              value: candidate.value,
              text: candidate.text,
              confidence: this.calculateSelectorConfidence(selector, matches),
              strategy: this.detectStrategy(selector),
              isUnique: matches.length === 1,
              matchCount: matches.length
            });
          }
        } catch (error) {
          // Invalid selector, skip
        }
      }
    }
    
    // Sort by confidence and uniqueness
    patterns.sort((a, b) => {
      if (a.isUnique !== b.isUnique) {
        return a.isUnique ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });
    
    return patterns;
  }

  /**
   * Evolve selectors based on extraction results
   */
  async evolveSelectors(currentResults, expectedData, $) {
    const evolved = [];
    
    for (const result of currentResults) {
      const quality = this.assessDataQuality(result.value, expectedData);
      
      if (quality < 0.8) {
        // Selector needs improvement
        const improvements = this.improveSelector(result.selector, $, expectedData);
        evolved.push(...improvements);
      } else {
        // Selector is good, but try to optimize
        const optimized = this.optimizeSelector(result.selector, $);
        if (optimized !== result.selector) {
          evolved.push({
            original: result.selector,
            evolved: optimized,
            reason: 'optimization',
            quality: quality
          });
        }
      }
    }
    
    return evolved;
  }

  /**
   * Generate selectors for a specific element
   */
  generateSelectorsForElement($, element) {
    const selectors = [];
    const $elem = $(element);
    
    // ID selector
    const id = $elem.attr('id');
    if (id && !id.match(/\d{5,}/)) { // Avoid dynamic IDs
      selectors.push(`#${id}`);
    }
    
    // Class selectors
    const classes = $elem.attr('class');
    if (classes) {
      const classList = classes.split(' ').filter(c => 
        c && !c.match(/active|hover|focus|selected/) // Avoid state classes
      );
      
      if (classList.length > 0) {
        // Single class
        classList.forEach(c => selectors.push(`.${c}`));
        
        // Tag + class
        const tag = element.tagName?.toLowerCase();
        classList.forEach(c => selectors.push(`${tag}.${c}`));
        
        // Multiple classes
        if (classList.length > 1) {
          selectors.push(`.${classList.join('.')}`);
        }
      }
    }
    
    // Attribute selectors
    for (const attr of this.dataAttributes) {
      const value = $elem.attr(attr);
      if (value) {
        selectors.push(`[${attr}="${value}"]`);
        selectors.push(`${element.tagName?.toLowerCase()}[${attr}="${value}"]`);
      }
    }
    
    // Positional selectors
    const parent = $elem.parent();
    if (parent.length) {
      const siblings = parent.children(element.tagName?.toLowerCase());
      const index = siblings.index(element);
      
      if (index >= 0) {
        const parentSelector = this.getSimpleParentSelector($, parent);
        selectors.push(`${parentSelector} > ${element.tagName?.toLowerCase()}:nth-child(${index + 1})`);
        selectors.push(`${parentSelector} > :nth-child(${index + 1})`);
      }
    }
    
    // Text-based selectors (for unique text)
    const text = $elem.text().trim();
    if (text && text.length < 50 && text.length > 3) {
      selectors.push(`${element.tagName?.toLowerCase()}:contains("${text.substring(0, 20)}")`);
    }
    
    // Combined selectors
    const tag = element.tagName?.toLowerCase();
    const href = $elem.attr('href');
    if (href) {
      selectors.push(`${tag}[href="${href}"]`);
      if (href.startsWith('/')) {
        selectors.push(`${tag}[href^="/"]`);
      }
    }
    
    return this.removeDuplicates(selectors);
  }

  /**
   * Helper methods for selector generation
   */
  simplifySelector(selector) {
    // Remove unnecessary parts
    let simplified = selector;
    
    // Remove tag names if class/id is specific enough
    simplified = simplified.replace(/^[a-z]+\.([\w-]+)/, '.$1');
    simplified = simplified.replace(/^[a-z]+#([\w-]+)/, '#$1');
    
    // Remove intermediate elements
    simplified = simplified.replace(/\s*>\s*[^>]+\s*>\s*/, ' > ');
    
    // Remove pseudo-selectors
    simplified = simplified.replace(/:[^:\s]+/g, '');
    
    return simplified.trim();
  }

  makeMoreSpecific(selector) {
    // Add parent context if not present
    if (!selector.includes(' ') && !selector.includes('>')) {
      return `div ${selector}`;
    }
    
    // Add tag name if only class
    if (selector.startsWith('.')) {
      return `div${selector}`;
    }
    
    return selector;
  }

  makeMoreGeneral(selector) {
    // Remove specific indices
    let general = selector.replace(/:nth-child\(\d+\)/g, '');
    
    // Remove specific attribute values
    general = general.replace(/\[[\w-]+="[^"]+"\]/g, '');
    
    // Keep only essential parts
    const parts = general.split(/\s*[>~+]\s*/);
    if (parts.length > 2) {
      general = parts.slice(-2).join(' > ');
    }
    
    return general.trim();
  }

  generateAttributeVariations(baseSelector) {
    const variations = [];
    
    // Try different attribute combinations
    const attrPattern = /\[([^=]+)="([^"]+)"\]/g;
    const attributes = [];
    let match;
    
    while ((match = attrPattern.exec(baseSelector)) !== null) {
      attributes.push({ name: match[1], value: match[2] });
    }
    
    // Generate variations with different attributes
    for (const attr of attributes) {
      // Partial attribute match
      variations.push(baseSelector.replace(
        `[${attr.name}="${attr.value}"]`,
        `[${attr.name}^="${attr.value.substring(0, 5)}"]`
      ));
      
      // Attribute exists
      variations.push(baseSelector.replace(
        `[${attr.name}="${attr.value}"]`,
        `[${attr.name}]`
      ));
    }
    
    return variations;
  }

  generatePositionalVariations(baseSelector) {
    const variations = [];
    
    // Try different positional pseudo-classes
    const positions = ['first-child', 'last-child', 'first-of-type', 'last-of-type'];
    
    for (const pos of positions) {
      if (!baseSelector.includes(':')) {
        variations.push(`${baseSelector}:${pos}`);
      }
    }
    
    // Try nth-child variations
    if (baseSelector.includes(':nth-child')) {
      variations.push(baseSelector.replace(/:nth-child\(\d+\)/, ':nth-child(n+2)'));
      variations.push(baseSelector.replace(/:nth-child\(\d+\)/, ':nth-child(2n)'));
    }
    
    return variations;
  }

  generateRelationshipVariations(baseSelector) {
    const variations = [];
    
    // Try different combinators
    if (baseSelector.includes(' > ')) {
      variations.push(baseSelector.replace(' > ', ' '));  // Descendant
      variations.push(baseSelector.replace(' > ', ' ~ ')); // Sibling
    }
    
    if (baseSelector.includes(' ')) {
      variations.push(baseSelector.replace(' ', ' > '));  // Direct child
    }
    
    // Add parent selectors
    if (!baseSelector.startsWith('body') && !baseSelector.startsWith('html')) {
      variations.push(`div ${baseSelector}`);
      variations.push(`[class*="container"] ${baseSelector}`);
      variations.push(`[class*="listing"] ${baseSelector}`);
    }
    
    return variations;
  }

  /**
   * Find candidate elements based on data type
   */
  findCandidateElements($, targetDataType) {
    const candidates = [];
    
    $('*').each((i, elem) => {
      const text = $(elem).text().trim();
      if (!text || $(elem).children().length > 3) return;
      
      let value = null;
      let isCandidate = false;
      
      switch (targetDataType) {
        case 'price':
          if (/\$[\d,]+/.test(text)) {
            value = parseFloat(text.replace(/[^\d.]/g, ''));
            isCandidate = value > 1000;
          }
          break;
          
        case 'revenue':
        case 'profit':
          if (/\$[\d,]+/.test(text) && text.toLowerCase().includes(targetDataType)) {
            value = parseFloat(text.replace(/[^\d.]/g, ''));
            isCandidate = value > 0;
          }
          break;
          
        case 'title':
          if (text.length >= 10 && text.length <= 100 && /^[A-Z]/.test(text)) {
            isCandidate = true;
            value = text;
          }
          break;
          
        case 'multiple':
          if (/[\d.]+x/i.test(text)) {
            value = parseFloat(text.match(/[\d.]+/)[0]);
            isCandidate = value > 0 && value < 100;
          }
          break;
      }
      
      if (isCandidate) {
        candidates.push({
          element: elem,
          text: text,
          value: value,
          dataType: targetDataType
        });
      }
    });
    
    return candidates;
  }

  /**
   * Check if elements form a repeating pattern
   */
  isRepeatingPattern(elements) {
    if (elements.length < 3) return false;
    
    // Check if elements have similar structure
    const structures = elements.map((i, elem) => {
      const $elem = cheerio(elem);
      return {
        tag: elem.tagName,
        classes: $elem.attr('class')?.split(' ').sort().join(' '),
        childCount: $elem.children().length
      };
    }).get();
    
    // All should have same structure
    const firstStructure = JSON.stringify(structures[0]);
    return structures.every(s => JSON.stringify(s) === firstStructure);
  }

  /**
   * Calculate confidence score for a selector
   */
  calculateSelectorConfidence(selector, matches) {
    let confidence = 50;
    
    // Unique selectors are most reliable
    if (matches.length === 1) {
      confidence += 30;
    }
    
    // ID selectors are very reliable
    if (selector.includes('#')) {
      confidence += 20;
    }
    
    // Specific class combinations are good
    if (selector.match(/\.[^.\s]+\.[^.\s]+/)) {
      confidence += 15;
    }
    
    // Data attributes are reliable
    if (selector.includes('[data-')) {
      confidence += 15;
    }
    
    // Too generic selectors are less reliable
    if (selector.match(/^(div|span|p|a)$/)) {
      confidence -= 20;
    }
    
    // Position-based selectors are less reliable
    if (selector.includes(':nth-child')) {
      confidence -= 10;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Detect which strategy was used for a selector
   */
  detectStrategy(selector) {
    if (selector.includes('#')) return 'id';
    if (selector.match(/^\.[^.\s]+$/)) return 'class';
    if (selector.includes('[') && selector.includes(']')) return 'attribute';
    if (selector.includes('.') && selector.match(/^[a-z]+\./)) return 'tag-class';
    if (selector.includes(':nth-child')) return 'nth-child';
    if (selector.includes(':contains')) return 'text-content';
    if (selector.includes(' > ')) return 'css-path';
    return 'unknown';
  }

  /**
   * Assess quality of extracted data
   */
  assessDataQuality(extractedValue, expectedData) {
    if (!extractedValue || !expectedData) return 0;
    
    // For numeric values
    if (typeof extractedValue === 'number' && typeof expectedData.min === 'number') {
      if (extractedValue >= expectedData.min && extractedValue <= expectedData.max) {
        return 1.0;
      }
      return 0.5;
    }
    
    // For text values
    if (typeof extractedValue === 'string' && expectedData.pattern) {
      if (new RegExp(expectedData.pattern).test(extractedValue)) {
        return 1.0;
      }
      return 0.5;
    }
    
    return 0.7; // Default quality
  }

  /**
   * Improve a selector based on extraction issues
   */
  improveSelector(selector, $, expectedData) {
    const improvements = [];
    const current = $(selector);
    
    if (current.length === 0) {
      // Selector no longer works, generate alternatives
      const similar = this.findSimilarElements($, selector, expectedData);
      similar.forEach(elem => {
        const newSelectors = this.generateSelectorsForElement($, elem);
        improvements.push(...newSelectors.map(s => ({
          original: selector,
          evolved: s,
          reason: 'selector-broken',
          confidence: 70
        })));
      });
    } else if (current.length > 1) {
      // Selector too broad, make more specific
      const specific = this.makeMoreSpecific(selector);
      improvements.push({
        original: selector,
        evolved: specific,
        reason: 'too-broad',
        confidence: 80
      });
    }
    
    return improvements;
  }

  /**
   * Optimize a working selector
   */
  optimizeSelector(selector, $) {
    // Try to simplify while maintaining uniqueness
    const simplified = this.simplifySelector(selector);
    if ($(simplified).length === $(selector).length) {
      return simplified;
    }
    
    // Try to use more reliable attributes
    const current = $(selector);
    if (current.length === 1) {
      const elem = current[0];
      const id = $(elem).attr('id');
      if (id && !id.match(/\d{5,}/)) {
        return `#${id}`;
      }
    }
    
    return selector;
  }

  /**
   * Find elements similar to a broken selector
   */
  findSimilarElements($, brokenSelector, expectedData) {
    const similar = [];
    
    // Extract key parts from broken selector
    const parts = brokenSelector.match(/[.#][\w-]+|[a-z]+|\[[^\]]+\]/g) || [];
    
    $('*').each((i, elem) => {
      let score = 0;
      const $elem = $(elem);
      
      // Check each part
      for (const part of parts) {
        if (part.startsWith('.') && $elem.hasClass(part.substring(1))) {
          score++;
        } else if (part.startsWith('#') && $elem.attr('id') === part.substring(1)) {
          score += 2;
        } else if (part.startsWith('[') && part.endsWith(']')) {
          const attrMatch = part.match(/\[([^=]+)(?:="([^"]+)")?\]/);
          if (attrMatch) {
            const [, attr, value] = attrMatch;
            if (value ? $elem.attr(attr) === value : $elem.attr(attr)) {
              score++;
            }
          }
        } else if (elem.tagName?.toLowerCase() === part) {
          score += 0.5;
        }
      }
      
      if (score >= parts.length * 0.5) {
        similar.push(elem);
      }
    });
    
    return similar.slice(0, 5);
  }

  /**
   * Utility methods
   */
  getSimpleParentSelector($, parent) {
    const id = parent.attr('id');
    if (id) return `#${id}`;
    
    const classes = parent.attr('class');
    if (classes) {
      const mainClass = classes.split(' ').filter(c => c && !c.match(/active|hover/))[0];
      if (mainClass) return `.${mainClass}`;
    }
    
    return parent.prop('tagName')?.toLowerCase() || 'div';
  }

  removeDuplicates(array) {
    return [...new Set(array)];
  }
}

module.exports = SelectorGenerator;