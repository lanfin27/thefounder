// intelligent-data-extractor.js
// Intelligent data extraction that mimics human reading patterns

const natural = require('natural');
const cv = require('opencv4nodejs');

class IntelligentDataExtractor {
  constructor(config = {}) {
    this.config = {
      extractionStrategy: 'human-like',
      chunkSize: 10, // Items per chunk
      readingSpeed: 250, // Words per minute
      scanPattern: 'F-pattern', // F-pattern, Z-pattern, or layer-cake
      focusPriority: ['price', 'title', 'key-metrics', 'description'],
      visualAnalysis: true,
      semanticUnderstanding: true,
      confidenceThreshold: 0.8,
      ...config
    };

    // Reading patterns based on research
    this.readingPatterns = {
      'F-pattern': this.createFPattern(),
      'Z-pattern': this.createZPattern(),
      'layer-cake': this.createLayerCakePattern(),
      'spot-reading': this.createSpotReadingPattern()
    };

    // Visual attention models
    this.visualAttention = {
      colorContrast: 0.3,
      sizeImportance: 0.2,
      positionWeight: 0.3,
      movementAttraction: 0.2
    };

    // Extraction patterns for different data types
    this.extractionPatterns = this.initializeExtractionPatterns();

    // Natural language processor
    this.nlp = {
      tokenizer: new natural.WordTokenizer(),
      sentiment: new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn'),
      classifier: new natural.BayesClassifier()
    };

    // Extraction state
    this.extractionState = {
      currentChunk: 0,
      extractedData: [],
      confidence: {},
      readingPath: [],
      attentionHeatmap: null
    };
  }

  initializeExtractionPatterns() {
    return {
      listing: {
        patterns: [
          {
            name: 'price',
            selectors: ['.price', '[class*="price"]', '[data-price]'],
            regex: /\$[\d,]+(?:\.\d{2})?/,
            validation: (value) => {
              const num = parseFloat(value.replace(/[$,]/g, ''));
              return num > 0 && num < 100000000;
            },
            importance: 0.9
          },
          {
            name: 'title',
            selectors: ['h1', 'h2', '.title', '[class*="title"]'],
            validation: (value) => value.length > 5 && value.length < 200,
            importance: 0.85
          },
          {
            name: 'revenue',
            selectors: ['.revenue', '[class*="revenue"]'],
            regex: /(?:revenue|income)[:\s]*\$?([\d,]+)/i,
            validation: (value) => {
              const num = parseFloat(value.replace(/[$,]/g, ''));
              return num >= 0 && num < 10000000;
            },
            importance: 0.8
          },
          {
            name: 'profit',
            selectors: ['.profit', '[class*="profit"]'],
            regex: /(?:profit|earnings)[:\s]*\$?([\d,]+)/i,
            validation: (value) => {
              const num = parseFloat(value.replace(/[$,]/g, ''));
              return num >= -1000000 && num < 10000000;
            },
            importance: 0.8
          },
          {
            name: 'multiple',
            selectors: ['.multiple', '[class*="multiple"]'],
            regex: /(\d+(?:\.\d+)?)[x×]\s*(?:multiple)?/i,
            validation: (value) => {
              const num = parseFloat(value);
              return num > 0 && num < 100;
            },
            importance: 0.75
          },
          {
            name: 'category',
            selectors: ['.category', '[class*="category"]', '.badge'],
            validation: (value) => value.length > 2 && value.length < 50,
            importance: 0.6
          },
          {
            name: 'age',
            selectors: ['.age', '[class*="established"]'],
            regex: /(\d+)\s*(?:year|month|day)s?\s*(?:old|ago)?/i,
            importance: 0.5
          },
          {
            name: 'traffic',
            selectors: ['.traffic', '[class*="visitor"]', '[class*="traffic"]'],
            regex: /([\d,]+)\s*(?:visitor|user|traffic|view)s?/i,
            importance: 0.7
          }
        ],
        relationships: {
          'price-revenue': (price, revenue) => {
            const multiple = price / (revenue * 12);
            return multiple > 0.5 && multiple < 10;
          },
          'revenue-profit': (revenue, profit) => {
            const margin = profit / revenue;
            return margin > -1 && margin < 1;
          }
        }
      },
      
      table: {
        patterns: [
          {
            name: 'headers',
            selector: 'thead th, thead td, tr:first-child td',
            extraction: 'array',
            importance: 0.9
          },
          {
            name: 'rows',
            selector: 'tbody tr, tr:not(:first-child)',
            extraction: 'matrix',
            importance: 0.8
          }
        ],
        processing: 'structured'
      },
      
      metrics: {
        patterns: [
          {
            name: 'kpi',
            selectors: ['.metric', '.stat', '[class*="metric"]', '[class*="stat"]'],
            extraction: 'key-value',
            importance: 0.85
          }
        ]
      }
    };
  }

