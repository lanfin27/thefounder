// intelligent-timing-engine.js
// Intelligent timing algorithms that adapt to natural human browsing rhythms

class IntelligentTimingEngine {
  constructor() {
    // Circadian rhythm patterns
    this.circadianRhythms = this.initializeCircadianRhythms();
    
    // Attention span models
    this.attentionModels = this.initializeAttentionModels();
    
    // Task-specific timing patterns
    this.taskPatterns = this.initializeTaskPatterns();
    
    // User state tracking
    this.userState = {
      startTime: Date.now(),
      totalActiveTime: 0,
      breaksTaken: 0,
      currentEnergy: 100,
      currentFocus: 85,
      lastBreak: Date.now(),
      tasksSinceBreak: 0,
      currentTask: null,
      biologicalPrime: this.calculateBiologicalPrime()
    };
    
    // Multi-tab behavior simulation
    this.tabBehavior = {
      maxConcurrentTabs: this.determineMaxTabs(),
      tabSwitchPatterns: this.initializeTabPatterns(),
      currentTabs: [],
      focusedTab: null,
      backgroundActivity: []
    };
  }

  initializeCircadianRhythms() {
    return {
      // Energy levels throughout the day (0-100)
      energyLevels: {
        0: 20,   // Midnight
        1: 15,   // 1 AM
        2: 10,   // 2 AM
        3: 10,   // 3 AM
        4: 15,   // 4 AM
        5: 25,   // 5 AM
        6: 40,   // 6 AM
        7: 60,   // 7 AM
        8: 75,   // 8 AM
        9: 90,   // 9 AM - Morning peak
        10: 95,  // 10 AM
        11: 90,  // 11 AM
        12: 70,  // Noon - Lunch dip
        13: 60,  // 1 PM
        14: 65,  // 2 PM
        15: 75,  // 3 PM - Afternoon recovery
        16: 80,  // 4 PM
        17: 75,  // 5 PM
        18: 65,  // 6 PM - Evening decline
        19: 60,  // 7 PM
        20: 55,  // 8 PM
        21: 45,  // 9 PM
        22: 35,  // 10 PM
        23: 25   // 11 PM
      },
      
      // Cognitive performance multipliers
      cognitiveMultipliers: {
        earlyMorning: { start: 4, end: 7, multiplier: 0.7 },
        morningPeak: { start: 8, end: 11, multiplier: 1.2 },
        postLunch: { start: 12, end: 14, multiplier: 0.8 },
        afternoonPeak: { start: 15, end: 17, multiplier: 1.1 },
        evening: { start: 18, end: 21, multiplier: 0.9 },
        night: { start: 22, end: 3, multiplier: 0.6 }
      },
      
      // Break necessity by time of day
      breakNeeds: {
        morning: { frequency: 45, duration: { min: 5, max: 10 } },      // Minutes
        afternoon: { frequency: 30, duration: { min: 10, max: 20 } },
        evening: { frequency: 60, duration: { min: 5, max: 15 } },
        night: { frequency: 90, duration: { min: 3, max: 8 } }
      }
    };
  }

  initializeAttentionModels() {
    return {
      // Attention span by content type (seconds)
      contentTypes: {
        headline: { initial: 3, sustained: 8, decay: 0.8 },
        shortText: { initial: 10, sustained: 30, decay: 0.7 },
        longText: { initial: 15, sustained: 120, decay: 0.6 },
        image: { initial: 2, sustained: 10, decay: 0.9 },
        video: { initial: 5, sustained: 180, decay: 0.5 },
        form: { initial: 20, sustained: 60, decay: 0.7 },
        listing: { initial: 8, sustained: 45, decay: 0.75 },
        navigation: { initial: 2, sustained: 5, decay: 0.95 }
      },
      
      // Attention patterns
      patterns: {
        scanning: {
          speed: 'fast',
          depth: 'shallow',
          retention: 0.3,
          fatigueFactor: 0.5
        },
        reading: {
          speed: 'medium',
          depth: 'medium',
          retention: 0.6,
          fatigueFactor: 0.7
        },
        analyzing: {
          speed: 'slow',
          depth: 'deep',
          retention: 0.8,
          fatigueFactor: 0.9
        },
        browsing: {
          speed: 'variable',
          depth: 'shallow',
          retention: 0.4,
          fatigueFactor: 0.6
        }
      },
      
      // Distraction factors
      distractions: {
        notification: { probability: 0.05, duration: { min: 2, max: 10 } },
        phoneCheck: { probability: 0.08, duration: { min: 30, max: 120 } },
        environmental: { probability: 0.03, duration: { min: 5, max: 30 } },
        thought: { probability: 0.1, duration: { min: 1, max: 5 } }
      }
    };
  }

