// context-aware-interaction.js
// Context-aware interaction patterns that respond to page content dynamically

const { createCanvas } = require('canvas');
const cv = require('opencv4nodejs');

class ContextAwareInteraction {
  constructor() {
    // Visual processing for page understanding
    this.visualProcessor = {
      colorSchemes: this.initializeColorSchemes(),
      layoutPatterns: this.initializeLayoutPatterns(),
      elementImportance: this.initializeElementImportance()
    };
    
    // Content understanding
    this.contentAnalyzer = {
      textPatterns: this.initializeTextPatterns(),
      priceDetection: this.initializePriceDetection(),
      callToActionPatterns: this.initializeCtaPatterns()
    };
    
    // Interaction strategies
    this.strategies = {
      exploration: this.createExplorationStrategy(),
      evaluation: this.createEvaluationStrategy(),
      comparison: this.createComparisonStrategy(),
      decision: this.createDecisionStrategy()
    };
    
    // Learning from interactions
    this.interactionMemory = {
      successfulPatterns: [],
      avoidedElements: [],
      preferredPaths: new Map(),
      interactionHistory: []
    };
    
    // Current context state
    this.contextState = {
      pageType: null,
      primaryElements: [],
      userIntent: null,
      emotionalState: 'neutral',
      confidenceLevel: 0.7
    };
  }

  initializeColorSchemes() {
    return {
      // Color psychology and attention patterns
      attention: {
        red: { attention: 0.9, urgency: 0.8, trust: 0.5 },
        blue: { attention: 0.7, urgency: 0.3, trust: 0.8 },
        green: { attention: 0.6, urgency: 0.4, trust: 0.7 },
        orange: { attention: 0.8, urgency: 0.6, trust: 0.6 },
        gray: { attention: 0.3, urgency: 0.1, trust: 0.5 }
      },
      
      // Common UI patterns
      patterns: {
        cta_primary: ['#ff6900', '#fcb900', '#7bdcb5', '#00d084'],
        cta_secondary: ['#8ed1fc', '#0693e3', '#abb8c3', '#f78da7'],
        danger: ['#dc3545', '#c82333', '#bd2130'],
        success: ['#28a745', '#218838', '#1e7e34'],
        info: ['#17a2b8', '#138496', '#117a8b']
      }
    };
  }

  initializeLayoutPatterns() {
    return {
      // Common layout structures
      grid: {
        detection: /grid|flex.*wrap|masonry/i,
        interaction: 'systematic_scan',
        priority: 'top_left_to_bottom_right'
      },
      
      list: {
        detection: /list|results|items/i,
        interaction: 'vertical_scan',
        priority: 'top_to_bottom'
      },
      
      hero: {
        detection: /hero|banner|jumbotron/i,
        interaction: 'focal_point',
        priority: 'center_out'
      },
      
      sidebar: {
        detection: /sidebar|aside|filters/i,
        interaction: 'secondary_scan',
        priority: 'after_main'
      },
      
      modal: {
        detection: /modal|popup|overlay/i,
        interaction: 'immediate_attention',
        priority: 'blocking'
      }
    };
  }

  initializeElementImportance() {
    return {
      // Element importance scoring
      interactive: {
        button: 0.9,
        link: 0.8,
        input: 0.7,
        select: 0.6,
        checkbox: 0.5,
        radio: 0.5
      },
      
      content: {
        heading: 0.8,
        price: 0.9,
        image: 0.7,
        video: 0.8,
        paragraph: 0.5,
        list: 0.6
      },
      
      navigation: {
        nav: 0.7,
        breadcrumb: 0.5,
        pagination: 0.8,
        tabs: 0.7,
        menu: 0.6
      }
    };
  }

  initializeTextPatterns() {
    return {
      // Business-related text patterns
      pricing: /\$[\d,]+(?:\.\d{2})?|USD|price|cost|value/i,
      revenue: /revenue|income|earnings|profit|sales/i,
      metrics: /visitors?|traffic|conversion|users?|pageviews?/i,
      urgency: /limited|only|last|hurry|expires?|deadline/i,
      trust: /verified|trusted|guaranteed|certified|authentic/i,
      action: /buy|purchase|get|start|claim|download|subscribe/i
    };
  }