  createFPattern() {
    // F-pattern reading: horizontal top, horizontal middle, vertical left
    return {
      name: 'F-pattern',
      description: 'Most common web reading pattern',
      
      generatePath: (viewport) => {
        const path = [];
        const { width, height } = viewport;
        
        // Top horizontal scan
        for (let x = 0; x < width; x += 50) {
          path.push({ x, y: height * 0.1, duration: 100 });
        }
        
        // Drop down and second horizontal (shorter)
        for (let x = 0; x < width * 0.7; x += 50) {
          path.push({ x, y: height * 0.3, duration: 150 });
        }
        
        // Vertical scan down left side
        for (let y = height * 0.3; y < height * 0.8; y += 100) {
          path.push({ x: width * 0.1, y, duration: 200 });
        }
        
        return path;
      },
      
      priorityZones: [
        { x: 0, y: 0, width: 1, height: 0.2, weight: 0.9 },      // Top
        { x: 0, y: 0.2, width: 0.7, height: 0.2, weight: 0.7 }, // Upper middle
        { x: 0, y: 0, width: 0.3, height: 1, weight: 0.8 }      // Left side
      ]
    };
  }

  createZPattern() {
    return {
      name: 'Z-pattern',
      description: 'Common for simple layouts with CTA',
      
      generatePath: (viewport) => {
        const path = [];
        const { width, height } = viewport;
        
        // Top horizontal
        for (let x = 0; x < width; x += 50) {
          path.push({ x, y: height * 0.1, duration: 100 });
        }
        
        // Diagonal to bottom left
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          path.push({
            x: width * (1 - progress),
            y: height * (0.1 + 0.8 * progress),
            duration: 50
          });
        }
        
        // Bottom horizontal
        for (let x = 0; x < width; x += 50) {
          path.push({ x, y: height * 0.9, duration: 100 });
        }
        
        return path;
      },
      
      priorityZones: [
        { x: 0, y: 0, width: 1, height: 0.2, weight: 0.9 },      // Top
        { x: 0, y: 0.8, width: 1, height: 0.2, weight: 0.8 },    // Bottom
        { x: 0.3, y: 0.3, width: 0.4, height: 0.4, weight: 0.6 } // Center
      ]
    };
  }

  createLayerCakePattern() {
    return {
      name: 'layer-cake',
      description: 'Horizontal scanning of distinct sections',
      
      generatePath: (viewport) => {
        const path = [];
        const { width, height } = viewport;
        const layers = 5;
        
        for (let layer = 0; layer < layers; layer++) {
          const y = (height / layers) * layer + height / (layers * 2);
          
          // Scan each layer horizontally
          for (let x = 0; x < width; x += 40) {
            path.push({ x, y, duration: 80 });
          }
        }
        
        return path;
      },
      
      priorityZones: [
        { x: 0, y: 0, width: 1, height: 0.2, weight: 0.9 },
        { x: 0, y: 0.2, width: 1, height: 0.2, weight: 0.7 },
        { x: 0, y: 0.4, width: 1, height: 0.2, weight: 0.6 },
        { x: 0, y: 0.6, width: 1, height: 0.2, weight: 0.5 },
        { x: 0, y: 0.8, width: 1, height: 0.2, weight: 0.4 }
      ]
    };
  }

  createSpotReadingPattern() {
    return {
      name: 'spot-reading',
      description: 'Quick scanning of key information points',
      
      generatePath: (viewport) => {
        const path = [];
        const { width, height } = viewport;
        
        // Define interest points
        const spots = [
          { x: 0.5, y: 0.1 },  // Top center (title)
          { x: 0.8, y: 0.2 },  // Top right (price)
          { x: 0.2, y: 0.3 },  // Left (navigation)
          { x: 0.5, y: 0.5 },  // Center (main content)
          { x: 0.8, y: 0.8 },  // Bottom right (CTA)
        ];
        
        spots.forEach(spot => {
          path.push({
            x: width * spot.x,
            y: height * spot.y,
            duration: 300 + Math.random() * 200
          });
        });
        
        return path;
      },
      
      priorityZones: [
        { x: 0.4, y: 0, width: 0.2, height: 0.2, weight: 0.9 },   // Top center
        { x: 0.7, y: 0.1, width: 0.3, height: 0.2, weight: 0.8 }, // Top right
        { x: 0.4, y: 0.4, width: 0.2, height: 0.2, weight: 0.7 }  // Center
      ]
    };
  }

  async extractWithHumanPattern(page, dataType = 'listing') {
    console.log(`👁️ Starting human-like extraction for ${dataType}...`);
    
    // Step 1: Visual analysis
    const visualContext = await this.analyzeVisualContext(page);
    
    // Step 2: Select appropriate reading pattern
    const pattern = this.selectReadingPattern(visualContext);
    console.log(`📖 Using ${pattern.name} reading pattern`);
    
    // Step 3: Generate attention heatmap
    const heatmap = await this.generateAttentionHeatmap(page, visualContext);
    this.extractionState.attentionHeatmap = heatmap;
    
    // Step 4: Extract visible elements first
    const visibleElements = await this.extractVisibleElements(page);
    console.log(`👀 Found ${visibleElements.length} visible elements`);
    
    // Step 5: Apply reading pattern
    const readingPath = pattern.generatePath(await page.viewportSize());
    this.extractionState.readingPath = readingPath;
    
    // Step 6: Extract data in chunks following the pattern
    const extractedData = await this.extractDataInChunks(
      page,
      visibleElements,
      readingPath,
      dataType
    );
    
    // Step 7: Validate and enhance data
    const validatedData = await this.validateAndEnhanceData(extractedData, dataType);
    
    // Step 8: Calculate confidence scores
    this.calculateConfidenceScores(validatedData);
    
    return {
      data: validatedData,
      metadata: {
        pattern: pattern.name,
        confidence: this.extractionState.confidence,
        elementsProcessed: visibleElements.length,
        extractionTime: Date.now(),
        readingPath: readingPath.slice(0, 10) // First 10 points
      }
    };
  }

  async analyzeVisualContext(page) {
    const context = await page.evaluate(() => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      // Analyze layout complexity
      const elements = document.querySelectorAll('*');
      const complexity = {
        totalElements: elements.length,
        interactiveElements: document.querySelectorAll('a, button, input, select').length,
        textDensity: document.body.innerText.length / (viewport.width * viewport.height),
        imageCount: document.querySelectorAll('img').length,
        hasGrid: Array.from(elements).some(el => 
          window.getComputedStyle(el).display.includes('grid')
        ),
        hasSidebar: !!document.querySelector('aside, [class*="sidebar"]'),
        hasTable: !!document.querySelector('table')
      };
      
      // Color analysis
      const backgroundColor = window.getComputedStyle(document.body).backgroundColor;
      const primaryTextColor = window.getComputedStyle(document.body).color;
      
      // Find high contrast areas (likely important)
      const highContrastElements = [];
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        
        if (bg !== 'rgba(0, 0, 0, 0)' && color !== primaryTextColor) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 20) {
            highContrastElements.push({
              tag: el.tagName,
              class: el.className,
              position: { x: rect.x, y: rect.y },
              size: { width: rect.width, height: rect.height }
            });
          }
        }
      });
      
      return {
        viewport,
        complexity,
        colors: { backgroundColor, primaryTextColor },
        highContrastElements: highContrastElements.slice(0, 20)
      };
    });
    
    return context;
  }

  selectReadingPattern(visualContext) {
    const { complexity, viewport } = visualContext;
    
    // Select pattern based on layout
    if (complexity.hasTable) {
      return this.readingPatterns['layer-cake'];
    }
    
    if (complexity.hasGrid && complexity.interactiveElements > 20) {
      return this.readingPatterns['spot-reading'];
    }
    
    if (complexity.hasSidebar) {
      return this.readingPatterns['F-pattern'];
    }
    
    if (complexity.textDensity < 0.001) {
      return this.readingPatterns['Z-pattern'];
    }
    
    // Default to F-pattern
    return this.readingPatterns['F-pattern'];
  }

  async generateAttentionHeatmap(page, visualContext) {
    // Simulate visual attention based on:
    // 1. Position (top-left bias)
    // 2. Size (larger elements attract more)
    // 3. Contrast (high contrast attracts attention)
    // 4. Type (headings, buttons, images prioritized)
    
    const heatmap = await page.evaluate((context) => {
      const { viewport, highContrastElements } = context;
      const cells = 20; // Grid resolution
      const cellWidth = viewport.width / cells;
      const cellHeight = viewport.height / cells;
      
      // Initialize heatmap grid
      const grid = Array(cells).fill(null).map(() => Array(cells).fill(0));
      
      // Add attention for high contrast elements
      highContrastElements.forEach(element => {
        const cellX = Math.floor(element.position.x / cellWidth);
        const cellY = Math.floor(element.position.y / cellHeight);
        
        if (cellX >= 0 && cellX < cells && cellY >= 0 && cellY < cells) {
          // Higher weight for larger elements
          const sizeWeight = Math.min(1, (element.size.width * element.size.height) / 50000);
          grid[cellY][cellX] += sizeWeight * 0.5;
        }
      });
      
      // Add positional bias (top-left preference)
      for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
          const positionWeight = 1 - (x + y) / (cells * 2);
          grid[y][x] += positionWeight * 0.3;
        }
      }
      
      // Normalize values
      const maxValue = Math.max(...grid.flat());
      if (maxValue > 0) {
        for (let y = 0; y < cells; y++) {
          for (let x = 0; x < cells; x++) {
            grid[y][x] = grid[y][x] / maxValue;
          }
        }
      }
      
      return grid;
    }, visualContext);
    
    return heatmap;
  }

  async extractVisibleElements(page) {
    const visibleElements = await page.evaluate(() => {
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return rect.width > 0 &&
               rect.height > 0 &&
               rect.top < window.innerHeight &&
               rect.bottom > 0 &&
               rect.left < window.innerWidth &&
               rect.right > 0 &&
               style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
      };
      
      const elements = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        if (isVisible(el) && el.innerText && el.innerText.trim().length > 0) {
          const rect = el.getBoundingClientRect();
          elements.push({
            tag: el.tagName,
            class: el.className,
            id: el.id,
            text: el.innerText.substring(0, 1000),
            html: el.innerHTML.substring(0, 1000),
            position: { x: rect.x, y: rect.y },
            size: { width: rect.width, height: rect.height },
            attributes: Array.from(el.attributes).reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {})
          });
        }
      });
      
      // Sort by visual prominence (top-left to bottom-right)
      return elements.sort((a, b) => {
        const scoreA = a.position.y + a.position.x * 0.5;
        const scoreB = b.position.y + b.position.x * 0.5;
        return scoreA - scoreB;
      });
    });
    
    return visibleElements;
  }

  async extractDataInChunks(page, elements, readingPath, dataType) {
    const patterns = this.extractionPatterns[dataType];
    if (!patterns) {
      throw new Error(`Unknown data type: ${dataType}`);
    }
    
    const extractedData = [];
    const chunkSize = this.config.chunkSize;
    const totalChunks = Math.ceil(elements.length / chunkSize);
    
    console.log(`📦 Processing ${totalChunks} chunks of data...`);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkElements = elements.slice(i * chunkSize, (i + 1) * chunkSize);
      console.log(`  Chunk ${i + 1}/${totalChunks}: ${chunkElements.length} elements`);
      
      // Simulate reading delay based on content
      const readingDelay = this.calculateReadingDelay(chunkElements);
      await page.waitForTimeout(readingDelay);
      
      // Extract data from chunk
      for (const element of chunkElements) {
        const extracted = await this.extractFromElement(element, patterns.patterns);
        if (extracted && Object.keys(extracted).length > 0) {
          extractedData.push({
            ...extracted,
            _metadata: {
              position: element.position,
              size: element.size,
              chunkIndex: i
            }
          });
        }
      }
      
      // Simulate eye movement along reading path
      if (readingPath[i]) {
        await page.mouse.move(readingPath[i].x, readingPath[i].y);
        await page.waitForTimeout(readingPath[i].duration);
      }
    }
    
    return extractedData;
  }

  calculateReadingDelay(elements) {
    // Calculate delay based on text complexity and length
    let totalWords = 0;
    
    elements.forEach(el => {
      if (el.text) {
        totalWords += el.text.split(/\s+/).length;
      }
    });
    
    // Base reading speed: 250 words per minute
    const readingTime = (totalWords / this.config.readingSpeed) * 60000;
    
    // Add variation (±20%)
    const variation = 0.8 + Math.random() * 0.4;
    
    // Minimum 500ms, maximum 5000ms per chunk
    return Math.max(500, Math.min(5000, readingTime * variation));
  }

  async extractFromElement(element, patterns) {
    const extracted = {};
    
    for (const pattern of patterns) {
      let value = null;
      
      // Try selectors first
      if (pattern.selectors) {
        for (const selector of pattern.selectors) {
          if (element.class && element.class.includes(selector.replace('.', ''))) {
            value = element.text;
            break;
          }
          if (element.attributes && element.attributes.class && 
              element.attributes.class.includes(selector.replace('[class*="', '').replace('"]', ''))) {
            value = element.text;
            break;
          }
        }
      }
      
      // Try regex extraction
      if (!value && pattern.regex && element.text) {
        const match = element.text.match(pattern.regex);
        if (match) {
          value = match[1] || match[0];
        }
      }
      
      // Validate extracted value
      if (value && pattern.validation) {
        if (!pattern.validation(value)) {
          value = null;
        }
      }
      
      if (value) {
        extracted[pattern.name] = this.cleanExtractedValue(value, pattern.name);
      }
    }
    
    return extracted;
  }

  cleanExtractedValue(value, fieldName) {
    if (typeof value !== 'string') return value;
    
    // Clean whitespace
    value = value.trim().replace(/\s+/g, ' ');
    
    // Field-specific cleaning
    switch (fieldName) {
      case 'price':
      case 'revenue':
      case 'profit':
        // Extract numeric value
        value = value.replace(/[^0-9.,]/g, '');
        value = parseFloat(value.replace(/,/g, ''));
        break;
        
      case 'multiple':
        // Extract float
        value = parseFloat(value.replace(/[^0-9.]/g, ''));
        break;
        
      case 'category':
        // Capitalize
        value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        break;
        
      case 'age':
        // Extract time value
        const match = value.match(/(\d+)\s*(year|month|day)/i);
        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          value = { value: num, unit: unit };
        }
        break;
        
      case 'traffic':
        // Extract numeric value
        value = parseInt(value.replace(/[^0-9]/g, ''));
        break;
    }
    
    return value;
  }

  async validateAndEnhanceData(data, dataType) {
    const patterns = this.extractionPatterns[dataType];
    const validated = [];
    
    for (const item of data) {
      let isValid = true;
      
      // Check relationships if defined
      if (patterns.relationships) {
        for (const [rel, validator] of Object.entries(patterns.relationships)) {
          const [field1, field2] = rel.split('-');
          if (item[field1] && item[field2]) {
            if (!validator(item[field1], item[field2])) {
              console.warn(`Relationship ${rel} failed for item:`, item);
              isValid = false;
            }
          }
        }
      }
      
      // Enhance with calculated fields
      if (isValid) {
        const enhanced = { ...item };
        
        // Calculate missing fields if possible
        if (enhanced.price && enhanced.revenue && !enhanced.multiple) {
          enhanced.multiple = Math.round((enhanced.price / (enhanced.revenue * 12)) * 10) / 10;
        }
        
        if (enhanced.revenue && enhanced.profit && !enhanced.margin) {
          enhanced.margin = Math.round((enhanced.profit / enhanced.revenue) * 100);
        }
        
        // Add quality score
        enhanced._quality = this.calculateQualityScore(enhanced, patterns.patterns);
        
        validated.push(enhanced);
      }
    }
    
    // Sort by quality and position
    validated.sort((a, b) => {
      const scoreA = a._quality * 0.7 + (1 - a._metadata.position.y / 1000) * 0.3;
      const scoreB = b._quality * 0.7 + (1 - b._metadata.position.y / 1000) * 0.3;
      return scoreB - scoreA;
    });
    
    return validated;
  }

  calculateQualityScore(item, patterns) {
    let score = 0;
    let totalWeight = 0;
    
    patterns.forEach(pattern => {
      if (item[pattern.name] !== undefined && item[pattern.name] !== null) {
        score += pattern.importance;
      }
      totalWeight += pattern.importance;
    });
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  calculateConfidenceScores(data) {
    // Overall extraction confidence
    const fieldCoverage = this.calculateFieldCoverage(data);
    const dataConsistency = this.calculateDataConsistency(data);
    const patternMatch = this.calculatePatternMatch(data);
    
    this.extractionState.confidence = {
      overall: (fieldCoverage + dataConsistency + patternMatch) / 3,
      fieldCoverage,
      dataConsistency,
      patternMatch,
      itemCount: data.length
    };
  }

  calculateFieldCoverage(data) {
    if (data.length === 0) return 0;
    
    const fieldCounts = {};
    let totalFields = 0;
    
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (!key.startsWith('_')) {
          fieldCounts[key] = (fieldCounts[key] || 0) + 1;
          totalFields++;
        }
      });
    });
    
    // Average field presence
    const avgFieldsPerItem = totalFields / data.length;
    const expectedFields = 5; // Adjust based on data type
    
    return Math.min(1, avgFieldsPerItem / expectedFields);
  }

  calculateDataConsistency(data) {
    if (data.length < 2) return 1;
    
    // Check for consistent data types and ranges
    const fieldStats = {};
    
    data.forEach(item => {
      Object.entries(item).forEach(([key, value]) => {
        if (!key.startsWith('_')) {
          if (!fieldStats[key]) {
            fieldStats[key] = { types: new Set(), values: [] };
          }
          fieldStats[key].types.add(typeof value);
          fieldStats[key].values.push(value);
        }
      });
    });
    
    // Calculate consistency score
    let consistencyScore = 0;
    let fieldCount = 0;
    
    Object.values(fieldStats).forEach(stats => {
      // Type consistency
      const typeConsistency = 1 / stats.types.size;
      
      // Value range consistency (for numbers)
      let rangeConsistency = 1;
      if (stats.values.every(v => typeof v === 'number')) {
        const mean = stats.values.reduce((a, b) => a + b, 0) / stats.values.length;
        const stdDev = Math.sqrt(
          stats.values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / stats.values.length
        );
        const cv = stdDev / mean; // Coefficient of variation
        rangeConsistency = Math.max(0, 1 - cv);
      }
      
      consistencyScore += (typeConsistency + rangeConsistency) / 2;
      fieldCount++;
    });
    
    return fieldCount > 0 ? consistencyScore / fieldCount : 0;
  }

  calculatePatternMatch(data) {
    // Check if extracted data matches expected patterns
    let patternScore = 0;
    
    data.forEach(item => {
      let itemScore = 0;
      
      // Price should be positive
      if (item.price && item.price > 0) itemScore += 0.2;
      
      // Revenue should be less than price (usually)
      if (item.price && item.revenue && item.revenue * 12 < item.price) itemScore += 0.2;
      
      // Profit should be less than revenue
      if (item.revenue && item.profit && item.profit < item.revenue) itemScore += 0.2;
      
      // Multiple should be reasonable
      if (item.multiple && item.multiple > 0 && item.multiple < 10) itemScore += 0.2;
      
      // Should have at least title or category
      if (item.title || item.category) itemScore += 0.2;
      
      patternScore += itemScore;
    });
    
    return data.length > 0 ? patternScore / data.length : 0;
  }

  // Natural language understanding for semantic extraction
  async extractWithSemanticUnderstanding(page, text) {
    if (!this.config.semanticUnderstanding) return null;
    
    // Tokenize text
    const tokens = this.nlp.tokenizer.tokenize(text);
    
    // Identify key phrases
    const keyPhrases = this.extractKeyPhrases(tokens);
    
    // Sentiment analysis
    const sentiment = this.nlp.sentiment.getSentiment(tokens);
    
    // Entity recognition (simplified)
    const entities = this.recognizeEntities(text);
    
    return {
      keyPhrases,
      sentiment,
      entities,
      summary: this.generateSummary(text, keyPhrases)
    };
  }

  extractKeyPhrases(tokens) {
    // Simple key phrase extraction based on frequency and position
    const phrases = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    // Bigrams and trigrams
    for (let i = 0; i < tokens.length - 1; i++) {
      if (!stopWords.has(tokens[i].toLowerCase())) {
        // Bigram
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        phrases[bigram] = (phrases[bigram] || 0) + 1;
        
        // Trigram
        if (i < tokens.length - 2) {
          const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
          phrases[trigram] = (phrases[trigram] || 0) + 1;
        }
      }
    }
    
    // Sort by frequency
    return Object.entries(phrases)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase, count]) => ({ phrase, count }));
  }

  recognizeEntities(text) {
    const entities = {
      money: [],
      percentage: [],
      time: [],
      business: []
    };
    
    // Money entities
    const moneyRegex = /\$[\d,]+(?:\.\d{2})?|\d+\s*(?:USD|dollars?|k|m|million|billion)/gi;
    const moneyMatches = text.match(moneyRegex);
    if (moneyMatches) {
      entities.money = moneyMatches;
    }
    
    // Percentage entities
    const percentRegex = /\d+(?:\.\d+)?%|\d+\s*percent/gi;
    const percentMatches = text.match(percentRegex);
    if (percentMatches) {
      entities.percentage = percentMatches;
    }
    
    // Time entities
    const timeRegex = /\d+\s*(?:year|month|week|day|hour)s?\s*(?:ago|old)?/gi;
    const timeMatches = text.match(timeRegex);
    if (timeMatches) {
      entities.time = timeMatches;
    }
    
    // Business entities (simplified)
    const businessTerms = ['revenue', 'profit', 'sales', 'customers', 'traffic', 'conversion'];
    businessTerms.forEach(term => {
      const regex = new RegExp(`${term}[:\\s]+[\\$\\d,]+`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        entities.business.push(...matches);
      }
    });
    
    return entities;
  }

  generateSummary(text, keyPhrases) {
    // Simple extractive summary
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length <= 3) {
      return text;
    }
    
    // Score sentences based on key phrase presence
    const scoredSentences = sentences.map(sentence => {
      let score = 0;
      
      // Check for key phrases
      keyPhrases.forEach(({ phrase, count }) => {
        if (sentence.toLowerCase().includes(phrase.toLowerCase())) {
          score += count;
        }
      });
      
      // Bonus for sentences with numbers
      if (/\d/.test(sentence)) {
        score += 2;
      }
      
      // Position bias (earlier sentences often more important)
      const position = sentences.indexOf(sentence);
      score += (sentences.length - position) / sentences.length;
      
      return { sentence, score };
    });
    
    // Select top 3 sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
      .map(item => item.sentence.trim());
    
    return topSentences.join('. ') + '.';
  }

  // Export extraction results
  formatExtractionResults(results) {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: results.data,
      metadata: {
        ...results.metadata,
        extractionMethod: this.config.extractionStrategy,
        confidence: this.extractionState.confidence,
        readingPattern: results.metadata.pattern,
        processingTime: Date.now() - results.metadata.extractionTime
      },
      summary: {
        totalItems: results.data.length,
        highQualityItems: results.data.filter(item => item._quality > 0.8).length,
        averageQuality: results.data.reduce((sum, item) => sum + item._quality, 0) / results.data.length,
        fieldCoverage: this.extractionState.confidence.fieldCoverage,
        confidence: this.extractionState.confidence.overall
      }
    };
  }
}

module.exports = IntelligentDataExtractor;