  initializeTaskPatterns() {
    return {
      // Task-specific timing patterns
      research: {
        phases: [
          { name: 'initial_scan', duration: { min: 60, max: 180 }, intensity: 0.6 },
          { name: 'deep_dive', duration: { min: 300, max: 900 }, intensity: 0.9 },
          { name: 'comparison', duration: { min: 180, max: 600 }, intensity: 0.8 },
          { name: 'decision', duration: { min: 60, max: 300 }, intensity: 0.7 }
        ],
        breakAfterPhase: 0.4,
        multiTabUsage: 0.8
      },
      
      browsing: {
        phases: [
          { name: 'exploration', duration: { min: 30, max: 120 }, intensity: 0.5 },
          { name: 'interest', duration: { min: 60, max: 300 }, intensity: 0.7 },
          { name: 'continuation', duration: { min: 30, max: 180 }, intensity: 0.4 }
        ],
        breakAfterPhase: 0.2,
        multiTabUsage: 0.6
      },
      
      evaluation: {
        phases: [
          { name: 'overview', duration: { min: 45, max: 120 }, intensity: 0.7 },
          { name: 'details', duration: { min: 120, max: 600 }, intensity: 0.85 },
          { name: 'verification', duration: { min: 90, max: 300 }, intensity: 0.8 },
          { name: 'consideration', duration: { min: 60, max: 180 }, intensity: 0.6 }
        ],
        breakAfterPhase: 0.5,
        multiTabUsage: 0.9
      },
      
      casual: {
        phases: [
          { name: 'scanning', duration: { min: 15, max: 60 }, intensity: 0.3 },
          { name: 'reading', duration: { min: 30, max: 180 }, intensity: 0.5 },
          { name: 'wandering', duration: { min: 20, max: 90 }, intensity: 0.2 }
        ],
        breakAfterPhase: 0.1,
        multiTabUsage: 0.3
      }
    };
  }

  determineMaxTabs() {
    // Determine realistic max concurrent tabs based on user type
    const hour = new Date().getHours();
    
    if (hour >= 9 && hour <= 17) {
      // Work hours - more tabs
      return 5 + Math.floor(Math.random() * 10); // 5-15 tabs
    } else if (hour >= 18 && hour <= 23) {
      // Evening - moderate tabs
      return 3 + Math.floor(Math.random() * 7); // 3-10 tabs
    } else {
      // Night/early morning - fewer tabs
      return 2 + Math.floor(Math.random() * 4); // 2-6 tabs
    }
  }

  initializeTabPatterns() {
    return {
      // Patterns for tab switching
      sequential: {
        probability: 0.3,
        timing: { min: 5000, max: 30000 },
        returnToOriginal: 0.6
      },
      
      random: {
        probability: 0.4,
        timing: { min: 3000, max: 20000 },
        returnToOriginal: 0.3
      },
      
      reference: {
        probability: 0.2,
        timing: { min: 1000, max: 5000 },
        returnToOriginal: 0.9
      },
      
      distracted: {
        probability: 0.1,
        timing: { min: 10000, max: 120000 },
        returnToOriginal: 0.2
      }
    };
  }

  calculateBiologicalPrime() {
    const hour = new Date().getHours();
    const energy = this.circadianRhythms.energyLevels[hour];
    
    // Find cognitive multiplier
    let cognitiveBoost = 1.0;
    for (const [period, data] of Object.entries(this.circadianRhythms.cognitiveMultipliers)) {
      if (hour >= data.start && hour <= data.end) {
        cognitiveBoost = data.multiplier;
        break;
      }
    }
    
    return {
      hour,
      energy,
      cognitive: cognitiveBoost,
      optimal: energy * cognitiveBoost > 80
    };
  }

  // Generate timing for next action
  async generateActionTiming(actionType, context = {}) {
    const timing = {
      delay: 0,
      duration: 0,
      confidence: 1.0,
      interrupted: false,
      distractions: []
    };
    
    // Base timing from action type
    const baseTiming = this.getBaseActionTiming(actionType);
    timing.delay = baseTiming.delay;
    timing.duration = baseTiming.duration;
    
    // Apply circadian adjustments
    const circadianAdjustment = this.applyCircadianAdjustment(timing);
    timing.delay *= circadianAdjustment.delayMultiplier;
    timing.duration *= circadianAdjustment.durationMultiplier;
    
    // Apply fatigue effects
    const fatigueAdjustment = this.applyFatigueEffects(timing);
    timing.delay *= fatigueAdjustment.delayMultiplier;
    timing.confidence *= fatigueAdjustment.confidence;
    
    // Check for necessary breaks
    const breakNeeded = this.checkBreakNecessity();
    if (breakNeeded) {
      timing.breakFirst = breakNeeded;
      timing.delay += breakNeeded.duration;
    }
    
    // Add natural variations
    timing.delay = this.addNaturalVariation(timing.delay);
    timing.duration = this.addNaturalVariation(timing.duration);
    
    // Simulate distractions
    const distractions = this.simulateDistractions(timing.duration);
    if (distractions.length > 0) {
      timing.distractions = distractions;
      timing.interrupted = distractions.some(d => d.type === 'major');
    }
    
    return timing;
  }

  getBaseActionTiming(actionType) {
    const timings = {
      click: { delay: { min: 200, max: 800 }, duration: { min: 50, max: 150 } },
      hover: { delay: { min: 100, max: 400 }, duration: { min: 200, max: 1000 } },
      scroll: { delay: { min: 500, max: 2000 }, duration: { min: 1000, max: 5000 } },
      read: { delay: { min: 0, max: 500 }, duration: { min: 3000, max: 30000 } },
      type: { delay: { min: 300, max: 1000 }, duration: { min: 1000, max: 10000 } },
      navigate: { delay: { min: 1000, max: 3000 }, duration: { min: 0, max: 0 } },
      think: { delay: { min: 500, max: 3000 }, duration: { min: 1000, max: 5000 } },
      scan: { delay: { min: 100, max: 500 }, duration: { min: 500, max: 3000 } }
    };
    
    const timing = timings[actionType] || timings.think;
    
    return {
      delay: this.randomInRange(timing.delay.min, timing.delay.max),
      duration: this.randomInRange(timing.duration.min, timing.duration.max)
    };
  }

  applyCircadianAdjustment(timing) {
    const currentHour = new Date().getHours();
    const energy = this.circadianRhythms.energyLevels[currentHour];
    const normalized = energy / 100;
    
    return {
      delayMultiplier: 2 - normalized, // Low energy = longer delays
      durationMultiplier: 0.5 + normalized * 0.5 // Low energy = shorter attention
    };
  }

  applyFatigueEffects(timing) {
    const sessionDuration = Date.now() - this.userState.startTime;
    const minutesActive = sessionDuration / 60000;
    
    // Fatigue accumulation model
    let fatigue = 0;
    if (minutesActive < 30) {
      fatigue = 0.05;
    } else if (minutesActive < 60) {
      fatigue = 0.15;
    } else if (minutesActive < 120) {
      fatigue = 0.3;
    } else {
      fatigue = 0.5;
    }
    
    // Recent break bonus
    const timeSinceBreak = Date.now() - this.userState.lastBreak;
    if (timeSinceBreak < 600000) { // Within 10 minutes
      fatigue *= 0.5;
    }
    
    return {
      delayMultiplier: 1 + fatigue,
      confidence: 1 - fatigue * 0.5
    };
  }