  initializePriceDetection() {
    return {
      // Price extraction patterns
      patterns: [
        /\$\s?([\d,]+(?:\.\d{2})?)/,
        /USD\s?([\d,]+(?:\.\d{2})?)/,
        /([\d,]+(?:\.\d{2})?)\s?USD/,
        /price:\s?\$?([\d,]+(?:\.\d{2})?)/i
      ],
      
      // Price context indicators
      context: {
        asking: /asking|listed|price/i,
        revenue: /monthly|yearly|annual|revenue/i,
        profit: /profit|earnings|income/i,
        multiple: /multiple|×|x\s?\d/i
      }
    };
  }

  initializeCtaPatterns() {
    return {
      // Call-to-action patterns
      primary: {
        text: /buy now|get started|sign up|purchase|checkout/i,
        classes: /btn-primary|cta|action|submit/i,
        importance: 0.9
      },
      
      secondary: {
        text: /learn more|view details|see more|explore/i,
        classes: /btn-secondary|more-info/i,
        importance: 0.7
      },
      
      navigation: {
        text: /next|previous|back|continue/i,
        classes: /nav|pagination/i,
        importance: 0.6
      }
    };
  }

  createExplorationStrategy() {
    return {
      name: 'exploration',
      
      scanPattern: 'F-pattern', // or Z-pattern based on layout
      
      priorities: [
        'headlines',
        'images',
        'prices',
        'cta_buttons',
        'interesting_content'
      ],
      
      timing: {
        initial_scan: { min: 2000, max: 5000 },
        element_focus: { min: 500, max: 2000 },
        decision_pause: { min: 1000, max: 3000 }
      },
      
      interactions: {
        hover_probability: 0.6,
        click_probability: 0.3,
        scroll_speed: 'medium'
      }
    };
  }

  createEvaluationStrategy() {
    return {
      name: 'evaluation',
      
      scanPattern: 'detailed',
      
      priorities: [
        'pricing_info',
        'metrics',
        'trust_signals',
        'detailed_content',
        'reviews'
      ],
      
      timing: {
        initial_scan: { min: 3000, max: 8000 },
        element_focus: { min: 2000, max: 5000 },
        decision_pause: { min: 3000, max: 6000 }
      },
      
      interactions: {
        hover_probability: 0.8,
        click_probability: 0.5,
        scroll_speed: 'slow'
      }
    };
  }

  createComparisonStrategy() {
    return {
      name: 'comparison',
      
      scanPattern: 'back-and-forth',
      
      priorities: [
        'comparable_metrics',
        'prices',
        'features',
        'differences',
        'similarities'
      ],
      
      timing: {
        initial_scan: { min: 2000, max: 4000 },
        element_focus: { min: 1000, max: 3000 },
        comparison_pause: { min: 2000, max: 5000 }
      },
      
      interactions: {
        hover_probability: 0.7,
        click_probability: 0.4,
        tab_switching: 0.8,
        scroll_speed: 'variable'
      }
    };
  }

  createDecisionStrategy() {
    return {
      name: 'decision',
      
      scanPattern: 'focused',
      
      priorities: [
        'final_price',
        'purchase_button',
        'terms',
        'guarantees',
        'contact_info'
      ],
      
      timing: {
        initial_scan: { min: 1000, max: 3000 },
        element_focus: { min: 3000, max: 8000 },
        final_decision: { min: 5000, max: 15000 }
      },
      
      interactions: {
        hover_probability: 0.9,
        click_probability: 0.7,
        form_interaction: 0.8,
        scroll_speed: 'slow'
      }
    };
  }

  // Analyze page context
  async analyzePageContext(page) {
    const context = {
      layout: await this.analyzeLayout(page),
      content: await this.analyzeContent(page),
      visuals: await this.analyzeVisuals(page),
      interactive: await this.analyzeInteractiveElements(page),
      intent: this.inferUserIntent()
    };
    
    // Update context state
    this.contextState = {
      pageType: this.classifyPageType(context),
      primaryElements: this.identifyPrimaryElements(context),
      userIntent: context.intent,
      emotionalState: this.assessEmotionalResponse(context),
      confidenceLevel: this.calculateConfidence(context)
    };
    
    return context;
  }

