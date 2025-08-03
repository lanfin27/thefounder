/**
 * MarketplaceTracker - Dynamic marketplace state tracking and analysis
 * Detects and adapts to real-time changes in Flippa's listing count
 */

class MarketplaceTracker {
  constructor(logger) {
    this.logger = logger;
    this.history = [];
    this.currentState = {
      totalListings: null,
      lastChecked: null,
      confidence: 0,
      sources: {},
      changes: []
    };
    
    // Configuration for detection strategies
    this.config = {
      recheckInterval: 25, // Pages between marketplace rechecks
      minConfidence: 0.8,
      maxHistorySize: 100,
      anomalyThreshold: 0.15 // 15% change triggers anomaly detection
    };
  }

  /**
   * Detect current marketplace state using multiple strategies
   */
  async detectCurrentMarketplaceState(page) {
    this.logger.info('🔍 Detecting marketplace state...');
    
    const strategies = [
      this.detectFromPagination.bind(this),
      this.detectFromTotalCount.bind(this),
      this.detectFromSearchResults.bind(this),
      this.detectFromLastPage.bind(this),
      this.detectFromAPIHints.bind(this)
    ];
    
    const results = {};
    let highestConfidence = 0;
    let bestEstimate = null;
    
    // Execute all detection strategies
    for (const strategy of strategies) {
      try {
        const result = await strategy(page);
        if (result && result.total) {
          results[result.source] = result;
          
          if (result.confidence > highestConfidence) {
            highestConfidence = result.confidence;
            bestEstimate = result.total;
          }
        }
      } catch (error) {
        this.logger.debug(`Strategy failed: ${error.message}`);
      }
    }
    
    // Update current state
    const previousTotal = this.currentState.totalListings;
    this.currentState = {
      totalListings: bestEstimate,
      lastChecked: new Date().toISOString(),
      confidence: highestConfidence,
      sources: results,
      changes: []
    };
    
    // Detect changes
    if (previousTotal && bestEstimate) {
      const changePercent = Math.abs(bestEstimate - previousTotal) / previousTotal;
      if (changePercent > this.config.anomalyThreshold) {
        this.currentState.changes.push({
          type: bestEstimate > previousTotal ? 'increase' : 'decrease',
          from: previousTotal,
          to: bestEstimate,
          percent: changePercent,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Add to history
    this.addToHistory(this.currentState);
    
    this.logger.info(`📊 Marketplace state: ${bestEstimate} listings (${(highestConfidence * 100).toFixed(1)}% confidence)`);
    return this.currentState;
  }

  /**
   * Strategy 1: Detect from pagination controls
   */
  async detectFromPagination(page) {
    const pagination = await page.evaluate(() => {
      // Look for pagination info (e.g., "Page 1 of 250")
      const paginationText = document.querySelector('.pagination-info, [class*="pagination"], nav[aria-label="Pagination"]');
      if (!paginationText) return null;
      
      const text = paginationText.textContent;
      const totalPagesMatch = text.match(/of\s+(\d+)/i);
      const resultsPerPage = 25; // Standard Flippa page size
      
      if (totalPagesMatch) {
        const totalPages = parseInt(totalPagesMatch[1]);
        return {
          total: totalPages * resultsPerPage,
          source: 'pagination',
          confidence: 0.9
        };
      }
      
      return null;
    });
    
    return pagination;
  }

  /**
   * Strategy 2: Detect from total count display
   */
  async detectFromTotalCount(page) {
    const totalCount = await page.evaluate(() => {
      // Look for total count displays (e.g., "5,635 results found")
      const patterns = [
        /(\d{1,3}(?:,\d{3})*)\s*(?:results?|listings?|businesses?)\s*(?:found|available|total)/i,
        /showing\s*\d+\s*-\s*\d+\s*of\s*(\d{1,3}(?:,\d{3})*)/i,
        /total:\s*(\d{1,3}(?:,\d{3})*)/i
      ];
      
      const textNodes = Array.from(document.querySelectorAll('*')).filter(el => {
        return el.childNodes.length === 1 && el.childNodes[0].nodeType === 3;
      });
      
      for (const node of textNodes) {
        const text = node.textContent;
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            return {
              total: parseInt(match[1].replace(/,/g, '')),
              source: 'total_count',
              confidence: 0.95
            };
          }
        }
      }
      
      return null;
    });
    
    return totalCount;
  }

  /**
   * Strategy 3: Detect from search results metadata
   */
  async detectFromSearchResults(page) {
    const searchMeta = await page.evaluate(() => {
      // Check meta tags or JSON-LD data
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        try {
          const data = JSON.parse(jsonLd.textContent);
          if (data.numberOfItems || data.totalResults) {
            return {
              total: data.numberOfItems || data.totalResults,
              source: 'json_ld',
              confidence: 0.98
            };
          }
        } catch (e) {}
      }
      
      // Check meta tags
      const metaCount = document.querySelector('meta[name="results-count"], meta[property="results:count"]');
      if (metaCount) {
        return {
          total: parseInt(metaCount.content),
          source: 'meta_tag',
          confidence: 0.92
        };
      }
      
      return null;
    });
    
    return searchMeta;
  }

  /**
   * Strategy 4: Navigate to last page and count
   */
  async detectFromLastPage(page) {
    try {
      // Save current URL
      const currentUrl = page.url();
      
      // Try to find last page link
      const lastPageInfo = await page.evaluate(() => {
        const lastPageLink = document.querySelector('a[href*="page="]:last-child, .pagination a:last-child');
        if (!lastPageLink) return null;
        
        const href = lastPageLink.getAttribute('href');
        const pageMatch = href.match(/page=(\d+)/);
        if (pageMatch) {
          return {
            pageNumber: parseInt(pageMatch[1]),
            url: lastPageLink.href
          };
        }
        return null;
      });
      
      if (lastPageInfo) {
        // Estimate based on last page number
        return {
          total: lastPageInfo.pageNumber * 25, // Approximate
          source: 'last_page_link',
          confidence: 0.85
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Strategy 5: Check for API hints in page
   */
  async detectFromAPIHints(page) {
    const apiHints = await page.evaluate(() => {
      // Check window object for exposed data
      if (window.__INITIAL_STATE__ || window.__DATA__) {
        const data = window.__INITIAL_STATE__ || window.__DATA__;
        if (data.search?.totalResults) {
          return {
            total: data.search.totalResults,
            source: 'window_data',
            confidence: 0.96
          };
        }
      }
      
      // Check for API endpoints in network requests
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = script.textContent;
        const totalMatch = content.match(/"total":\s*(\d+)|totalResults":\s*(\d+)/);
        if (totalMatch) {
          return {
            total: parseInt(totalMatch[1] || totalMatch[2]),
            source: 'inline_script',
            confidence: 0.88
          };
        }
      }
      
      return null;
    });
    
    return apiHints;
  }

  /**
   * Add state to history with deduplication
   */
  addToHistory(state) {
    // Don't add duplicate states
    const lastState = this.history[this.history.length - 1];
    if (lastState && lastState.totalListings === state.totalListings) {
      return;
    }
    
    this.history.push({
      ...state,
      timestamp: new Date().toISOString()
    });
    
    // Maintain history size limit
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Analyze completeness of current scraping session
   */
  analyzeCompleteness(scrapedListings, expectedTotal = null) {
    const total = expectedTotal || this.currentState.totalListings;
    if (!total) return { complete: false, percentage: 0, missing: [] };
    
    const scrapedIds = new Set(scrapedListings.map(l => l.id));
    const percentage = (scrapedIds.size / total) * 100;
    
    // Detect gaps in pagination
    const pageNumbers = scrapedListings.map(l => l.pageNumber || 1);
    const uniquePages = [...new Set(pageNumbers)].sort((a, b) => a - b);
    const expectedPages = Math.ceil(total / 25);
    
    const missingPages = [];
    for (let i = 1; i <= expectedPages; i++) {
      if (!uniquePages.includes(i)) {
        missingPages.push(i);
      }
    }
    
    return {
      complete: percentage >= 95,
      percentage: percentage.toFixed(2),
      scrapedCount: scrapedIds.size,
      expectedTotal: total,
      missingPages,
      duplicates: scrapedListings.length - scrapedIds.size,
      confidence: this.currentState.confidence
    };
  }

  /**
   * Detect if marketplace has significantly changed during scraping
   */
  hasMarketplaceChanged(threshold = 0.1) {
    if (this.history.length < 2) return false;
    
    const first = this.history[0].totalListings;
    const last = this.history[this.history.length - 1].totalListings;
    
    if (!first || !last) return false;
    
    const changePercent = Math.abs(last - first) / first;
    return changePercent > threshold;
  }

  /**
   * Get marketplace velocity (rate of change)
   */
  getMarketplaceVelocity() {
    if (this.history.length < 2) return 0;
    
    const recentHistory = this.history.slice(-10); // Last 10 measurements
    if (recentHistory.length < 2) return 0;
    
    const changes = [];
    for (let i = 1; i < recentHistory.length; i++) {
      const prev = recentHistory[i - 1];
      const curr = recentHistory[i];
      
      if (prev.totalListings && curr.totalListings) {
        const timeDiff = new Date(curr.timestamp) - new Date(prev.timestamp);
        const listingDiff = curr.totalListings - prev.totalListings;
        const changePerHour = (listingDiff / timeDiff) * 3600000; // ms to hours
        changes.push(changePerHour);
      }
    }
    
    if (changes.length === 0) return 0;
    
    // Return average change per hour
    return changes.reduce((a, b) => a + b, 0) / changes.length;
  }

  /**
   * Predict when to stop scraping based on natural end
   */
  predictNaturalEnd(currentPage, listingsPerPage) {
    if (!this.currentState.totalListings) return null;
    
    const expectedLastPage = Math.ceil(this.currentState.totalListings / listingsPerPage);
    const velocity = this.getMarketplaceVelocity();
    
    // If marketplace is growing rapidly, add buffer pages
    let bufferPages = 0;
    if (velocity > 10) { // More than 10 new listings per hour
      bufferPages = Math.ceil(velocity / listingsPerPage);
    }
    
    return {
      expectedLastPage,
      bufferPages,
      recommendedStopPage: expectedLastPage + bufferPages,
      marketplaceVelocity: velocity,
      confidence: this.currentState.confidence
    };
  }

  /**
   * Get comprehensive marketplace report
   */
  getReport() {
    const velocity = this.getMarketplaceVelocity();
    const changes = this.history.filter((h, i) => i > 0 && h.changes.length > 0);
    
    return {
      currentTotal: this.currentState.totalListings,
      confidence: this.currentState.confidence,
      lastChecked: this.currentState.lastChecked,
      sources: Object.keys(this.currentState.sources),
      historySize: this.history.length,
      totalChangesDetected: changes.length,
      marketplaceVelocity: velocity.toFixed(2) + ' listings/hour',
      isStable: Math.abs(velocity) < 5,
      recommendation: this.getRecommendation()
    };
  }

  /**
   * Get scraping recommendation based on marketplace state
   */
  getRecommendation() {
    const velocity = Math.abs(this.getMarketplaceVelocity());
    
    if (velocity < 5) {
      return 'Marketplace is stable. Standard scraping approach recommended.';
    } else if (velocity < 20) {
      return 'Marketplace is moderately active. Increase recheck frequency.';
    } else {
      return 'Marketplace is highly volatile. Use aggressive rechecking and buffer pages.';
    }
  }
}

module.exports = MarketplaceTracker;