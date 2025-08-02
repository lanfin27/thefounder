// Complete Flippa scraping system with page setup, multi-page, and incremental updates
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const CONFIG = {
  baseUrl: 'https://flippa.com/search',
  itemsPerPage: 100,
  pageLoadTimeout: 120000, // Increased to 2 minutes
  navigationTimeout: 120000, // Navigation timeout
  actionDelay: 3000,
  maxRetries: 3,
  maxPages: process.env.MAX_PAGES ? parseInt(process.env.MAX_PAGES) : 10, // Default 10 pages
  headless: false, // Set to true for production
  debug: process.env.DEBUG === 'true' // Enable debug mode with DEBUG=true
};

// Helper function to optimize browser for scraping
async function optimizeBrowserForScraping(page) {
  console.log('⚡ Optimizing browser for scraping...');
  
  // Playwright route interception (not setRequestInterception)
  await page.route('**/*', (route) => {
    const request = route.request();
    const resourceType = request.resourceType();
    
    // Block unnecessary resources to speed up loading
    if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });
  
  // Set timeouts
  await page.setDefaultTimeout(CONFIG.pageLoadTimeout);
  await page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);
  
  console.log('✅ Browser optimization complete');
}

// Helper function to load page with fallback strategies
async function loadPageWithFallback(page, url) {
  const strategies = [
    { waitUntil: 'domcontentloaded', timeout: 120000 },
    { waitUntil: 'load', timeout: 90000 },
    { waitUntil: 'networkidle0', timeout: 60000 }
  ];
  
  for (const strategy of strategies) {
    try {
      console.log(`🌐 Trying to load with strategy: ${strategy.waitUntil} (timeout: ${strategy.timeout}ms)`);
      await page.goto(url, strategy);
      console.log('✅ Page loaded successfully');
      return true;
    } catch (error) {
      console.log(`⚠️  Strategy failed: ${error.message}`);
      if (strategy === strategies[strategies.length - 1]) {
        throw new Error('All loading strategies failed');
      }
      continue;
    }
  }
}

// Helper function to set sort order with multiple strategies
async function setSortOrder(page) {
  console.log('🔄 Setting sort to "Most Recent"...');
  
  try {
    // Try first select element
    await page.locator('select[name="sort_alias"]').first().selectOption('most_recent');
    console.log('✅ Sort order set using first element');
    await page.waitForTimeout(2000);
    return true;
  } catch (error) {
    try {
      // Try more specific selector
      await page.locator('#searchFilters select[name="sort_alias"]').selectOption('most_recent');
      console.log('✅ Sort order set using specific selector');
      await page.waitForTimeout(2000);
      return true;
    } catch (error2) {
      try {
        // Try by visible element
        await page.locator('select[name="sort_alias"]:visible').selectOption('most_recent');
        console.log('✅ Sort order set using visible element');
        await page.waitForTimeout(2000);
        return true;
      } catch (error3) {
        console.log('⚠️  Could not set sort order:', error3.message);
        return false;
      }
    }
  }
}

// Helper function to check for next page
async function hasNextPage(page) {
  console.log('🔍 Checking for next page...');
  
  // Multiple strategies to find next button
  const nextSelectors = [
    'button:has-text("Next")',
    'a:has-text("Next")',
    'button[aria-label*="Next"]',
    'a[aria-label*="Next"]',
    '.pagination .next:not(.disabled)',
    '.pagination li:last-child:not(.disabled) a',
    'svg use[href*="chevron-right"]',
    'button:has(svg use[href*="chevron-right"])',
    'a:has(svg use[href*="chevron-right"])',
    'ul.pagination li:has-text("Next") a',
    'nav[aria-label="Pagination"] a:has-text("Next")',
    'button:text("»")',
    'a:text("»")'
  ];
  
  for (const selector of nextSelectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible() && await element.isEnabled()) {
        console.log(`✅ Next button found with selector: ${selector}`);
        return element;
      }
    } catch (e) {
      continue;
    }
  }
  
  // Check pagination numbers
  try {
    const paginationItems = await page.locator('.pagination li').all();
    for (let i = 0; i < paginationItems.length; i++) {
      const text = await paginationItems[i].textContent();
      if (text && (text.includes('Next') || text.includes('»'))) {
        const link = paginationItems[i].locator('a').first();
        if (await link.isVisible() && await link.isEnabled()) {
          console.log('✅ Next button found in pagination');
          return link;
        }
      }
    }
  } catch (e) {
    console.log('No pagination found');
  }
  
  console.log('❌ No next page button found');
  return null;
}

