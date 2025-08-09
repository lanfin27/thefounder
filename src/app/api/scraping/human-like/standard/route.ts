// api/scraping/human-like/standard/route.ts
// Standard Scraper API endpoint - Now using premium cascade system with commercial services

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ServiceCascadeManager } from '@/lib/cloudflare-bypass/commercial-services/service-cascade-manager';
import { CostOptimizer } from '@/lib/cloudflare-bypass/commercial-services/cost-optimizer';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Global instances for standard scraping
let cascadeManager: ServiceCascadeManager | null = null;
let costOptimizer: CostOptimizer | null = null;
let sessionMetrics = {
  startTime: 0,
  listingsScraped: 0,
  pagesVisited: 0,
  errors: 0,
  lastUpdate: 0,
  targetListings: 1000,
  status: 'idle' as 'idle' | 'running' | 'completed' | 'error',
  servicesUsed: {} as Record<string, number>,
  totalCost: 0
};

export async function POST(request: NextRequest) {
  const sessionId = uuidv4();
  
  try {
    // Parse request body
    const body = await request.json();
    const { 
      targetListings = 1000,
      websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'
    } = body;

    if (cascadeManager && sessionMetrics.status === 'running') {
      return NextResponse.json(
        { error: 'Standard scraping already in progress' },
        { status: 400 }
      );
    }

    // Reset metrics
    sessionMetrics = {
      startTime: Date.now(),
      listingsScraped: 0,
      pagesVisited: 0,
      errors: 0,
      lastUpdate: Date.now(),
      targetListings,
      status: 'running',
      servicesUsed: {},
      totalCost: 0
    };

    console.log('🚀 Initializing Premium Cascade System for Standard Scraper');
    console.log('📋 Configuration:');
    console.log(`  - ScrapingBee API Key: ${process.env.SCRAPINGBEE_API_KEY ? '✅ Found' : '❌ Missing'}`);
    console.log(`  - Scrapfly API Key: ${process.env.SCRAPFLY_API_KEY ? '✅ Found' : '❌ Missing'}`);
    console.log(`  - Target Listings: ${targetListings}`);

    // Initialize cost optimizer
    costOptimizer = new CostOptimizer({
      cache: {
        maxSize: 1000,
        ttl: 300000, // 5 minutes
        maxAge: 3600000, // 1 hour
        updateAgeOnGet: true,
        allowStale: true,
        staleWhileRevalidate: 60000
      },
      deduplication: {
        windowMs: 30000,
        maxConcurrent: 10,
        queueSize: 100
      },
      rateLimiting: {
        tokensPerInterval: 10,
        interval: 60000,
        maxBurst: 20
      },
      costTracking: {
        budgets: {
          hourly: 5.00,
          daily: 50.00,
          monthly: 500.00
        },
        alerts: {
          thresholds: [50, 75, 90]
        }
      }
    });

    // Initialize cascade manager with premium services
    const cascadeConfig = {
      services: {
        flaresolverr: {
          endpoint: 'http://localhost:8191/v1',
          config: {
            priority: 1,
            enabled: true,
            costPerRequest: 0,
            successRate: 0.7,
            avgResponseTime: 5000,
            maxRetries: 2,
            timeout: 60000
          }
        },
        ...(process.env.SCRAPINGBEE_API_KEY ? {
          scrapingbee: {
            apiKey: process.env.SCRAPINGBEE_API_KEY,
            config: {
              priority: 2,
              enabled: true,
              costPerRequest: 0.025,
              successRate: 0.9,
              avgResponseTime: 8000,
              maxRetries: 3,
              timeout: 90000
            }
          }
        } : {}),
        ...(process.env.SCRAPFLY_API_KEY ? {
          scrapfly: {
            apiKey: process.env.SCRAPFLY_API_KEY,
            config: {
              priority: 3,
              enabled: true,
              costPerRequest: 0.05,
              successRate: 0.95,
              avgResponseTime: 10000,
              maxRetries: 3,
              timeout: 120000
            }
          }
        } : {})
      },
      costOptimization: {
        maxCostPerRequest: 0.10,
        monthlyBudget: 500.00,
        cacheEnabled: true,
        cacheTTL: 300000,
        deduplicationWindow: 30000
      },
      performance: {
        timeout: 120000,
        retryDelay: 2000,
        circuitBreakerThreshold: 0.5,
        circuitBreakerTimeout: 300000
      }
    };

    cascadeManager = new ServiceCascadeManager(cascadeConfig);

    // Set up event listeners
    cascadeManager.on('cacheHit', (event) => {
      console.log(`💾 Cache hit! Saved $${event.savedCost.toFixed(3)}`);
    });

    cascadeManager.on('requestComplete', (event) => {
      console.log(`💰 Request cost: $${event.cost.toFixed(3)} | Service: ${event.service}`);
      sessionMetrics.servicesUsed[event.service] = (sessionMetrics.servicesUsed[event.service] || 0) + 1;
      sessionMetrics.totalCost += event.cost;
    });

    costOptimizer.on('budgetAlert', (event) => {
      console.log(`🚨 Budget alert: ${event.percent.toFixed(1)}% of monthly budget used!`);
    });

    // Create scraping session in database
    const { data: session, error: sessionError } = await supabase
      .from('scraping_sessions')
      .insert({
        session_id: sessionId,
        method: 'premium-cascade-standard',
        status: 'running',
        total_listings: 0,
        successful_extractions: 0,
        failed_extractions: 0,
        started_at: new Date().toISOString(),
        configuration: {
          type: 'premium-cascade-system',
          targetListings,
          approach: 'Commercial Services Cascade',
          services: Object.keys(cascadeConfig.services),
          cacheEnabled: true,
          monthlyBudget: cascadeConfig.costOptimization.monthlyBudget
        }
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // Start scraping in background
    startPremiumScraping(targetListings, sessionId, websocketUrl);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Premium cascade scraping started successfully',
      config: {
        approach: 'Commercial Services Cascade',
        services: Object.keys(cascadeConfig.services),
        cacheEnabled: true,
        monthlyBudget: cascadeConfig.costOptimization.monthlyBudget,
        targetListings
      },
      estimatedDuration: `${Math.ceil(targetListings / 60)} minutes`,
      features: {
        commercialServices: true,
        intelligentCascade: true,
        costOptimization: true,
        cachingEnabled: true,
        realTimeProgress: true,
        cloudflareBypass: true
      },
      websocketUrl,
      dashboardUrl: `/admin/scraping?session=${sessionId}`,
      metrics: sessionMetrics
    });

  } catch (error) {
    console.error('Failed to start premium cascade scraping:', error);
    sessionMetrics.status = 'error';
    
    return NextResponse.json(
      { 
        error: 'Failed to start premium cascade scraping', 
        details: error instanceof Error ? error.message : 'Unknown error',
        metrics: sessionMetrics
      },
      { status: 500 }
    );
  }
}

