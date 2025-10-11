// intelligent-extractor.ts
// Intelligent data extraction that mimics human reading patterns

import { Page, ElementHandle } from 'playwright';
import { BrowsingPersona } from './personas';
import { InteractionContext } from './contextual-interaction';

export interface ExtractionStrategy {
  pattern: 'top-down' | 'f-pattern' | 'z-pattern' | 'spotlight' | 'selective';
  focusAreas: string[];
  readingDepth: 'skim' | 'normal' | 'detailed';
  priorityElements: string[];
}

export interface ExtractedData {
  url: string;
  title: string;
  timestamp: Date;
  readingTime: number;
  confidence: number;
  data: Record<string, any>;
  metadata: {
    extractionPattern: string;
    elementsRead: number;
    skippedSections: string[];
    focusTime: Record<string, number>;
  };
}

export interface ReadingBehavior {
  fixationDuration: number; // milliseconds per word
  saccadeLength: number; // words per jump
  regressionProbability: number; // chance of re-reading
  skimmingSpeed: number; // multiplier for fast reading
}

export class IntelligentDataExtractor {
  private persona: BrowsingPersona;
  private readingBehavior: ReadingBehavior;
  private extractedData: Map<string, ExtractedData> = new Map();
  private currentFocus: { element: string; startTime: number } | null = null;
  private readingPath: Array<{ element: string; timestamp: number }> = [];

  constructor(persona: BrowsingPersona) {
    this.persona = persona;
    this.readingBehavior = this.calculateReadingBehavior();
  }

  private calculateReadingBehavior(): ReadingBehavior {
    const baseFixation = 60000 / this.persona.behavior.readingSpeed; // ms per word
    
    return {
      fixationDuration: baseFixation,
      saccadeLength: this.persona.profile.experience === 'expert' ? 15 : 7,
      regressionProbability: this.persona.profile.experience === 'beginner' ? 0.3 : 0.1,
      skimmingSpeed: this.persona.preferences.detailLevel === 'quick' ? 0.3 : 0.7
    };
  }

  async extractWithHumanPattern(
    page: Page, 
    context: InteractionContext
  ): Promise<ExtractedData> {
    const startTime = Date.now();
    const strategy = this.determineExtractionStrategy(context);
    
    // Start extraction process
    console.log(`Beginning ${strategy.pattern} extraction pattern`);
    
    const extractedData: ExtractedData = {
      url: page.url(),
      title: await page.title(),
      timestamp: new Date(),
      readingTime: 0,
      confidence: 0,
      data: {},
      metadata: {
        extractionPattern: strategy.pattern,
        elementsRead: 0,
        skippedSections: [],
        focusTime: {}
      }
    };

    // Execute extraction based on pattern
    switch (strategy.pattern) {
      case 'f-pattern':
        await this.extractFPattern(page, strategy, extractedData);
        break;
      case 'z-pattern':
        await this.extractZPattern(page, strategy, extractedData);
        break;
      case 'top-down':
        await this.extractTopDown(page, strategy, extractedData);
        break;
      case 'spotlight':
        await this.extractSpotlight(page, strategy, extractedData);
        break;
      case 'selective':
        await this.extractSelective(page, strategy, extractedData);
        break;
    }

    // Calculate final metrics
    extractedData.readingTime = Date.now() - startTime;
    extractedData.confidence = this.calculateConfidence(extractedData);
    
    // Store for later reference
    this.extractedData.set(page.url(), extractedData);
    
    return extractedData;
  }

