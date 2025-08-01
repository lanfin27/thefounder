// Visual layout and positioning analysis for element detection
const cheerio = require('cheerio');

class VisualDetector {
  constructor() {
    // Common visual patterns for different element types
    this.visualPatterns = {
      price: {
        fontSize: { min: 18, preferred: 24 },
        fontWeight: ['bold', '700', '800', '900'],
        position: ['top', 'right', 'prominent'],
        colors: ['primary', 'accent', 'emphasis']
      },
      title: {
        fontSize: { min: 16, preferred: 20 },
        fontWeight: ['500', '600', '700', 'bold'],
        position: ['top', 'left', 'center'],
        lineHeight: 1.2
      },
      metrics: {
        fontSize: { min: 14, preferred: 16 },
        position: ['middle', 'grouped'],
        alignment: ['left', 'right'],
        proximity: 'close-together'
      }
    };

    // Layout zones for different data types
    this.layoutZones = {
      price: { x: [0.6, 1.0], y: [0, 0.4] },      // Top-right
      title: { x: [0, 0.7], y: [0, 0.3] },        // Top-left/center
      metrics: { x: [0, 1.0], y: [0.3, 0.7] },    // Middle section
      description: { x: [0, 1.0], y: [0.5, 1.0] } // Bottom section
    };
  }

  /**
   * Analyze element positions and visual hierarchy
   */
  async analyzeElementPositions($, containerSelector) {
    const container = containerSelector ? $(containerSelector) : $('body');
    const elements = [];
    
    // Get container dimensions for relative positioning
    const containerWidth = this.getElementWidth(container);
    const containerHeight = this.getElementHeight(container);
    
    container.find('*').each((i, elem) => {
      // Skip if too many children (likely container)
      if ($(elem).children().length > 5) return;
      
      const text = $(elem).text().trim();
      if (!text || text.length < 3) return;
      
      const position = this.getElementPosition($, elem, containerWidth, containerHeight);
      const visual = this.getVisualProperties($, elem);
      
      elements.push({
        element: elem,
        text: text,
        position: position,
        visual: visual,
        zone: this.detectZone(position),
        selector: this.generateSelector($, elem)
      });
    });
    
    return this.groupByVisualPatterns(elements);
  }

  /**
   * Detect elements by their size characteristics
   */
  async detectBySize($, targetType = 'all') {
    const sizedElements = {
      large: [],    // Likely prices or main titles
      medium: [],   // Likely descriptions or metrics
      small: []     // Likely metadata or labels
    };
    
    // Collect all text elements with their sizes
    const allElements = [];
    $('*').each((i, elem) => {
      if ($(elem).children().length > 2) return;
      
      const text = $(elem).text().trim();
      if (!text || text.length < 3) return;
      
      const fontSize = this.getFontSize($, elem);
      if (fontSize > 0) {
        allElements.push({
          element: elem,
          text: text,
          fontSize: fontSize,
          selector: this.generateSelector($, elem),
          visual: this.getVisualProperties($, elem)
        });
      }
    });
    
    // Calculate size thresholds based on distribution
    const sizes = allElements.map(e => e.fontSize).sort((a, b) => a - b);
    const smallThreshold = sizes[Math.floor(sizes.length * 0.33)] || 14;
    const largeThreshold = sizes[Math.floor(sizes.length * 0.8)] || 20;
    
    // Categorize elements by size
    allElements.forEach(elem => {
      if (elem.fontSize >= largeThreshold) {
        sizedElements.large.push({
          ...elem,
          confidence: this.calculateSizeConfidence(elem, 'large', targetType),
          method: 'visual-size-large'
        });
      } else if (elem.fontSize >= smallThreshold) {
        sizedElements.medium.push({
          ...elem,
          confidence: this.calculateSizeConfidence(elem, 'medium', targetType),
          method: 'visual-size-medium'
        });
      } else {
        sizedElements.small.push({
          ...elem,
          confidence: this.calculateSizeConfidence(elem, 'small', targetType),
          method: 'visual-size-small'
        });
      }
    });
    
    // Sort each category by confidence
    Object.keys(sizedElements).forEach(size => {
      sizedElements[size].sort((a, b) => b.confidence - a.confidence);
    });
    
    return sizedElements;
  }

