// simplified-scraper.js
// Single, reliable scraper for Flippa listings

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class SimplifiedFlippaScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1366, height: 768 });
  }

  async scrapeFlippaListings(targetListings = 100) {
    const sessionId = `session_${Date.now()}`;
    const listings = [];

    try {
      // Create session record  
      const { error: sessionError } = await supabase
        .from('scraping_sessions')
        .insert({
          session_id: sessionId,
          method: 'simplified-scraper',
          status: 'running'
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return { success: false, error: sessionError.message };
      }

      console.log(`🚀 Starting scrape for ${targetListings} listings...`);
      
      // Navigate to Flippa search
      await this.page.goto('https://flippa.com/search?filter%5Bproperty_type%5D=website', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      let currentPage = 1;
      const maxPages = Math.ceil(targetListings / 24);

      while (currentPage <= maxPages && listings.length < targetListings) {
        console.log(`📄 Processing page ${currentPage}...`);

        // Wait for listings to load
        await this.page.waitForSelector('[data-testid="listing-card"]', { timeout: 10000 });

        // Extract listings from current page
        const pageListings = await this.page.evaluate(() => {
          const listingCards = document.querySelectorAll('[data-testid="listing-card"]');
          return Array.from(listingCards).map(card => {
            try {
              const titleEl = card.querySelector('h3 a, h2 a, .listing-title a');
              const priceEl = card.querySelector('[data-testid="price"], .price, .asking-price');
              const revenueEl = card.querySelector('[data-testid="revenue"], .revenue');
              const profitEl = card.querySelector('[data-testid="profit"], .profit');
              
              return {
                title: titleEl?.textContent?.trim() || 'Unknown',
                url: titleEl?.href || '',
                asking_price: this.parsePrice(priceEl?.textContent),
                monthly_revenue: this.parsePrice(revenueEl?.textContent),
                monthly_profit: this.parsePrice(profitEl?.textContent),
                category: 'website',
                scraped_at: new Date().toISOString()
              };
            } catch (error) {
              console.error('Error extracting listing:', error);
              return null;
            }
          }).filter(listing => listing && listing.url);
        });

        listings.push(...pageListings);
        console.log(`✅ Extracted ${pageListings.length} listings from page ${currentPage}`);

        // Navigate to next page if needed
        if (currentPage < maxPages && listings.length < targetListings) {
          try {
            const nextButton = await this.page.$('[data-testid="next-page"], .pagination .next');
            if (nextButton) {
              await nextButton.click();
              await this.page.waitForTimeout(3000);
              currentPage++;
            } else {
              break;
            }
          } catch (error) {
            console.log('No next page found, ending scrape');
            break;
          }
        } else {
          break;
        }
      }

      // Save listings to database
      if (listings.length > 0) {
        const listingsWithSession = listings.map(listing => ({
          ...listing,
          session_id: sessionId
        }));

        const { error: insertError } = await supabase
          .from('flippa_listings')
          .insert(listingsWithSession);

        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          console.log(`💾 Saved ${listings.length} listings to database`);
        }
      }

      // Update session
      await supabase
        .from('scraping_sessions')
        .update({
          status: 'completed',
          total_listings: listings.length,
          successful_extractions: listings.length,
          completed_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      return {
        success: true,
        sessionId,
        listings: listings.length,
        data: listings
      };

    } catch (error) {
      console.error('Scraping error:', error);
      
      // Update session with error
      await supabase
        .from('scraping_sessions')
        .update({
          status: 'error',
          completed_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      return { success: false, error: error.message };
    }
  }

  parsePrice(priceText) {
    if (!priceText) return null;
    const cleanPrice = priceText.replace(/[^0-9]/g, '');
    return cleanPrice ? parseInt(cleanPrice) : null;
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }
}

// CLI usage
if (require.main === module) {
  async function main() {
    const scraper = new SimplifiedFlippaScraper();
    try {
      await scraper.initialize();
      const result = await scraper.scrapeFlippaListings(50);
      console.log('Final result:', result);
    } catch (error) {
      console.error('Scraper failed:', error);
    } finally {
      await scraper.cleanup();
    }
  }
  main();
}

module.exports = SimplifiedFlippaScraper;
