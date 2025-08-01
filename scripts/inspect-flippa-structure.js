// Inspect Flippa page structure to find correct selectors
const { chromium } = require('playwright');

async function inspectFlippaStructure() {
  console.log('🔍 Inspecting Flippa Page Structure');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false, // Show browser
      timeout: 30000
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    console.log('\n🌐 Loading Flippa SaaS listings...');
    await page.goto('https://flippa.com/search?filter[property_type]=saas', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    console.log('✅ Page loaded');
    
    // Inspect page structure
    console.log('\n📋 Analyzing page structure...');
    
    const structure = await page.evaluate(() => {
      const info = {
        totalElements: document.querySelectorAll('*').length,
        links: [],
        priceElements: [],
        possibleListings: [],
        classPatterns: new Set(),
        idPatterns: new Set()
      };
      
      // Find all links to listings
      document.querySelectorAll('a[href*="/listings/"]').forEach(link => {
        info.links.push({
          href: link.href,
          text: link.textContent?.trim().substring(0, 100),
          parent: link.parentElement?.tagName,
          parentClass: link.parentElement?.className
        });
      });
      
      // Find all elements with prices
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent || '';
        if (text.match(/USD\s*\$[\d,]+|^\$[\d,]+/) && text.length < 100) {
          info.priceElements.push({
            text: text.trim(),
            tag: el.tagName,
            class: el.className,
            parent: el.parentElement?.tagName,
            parentClass: el.parentElement?.className
          });
        }
      });
      
      // Collect class and ID patterns
      document.querySelectorAll('[class*="listing"], [class*="card"], [class*="result"], [class*="property"]').forEach(el => {
        if (el.className) {
          info.classPatterns.add(el.className);
        }
      });
      
      // Find potential listing containers
      document.querySelectorAll('div, article, section').forEach(el => {
        const hasPrice = el.textContent?.match(/\$[\d,]+/);
        const hasLink = el.querySelector('a[href*="/listings/"]');
        const childCount = el.children.length;
        
        if (hasPrice && hasLink && childCount > 2 && childCount < 20) {
          info.possibleListings.push({
            tag: el.tagName,
            class: el.className,
            id: el.id,
            childCount: childCount,
            sample: el.textContent?.substring(0, 200)
          });
        }
      });
      
      // Convert Sets to Arrays for serialization
      info.classPatterns = Array.from(info.classPatterns).slice(0, 20);
      info.idPatterns = Array.from(info.idPatterns).slice(0, 20);
      
      return info;
    });
    
    console.log(`\n📊 Page Analysis Results:`);
    console.log(`   Total elements: ${structure.totalElements}`);
    console.log(`   Listing links found: ${structure.links.length}`);
    console.log(`   Price elements found: ${structure.priceElements.length}`);
    console.log(`   Possible listing containers: ${structure.possibleListings.length}`);
    
    if (structure.links.length > 0) {
      console.log('\n🔗 Sample listing links:');
      structure.links.slice(0, 5).forEach(link => {
        console.log(`   - ${link.text}`);
        console.log(`     URL: ${link.href}`);
        console.log(`     Parent: <${link.parent} class="${link.parentClass}">`);
      });
    }
    
    if (structure.priceElements.length > 0) {
      console.log('\n💰 Sample price elements:');
      structure.priceElements.slice(0, 5).forEach(price => {
        console.log(`   - "${price.text}"`);
        console.log(`     Tag: <${price.tag} class="${price.class}">`);
        console.log(`     Parent: <${price.parent} class="${price.parentClass}">`);
      });
    }
    
    if (structure.possibleListings.length > 0) {
      console.log('\n📦 Possible listing containers:');
      structure.possibleListings.slice(0, 3).forEach(container => {
        console.log(`   - <${container.tag} class="${container.class}">`);
        console.log(`     Children: ${container.childCount}`);
        console.log(`     Sample: ${container.sample?.replace(/\s+/g, ' ')}`);
      });
    }
    
    // Try to extract using the most common pattern
    console.log('\n🎯 Attempting targeted extraction...');
    
    const targetedListings = await page.evaluate(() => {
      const results = [];
      
      // Based on inspection, try the most likely container
      const containers = document.querySelectorAll('div[class*="styles_listingCard"], div[class*="listing-card"], article[class*="listing"]');
      
      if (containers.length === 0) {
        // Fallback: find divs that contain both a listing link and a price
        const allDivs = document.querySelectorAll('div');
        allDivs.forEach(div => {
          const link = div.querySelector('a[href*="/listings/"]');
          const priceText = div.textContent?.match(/USD\s*\$[\d,]+|^\$[\d,]+/)?.[0];
          
          if (link && priceText && div.children.length > 2) {
            results.push({
              title: link.textContent?.trim() || 'Untitled',
              url: link.href,
              price: priceText,
              container: div.className
            });
          }
        });
      } else {
        containers.forEach(container => {
          const link = container.querySelector('a[href*="/listings/"]');
          const title = container.querySelector('h2, h3, h4')?.textContent?.trim() || 
                       link?.textContent?.trim() || '';
          const priceText = container.textContent?.match(/USD\s*\$[\d,]+|^\$[\d,]+/)?.[0];
          
          results.push({
            title,
            url: link?.href || '',
            price: priceText || 'N/A',
            container: container.className
          });
        });
      }
      
      return results;
    });
    
    console.log(`\n✅ Found ${targetedListings.length} listings with targeted extraction`);
    
    if (targetedListings.length > 0) {
      console.log('\n📋 Extracted listings:');
      targetedListings.slice(0, 10).forEach((listing, i) => {
        console.log(`${i + 1}. ${listing.title}`);
        console.log(`   Price: ${listing.price}`);
        console.log(`   Container: ${listing.container}`);
      });
    }
    
    // Save inspection results
    require('fs').writeFileSync('flippa-inspection-results.json', JSON.stringify({
      structure,
      targetedListings
    }, null, 2));
    console.log('\n📄 Inspection results saved to flippa-inspection-results.json');
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      console.log('\n🔚 Browser will remain open for manual inspection');
      console.log('Close it manually when done.');
      // Don't close browser for manual inspection
    }
  }
}

inspectFlippaStructure().catch(console.error);