  /**
   * Analyze color patterns to identify important elements
   */
  async analyzeColorPatterns($) {
    const colorGroups = {
      emphasis: [],    // Bold colors, high contrast
      positive: [],    // Green, success colors
      negative: [],    // Red, warning colors
      neutral: []      // Default text colors
    };
    
    $('*').each((i, elem) => {
      if ($(elem).children().length > 2) return;
      
      const text = $(elem).text().trim();
      if (!text || text.length < 3) return;
      
      const color = this.getElementColor($, elem);
      const bgColor = this.getBackgroundColor($, elem);
      const contrast = this.calculateContrast(color, bgColor);
      
      const colorInfo = {
        element: elem,
        text: text,
        color: color,
        bgColor: bgColor,
        contrast: contrast,
        selector: this.generateSelector($, elem),
        visual: this.getVisualProperties($, elem)
      };
      
      // Categorize by color pattern
      if (this.isEmphasisColor(color, bgColor, contrast)) {
        colorGroups.emphasis.push({
          ...colorInfo,
          confidence: 80,
          method: 'visual-color-emphasis'
        });
      } else if (this.isPositiveColor(color)) {
        colorGroups.positive.push({
          ...colorInfo,
          confidence: 70,
          method: 'visual-color-positive'
        });
      } else if (this.isNegativeColor(color)) {
        colorGroups.negative.push({
          ...colorInfo,
          confidence: 70,
          method: 'visual-color-negative'
        });
      } else {
        colorGroups.neutral.push({
          ...colorInfo,
          confidence: 50,
          method: 'visual-color-neutral'
        });
      }
    });
    
    return colorGroups;
  }

  /**
   * Get element position relative to container
   */
  getElementPosition($, elem, containerWidth, containerHeight) {
    const offset = $(elem).offset() || { top: 0, left: 0 };
    const width = $(elem).outerWidth() || 0;
    const height = $(elem).outerHeight() || 0;
    
    return {
      x: offset.left / containerWidth,
      y: offset.top / containerHeight,
      width: width / containerWidth,
      height: height / containerHeight,
      absolute: { top: offset.top, left: offset.left, width, height }
    };
  }

  /**
   * Get visual properties of an element
   */
  getVisualProperties($, elem) {
    return {
      fontSize: this.getFontSize($, elem),
      fontWeight: $(elem).css('font-weight') || 'normal',
      fontFamily: $(elem).css('font-family') || 'default',
      color: $(elem).css('color') || '#000',
      backgroundColor: this.getBackgroundColor($, elem),
      textAlign: $(elem).css('text-align') || 'left',
      display: $(elem).css('display') || 'inline',
      position: $(elem).css('position') || 'static',
      zIndex: parseInt($(elem).css('z-index')) || 0,
      opacity: parseFloat($(elem).css('opacity')) || 1,
      textDecoration: $(elem).css('text-decoration') || 'none',
      textTransform: $(elem).css('text-transform') || 'none'
    };
  }

  /**
   * Get font size in pixels
   */
  getFontSize($, elem) {
    const fontSize = $(elem).css('font-size');
    if (!fontSize) return 0;
    
    // Convert to pixels if needed
    if (fontSize.includes('px')) {
      return parseInt(fontSize);
    } else if (fontSize.includes('em')) {
      const parentSize = this.getFontSize($, $(elem).parent()) || 16;
      return parentSize * parseFloat(fontSize);
    } else if (fontSize.includes('rem')) {
      return 16 * parseFloat(fontSize); // Assuming 16px base
    }
    
    return parseInt(fontSize) || 0;
  }

  /**
   * Get background color (checking parents if transparent)
   */
  getBackgroundColor($, elem) {
    let current = $(elem);
    let maxDepth = 5;
    
    while (maxDepth > 0) {
      const bg = current.css('background-color');
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
        return bg;
      }
      current = current.parent();
      if (!current.length) break;
      maxDepth--;
    }
    