// Start premium cascade scraping process
async function startPremiumScraping(targetListings: number, sessionId: string, websocketUrl: string) {
  if (!cascadeManager || !costOptimizer) return;

  try {
    let page = 1;
    let totalScraped = 0;
    const baseUrl = 'https://flippa.com/search?filter%5Bproperty_type%5D=website,established_website,starter_site';

    while (totalScraped < targetListings && sessionMetrics.status === 'running') {
      const url = `${baseUrl}&page%5Bsize%5D=24&page%5Bnumber%5D=${page}`;
      
      console.log(`\n📄 Scraping page ${page}: ${url}`);

      try {
        // Use cost optimizer for caching and deduplication
        const optimized = await costOptimizer.optimizeRequest(
          {
            url,
            method: 'GET',
            headers: {},
            body: null
          },
          0.025, // Average cost per request
          async () => {
            const response = await cascadeManager!.scrape({
              url,
              options: {
                priority: 'high'
              }
            });

            console.log(`🔍 Service cascade result:`, {
              service: response.service,
              success: response.success,
              statusCode: response.statusCode,
              cost: response.cost,
              cached: response.cached
            });

            return response;
          }
        );

        const response = optimized.result;

        if (response.success && response.content) {
          const listings = extractListings(response.content);
          console.log(`📊 Extracted ${listings.length} listings from page ${page}`);

          for (const listing of listings) {
            if (totalScraped >= targetListings) break;

            await saveListingData(listing, sessionId);
            totalScraped++;
            sessionMetrics.listingsScraped = totalScraped;
            sessionMetrics.lastUpdate = Date.now();

            // Broadcast progress
            await broadcastProgress(websocketUrl, 'premium-cascade', sessionId);
          }

          sessionMetrics.pagesVisited++;

          // Check if there's a next page
          const hasNextPage = checkHasNextPage(response.content);
          if (!hasNextPage || listings.length === 0) {
            console.log('📋 No more pages to scrape');
            break;
          }

          page++;

          // Add delay between pages
          await new Promise(resolve => setTimeout(resolve, 2000));

        } else {
          console.error(`❌ Failed to scrape page ${page}:`, response);
          sessionMetrics.errors++;
          
          // Try again with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.min(5000 * Math.pow(2, sessionMetrics.errors), 30000)));
        }

      } catch (error) {
        console.error(`❌ Error scraping page ${page}:`, error);
        sessionMetrics.errors++;
        
        if (sessionMetrics.errors > 5) {
          console.error('Too many errors, stopping scraping');
          break;
        }
      }
    }

    // Update final session status
    sessionMetrics.status = totalScraped >= targetListings ? 'completed' : 'error';
    
    await supabase
      .from('scraping_sessions')
      .update({
        status: sessionMetrics.status,
        completed_at: new Date().toISOString(),
        total_listings: sessionMetrics.listingsScraped,
        successful_extractions: sessionMetrics.listingsScraped,
        failed_extractions: sessionMetrics.errors,
        pages_processed: sessionMetrics.pagesVisited,
        processing_time: Date.now() - sessionMetrics.startTime,
        cost_metrics: {
          totalCost: sessionMetrics.totalCost,
          servicesUsed: sessionMetrics.servicesUsed,
          cacheHits: costOptimizer.getCacheStats().hitRate
        }
      })
      .eq('session_id', sessionId);

    console.log(`\n✅ Premium cascade scraping completed:`, {
      listingsScraped: sessionMetrics.listingsScraped,
      pagesVisited: sessionMetrics.pagesVisited,
      errors: sessionMetrics.errors,
      totalCost: `$${sessionMetrics.totalCost.toFixed(3)}`,
      servicesUsed: sessionMetrics.servicesUsed
    });

  } catch (error) {
    console.error('Premium cascade scraping process error:', error);
    sessionMetrics.status = 'error';
    sessionMetrics.errors++;
  }
}

