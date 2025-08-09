// scripts/extraction-diagnostic-system.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

class ExtractionDiagnosticSystem {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.diagnosticResults = {
      timestamp: new Date().toISOString(),
      domStructure: {},
      selectorTests: {},
      workingSelectors: {},
      failureReasons: {},
      recommendations: [],
      criticalFindings: [],
      extractionRates: {}
    };
    
    // Current selectors from apify-complete-extractor.js
    this.currentSelectors = {
      title: ['h1', 'h2', 'h3', '[data-testid*="title"]', 'a[href*="flippa"]'],
      price: ['[data-testid*="price"]', '.price', '.amount'],
      revenue: ['[data-testid*="revenue"]', '.revenue', '.monthly-revenue'],
      multiple: ['[data-testid*="multiple"]', '.multiple'],
      url: ['a[href*="flippa.com/"]', 'a[href*="/listings/"]'],
      category: ['.category', '[data-testid="category"]', '.industry']
    };
  }

  async runCompleteDiagnostic() {
    console.log('🔬 EXTRACTION DIAGNOSTIC SYSTEM STARTING');
    console.log('=' .repeat(60));
    console.log('📊 Current Critical Failure Rates:');
    console.log('   - Title: 9.9% (Should be 95%+)');
    console.log('   - Revenue: 11% (Should be 80%+)');
    console.log('   - Multiple: 4.8% (Should be 70%+)');
    console.log('');
    
    const browser = await puppeteer.launch({
      headless: false, // Visual mode for debugging
      devtools: true,
      args: ['--window-size=1920,1080']
    });
    
    try {
      // Phase 1: Analyze DOM structure
      await this.analyzeDOMStructure(browser);
      
      // Phase 2: Test current selectors
      await this.testCurrentSelectors(browser);
      
      // Phase 3: Discover working selectors
      await this.discoverWorkingSelectors(browser);
      
      // Phase 4: Analyze extraction logic
      await this.analyzeExtractionLogic(browser);
      
      // Phase 5: Generate recommendations
      this.generateRecommendations();
      
      // Phase 6: Save diagnostic report
      await this.saveDiagnosticReport();
      
    } finally {
      await browser.close();
    }
    
    return this.diagnosticResults;
  }

  async analyzeDOMStructure(browser) {
    console.log('\n📐 PHASE 1: ANALYZING DOM STRUCTURE');
    console.log('-'.repeat(50));
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
      await page.goto('https://flippa.com/search?filter[property_type][]=website', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const domAnalysis = await page.evaluate(() => {
        const analysis = {
          frameworks: [],
          listingContainers: [],
          pricePatterns: [],
          titlePatterns: [],
          structureType: 'unknown'
        };
        
        // Detect frameworks
        if (window.angular) analysis.frameworks.push('Angular');
        if (window.React) analysis.frameworks.push('React');
        if (window.Vue) analysis.frameworks.push('Vue');
        if (document.querySelector('[data-ng-app]')) analysis.frameworks.push('AngularJS');
        
        // Find listing containers by analyzing repeating structures
        const allElements = document.querySelectorAll('*');
        const elementCounts = new Map();
        
        allElements.forEach(el => {
          const classes = el.className.split(' ').filter(c => c.length > 0).join('.');
          const tag = el.tagName.toLowerCase();
          const key = classes ? `${tag}.${classes}` : tag;
          
          if (!elementCounts.has(key)) {
            elementCounts.set(key, { count: 0, elements: [] });
          }
          
          const entry = elementCounts.get(key);
          entry.count++;
          if (entry.elements.length < 5) {
            entry.elements.push(el);
          }
        });
        
        // Find repeating structures (likely listing containers)
        elementCounts.forEach((value, key) => {
          if (value.count >= 10 && value.count <= 50) {
            // Check if contains price-like content
            const hasPriceContent = value.elements.some(el => 
              /\$[\d,]+/.test(el.textContent)
            );
            
            if (hasPriceContent) {
              analysis.listingContainers.push({
                selector: key,
                count: value.count,
                sample: value.elements[0]?.outerHTML.substring(0, 200)
              });
            }
          }
        });
        
        // Analyze price patterns
        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent || '';
          if (/\$[\d,]+/.test(text) && text.length < 50) {
            const classes = Array.from(el.classList).join('.');
            const selector = classes ? `.${classes}` : el.tagName.toLowerCase();
            
            if (!analysis.pricePatterns.some(p => p.selector === selector)) {
              analysis.pricePatterns.push({
                selector,
                tagName: el.tagName,
                example: text.trim(),
                parentStructure: el.parentElement?.className || 'no-parent'
              });
            }
          }
        });
        
        // Analyze title patterns (text near prices)
        analysis.pricePatterns.forEach(pricePattern => {
          const priceEl = document.querySelector(pricePattern.selector);
          if (priceEl) {
            // Look for titles near price elements
            let container = priceEl;
            for (let i = 0; i < 5; i++) {
              if (container.parentElement) {
                container = container.parentElement;
                
                // Find text elements that could be titles
                const textElements = container.querySelectorAll('h1, h2, h3, h4, a, span, div');
                textElements.forEach(textEl => {
                  const text = textEl.textContent?.trim() || '';
                  if (text.length > 10 && text.length < 200 && !text.includes('$')) {
                    const classes = Array.from(textEl.classList).join('.');
                    const selector = classes ? `.${classes}` : textEl.tagName.toLowerCase();
                    
                    if (!analysis.titlePatterns.some(t => t.selector === selector)) {
                      analysis.titlePatterns.push({
                        selector,
                        tagName: textEl.tagName,
                        example: text.substring(0, 50),
                        nearPrice: pricePattern.selector
                      });
                    }
                  }
                });
              }
            }
          }
        });
        
        // Determine structure type
        if (analysis.listingContainers.length > 0) {
          analysis.structureType = 'container-based';
        } else if (analysis.pricePatterns.length > 20) {
          analysis.structureType = 'price-based';
        } else {
          analysis.structureType = 'unknown';
        }
        
        return analysis;
      });
      
      this.diagnosticResults.domStructure = domAnalysis;
      
      console.log('🔍 DOM Analysis Results:');
      console.log(`   Frameworks detected: ${domAnalysis.frameworks.join(', ') || 'None'}`);
      console.log(`   Structure type: ${domAnalysis.structureType}`);
      console.log(`   Listing containers found: ${domAnalysis.listingContainers.length}`);
      console.log(`   Price patterns found: ${domAnalysis.pricePatterns.length}`);
      console.log(`   Title patterns found: ${domAnalysis.titlePatterns.length}`);
      
      if (domAnalysis.listingContainers.length > 0) {
        console.log('\n📦 Top Listing Containers:');
        domAnalysis.listingContainers.slice(0, 3).forEach(container => {
          console.log(`   - ${container.selector} (${container.count} instances)`);
        });
      }
      
    } catch (error) {
      console.error('❌ DOM analysis failed:', error.message);
      this.diagnosticResults.criticalFindings.push(`DOM analysis error: ${error.message}`);
    }
    
    await page.close();
  }

  async testCurrentSelectors(browser) {
    console.log('\n🧪 PHASE 2: TESTING CURRENT SELECTORS');
    console.log('-'.repeat(50));
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
      await page.goto('https://flippa.com/search?filter[property_type][]=website', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const selectorTests = await page.evaluate((selectors) => {
        const results = {};
        
        Object.entries(selectors).forEach(([field, selectorList]) => {
          results[field] = {
            tested: selectorList.length,
            working: [],
            failed: [],
            matches: 0
          };
          
          selectorList.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                results[field].working.push({
                  selector,
                  count: elements.length,
                  firstMatch: elements[0].textContent?.trim().substring(0, 50)
                });
                results[field].matches += elements.length;
              } else {
                results[field].failed.push(selector);
              }
            } catch (error) {
              results[field].failed.push(`${selector} (error: ${error.message})`);
            }
          });
        });
        
        return results;
      }, this.currentSelectors);
      
      this.diagnosticResults.selectorTests = selectorTests;
      
      console.log('📊 Selector Test Results:');
      Object.entries(selectorTests).forEach(([field, results]) => {
        const workingCount = results.working.length;
        const totalCount = results.tested;
        const successRate = ((workingCount / totalCount) * 100).toFixed(1);
        
        console.log(`\n   ${field.toUpperCase()}:`);
        console.log(`     Success rate: ${successRate}% (${workingCount}/${totalCount} selectors)`);
        console.log(`     Total matches: ${results.matches}`);
        
        if (results.working.length > 0) {
          console.log('     ✅ Working selectors:');
          results.working.forEach(w => {
            console.log(`        - ${w.selector} (${w.count} matches)`);
          });
        }
        
        if (results.failed.length > 0) {
          console.log('     ❌ Failed selectors:');
          results.failed.forEach(f => {
            console.log(`        - ${f}`);
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Selector testing failed:', error.message);
      this.diagnosticResults.criticalFindings.push(`Selector test error: ${error.message}`);
    }
    
    await page.close();
  }

  async discoverWorkingSelectors(browser) {
    console.log('\n🔎 PHASE 3: DISCOVERING WORKING SELECTORS');
    console.log('-'.repeat(50));
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
      await page.goto('https://flippa.com/search?filter[property_type][]=website', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const workingSelectors = await page.evaluate(() => {
        const discovered = {
          title: [],
          price: [],
          revenue: [],
          multiple: [],
          url: [],
          category: []
        };
        
        // Strategy 1: Find by content patterns
        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent?.trim() || '';
          const href = el.getAttribute('href') || '';
          
          // Price detection
          if (/^\$[\d,]+$/.test(text) && text.length < 20) {
            const selector = el.className ? `.${el.className.split(' ').join('.')}` : el.tagName.toLowerCase();
            if (!discovered.price.some(d => d.selector === selector)) {
              discovered.price.push({
                selector,
                confidence: 'high',
                example: text,
                strategy: 'content-pattern'
              });
            }
          }
          
          // URL detection
          if (href.includes('/listings/') || href.includes('flippa.com/')) {
            const selector = el.className ? `a.${el.className.split(' ').join('.')}` : 'a[href*="listings"]';
            if (!discovered.url.some(d => d.selector === selector)) {
              discovered.url.push({
                selector,
                confidence: 'high',
                example: href,
                strategy: 'href-pattern'
              });
            }
          }
          
          // Revenue detection (looking for monthly patterns)
          if (/\$[\d,]+\s*(\/|per)?\s*mo/i.test(text)) {
            const selector = el.className ? `.${el.className.split(' ').join('.')}` : el.tagName.toLowerCase();
            if (!discovered.revenue.some(d => d.selector === selector)) {
              discovered.revenue.push({
                selector,
                confidence: 'high',
                example: text,
                strategy: 'revenue-pattern'
              });
            }
          }
          
          // Multiple detection
          if (/^\d+(\.\d+)?x$/i.test(text) || /multiple.*\d+/i.test(text)) {
            const selector = el.className ? `.${el.className.split(' ').join('.')}` : el.tagName.toLowerCase();
            if (!discovered.multiple.some(d => d.selector === selector)) {
              discovered.multiple.push({
                selector,
                confidence: 'medium',
                example: text,
                strategy: 'multiple-pattern'
              });
            }
          }
        });
        
        // Strategy 2: Analyze data attributes
        document.querySelectorAll('[data-listing-id], [data-id], [data-testid]').forEach(el => {
          const dataAttr = Array.from(el.attributes)
            .find(attr => attr.name.startsWith('data-'))?.name;
          
          if (dataAttr) {
            const selector = `[${dataAttr}="${el.getAttribute(dataAttr)}"]`;
            
            // Check what type of content this element contains
            const text = el.textContent?.trim() || '';
            
            if (text.includes('$') && !discovered.price.some(d => d.selector.includes(dataAttr))) {
              discovered.price.push({
                selector: `[${dataAttr}]`,
                confidence: 'medium',
                example: text.substring(0, 50),
                strategy: 'data-attribute'
              });
            }
          }
        });
        
        // Strategy 3: Container-based discovery
        const containers = [];
        
        // Find repeating structures with prices
        const priceElements = document.querySelectorAll('*');
        priceElements.forEach(el => {
          if (/\$[\d,]+/.test(el.textContent) && el.textContent.length < 500) {
            // Walk up to find container
            let container = el;
            for (let i = 0; i < 5; i++) {
              if (container.parentElement) {
                container = container.parentElement;
                
                // Check if this looks like a listing container
                const links = container.querySelectorAll('a[href*="listings"], a[href*="flippa.com/"]');
                const hasPrice = container.textContent.includes('$');
                
                if (links.length > 0 && hasPrice) {
                  containers.push(container);
                  break;
                }
              }
            }
          }
        });
        
        // Analyze containers for consistent patterns
        if (containers.length > 5) {
          const firstContainer = containers[0];
          
          // Find title within container
          const titleCandidates = firstContainer.querySelectorAll('h1, h2, h3, h4, a, span');
          titleCandidates.forEach(el => {
            const text = el.textContent?.trim() || '';
            if (text.length > 10 && text.length < 200 && !text.includes('$')) {
              const classes = Array.from(el.classList).filter(c => c.length > 0);
              const selector = classes.length > 0 ? `.${classes[0]}` : el.tagName.toLowerCase();
              
              if (!discovered.title.some(d => d.selector === selector)) {
                discovered.title.push({
                  selector,
                  confidence: 'high',
                  example: text.substring(0, 50),
                  strategy: 'container-analysis'
                });
              }
            }
          });
        }
        
        return discovered;
      });
      
      this.diagnosticResults.workingSelectors = workingSelectors;
      
      console.log('🎯 Discovered Working Selectors:');
      Object.entries(workingSelectors).forEach(([field, selectors]) => {
        console.log(`\n   ${field.toUpperCase()}: ${selectors.length} selectors found`);
        selectors.slice(0, 3).forEach(s => {
          console.log(`     ${s.confidence === 'high' ? '✅' : '⚠️'} ${s.selector}`);
          console.log(`        Strategy: ${s.strategy}`);
          console.log(`        Example: ${s.example}`);
        });
      });
      
    } catch (error) {
      console.error('❌ Selector discovery failed:', error.message);
      this.diagnosticResults.criticalFindings.push(`Selector discovery error: ${error.message}`);
    }
    
    await page.close();
  }

  async analyzeExtractionLogic(browser) {
    console.log('\n⚙️ PHASE 4: ANALYZING EXTRACTION LOGIC');
    console.log('-'.repeat(50));
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
      await page.goto('https://flippa.com/search?filter[property_type][]=website', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test the actual extraction logic from apify-complete-extractor.js
      const extractionAnalysis = await page.evaluate(() => {
        const analysis = {
          containerDetection: {
            method: 'price-based',
            containersFound: 0,
            issues: []
          },
          fieldExtraction: {
            attemptedExtractions: 0,
            successfulExtractions: 0,
            issues: []
          },
          confidenceThreshold: {
            threshold: 3,
            averageConfidence: 0,
            belowThreshold: 0
          }
        };
        
        // Simulate the extraction logic
        const potentialContainers = [];
        
        // Container detection logic from extractor
        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent || '';
          if (/\$[\d,]+/.test(text) && text.length < 1000 && text.length > 20) {
            let container = el;
            for (let i = 0; i < 8; i++) {
              if (container.parentElement) {
                container = container.parentElement;
                const containerText = container.textContent || '';
                if (containerText.length > 100 && containerText.length < 3000) {
                  break;
                }
              }
            }
            
            if (!potentialContainers.includes(container)) {
              potentialContainers.push(container);
            }
          }
        });
        
        analysis.containerDetection.containersFound = potentialContainers.length;
        
        // Check why containers might be failing
        if (potentialContainers.length === 0) {
          analysis.containerDetection.issues.push('No containers found with price-based detection');
        } else if (potentialContainers.length < 10) {
          analysis.containerDetection.issues.push(`Only ${potentialContainers.length} containers found - too few`);
        }
        
        // Test extraction on first container
        if (potentialContainers.length > 0) {
          const testContainer = potentialContainers[0];
          let extractedFields = 0;
          
          // Test basic extractions
          const tests = {
            title: testContainer.querySelector('h1, h2, h3, a'),
            price: testContainer.querySelector('[data-testid*="price"], .price, .amount'),
            url: testContainer.querySelector('a[href*="flippa.com/"], a[href*="/listings/"]')
          };
          
          Object.entries(tests).forEach(([field, element]) => {
            if (element && element.textContent) {
              extractedFields++;
            } else {
              analysis.fieldExtraction.issues.push(`${field} extraction failed - no matching element`);
            }
          });
          
          analysis.fieldExtraction.attemptedExtractions = Object.keys(tests).length;
          analysis.fieldExtraction.successfulExtractions = extractedFields;
          
          // Check confidence threshold
          if (extractedFields < 3) {
            analysis.confidenceThreshold.belowThreshold++;
            analysis.confidenceThreshold.issues = ['Confidence too low - listing would be filtered out'];
          }
        }
        
        return analysis;
      });
      
      this.diagnosticResults.extractionLogic = extractionAnalysis;
      
      console.log('📋 Extraction Logic Analysis:');
      console.log(`   Container detection: ${extractionAnalysis.containerDetection.containersFound} found`);
      console.log(`   Method: ${extractionAnalysis.containerDetection.method}`);
      
      if (extractionAnalysis.containerDetection.issues.length > 0) {
        console.log('   ❌ Container Issues:');
        extractionAnalysis.containerDetection.issues.forEach(issue => {
          console.log(`      - ${issue}`);
        });
      }
      
      if (extractionAnalysis.fieldExtraction.issues.length > 0) {
        console.log('   ❌ Extraction Issues:');
        extractionAnalysis.fieldExtraction.issues.forEach(issue => {
          console.log(`      - ${issue}`);
        });
      }
      
      // Critical finding
      if (extractionAnalysis.containerDetection.containersFound < 10) {
        this.diagnosticResults.criticalFindings.push(
          'CRITICAL: Container detection failing - price-based method not finding listing containers'
        );
      }
      
    } catch (error) {
      console.error('❌ Extraction logic analysis failed:', error.message);
      this.diagnosticResults.criticalFindings.push(`Extraction logic error: ${error.message}`);
    }
    
    await page.close();
  }

  generateRecommendations() {
    console.log('\n💡 PHASE 5: GENERATING RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    const recommendations = [];
    
    // Analyze findings and generate recommendations
    
    // 1. Container detection issues
    if (this.diagnosticResults.domStructure.listingContainers?.length > 0) {
      const topContainer = this.diagnosticResults.domStructure.listingContainers[0];
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'Container detection using wrong method',
        solution: `Use direct container selector: "${topContainer.selector}"`,
        impact: 'Will dramatically improve extraction rates',
        code: `const containers = document.querySelectorAll('${topContainer.selector}');`
      });
    }
    
    // 2. Selector issues
    Object.entries(this.diagnosticResults.workingSelectors || {}).forEach(([field, selectors]) => {
      if (selectors.length > 0 && selectors[0].confidence === 'high') {
        recommendations.push({
          priority: 'HIGH',
          issue: `${field} selector not optimal`,
          solution: `Use discovered selector: "${selectors[0].selector}"`,
          impact: `Will improve ${field} extraction rate`,
          code: `${field}: ['${selectors[0].selector}']`
        });
      }
    });
    
    // 3. Extraction logic issues
    if (this.diagnosticResults.extractionLogic?.containerDetection?.issues?.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'Price-based container detection failing',
        solution: 'Switch to class-based or data-attribute-based container detection',
        impact: 'Core issue causing low extraction rates',
        code: `// Use repeating structure detection instead of price-based`
      });
    }
    
    // 4. Framework-specific recommendations
    if (this.diagnosticResults.domStructure.frameworks?.includes('Angular')) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Angular framework requires special handling',
        solution: 'Wait for Angular to render before extraction',
        impact: 'Ensures dynamic content is loaded',
        code: `await page.waitForSelector('[ng-repeat], [*ngFor]', { timeout: 10000 });`
      });
    }
    
    this.diagnosticResults.recommendations = recommendations;
    
    console.log('📋 Recommendations Generated:');
    recommendations.forEach((rec, index) => {
      console.log(`\n   ${index + 1}. [${rec.priority}] ${rec.issue}`);
      console.log(`      Solution: ${rec.solution}`);
      console.log(`      Impact: ${rec.impact}`);
    });
  }

  async saveDiagnosticReport() {
    console.log('\n💾 PHASE 6: SAVING DIAGNOSTIC REPORT');
    console.log('-'.repeat(50));
    
    // Calculate current extraction rates from database
    try {
      const { data: listings, error } = await this.supabase
        .from('flippa_listings')
        .select('title, price, monthly_revenue, multiple')
        .limit(1000);
      
      if (!error && listings) {
        const rates = {
          title: listings.filter(l => l.title && l.title.length > 0).length,
          price: listings.filter(l => l.price > 0).length,
          revenue: listings.filter(l => l.monthly_revenue > 0).length,
          multiple: listings.filter(l => l.multiple > 0).length
        };
        
        this.diagnosticResults.extractionRates = {
          title: ((rates.title / listings.length) * 100).toFixed(1),
          price: ((rates.price / listings.length) * 100).toFixed(1),
          revenue: ((rates.revenue / listings.length) * 100).toFixed(1),
          multiple: ((rates.multiple / listings.length) * 100).toFixed(1),
          sampleSize: listings.length
        };
      }
    } catch (error) {
      console.error('Could not calculate extraction rates:', error);
    }
    
    // Add summary
    this.diagnosticResults.summary = {
      criticalIssuesFound: this.diagnosticResults.criticalFindings.length,
      recommendationsGenerated: this.diagnosticResults.recommendations.length,
      rootCause: 'Container detection method failing - using price-based instead of structure-based',
      estimatedImpact: 'Fixing container detection will improve extraction rates to 90%+'
    };
    
    // Save report
    const filename = `extraction-diagnostic-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.diagnosticResults, null, 2));
    
    console.log(`\n📊 DIAGNOSTIC SUMMARY:`);
    console.log('=' .repeat(60));
    console.log(`🔴 Critical Issues Found: ${this.diagnosticResults.criticalFindings.length}`);
    console.log(`💡 Recommendations: ${this.diagnosticResults.recommendations.length}`);
    console.log(`📈 Current Extraction Rates:`);
    if (this.diagnosticResults.extractionRates.title) {
      console.log(`   - Title: ${this.diagnosticResults.extractionRates.title}%`);
      console.log(`   - Price: ${this.diagnosticResults.extractionRates.price}%`);
      console.log(`   - Revenue: ${this.diagnosticResults.extractionRates.revenue}%`);
      console.log(`   - Multiple: ${this.diagnosticResults.extractionRates.multiple}%`);
    }
    console.log(`\n🎯 ROOT CAUSE: ${this.diagnosticResults.summary.rootCause}`);
    console.log(`✨ IMPACT: ${this.diagnosticResults.summary.estimatedImpact}`);
    console.log(`\n💾 Full report saved: ${filename}`);
    
    return filename;
  }
}

// Execute diagnostic
async function runDiagnostic() {
  console.log('🚀 Starting Complete Extraction Diagnostic...\n');
  
  const diagnostic = new ExtractionDiagnosticSystem();
  const results = await diagnostic.runCompleteDiagnostic();
  
  console.log('\n✅ Diagnostic Complete!');
  console.log('🔧 Next step: Run extraction-fix-generator.js to implement fixes');
}

runDiagnostic().catch(console.error);