  checkBreakNecessity() {
    const timeSinceBreak = Date.now() - this.userState.lastBreak;
    const currentPeriod = this.getCurrentPeriod();
    const breakConfig = this.circadianRhythms.breakNeeds[currentPeriod];
    
    // Check if break is needed
    if (timeSinceBreak > breakConfig.frequency * 60000) {
      const duration = this.randomInRange(
        breakConfig.duration.min * 60000,
        breakConfig.duration.max * 60000
      );
      
      return {
        type: this.selectBreakType(duration),
        duration: duration,
        reason: 'scheduled'
      };
    }
    
    // Fatigue-based break
    if (this.userState.currentEnergy < 30) {
      return {
        type: 'fatigue',
        duration: this.randomInRange(300000, 900000), // 5-15 minutes
        reason: 'low_energy'
      };
    }
    
    // Task-based break
    if (this.userState.tasksSinceBreak > 10) {
      return {
        type: 'task_transition',
        duration: this.randomInRange(60000, 180000), // 1-3 minutes
        reason: 'task_completion'
      };
    }
    
    return null;
  }

  getCurrentPeriod() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  selectBreakType(duration) {
    if (duration < 120000) return 'micro'; // < 2 minutes
    if (duration < 600000) return 'short'; // < 10 minutes
    if (duration < 1800000) return 'medium'; // < 30 minutes
    return 'long';
  }

  addNaturalVariation(value) {
    // Add 10-30% random variation
    const variation = 0.1 + Math.random() * 0.2;
    const direction = Math.random() < 0.5 ? -1 : 1;
    return value * (1 + direction * variation);
  }

  simulateDistractions(duration) {
    const distractions = [];
    let remainingTime = duration;
    
    for (const [type, config] of Object.entries(this.attentionModels.distractions)) {
      if (Math.random() < config.probability * (duration / 60000)) {
        const distractionTime = this.randomInRange(
          config.duration.min * 1000,
          config.duration.max * 1000
        );
        
        distractions.push({
          type: type,
          startTime: Math.random() * remainingTime,
          duration: distractionTime,
          severity: distractionTime > 30000 ? 'major' : 'minor'
        });
        
        remainingTime -= distractionTime;
      }
    }
    
    return distractions.sort((a, b) => a.startTime - b.startTime);
  }

  // Multi-tab behavior simulation
  async simulateTabBehavior(currentActivity) {
    const pattern = this.selectTabPattern(currentActivity);
    const behavior = {
      action: 'continue',
      targetTab: null,
      newTab: null,
      duration: 0
    };
    
    // Check if should switch tabs
    if (this.shouldSwitchTabs(pattern)) {
      behavior.action = 'switch';
      behavior.targetTab = this.selectTargetTab(pattern);
      behavior.duration = this.randomInRange(
        pattern.timing.min,
        pattern.timing.max
      );
    }
    
    // Check if should open new tab
    else if (this.shouldOpenNewTab(currentActivity)) {
      behavior.action = 'new_tab';
      behavior.newTab = this.generateNewTabContext();
      behavior.duration = this.randomInRange(1000, 3000);
    }
    
    // Check if should close tab
    else if (this.shouldCloseTab()) {
      behavior.action = 'close_tab';
      behavior.targetTab = this.selectTabToClose();
    }
    
    return behavior;
  }

  selectTabPattern(activity) {
    const taskPattern = this.taskPatterns[activity.type] || this.taskPatterns.browsing;
    const multiTabProbability = taskPattern.multiTabUsage;
    
    if (Math.random() > multiTabProbability) {
      return { probability: 0, timing: { min: 0, max: 0 } };
    }
    
    // Weight patterns based on activity
    const patterns = { ...this.tabBehavior.tabSwitchPatterns };
    
    if (activity.type === 'research') {
      patterns.reference.probability *= 2;
      patterns.sequential.probability *= 1.5;
    }
    
    return this.weightedRandomSelect(patterns);
  }