// Extract listings from HTML content
function extractListings(html: string): any[] {
  const $ = cheerio.load(html);
  const listings: any[] = [];

  $('.ListingResults__listingCardContainer').each((_, element) => {
    try {
      const $card = $(element);
      
      // Extract listing ID from the link
      const link = $card.find('a[data-testid="listing-card-link"]').attr('href') || '';
      const listingId = link.split('/').pop() || '';

      // Extract basic information
      const title = $card.find('.ListingCard__listingTitle').text().trim();
      const description = $card.find('.ListingCard__listingDescription').text().trim();
      
      // Extract metrics
      const profitText = $card.find('.ListingCard__value:contains("$")').first().text().trim();
      const revenueText = $card.find('.ListingCard__value:contains("$")').eq(1).text().trim();
      const priceText = $card.find('.ListingCard__askingPrice').text().trim();

      // Extract metadata
      const category = $card.find('.ListingCard__propertyType').text().trim();
      const monetization = $card.find('.ListingCard__monetization').text().trim();
      const age = $card.find('.ListingCard__age').text().trim();

      const listing = {
        listing_id: listingId,
        url: `https://flippa.com${link}`,
        title,
        description,
        asking_price: parseInt(priceText.replace(/[^0-9]/g, '')) || 0,
        monthly_profit: parseInt(profitText.replace(/[^0-9]/g, '')) || 0,
        monthly_revenue: parseInt(revenueText.replace(/[^0-9]/g, '')) || 0,
        profit_multiple: 0, // Will be calculated
        revenue_multiple: 0, // Will be calculated
        category,
        monetization,
        business_age: age,
        scraped_at: new Date().toISOString()
      };

      // Calculate multiples
      if (listing.asking_price > 0) {
        if (listing.monthly_profit > 0) {
          listing.profit_multiple = listing.asking_price / (listing.monthly_profit * 12);
        }
        if (listing.monthly_revenue > 0) {
          listing.revenue_multiple = listing.asking_price / (listing.monthly_revenue * 12);
        }
      }

      if (listing.listing_id && listing.title) {
        listings.push(listing);
      }

    } catch (error) {
      console.error('Error extracting listing:', error);
    }
  });

  return listings;
}

// Check if there's a next page
function checkHasNextPage(html: string): boolean {
  const $ = cheerio.load(html);
  const nextButton = $('button[aria-label="Go to next page"]');
  return nextButton.length > 0 && !nextButton.attr('disabled');
}

// Helper function to save listing data to database
async function saveListingData(data: any, sessionId: string) {
  try {
    const listing = {
      ...data,
      session_id: sessionId,
      source: 'premium-cascade-standard',
      extraction_method: 'commercial-services'
    };

    const { error } = await supabase
      .from('flippa_listings')
      .insert(listing);

    if (error) {
      console.error('Error saving listing:', error);
    }
  } catch (error) {
    console.error('Error processing listing data:', error);
  }
}

// Helper function to update session metrics
async function updateSessionMetrics(sessionId: string) {
  try {
    await supabase
      .from('scraping_sessions')
      .update({
        total_listings: sessionMetrics.listingsScraped,
        successful_extractions: sessionMetrics.listingsScraped,
        failed_extractions: sessionMetrics.errors,
        pages_processed: sessionMetrics.pagesVisited,
        last_activity: new Date().toISOString()
      })
      .eq('session_id', sessionId);
  } catch (error) {
    console.error('Error updating session metrics:', error);
  }
}

