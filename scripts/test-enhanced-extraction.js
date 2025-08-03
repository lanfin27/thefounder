/**
 * Test script for enhanced profit/revenue extraction
 */

const { chromium } = require('playwright');

async function testEnhancedExtraction() {
  console.log('🧪 Testing Enhanced Extraction Capabilities\n');
  
  // Test cases with known patterns
  const testCases = [
    {
      name: 'Profit and Revenue Separation',
      html: `
        <div id="listing-123">
          <p>Premium SaaS Analytics Platform</p>
          <span>USD $125,000</span>
          <div>Net Profit USD $21,818 p/mo</div>
          <div>Monthly Revenue $45,000</div>
          <span>Multiple: 3.8x Profit | 1.9x Revenue</span>
        </div>
      `,
      expected: {
        price: 125000,
        monthlyProfit: 21818,
        monthlyRevenue: 45000,
        profitMultiple: 3.8,
        revenueMultiple: 1.9
      }
    },
    {
      name: 'Profit Only Pattern',
      html: `
        <div id="listing-456">
          <p>Content Website Business</p>
          <span>$85,000</span>
          <div>Monthly Profit: $3,500</div>
          <span>2.5x profit</span>
        </div>
      `,
      expected: {
        price: 85000,
        monthlyProfit: 3500,
        monthlyRevenue: null,
        profitMultiple: 2.5,
        revenueMultiple: null
      }
    },
    {
      name: 'Revenue Pattern with Calculation',
      html: `
        <div id="listing-789">
          <p>E-commerce Store</p>
          <span>Price: $250,000</span>
          <div>Gross Revenue $15,000/mo</div>
        </div>
      `,
      expected: {
        price: 250000,
        monthlyProfit: null,
        monthlyRevenue: 15000,
        profitMultiple: null,
        revenueMultiple: 1.4 // Should calculate: 250000 / (15000 * 12)
      }
    }
  ];
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('📋 Running extraction tests...\n');
  
  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    // Create test page with HTML
    await page.setContent(`
      <html>
        <body>
          ${testCase.html}
        </body>
      </html>
    `);
    
    // Run extraction logic
    const result = await page.evaluate(() => {
      const element = document.querySelector('div[id^="listing-"]');
      if (!element) return null;
      
      const financialData = {
        price: null,
        monthlyProfit: null,
        monthlyRevenue: null,
        profitMultiple: null,
        revenueMultiple: null
      };
      
      const fullText = element.textContent || '';
      
      // Extract price
      const pricePatterns = [
        /\$\s?([\d,]+)(?!\s*(?:p\/mo|\/mo|monthly))/i,
        /USD\s*\$?\s?([\d,]+)(?!\s*(?:p\/mo|\/mo|monthly))/i,
        /Price:\s*\$?\s?([\d,]+)/i
      ];
      
      for (const pattern of pricePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          financialData.price = parseInt(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      // Extract profit
      const profitPatterns = [
        /Net\s+Profit[^\d]*\$?\s?([\d,]+)\s*(?:p\/mo|\/mo|monthly)/i,
        /Monthly\s+Profit[^\d]*\$?\s?([\d,]+)/i,
        /Profit[^\d]*\$?\s?([\d,]+)\s*(?:p\/mo|\/mo)/i
      ];
      
      for (const pattern of profitPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          financialData.monthlyProfit = parseInt(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      // Extract revenue
      const revenuePatterns = [
        /Monthly\s+Revenue[^\d]*\$?\s?([\d,]+)/i,
        /Gross\s+Revenue[^\d]*\$?\s?([\d,]+)\s*(?:p\/mo|\/mo|monthly)/i,
        /Revenue[^\d]*\$?\s?([\d,]+)\s*(?:p\/mo|\/mo)/i
      ];
      
      for (const pattern of revenuePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          financialData.monthlyRevenue = parseInt(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      // Extract multiples
      const multiplePatterns = [
        /([\d.]+)x\s+profit\s*[|\/]?\s*([\d.]+)x\s+revenue/i,
        /([\d.]+)x\s+(profit|revenue)/i
      ];
      
      for (const pattern of multiplePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          if (match[3]) {
            // Single multiple
            const value = parseFloat(match[1]);
            const type = match[2].toLowerCase();
            if (type === 'profit') {
              financialData.profitMultiple = value;
            } else {
              financialData.revenueMultiple = value;
            }
          } else {
            // Both multiples
            financialData.profitMultiple = parseFloat(match[1]);
            financialData.revenueMultiple = parseFloat(match[2]);
          }
        }
      }
      
      // Calculate missing multiples
      if (financialData.price && financialData.monthlyRevenue && !financialData.revenueMultiple) {
        const annualRevenue = financialData.monthlyRevenue * 12;
        if (annualRevenue > 0) {
          financialData.revenueMultiple = Math.round((financialData.price / annualRevenue) * 10) / 10;
        }
      }
      
      return financialData;
    });
    
    // Compare results
    console.log('Expected:', testCase.expected);
    console.log('Actual:  ', result);
    
    // Check accuracy
    let passed = true;
    for (const key in testCase.expected) {
      if (testCase.expected[key] !== result[key]) {
        console.log(`❌ ${key}: Expected ${testCase.expected[key]}, got ${result[key]}`);
        passed = false;
      }
    }
    
    if (passed) {
      console.log('✅ All fields extracted correctly!');
    }
    
    console.log('\n');
  }
  
  // Test on real Flippa page
  console.log('🌐 Testing on Real Flippa Page...\n');
  
  try {
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector('div[id^="listing-"]', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const realResults = await page.evaluate(() => {
      const listings = [];
      const elements = document.querySelectorAll('div[id^="listing-"]');
      
      // Extract first 3 listings
      for (let i = 0; i < Math.min(3, elements.length); i++) {
        const element = elements[i];
        const fullText = element.textContent || '';
        
        const listing = {
          id: element.id,
          text: fullText.substring(0, 200) + '...',
          hasProfit: /profit/i.test(fullText),
          hasRevenue: /revenue/i.test(fullText),
          hasMultiple: /\d+\.?\d*x/i.test(fullText)
        };
        
        listings.push(listing);
      }
      
      return listings;
    });
    
    console.log('Sample Real Listings:');
    realResults.forEach((listing, index) => {
      console.log(`\n${index + 1}. ${listing.id}`);
      console.log(`   Has Profit: ${listing.hasProfit ? '✅' : '❌'}`);
      console.log(`   Has Revenue: ${listing.hasRevenue ? '✅' : '❌'}`);
      console.log(`   Has Multiple: ${listing.hasMultiple ? '✅' : '❌'}`);
      console.log(`   Preview: ${listing.text}`);
    });
    
  } catch (error) {
    console.error('Failed to test on real page:', error.message);
  }
  
  await browser.close();
  console.log('\n✅ Enhanced extraction test complete!');
}

// Run test
if (require.main === module) {
  testEnhancedExtraction().catch(console.error);
}

module.exports = { testEnhancedExtraction };