  shouldSwitchTabs(pattern) {
    if (this.tabBehavior.currentTabs.length < 2) return false;
    
    const lastSwitch = this.tabBehavior.lastSwitch || 0;
    const timeSinceSwitch = Date.now() - lastSwitch;
    
    // Minimum time between switches
    if (timeSinceSwitch < 3000) return false;
    
    return Math.random() < pattern.probability;
  }

  shouldOpenNewTab(activity) {
    if (this.tabBehavior.currentTabs.length >= this.tabBehavior.maxConcurrentTabs) {
      return false;
    }
    
    // Activity-based probability
    const probabilities = {
      research: 0.05,
      evaluation: 0.08,
      browsing: 0.03,
      casual: 0.02
    };
    
    return Math.random() < (probabilities[activity.type] || 0.02);
  }

  shouldCloseTab() {
    if (this.tabBehavior.currentTabs.length <= 1) return false;
    
    // Close old tabs
    const oldestTab = this.tabBehavior.currentTabs
      .sort((a, b) => a.lastActive - b.lastActive)[0];
    
    const tabAge = Date.now() - oldestTab.lastActive;
    
    // Probability increases with age
    const closeProbability = Math.min(0.5, tabAge / 3600000); // Max 50% after 1 hour
    
    return Math.random() < closeProbability;
  }

  selectTargetTab(pattern) {
    const currentIndex = this.tabBehavior.currentTabs
      .findIndex(tab => tab.id === this.tabBehavior.focusedTab);
    
    let targetIndex;
    
    switch (pattern.type) {
      case 'sequential':
        targetIndex = (currentIndex + 1) % this.tabBehavior.currentTabs.length;
        break;
        
      case 'reference':
        // Return to previous tab
        targetIndex = this.tabBehavior.previousTab || 0;
        break;
        
      case 'random':
        do {
          targetIndex = Math.floor(Math.random() * this.tabBehavior.currentTabs.length);
        } while (targetIndex === currentIndex);
        break;
        
      default:
        targetIndex = 0;
    }
    
    return this.tabBehavior.currentTabs[targetIndex];
  }

  generateNewTabContext() {
    const contexts = [
      { type: 'search', url: 'https://www.google.com/search?q=', query: this.generateSearchQuery() },
      { type: 'direct', url: 'https://flippa.com/search' },
      { type: 'reference', url: 'https://en.wikipedia.org/wiki/Website_flipping' },
      { type: 'tool', url: 'https://www.similarweb.com/' },
      { type: 'news', url: 'https://news.ycombinator.com/' }
    ];
    
    return contexts[Math.floor(Math.random() * contexts.length)];
  }

  generateSearchQuery() {
    const queries = [
      'website valuation calculator',
      'online business due diligence',
      'website traffic verification',
      'flippa alternatives',
      'buying websites guide',
      'website revenue verification'
    ];
    
    return queries[Math.floor(Math.random() * queries.length)];
  }

  selectTabToClose() {
    // Close least recently used tab that's not currently focused
    const candidates = this.tabBehavior.currentTabs
      .filter(tab => tab.id !== this.tabBehavior.focusedTab)
      .sort((a, b) => a.lastActive - b.lastActive);
    
    return candidates[0];
  }

  // Update user state based on actions
  updateUserState(action, duration) {
    // Update energy
    const energyDrain = this.calculateEnergyDrain(action, duration);
    this.userState.currentEnergy = Math.max(0, this.userState.currentEnergy - energyDrain);
    
    // Update focus
    const focusChange = this.calculateFocusChange(action, duration);
    this.userState.currentFocus = Math.max(0, Math.min(100, 
      this.userState.currentFocus + focusChange
    ));
    
    // Update activity tracking
    this.userState.totalActiveTime += duration;
    this.userState.tasksSinceBreak++;
    
    // Update biological prime
    this.userState.biologicalPrime = this.calculateBiologicalPrime();
  }

  calculateEnergyDrain(action, duration) {
    const drainRates = {
      read: 0.002,      // per second
      analyze: 0.003,
      type: 0.0025,
      navigate: 0.001,
      scroll: 0.0005,
      wait: -0.001     // Recovery
    };
    
    const rate = drainRates[action.type] || 0.001;
    return rate * (duration / 1000) * (2 - this.userState.biologicalPrime.cognitive);
  }

