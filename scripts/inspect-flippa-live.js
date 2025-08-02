// Inspect live Flippa page structure to improve selectors
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function inspectFlippaLive() {
  console.log('🔍 Inspecting Live Flippa Page Structure');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for observation
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to Flippa search page
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Wait for listings to load
    await page.waitForTimeout(5000);
    
    // Analyze page structure
    const analysis = await page.evaluate(() => {
      const results = {
        pageStructure: {},
        listingSelectors: [],
        sampleListing: {},
        financialPatterns: [],
        titleSelectors: []
      };
      
      // Find all possible listing containers
      const potentialSelectors = [
        // Generic selectors
        '[class*="listing"]',
        '[class*="card"]',
        '[class*="item"]',
        '[class*="result"]',
        '[class*="property"]',
        '[class*="business"]',
        // Specific selectors
        'article',
        'section article',
        'main article',
        'div[data-testid]',
        'a[href*="/listings/"]',
        'div[id^="listing-"]',
        '.search-results > div',
        '.listings-grid > div',
        '.results-container > div'
      ];
      
      // Test each selector
      potentialSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0 && elements.length < 100) { // Reasonable count
            results.listingSelectors.push({
              selector,
              count: elements.length,
              firstClass: elements[0].className,
              hasLinks: elements[0].querySelector('a[href*="/"]') !== null
            });
          }
        } catch (e) {}
      });
      
      // Sort by count (likely 20-30 listings per page)
      results.listingSelectors.sort((a, b) => {
        const aDiff = Math.abs(a.count - 25);
        const bDiff = Math.abs(b.count - 25);
        return aDiff - bDiff;
      });
      
      // Get the most likely listing container
      const bestSelector = results.listingSelectors[0]?.selector;
      if (bestSelector) {
        const listings = document.querySelectorAll(bestSelector);
        const firstListing = listings[0];
        
        if (firstListing) {
          // Analyze first listing structure
          results.sampleListing = {
            html: firstListing.outerHTML.substring(0, 1000),
            textContent: firstListing.textContent.substring(0, 500)
          };
          
          // Find title elements
          const titleCandidates = [
            firstListing.querySelector('h2'),
            firstListing.querySelector('h3'),
            firstListing.querySelector('[class*="title"]'),
            firstListing.querySelector('[class*="name"]'),
            firstListing.querySelector('a[href*="/"] > span'),
            firstListing.querySelector('a[href*="/"] > div')
          ];
          
          titleCandidates.forEach(el => {
            if (el && el.textContent.trim().length > 3) {
              results.titleSelectors.push({
                selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
                text: el.textContent.trim().substring(0, 100)
              });
            }
          });
          
          // Find financial data patterns
          const text = firstListing.textContent;
          const financialMatches = text.match(/(\$[\d,]+|[\d,]+\s*(revenue|profit|sales|mrr|income))/gi);
          if (financialMatches) {
            results.financialPatterns = financialMatches.slice(0, 5);
          }
        }
      }
      
      // Get page structure overview
      results.pageStructure = {
        hasMain: document.querySelector('main') !== null,
        mainClasses: document.querySelector('main')?.className || '',
        bodyClasses: document.body.className,
        totalLinks: document.querySelectorAll('a[href*="/listings/"], a[href*="/websites/"], a[href^="/"][href*="/"]').length
      };
      
      return results;
    });
    
    console.log('\n📊 Page Structure Analysis:');
    console.log(JSON.stringify(analysis.pageStructure, null, 2));
    
    console.log('\n🎯 Best Listing Selectors:');
    analysis.listingSelectors.slice(0, 5).forEach(s => {
      console.log(`- ${s.selector}: ${s.count} elements (class: ${s.firstClass})`);
    });
    
    console.log('\n📝 Title Selectors Found:');
    analysis.titleSelectors.forEach(t => {
      console.log(`- ${t.selector}: "${t.text}"`);
    });
    
    console.log('\n💰 Financial Patterns Found:');
    analysis.financialPatterns.forEach(p => {
      console.log(`- ${p}`);
    });
    
    console.log('\n🔍 Sample Listing HTML:');
    console.log(analysis.sampleListing.html);
    
    // Save analysis for review
    const fs = require('fs').promises;
    await fs.writeFile(
      'flippa-live-analysis.json',
      JSON.stringify(analysis, null, 2)
    );
    console.log('\n💾 Full analysis saved to flippa-live-analysis.json');
    
    // Keep browser open for manual inspection
    console.log('\n⏸️ Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run inspection
inspectFlippaLive().catch(console.error);