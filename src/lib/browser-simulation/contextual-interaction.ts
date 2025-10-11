// contextual-interaction.ts
// Contextual interaction patterns that respond naturally to page content

import { Page, ElementHandle } from 'playwright';
import { BrowsingPersona } from './personas';

export interface InteractionContext {
  pageType: 'listing' | 'search' | 'details' | 'category' | 'unknown';
  contentDensity: 'low' | 'medium' | 'high';
  visualComplexity: number; // 0-10
  interestScore: number; // 0-100
  elementImportance: Map<string, number>;
}

export interface InteractionPlan {
  sequence: InteractionStep[];
  estimatedDuration: number;
  priority: 'high' | 'medium' | 'low';
}

export interface InteractionStep {
  type: 'scroll' | 'click' | 'hover' | 'read' | 'focus' | 'pause';
  target?: string; // CSS selector
  duration?: number;
  options?: any;
}

export class ContextualInteractionEngine {
  private persona: BrowsingPersona;
  private context: InteractionContext | null = null;
  private interactionHistory: InteractionStep[] = [];
  private attentionMap: Map<string, number> = new Map();

  constructor(persona: BrowsingPersona) {
    this.persona = persona;
  }

  async analyzePageContext(page: Page): Promise<InteractionContext> {
    const context: InteractionContext = {
      pageType: await this.detectPageType(page),
      contentDensity: await this.assessContentDensity(page),
      visualComplexity: await this.calculateVisualComplexity(page),
      interestScore: 0,
      elementImportance: new Map()
    };

    // Analyze element importance based on persona interests
    await this.analyzeElementImportance(page, context);
    
    // Calculate interest score based on content matching persona preferences
    context.interestScore = await this.calculateInterestScore(page, context);

    this.context = context;
    return context;
  }

  private async detectPageType(page: Page): Promise<InteractionContext['pageType']> {
    const url = page.url();
    const title = await page.title();

    // Check URL patterns
    if (url.includes('/search') || url.includes('filter')) return 'search';
    if (url.includes('/listing/') || url.includes('/business/')) return 'details';
    if (url.includes('/category/') || url.includes('/browse/')) return 'category';
    
    // Check page structure
    const hasListings = await page.$$('.listing-card, .business-card, [data-listing]').then(els => els.length > 0);
    if (hasListings) return 'listing';

    // Check content patterns
    const hasDetailedInfo = await page.$$('.price, .revenue, .profit, .description').then(els => els.length >= 3);
    if (hasDetailedInfo) return 'details';

    return 'unknown';
  }

  private async assessContentDensity(page: Page): Promise<'low' | 'medium' | 'high'> {
    const textLength = await page.evaluate(() => document.body.innerText.length);
    const elementCount = await page.$$('*').then(els => els.length);
    const ratio = textLength / elementCount;

    if (ratio < 10) return 'low';
    if (ratio < 30) return 'medium';
    return 'high';
  }

