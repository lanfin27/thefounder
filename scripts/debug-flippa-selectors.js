// Debug script to understand Flippa's current structure
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function debugFlippa() {
  console.log('🔍 Debugging Flippa Selectors');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 100
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
    
    await page.waitForTimeout(7000);
    console.log('✅ Page loaded');
    
    // Debug all links
    const debugInfo = await page.evaluate(() => {
      const info = {
        allLinks: [],
        numericLinks: [],
        listingContainers: [],
        pricePatterns: []
      };
      
      // Get all links
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        const href = link.href;
        if (href.includes('flippa.com')) {
          info.allLinks.push({
            href: href,
            text: link.textContent?.trim().substring(0, 50)
          });
          
          // Check for numeric pattern
          if (href.match(/flippa\.com\/\d+/)) {
            info.numericLinks.push({
              href: href,
              text: link.textContent?.trim(),
              parent: link.parentElement?.tagName,
              parentClass: link.parentElement?.className
            });
          }
        }
      });
      
      // Find potential listing containers
      const allDivs = document.querySelectorAll('div');
      allDivs.forEach(div => {
        const text = div.textContent || '';
        if (text.includes('$') && text.includes('SaaS') && div.querySelectorAll('a').length > 0) {
          const links = Array.from(div.querySelectorAll('a')).map(a => ({
            href: a.href,
            text: a.textContent?.trim()
          }));
          
          info.listingContainers.push({
            class: div.className,
            id: div.id,
            linksCount: links.length,
            sampleLinks: links.slice(0, 3),
            textPreview: text.substring(0, 200).replace(/\s+/g, ' ')
          });
        }
      });
      
      // Check different price patterns
      const pricePatterns = [
        /USD\s*\$[\d,]+/,
        /AUD\s*\$[\d,]+/,
        /\$[\d,]+\s*USD/,
        /\$[\d,]+/
      ];
      
      pricePatterns.forEach((pattern, index) => {
        const matches = Array.from(document.querySelectorAll('*')).filter(el => {
          return el.textContent?.match(pattern) && el.children.length === 0;
        });
        
        info.pricePatterns.push({
          pattern: pattern.toString(),
          count: matches.length,
          samples: matches.slice(0, 3).map(el => ({
            text: el.textContent?.trim(),
            tag: el.tagName,
            parent: el.parentElement?.tagName
          }))
        });
      });
      
      return info;
    });
    
    console.log('\n📊 Debug Results:');
    console.log(`Total links: ${debugInfo.allLinks.length}`);
    console.log(`Numeric pattern links: ${debugInfo.numericLinks.length}`);
    console.log(`Potential listing containers: ${debugInfo.listingContainers.length}`);
    
    if (debugInfo.numericLinks.length > 0) {
      console.log('\n🔗 Numeric Links Found:');
      debugInfo.numericLinks.slice(0, 10).forEach(link => {
        console.log(`- ${link.href}`);
        console.log(`  Text: "${link.text}"`);
        console.log(`  Parent: <${link.parent} class="${link.parentClass}">`);
      });
    }
    
    if (debugInfo.listingContainers.length > 0) {
      console.log('\n📦 Listing Containers:');
      debugInfo.listingContainers.slice(0, 5).forEach((container, i) => {
        console.log(`\n${i + 1}. Container:`);
        console.log(`   Class: ${container.class}`);
        console.log(`   Links: ${container.linksCount}`);
        console.log(`   Text preview: ${container.textPreview}`);
        if (container.sampleLinks.length > 0) {
          console.log('   Links:');
          container.sampleLinks.forEach(link => {
            console.log(`     - ${link.href}`);
          });
        }
      });
    }
    
    console.log('\n💰 Price Patterns:');
    debugInfo.pricePatterns.forEach(pattern => {
      console.log(`\nPattern: ${pattern.pattern}`);
      console.log(`Matches: ${pattern.count}`);
      if (pattern.samples.length > 0) {
        console.log('Samples:');
        pattern.samples.forEach(sample => {
          console.log(`  - "${sample.text}" in <${sample.tag}> (parent: ${sample.parent})`);
        });
      }
    });
    
    // Save debug info
    require('fs').writeFileSync('flippa-debug-info.json', JSON.stringify(debugInfo, null, 2));
    console.log('\n📄 Full debug info saved to flippa-debug-info.json');
    
    console.log('\n⏸️ Browser will remain open for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugFlippa().catch(console.error);