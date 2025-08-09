// scripts/headless-flippa-analyzer.js
const puppeteer = require('puppeteer');
const fs = require('fs');

async function analyzeFlippaStructure() {
  console.log('🔍 HEADLESS FLIPPA STRUCTURE ANALYZER');
  console.log('📋 Analyzing page structure without opening browser');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Loading Flippa...');
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Analyze page structure
    const analysis = await page.evaluate(() => {
      const results = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        priceElements: [],
        containerAnalysis: [],
        domStructure: {}
      };
      
      // Find all elements with prices
      const priceRegex = /\$[\d,]+/;
      const allElements = document.querySelectorAll('*');
      const priceElementsMap = new Map();
      
      allElements.forEach(el => {
        const text = el.textContent || '';
        if (priceRegex.test(text) && text.length < 500) {
          // Find the container
          let container = el;
          let level = 0;
          while (container.parentElement && level < 5) {
            container = container.parentElement;
            level++;
          }
          
          // Get container info
          const containerKey = `${container.tagName}.${container.className}`;
          if (!priceElementsMap.has(containerKey)) {
            priceElementsMap.set(containerKey, {
              tagName: container.tagName,
              className: container.className,
              count: 0,
              samples: []
            });
          }
          
          const containerInfo = priceElementsMap.get(containerKey);
          containerInfo.count++;
          if (containerInfo.samples.length < 3) {
            containerInfo.samples.push({
              text: container.textContent?.slice(0, 300),
              html: container.outerHTML?.slice(0, 500),
              hasLinks: container.querySelectorAll('a').length,
              childCount: container.children.length
            });
          }
        }
      });
      
      // Convert map to array and sort by count
      results.containerAnalysis = Array.from(priceElementsMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Try specific selectors
      const selectors = [
        'div[ng-repeat]',
        'div[class*="listing"]',
        'div[class*="card"]',
        'article',
        'li[class*="item"]',
        'div[class*="result"]'
      ];
      
      results.domStructure.selectorResults = {};
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            results.domStructure.selectorResults[selector] = {
              count: elements.length,
              sample: elements[0] ? {
                className: elements[0].className,
                hasPrice: priceRegex.test(elements[0].textContent || ''),
                textLength: elements[0].textContent?.length || 0
              } : null
            };
          }
        } catch (e) {
          // Invalid selector
        }
      });
      
      return results;
    });
    
    // Save analysis
    fs.writeFileSync('flippa-structure-analysis.json', JSON.stringify(analysis, null, 2));
    
    console.log('\n📊 STRUCTURE ANALYSIS COMPLETE!');
    console.log('Found container patterns:', analysis.containerAnalysis.length);
    
    if (analysis.containerAnalysis.length > 0) {
      console.log('\n🎯 TOP CONTAINER PATTERNS:');
      analysis.containerAnalysis.slice(0, 5).forEach((container, i) => {
        console.log(`${i + 1}. ${container.tagName}.${container.className || '(no-class)'}`);
        console.log(`   - Count: ${container.count}`);
        console.log(`   - Avg links: ${container.samples.reduce((sum, s) => sum + s.hasLinks, 0) / container.samples.length}`);
        console.log(`   - Avg children: ${container.samples.reduce((sum, s) => sum + s.childCount, 0) / container.samples.length}`);
      });
    }
    
    console.log('\n📁 Analysis saved to: flippa-structure-analysis.json');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeFlippaStructure();