/**
 * Live Flippa HTML Structure Inspector
 * Analyzes current HTML to find exact selectors for 100% extraction
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class LiveFlippaInspector {
  constructor() {
    this.htmlAnalysis = {};
    this.selectorFindings = {};
  }

  async executeCompleteInspection() {
    console.log('🔍 LIVE FLIPPA HTML STRUCTURE ANALYSIS');
    console.log('🎯 Goal: Find exact selectors for 100% extraction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const browser = await puppeteer.launch({ 
      headless: false, // Visual mode for manual inspection
      devtools: true,
      args: ['--start-maximized']
    });
    
    try {
      await this.inspectSearchPage(browser);
      await this.inspectIndividualListing(browser);
      await this.generateSelectorMapping();
      
    } catch (error) {
      console.error('❌ Inspection failed:', error);
    } finally {
      console.log('\n⏳ Browser will close in 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await browser.close();
    }
  }

  async inspectSearchPage(browser) {
    console.log('\n📄 STEP 1: Search Page HTML Analysis');
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('⏳ Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Extract complete HTML structure
    const analysis = await page.evaluate(() => {
      const results = {
        pageTitle: document.title,
        totalElements: document.querySelectorAll('*').length,
        potentialListingContainers: [],
        titleElements: [],
        priceElements: [],
        linkElements: [],
        allClasses: new Set(),
        allIds: new Set(),
        dataAttributes: new Set()
      };
      
      // Collect all classes, IDs, and data attributes
      document.querySelectorAll('*').forEach(el => {
        el.classList.forEach(cls => results.allClasses.add(cls));
        if (el.id) results.allIds.add(el.id);
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-')) {
            results.dataAttributes.add(attr.name);
          }
        });
      });
      
      // Find potential listing containers
      const containerPatterns = [
        'div', 'article', 'section', 'li', 'tr', 'a'
      ];
      
      containerPatterns.forEach(tag => {
        const elements = document.querySelectorAll(tag);
        elements.forEach((el, index) => {
          const text = el.textContent || '';
          const hasPrice = /\$[\d,]+/.test(text);
          const hasLink = el.querySelector('a[href*="flippa.com"]') || el.querySelector('a[href*="/"]');
          const hasMultipleWords = text.split(' ').length > 5;
          
          if ((hasPrice || hasLink) && hasMultipleWords && text.length > 20 && text.length < 2000) {
            results.potentialListingContainers.push({
              tag: el.tagName.toLowerCase(),
              classes: Array.from(el.classList),
              id: el.id,
              textSample: text.slice(0, 150).replace(/\s+/g, ' '),
              hasPrice,
              hasLink: !!hasLink,
              childrenCount: el.children.length,
              dataAttrs: Array.from(el.attributes)
                .filter(attr => attr.name.startsWith('data-'))
                .map(attr => ({ name: attr.name, value: attr.value })),
              href: el.href || (hasLink && hasLink.href) || null
            });
          }
        });
      });
      
      // Find elements with price patterns
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent || '';
        if (/\$[\d,]+/.test(text) && text.length < 50 && el.children.length === 0) {
          results.priceElements.push({
            tag: el.tagName.toLowerCase(),
            classes: Array.from(el.classList),
            id: el.id,
            text: text.trim(),
            dataAttrs: Array.from(el.attributes)
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => ({ name: attr.name, value: attr.value }))
          });
        }
      });
      
      // Find all links
      document.querySelectorAll('a[href]').forEach(el => {
        const href = el.href;
        if (href.includes('flippa.com') || href.includes('/listings/') || /\/\d+$/.test(href) || /\d+-[\w-]+$/.test(href)) {
          results.linkElements.push({
            tag: el.tagName.toLowerCase(),
            classes: Array.from(el.classList),
            id: el.id,
            href: href,
            text: el.textContent?.slice(0, 100).replace(/\s+/g, ' '),
            dataAttrs: Array.from(el.attributes)
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => ({ name: attr.name, value: attr.value })),
            parent: {
              tag: el.parentElement?.tagName.toLowerCase(),
              classes: Array.from(el.parentElement?.classList || [])
            }
          });
        }
      });
      
      // Find potential title elements
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'p', 'strong'].forEach(tag => {
        document.querySelectorAll(tag).forEach(el => {
          const text = el.textContent || '';
          if (text.length > 10 && text.length < 200 && !text.includes('$') && el.children.length <= 2) {
            const words = text.split(' ').length;
            if (words >= 3 && words <= 20) {
              results.titleElements.push({
                tag: el.tagName.toLowerCase(),
                classes: Array.from(el.classList),
                id: el.id,
                text: text.trim().replace(/\s+/g, ' '),
                wordCount: words,
                dataAttrs: Array.from(el.attributes)
                  .filter(attr => attr.name.startsWith('data-'))
                  .map(attr => ({ name: attr.name, value: attr.value })),
                parent: {
                  tag: el.parentElement?.tagName.toLowerCase(),
                  classes: Array.from(el.parentElement?.classList || [])
                }
              });
            }
          }
        });
      });
      
      // Convert Sets to Arrays for JSON serialization
      results.allClasses = Array.from(results.allClasses);
      results.allIds = Array.from(results.allIds);
      results.dataAttributes = Array.from(results.dataAttributes);
      
      return results;
    });
    
    this.htmlAnalysis.searchPage = analysis;
    
    console.log('📊 SEARCH PAGE ANALYSIS RESULTS:');
    console.log(`   🏷️ Total Elements: ${analysis.totalElements}`);
    console.log(`   📦 Potential Containers: ${analysis.potentialListingContainers.length}`);
    console.log(`   💰 Price Elements: ${analysis.priceElements.length}`);
    console.log(`   🔗 Link Elements: ${analysis.linkElements.length}`);
    console.log(`   📝 Title Elements: ${analysis.titleElements.length}`);
    console.log(`   🎨 Classes Found: ${analysis.allClasses.length}`);
    console.log(`   🆔 IDs Found: ${analysis.allIds.length}`);
    console.log(`   📊 Data Attributes: ${analysis.dataAttributes.length}`);
    
    // Log some examples
    if (analysis.linkElements.length > 0) {
      console.log('\n🔗 Sample Links Found:');
      analysis.linkElements.slice(0, 3).forEach(link => {
        console.log(`   - ${link.href}`);
        console.log(`     Classes: ${link.classes.join(', ') || 'none'}`);
      });
    }
    
    if (analysis.potentialListingContainers.length > 0) {
      console.log('\n📦 Sample Containers:');
      analysis.potentialListingContainers.slice(0, 3).forEach(container => {
        console.log(`   - <${container.tag}> with ${container.childrenCount} children`);
        console.log(`     Classes: ${container.classes.join(', ') || 'none'}`);
        if (container.href) console.log(`     Link: ${container.href}`);
      });
    }
    
    // Save detailed HTML for manual inspection
    const html = await page.content();
    await fs.writeFile('data/flippa-search-page.html', html);
    console.log('\n💾 Full HTML saved: data/flippa-search-page.html');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'data/flippa-search-screenshot.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved: data/flippa-search-screenshot.png');
    
    await page.close();
  }

  async inspectIndividualListing(browser) {
    console.log('\n📄 STEP 2: Individual Listing Page Analysis');
    
    // First, try to find a listing URL from the search page
    const page = await browser.newPage();
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'networkidle2'
    });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const listingUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]');
      for (let link of links) {
        const href = link.href;
        // Look for listing patterns
        if (href.includes('flippa.com') && 
            (href.includes('/listings/') || /\/\d+$/.test(href) || /\d+-[\w-]+$/.test(href))) {
          return href;
        }
      }
      return null;
    });
    
    if (listingUrl) {
      console.log(`🔍 Analyzing individual listing: ${listingUrl}`);
      
      try {
        await page.goto(listingUrl, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const listingAnalysis = await page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            h1Elements: Array.from(document.querySelectorAll('h1')).map(el => ({
              text: el.textContent?.trim(),
              classes: Array.from(el.classList),
              id: el.id
            })),
            priceElements: Array.from(document.querySelectorAll('*')).filter(el => {
              return /\$[\d,]+/.test(el.textContent || '') && el.children.length === 0;
            }).map(el => ({
              tag: el.tagName.toLowerCase(),
              text: el.textContent?.trim(),
              classes: Array.from(el.classList),
              id: el.id
            })).slice(0, 10),
            metaElements: Array.from(document.querySelectorAll('*')).filter(el => {
              const text = el.textContent || '';
              return (text.includes('Revenue') || text.includes('Profit') || 
                      text.includes('Multiple') || text.includes('/mo')) && 
                     text.length < 100;
            }).map(el => ({
              tag: el.tagName.toLowerCase(),
              text: el.textContent?.trim(),
              classes: Array.from(el.classList),
              id: el.id
            })).slice(0, 10)
          };
        });
        
        this.htmlAnalysis.listingPage = listingAnalysis;
        console.log('✅ Individual listing analysis complete');
        
        // Save listing page HTML
        const listingHtml = await page.content();
        await fs.writeFile('data/flippa-listing-page.html', listingHtml);
        console.log('💾 Listing HTML saved: data/flippa-listing-page.html');
        
      } catch (error) {
        console.log('⚠️ Could not analyze individual listing:', error.message);
      }
    } else {
      console.log('⚠️ No individual listing URL found');
    }
    
    await page.close();
  }

  async generateSelectorMapping() {
    console.log('\n🧠 STEP 3: Generate Modern Selector Mapping');
    
    const mapping = {
      timestamp: new Date().toISOString(),
      analysis: this.htmlAnalysis,
      recommendedSelectors: {},
      urgentUpdates: [],
      detectedPatterns: {}
    };
    
    // Analyze potential containers
    if (this.htmlAnalysis.searchPage?.potentialListingContainers) {
      const containers = this.htmlAnalysis.searchPage.potentialListingContainers;
      
      // Find most common container pattern
      const containerClassCounts = {};
      const containerTagCounts = {};
      
      containers.forEach(container => {
        containerTagCounts[container.tag] = (containerTagCounts[container.tag] || 0) + 1;
        
        container.classes.forEach(cls => {
          containerClassCounts[cls] = (containerClassCounts[cls] || 0) + 1;
        });
      });
      
      // Find best container selector
      const topContainerClass = Object.entries(containerClassCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      const topContainerTag = Object.entries(containerTagCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (topContainerClass) {
        mapping.recommendedSelectors.listingContainer = `.${topContainerClass[0]}`;
        mapping.urgentUpdates.push(`Primary container selector: .${topContainerClass[0]}`);
      } else if (topContainerTag) {
        mapping.recommendedSelectors.listingContainer = topContainerTag[0];
        mapping.urgentUpdates.push(`Primary container selector: ${topContainerTag[0]}`);
      }
      
      // Add fallback container selectors
      mapping.recommendedSelectors.containerFallbacks = [
        ...new Set(containers.map(c => c.tag)),
        ...new Set(containers.flatMap(c => c.classes).filter(cls => cls).map(cls => `.${cls}`))
      ].slice(0, 10);
    }
    
    // Analyze price elements
    if (this.htmlAnalysis.searchPage?.priceElements) {
      const priceElements = this.htmlAnalysis.searchPage.priceElements;
      const priceClassCounts = {};
      
      priceElements.forEach(el => {
        el.classes.forEach(cls => {
          priceClassCounts[cls] = (priceClassCounts[cls] || 0) + 1;
        });
      });
      
      const topPriceClasses = Object.entries(priceClassCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      if (topPriceClasses.length > 0) {
        mapping.recommendedSelectors.price = topPriceClasses.map(([cls]) => `.${cls}`);
        mapping.urgentUpdates.push(`Price selectors: ${topPriceClasses.map(([cls]) => `.${cls}`).join(', ')}`);
      }
    }
    
    // Analyze link elements
    if (this.htmlAnalysis.searchPage?.linkElements) {
      const linkElements = this.htmlAnalysis.searchPage.linkElements;
      const linkPatterns = {};
      const linkClasses = {};
      
      linkElements.forEach(el => {
        // Analyze URL patterns
        if (el.href.includes('/listings/')) {
          linkPatterns['listings'] = (linkPatterns['listings'] || 0) + 1;
        } else if (/\/\d+$/.test(el.href)) {
          linkPatterns['numeric'] = (linkPatterns['numeric'] || 0) + 1;
        } else if (/\d+-[\w-]+$/.test(el.href)) {
          linkPatterns['slug'] = (linkPatterns['slug'] || 0) + 1;
        }
        
        el.classes.forEach(cls => {
          linkClasses[cls] = (linkClasses[cls] || 0) + 1;
        });
      });
      
      const topLinkClasses = Object.entries(linkClasses)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      if (topLinkClasses.length > 0) {
        mapping.recommendedSelectors.listingLink = topLinkClasses.map(([cls]) => `a.${cls}`);
        mapping.urgentUpdates.push(`Link selectors: ${topLinkClasses.map(([cls]) => `a.${cls}`).join(', ')}`);
      }
      
      mapping.detectedPatterns.urlPatterns = linkPatterns;
    }
    
    // Analyze title elements
    if (this.htmlAnalysis.searchPage?.titleElements) {
      const titleElements = this.htmlAnalysis.searchPage.titleElements;
      const titleClassCounts = {};
      const titleTagCounts = {};
      
      titleElements.forEach(el => {
        titleTagCounts[el.tag] = (titleTagCounts[el.tag] || 0) + 1;
        
        el.classes.forEach(cls => {
          titleClassCounts[cls] = (titleClassCounts[cls] || 0) + 1;
        });
      });
      
      const topTitleClasses = Object.entries(titleClassCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      const topTitleTags = Object.entries(titleTagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      if (topTitleClasses.length > 0) {
        mapping.recommendedSelectors.title = [
          ...topTitleClasses.map(([cls]) => `.${cls}`),
          ...topTitleTags.map(([tag]) => tag)
        ];
        mapping.urgentUpdates.push(`Title selectors: ${topTitleClasses.map(([cls]) => `.${cls}`).join(', ')}`);
      }
    }
    
    // Save analysis and recommendations
    await fs.writeFile('data/flippa-selector-analysis.json', JSON.stringify(mapping, null, 2));
    
    console.log('\n🎯 SELECTOR MAPPING GENERATED:');
    console.log('════════════════════════════════════════════');
    
    if (Object.keys(mapping.recommendedSelectors).length > 0) {
      console.log('\n📋 RECOMMENDED SELECTOR UPDATES:');
      Object.entries(mapping.recommendedSelectors).forEach(([field, selector]) => {
        if (Array.isArray(selector)) {
          console.log(`   ${field}: ${selector.slice(0, 3).join(', ')}`);
        } else {
          console.log(`   ${field}: ${selector}`);
        }
      });
    }
    
    if (mapping.detectedPatterns.urlPatterns) {
      console.log('\n🔗 URL PATTERNS DETECTED:');
      Object.entries(mapping.detectedPatterns.urlPatterns).forEach(([pattern, count]) => {
        console.log(`   ${pattern}: ${count} occurrences`);
      });
    }
    
    console.log('\n🚨 URGENT UPDATES NEEDED:');
    mapping.urgentUpdates.forEach((update, index) => {
      console.log(`   ${index + 1}. ${update}`);
    });
    
    console.log('\n💾 Complete analysis saved to: data/flippa-selector-analysis.json');
    console.log('🔍 Manual HTML files:');
    console.log('   - data/flippa-search-page.html');
    console.log('   - data/flippa-listing-page.html (if available)');
    console.log('📸 Visual reference: data/flippa-search-screenshot.png');
    
    return mapping;
  }
}

// Execute live inspection
async function main() {
  console.log('🚀 STARTING LIVE FLIPPA HTML INSPECTION');
  console.log('🎯 Goal: Fix 0% title/URL extraction → 100% extraction');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const inspector = new LiveFlippaInspector();
  await inspector.executeCompleteInspection();
  
  console.log('\n✅ INSPECTION COMPLETE!');
  console.log('📋 Next: Use the generated selectors to update the extraction system');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LiveFlippaInspector };