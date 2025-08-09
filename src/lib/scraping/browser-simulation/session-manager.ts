// session-manager.ts
// Dynamic session management with realistic browsing history and cookie handling

import { BrowserContext, Page, Cookie } from 'playwright';
import { BrowsingPersona } from './personas';

export interface BrowsingSession {
  id: string;
  persona: BrowsingPersona;
  startTime: Date;
  history: SessionHistory[];
  cookies: Cookie[];
  localStorage: Record<string, any>;
  sessionStorage: Record<string, any>;
  referrer: string;
  currentPage: number;
  totalPages: number;
  interests: Map<string, number>; // category -> interest score
  viewedListings: Set<string>;
  clickedListings: Set<string>;
  sessionMetrics: SessionMetrics;
}

export interface SessionHistory {
  url: string;
  title: string;
  visitTime: Date;
  dwellTime: number;
  interactions: number;
  scrollDepth: number;
  exitType: 'link' | 'back' | 'close' | 'timeout' | 'new_tab';
}

export interface SessionMetrics {
  totalDuration: number;
  pagesVisited: number;
  listingsViewed: number;
  listingsClicked: number;
  averageDwellTime: number;
  bounceRate: number;
  conversionEvents: string[];
}

export class SessionManager {
  private sessions: Map<string, BrowsingSession> = new Map();
  private cookieProfiles: Map<string, Cookie[]> = new Map();
  private referrerPool: string[] = [
    'https://www.google.com/',
    'https://www.google.com/search?q=buy+online+business',
    'https://www.google.com/search?q=website+for+sale',
    'https://www.bing.com/',
    'https://www.reddit.com/r/entrepreneur',
    'https://www.reddit.com/r/startups',
    'https://news.ycombinator.com/',
    'https://twitter.com/',
    'https://www.linkedin.com/',
    'https://www.facebook.com/',
    'direct',
    'https://www.producthunt.com/',
    'https://www.indiehackers.com/'
  ];

  createSession(persona: BrowsingPersona): BrowsingSession {
    const sessionId = this.generateSessionId();
    
    const session: BrowsingSession = {
      id: sessionId,
      persona,
      startTime: new Date(),
      history: [],
      cookies: this.getPersonaCookies(persona),
      localStorage: this.generateLocalStorage(persona),
      sessionStorage: {},
      referrer: this.selectReferrer(persona),
      currentPage: 0,
      totalPages: Math.floor(Math.random() * 5) + 3, // 3-7 pages per session
      interests: new Map(),
      viewedListings: new Set(),
      clickedListings: new Set(),
      sessionMetrics: {
        totalDuration: 0,
        pagesVisited: 0,
        listingsViewed: 0,
        listingsClicked: 0,
        averageDwellTime: 0,
        bounceRate: 0,
        conversionEvents: []
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPersonaCookies(persona: BrowsingPersona): Cookie[] {
    // Check if we have existing cookies for this persona type
    const profileKey = `${persona.profile.profession}_${persona.profile.experience}`;
    
    if (this.cookieProfiles.has(profileKey)) {
      return this.cookieProfiles.get(profileKey)!;
    }

    // Generate new cookies that match the persona
    const cookies: Cookie[] = [
      // Analytics cookies
      {
        name: '_ga',
        value: `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
        domain: '.flippa.com',
        path: '/',
        expires: Date.now() / 1000 + 63072000, // 2 years
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      },
      {
        name: '_gid',
        value: `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
        domain: '.flippa.com',
        path: '/',
        expires: Date.now() / 1000 + 86400, // 24 hours
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      },
      // Session cookie
      {
        name: 'session_id',
        value: this.generateSessionToken(),
        domain: 'flippa.com',
        path: '/',
        expires: -1, // Session cookie
        httpOnly: true,
        secure: true,
        sameSite: 'Lax'
      },
      // Preferences based on persona
      {
        name: 'user_preferences',
        value: JSON.stringify({
          currency: 'USD',
          sort: persona.preferences.sortBy,
          view: persona.preferences.detailLevel === 'detailed' ? 'grid' : 'list',
          categories: persona.preferences.filterPreferences?.categories || []
        }),
        domain: 'flippa.com',
        path: '/',
        expires: Date.now() / 1000 + 31536000, // 1 year
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      }
    ];

    // Add returning visitor cookie for experienced personas
    if (persona.profile.experience !== 'beginner') {
      cookies.push({
        name: 'returning_visitor',
        value: 'true',
        domain: 'flippa.com',
        path: '/',
        expires: Date.now() / 1000 + 2592000, // 30 days
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      });
    }

    this.cookieProfiles.set(profileKey, cookies);
    return cookies;
  }

  private generateSessionToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private generateLocalStorage(persona: BrowsingPersona): Record<string, any> {
    const localStorage: Record<string, any> = {
      // User preferences
      'flippa:preferences': {
        notifications: persona.profile.experience === 'expert',
        newsletter: Math.random() > 0.5,
        theme: 'light',
        language: 'en'
      },
      
      // Search history based on interests
      'flippa:recent_searches': persona.profile.interests.slice(0, 3).map(interest => ({
        query: interest,
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Within last week
        results: Math.floor(Math.random() * 100) + 20
      })),
      
      // Viewed listings (for experienced users)
      'flippa:viewed_listings': persona.profile.experience !== 'beginner' ? 
        Array.from({ length: Math.floor(Math.random() * 10) + 5 }, () => ({
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        })) : [],
      
      // Saved filters
      'flippa:saved_filters': persona.preferences.filterPreferences ? [{
        name: 'My Preferences',
        filters: persona.preferences.filterPreferences,
        created: Date.now() - 7 * 24 * 60 * 60 * 1000
      }] : []
    };

    return localStorage;
  }

  private selectReferrer(persona: BrowsingPersona): string {
    // Beginners more likely to come from search
    if (persona.profile.experience === 'beginner') {
      const searchReferrers = this.referrerPool.filter(r => r.includes('search') || r.includes('google'));
      return searchReferrers[Math.floor(Math.random() * searchReferrers.length)];
    }
    
    // Experts more likely to have direct access or come from professional networks
    if (persona.profile.experience === 'expert') {
      const professionalReferrers = ['direct', 'https://www.linkedin.com/', 'https://news.ycombinator.com/'];
      return professionalReferrers[Math.floor(Math.random() * professionalReferrers.length)];
    }
    
    // Random for intermediate
    return this.referrerPool[Math.floor(Math.random() * this.referrerPool.length)];
  }

  async applySessionToBrowser(session: BrowsingSession, context: BrowserContext) {
    // Set cookies
    await context.addCookies(session.cookies);
    
    // Apply localStorage and sessionStorage via injected script
    await context.addInitScript((storageData) => {
      // Apply localStorage
      Object.entries(storageData.localStorage).forEach(([key, value]) => {
        window.localStorage.setItem(key, JSON.stringify(value));
      });
      
      // Apply sessionStorage
      Object.entries(storageData.sessionStorage).forEach(([key, value]) => {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      });
    }, {
      localStorage: session.localStorage,
      sessionStorage: session.sessionStorage
    });
  }

  addToHistory(sessionId: string, pageData: {
    url: string;
    title: string;
    dwellTime: number;
    interactions: number;
    scrollDepth: number;
    exitType: SessionHistory['exitType'];
  }) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const historyEntry: SessionHistory = {
      ...pageData,
      visitTime: new Date()
    };

    session.history.push(historyEntry);
    session.currentPage++;
    
    // Update metrics
    session.sessionMetrics.pagesVisited++;
    session.sessionMetrics.totalDuration += pageData.dwellTime;
    session.sessionMetrics.averageDwellTime = 
      session.sessionMetrics.totalDuration / session.sessionMetrics.pagesVisited;

    // Track bounce rate (single page visits)
    if (session.sessionMetrics.pagesVisited === 1 && pageData.exitType === 'close') {
      session.sessionMetrics.bounceRate = 1;
    } else {
      session.sessionMetrics.bounceRate = 0;
    }

    // Extract listing ID if on listing page
    const listingMatch = pageData.url.match(/listing\/(\d+)/);
    if (listingMatch) {
      session.viewedListings.add(listingMatch[1]);
      session.sessionMetrics.listingsViewed = session.viewedListings.size;
      
      if (pageData.interactions > 5) { // High interaction suggests interest
        session.clickedListings.add(listingMatch[1]);
        session.sessionMetrics.listingsClicked = session.clickedListings.size;
      }
    }

    // Update interests based on page content
    this.updateSessionInterests(session, pageData);
  }

  private updateSessionInterests(session: BrowsingSession, pageData: any) {
    // Extract category from URL or title
    const categories = ['saas', 'ecommerce', 'content', 'marketplace', 'app', 'service'];
    
    categories.forEach(category => {
      if (pageData.url.toLowerCase().includes(category) || 
          pageData.title.toLowerCase().includes(category)) {
        const currentScore = session.interests.get(category) || 0;
        session.interests.set(category, currentScore + pageData.dwellTime / 1000); // Score based on time spent
      }
    });
  }

  buildNavigationPath(session: BrowsingSession): string[] {
    const paths: string[] = [];
    const persona = session.persona;
    
    // Start with search or category page based on persona
    if (persona.profile.experience === 'beginner') {
      paths.push('/browse/all');
    } else if (persona.preferences.filterPreferences?.categories?.length) {
      paths.push(`/category/${persona.preferences.filterPreferences.categories[0].toLowerCase()}`);
    } else {
      paths.push('/search');
    }

    // Add filtered search if preferences exist
    if (persona.preferences.filterPreferences) {
      const params = new URLSearchParams();
      
      if (persona.preferences.filterPreferences.priceRange) {
        params.append('price_min', persona.preferences.filterPreferences.priceRange.min.toString());
        params.append('price_max', persona.preferences.filterPreferences.priceRange.max.toString());
      }
      
      if (persona.preferences.filterPreferences.categories) {
        params.append('categories', persona.preferences.filterPreferences.categories.join(','));
      }
      
      paths.push(`/search?${params.toString()}`);
    }

    // Add specific listing pages based on interests
    const listingCount = Math.min(5, Math.floor(Math.random() * 3) + 2);
    for (let i = 0; i < listingCount; i++) {
      paths.push(`/listing/${Math.floor(Math.random() * 1000000) + 1000000}`);
    }

    // Possibly return to search/browse
    if (Math.random() < 0.3) {
      paths.push(paths[0]); // Return to initial page
    }

    return paths;
  }

  simulateTabBehavior(session: BrowsingSession): Array<{action: 'open' | 'switch' | 'close', tabId: number}> {
    const actions: Array<{action: 'open' | 'switch' | 'close', tabId: number}> = [];
    const persona = session.persona;
    
    // Beginners less likely to use multiple tabs
    if (persona.profile.experience === 'beginner' && Math.random() > 0.3) {
      return actions;
    }

    // Experts more likely to open multiple tabs for comparison
    if (persona.profile.experience === 'expert') {
      // Open 2-4 tabs
      const tabCount = Math.floor(Math.random() * 3) + 2;
      for (let i = 1; i <= tabCount; i++) {
        actions.push({ action: 'open', tabId: i });
      }
      
      // Switch between tabs
      for (let i = 0; i < tabCount * 2; i++) {
        actions.push({ 
          action: 'switch', 
          tabId: Math.floor(Math.random() * tabCount) + 1 
        });
      }
      
      // Close tabs in reverse order
      for (let i = tabCount; i > 1; i--) {
        actions.push({ action: 'close', tabId: i });
      }
    }

    return actions;
  }

  async syncSessionData(sessionId: string, page: Page) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Get current cookies
    const cookies = await page.context().cookies();
    session.cookies = cookies;

    // Get localStorage data
    const localStorage = await page.evaluate(() => {
      const data: Record<string, any> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          try {
            data[key] = JSON.parse(window.localStorage.getItem(key) || '{}');
          } catch {
            data[key] = window.localStorage.getItem(key);
          }
        }
      }
      return data;
    });
    session.localStorage = localStorage;