// WebSocket progress broadcasting
async function broadcastProgress(websocketUrl: string, type: string, sessionId: string) {
  try {
    const progressData = {
      type: 'scraping_progress',
      source: type,
      sessionId,
      timestamp: Date.now(),
      message: `Premium cascade: ${sessionMetrics.listingsScraped}/${sessionMetrics.targetListings} listings`,
      progress: {
        listingsScraped: sessionMetrics.listingsScraped,
        pagesVisited: sessionMetrics.pagesVisited,
        errors: sessionMetrics.errors,
        startTime: sessionMetrics.startTime,
        totalCost: sessionMetrics.totalCost,
        servicesUsed: sessionMetrics.servicesUsed,
        estimatedCompletion: sessionMetrics.listingsScraped > 0 ? 
          new Date(Date.now() + ((sessionMetrics.targetListings - sessionMetrics.listingsScraped) * 1000)) :
          null
      },
      metrics: {
        listingsPerMinute: sessionMetrics.listingsScraped / Math.max(1, (Date.now() - sessionMetrics.startTime) / 60000),
        successRate: sessionMetrics.pagesVisited > 0 ? 
          ((sessionMetrics.pagesVisited - sessionMetrics.errors) / sessionMetrics.pagesVisited) * 100 : 100,
        costPerListing: sessionMetrics.listingsScraped > 0 ? 
          sessionMetrics.totalCost / sessionMetrics.listingsScraped : 0
      }
    };

    console.log('📡 Broadcasting progress:', progressData);
    
  } catch (error) {
    console.error('Failed to broadcast progress:', error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  try {
    // Calculate performance metrics
    const elapsedTime = (Date.now() - sessionMetrics.startTime) / 1000 / 60; // minutes
    const listingsPerMinute = elapsedTime > 0 ? sessionMetrics.listingsScraped / elapsedTime : 0;
    const estimatedCompletion = listingsPerMinute > 0 ? 
      new Date(Date.now() + ((sessionMetrics.targetListings - sessionMetrics.listingsScraped) / listingsPerMinute) * 60 * 1000) : 
      null;

    const stats = cascadeManager?.getStatistics();

    return NextResponse.json({
      success: true,
      session: {
        sessionId: sessionId || `premium_${sessionMetrics.startTime}`,
        status: sessionMetrics.status,
        active: sessionMetrics.status === 'running'
      },
      progress: {
        listingsScraped: sessionMetrics.listingsScraped,
        pagesVisited: sessionMetrics.pagesVisited,
        errors: sessionMetrics.errors,
        targetListings: sessionMetrics.targetListings,
        progressPercentage: Math.round((sessionMetrics.listingsScraped / sessionMetrics.targetListings) * 100),
        elapsedTime: Math.round(elapsedTime),
        estimatedCompletion: estimatedCompletion?.toISOString() || null
      },
      performance: {
        listingsPerMinute: Math.round(listingsPerMinute * 10) / 10,
        successRate: sessionMetrics.listingsScraped > 0 ? 
          Math.round((sessionMetrics.listingsScraped / (sessionMetrics.listingsScraped + sessionMetrics.errors)) * 100) : 100,
        costPerListing: sessionMetrics.listingsScraped > 0 ? 
          sessionMetrics.totalCost / sessionMetrics.listingsScraped : 0,
        totalCost: sessionMetrics.totalCost,
        scrapeMethod: 'Premium Cascade System'
      },
      services: {
        used: sessionMetrics.servicesUsed,
        statistics: stats?.services,
        cache: stats?.cache,
        costs: stats?.costs
      },
      config: {
        approach: 'Commercial Services Cascade',
        services: cascadeManager ? Object.keys(stats?.services || {}) : [],
        cacheEnabled: true,
        cloudflareBypass: true
      }
    });

  } catch (error) {
    console.error('Error getting premium cascade status:', error);
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    sessionMetrics.status = 'idle';

    const finalMetrics = { ...sessionMetrics };

    if (cascadeManager) {
      await cascadeManager.cleanup();
      cascadeManager = null;
    }

    if (costOptimizer) {
      costOptimizer.cleanup();
      costOptimizer = null;
    }

    return NextResponse.json({
      success: true,
      message: 'Premium cascade scraping stopped successfully',
      finalMetrics: {
        ...finalMetrics,
        duration: Math.round((Date.now() - finalMetrics.startTime) / 1000 / 60), // minutes
        finalRate: finalMetrics.listingsScraped / Math.max(1, (Date.now() - finalMetrics.startTime) / 1000 / 60),
        totalCost: `$${finalMetrics.totalCost.toFixed(3)}`,
        averageCostPerListing: finalMetrics.listingsScraped > 0 ? 
          `$${(finalMetrics.totalCost / finalMetrics.listingsScraped).toFixed(3)}` : '$0.000'
      }
    });

  } catch (error) {
    console.error('Error stopping premium cascade scraping:', error);
    return NextResponse.json(
      { error: 'Failed to stop scraping', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}