  calculateFocusChange(action, duration) {
    // Focus improves with engagement, decreases with repetition
    const baseChange = {
      interesting: 5,
      routine: -2,
      difficult: -3,
      success: 10,
      failure: -5
    };
    
    let change = 0;
    
    // Determine action impact
    if (action.interest > 0.7) change += baseChange.interesting;
    if (action.repetition > 3) change += baseChange.routine;
    if (action.complexity > 0.8) change += baseChange.difficult;
    
    // Scale by duration (longer = more impact)
    change *= Math.min(1, duration / 30000);
    
    return change;
  }

  // Execute break behavior
  async executeBreak(page, breakConfig) {
    console.log(`Taking ${breakConfig.type} break for ${breakConfig.duration / 1000}s`);
    
    const breakBehaviors = {
      micro: async () => {
        // Just pause, maybe move mouse slightly
        await page.waitForTimeout(breakConfig.duration);
      },
      
      short: async () => {
        // Switch to another tab or minimize
        if (Math.random() < 0.7) {
          await page.evaluate(() => document.hidden = true);
        }
        await page.waitForTimeout(breakConfig.duration);
        await page.evaluate(() => document.hidden = false);
      },
      
      medium: async () => {
        // Navigate away temporarily
        const breakSites = [
          'https://www.youtube.com',
          'https://www.reddit.com',
          'https://news.google.com'
        ];
        
        const originalUrl = page.url();
        const breakSite = breakSites[Math.floor(Math.random() * breakSites.length)];
        
        await page.goto(breakSite);
        await page.waitForTimeout(breakConfig.duration * 0.8);
        await page.goto(originalUrl);
        await page.waitForTimeout(breakConfig.duration * 0.2);
      },
      
      long: async () => {
        // Simulate leaving computer
        await page.evaluate(() => {
          document.body.style.filter = 'blur(5px)';
          document.body.style.pointerEvents = 'none';
        });
        
        await page.waitForTimeout(breakConfig.duration);
        
        await page.evaluate(() => {
          document.body.style.filter = '';
          document.body.style.pointerEvents = '';
        });
      }
    };
    
    const behavior = breakBehaviors[breakConfig.type] || breakBehaviors.micro;
    await behavior();
    
    // Update state after break
    this.userState.lastBreak = Date.now();
    this.userState.breaksTaken++;
    this.userState.tasksSinceBreak = 0;
    
    // Energy recovery
    const recovery = {
      micro: 5,
      short: 15,
      medium: 30,
      long: 50
    };
    
    this.userState.currentEnergy = Math.min(100, 
      this.userState.currentEnergy + (recovery[breakConfig.type] || 5)
    );
  }

  // Utility functions
  randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  weightedRandomSelect(options) {
    const weights = Object.values(options).map(opt => opt.probability);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    let random = Math.random() * totalWeight;
    let index = 0;
    
    for (const [key, option] of Object.entries(options)) {
      random -= option.probability;
      if (random <= 0) {
        return { ...option, type: key };
      }
    }
    
    return Object.values(options)[0];
  }

  // Get current state summary
  getStateS ummary() {
    return {
      energy: this.userState.currentEnergy,
      focus: this.userState.currentFocus,
      sessionDuration: Date.now() - this.userState.startTime,
      breaksDue: Date.now() - this.userState.lastBreak > 1800000,
      optimalTime: this.userState.biologicalPrime.optimal,
      activeT abs: this.tabBehavior.currentTabs.length,
      fatigue: 100 - this.userState.currentEnergy,
      recommendation: this.getActivityRecommendation()
    };
  }

  getActivityRecommendation() {
    if (this.userState.currentEnergy < 30) {
      return 'Take a break - energy low';
    }
    
    if (this.userState.currentFocus < 40) {
      return 'Switch to lighter tasks - focus depleted';
    }
    
    if (this.userState.biologicalPrime.optimal) {
      return 'Optimal time for complex tasks';
    }
    
    return 'Continue current activity';
  }
}

module.exports = IntelligentTimingEngine;