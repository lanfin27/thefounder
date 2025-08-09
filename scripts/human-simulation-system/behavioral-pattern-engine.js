// behavioral-pattern-engine.js
// Sophisticated behavioral patterns mimicking genuine users

const { performance } = require('perf_hooks');

class BehavioralPatternEngine {
  constructor() {
    // Human behavior models based on research
    this.behaviorProfiles = {
      casual: this.createCasualUserProfile(),
      focused: this.createFocusedUserProfile(),
      explorer: this.createExplorerProfile(),
      researcher: this.createResearcherProfile(),
      impulsive: this.createImpulsiveProfile()
    };

    // Current behavior state
    this.currentProfile = null;
    this.behaviorState = {
      energy: 100, // 0-100, decreases over time
      focus: 80,    // 0-100, varies with task
      patience: 70, // 0-100, affects timing
      curiosity: 50 // 0-100, affects exploration
    };

    // Interaction history for pattern consistency
    this.interactionHistory = [];
    this.mouseTrail = [];
    this.scrollHistory = [];
    this.clickHistory = [];
  }

  createCasualUserProfile() {
    return {
      name: 'casual',
      mouseMovement: {
        speed: { min: 200, max: 600, avg: 400 }, // pixels/second
        acceleration: 'natural', // smooth acceleration curves
        curveComplexity: 0.7, // 0-1, how curved movements are
        overshooting: 0.2, // 0-1, tendency to overshoot targets
        jitter: { min: 1, max: 4 }, // micro movements in pixels
        pauseFrequency: 0.25, // how often mouse stops
        pauseDuration: { min: 100, max: 800 } // milliseconds
      },
      scrolling: {
        speed: { min: 50, max: 200 }, // pixels per event
        smoothness: 0.8, // 0-1, how smooth scrolling is
        momentum: true, // continues after release
        readingPattern: 'skim', // skim, thorough, or mixed
        pauseAtInteresting: 0.6, // 0-1, chance to pause
        backtrackFrequency: 0.15 // chance to scroll back up
      },
      clicking: {
        accuracy: 0.92, // 0-1, how accurately they hit targets
        doubleClickSpeed: { min: 200, max: 400 }, // ms between clicks
        hesitation: { min: 100, max: 300 }, // ms before clicking
        missClickRate: 0.03, // chance of clicking wrong area
        dragThreshold: 5 // pixels before considered drag
      },
      navigation: {
        dwellTime: { min: 3000, max: 15000 }, // ms on page
        backButtonUsage: 0.25, // probability
        tabSwitching: 0.3, // probability per page
        newTabBehavior: 'background', // background or foreground
        bookmarkUsage: 0.1 // probability
      },
      reading: {
        wordsPerMinute: 250,
        comprehensionPauses: true,
        skimProbability: 0.4,
        regressionRate: 0.15 // re-reading previous text
      }
    };
  }

  createFocusedUserProfile() {
    return {
      name: 'focused',
      mouseMovement: {
        speed: { min: 300, max: 800, avg: 550 },
        acceleration: 'quick',
        curveComplexity: 0.4, // more direct movements
        overshooting: 0.1,
        jitter: { min: 0, max: 2 },
        pauseFrequency: 0.1,
        pauseDuration: { min: 50, max: 200 }
      },
      scrolling: {
        speed: { min: 100, max: 300 },
        smoothness: 0.9,
        momentum: true,
        readingPattern: 'thorough',
        pauseAtInteresting: 0.8,
        backtrackFrequency: 0.25
      },
      clicking: {
        accuracy: 0.98,
        doubleClickSpeed: { min: 150, max: 250 },
        hesitation: { min: 50, max: 150 },
        missClickRate: 0.01,
        dragThreshold: 3
      },
      navigation: {
        dwellTime: { min: 10000, max: 60000 },
        backButtonUsage: 0.1,
        tabSwitching: 0.1,
        newTabBehavior: 'foreground',
        bookmarkUsage: 0.3
      },
      reading: {
        wordsPerMinute: 300,
        comprehensionPauses: true,
        skimProbability: 0.2,
        regressionRate: 0.1
      }
    };
  }