  private determineExtractionStrategy(context: InteractionContext): ExtractionStrategy {
    const strategy: ExtractionStrategy = {
      pattern: 'f-pattern',
      focusAreas: this.persona.behavior.focusAreas,
      readingDepth: 'normal',
      priorityElements: []
    };

    // Determine pattern based on page type and persona
    if (context.pageType === 'details') {
      // Detailed pages get more thorough reading
      strategy.pattern = this.persona.preferences.detailLevel === 'detailed' ? 'top-down' : 'selective';
      strategy.readingDepth = 'detailed';
    } else if (context.pageType === 'listing') {
      // Listing pages get F-pattern (natural for lists)
      strategy.pattern = 'f-pattern';
      strategy.readingDepth = 'skim';
    } else if (context.contentDensity === 'low') {
      // Low density pages get Z-pattern
      strategy.pattern = 'z-pattern';
      strategy.readingDepth = 'normal';
    }

    // Expert users use spotlight pattern more
    if (this.persona.profile.experience === 'expert' && context.interestScore > 70) {
      strategy.pattern = 'spotlight';
      strategy.readingDepth = 'skim';
    }

    // Set priority elements based on focus areas
    strategy.priorityElements = this.mapFocusAreaToSelectors(this.persona.behavior.focusAreas);

    return strategy;
  }

  private mapFocusAreaToSelectors(focusAreas: string[]): string[] {
    const selectorMap: Record<string, string[]> = {
      'price': ['.price', '[data-price]', '[class*="price"]', '.cost'],
      'revenue': ['.revenue', '[data-revenue]', '[class*="revenue"]', '.income'],
      'traffic': ['.traffic', '[class*="visitor"]', '.metrics', '[data-traffic]'],
      'description': ['.description', '[class*="desc"]', '.summary', 'p'],
      'financials': ['.financials', '[class*="financial"]', '.profit', '.expenses'],
      'growth metrics': ['.growth', '[class*="growth"]', '.trend', '.performance'],
      'category': ['.category', '[class*="category"]', '.type', '.niche'],
      'history': ['.history', '.established', '[class*="founded"]', '.age'],
      'tech stack': ['.tech', '.technology', '[class*="stack"]', '.platform']
    };

    const selectors: string[] = [];
    for (const area of focusAreas) {
      selectors.push(...(selectorMap[area] || []));
    }
    return Array.from(new Set(selectors)); // Remove duplicates
  }

  private async extractFPattern(
    page: Page, 
    strategy: ExtractionStrategy, 
    result: ExtractedData
  ) {
    // F-pattern: Heavy reading on top, scan left side, selective horizontal reading
    console.log('Executing F-pattern reading behavior');

    // Top horizontal reading
    const topElements = await page.$$('h1, h2, .header, [class*="title"]');
    for (const element of topElements.slice(0, 3)) {
      await this.readElement(page, element, 'detailed', result);
    }

    // Left side scanning
    const leftElements = await page.$$('.sidebar, nav, [class*="filter"], [class*="category"]');
    for (const element of leftElements) {
      await this.readElement(page, element, 'skim', result);
    }

    // Selective horizontal scanning of content
    const contentRows = await page.$$('.listing-card, .result-item, article, .card');
    const rowsToRead = Math.min(contentRows.length, 5 + Math.floor(Math.random() * 5));
    
    for (let i = 0; i < rowsToRead; i++) {
      const row = contentRows[i];
      
      // Read beginning of row thoroughly
      const priorityInRow = await row.$$(strategy.priorityElements.join(', '));
      for (const elem of priorityInRow.slice(0, 2)) {
        await this.readElement(page, elem, 'normal', result);
      }

      // Skim rest of row
      await this.skimElement(page, row, result);
      
      // Natural reading progression
      if (i < rowsToRead - 1) {
        await this.simulateReadingProgression(page);
      }
    }
  }

  private async extractZPattern(
    page: Page, 
    strategy: ExtractionStrategy, 
    result: ExtractedData
  ) {
    // Z-pattern: Top-left to top-right, diagonal to bottom-left, then bottom-right
    console.log('Executing Z-pattern reading behavior');

    // Top-left (logo/brand)
    const topLeft = await page.$('header :first-child, .logo, .brand');
    if (topLeft) await this.readElement(page, topLeft, 'skim', result);

    // Top-right (navigation/CTA)
    const topRight = await page.$('header :last-child, .cta, .primary-action');
    if (topRight) await this.readElement(page, topRight, 'normal', result);

    // Diagonal scan to main content
    await this.simulateDiagonalScan(page);

    // Bottom-left (secondary info)
    const bottomLeft = await page.$('footer :first-child, .secondary-info');
    if (bottomLeft) await this.readElement(page, bottomLeft, 'skim', result);

    // Bottom-right (action items)
    const bottomRight = await page.$('footer :last-child, .actions, .submit');
    if (bottomRight) await this.readElement(page, bottomRight, 'normal', result);

    // Fill in important content along the path
    for (const selector of strategy.priorityElements) {
      const elements = await page.$$(selector);
      for (const elem of elements.slice(0, 3)) {
        await this.readElement(page, elem, 'normal', result);
      }
    }
  }

