// Detailed inspection of Flippa listing structure
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function inspectFlippaDetailed() {
  console.log('🔬 Detailed Flippa Structure Analysis');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  try {
    const page = await browser.newPage();
    
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    
    // Detailed analysis of first 3 listings
    const detailedAnalysis = await page.evaluate(() => {
      const listings = document.querySelectorAll('div[id^="listing-"]');
      const results = {
        totalListings: listings.length,
        listingStructures: []
      };
      
      // Analyze first 3 listings in detail
      for (let i = 0; i < Math.min(3, listings.length); i++) {
        const listing = listings[i];
        const structure = {
          id: listing.id,
          index: i,
          elements: {}
        };
        
        // Get the main link
        const mainLink = listing.querySelector('a[href^="/"]');
        structure.elements.mainLink = {
          href: mainLink?.href || '',
          classes: mainLink?.className || ''
        };
        
        // Find title - look for text that's not "Confidential" or badges
        const allTextElements = listing.querySelectorAll('div, span, h2, h3, p');
        const titleCandidates = [];
        
        allTextElements.forEach(el => {
          const text = el.textContent.trim();
          const hasChildren = el.children.length > 0;
          
          // Skip if has many children (container) or is a known badge
          if (!hasChildren && text.length > 5 && text.length < 100) {
            const isBadge = text.match(/confidential|sponsored|editor|managed|verified|sign nda/i);
            const isPrice = text.match(/^\$|USD/);
            const isCategory = el.closest('[class*="badge"]') || el.closest('[class*="chip"]');
            
            if (!isBadge && !isPrice && !isCategory) {
              titleCandidates.push({
                text: text,
                element: el.tagName,
                classes: el.className,
                parent: el.parentElement?.tagName,
                parentClasses: el.parentElement?.className
              });
            }
          }
        });
        
        structure.elements.titleCandidates = titleCandidates;
        
        // Find price elements
        const priceElements = [];
        const priceTexts = listing.textContent.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
        
        priceTexts.forEach(priceText => {
          // Find which element contains this price
          allTextElements.forEach(el => {
            if (el.textContent.includes(priceText) && !el.children.length) {
              priceElements.push({
                text: priceText,
                element: el.tagName,
                classes: el.className,
                fullText: el.textContent.trim()
              });
            }
          });
        });
        
        structure.elements.prices = priceElements;
        
        // Find category/type elements
        const categoryElements = [];
        const categoryKeywords = ['Business', 'Content', 'SaaS', 'Ecommerce', 'App', 'Service'];
        
        allTextElements.forEach(el => {
          const text = el.textContent.trim();
          if (text.length < 50 && !el.children.length) {
            for (const keyword of categoryKeywords) {
              if (text.includes(keyword)) {
                categoryElements.push({
                  text: text,
                  element: el.tagName,
                  classes: el.className
                });
                break;
              }
            }
          }
        });
        
        structure.elements.categories = categoryElements;
        
        // Find financial metrics
        const financialPatterns = [
          /profit/i,
          /revenue/i,
          /sales/i,
          /income/i,
          /earnings/i,
          /\d+x/i,
          /multiple/i
        ];
        
        const financialElements = [];
        allTextElements.forEach(el => {
          const text = el.textContent.trim();
          if (text.length < 100 && !el.children.length) {
            for (const pattern of financialPatterns) {
              if (pattern.test(text)) {
                financialElements.push({
                  text: text,
                  element: el.tagName,
                  classes: el.className,
                  pattern: pattern.toString()
                });
                break;
              }
            }
          }
        });
        
        structure.elements.financials = financialElements;
        
        // Get full text content for context
        structure.fullText = listing.textContent.replace(/\s+/g, ' ').trim().substring(0, 500);
        
        results.listingStructures.push(structure);
      }
      
      return results;
    });
    
    console.log(`\n📊 Found ${detailedAnalysis.totalListings} listings`);
    
    detailedAnalysis.listingStructures.forEach(listing => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Listing ${listing.index + 1} (${listing.id}):`);
      
      console.log('\n🔗 Main Link:');
      console.log(`  href: ${listing.elements.mainLink.href}`);
      
      console.log('\n📝 Title Candidates:');
      listing.elements.titleCandidates.slice(0, 3).forEach(t => {
        console.log(`  "${t.text}"`);
        console.log(`    Element: ${t.element}.${t.classes.split(' ')[0] || 'no-class'}`);
        console.log(`    Parent: ${t.parent}.${t.parentClasses?.split(' ')[0] || 'no-class'}`);
      });
      
      console.log('\n💰 Prices Found:');
      listing.elements.prices.forEach(p => {
        console.log(`  ${p.text} in ${p.element}.${p.classes.split(' ')[0] || 'no-class'}`);
        console.log(`    Full: "${p.fullText}"`);
      });
      
      console.log('\n🏷️ Categories:');
      listing.elements.categories.forEach(c => {
        console.log(`  "${c.text}" in ${c.element}.${c.classes.split(' ')[0] || 'no-class'}`);
      });
      
      console.log('\n📊 Financial Metrics:');
      listing.elements.financials.forEach(f => {
        console.log(`  "${f.text}" (${f.pattern})`);
      });
      
      console.log('\n📄 Full Text Preview:');
      console.log(`  ${listing.fullText.substring(0, 200)}...`);
    });
    
    // Save detailed analysis
    const fs = require('fs').promises;
    await fs.writeFile(
      'flippa-detailed-analysis.json',
      JSON.stringify(detailedAnalysis, null, 2)
    );
    console.log('\n💾 Detailed analysis saved to flippa-detailed-analysis.json');
    
    console.log('\n⏸️ Keeping browser open for 20 seconds...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

inspectFlippaDetailed().catch(console.error);