  createExplorerProfile() {
    return {
      name: 'explorer',
      mouseMovement: {
        speed: { min: 400, max: 1000, avg: 700 },
        acceleration: 'varied',
        curveComplexity: 0.8,
        overshooting: 0.3,
        jitter: { min: 2, max: 6 },
        pauseFrequency: 0.4,
        pauseDuration: { min: 200, max: 1000 }
      },
      scrolling: {
        speed: { min: 150, max: 400 },
        smoothness: 0.6,
        momentum: true,
        readingPattern: 'mixed',
        pauseAtInteresting: 0.7,
        backtrackFrequency: 0.3
      },
      clicking: {
        accuracy: 0.88,
        doubleClickSpeed: { min: 200, max: 350 },
        hesitation: { min: 50, max: 200 },
        missClickRate: 0.05,
        dragThreshold: 8
      },
      navigation: {
        dwellTime: { min: 2000, max: 10000 },
        backButtonUsage: 0.4,
        tabSwitching: 0.5,
        newTabBehavior: 'mixed',
        bookmarkUsage: 0.05
      },
      reading: {
        wordsPerMinute: 350,
        comprehensionPauses: false,
        skimProbability: 0.7,
        regressionRate: 0.05
      }
    };
  }

  createResearcherProfile() {
    return {
      name: 'researcher',
      mouseMovement: {
        speed: { min: 250, max: 600, avg: 400 },
        acceleration: 'smooth',
        curveComplexity: 0.5,
        overshooting: 0.15,
        jitter: { min: 1, max: 3 },
        pauseFrequency: 0.35,
        pauseDuration: { min: 300, max: 2000 }
      },
      scrolling: {
        speed: { min: 80, max: 250 },
        smoothness: 0.85,
        momentum: true,
        readingPattern: 'thorough',
        pauseAtInteresting: 0.9,
        backtrackFrequency: 0.35
      },
      clicking: {
        accuracy: 0.95,
        doubleClickSpeed: { min: 250, max: 400 },
        hesitation: { min: 200, max: 500 },
        missClickRate: 0.02,
        dragThreshold: 4
      },
      navigation: {
        dwellTime: { min: 15000, max: 120000 },
        backButtonUsage: 0.3,
        tabSwitching: 0.6,
        newTabBehavior: 'background',
        bookmarkUsage: 0.4
      },
      reading: {
        wordsPerMinute: 280,
        comprehensionPauses: true,
        skimProbability: 0.3,
        regressionRate: 0.2
      }
    };
  }

  createImpulsiveProfile() {
    return {
      name: 'impulsive',
      mouseMovement: {
        speed: { min: 500, max: 1200, avg: 850 },
        acceleration: 'jerky',
        curveComplexity: 0.3,
        overshooting: 0.4,
        jitter: { min: 3, max: 8 },
        pauseFrequency: 0.15,
        pauseDuration: { min: 50, max: 300 }
      },
      scrolling: {
        speed: { min: 200, max: 600 },
        smoothness: 0.4,
        momentum: true,
        readingPattern: 'skim',
        pauseAtInteresting: 0.3,
        backtrackFrequency: 0.1
      },
      clicking: {
        accuracy: 0.85,
        doubleClickSpeed: { min: 100, max: 200 },
        hesitation: { min: 0, max: 100 },
        missClickRate: 0.08,
        dragThreshold: 10
      },
      navigation: {
        dwellTime: { min: 1000, max: 5000 },
        backButtonUsage: 0.5,
        tabSwitching: 0.2,
        newTabBehavior: 'foreground',
        bookmarkUsage: 0.02
      },
      reading: {
        wordsPerMinute: 400,
        comprehensionPauses: false,
        skimProbability: 0.9,
        regressionRate: 0.02
      }
    };
  }