  private async extractTopDown(
    page: Page, 
    strategy: ExtractionStrategy, 
    result: ExtractedData
  ) {
    // Top-down: Methodical reading from top to bottom
    console.log('Executing top-down reading pattern');

    const allElements = await page.$$('h1, h2, h3, p, .content, [class*="description"], li');
    
    let currentPosition = 0;
    for (const element of allElements) {
      const isVisible = await element.isVisible();
      if (!isVisible) continue;

      const elementText = await element.textContent();
      if (!elementText || elementText.trim().length < 10) continue;

      // Determine reading depth based on element importance
      const isImportant = await this.isImportantElement(element, strategy.priorityElements);
      const readingDepth = isImportant ? 'detailed' : 'normal';

      await this.readElement(page, element, readingDepth, result);

      // Occasional regressions (re-reading)
      if (Math.random() < this.readingBehavior.regressionProbability && currentPosition > 0) {
        console.log('Regression: re-reading previous element');
        const previousElement = allElements[currentPosition - 1];
        await this.readElement(page, previousElement, 'skim', result);
      }

      currentPosition++;

      // Check if we should stop (attention span)
      if (await this.shouldStopReading(result)) {
        result.metadata.skippedSections.push('bottom-content');
        break;
      }
    }
  }

  private async extractSpotlight(
    page: Page, 
    strategy: ExtractionStrategy, 
    result: ExtractedData
  ) {
    // Spotlight: Focus on specific high-value areas
    console.log('Executing spotlight extraction pattern');

    // Find all priority elements
    const spotlights: Array<{ element: ElementHandle; importance: number }> = [];
    
    for (const selector of strategy.priorityElements) {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const importance = await this.calculateElementImportance(element, strategy);
        spotlights.push({ element, importance });
      }
    }

    // Sort by importance
    spotlights.sort((a, b) => b.importance - a.importance);