  private async calculateVisualComplexity(page: Page): Promise<number> {
    const metrics = await page.evaluate(() => {
      const images = document.querySelectorAll('img').length;
      const colors = new Set<string>();
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        colors.add(style.color);
        colors.add(style.backgroundColor);
      });

      return {
        imageCount: images,
        colorCount: colors.size,
        elementCount: elements.length,
        fontSizes: new Set(Array.from(elements).map(el => 
          window.getComputedStyle(el).fontSize
        )).size
      };
    });

    // Calculate complexity score (0-10)
    const complexity = Math.min(10, 
      (metrics.imageCount / 10) * 2 +
      (metrics.colorCount / 20) * 3 +
      (metrics.elementCount / 500) * 3 +
      (metrics.fontSizes / 5) * 2
    );

    return Math.round(complexity);
  }

  private async analyzeElementImportance(page: Page, context: InteractionContext) {
    const elements = await page.evaluate((focusAreas) => {
      const importance: Record<string, number> = {};
      
      // Price elements
      document.querySelectorAll('[class*="price"], [data-price], .price').forEach(el => {
        importance[`price-${el.getAttribute('class') || 'default'}`] = 
          focusAreas.includes('price') ? 0.9 : 0.5;
      });

      // Revenue elements
      document.querySelectorAll('[class*="revenue"], [data-revenue], .revenue').forEach(el => {
        importance[`revenue-${el.getAttribute('class') || 'default'}`] = 
          focusAreas.includes('revenue') || focusAreas.includes('financials') ? 0.8 : 0.4;
      });

      // Description elements
      document.querySelectorAll('.description, [class*="desc"], p').forEach((el, i) => {
        if (i < 5) { // First 5 descriptions
          importance[`desc-${i}`] = 
            focusAreas.includes('description') ? 0.7 : 0.3;
        }
      });

      // Category elements
      document.querySelectorAll('[class*="category"], .category, .tag').forEach(el => {
        importance[`category-${el.getAttribute('class') || 'default'}`] = 
          focusAreas.includes('category') ? 0.6 : 0.3;
      });

      // Traffic/metrics elements
      document.querySelectorAll('[class*="traffic"], [class*="metric"], .stats').forEach(el => {
        importance[`metrics-${el.getAttribute('class') || 'default'}`] = 
          focusAreas.includes('traffic') || focusAreas.includes('growth metrics') ? 0.8 : 0.4;
      });

      return importance;
    }, this.persona.behavior.focusAreas);

    // Convert to Map
    Object.entries(elements).forEach(([key, value]) => {
      context.elementImportance.set(key, value);
    });
  }

  private async calculateInterestScore(page: Page, context: InteractionContext): Promise<number> {
    let score = 50; // Base score

    // Check for preferred categories
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    
    for (const category of this.persona.preferences.filterPreferences?.categories || []) {
      if (pageText.includes(category.toLowerCase())) {
        score += 10;
      }
    }

    // Check price range
    const prices = await page.$$eval('[class*="price"]', els => 
      els.map(el => parseInt(el.textContent?.replace(/[^0-9]/g, '') || '0'))
    );
    
    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const { min, max } = this.persona.profile.investmentRange;
      
      if (avgPrice >= min && avgPrice <= max) {
        score += 20;
      } else if (avgPrice < min * 0.5 || avgPrice > max * 2) {
        score -= 20;
      }
    }

    // Adjust based on content density preference
    if (context.contentDensity === 'high' && this.persona.preferences.detailLevel === 'detailed') {
      score += 10;
    } else if (context.contentDensity === 'low' && this.persona.preferences.detailLevel === 'quick') {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  async planInteraction(page: Page): Promise<InteractionPlan> {
    if (!this.context) {
      this.context = await this.analyzePageContext(page);
    }

    const plan: InteractionPlan = {
      sequence: [],
      estimatedDuration: 0,
      priority: this.context.interestScore > 70 ? 'high' : 
               this.context.interestScore > 40 ? 'medium' : 'low'
    };

    // Build interaction sequence based on page type and persona
    switch (this.context.pageType) {
      case 'listing':
        plan.sequence = await this.planListingInteraction(page);
        break;
      case 'details':
        plan.sequence = await this.planDetailsInteraction(page);
        break;
      case 'search':
        plan.sequence = await this.planSearchInteraction(page);
        break;
      default:
        plan.sequence = await this.planGenericInteraction(page);
    }

    // Calculate estimated duration
    plan.estimatedDuration = plan.sequence.reduce((total, step) => 
      total + (step.duration || 1000), 0
    );

    // Add natural variations
    plan.sequence = this.addNaturalVariations(plan.sequence);

    return plan;
  }

  private async planListingInteraction(page: Page): Promise<InteractionStep[]> {
    const steps: InteractionStep[] = [];
    
    // Initial pause to "take in" the page
    steps.push({
      type: 'pause',
      duration: this.getReadingPause()
    });

    // Scroll pattern based on persona
    if (this.persona.behavior.scrollPattern === 'thorough') {
      // Read through listings methodically
      for (let i = 0; i < 5; i++) {
        steps.push({
          type: 'scroll',
          options: { distance: 300 + Math.random() * 200, smooth: true }
        });
        
        steps.push({
          type: 'read',
          duration: this.getReadingDuration(500)
        });

        // Occasionally hover over interesting items
        if (Math.random() < this.persona.behavior.clickProbability) {
          steps.push({
            type: 'hover',
            target: `.listing-card:nth-child(${i + 1})`,
            duration: 1000 + Math.random() * 2000
          });
        }
      }
    } else if (this.persona.behavior.scrollPattern === 'fast') {
      // Quick scan through page
      steps.push({
        type: 'scroll',
        options: { distance: 1000, smooth: true, fast: true }
      });
      
      steps.push({
        type: 'pause',
        duration: 500
      });
      
      // Focus on specific high-value items
      const importantSelectors = this.getImportantSelectors();
      for (const selector of importantSelectors.slice(0, 3)) {
        steps.push({
          type: 'focus',
          target: selector,
          duration: this.getReadingDuration(200)
        });
      }
    }

    // Potential click on interesting listing
    if (Math.random() < this.persona.behavior.clickProbability) {
      steps.push({
        type: 'click',
        target: this.selectListingToClick()
      });
    }

    return steps;
  }

  private async planDetailsInteraction(page: Page): Promise<InteractionStep[]> {
    const steps: InteractionStep[] = [];
    const focusAreas = this.persona.behavior.focusAreas;

    // Initial assessment pause
    steps.push({
      type: 'pause',
      duration: 2000 + Math.random() * 1000
    });

    // Focus on key areas in order of importance
    for (const area of focusAreas) {
      const selector = this.getAreaSelector(area);
      if (selector) {
        steps.push({
          type: 'focus',
          target: selector,
          duration: this.getReadingDuration(300)
        });
        
        // Read the content
        steps.push({
          type: 'read',
          duration: this.getReadingDuration(800)
        });

        // Possible hover for more details
        if (this.persona.interaction.mouseMovement.hovering) {
          steps.push({
            type: 'hover',
            target: selector,
            duration: 1000 + Math.random() * 1000
          });
        }
      }
    }

    // Scroll through additional details
    for (let i = 0; i < 3; i++) {
      steps.push({
        type: 'scroll',
        options: { 
          distance: 400 + Math.random() * 200,
          smooth: true,
          pause: true
        }
      });
      
      steps.push({
        type: 'read',
        duration: this.getReadingDuration(600)
      });
    }

    // Back to top for final assessment
    if (Math.random() < 0.3) {
      steps.push({
        type: 'scroll',
        options: { distance: -2000, smooth: true }
      });
    }

    return steps;
  }

  private async planSearchInteraction(page: Page): Promise<InteractionStep[]> {
    const steps: InteractionStep[] = [];

    // Look at current filters/results
    steps.push({
      type: 'pause',
      duration: 1500
    });

    // Check filter options based on preferences
    if (this.persona.preferences.filterPreferences) {
      steps.push({
        type: 'focus',
        target: '[class*="filter"], .filter-section',
        duration: 2000
      });

      // Potentially interact with filters
      if (Math.random() < 0.4) {
        steps.push({
          type: 'click',
          target: this.selectFilterToClick()
        });
      }
    }

    // Scan results
    steps.push({
      type: 'scroll',
      options: { distance: 600, smooth: true }
    });

    return steps;
  }

  private async planGenericInteraction(page: Page): Promise<InteractionStep[]> {
    // Generic exploration pattern
    return [
      { type: 'pause', duration: 1500 },
      { type: 'scroll', options: { distance: 400 } },
      { type: 'read', duration: this.getReadingDuration(500) },
      { type: 'scroll', options: { distance: 300 } }
    ];
  }

  private addNaturalVariations(steps: InteractionStep[]): InteractionStep[] {
    const varied: InteractionStep[] = [];
    
    for (const step of steps) {
      // Add hesitation before clicks
      if (step.type === 'click' && this.persona.interaction.clicking.hesitation) {
        varied.push({
          type: 'pause',
          duration: 300 + Math.random() * 700
        });
      }

      varied.push(step);

      // Add distraction pauses
      if (Math.random() < this.getDistractionProbability()) {
        varied.push({
          type: 'pause',
          duration: 2000 + Math.random() * 5000
        });
      }
    }

    return varied;
  }

  private getReadingDuration(baseWords: number): number {
    const wordsPerMinute = this.persona.behavior.readingSpeed;
    const baseTime = (baseWords / wordsPerMinute) * 60 * 1000;
    
    // Add variation
    const variation = 0.2 + Math.random() * 0.3;
    return Math.round(baseTime * variation);
  }

  private getReadingPause(): number {
    const { min, max } = this.persona.behavior.dwellTime;
    return min * 1000 + Math.random() * (max - min) * 1000;
  }

  private getDistractionProbability(): number {
    switch (this.persona.behavior.distractionLevel) {
      case 'low': return 0.05;
      case 'medium': return 0.15;
      case 'high': return 0.3;
    }
  }

  private getImportantSelectors(): string[] {
    const selectors: string[] = [];
    
    this.context?.elementImportance.forEach((importance, key) => {
      if (importance > 0.6) {
        selectors.push(`[class*="${key.split('-')[0]}"]`);
      }
    });

    return selectors;
  }

  private getAreaSelector(area: string): string | null {
    const selectorMap: Record<string, string> = {
      'price': '[class*="price"], .price, [data-price]',
      'revenue': '[class*="revenue"], .revenue, [data-revenue]',
      'description': '.description, [class*="description"]',
      'financials': '.financials, [class*="financial"], .metrics',
      'traffic': '[class*="traffic"], .traffic-stats, .visitors',
      'growth metrics': '[class*="growth"], .metrics, .analytics',
      'category': '[class*="category"], .category, .tag',
      'history': '.history, [class*="established"], .age',
      'tech stack': '.tech-stack, [class*="technology"], .stack'
    };

    return selectorMap[area] || null;
  }

  private selectListingToClick(): string {
    // Select based on persona preferences
    if (this.persona.preferences.sortBy === 'price') {
      return '.listing-card:has(.price:not(:empty)):first-child';
    } else if (this.persona.preferences.sortBy === 'revenue') {
      return '.listing-card:has(.revenue:not(:empty)):first-child';
    }
    
    // Default to first visible listing
    return '.listing-card:visible:first-child';
  }

  private selectFilterToClick(): string {
    const { filterPreferences } = this.persona.preferences;
    
    if (filterPreferences?.categories?.length) {
      return `[data-filter-category="${filterPreferences.categories[0]}"]`;
    }
    
    if (filterPreferences?.priceRange) {
      return '[data-filter="price-range"]';
    }
    
    return '.filter-option:first-child';
  }

  async executeInteractionPlan(page: Page, plan: InteractionPlan) {
    for (const step of plan.sequence) {
      await this.executeStep(page, step);
      
      // Record in history
      this.interactionHistory.push(step);
      
      // Update attention map
      if (step.target) {
        const currentAttention = this.attentionMap.get(step.target) || 0;
        this.attentionMap.set(step.target, currentAttention + (step.duration || 1000));
      }
    }
  }

  private async executeStep(page: Page, step: InteractionStep) {
    switch (step.type) {
      case 'scroll':
        await this.executeScroll(page, step.options);
        break;
      case 'click':
        await this.executeClick(page, step.target!);
        break;
      case 'hover':
        await this.executeHover(page, step.target!, step.duration);
        break;
      case 'read':
        await this.executeRead(step.duration!);
        break;
      case 'focus':
        await this.executeFocus(page, step.target!, step.duration);
        break;
      case 'pause':
        await this.executePause(step.duration!);
        break;
    }
  }

  private async executeScroll(page: Page, options: any) {
    const { distance, smooth, fast, pause } = options || {};
    
    if (smooth) {
      // Smooth scrolling with variable speed
      const steps = fast ? 5 : 10;
      const stepDistance = distance / steps;
      
      for (let i = 0; i < steps; i++) {
        await page.evaluate((d) => window.scrollBy(0, d), stepDistance);
        await new Promise(resolve => setTimeout(resolve, fast ? 50 : 100 + Math.random() * 50));
      }
    } else {
      await page.evaluate((d) => window.scrollBy(0, d), distance);
    }
    
    if (pause) {
      await this.executePause(500 + Math.random() * 500);
    }
  }

  private async executeClick(page: Page, selector: string) {
    try {
      const element = await page.$(selector);
      if (element) {
        // Move mouse naturally to element
        const box = await element.boundingBox();
        if (box) {
          await this.moveMouseNaturally(page, box.x + box.width / 2, box.y + box.height / 2);
          
          // Potential miss-click
          if (Math.random() < this.persona.interaction.clicking.missClickProbability) {
            await page.mouse.click(
              box.x + box.width / 2 + (Math.random() - 0.5) * 20,
              box.y + box.height / 2 + (Math.random() - 0.5) * 20
            );
            await this.executePause(500);
          }
          
          await element.click();
        }
      }
    } catch (error) {
      console.log('Click failed:', error);
    }
  }

  private async executeHover(page: Page, selector: string, duration?: number) {
    try {
      const element = await page.$(selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          await this.moveMouseNaturally(page, box.x + box.width / 2, box.y + box.height / 2);
          await this.executePause(duration || 1000);
        }
      }
    } catch (error) {
      console.log('Hover failed:', error);
    }
  }

  private async executeRead(duration: number) {
    // Simulate reading with micro-movements
    const microMovements = Math.floor(duration / 1000);
    
    for (let i = 0; i < microMovements; i++) {
      await this.executePause(800 + Math.random() * 400);
    }
  }

  private async executeFocus(page: Page, selector: string, duration?: number) {
    try {
      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, selector);
      
      await this.executePause(duration || 2000);
    } catch (error) {
      console.log('Focus failed:', error);
    }
  }

  private async executePause(duration: number) {
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  private async moveMouseNaturally(page: Page, targetX: number, targetY: number) {
    // Implemented in parent class
    await page.mouse.move(targetX, targetY);
  }

  getInteractionSummary() {
    return {
      totalInteractions: this.interactionHistory.length,
      interactionTypes: this.interactionHistory.reduce((acc, step) => {
        acc[step.type] = (acc[step.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalAttentionTime: Array.from(this.attentionMap.values()).reduce((a, b) => a + b, 0),
      focusedElements: Array.from(this.attentionMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }
}

export default ContextualInteractionEngine;