    // Get sessionStorage data
    const sessionStorage = await page.evaluate(() => {
      const data: Record<string, any> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          try {
            data[key] = JSON.parse(window.sessionStorage.getItem(key) || '{}');
          } catch {
            data[key] = window.sessionStorage.getItem(key);
          }
        }
      }
      return data;
    });
    session.sessionStorage = sessionStorage;
  }

  getSessionSummary(sessionId: string): SessionMetrics | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Add conversion events based on behavior
    if (session.clickedListings.size >= 3) {
      session.sessionMetrics.conversionEvents.push('high_engagement');
    }
    
    if (session.sessionMetrics.averageDwellTime > 60000) { // > 1 minute average
      session.sessionMetrics.conversionEvents.push('quality_visitor');
    }

    if (session.interests.size >= 2) {
      session.sessionMetrics.conversionEvents.push('multi_interest');
    }

    return session.sessionMetrics;
  }

  shouldEndSession(session: BrowsingSession): boolean {
    // Check if reached page limit
    if (session.currentPage >= session.totalPages) {
      return true;
    }

    // Check if session duration exceeded persona limits
    const sessionDuration = (Date.now() - session.startTime.getTime()) / 60000; // minutes
    if (sessionDuration >= session.persona.behavior.sessionDuration.max) {
      return true;
    }

    // Random end based on persona behavior
    if (Math.random() < 0.1) { // 10% chance per page
      return true;
    }

    return false;
  }

  cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Log final metrics
      console.log('Session completed:', {
        sessionId,
        persona: session.persona.name,
        metrics: this.getSessionSummary(sessionId)
      });
    }
    
    this.sessions.delete(sessionId);
  }
}

export default SessionManager;