    // Focus on top elements
    for (const { element, importance } of spotlights.slice(0, 10)) {
      // Scroll to element naturally
      await this.scrollToElement(page, element);
      
      // Read with depth based on importance
      const depth = importance > 0.8 ? 'detailed' : importance > 0.5 ? 'normal' : 'skim';
      await this.readElement(page, element, depth, result);

      // Look at surrounding context briefly
      await this.readSurroundingContext(page, element, result);
    }
  }

  private async extractSelective(
    page: Page, 
    strategy: ExtractionStrategy, 
    result: ExtractedData
  ) {
    // Selective: Smart selection based on persona interests
    console.log('Executing selective extraction pattern');

    // Build interest map
    const interestMap = new Map<string, number>();
    for (const interest of this.persona.profile.interests) {
      interestMap.set(interest.toLowerCase(), 1.0);
    }

    // Find all text-containing elements
    const textElements = await page.$$('p, div, span, h1, h2, h3, h4, h5, h6, li, td');
    
    // Score and filter elements
    const scoredElements: Array<{ element: ElementHandle; score: number }> = [];
    
    for (const element of textElements) {
      const text = await element.textContent();
      if (!text || text.trim().length < 20) continue;

      let score = 0;
      const lowerText = text.toLowerCase();
      
      // Check interest alignment
      interestMap.forEach((weight, interest) => {
        if (lowerText.includes(interest)) {
          score += weight;
        }
      });

      // Check priority selectors
      for (const selector of strategy.priorityElements) {
        const matches = await element.evaluate((el, sel) => el.matches(sel), selector);
        if (matches) score += 0.5;
      }

      if (score > 0) {
        scoredElements.push({ element, score });
      }
    }

    // Sort by score and read top elements
    scoredElements.sort((a, b) => b.score - a.score);
    
    for (const { element, score } of scoredElements.slice(0, 15)) {
      const depth = score > 1.5 ? 'detailed' : score > 0.8 ? 'normal' : 'skim';
      await this.readElement(page, element, depth, result);
    }
  }

  private async readElement(
    page: Page, 
    element: ElementHandle, 
    depth: 'skim' | 'normal' | 'detailed',
    result: ExtractedData
  ) {
    try {
      const text = await element.textContent();
      if (!text) return;

      const wordCount = text.split(/\s+/).length;
      const baseTime = wordCount * this.readingBehavior.fixationDuration;
      
      // Adjust time based on reading depth
      const depthMultiplier = depth === 'detailed' ? 1.5 : depth === 'skim' ? 0.5 : 1;
      const readingTime = baseTime * depthMultiplier;

      // Track focus
      const selector = await this.getElementSelector(element);
      this.currentFocus = { element: selector, startTime: Date.now() };

      // Simulate eye movement
      await this.simulateEyeMovement(page, element, wordCount, depth);

      // Wait for reading time
      await page.waitForTimeout(readingTime);

      // Extract data based on element type
      const extractedValue = await this.extractElementData(element);
      if (extractedValue) {
        const key = await this.generateDataKey(element);
        result.data[key] = extractedValue;
      }

      // Update metadata
      result.metadata.elementsRead++;
      if (selector) {
        result.metadata.focusTime[selector] = 
          (result.metadata.focusTime[selector] || 0) + readingTime;
      }

      // Record reading path
      this.readingPath.push({ element: selector, timestamp: Date.now() });

    } catch (error) {
      console.error('Error reading element:', error);
    }
  }

  private async skimElement(
    page: Page, 
    element: ElementHandle,
    result: ExtractedData
  ) {
    // Quick scanning behavior
    const text = await element.textContent();
    if (!text) return;

    const wordCount = text.split(/\s+/).length;
    const skimTime = wordCount * this.readingBehavior.fixationDuration * this.readingBehavior.skimmingSpeed;

    await page.waitForTimeout(skimTime);
    
    // Extract only key information during skim
    const keyInfo = await element.$$eval(
      'strong, b, .highlight, [class*="important"]',
      els => els.map(el => el.textContent).filter(t => t)
    );

    if (keyInfo.length > 0) {
      const key = await this.generateDataKey(element);
      result.data[`${key}_highlights`] = keyInfo;
    }
  }

  private async simulateEyeMovement(
    page: Page, 
    element: ElementHandle, 
    wordCount: number,
    depth: string
  ) {
    const box = await element.boundingBox();
    if (!box) return;

    // Calculate reading pattern
    const lines = Math.ceil(wordCount / 10); // Assume ~10 words per line
    const saccades = Math.ceil(wordCount / this.readingBehavior.saccadeLength);

    for (let i = 0; i < saccades; i++) {
      const progress = i / saccades;
      const lineProgress = (i % 3) / 3; // Assume 3 saccades per line
      
      const x = box.x + (box.width * lineProgress);
      const y = box.y + (box.height * progress);

      // Natural eye movement
      await page.mouse.move(x, y);
      
      // Fixation pause
      if (depth === 'detailed' && Math.random() < 0.3) {
        await page.waitForTimeout(this.readingBehavior.fixationDuration * 2);
      }
    }
  }

  private async simulateDiagonalScan(page: Page) {
    const viewport = page.viewportSize() || { width: 1920, height: 1080 };
    
    // Diagonal movement from top-right to bottom-left
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = viewport.width * (1 - progress * 0.8);
      const y = viewport.height * progress * 0.8;
      
      await page.mouse.move(x, y);
      await page.waitForTimeout(100 + Math.random() * 100);
    }
  }

  private async simulateReadingProgression(page: Page) {
    // Natural pause between content sections
    await page.waitForTimeout(300 + Math.random() * 700);
    
    // Small vertical scroll
    await page.evaluate(() => window.scrollBy(0, 50 + Math.random() * 50));
  }

  private async scrollToElement(page: Page, element: ElementHandle) {
    await element.scrollIntoViewIfNeeded();
    
    // Natural scroll adjustment
    const box = await element.boundingBox();
    if (box) {
      const viewport = page.viewportSize() || { width: 1920, height: 1080 };
      const targetY = box.y - viewport.height / 3; // Position element in upper third
      
      await page.evaluate((y) => {
        window.scrollTo({
          top: y,
          behavior: 'smooth'
        });
      }, targetY);
      
      await page.waitForTimeout(500 + Math.random() * 500);
    }
  }

  private async readSurroundingContext(
    page: Page, 
    element: ElementHandle,
    result: ExtractedData
  ) {
    // Look at elements before and after
    const siblings = await element.evaluate(el => {
      const htmlEl = el as HTMLElement;
      const prev = htmlEl.previousElementSibling?.textContent;
      const next = htmlEl.nextElementSibling?.textContent;
      return { prev, next };
    });

    if (siblings.prev) {
      result.data['context_before'] = siblings.prev.substring(0, 100);
    }
    if (siblings.next) {
      result.data['context_after'] = siblings.next.substring(0, 100);
    }
  }

  private async isImportantElement(
    element: ElementHandle, 
    prioritySelectors: string[]
  ): Promise<boolean> {
    for (const selector of prioritySelectors) {
      const matches = await element.evaluate((el, sel) => (el as Element).matches(sel), selector);
      if (matches) return true;
    }
    return false;
  }

  private async calculateElementImportance(
    element: ElementHandle,
    strategy: ExtractionStrategy
  ): Promise<number> {
    let importance = 0.5; // Base importance

    // Check priority selectors
    for (const selector of strategy.priorityElements) {
      const matches = await element.evaluate((el, sel) => (el as Element).matches(sel), selector);
      if (matches) importance += 0.2;
    }

    // Check visibility and position
    const box = await element.boundingBox();
    if (box) {
      const viewport = await element.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }));
      
      // Above the fold is more important
      if (box.y < viewport.height) importance += 0.1;
      
      // Center of screen is more important
      const centerDistance = Math.abs(box.x + box.width/2 - viewport.width/2);
      if (centerDistance < viewport.width * 0.2) importance += 0.1;
    }

    // Check text content relevance
    const text = await element.textContent();
    if (text) {
      for (const area of strategy.focusAreas) {
        if (text.toLowerCase().includes(area)) importance += 0.15;
      }
    }

    return Math.min(1, importance);
  }

  private async shouldStopReading(result: ExtractedData): Promise<boolean> {
    // Check attention span based on persona
    const maxElements = this.persona.preferences.detailLevel === 'detailed' ? 50 :
                       this.persona.preferences.detailLevel === 'quick' ? 15 : 30;
    
    if (result.metadata.elementsRead >= maxElements) {
      console.log('Reached attention span limit');
      return true;
    }

    // Check reading time
    const maxTime = this.persona.behavior.dwellTime.max * 1000;
    if (result.readingTime > maxTime) {
      console.log('Exceeded maximum reading time');
      return true;
    }

    // Random early exit for natural behavior
    if (Math.random() < 0.05) { // 5% chance per element
      console.log('Random early exit (distraction/loss of interest)');
      return true;
    }

    return false;
  }

  private async extractElementData(element: ElementHandle): Promise<any> {
    const tagName = await element.evaluate(el => (el as Element).tagName.toLowerCase());
    
    switch (tagName) {
      case 'input':
      case 'select':
      case 'textarea':
        return await element.evaluate(el => (el as HTMLInputElement).value);
      
      case 'img':
        return await element.evaluate(el => ({
          src: (el as HTMLImageElement).src,
          alt: (el as HTMLImageElement).alt
        }));
      
      case 'a':
        return await element.evaluate(el => ({
          text: el.textContent,
          href: (el as HTMLAnchorElement).href
        }));
      
      default:
        const text = await element.textContent();
        
        // Try to parse structured data
        if (text) {
          // Price detection
          const priceMatch = text.match(/[$€£]\s*[\d,]+\.?\d*/);
          if (priceMatch) return { type: 'price', value: priceMatch[0] };
          
          // Number detection
          const numberMatch = text.match(/\d{1,3}(,\d{3})*(\.\d+)?/);
          if (numberMatch && !text.match(/[a-zA-Z]/)) {
            return { type: 'number', value: numberMatch[0] };
          }
          
          // Date detection
          const dateMatch = text.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/);
          if (dateMatch) return { type: 'date', value: dateMatch[0] };
        }
        
        return text?.trim();
    }
  }

  private async generateDataKey(element: ElementHandle): Promise<string> {
    const attributes = await element.evaluate(el => {
      const htmlEl = el as HTMLElement;
      return {
        id: htmlEl.id,
        className: htmlEl.className,
        tagName: htmlEl.tagName.toLowerCase(),
        role: htmlEl.getAttribute('role'),
        dataTestId: htmlEl.getAttribute('data-testid'),
        ariaLabel: htmlEl.getAttribute('aria-label')
      };
    });

    // Generate meaningful key
    if (attributes.id) return attributes.id;
    if (attributes.dataTestId) return attributes.dataTestId;
    if (attributes.ariaLabel) return attributes.ariaLabel.replace(/\s+/g, '_');
    if (attributes.className) {
      const mainClass = attributes.className.split(' ')[0];
      return `${attributes.tagName}_${mainClass}`;
    }
    
    return `${attributes.tagName}_${Date.now()}`;
  }

  private async getElementSelector(element: ElementHandle): Promise<string> {
    return await element.evaluate(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.id) return `#${htmlEl.id}`;
      if (htmlEl.className) return `.${htmlEl.className.split(' ')[0]}`;
      return htmlEl.tagName.toLowerCase();
    });
  }

  private calculateConfidence(data: ExtractedData): number {
    let confidence = 0.5; // Base confidence

    // More elements read = higher confidence
    confidence += Math.min(0.2, data.metadata.elementsRead / 50 * 0.2);

    // More data extracted = higher confidence
    const dataPoints = Object.keys(data.data).length;
    confidence += Math.min(0.2, dataPoints / 20 * 0.2);

    // Proper reading time = higher confidence
    const expectedTime = data.metadata.elementsRead * this.readingBehavior.fixationDuration * 10;
    const timeRatio = data.readingTime / expectedTime;
    if (timeRatio > 0.7 && timeRatio < 1.5) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  getExtractionSummary(): Record<string, any> {
    const summary = {
      totalExtractions: this.extractedData.size,
      averageConfidence: 0,
      totalDataPoints: 0,
      commonPatterns: {} as Record<string, number>,
      readingBehavior: {
        averageReadingTime: 0,
        preferredPattern: '',
        focusAreaCoverage: {} as Record<string, number>
      }
    };

    let totalConfidence = 0;
    let totalReadingTime = 0;
    const patternCounts: Record<string, number> = {};

    Array.from(this.extractedData.values()).forEach(extraction => {
      totalConfidence += extraction.confidence;
      totalReadingTime += extraction.readingTime;
      summary.totalDataPoints += Object.keys(extraction.data).length;
      
      // Count patterns
      const pattern = extraction.metadata.extractionPattern;
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      
      // Analyze focus areas
      Object.entries(extraction.metadata.focusTime).forEach(([element, time]) => {
        summary.readingBehavior.focusAreaCoverage[element] = 
          (summary.readingBehavior.focusAreaCoverage[element] || 0) + (time as number);
      });
    });

    summary.averageConfidence = totalConfidence / this.extractedData.size;
    summary.readingBehavior.averageReadingTime = totalReadingTime / this.extractedData.size;
    summary.commonPatterns = patternCounts;
    summary.readingBehavior.preferredPattern = 
      Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    return summary;
  }
}

export default IntelligentDataExtractor;