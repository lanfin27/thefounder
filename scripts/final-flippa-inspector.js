// scripts/final-flippa-inspector.js
const puppeteer = require('puppeteer');
const fs = require('fs');

async function finalFlippaInspection() {
  console.log('🔍 FINAL FLIPPA INSPECTION - MANUAL GUIDED APPROACH');
  console.log('📋 This will open Flippa and pause for manual inspection');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    slowMo: 1000,
    args: [
      '--start-maximized',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('🌐 Loading Flippa...');
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n🎯 MANUAL INSPECTION INSTRUCTIONS:');
    console.log('================================');
    console.log('1. Look at the browser window that opened');
    console.log('2. Open DevTools (F12)'); 
    console.log('3. Find ANY listing on the page');
    console.log('4. Right-click → Inspect Element');
    console.log('5. Find the container that holds the ENTIRE listing');
    console.log('6. Copy the class name or tag structure');
    console.log('\n⏳ Waiting 2 minutes for your inspection...');
    
    // Wait for manual inspection
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    // Extract everything we can see
    const actualData = await page.evaluate(() => {
      const results = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        
        // Get all visible text that contains dollar signs
        priceTexts: [],
        
        // Get all links
        allLinks: [],
        
        // Get all elements with common listing-related classes
        potentialContainers: [],
        
        // Get page structure
        bodyHTML: document.body.innerHTML.slice(0, 10000),
        
        // Try different approaches to find listings
        searchResults: []
      };
      
      // Find elements containing prices
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent || '';
        if (/\$[\d,]+/.test(text) && text.length < 300) {
          results.priceTexts.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            text: text.slice(0, 200),
            outerHTML: el.outerHTML.slice(0, 500)
          });
        }
      });
      
      // Get all links
      document.querySelectorAll('a[href]').forEach(link => {
        if (link.href && (link.href.includes('flippa') || link.href.includes('listing'))) {
          results.allLinks.push({
            href: link.href,
            text: link.textContent?.slice(0, 100),
            className: link.className
          });
        }
      });
      
      // Look for potential listing containers using various strategies
      const strategies = [
        'div[class*="listing"]',
        'div[class*="card"]', 
        'div[class*="item"]',
        'div[class*="result"]',
        'article',
        'li',
        '[data-testid]'
      ];
      
      strategies.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0 && elements.length < 100) {
            results.potentialContainers.push({
              selector: selector,
              count: elements.length,
              samples: Array.from(elements).slice(0, 3).map(el => ({
                className: el.className,
                textContent: el.textContent?.slice(0, 200),
                hasPrice: /\$[\d,]+/.test(el.textContent || ''),
                hasLink: !!el.querySelector('a[href]')
              }))
            });
          }
        } catch (e) {
          // Invalid selector
        }
      });
      
      return results;
    });
    
    // Save the actual data
    fs.writeFileSync('final-flippa-inspection.json', JSON.stringify(actualData, null, 2));
    
    // Save screenshot
    await page.screenshot({ 
      path: 'final-flippa-screenshot.png', 
      fullPage: true 
    });
    
    console.log('\n💾 INSPECTION COMPLETE!');
    console.log('📊 Found price elements:', actualData.priceTexts.length);
    console.log('🔗 Found links:', actualData.allLinks.length);
    console.log('📦 Potential containers:', actualData.potentialContainers.length);
    console.log('\n📁 Files saved:');
    console.log('   📊 final-flippa-inspection.json');
    console.log('   📸 final-flippa-screenshot.png');
    
    if (actualData.potentialContainers.length > 0) {
      console.log('\n🎯 BEST CONTAINER CANDIDATES:');
      actualData.potentialContainers
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .forEach((container, i) => {
          const priceCount = container.samples.filter(s => s.hasPrice).length;
          const linkCount = container.samples.filter(s => s.hasLink).length;
          console.log(`   ${i + 1}. ${container.selector} (${container.count} elements)`);
          console.log(`      - With prices: ${priceCount}/${container.samples.length}`);
          console.log(`      - With links: ${linkCount}/${container.samples.length}`);
        });
    }
    
  } catch (error) {
    console.error('❌ Inspection failed:', error);
  } finally {
    await browser.close();
  }
}

finalFlippaInspection();