  // Select profile based on context
  selectProfile(context = {}) {
    const { timeOfDay, sessionDuration, taskType } = context;
    
    // Morning users tend to be more focused
    if (timeOfDay >= 6 && timeOfDay <= 10) {
      return Math.random() < 0.6 ? 'focused' : 'researcher';
    }
    
    // Afternoon can be mixed
    if (timeOfDay >= 10 && timeOfDay <= 16) {
      const profiles = ['casual', 'focused', 'explorer', 'researcher'];
      return profiles[Math.floor(Math.random() * profiles.length)];
    }
    
    // Evening tends toward casual browsing
    if (timeOfDay >= 16 && timeOfDay <= 22) {
      return Math.random() < 0.7 ? 'casual' : 'explorer';
    }
    
    // Late night can be impulsive
    return Math.random() < 0.4 ? 'impulsive' : 'casual';
  }

  // Generate realistic mouse movement path
  generateMousePath(startX, startY, endX, endY, profile) {
    const path = [];
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const duration = distance / ((profile.mouseMovement.speed.min + profile.mouseMovement.speed.max) / 2);
    const steps = Math.max(5, Math.floor(duration / 16)); // 60fps equivalent

    // Generate control points for bezier curve
    const controlPoints = this.generateBezierControlPoints(
      startX, startY, endX, endY, 
      profile.mouseMovement.curveComplexity,
      profile.mouseMovement.overshooting
    );

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.calculateBezierPoint(t, { x: startX, y: startY }, controlPoints, { x: endX, y: endY });
      
      // Add jitter
      const jitter = profile.mouseMovement.jitter;
      point.x += (Math.random() - 0.5) * (jitter.min + Math.random() * (jitter.max - jitter.min));
      point.y += (Math.random() - 0.5) * (jitter.min + Math.random() * (jitter.max - jitter.min));
      
      // Calculate timing with acceleration
      const timing = this.calculateMovementTiming(t, profile.mouseMovement.acceleration);
      
      path.push({
        x: Math.round(point.x),
        y: Math.round(point.y),
        time: timing * duration,
        pressure: 0.5 + Math.random() * 0.3 // Simulate touch pressure
      });
    }

    // Add pauses based on profile
    if (Math.random() < profile.mouseMovement.pauseFrequency) {
      const pauseIndex = Math.floor(path.length * 0.3 + Math.random() * path.length * 0.4);
      const pauseDuration = profile.mouseMovement.pauseDuration;
      const pause = pauseDuration.min + Math.random() * (pauseDuration.max - pauseDuration.min);
      
      for (let i = pauseIndex; i < path.length; i++) {
        path[i].time += pause;
      }
    }

