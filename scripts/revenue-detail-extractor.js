// scripts/revenue-detail-extractor.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class RevenueDetailExtractor {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.updatedCount = 0;
    this.revenueStats = {
      attempted: 0,
      foundRevenue: 0,
      foundMultiple: 0,
      patterns: {}
    };
  }

  async extractRevenueFromDetails() {
    console.log('💰 REVENUE DETAIL EXTRACTOR');
    console.log('🎯 Goal: Extract revenue data from listing detail pages');
    console.log('📊 Current: Revenue 0%, Multiple 0%');
    console.log('🚀 Target: Revenue 60%+, Multiple 80%+');
    console.log('');

    // Get listings without revenue
    const { data: listings, error } = await this.supabase
      .from('flippa_listings')
      .select('*')
      .is('monthly_revenue', null)
      .not('url', 'is', null)
      .limit(50); // Test on first 50

    if (error || !listings || listings.length === 0) {
      console.log('❌ No listings found to update');
      return;
    }

    console.log(`📋 Found ${listings.length} listings without revenue data`);

    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      console.log(`\n📄 Processing listing ${i + 1}/${listings.length}: ${listing.title || listing.listing_id}`);
      
      try {
        const revenueData = await this.extractRevenueFromDetailPage(browser, listing);
        
        if (revenueData.revenue || revenueData.multiple) {
          await this.updateListing(listing.listing_id, revenueData);
          console.log(`✅ Updated: Revenue $${revenueData.revenue || 'N/A'}, Multiple ${revenueData.multiple || 'N/A'}`);
        } else {
          console.log(`⚠️ No revenue data found`);
        }
        
        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 10000 + Math.random() * 5000));
        
      } catch (error) {
        console.error(`❌ Error processing listing:`, error.message);
      }
    }

    await browser.close();
    this.generateRevenueReport();
  }

  async extractRevenueFromDetailPage(browser, listing) {
    this.revenueStats.attempted++;
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      console.log(`🔗 Loading: ${listing.url}`);
      await page.goto(listing.url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      const revenueData = await page.evaluate(() => {
        const data = {
          revenue: null,
          profit: null,
          multiple: null,
          foundPatterns: []
        };

        const fullText = document.body.textContent || '';

        // Enhanced revenue patterns for detail pages
        const revenuePatterns = [
          { name: 'monthlyRevenue', pattern: /Monthly\s+Revenue[:\s]*\$?([0-9,]+)/gi },
          { name: 'monthlyProfit', pattern: /Monthly\s+Profit[:\s]*\$?([0-9,]+)/gi },
          { name: 'netProfit', pattern: /Net\s+Profit[:\s]*\$?([0-9,]+)/gi },
          { name: 'averageRevenue', pattern: /Average\s+(?:Monthly\s+)?Revenue[:\s]*\$?([0-9,]+)/gi },
          { name: 'revenuePerMonth', pattern: /Revenue[:\s]*\$?([0-9,]+)\s*(?:\/\s*)?per\s+month/gi },
          { name: 'profitPerMonth', pattern: /Profit[:\s]*\$?([0-9,]+)\s*(?:\/\s*)?per\s+month/gi },
          { name: 'monthlyEarnings', pattern: /Monthly\s+Earnings[:\s]*\$?([0-9,]+)/gi },
          { name: 'grossRevenue', pattern: /Gross\s+Revenue[:\s]*\$?([0-9,]+)/gi },
          { name: 'revenueSlashMo', pattern: /\$([0-9,]+)\s*\/\s*mo(?:nth)?/gi },
          { name: 'tableCellRevenue', pattern: /Revenue.*?<td[^>]*>\s*\$?([0-9,]+)/gi },
          { name: 'tableCellProfit', pattern: /Profit.*?<td[^>]*>\s*\$?([0-9,]+)/gi }
        ];

        // Test each pattern
        for (const { name, pattern } of revenuePatterns) {
          const matches = fullText.match(pattern);
          if (matches && matches.length > 0) {
            const match = matches[0];
            const numberMatch = match.match(/([0-9,]+)/);
            if (numberMatch) {
              const value = parseInt(numberMatch[1].replace(/,/g, ''));
              if (value > 0 && value < 1000000) {
                if (name.includes('profit') || name.includes('Profit')) {
                  data.profit = value;
                } else {
                  data.revenue = value;
                }
                data.foundPatterns.push(`${name}: $${value}`);
                break; // Use first valid match
              }
            }
          }
        }

        // Look for multiple patterns
        const multiplePatterns = [
          /Multiple[:\s]*([0-9.]+)\s*x/gi,
          /([0-9.]+)\s*x\s+(?:monthly\s+)?multiple/gi,
          /Valuation\s+Multiple[:\s]*([0-9.]+)/gi,
          /Revenue\s+Multiple[:\s]*([0-9.]+)/gi,
          /([0-9.]+)x\s+(?:monthly\s+)?(?:revenue|profit)/gi
        ];

        for (const pattern of multiplePatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const multiple = parseFloat(match[1]);
            if (multiple > 0 && multiple < 100) {
              data.multiple = multiple;
              data.foundPatterns.push(`Multiple: ${multiple}x`);
              break;
            }
          }
        }

        // Try to find revenue in specific elements
        if (!data.revenue) {
          const elements = document.querySelectorAll('div, span, td, p');
          elements.forEach(el => {
            const text = el.textContent || '';
            if (text.includes('Monthly') && text.includes('$') && text.length < 100) {
              const match = text.match(/\$([0-9,]+)/);
              if (match) {
                const value = parseInt(match[1].replace(/,/g, ''));
                if (value > 0 && value < 1000000 && !data.revenue) {
                  data.revenue = value;
                  data.foundPatterns.push(`Element text: $${value}`);
                }
              }
            }
          });
        }

        return data;
      });

      if (revenueData.foundPatterns.length > 0) {
        console.log(`   📊 Found patterns: ${revenueData.foundPatterns.join(', ')}`);
      }

      if (revenueData.revenue) {
        this.revenueStats.foundRevenue++;
      }
      if (revenueData.multiple) {
        this.revenueStats.foundMultiple++;
      }

      // Calculate multiple if we have price and revenue
      if (!revenueData.multiple && listing.price && revenueData.revenue) {
        revenueData.multiple = parseFloat((listing.price / (revenueData.revenue * 12)).toFixed(1));
      }

      await page.close();
      return revenueData;

    } catch (error) {
      console.error('Detail page error:', error.message);
      await page.close();
      return { revenue: null, multiple: null };
    }
  }

  async updateListing(listingId, revenueData) {
    const updates = {};
    
    if (revenueData.revenue) {
      updates.monthly_revenue = revenueData.revenue;
      updates.monthly_profit = revenueData.profit || revenueData.revenue;
    }
    
    if (revenueData.multiple) {
      updates.multiple = revenueData.multiple;
    }

    const { error } = await this.supabase
      .from('flippa_listings')
      .update(updates)
      .eq('listing_id', listingId);

    if (!error) {
      this.updatedCount++;
    } else {
      console.error('Update error:', error);
    }
  }

  generateRevenueReport() {
    console.log('\n💰 REVENUE EXTRACTION REPORT');
    console.log('============================');
    console.log(`📊 Total Attempted: ${this.revenueStats.attempted}`);
    console.log(`💵 Found Revenue: ${this.revenueStats.foundRevenue} (${((this.revenueStats.foundRevenue / this.revenueStats.attempted) * 100).toFixed(1)}%)`);
    console.log(`📈 Found Multiple: ${this.revenueStats.foundMultiple} (${((this.revenueStats.foundMultiple / this.revenueStats.attempted) * 100).toFixed(1)}%)`);
    console.log(`✅ Updated Listings: ${this.updatedCount}`);
    console.log('\n🔗 Run check-current-extraction-rates.js to see updated rates');
  }
}

// Execute revenue extraction
new RevenueDetailExtractor().extractRevenueFromDetails().catch(console.error);