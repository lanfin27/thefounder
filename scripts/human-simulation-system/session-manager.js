// session-manager.js
// Dynamic session management with realistic browsing history and preferences

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SessionManager {
  constructor() {
    this.activeSessions = new Map();
    this.sessionHistory = new Map();
    this.browserProfiles = new Map();
    
    // Session persistence for realistic history
    this.sessionStoragePath = path.join(__dirname, 'session-data');
    this.initializeStorage();
    
    // Realistic browsing patterns
    this.browsingPatterns = {
      directVisit: 0.15,      // User types URL directly
      searchEngine: 0.60,     // Comes from search
      socialMedia: 0.15,      // Referred from social
      bookmark: 0.05,         // Uses bookmarks
      historyRevisit: 0.05    // Revisits from history
    };
    
    // Cookie preferences by user type
    this.cookiePreferences = {
      privacyConscious: {
        acceptAll: 0.1,
        essential: 0.7,
        reject: 0.2
      },
      casual: {
        acceptAll: 0.7,
        essential: 0.2,
        reject: 0.1
      },
      technical: {
        acceptAll: 0.3,
        essential: 0.5,
        reject: 0.2
      }
    };
  }

  async initializeStorage() {
    try {
      await fs.mkdir(this.sessionStoragePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create session storage:', error);
    }
  }

  async createSession(options = {}) {
    const {
      userType = 'casual',
      location = 'US',
      fingerprint = null,
      behaviorProfile = null,
      isReturningUser = Math.random() < 0.3
    } = options;

    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userType,
      location,
      fingerprint,
      behaviorProfile,
      created: new Date(),
      lastActive: new Date(),
      
      // Browser state
      browserState: this.initializeBrowserState(isReturningUser),
      
      // Navigation history
      history: this.initializeHistory(isReturningUser),
      
      // Cookies and storage
      cookies: await this.initializeCookies(userType, isReturningUser),
      localStorage: this.initializeLocalStorage(isReturningUser),
      sessionStorage: {},
      
      // User preferences
      preferences: this.generateUserPreferences(userType),
      
      // Session metrics
      metrics: {
        pageViews: 0,
        totalTime: 0,
        interactions: 0,
        searches: 0,
        purchases: 0
      },
      
      // Authentication state
      auth: this.generateAuthState(isReturningUser),
      
      // Activity patterns
      activityPattern: this.generateActivityPattern(),
      
      // Tab management
      tabs: [{
        id: this.generateTabId(),
        url: 'about:blank',
        title: 'New Tab',
        active: true,
        created: new Date(),
        history: []
      }]
    };

    this.activeSessions.set(sessionId, session);
    
    // Persist session for future use
    await this.saveSession(session);
    
    return session;
  }

  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateTabId() {
    return crypto.randomBytes(8).toString('hex');
  }

  initializeBrowserState(isReturningUser) {
    const state = {
      // Window state
      window: {
        width: 1200 + Math.floor(Math.random() * 720),  // 1200-1920
        height: 700 + Math.floor(Math.random() * 380),  // 700-1080
        x: Math.floor(Math.random() * 200),
        y: Math.floor(Math.random() * 100),
        state: 'normal', // normal, maximized, minimized
        isFullscreen: false
      },
      
      // Browser features
      features: {
        bookmarksBar: Math.random() < 0.6,
        developerTools: Math.random() < 0.1,
        extensionsVisible: Math.random() < 0.4,
        historyMenuOpen: false,
        downloadShelfVisible: false
      },
      
      // Zoom level (some users change this)
      zoomLevel: isReturningUser && Math.random() < 0.2 
        ? 0.9 + Math.random() * 0.3  // 90%-120%
        : 1.0,
      
      // Theme
      theme: this.selectTheme(),
      
      // Language preferences
      spellcheckEnabled: Math.random() < 0.8,
      translationOffered: [],
      
      // Performance settings
      hardwareAcceleration: Math.random() < 0.9,
      prefersReducedMotion: Math.random() < 0.1
    };
    
    return state;
  }

  selectTheme() {
    const themes = [
      { name: 'default', probability: 0.7 },
      { name: 'dark', probability: 0.25 },
      { name: 'custom', probability: 0.05 }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const theme of themes) {
      cumulative += theme.probability;
      if (random < cumulative) return theme.name;
    }
    
    return 'default';
  }

  initializeHistory(isReturningUser) {
    const history = [];
    
    if (isReturningUser) {
      // Generate realistic browsing history
      const daysOfHistory = 1 + Math.floor(Math.random() * 30);
      const sitesPerDay = 5 + Math.floor(Math.random() * 20);
      
      const commonSites = [
        'https://www.google.com',
        'https://www.youtube.com',
        'https://www.facebook.com',
        'https://www.amazon.com',
        'https://www.reddit.com',
        'https://www.twitter.com',
        'https://www.linkedin.com',
        'https://www.github.com',
        'https://www.stackoverflow.com',
        'https://www.wikipedia.org',
        'https://www.netflix.com',
        'https://www.instagram.com',
        'https://mail.google.com',
        'https://www.ebay.com',
        'https://www.twitch.tv'
      ];
      
      for (let day = 0; day < daysOfHistory; day++) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - day);
        dayStart.setHours(8 + Math.floor(Math.random() * 4));
        
        for (let visit = 0; visit < sitesPerDay; visit++) {
          const site = commonSites[Math.floor(Math.random() * commonSites.length)];
          const visitTime = new Date(dayStart.getTime() + visit * 3600000 * Math.random());
          
          history.push({
            url: site,
            title: this.generatePageTitle(site),
            visitTime: visitTime,
            visitCount: 1 + Math.floor(Math.random() * 10),
            typedCount: Math.random() < 0.1 ? 1 : 0,
            lastVisit: visitTime,
            favicon: `${site}/favicon.ico`
          });
        }
      }
      
      // Add domain-specific history relevant to Flippa
      if (Math.random() < 0.3) {
        const businessSites = [
          'https://flippa.com',
          'https://www.bizbuysell.com',
          'https://www.empireflippers.com',
          'https://exchangemarketplace.com',
          'https://www.businessesforsale.com'
        ];
        
        businessSites.forEach(site => {
          history.push({
            url: site,
            title: this.generatePageTitle(site),
            visitTime: new Date(Date.now() - Math.random() * 7 * 24 * 3600000),
            visitCount: Math.floor(Math.random() * 5) + 1,
            typedCount: Math.random() < 0.3 ? 1 : 0,
            lastVisit: new Date(),
            favicon: `${site}/favicon.ico`
          });
        });
      }
    }
    
    return history.sort((a, b) => b.visitTime - a.visitTime);
  }

  generatePageTitle(url) {
    const titles = {
      'google.com': 'Google',
      'youtube.com': 'YouTube',
      'facebook.com': 'Facebook - Log In or Sign Up',
      'amazon.com': 'Amazon.com: Online Shopping',
      'reddit.com': 'Reddit - Dive into anything',
      'flippa.com': 'Flippa: #1 Marketplace to Buy & Sell Online Businesses',
      'github.com': 'GitHub: Where the world builds software',
      'stackoverflow.com': 'Stack Overflow - Where Developers Learn'
    };
    
    const domain = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
    return titles[domain] || domain;
  }

  async initializeCookies(userType, isReturningUser) {
    const cookies = [];
    
    if (isReturningUser) {
      // Common cookies that persist
      cookies.push(
        // Analytics cookies
        {
          name: '_ga',
          value: `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
          domain: '.flippa.com',
          path: '/',
          expires: new Date(Date.now() + 365 * 24 * 3600000),
          httpOnly: false,
          secure: true,
          sameSite: 'Lax'
        },
        {
          name: '_gid',
          value: `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
          domain: '.flippa.com',
          path: '/',
          expires: new Date(Date.now() + 24 * 3600000),
          httpOnly: false,
          secure: true,
          sameSite: 'Lax'
        },
        
        // Session cookies
        {
          name: 'session_id',
          value: this.generateSessionCookie(),
          domain: 'flippa.com',
          path: '/',
          expires: null, // Session cookie
          httpOnly: true,
          secure: true,
          sameSite: 'Lax'
        }
      );
      
      // User preference cookies
      const preferences = this.cookiePreferences[userType] || this.cookiePreferences.casual;
      
      if (Math.random() < (1 - preferences.reject)) {
        cookies.push({
          name: 'cookie_consent',
          value: Math.random() < preferences.acceptAll ? 'all' : 'essential',
          domain: '.flippa.com',
          path: '/',
          expires: new Date(Date.now() + 365 * 24 * 3600000),
          httpOnly: false,
          secure: true,
          sameSite: 'Lax'
        });
      }
      
      // Marketing cookies (if accepted)
      if (Math.random() < preferences.acceptAll) {
        cookies.push(
          {
            name: '_fbp',
            value: `fb.1.${Date.now()}.${Math.floor(Math.random() * 1000000000)}`,
            domain: '.flippa.com',
            path: '/',
            expires: new Date(Date.now() + 90 * 24 * 3600000),
            httpOnly: false,
            secure: true,
            sameSite: 'Lax'
          },
          {
            name: '__gads',
            value: `ID=${this.generateRandomId()}:T=${Math.floor(Date.now() / 1000)}`,
            domain: '.flippa.com',
            path: '/',
            expires: new Date(Date.now() + 390 * 24 * 3600000),
            httpOnly: false,
            secure: true,
            sameSite: 'None'
          }
        );
      }
    }
    
    return cookies;
  }

  generateSessionCookie() {
    const sessionData = {
      id: crypto.randomBytes(16).toString('hex'),
      created: Date.now(),
      ip: this.generateIPAddress(),
      ua_hash: crypto.randomBytes(8).toString('hex')
    };
    
    return Buffer.from(JSON.stringify(sessionData)).toString('base64');
  }

  generateIPAddress() {
    // Generate realistic IP addresses by region
    const ranges = {
      US: [
        { start: [72, 229, 0, 0], end: [72, 229, 255, 255] },    // Comcast
        { start: [98, 0, 0, 0], end: [98, 255, 255, 255] },      // AT&T
        { start: [174, 0, 0, 0], end: [174, 255, 255, 255] }     // Verizon
      ],
      EU: [
        { start: [185, 0, 0, 0], end: [185, 255, 255, 255] },
        { start: [88, 0, 0, 0], end: [88, 255, 255, 255] }
      ],
      AU: [
        { start: [203, 0, 0, 0], end: [203, 255, 255, 255] },
        { start: [1, 128, 0, 0], end: [1, 159, 255, 255] }
      ]
    };
    
    const regionRanges = ranges.US; // Default to US
    const range = regionRanges[Math.floor(Math.random() * regionRanges.length)];
    
    const ip = range.start.map((start, i) => 
      start + Math.floor(Math.random() * (range.end[i] - start + 1))
    );
    
    return ip.join('.');
  }

  generateRandomId() {
    return crypto.randomBytes(8).toString('hex');
  }

  initializeLocalStorage(isReturningUser) {
    const storage = {};
    
    if (isReturningUser) {
      // Common localStorage items
      storage['preferred_language'] = 'en-US';
      storage['theme_preference'] = Math.random() < 0.3 ? 'dark' : 'light';
      
      // Site-specific preferences
      if (Math.random() < 0.5) {
        storage['flippa_filters'] = JSON.stringify({
          property_type: ['website'],
          price_min: 1000,
          price_max: 100000,
          sort: 'newest'
        });
      }
      
      // Recently viewed items (common pattern)
      if (Math.random() < 0.4) {
        storage['recently_viewed'] = JSON.stringify([
          { id: '12345678', timestamp: Date.now() - 86400000 },
          { id: '23456789', timestamp: Date.now() - 172800000 }
        ]);
      }
      
      // User preferences
      storage['notification_preferences'] = JSON.stringify({
        email: Math.random() < 0.6,
        browser: Math.random() < 0.3,
        mobile: Math.random() < 0.4
      });
      
      // Performance timing (browsers often store this)
      storage['performance_timing'] = JSON.stringify({
        navigation_start: Date.now() - 3600000,
        first_paint: 234,
        dom_content_loaded: 567,
        load_complete: 1234
      });
    }
    
    return storage;
  }

  generateUserPreferences(userType) {
    const basePreferences = {
      // Privacy settings
      doNotTrack: Math.random() < 0.3,
      adBlocker: Math.random() < 0.4,
      
      // Notification preferences
      notifications: {
        enabled: Math.random() < 0.6,
        sound: Math.random() < 0.4,
        badges: Math.random() < 0.5
      },
      
      // Content preferences
      autoplay: {
        video: Math.random() < 0.3,
        audio: false
      },
      
      // Accessibility
      fontSize: Math.random() < 0.1 ? 'large' : 'medium',
      highContrast: Math.random() < 0.05,
      
      // Language
      languages: this.generateLanguagePreferences(),
      
      // Search preferences
      defaultSearchEngine: this.selectSearchEngine(),
      searchSuggestions: Math.random() < 0.8,
      
      // Security
      passwordManager: Math.random() < 0.6,
      twoFactorAuth: userType === 'technical' ? Math.random() < 0.7 : Math.random() < 0.3
    };
    
    return basePreferences;
  }

  generateLanguagePreferences() {
    const languages = ['en-US'];
    
    // Add secondary languages
    if (Math.random() < 0.3) {
      const secondary = ['es', 'fr', 'de', 'zh', 'ja', 'pt', 'ru', 'ar'];
      languages.push(secondary[Math.floor(Math.random() * secondary.length)]);
    }
    
    return languages;
  }

  selectSearchEngine() {
    const engines = [
      { name: 'google', probability: 0.92 },
      { name: 'bing', probability: 0.04 },
      { name: 'duckduckgo', probability: 0.03 },
      { name: 'yahoo', probability: 0.01 }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const engine of engines) {
      cumulative += engine.probability;
      if (random < cumulative) return engine.name;
    }
    
    return 'google';
  }

  generateAuthState(isReturningUser) {
    if (!isReturningUser) {
      return { authenticated: false };
    }
    
    // Some returning users are logged in
    if (Math.random() < 0.3) {
      return {
        authenticated: true,
        userId: this.generateRandomId(),
        username: this.generateUsername(),
        email: this.generateEmail(),
        memberSince: new Date(Date.now() - Math.random() * 365 * 24 * 3600000),
        lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 3600000),
        accountType: Math.random() < 0.1 ? 'premium' : 'free',
        verified: Math.random() < 0.8
      };
    }
    
    return { authenticated: false };
  }

  generateUsername() {
    const adjectives = ['happy', 'clever', 'bright', 'swift', 'keen'];
    const nouns = ['trader', 'investor', 'buyer', 'entrepreneur', 'founder'];
    const numbers = Math.floor(Math.random() * 9999);
    
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`;
  }

  generateEmail() {
    const providers = ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com', 'icloud.com'];
    const username = this.generateUsername().toLowerCase();
    const provider = providers[Math.floor(Math.random() * providers.length)];
    
    return `${username}@${provider}`;
  }

  generateActivityPattern() {
    // Time-based activity patterns
    const hour = new Date().getHours();
    
    let activityLevel;
    if (hour >= 9 && hour <= 11) activityLevel = 'high';
    else if (hour >= 12 && hour <= 13) activityLevel = 'low';  // Lunch
    else if (hour >= 14 && hour <= 17) activityLevel = 'medium';
    else if (hour >= 18 && hour <= 22) activityLevel = 'high';
    else activityLevel = 'low';
    
    return {
      level: activityLevel,
      sessionDuration: this.estimateSessionDuration(activityLevel),
      interactionFrequency: this.estimateInteractionFrequency(activityLevel),
      multitasking: Math.random() < 0.4,
      breakPattern: this.generateBreakPattern(activityLevel)
    };
  }

  estimateSessionDuration(activityLevel) {
    const durations = {
      high: { min: 15, max: 60 },    // 15-60 minutes
      medium: { min: 10, max: 30 },  // 10-30 minutes
      low: { min: 5, max: 15 }       // 5-15 minutes
    };
    
    const range = durations[activityLevel];
    return range.min + Math.random() * (range.max - range.min);
  }

  estimateInteractionFrequency(activityLevel) {
    const frequencies = {
      high: 0.8,    // 80% chance of interaction per page
      medium: 0.6,  // 60% chance
      low: 0.4      // 40% chance
    };
    
    return frequencies[activityLevel];
  }

  generateBreakPattern(activityLevel) {
    return {
      microBreaks: activityLevel === 'high' ? 5 : 3,  // Per hour
      shortBreaks: activityLevel === 'high' ? 1 : 0,  // Per hour
      attentionSpan: activityLevel === 'high' ? 30 : 15  // Minutes
    };
  }

  // Session lifecycle management
  async updateSession(sessionId, updates) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    // Update session data
    Object.assign(session, updates);
    session.lastActive = new Date();
    
    // Update metrics
    if (updates.pageView) {
      session.metrics.pageViews++;
      this.addToHistory(session, updates.pageView);
    }
    
    if (updates.interaction) {
      session.metrics.interactions++;
    }
    
    // Save updated session
    await this.saveSession(session);
    
    return session;
  }

  addToHistory(session, pageData) {
    const historyEntry = {
      url: pageData.url,
      title: pageData.title,
      visitTime: new Date(),
      referrer: pageData.referrer || session.history[0]?.url || 'direct',
      duration: 0,
      scrollDepth: 0,
      interactions: []
    };
    
    session.history.unshift(historyEntry);
    
    // Limit history size
    if (session.history.length > 1000) {
      session.history = session.history.slice(0, 1000);
    }
    
    // Update current tab
    const activeTab = session.tabs.find(tab => tab.active);
    if (activeTab) {
      activeTab.url = pageData.url;
      activeTab.title = pageData.title;
      activeTab.history.push(historyEntry);
    }
  }

  // Tab management
  async createTab(sessionId, options = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    const newTab = {
      id: this.generateTabId(),
      url: options.url || 'about:blank',
      title: options.title || 'New Tab',
      active: options.active !== false,
      created: new Date(),
      history: [],
      state: {
        scrollPosition: 0,
        formData: {},
        mediaState: {}
      }
    };
    
    // Deactivate other tabs if this is active
    if (newTab.active) {
      session.tabs.forEach(tab => tab.active = false);
    }
    
    session.tabs.push(newTab);
    
    // Limit number of tabs (realistic browsing)
    if (session.tabs.length > 20) {
      // Close oldest inactive tabs
      const inactiveTabs = session.tabs
        .filter(tab => !tab.active)
        .sort((a, b) => a.created - b.created);
      
      if (inactiveTabs.length > 0) {
        const tabToClose = inactiveTabs[0];
        session.tabs = session.tabs.filter(tab => tab.id !== tabToClose.id);
      }
    }
    
    await this.saveSession(session);
    return newTab;
  }

  async switchTab(sessionId, tabId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    // Deactivate all tabs
    session.tabs.forEach(tab => tab.active = false);
    
    // Activate specified tab
    const targetTab = session.tabs.find(tab => tab.id === tabId);
    if (targetTab) {
      targetTab.active = true;
      await this.saveSession(session);
      return targetTab;
    }
    
    return null;
  }

  async closeTab(sessionId, tabId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    // Don't close the last tab
    if (session.tabs.length <= 1) return null;
    
    const tabIndex = session.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return null;
    
    const closedTab = session.tabs[tabIndex];
    session.tabs.splice(tabIndex, 1);
    
    // If closed tab was active, activate another
    if (closedTab.active && session.tabs.length > 0) {
      // Activate tab to the right, or left if it was the last tab
      const newActiveIndex = Math.min(tabIndex, session.tabs.length - 1);
      session.tabs[newActiveIndex].active = true;
    }
    
    await this.saveSession(session);
    return closedTab;
  }

  // Cookie management
  async setCookie(sessionId, cookie) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    // Update or add cookie
    const existingIndex = session.cookies.findIndex(c => 
      c.name === cookie.name && 
      c.domain === cookie.domain && 
      c.path === cookie.path
    );
    
    if (existingIndex >= 0) {
      session.cookies[existingIndex] = { ...session.cookies[existingIndex], ...cookie };
    } else {
      session.cookies.push(cookie);
    }
    
    await this.saveSession(session);
    return cookie;
  }

  async getCookies(sessionId, url) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];
    
    const urlObj = new URL(url);
    const now = new Date();
    
    // Filter cookies that match the URL
    return session.cookies.filter(cookie => {
      // Check expiration
      if (cookie.expires && new Date(cookie.expires) < now) {
        return false;
      }
      
      // Check domain
      if (!this.cookieMatchesDomain(cookie.domain, urlObj.hostname)) {
        return false;
      }
      
      // Check path
      if (!urlObj.pathname.startsWith(cookie.path)) {
        return false;
      }
      
      // Check secure
      if (cookie.secure && urlObj.protocol !== 'https:') {
        return false;
      }
      
      return true;
    });
  }

  cookieMatchesDomain(cookieDomain, hostname) {
    // Remove leading dot
    const domain = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
    
    // Exact match or subdomain match
    return hostname === domain || hostname.endsWith('.' + domain);
  }

  // Local storage management
  async setLocalStorageItem(sessionId, key, value) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    session.localStorage[key] = value;
    await this.saveSession(session);
    
    return { key, value };
  }

  async getLocalStorageItem(sessionId, key) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    return session.localStorage[key] || null;
  }

  // Session persistence
  async saveSession(session) {
    try {
      const filePath = path.join(this.sessionStoragePath, `${session.id}.json`);
      const data = JSON.stringify(session, null, 2);
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  async loadSession(sessionId) {
    try {
      const filePath = path.join(this.sessionStoragePath, `${sessionId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const session = JSON.parse(data);
      
      // Restore dates
      session.created = new Date(session.created);
      session.lastActive = new Date(session.lastActive);
      
      this.activeSessions.set(sessionId, session);
      return session;
    } catch (error) {
      return null;
    }
  }

  // Session cleanup
  async cleanupInactiveSessions() {
    const now = Date.now();
    const maxInactivity = 24 * 3600000; // 24 hours
    
    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.lastActive.getTime() > maxInactivity) {
        this.activeSessions.delete(sessionId);
        
        // Delete persisted file
        try {
          const filePath = path.join(this.sessionStoragePath, `${sessionId}.json`);
          await fs.unlink(filePath);
        } catch (error) {
          // File might not exist
        }
      }
    }
  }

  // Get session for page automation
  async prepareSessionForPage(page, sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    // Set cookies
    const cookies = session.cookies.map(cookie => ({
      ...cookie,
      expires: cookie.expires ? new Date(cookie.expires).getTime() / 1000 : undefined
    }));
    
    await page.context().addCookies(cookies);
    
    // Set localStorage
    await page.addInitScript((storage) => {
      Object.entries(storage).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    }, session.localStorage);
    
    // Set user agent and viewport from fingerprint
    if (session.fingerprint) {
      await page.setUserAgent(session.fingerprint.userAgent);
      await page.setViewportSize(session.fingerprint.viewport);
    }
    
    // Add session tracking
    await page.addInitScript((sessionData) => {
      window.__session = sessionData;
    }, {
      id: session.id,
      userType: session.userType,
      auth: session.auth
    });
    
    return session;
  }

  // Generate natural referrer patterns
  generateReferrer(currentUrl, browsingHistory) {
    const patterns = Object.entries(this.browsingPatterns);
    const random = Math.random();
    let cumulative = 0;
    
    for (const [pattern, probability] of patterns) {
      cumulative += probability;
      if (random < cumulative) {
        switch (pattern) {
          case 'directVisit':
            return '';
            
          case 'searchEngine':
            return this.generateSearchReferrer(currentUrl);
            
          case 'socialMedia':
            return this.generateSocialReferrer();
            
          case 'bookmark':
            return '';
            
          case 'historyRevisit':
            return browsingHistory.length > 0 
              ? browsingHistory[Math.floor(Math.random() * Math.min(5, browsingHistory.length))].url
              : '';
        }
      }
    }
    
    return '';
  }

  generateSearchReferrer(targetUrl) {
    const searchEngines = [
      { url: 'https://www.google.com/search?q=', weight: 0.7 },
      { url: 'https://www.bing.com/search?q=', weight: 0.15 },
      { url: 'https://search.yahoo.com/search?p=', weight: 0.1 },
      { url: 'https://duckduckgo.com/?q=', weight: 0.05 }
    ];
    
    // Generate relevant search query
    const queries = [
      'buy online business',
      'websites for sale',
      'flippa marketplace',
      'buy established website',
      'online business marketplace',
      'website broker',
      'buy profitable website',
      'ecommerce business for sale'
    ];
    
    const engine = this.weightedRandom(searchEngines);
    const query = queries[Math.floor(Math.random() * queries.length)];
    
    return engine.url + encodeURIComponent(query);
  }

  generateSocialReferrer() {
    const socialSites = [
      'https://www.facebook.com/',
      'https://twitter.com/',
      'https://www.linkedin.com/feed',
      'https://www.reddit.com/r/entrepreneur',
      'https://www.instagram.com/'
    ];
    
    return socialSites[Math.floor(Math.random() * socialSites.length)];
  }

  weightedRandom(items) {
    const weights = items.map(item => item.weight);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random < 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
}

module.exports = SessionManager;