    return '#ffffff'; // Default to white
  }

  /**
   * Detect which zone an element belongs to
   */
  detectZone(position) {
    for (const [zoneName, bounds] of Object.entries(this.layoutZones)) {
      if (position.x >= bounds.x[0] && position.x <= bounds.x[1] &&
          position.y >= bounds.y[0] && position.y <= bounds.y[1]) {
        return zoneName;
      }
    }
    return 'other';
  }

  /**
   * Group elements by visual patterns
   */
  groupByVisualPatterns(elements) {
    const groups = {
      likelyPrices: [],
      likelyTitles: [],
      likelyMetrics: [],
      likelyDescriptions: []
    };
    
    elements.forEach(elem => {
      const score = this.scoreVisualPattern(elem);
      
      if (score.price > 70) {
        groups.likelyPrices.push({
          ...elem,
          confidence: score.price,
          method: 'visual-pattern'
        });
      }
      if (score.title > 70) {
        groups.likelyTitles.push({
          ...elem,
          confidence: score.title,
          method: 'visual-pattern'
        });
      }
      if (score.metric > 70) {
        groups.likelyMetrics.push({
          ...elem,
          confidence: score.metric,
          method: 'visual-pattern'
        });
      }
      if (score.description > 70) {
        groups.likelyDescriptions.push({
          ...elem,
          confidence: score.description,
          method: 'visual-pattern'
        });
      }
    });
    
    // Sort each group by confidence
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.confidence - a.confidence);
    });
    
    return groups;
  }

  /**
   * Score how well an element matches visual patterns
   */
  scoreVisualPattern(elem) {
    const scores = {
      price: 0,
      title: 0,
      metric: 0,
      description: 0
    };
    
    // Score based on zone
    if (elem.zone === 'price') scores.price += 30;
    if (elem.zone === 'title') scores.title += 30;
    if (elem.zone === 'metrics') scores.metric += 30;
    if (elem.zone === 'description') scores.description += 30;
    
    // Score based on visual properties
    const v = elem.visual;
    
    // Price scoring
    if (v.fontSize >= 20) scores.price += 20;
    if (v.fontWeight === 'bold' || parseInt(v.fontWeight) >= 700) scores.price += 15;
    if (v.textAlign === 'right') scores.price += 10;
    if (elem.text.includes('$') || elem.text.includes(',')) scores.price += 25;
    
    // Title scoring
    if (v.fontSize >= 18 && v.fontSize <= 28) scores.title += 20;
    if (v.fontWeight === '600' || v.fontWeight === '700') scores.title += 15;
    if (elem.text.length >= 10 && elem.text.length <= 100) scores.title += 20;
    if (v.textTransform === 'capitalize') scores.title += 10;
    
    // Metric scoring
    if (v.fontSize >= 14 && v.fontSize <= 18) scores.metric += 20;
    if (elem.text.match(/\d+/) && elem.text.length < 50) scores.metric += 25;
    if (v.display === 'inline-block' || v.display === 'table-cell') scores.metric += 15;
    
    // Description scoring
    if (v.fontSize >= 12 && v.fontSize <= 16) scores.description += 20;
    if (elem.text.length >= 50) scores.description += 25;
    if (v.lineHeight > 1.4) scores.description += 15;
    
    return scores;
  }

  /**
   * Calculate size-based confidence
   */
  calculateSizeConfidence(elem, size, targetType) {
    let confidence = 50;
    
    if (size === 'large') {
      if (targetType === 'price' && elem.text.includes('$')) confidence += 30;
      if (targetType === 'title' && elem.text.length >= 10) confidence += 25;
      if (elem.visual.fontWeight === 'bold') confidence += 15;
    } else if (size === 'medium') {
      if (targetType === 'metric' && elem.text.match(/\d+/)) confidence += 30;
      if (targetType === 'description' && elem.text.length >= 30) confidence += 25;
    }
    
    return Math.min(confidence, 100);
  }

  /**
   * Check if color indicates emphasis
   */
  isEmphasisColor(color, bgColor, contrast) {
    return contrast > 7 || // High contrast
           color.includes('rgb(0') || // Very dark
           color.includes('rgb(255'); // Very bright
  }

  /**
   * Check if color is positive (green-ish)
   */
  isPositiveColor(color) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      return g > r && g > b && g > 100;
    }
    return color.includes('green') || color.includes('success');
  }

  /**
   * Check if color is negative (red-ish)
   */
  isNegativeColor(color) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      return r > g && r > b && r > 100;
    }
    return color.includes('red') || color.includes('danger');
  }

  /**
   * Calculate color contrast ratio
   */
  calculateContrast(color1, color2) {
    // Simplified contrast calculation
    const getLuminance = (color) => {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) return 0.5;
      
      const [, r, g, b] = match.map(n => Number(n) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get element dimensions
   */
  getElementWidth(elem) {
    return elem.outerWidth?.() || elem.width?.() || 1200; // Default viewport width
  }

  getElementHeight(elem) {
    return elem.outerHeight?.() || elem.height?.() || 800; // Default viewport height
  }

  /**
   * Generate selector for element
   */
  generateSelector($, elem) {
    const tag = elem.tagName?.toLowerCase();
    const id = $(elem).attr('id');
    const classes = $(elem).attr('class');
    
    if (id) {
      return `#${id}`;
    }
    
    if (classes) {
      const classList = classes.split(' ')
        .filter(c => c && !c.includes('active'))
        .slice(0, 2);
      if (classList.length > 0) {
        return `${tag}.${classList.join('.')}`;
      }
    }
    
    // Use nth-child selector
    const parent = $(elem).parent();
    const index = parent.children(tag).index(elem);
    return `${parent.prop('tagName')?.toLowerCase()} > ${tag}:nth-child(${index + 1})`;
  }
}

module.exports = VisualDetector;