  async analyzeLayout(page) {
    const layout = await page.evaluate(() => {
      const body = document.body;
      const elements = document.querySelectorAll('*');
      
      // Analyze layout structure
      const structure = {
        hasGrid: false,
        hasSidebar: false,
        hasHero: false,
        columnCount: 1,
        mainContentArea: null
      };
      
      // Check for grid layouts
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.display.includes('grid') || styles.display.includes('flex')) {
          structure.hasGrid = true;
        }
      });
      
      // Identify layout regions
      const regions = {
        header: document.querySelector('header, [role="banner"], .header'),
        main: document.querySelector('main, [role="main"], .content'),
        sidebar: document.querySelector('aside, [role="complementary"], .sidebar'),
        footer: document.querySelector('footer, [role="contentinfo"], .footer')
      };
      
      structure.hasSidebar = !!regions.sidebar;
      structure.mainContentArea = regions.main ? {
        width: regions.main.offsetWidth,
        height: regions.main.offsetHeight,
        x: regions.main.offsetLeft,
        y: regions.main.offsetTop
      } : null;
      
      return structure;
    });
    
    return layout;
  }

  async analyzeContent(page) {
    const content = await page.evaluate(() => {
      const textContent = document.body.innerText;
      
      // Extract key information
      const prices = [];
      const priceRegex = /\$[\d,]+(?:\.\d{2})?/g;
      let match;
      while ((match = priceRegex.exec(textContent)) !== null) {
        prices.push({
          value: match[0],
          context: textContent.substring(
            Math.max(0, match.index - 50),
            Math.min(textContent.length, match.index + 50)
          )
        });
      }
      
      // Count content types
      const contentTypes = {
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        paragraphs: document.querySelectorAll('p').length,
        lists: document.querySelectorAll('ul, ol').length,
        images: document.querySelectorAll('img').length,
        videos: document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length,
        forms: document.querySelectorAll('form').length,
        tables: document.querySelectorAll('table').length
      };
      
      // Extract headlines
      const headlines = Array.from(document.querySelectorAll('h1, h2, h3'))
        .slice(0, 5)
        .map(h => ({
          level: h.tagName,
          text: h.innerText.trim(),
          position: {
            x: h.offsetLeft,
            y: h.offsetTop
          }
        }));
      
      return {
        prices,
        contentTypes,
        headlines,
        wordCount: textContent.split(/\s+/).length,
        hasVideo: contentTypes.videos > 0,
        hasForm: contentTypes.forms > 0
      };
    });
    
    return content;
  }

  async analyzeVisuals(page) {
    // Take screenshot for visual analysis
    const screenshot = await page.screenshot({ fullPage: false });
    
    // Analyze dominant colors and visual hierarchy
    const visualAnalysis = {
      dominantColors: this.extractDominantColors(screenshot),
      visualHierarchy: this.analyzeVisualHierarchy(screenshot),
      attentionHeatmap: this.generateAttentionHeatmap(screenshot)
    };
    
    return visualAnalysis;
  }

  extractDominantColors(screenshot) {
    // Simplified color extraction (in real implementation would use image processing)
    return [
      { color: '#ffffff', percentage: 40 },
      { color: '#333333', percentage: 20 },
      { color: '#007bff', percentage: 15 },
      { color: '#28a745', percentage: 10 },
      { color: '#ffc107', percentage: 15 }
    ];
  }

  analyzeVisualHierarchy(screenshot) {
    // Analyze visual hierarchy based on size, contrast, position
    return {
      primaryFocalPoint: { x: 0.5, y: 0.3 }, // Relative coordinates
      secondaryPoints: [
        { x: 0.2, y: 0.5 },
        { x: 0.8, y: 0.5 }
      ],
      visualFlow: 'top-to-bottom',
      contrastRatio: 7.5
    };
  }

  generateAttentionHeatmap(screenshot) {
    // Generate predicted attention heatmap
    // In real implementation, would use saliency detection algorithms
    return {
      hotspots: [
        { x: 0.5, y: 0.2, intensity: 0.9 }, // Top center
        { x: 0.2, y: 0.4, intensity: 0.7 }, // Left sidebar
        { x: 0.8, y: 0.6, intensity: 0.6 }  // Right content
      ]
    };
  }

  async analyzeInteractiveElements(page) {
    const interactive = await page.evaluate(() => {
      // Find all interactive elements
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn'));
      const links = Array.from(document.querySelectorAll('a[href]'));
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      
      // Categorize buttons
      const categorizedButtons = buttons.map(btn => {
        const text = btn.innerText.toLowerCase();
        const classes = btn.className.toLowerCase();
        
        let category = 'other';
        if (text.match(/buy|purchase|checkout|order/)) category = 'purchase';
        else if (text.match(/sign|register|join/)) category = 'signup';
        else if (text.match(/learn|more|details|info/)) category = 'info';
        else if (text.match(/contact|message|email/)) category = 'contact';
        
        return {
          category,
          text: btn.innerText,
          position: {
            x: btn.offsetLeft,
            y: btn.offsetTop
          },
          size: {
            width: btn.offsetWidth,
            height: btn.offsetHeight
          },
          style: {
            backgroundColor: window.getComputedStyle(btn).backgroundColor,
            color: window.getComputedStyle(btn).color
          }
        };
      });
      
      // Analyze form complexity
      const forms = Array.from(document.querySelectorAll('form')).map(form => ({
        fields: form.querySelectorAll('input, textarea, select').length,
        required: form.querySelectorAll('[required]').length,
        action: form.action,
        method: form.method
      }));
      
      return {
        buttons: categorizedButtons,
        links: links.length,
        inputs: inputs.length,
        forms: forms,
        totalInteractive: buttons.length + links.length + inputs.length
      };
    });
    
    return interactive;
  }

  classifyPageType(context) {
    // Classify based on content and structure
    const { content, interactive, layout } = context;
    
    if (content.prices.length > 5 && interactive.buttons.some(b => b.category === 'info')) {
      return 'listing_page';
    }
    
    if (interactive.forms.length > 0 && interactive.forms[0].fields > 3) {
      return 'form_page';
    }
    
    if (content.prices.length === 1 && interactive.buttons.some(b => b.category === 'purchase')) {
      return 'product_detail';
    }
    
    if (content.contentTypes.headings > 10 && layout.hasGrid) {
      return 'category_page';
    }
    
    return 'general_content';
  }

  identifyPrimaryElements(context) {
    const elements = [];
    
    // Add high-importance elements
    context.interactive.buttons
      .filter(b => b.category === 'purchase' || b.category === 'signup')
      .forEach(btn => {
        elements.push({
          type: 'button',
          subtype: btn.category,
          importance: 0.9,
          position: btn.position,
          data: btn
        });
      });
    
    // Add price information
    context.content.prices.forEach((price, index) => {
      elements.push({
        type: 'price',
        importance: 0.8 - index * 0.1,
        value: price.value,
        context: price.context
      });
    });
    
    // Add headlines
    context.content.headlines.forEach((headline, index) => {
      elements.push({
        type: 'headline',
        importance: 0.7 - index * 0.1,
        text: headline.text,
        level: headline.level,
        position: headline.position
      });
    });
    
    return elements.sort((a, b) => b.importance - a.importance);
  }

  inferUserIntent() {
    // Based on session history and current actions
    const possibleIntents = [
      'browsing',
      'researching',
      'comparing',
      'evaluating',
      'purchasing'
    ];
    
    // In real implementation, would analyze session history
    return possibleIntents[Math.floor(Math.random() * possibleIntents.length)];
  }

  assessEmotionalResponse(context) {
    // Assess emotional response based on content
    let emotion = 'neutral';
    
    const priceCount = context.content.prices.length;
    const hasUrgency = context.content.headlines.some(h => 
      h.text.match(/limited|urgent|expires|last/i)
    );
    
    if (hasUrgency) {
      emotion = 'anxious';
    } else if (priceCount > 10) {
      emotion = 'overwhelmed';
    } else if (context.interactive.buttons.some(b => b.category === 'purchase')) {
      emotion = 'interested';
    }
    
    return emotion;
  }

  calculateConfidence(context) {
    // Calculate confidence in understanding the page
    let confidence = 0.5;
    
    // Clear structure increases confidence
    if (context.layout.mainContentArea) confidence += 0.1;
    if (context.content.headlines.length > 0) confidence += 0.1;
    if (context.content.prices.length > 0) confidence += 0.1;
    
    // Interactive elements increase confidence
    if (context.interactive.buttons.length > 0) confidence += 0.1;
    if (context.interactive.totalInteractive < 50) confidence += 0.1; // Not too complex
    
    return Math.min(1.0, confidence);
  }

  // Generate context-aware interactions
  async generateInteractionPlan(page, strategy = null) {
    const context = await this.analyzePageContext(page);
    const selectedStrategy = strategy || this.selectStrategy(context);
    
    const plan = {
      strategy: selectedStrategy.name,
      phases: [],
      estimatedDuration: 0
    };
    
    // Phase 1: Initial orientation
    plan.phases.push({
      name: 'orientation',
      duration: this.randomInRange(2000, 5000),
      actions: [
        {
          type: 'scan',
          pattern: selectedStrategy.scanPattern,
          focusAreas: this.identifyFocusAreas(context, selectedStrategy)
        }
      ]
    });
    
    // Phase 2: Exploration based on priorities
    selectedStrategy.priorities.forEach((priority, index) => {
      const elements = this.findElementsByPriority(context, priority);
      
      if (elements.length > 0) {
        plan.phases.push({
          name: `explore_${priority}`,
          duration: this.randomInRange(
            selectedStrategy.timing.element_focus.min,
            selectedStrategy.timing.element_focus.max
          ),
          actions: elements.slice(0, 3).map(element => ({
            type: this.determineInteractionType(element, selectedStrategy),
            target: element,
            probability: this.calculateInteractionProbability(element, selectedStrategy)
          }))
        });
      }
    });
    
    // Phase 3: Decision or continuation
    plan.phases.push({
      name: 'decision',
      duration: this.randomInRange(
        selectedStrategy.timing.decision_pause.min,
        selectedStrategy.timing.decision_pause.max
      ),
      actions: [
        {
          type: 'evaluate',
          decision: this.makeDecision(context, selectedStrategy)
        }
      ]
    });
    
    // Calculate total duration
    plan.estimatedDuration = plan.phases.reduce((sum, phase) => sum + phase.duration, 0);
    
    return plan;
  }

  selectStrategy(context) {
    // Select strategy based on context and intent
    const intent = context.intent || this.contextState.userIntent;
    
    switch (intent) {
      case 'browsing':
        return this.strategies.exploration;
      case 'researching':
      case 'evaluating':
        return this.strategies.evaluation;
      case 'comparing':
        return this.strategies.comparison;
      case 'purchasing':
        return this.strategies.decision;
      default:
        return this.strategies.exploration;
    }
  }

  identifyFocusAreas(context, strategy) {
    const focusAreas = [];
    
    // Add visual hotspots
    if (context.visuals && context.visuals.attentionHeatmap) {
      context.visuals.attentionHeatmap.hotspots.forEach(hotspot => {
        focusAreas.push({
          x: hotspot.x,
          y: hotspot.y,
          importance: hotspot.intensity,
          reason: 'visual_saliency'
        });
      });
    }
    
    // Add primary elements
    context.primaryElements.slice(0, 5).forEach(element => {
      if (element.position) {
        focusAreas.push({
          x: element.position.x,
          y: element.position.y,
          importance: element.importance,
          reason: element.type
        });
      }
    });
    
    return focusAreas;
  }

  findElementsByPriority(context, priority) {
    const elements = [];
    
    switch (priority) {
      case 'headlines':
        elements.push(...context.content.headlines);
        break;
        
      case 'prices':
      case 'pricing_info':
        elements.push(...context.content.prices.map(p => ({
          type: 'price',
          value: p.value,
          context: p.context
        })));
        break;
        
      case 'cta_buttons':
        elements.push(...context.interactive.buttons.filter(b => 
          b.category === 'purchase' || b.category === 'signup'
        ));
        break;
        
      case 'trust_signals':
        elements.push(...context.primaryElements.filter(e => 
          e.type === 'text' && e.data && e.data.match(/verified|guaranteed|trusted/i)
        ));
        break;
    }
    
    return elements;
  }

  determineInteractionType(element, strategy) {
    if (element.type === 'button' || element.type === 'link') {
      return Math.random() < strategy.interactions.click_probability ? 'click' : 'hover';
    }
    
    if (element.type === 'price' || element.type === 'headline') {
      return 'read';
    }
    
    if (element.type === 'input') {
      return 'focus';
    }
    
    return 'view';
  }

  calculateInteractionProbability(element, strategy) {
    let baseProbability = 0.5;
    
    // Adjust based on element importance
    if (element.importance) {
      baseProbability = element.importance;
    }
    
    // Adjust based on strategy
    if (element.type === 'button') {
      baseProbability *= strategy.interactions.click_probability;
    } else if (element.type === 'link') {
      baseProbability *= strategy.interactions.hover_probability;
    }
    
    // Adjust based on emotional state
    if (this.contextState.emotionalState === 'interested') {
      baseProbability *= 1.2;
    } else if (this.contextState.emotionalState === 'overwhelmed') {
      baseProbability *= 0.8;
    }
    
    return Math.min(1.0, baseProbability);
  }

  makeDecision(context, strategy) {
    const decisions = {
      continue_exploring: 0.4,
      go_deeper: 0.3,
      switch_tab: 0.1,
      take_action: 0.15,
      leave: 0.05
    };
    
    // Adjust based on context
    if (context.primaryElements.some(e => e.type === 'button' && e.subtype === 'purchase')) {
      decisions.take_action += 0.1;
      decisions.continue_exploring -= 0.1;
    }
    
    if (this.contextState.confidenceLevel < 0.5) {
      decisions.leave += 0.1;
      decisions.take_action -= 0.1;
    }
    
    // Select decision
    return this.weightedRandomSelect(decisions);
  }

  // Execute interaction plan
  async executeInteractionPlan(page, plan) {
    console.log(`Executing ${plan.strategy} strategy`);
    
    for (const phase of plan.phases) {
      console.log(`Phase: ${phase.name}`);
      
      for (const action of phase.actions) {
        if (Math.random() < (action.probability || 1.0)) {
          await this.executeContextualAction(page, action);
        }
        
        // Natural pause between actions
        await page.waitForTimeout(this.randomInRange(500, 1500));
      }
      
      // Phase completion pause
      await page.waitForTimeout(phase.duration);
    }
    
    // Learn from interaction
    this.updateInteractionMemory(plan);
  }

  async executeContextualAction(page, action) {
    switch (action.type) {
      case 'scan':
        await this.executeScanPattern(page, action.pattern, action.focusAreas);
        break;
        
      case 'click':
        await this.executeContextualClick(page, action.target);
        break;
        
      case 'hover':
        await this.executeContextualHover(page, action.target);
        break;
        
      case 'read':
        await this.executeContextualRead(page, action.target);
        break;
        
      case 'evaluate':
        await this.executeEvaluation(page, action.decision);
        break;
    }
  }

  async executeScanPattern(page, pattern, focusAreas) {
    const viewport = await page.viewportSize();
    
    if (pattern === 'F-pattern') {
      // F-pattern scan
      const points = [
        { x: 100, y: 100 },
        { x: viewport.width - 100, y: 100 },
        { x: 100, y: 300 },
        { x: viewport.width * 0.6, y: 300 },
        { x: 100, y: 500 },
        { x: 100, y: viewport.height - 100 }
      ];
      
      for (const point of points) {
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(this.randomInRange(200, 500));
      }
    } else if (pattern === 'Z-pattern') {
      // Z-pattern scan
      const points = [
        { x: 100, y: 100 },
        { x: viewport.width - 100, y: 100 },
        { x: 100, y: viewport.height - 100 },
        { x: viewport.width - 100, y: viewport.height - 100 }
      ];
      
      for (const point of points) {
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(this.randomInRange(300, 700));
      }
    }
    
    // Focus on specific areas
    for (const area of focusAreas.slice(0, 3)) {
      await page.mouse.move(
        area.x * viewport.width,
        area.y * viewport.height
      );
      await page.waitForTimeout(this.randomInRange(500, 1500));
    }
  }

  async executeContextualClick(page, target) {
    // Move to target with natural movement
    const currentPos = await page.evaluate(() => ({
      x: window.mouseX || 0,
      y: window.mouseY || 0
    }));
    
    // Add slight randomness to click position
    const clickX = target.position.x + this.randomInRange(-5, 5);
    const clickY = target.position.y + this.randomInRange(-5, 5);
    
    // Natural movement path
    await this.naturalMouseMovement(page, currentPos.x, currentPos.y, clickX, clickY);
    
    // Hesitation before click
    await page.waitForTimeout(this.randomInRange(100, 300));
    
    // Click
    await page.click({ x: clickX, y: clickY });
  }

  async executeContextualHover(page, target) {
    const hoverX = target.position.x + target.size.width / 2;
    const hoverY = target.position.y + target.size.height / 2;
    
    await page.mouse.move(hoverX, hoverY);
    await page.waitForTimeout(this.randomInRange(500, 2000));
  }

  async executeContextualRead(page, target) {
    // Simulate reading by moving mouse along text
    if (target.position) {
      const startX = target.position.x;
      const startY = target.position.y;
      
      // Reading movement pattern
      for (let i = 0; i < 3; i++) {
        await page.mouse.move(
          startX + i * 100,
          startY + i * 20
        );
        await page.waitForTimeout(this.randomInRange(300, 800));
      }
    }
    
    // Reading pause
    const wordCount = target.text ? target.text.split(' ').length : 10;
    const readingTime = wordCount * 250; // 250ms per word average
    await page.waitForTimeout(readingTime);
  }

  async executeEvaluation(page, decision) {
    console.log(`Decision: ${decision}`);
    
    // Add to interaction memory
    this.interactionMemory.interactionHistory.push({
      timestamp: Date.now(),
      decision: decision,
      context: this.contextState
    });
    
    // Pause for decision
    await page.waitForTimeout(this.randomInRange(1000, 3000));
  }

  async naturalMouseMovement(page, startX, startY, endX, endY) {
    const steps = 20;
    const curve = 0.3; // Curve amount
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Bezier curve for natural movement
      const x = startX + (endX - startX) * t + 
                Math.sin(t * Math.PI) * curve * (endY - startY);
      const y = startY + (endY - startY) * t + 
                Math.cos(t * Math.PI) * curve * (endX - startX);
      
      await page.mouse.move(x, y);
      await page.waitForTimeout(16); // ~60fps
    }
  }

  updateInteractionMemory(plan) {
    // Store successful patterns
    if (plan.success) {
      this.interactionMemory.successfulPatterns.push({
        strategy: plan.strategy,
        pageType: this.contextState.pageType,
        duration: plan.estimatedDuration,
        timestamp: Date.now()
      });
    }
    
    // Update preferred paths
    const pathKey = `${this.contextState.pageType}_${plan.strategy}`;
    const currentCount = this.interactionMemory.preferredPaths.get(pathKey) || 0;
    this.interactionMemory.preferredPaths.set(pathKey, currentCount + 1);
  }

  // Utility functions
  randomInRange(min, max) {
    return Math.floor(min + Math.random() * (max - min));
  }

  weightedRandomSelect(options) {
    const entries = Object.entries(options);
    const weights = entries.map(([_, weight]) => weight);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < entries.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return entries[i][0];
      }
    }
    
    return entries[entries.length - 1][0];
  }
}

module.exports = ContextAwareInteraction;