    return path;
  }

  generateBezierControlPoints(x1, y1, x2, y2, complexity, overshoot) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    
    // Generate control points with natural curve
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = angle + Math.PI / 2;
    
    const offset = distance * complexity * 0.3;
    
    const cp1 = {
      x: midX + Math.cos(perpAngle) * offset * (Math.random() - 0.5),
      y: midY + Math.sin(perpAngle) * offset * (Math.random() - 0.5)
    };
    
    // Add overshoot to end point
    if (Math.random() < overshoot) {
      const overshootDist = distance * 0.1 * Math.random();
      cp1.x = x2 + Math.cos(angle) * overshootDist;
      cp1.y = y2 + Math.sin(angle) * overshootDist;
    }
    
    return cp1;
  }

  calculateBezierPoint(t, p0, p1, p2) {
    const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
    const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
    return { x, y };
  }

  calculateMovementTiming(t, acceleration) {
    switch (acceleration) {
      case 'natural':
        // Ease-in-out curve
        return t < 0.5 
          ? 2 * t * t 
          : -1 + (4 - 2 * t) * t;
      
      case 'quick':
        // Fast start, slow end
        return Math.sqrt(t);
      
      case 'smooth':
        // Smooth acceleration
        return t * t * (3 - 2 * t);
      
      case 'jerky':
        // Sudden movements
        return t < 0.2 ? 0 : t < 0.8 ? (t - 0.2) / 0.6 : 1;
      
      case 'varied':
        // Mix of patterns
        const pattern = Math.random();
        if (pattern < 0.33) return t * t;
        if (pattern < 0.66) return Math.sqrt(t);
        return t;
      
      default:
        return t;
    }
  }

  // Generate scroll behavior
  generateScrollPattern(currentY, targetY, profile) {
    const pattern = [];
    const distance = Math.abs(targetY - currentY);
    const direction = targetY > currentY ? 1 : -1;
    
    let position = currentY;
    let velocity = 0;
    let time = 0;
    
    while (Math.abs(position - targetY) > 10) {
      // Calculate scroll delta based on profile
      const speed = profile.scrolling.speed;
      const baseSpeed = speed.min + Math.random() * (speed.max - speed.min);
      
      // Apply smoothness
      velocity = velocity * profile.scrolling.smoothness + baseSpeed * (1 - profile.scrolling.smoothness);
      
      // Add reading pauses
      if (profile.scrolling.readingPattern === 'thorough' && Math.random() < 0.1) {
        pattern.push({
          y: Math.round(position),
          deltaY: 0,
          time: time,
          pause: 500 + Math.random() * 1500
        });
        time += 500 + Math.random() * 1500;
      }
      
      const deltaY = direction * velocity;
      position += deltaY;
      
      pattern.push({
        y: Math.round(position),
        deltaY: Math.round(deltaY),
        time: time,
        wheelDelta: -deltaY, // Wheel events are inverted
        buttons: 0,
        momentum: profile.scrolling.momentum
      });
      
      time += 16 + Math.random() * 32; // Variable frame timing
      
      // Backtrack behavior
      if (Math.random() < profile.scrolling.backtrackFrequency * 0.01) {
        const backtrack = this.generateBacktrackScroll(position, profile);
        pattern.push(...backtrack);
        time += backtrack.length * 20;
      }
    }
    
    return pattern;
  }

  generateBacktrackScroll(currentPosition, profile) {
    const backtrackDistance = 100 + Math.random() * 300;
    const steps = 5 + Math.floor(Math.random() * 10);
    const pattern = [];
    
    for (let i = 0; i < steps; i++) {
      pattern.push({
        y: currentPosition - (backtrackDistance / steps) * i,
        deltaY: -(backtrackDistance / steps),
        time: i * 20,
        wheelDelta: backtrackDistance / steps,
        momentum: false
      });
    }
    
    return pattern;
  }

  // Generate click patterns
  generateClickPattern(x, y, profile) {
    const pattern = {
      hesitation: profile.clicking.hesitation.min + 
                  Math.random() * (profile.clicking.hesitation.max - profile.clicking.hesitation.min),
      accuracy: this.calculateClickAccuracy(x, y, profile.clicking.accuracy),
      pressure: 0.5 + Math.random() * 0.4,
      duration: 50 + Math.random() * 150, // How long button is held
      buttons: 1, // Left click
      modifiers: this.generateClickModifiers()
    };
    
    // Simulate miss-clicks
    if (Math.random() < profile.clicking.missClickRate) {
      pattern.accuracy.x += (Math.random() - 0.5) * 50;
      pattern.accuracy.y += (Math.random() - 0.5) * 50;
      pattern.isMissClick = true;
    }
    
    return pattern;
  }

  calculateClickAccuracy(targetX, targetY, accuracyRate) {
    const maxOffset = (1 - accuracyRate) * 20; // Max 20px offset at 0% accuracy
    return {
      x: targetX + (Math.random() - 0.5) * maxOffset,
      y: targetY + (Math.random() - 0.5) * maxOffset
    };
  }

  generateClickModifiers() {
    const modifiers = {
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false
    };
    
    // Occasionally hold modifier keys
    if (Math.random() < 0.05) modifiers.ctrlKey = true;
    if (Math.random() < 0.02) modifiers.shiftKey = true;
    
    return modifiers;
  }

  // Generate reading behavior
  generateReadingPattern(content, profile) {
    const words = content.split(/\s+/).length;
    const readingTime = (words / profile.reading.wordsPerMinute) * 60000; // Convert to ms
    
    const pattern = {
      totalTime: readingTime,
      scrollEvents: [],
      focusPoints: [],
      regressions: []
    };
    
    // Generate focus points (where eyes pause)
    const focusCount = Math.floor(words / 10); // Roughly every 10 words
    for (let i = 0; i < focusCount; i++) {
      const position = (i / focusCount) + (Math.random() - 0.5) * 0.1;
      pattern.focusPoints.push({
        position: Math.max(0, Math.min(1, position)),
        duration: 200 + Math.random() * 600,
        time: (i / focusCount) * readingTime
      });
    }
    
    // Add comprehension pauses
    if (profile.reading.comprehensionPauses) {
      const pauseCount = Math.floor(words / 50);
      for (let i = 0; i < pauseCount; i++) {
        pattern.focusPoints.push({
          position: Math.random(),
          duration: 1000 + Math.random() * 2000,
          time: Math.random() * readingTime,
          isPause: true
        });
      }
    }
    
    // Add regressions (re-reading)
    const regressionCount = Math.floor(words * profile.reading.regressionRate / 100);
    for (let i = 0; i < regressionCount; i++) {
      const fromPos = 0.2 + Math.random() * 0.6;
      pattern.regressions.push({
        from: fromPos,
        to: fromPos - 0.05 - Math.random() * 0.15,
        time: fromPos * readingTime,
        duration: 500 + Math.random() * 1000
      });
    }
    
    return pattern;
  }

  // Update behavior state based on time and actions
  updateBehaviorState(elapsedTime, actionsPerformed) {
    // Decrease energy over time
    this.behaviorState.energy = Math.max(0, this.behaviorState.energy - elapsedTime / 60000); // -1 per minute
    
    // Focus decreases with low energy
    if (this.behaviorState.energy < 30) {
      this.behaviorState.focus = Math.max(20, this.behaviorState.focus - 0.5);
    }
    
    // Patience decreases with repetitive actions
    if (actionsPerformed.filter(a => a === 'wait').length > 5) {
      this.behaviorState.patience = Math.max(10, this.behaviorState.patience - 5);
    }
    
    // Curiosity increases when seeing new content
    if (actionsPerformed.includes('new_page')) {
      this.behaviorState.curiosity = Math.min(100, this.behaviorState.curiosity + 10);
    }
    
    // Simulate fatigue patterns
    if (this.behaviorState.energy < 20) {
      // Tired users make more mistakes
      if (this.currentProfile) {
        this.currentProfile.clicking.missClickRate *= 1.5;
        this.currentProfile.clicking.accuracy *= 0.9;
      }
    }
  }

  // Generate natural breaks and pauses
  generateBreakPattern(sessionDuration) {
    const breakPatterns = [];
    
    // Micro-breaks (1-10 seconds)
    const microBreaks = Math.floor(sessionDuration / 300000); // Every 5 minutes
    for (let i = 0; i < microBreaks; i++) {
      breakPatterns.push({
        type: 'micro',
        time: (i + 1) * 300000 + (Math.random() - 0.5) * 60000,
        duration: 1000 + Math.random() * 9000,
        activity: 'pause' // Just stop moving
      });
    }
    
    // Short breaks (30 seconds - 2 minutes)
    const shortBreaks = Math.floor(sessionDuration / 1200000); // Every 20 minutes
    for (let i = 0; i < shortBreaks; i++) {
      breakPatterns.push({
        type: 'short',
        time: (i + 1) * 1200000 + (Math.random() - 0.5) * 300000,
        duration: 30000 + Math.random() * 90000,
        activity: Math.random() < 0.5 ? 'tab_switch' : 'window_blur'
      });
    }
    
    // Long breaks (5-15 minutes)
    if (sessionDuration > 3600000) { // After 1 hour
      breakPatterns.push({
        type: 'long',
        time: 3600000 + Math.random() * 1800000,
        duration: 300000 + Math.random() * 600000,
        activity: 'away'
      });
    }
    
    return breakPatterns.sort((a, b) => a.time - b.time);
  }

  // Simulate attention patterns
  generateAttentionPattern(content, profile) {
    const elements = this.identifyInterestingElements(content);
    const attentionSpans = [];
    
    elements.forEach(element => {
      const baseAttention = this.calculateBaseAttention(element.type, profile);
      const personalInterest = this.calculatePersonalInterest(element, profile);
      
      attentionSpans.push({
        element: element,
        duration: baseAttention * personalInterest * this.behaviorState.focus / 100,
        gazePath: this.generateGazePath(element.bounds),
        interactions: this.predictInteractions(element, profile)
      });
    });
    
    return attentionSpans;
  }

  identifyInterestingElements(content) {
    // Simplified - in real implementation would analyze DOM
    return [
      { type: 'headline', importance: 0.9, bounds: { x: 100, y: 100, w: 800, h: 100 } },
      { type: 'image', importance: 0.8, bounds: { x: 100, y: 250, w: 400, h: 300 } },
      { type: 'button', importance: 0.7, bounds: { x: 500, y: 400, w: 200, h: 50 } },
      { type: 'text', importance: 0.6, bounds: { x: 100, y: 500, w: 800, h: 200 } }
    ];
  }

  calculateBaseAttention(elementType, profile) {
    const attentionMap = {
      headline: 2000,
      image: 3000,
      video: 10000,
      button: 1000,
      text: 5000,
      form: 4000,
      link: 800
    };
    
    let baseTime = attentionMap[elementType] || 1000;
    
    // Adjust based on profile
    if (profile.name === 'explorer') baseTime *= 0.6;
    if (profile.name === 'researcher') baseTime *= 1.5;
    if (profile.name === 'impulsive') baseTime *= 0.3;
    
    return baseTime;
  }

  calculatePersonalInterest(element, profile) {
    // Simulate personal preferences
    let interest = 1.0;
    
    // Some randomness in what catches attention
    interest *= 0.7 + Math.random() * 0.6;
    
    // Profile-based adjustments
    if (element.type === 'image' && profile.name === 'casual') interest *= 1.2;
    if (element.type === 'text' && profile.name === 'researcher') interest *= 1.3;
    
    return interest;
  }

  generateGazePath(bounds) {
    // F-pattern or Z-pattern reading
    const pattern = Math.random() < 0.7 ? 'F' : 'Z';
    const points = [];
    
    if (pattern === 'F') {
      // Top horizontal
      points.push({ x: bounds.x, y: bounds.y });
      points.push({ x: bounds.x + bounds.w, y: bounds.y });
      
      // Down and second horizontal
      points.push({ x: bounds.x, y: bounds.y + bounds.h * 0.3 });
      points.push({ x: bounds.x + bounds.w * 0.7, y: bounds.y + bounds.h * 0.3 });
      
      // Vertical scan
      points.push({ x: bounds.x, y: bounds.y + bounds.h });
    } else {
      // Z-pattern
      points.push({ x: bounds.x, y: bounds.y });
      points.push({ x: bounds.x + bounds.w, y: bounds.y });
      points.push({ x: bounds.x, y: bounds.y + bounds.h });
      points.push({ x: bounds.x + bounds.w, y: bounds.y + bounds.h });
    }
    
    // Add saccades (quick eye movements)
    const gazePath = [];
    points.forEach((point, i) => {
      gazePath.push({
        ...point,
        fixationDuration: 200 + Math.random() * 400,
        saccadeDuration: 20 + Math.random() * 30
      });
    });
    
    return gazePath;
  }

  predictInteractions(element, profile) {
    const interactions = [];
    
    // Hover probability
    if (element.type === 'button' || element.type === 'link') {
      if (Math.random() < 0.7) {
        interactions.push({
          type: 'hover',
          duration: 200 + Math.random() * 800,
          timing: Math.random() * 0.5 // First half of attention span
        });
      }
    }
    
    // Click probability
    let clickProbability = 0;
    switch (element.type) {
      case 'button': clickProbability = 0.6; break;
      case 'link': clickProbability = 0.3; break;
      case 'image': clickProbability = 0.1; break;
    }
    
    if (Math.random() < clickProbability * profile.behaviorState.curiosity / 100) {
      interactions.push({
        type: 'click',
        timing: 0.6 + Math.random() * 0.3 // Later in attention span
      });
    }
    
    return interactions;
  }

  // Execute behavior pattern
  async executeBehavior(page, action, profile = null) {
    if (!profile) profile = this.currentProfile;
    if (!profile) throw new Error('No behavior profile selected');
    
    switch (action.type) {
      case 'moveMouse':
        return await this.executeMouseMovement(page, action, profile);
      
      case 'scroll':
        return await this.executeScroll(page, action, profile);
      
      case 'click':
        return await this.executeClick(page, action, profile);
      
      case 'type':
        return await this.executeTyping(page, action, profile);
      
      case 'navigate':
        return await this.executeNavigation(page, action, profile);
      
      case 'read':
        return await this.executeReading(page, action, profile);
      
      case 'wait':
        return await this.executeWait(page, action, profile);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async executeMouseMovement(page, action, profile) {
    const path = this.generateMousePath(
      action.startX, action.startY, 
      action.endX, action.endY, 
      profile
    );
    
    for (let i = 0; i < path.length; i++) {
      await page.mouse.move(path[i].x, path[i].y);
      
      if (i < path.length - 1) {
        const delay = path[i + 1].time - path[i].time;
        await page.waitForTimeout(delay);
      }
    }
    
    this.mouseTrail.push(...path);
    this.interactionHistory.push({ type: 'mouse_move', ...action, timestamp: Date.now() });
  }

  async executeScroll(page, action, profile) {
    const pattern = this.generateScrollPattern(
      action.currentY, 
      action.targetY, 
      profile
    );
    
    for (const scroll of pattern) {
      if (scroll.pause) {
        await page.waitForTimeout(scroll.pause);
        continue;
      }
      
      await page.mouse.wheel({ deltaY: scroll.deltaY });
      await page.waitForTimeout(16 + Math.random() * 16); // Variable frame rate
    }
    
    this.scrollHistory.push(...pattern);
    this.interactionHistory.push({ type: 'scroll', ...action, timestamp: Date.now() });
  }

  async executeClick(page, action, profile) {
    const clickPattern = this.generateClickPattern(action.x, action.y, profile);
    
    // Hesitation before click
    await page.waitForTimeout(clickPattern.hesitation);
    
    // Move to click position
    await this.executeMouseMovement(page, {
      startX: (await page.mouse.position()).x,
      startY: (await page.mouse.position()).y,
      endX: clickPattern.accuracy.x,
      endY: clickPattern.accuracy.y
    }, profile);
    
    // Perform click
    await page.mouse.down({ 
      button: clickPattern.buttons === 1 ? 'left' : 'right',
      clickCount: 1
    });
    
    await page.waitForTimeout(clickPattern.duration);
    
    await page.mouse.up({ 
      button: clickPattern.buttons === 1 ? 'left' : 'right',
      clickCount: 1
    });
    
    this.clickHistory.push(clickPattern);
    this.interactionHistory.push({ type: 'click', ...action, timestamp: Date.now() });
    
    // Handle miss-clicks
    if (clickPattern.isMissClick) {
      await page.waitForTimeout(500 + Math.random() * 500);
      // Retry with better accuracy
      const retryAction = { ...action, isRetry: true };
      await this.executeClick(page, retryAction, profile);
    }
  }

  async executeTyping(page, action, profile) {
    const text = action.text;
    const wpm = profile.reading.wordsPerMinute;
    const charDelay = 60000 / (wpm * 5); // Average 5 chars per word
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Variable typing speed
      const delay = charDelay * (0.5 + Math.random());
      
      // Simulate mistakes
      if (Math.random() < profile.clicking.missClickRate) {
        // Type wrong character
        const wrongChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() < 0.5 ? 1 : -1));
        await page.keyboard.type(wrongChar);
        await page.waitForTimeout(delay);
        
        // Realize mistake and correct
        await page.waitForTimeout(100 + Math.random() * 200);
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(delay);
      }
      
      await page.keyboard.type(char);
      await page.waitForTimeout(delay);
      
      // Pause between words
      if (char === ' ') {
        await page.waitForTimeout(profile.reading.wordsPerMinute);
      }
    }
    
    this.interactionHistory.push({ type: 'type', ...action, timestamp: Date.now() });
  }

  async executeNavigation(page, action, profile) {
    const dwellTime = profile.navigation.dwellTime;
    const waitTime = dwellTime.min + Math.random() * (dwellTime.max - dwellTime.min);
    
    // Simulate reading current page before navigating
    await page.waitForTimeout(waitTime);
    
    // Decide navigation method
    if (action.method === 'back' && Math.random() < profile.navigation.backButtonUsage) {
      await page.goBack();
    } else if (action.method === 'link') {
      // Click the link with natural behavior
      await this.executeClick(page, { x: action.x, y: action.y }, profile);
    } else if (action.method === 'url') {
      // Direct URL navigation (less common)
      await page.goto(action.url);
    }
    
    this.interactionHistory.push({ type: 'navigate', ...action, timestamp: Date.now() });
  }

  async executeReading(page, action, profile) {
    const readingPattern = this.generateReadingPattern(action.content, profile);
    
    // Simulate eye movements through scrolling and mouse movements
    for (const focusPoint of readingPattern.focusPoints) {
      const y = action.contentBounds.y + action.contentBounds.height * focusPoint.position;
      
      // Scroll to position if needed
      if (y > action.viewportHeight - 200) {
        await this.executeScroll(page, {
          currentY: action.currentScrollY,
          targetY: y - action.viewportHeight / 2
        }, profile);
      }
      
      // Simulate gaze (mouse movement)
      await this.executeMouseMovement(page, {
        startX: action.contentBounds.x + Math.random() * action.contentBounds.width,
        startY: action.currentMouseY,
        endX: action.contentBounds.x + Math.random() * action.contentBounds.width * 0.8,
        endY: y
      }, profile);
      
      await page.waitForTimeout(focusPoint.duration);
    }
    
    this.interactionHistory.push({ type: 'read', ...action, timestamp: Date.now() });
  }

  async executeWait(page, action, profile) {
    const duration = action.duration || 1000;
    
    // During wait, might have micro-movements
    if (Math.random() < 0.3 && duration > 500) {
      const currentPos = await page.mouse.position();
      await this.executeMouseMovement(page, {
        startX: currentPos.x,
        startY: currentPos.y,
        endX: currentPos.x + (Math.random() - 0.5) * 50,
        endY: currentPos.y + (Math.random() - 0.5) * 50
      }, profile);
    }
    
    await page.waitForTimeout(duration);
    this.interactionHistory.push({ type: 'wait', duration, timestamp: Date.now() });
  }
}

module.exports = BehavioralPatternEngine;