// Helper function to click next page
async function clickNextPage(page, nextButton) {
  console.log('🔄 Clicking next page...');
  
  try {
    await nextButton.click();
    
    // Wait longer for page transition
    await page.waitForTimeout(5000);
    
    // Wait for new content to load with Recently Sold listings
    await page.waitForSelector('div[id^="listing-"]', { timeout: 15000 });
    
    // Additional wait for Angular to fully process filters
    await page.waitForTimeout(3000);
    
    console.log('✅ Successfully navigated to next page');
    return true;
  } catch (error) {
    console.log(`❌ Error clicking next page: ${error.message}`);
    return false;
  }
}

// Helper function to re-apply filters on new page
async function reapplyFiltersOnPage(page, pageNumber) {
  console.log(`🔧 Re-applying filters on page ${pageNumber}...`);
  
  // Wait for page to fully load
  await page.waitForTimeout(3000);
  await page.waitForSelector('body', { timeout: 30000 });
  
  // Step 1: Clear any existing filters (in case page has different state)
  console.log('🧹 Clearing filters on new page...');
  try {
    const clearButton = page.locator('div.btn.btn-link.btn-sm.float-right:has-text("Clear")').first();
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Filters cleared on new page');
    }
  } catch (e) {
    console.log('⚠️ Clear button not found, continuing...');
  }
  
  // Step 2: Re-enable "Recently Sold" filter
  console.log('💰 Re-enabling "Recently Sold" filter...');
  const recentlySoldSelectors = [
    'label:has-text("Recently Sold") input[type="checkbox"]',
    'input[type="checkbox"][name*="recently_sold"]',
    'input[type="checkbox"][value*="sold"]',
    '.checkbox__control-indicator:near(:text("Recently Sold"))'
  ];
  
  let recentlySoldApplied = false;
  for (const selector of recentlySoldSelectors) {
    try {
      const checkbox = page.locator(selector).first();
      if (await checkbox.isVisible()) {
        const isChecked = await checkbox.isChecked();
        if (!isChecked) {
          await checkbox.click();
          await page.waitForTimeout(2000);
          console.log(`✅ Recently Sold re-enabled using: ${selector}`);
          recentlySoldApplied = true;
          break;
        } else {
          console.log('✅ Recently Sold already enabled');
          recentlySoldApplied = true;
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!recentlySoldApplied) {
    console.log('⚠️ Could not re-apply Recently Sold filter');
  }
  
  // Step 3: Re-set sort order to "Most Recent"
  console.log('🔄 Re-setting sort to "Most Recent"...');
  try {
    const sortSelect = page.locator('select[name="sort_alias"]').first();
    await sortSelect.selectOption('most_recent');
    await page.waitForTimeout(2000);
    console.log('✅ Sort order re-applied: Most Recent');
  } catch (e) {
    console.log('⚠️ Could not re-apply sort order');
  }
  
  // Step 4: Re-set items per page to 100
  console.log('📊 Re-setting items per page to 100...');
  const itemsPerPageSelectors = [
    'select[name="per_page"]',
    'select[name="limit"]', 
    'select[name="page_size"]',
    'select:has(option:text("100"))'
  ];
  
  for (const selector of itemsPerPageSelectors) {
    try {
      const select = page.locator(selector).first();
      if (await select.isVisible()) {
        await select.selectOption('100');
        await page.waitForTimeout(2000);
        console.log(`✅ Items per page re-set using: ${selector}`);
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  // Wait for results to update after all filter changes
  await page.waitForTimeout(4000);
  console.log(`✅ All filters re-applied on page ${pageNumber}`);
}

// Helper function to verify filters are applied
async function verifyFiltersApplied(page, pageNumber) {
  console.log(`🔍 Verifying filters on page ${pageNumber}...`);
  
  // Check Recently Sold is enabled using browser-compatible methods
  const recentlySoldChecked = await page.evaluate(() => {
    // Find Recently Sold checkbox using multiple strategies
    let checkbox = null;
    
    // Strategy 1: Find by text content in labels
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent && label.textContent.includes('Recently Sold')) {
        checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox) break;
      }
    }
    
    // Strategy 2: Find by name/value attributes
    if (!checkbox) {
      checkbox = document.querySelector('input[type="checkbox"][name*="sold"]') ||
                document.querySelector('input[type="checkbox"][value*="sold"]') ||
                document.querySelector('input[type="checkbox"][name*="recently"]');
    }
    
    // Strategy 3: Find by nearby text
    if (!checkbox) {
      const allInputs = document.querySelectorAll('input[type="checkbox"]');
      for (const input of allInputs) {
        const parent = input.closest('div, label, li');
        if (parent && parent.textContent && parent.textContent.includes('Recently Sold')) {
          checkbox = input;
          break;
        }
      }
    }
    
    return checkbox ? checkbox.checked : false;
  });
  
  // Check sort order using standard selector
  const sortValue = await page.evaluate(() => {
    const select = document.querySelector('select[name="sort_alias"]');
    return select ? select.value : null;
  });
  
  // Check items per page setting
  const itemsPerPage = await page.evaluate(() => {
    const selectors = ['select[name="per_page"]', 'select[name="limit"]', 'select[name="page_size"]'];
    for (const selector of selectors) {
      const select = document.querySelector(selector);
      if (select) return select.value;
    }
    return null;
  });
  
  // Check URL for Recently Sold parameter
  const currentUrl = page.url();
  const hasRecentlySoldInUrl = currentUrl.includes('recently') || 
                               currentUrl.includes('sold') || 
                               currentUrl.includes('status');
  
  console.log(`📊 Page ${pageNumber} Filter Status:`);
  console.log(`   Recently Sold checkbox: ${recentlySoldChecked ? '✅' : '❌'}`);
  console.log(`   Sort order: ${sortValue === 'most_recent' ? '✅ most_recent' : `❌ ${sortValue}`}`);
  console.log(`   Items per page: ${itemsPerPage === '100' ? '✅ 100' : `❌ ${itemsPerPage}`}`);
  console.log(`   URL has sold filter: ${hasRecentlySoldInUrl ? '✅' : '❌'}`);
  
  return {
    recentlySoldEnabled: recentlySoldChecked,
    sortCorrect: sortValue === 'most_recent',
    itemsPerPageCorrect: itemsPerPage === '100',
    urlCorrect: hasRecentlySoldInUrl
  };
}

async function scrapeFlippaComplete() {
  console.log('🚀 Complete Flippa Scraping System');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    // Browser launch options with optimizations
    const launchOptions = {
      headless: CONFIG.headless,
      slowMo: CONFIG.debug ? 100 : 0,
      args: [
        '--no-first-run',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    };
    
    if (CONFIG.debug) {
      console.log('🐛 Debug mode enabled - browser will be visible');
    }
    
    browser = await chromium.launch(launchOptions);
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (CONFIG.debug || (msg.type() === 'log' && msg.text().includes('Phase'))) {
        console.log(`[Browser] ${msg.text()}`);
      }
    });
    
    // Optimize browser for scraping (unless in debug mode)
    if (!CONFIG.debug) {
      await optimizeBrowserForScraping(page);
    } else {
      // Just set timeouts in debug mode
      await page.setDefaultTimeout(CONFIG.pageLoadTimeout);
      await page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);
    }
    
    // PHASE 1: PAGE SETUP AND CONFIGURATION
    console.log('\n✅ Phase 1: Page setup starting...');
    
    // 1. Navigate to base URL with fallback strategies
    console.log('🌐 Loading Flippa search page...');
    try {
      await loadPageWithFallback(page, CONFIG.baseUrl);
    } catch (error) {
      console.log('❌ Failed to load page with all strategies, trying direct navigation...');
      // Last resort: direct navigation with minimal wait
      await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded', timeout: 180000 });
    }
    
    // Wait for Angular app to initialize
    console.log('⏳ Waiting for Angular app to initialize...');
    await page.waitForTimeout(5000);
    
    // Wait for specific elements to ensure page is ready
    try {
      await page.waitForSelector('body', { timeout: 30000 });
      await page.waitForSelector('[id^="listing-"]', { timeout: 30000 });
      console.log('✅ Page elements loaded');
    } catch (error) {
      console.log('⚠️  Some elements not found, continuing anyway...');
    }
    
    // 2. Clear all filters
    console.log('🧹 Clearing all filters...');
    try {
      const clearButton = await page.locator('div.btn.btn-link.btn-sm:has-text("Clear")');
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(CONFIG.actionDelay);
        console.log('✅ Filters cleared');
      }
    } catch (e) {
      console.log('⚠️  No filters to clear');
    }
    
    // 3. Enable "Recently Sold" status with improved detection
    console.log('💰 Enabling "Recently Sold" filter...');
    let recentlySoldEnabled = false;
    
    // Strategy 1: Try multiple selectors
    const recentlySoldSelectors = [
      'label:has-text("Recently Sold") input[type="checkbox"]',
      'input[type="checkbox"][ng-model*="recently_sold"]',
      'input[type="checkbox"][ng-model*="sold"]',
      'label:has-text("Recently Sold")',
      '.filter-section:has-text("Status") label:has-text("Recently Sold")',
      'div:has-text("Status") label:has-text("Recently Sold")'
    ];
    
    for (const selector of recentlySoldSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click();
          await page.waitForTimeout(CONFIG.actionDelay);
          recentlySoldEnabled = true;
          console.log(`✅ Recently Sold filter enabled using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    // Strategy 2: JavaScript DOM search
    if (!recentlySoldEnabled) {
      try {
        recentlySoldEnabled = await page.evaluate(() => {
          // Find element containing "Recently Sold" text
          const elements = Array.from(document.querySelectorAll('*'));
          const recentlySoldElement = elements.find(el => 
            el.textContent?.trim() === 'Recently Sold' || 
            (el.textContent?.includes('Recently Sold') && el.textContent?.length < 50)
          );
          
          if (recentlySoldElement) {
            // Try to find associated checkbox
            let checkbox = recentlySoldElement.querySelector('input[type="checkbox"]');
            
            if (!checkbox) {
              // Check parent elements
              let parent = recentlySoldElement.parentElement;
              for (let i = 0; i < 3 && parent; i++) {
                checkbox = parent.querySelector('input[type="checkbox"]');
                if (checkbox) break;
                parent = parent.parentElement;
              }
            }
            
            if (!checkbox) {
              // Check siblings
              checkbox = recentlySoldElement.previousElementSibling?.querySelector('input[type="checkbox"]') ||
                        recentlySoldElement.nextElementSibling?.querySelector('input[type="checkbox"]');
            }
            
            if (checkbox && !checkbox.checked) {
              checkbox.click();
              console.log('✅ Recently Sold checkbox clicked via DOM search');
              return true;
            } else if (checkbox && checkbox.checked) {
              console.log('✅ Recently Sold checkbox already checked');
              return true;
            }
            
            // If no checkbox found, try clicking the label/element itself
            if (recentlySoldElement.tagName === 'LABEL' || recentlySoldElement.closest('label')) {
              const label = recentlySoldElement.tagName === 'LABEL' ? recentlySoldElement : recentlySoldElement.closest('label');
              label.click();
              console.log('✅ Recently Sold label clicked');
              return true;
            }
          }
          
          return false;
        });
        
        if (recentlySoldEnabled) {
          await page.waitForTimeout(CONFIG.actionDelay);
        }
      } catch (e) {
        console.log('⚠️  DOM search failed:', e.message);
      }
    }
    
    if (!recentlySoldEnabled) {
      console.log('⚠️  Could not enable Recently Sold filter - continuing anyway');
    }
    
    // 4. Set sort order to "Most Recent"
    await setSortOrder(page);
    await page.waitForTimeout(CONFIG.actionDelay);
    
    // 5. Set items per page to 100
    console.log('📊 Setting items per page to 100...');
    try {
      // Look for items per page selector
      const pageSizeSelectors = [
        'select[ng-model*="pageSize"]',
        'select[ng-model*="itemsPerPage"]',
        'select:has-text("per page")',
        'select.page-size'
      ];
      
      let pageSizeSet = false;
      for (const selector of pageSizeSelectors) {
        try {
          const pageSizeSelect = await page.locator(selector);
          if (await pageSizeSelect.isVisible()) {
            await pageSizeSelect.selectOption('100');
            await page.waitForTimeout(CONFIG.actionDelay);
            pageSizeSet = true;
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      if (pageSizeSet) {
        console.log('✅ Items per page set to 100');
      } else {
        console.log('⚠️  Could not find page size selector, using default');
      }
    } catch (e) {
      console.log('⚠️  Error setting page size:', e.message);
    }
    
    console.log('✅ Phase 1: Page setup completed\n');
    
    // PHASE 2: MULTI-PAGE SCRAPING SYSTEM
    console.log('🔍 Phase 2: Starting multi-page scraping...');
    
    let currentPage = 1;
    let allListings = [];
    const scrapedListingIds = new Set();
    
    // Get existing listings from database for incremental updates
    console.log('📊 Loading existing listings from database...');
    const { data: existingListings } = await supabase
      .from('flippa_listings')
      .select('listing_id, asking_price, profit_multiple, revenue_multiple, raw_data');
    
    const existingListingsMap = new Map();
    if (existingListings) {
      existingListings.forEach(listing => {
        existingListingsMap.set(listing.listing_id, listing);
      });
      console.log(`📊 Found ${existingListingsMap.size} existing listings in database`);
    }
    
    while (currentPage <= CONFIG.maxPages) {
      console.log(`\n🔍 Scraping page ${currentPage} of ${CONFIG.maxPages}...`);
      
      // CRITICAL: Re-apply filters on each page (except first page)
      if (currentPage > 1) {
        await reapplyFiltersOnPage(page, currentPage);
        
        // Verify filters were applied correctly
        const verification = await verifyFiltersApplied(page, currentPage);
        if (!verification.recentlySoldEnabled) {
          console.log(`⚠️ Recently Sold filter not applied on page ${currentPage}, trying again...`);
          await reapplyFiltersOnPage(page, currentPage);
        }
      }
      
      // Wait for listings to load
      try {
        await page.waitForSelector('[id^="listing-"]', { timeout: 30000 });
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log('❌ No listings found on page, stopping');
        break;
      }
      
      // Extract listings from current page
      const pageListings = await page.evaluate(() => {
        const listings = [];
        const containers = document.querySelectorAll('[id^="listing-"]');
        
        containers.forEach((container, index) => {
          try {
            const listing = {};
            
            // Extract listing ID
            const idMatch = container.id.match(/listing-(\d+)/);
            if (!idMatch) return;
            
            listing.listing_id = idMatch[1];
            listing.url = `https://flippa.com/${listing.listing_id}`;
            
            // Extract sale status
            const saleMethodEl = container.querySelector('span[ng-bind-html*="saleMethodTitle"]');
            const saleMethodText = saleMethodEl?.textContent?.trim() || '';
            
            listing.is_sold = saleMethodText.includes('Sold');
            listing.is_auction = saleMethodText.includes('Current bid');
            listing.price_type = listing.is_sold ? 'sold' : 'asking';
            listing.listing_status = listing.is_sold ? 'sold' : (listing.is_auction ? 'auction' : 'asking');
            
            // Extract price information
            const priceContainer = container.querySelector('h5[ng-if*="price_dropped"], h5:not([ng-if]), .tw-text-2xl');
            if (priceContainer) {
              const priceText = priceContainer.textContent || '';
              
              // Current price
              const currentPriceMatch = priceText.match(/(?:USD|AUD)\s*\$([\d,]+)(?!.*<s>)/);
              if (currentPriceMatch) {
                listing.current_price = parseInt(currentPriceMatch[1].replace(/,/g, ''));
              }
              
              // Original price (if discounted)
              const originalPriceEl = priceContainer.querySelector('s');
              if (originalPriceEl) {
                const originalPriceMatch = originalPriceEl.textContent.match(/\$([\d,]+)/);
                if (originalPriceMatch) {
                  listing.original_price = parseInt(originalPriceMatch[1].replace(/,/g, ''));
                }
              }
              
              // Discount percentage
              const discountMatch = priceText.match(/Reduced\s*(\d+)%/);
              if (discountMatch) {
                listing.discount_percentage = parseInt(discountMatch[1]);
              }
            }
            
            // Extract multiples
            const multipleContainer = container.querySelector('div[ng-if*="show_multiple"]');
            if (multipleContainer) {
              const multipleText = multipleContainer.textContent || '';
              
              const profitMultipleMatch = multipleText.match(/([\d.]+)x\s*(?:Profit|profit)/);
              if (profitMultipleMatch) {
                listing.profit_multiple = parseFloat(profitMultipleMatch[1]);
              }
              
              const revenueMultipleMatch = multipleText.match(/([\d.]+)x\s*(?:Revenue|revenue)/);
              if (revenueMultipleMatch) {
                listing.revenue_multiple = parseFloat(revenueMultipleMatch[1]);
              }
            }
            
            // Extract business details
            const fieldContainers = container.querySelectorAll('.tw-flex.tw-flex-col');
            fieldContainers.forEach(fieldContainer => {
              const labelEl = fieldContainer.querySelector('span.tw-text-xs.tw-uppercase');
              const valueEl = fieldContainer.querySelector('div.tw-text-sm, span.tw-text-sm');
              
              if (labelEl && valueEl) {
                const label = labelEl.textContent.trim().toLowerCase();
                const value = valueEl.textContent.trim();
                
                switch(label) {
                  case 'type':
                    listing.type = value;
                    break;
                  case 'industry':
                    listing.industry = value;
                    break;
                  case 'monetization':
                    listing.monetization = value;
                    break;
                  case 'site age':
                    listing.site_age = value;
                    const ageMatch = value.match(/(\d+)\s*(year|month)/i);
                    if (ageMatch) {
                      const num = parseInt(ageMatch[1]);
                      listing.site_age_months = ageMatch[2].toLowerCase().includes('year') ? num * 12 : num;
                    }
                    break;
                  case 'net profit':
                    const profitMatch = value.match(/\$([\d,]+)\s*p\/mo/);
                    if (profitMatch) {
                      listing.monthly_profit = parseInt(profitMatch[1].replace(/,/g, ''));
                    }
                    break;
                }
              }
            });
            
            // Extract title
            if (listing.type && listing.industry) {
              listing.title = `${listing.type} | ${listing.industry}`;
            } else {
              const domainMatch = container.textContent?.match(/([a-zA-Z0-9-]+\.(com|net|org|io|co|xyz|app|ai|dev))/);
              if (domainMatch && !domainMatch[0].includes('flippa.com')) {
                listing.title = domainMatch[0];
              } else {
                listing.title = listing.type || 'SaaS Business';
              }
            }
            
            // Extract badges
            listing.verified_listing = container.textContent?.includes('Verified Listing') || false;
            listing.confidential = container.textContent?.includes('ConfidentialSign NDA') || false;
            
            // Extract geography
            const locationPattern = container.textContent?.match(/([A-Z]{2}),\s*([^,\n]+(?:States|Kingdom|Australia|Canada))/);
            if (locationPattern) {
              listing.geography = locationPattern[0];
            }
            
            // Add metadata
            listing.scraped_at = new Date().toISOString();
            listing.page_number = window.currentPageNumber || 1;
            
            listings.push(listing);
          } catch (err) {
            console.error('Error extracting listing:', err);
          }
        });
        
        return listings;
      });
      
      console.log(`📊 Found ${pageListings.length} listings on page ${currentPage}`);
      
      // Verify we got the expected number of listings (should be close to 100)
      if (pageListings.length < 50 && currentPage === 1) {
        console.log('⚠️ Unexpected low listing count on first page, filters may not be applied correctly');
      }
      
      if (pageListings.length === 0) {
        console.log('❌ No listings found on this page, stopping');
        break;
      }
      
      // Add page number to listings
      pageListings.forEach(listing => {
        listing.page_number = currentPage;
        allListings.push(listing);
        scrapedListingIds.add(listing.listing_id);
      });
      
      // Check if we've reached the max pages limit
      if (currentPage >= CONFIG.maxPages) {
        console.log(`✅ Reached maximum page limit (${CONFIG.maxPages})`);
        break;
      }
      
      // Check for next page
      const nextButton = await hasNextPage(page);
      if (!nextButton) {
        console.log(`✅ No more pages to scrape after page ${currentPage}`);
        break;
      }
      
      // Click next page
      const success = await clickNextPage(page, nextButton);
      if (!success) {
        console.log('❌ Failed to navigate to next page, stopping');
        break;
      }
      
      currentPage++;
      
      // Save progress after each page
      if (pageListings.length > 0) {
        console.log('💾 Saving page data...');
        await saveListings(pageListings, existingListingsMap);
      }
    }
    
    console.log(`\n✅ Phase 2: Completed scraping ${currentPage} pages`);
    console.log(`📊 Total listings found: ${allListings.length}`);
    
    // PHASE 3: INCREMENTAL UPDATE ANALYSIS
    console.log('\n📊 Phase 3: Analyzing incremental updates...');
    
    let newListings = 0;
    let updatedListings = 0;
    
    allListings.forEach(listing => {
      if (existingListingsMap.has(listing.listing_id)) {
        const existing = existingListingsMap.get(listing.listing_id);
        // Check if data has changed
        if (existing.asking_price !== listing.current_price ||
            existing.profit_multiple !== listing.profit_multiple ||
            existing.revenue_multiple !== listing.revenue_multiple) {
          updatedListings++;
        }
      } else {
        newListings++;
      }
    });
    
    console.log(`📊 Found ${newListings} new listings, ${updatedListings} updates`);
    
    // PHASE 4: FINAL SUMMARY
    console.log('\n🎯 COMPLETE: Scraping Summary');
    console.log('=' .repeat(70));
    console.log(`Total pages scraped: ${currentPage}`);
    console.log(`Total listings processed: ${allListings.length}`);
    console.log(`New listings: ${newListings}`);
    console.log(`Updated listings: ${updatedListings}`);
    console.log(`Unique listing IDs: ${scrapedListingIds.size}`);
    
    await page.waitForTimeout(10000); // Keep browser open for inspection
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function to save listings with deduplication
async function saveListings(listings, existingListingsMap) {
  const toInsert = [];
  const toUpdate = [];
  
  listings.forEach(listing => {
    const dbRecord = {
      listing_id: listing.listing_id,
      title: listing.title,
      url: listing.url,
      asking_price: listing.current_price || null,
      primary_category: (listing.type || 'saas').toLowerCase(),
      sub_category: listing.industry ? listing.industry.toLowerCase() : null,
      industry: listing.industry,
      business_model: listing.type,
      monetization: listing.monetization,
      monthly_profit: listing.monthly_profit || null,
      annual_profit: listing.monthly_profit ? listing.monthly_profit * 12 : null,
      profit_multiple: listing.profit_multiple || null,
      revenue_multiple: listing.revenue_multiple || null,
      site_age_months: listing.site_age_months || null,
      is_verified: listing.verified_listing || false,
      raw_data: {
        price_type: listing.price_type,
        listing_status: listing.listing_status,
        is_sold: listing.is_sold,
        original_price: listing.original_price,
        discount_percentage: listing.discount_percentage,
        geography: listing.geography,
        page_number: listing.page_number,
        scraped_at: listing.scraped_at
      }
    };
    
    if (existingListingsMap.has(listing.listing_id)) {
      toUpdate.push(dbRecord);
    } else {
      toInsert.push(dbRecord);
    }
  });
  
  // Insert new listings
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('flippa_listings')
      .insert(toInsert);
    
    if (error) {
      console.log('❌ Insert error:', error.message);
    } else {
      console.log(`✅ Inserted ${toInsert.length} new listings`);
    }
  }
  
  // Update existing listings
  if (toUpdate.length > 0) {
    for (const listing of toUpdate) {
      const { error } = await supabase
        .from('flippa_listings')
        .update(listing)
        .eq('listing_id', listing.listing_id);
      
      if (error) {
        console.log(`❌ Update error for ${listing.listing_id}:`, error.message);
      }
    }
    console.log(`✅ Updated ${toUpdate.length} existing listings`);
  }
}

// Run the scraper
scrapeFlippaComplete().catch(console.error);