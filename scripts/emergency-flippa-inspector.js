// scripts/emergency-flippa-inspector.js
const puppeteer = require('puppeteer');
const fs = require('fs');

async function emergencyFlippaInspection() {
  console.log('🚨 EMERGENCY FLIPPA HTML INSPECTION');
  console.log('🎯 Goal: Find ACTUAL working selectors');
  
  const browser = await puppeteer.launch({ 
    headless: false, // MUST be visual to see actual page
    devtools: true,
    slowMo: 2000,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('🌐 Loading Flippa search page...');
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('⏱️ Waiting for complete page load...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Take screenshot first
    await page.screenshot({ path: 'flippa-actual-page.png', fullPage: true });
    console.log('📸 Screenshot saved: flippa-actual-page.png');
    
    // Extract REAL HTML structure
    const realStructure = await page.evaluate(() => {
      console.log('🔍 Starting real structure analysis...');
      
      const analysis = {
        url: window.location.href,
        title: document.title,
        totalElements: document.querySelectorAll('*').length,
        scripts: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean),
        frameworks: [],
        listingContainers: [],
        allTextContent: document.body.textContent || '',
        actualListings: []
      };
      
      // Detect frameworks
      if (window.angular) analysis.frameworks.push('AngularJS');
      if (window.ng) analysis.frameworks.push('Angular');
      if (window.React) analysis.frameworks.push('React');
      if (window.Vue) analysis.frameworks.push('Vue');
      if (window.jQuery || window.$) analysis.frameworks.push('jQuery');
      
      // Find elements that contain dollar amounts (likely listings)
      const elementsWithPrices = [];
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent || '';
        if (/\$[\d,]+/.test(text) && text.length < 200) {
          elementsWithPrices.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            text: text.trim(),
            innerHTML: el.innerHTML.slice(0, 300),
            parent: {
              tagName: el.parentElement?.tagName,
              className: el.parentElement?.className,
              id: el.parentElement?.id
            }
          });
        }
      });
      
      analysis.elementsWithPrices = elementsWithPrices.slice(0, 20);
      
      // Find all links that might be listings
      const listingLinks = [];
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.href;
        if (href.includes('flippa.com') || /\/\d+/.test(href) || href.includes('listing')) {
          listingLinks.push({
            href: href,
            text: link.textContent?.trim(),
            className: link.className,
            id: link.id,
            parent: {
              tagName: link.parentElement?.tagName,
              className: link.parentElement?.className
            }
          });
        }
      });
      
      analysis.listingLinks = listingLinks.slice(0, 20);
      
      // Try to find repeated structures (likely listing containers)
      const allDivs = document.querySelectorAll('div');
      const classNameCounts = {};
      
      allDivs.forEach(div => {
        if (div.className) {
          const classes = div.className.split(' ');
          classes.forEach(cls => {
            if (cls.length > 3) {
              classNameCounts[cls] = (classNameCounts[cls] || 0) + 1;
            }
          });
        }
      });
      
      // Find classes that appear multiple times (likely listing containers)
      const repeatedClasses = Object.entries(classNameCounts)
        .filter(([cls, count]) => count >= 10 && count <= 50)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      analysis.repeatedClasses = repeatedClasses;
      
      // Try to extract actual listing data from the first few potential containers
      repeatedClasses.slice(0, 3).forEach(([className, count]) => {
        const elements = document.querySelectorAll(`.${className}`);
        const samples = Array.from(elements).slice(0, 5).map(el => ({
          className: className,
          text: el.textContent?.slice(0, 200),
          innerHTML: el.innerHTML.slice(0, 400),
          children: el.children.length,
          hasPrice: /\$[\d,]+/.test(el.textContent || ''),
          hasLink: !!el.querySelector('a[href]')
        }));
        
        if (samples.length > 0) {
          analysis.actualListings.push({
            containerClass: className,
            count: count,
            samples: samples
          });
        }
      });
      
      return analysis;
    });
    
    // Save complete analysis
    fs.writeFileSync('emergency-flippa-analysis.json', JSON.stringify(realStructure, null, 2));
    
    // Save raw HTML
    const html = await page.content();
    fs.writeFileSync('emergency-flippa-raw.html', html);
    
    console.log('\n🔍 EMERGENCY ANALYSIS RESULTS:');
    console.log('================================');
    console.log(`📄 Page: ${realStructure.url}`);
    console.log(`🔧 Frameworks: ${realStructure.frameworks.join(', ') || 'None detected'}`);
    console.log(`💰 Price Elements: ${realStructure.elementsWithPrices?.length || 0}`);
    console.log(`🔗 Listing Links: ${realStructure.listingLinks?.length || 0}`);
    console.log(`📦 Repeated Classes: ${realStructure.repeatedClasses?.length || 0}`);
    console.log(`🎯 Potential Listings: ${realStructure.actualListings?.length || 0}`);
    
    if (realStructure.repeatedClasses && realStructure.repeatedClasses.length > 0) {
      console.log('\n🎯 TOP CONTAINER CANDIDATES:');
      realStructure.repeatedClasses.slice(0, 5).forEach(([cls, count], i) => {
        console.log(`   ${i + 1}. .${cls} (${count} elements)`);
      });
    }
    
    if (realStructure.actualListings && realStructure.actualListings.length > 0) {
      console.log('\n📋 ACTUAL LISTING STRUCTURES:');
      realStructure.actualListings.forEach((listing, i) => {
        console.log(`   ${i + 1}. .${listing.containerClass} (${listing.count} containers)`);
        console.log(`      - Has prices: ${listing.samples.filter(s => s.hasPrice).length}/${listing.samples.length}`);
        console.log(`      - Has links: ${listing.samples.filter(s => s.hasLink).length}/${listing.samples.length}`);
      });
    }
    
    console.log('\n💾 FILES CREATED:');
    console.log('   📊 emergency-flippa-analysis.json (analysis results)');
    console.log('   📄 emergency-flippa-raw.html (raw HTML)');
    console.log('   📸 flippa-actual-page.png (screenshot)');
    
    console.log('\n⏳ Browser will stay open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Emergency inspection failed:', error);
  } finally {
    await browser.close();
  }
}

emergencyFlippaInspection();