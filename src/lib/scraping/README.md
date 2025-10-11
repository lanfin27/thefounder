# Flippa Scraping System Implementation Guide

## Quick Start

### 1. Install Dependencies

```bash
# Core scraping dependencies
npm install playwright @playwright/browsers
npm install bull ioredis
npm install cheerio
npm install p-limit
npm install winston

# Development dependencies
npm install --save-dev @types/bull
```

### 2. Environment Variables

Add to `.env.local`:

```env
# Redis for job queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Proxy settings (optional)
USE_PROXY=false
PROXY_SERVER=
PROXY_USERNAME=
PROXY_PASSWORD=

# Scraping settings
SCRAPING_ENABLED=true
SCRAPING_HEADLESS=true
LOG_LEVEL=info
```

### 3. Database Setup

Run the migration:
```bash
npx supabase migration up
```

Or manually execute:
```
supabase/migrations/20250102_flippa_scraping_tables.sql
```

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cron Job  │────▶│  Job Queue  │────▶│  Scraper    │
│ (Scheduler) │     │   (Bull)    │     │ (Playwright)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Monitor   │     │  Parser     │
                    │ (Dashboard) │     │ (Cheerio)   │
                    └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Database   │
                                        │ (Supabase)  │
                                        └─────────────┘
```

## Implementation Phases

### Phase 1: Basic Scraper (Week 1)
- [x] Type definitions
- [x] Configuration
- [x] Logger setup
- [x] Database schema
- [ ] Basic Flippa scraper class
- [ ] Category discovery
- [ ] Single listing scraper

### Phase 2: Job Queue (Week 2)
- [ ] Bull queue setup
- [ ] Job processors
- [ ] Error handling
- [ ] Retry logic
- [ ] Rate limiting

### Phase 3: Data Processing (Week 3)
- [ ] Statistics calculator
- [ ] Data validation
- [ ] Anomaly detection
- [ ] Chart data integration

### Phase 4: Production (Week 4)
- [ ] Admin dashboard
- [ ] Monitoring
- [ ] Alerts
- [ ] Performance optimization

## Key Files

```
src/lib/scraping/
├── flippa/
│   ├── types.ts          # Type definitions
│   ├── scraper.ts        # Main scraper class
│   ├── parser.ts         # HTML parsing logic
│   └── validator.ts      # Data validation
├── queue/
│   ├── setup.ts          # Queue configuration
│   ├── processors.ts     # Job processors
│   └── scheduler.ts      # Cron scheduling
├── statistics/
│   ├── calculator.ts     # Statistics engine
│   └── aggregator.ts     # Data aggregation
├── utils/
│   ├── logger.ts         # Logging utility
│   └── metrics.ts        # Performance metrics
├── config.ts             # Configuration
└── README.md            # This file
```

## Testing

### Manual Testing
```typescript
// Test category discovery
const scraper = new FlippaScraper()
await scraper.initialize()
const categories = await scraper.scrapeCategories()
console.log(categories)

// Test single listing
const listings = await scraper.scrapeListings('saas', 1)
console.log(listings[0])
```

### Job Queue Testing
```typescript
// Add test job
await scrapingQueue.add('scan-categories', {
  jobId: 'test-job-1',
  test: true
})

// Monitor progress
scrapingQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result)
})
```

## Monitoring

### Key Metrics
- Scraping success rate
- Average response time
- Data quality score
- Queue backlog size
- Error rate by category

### Alerts
- Success rate < 90%
- Response time > 5s
- Queue backlog > 1000
- High error rate

## Best Practices

1. **Respectful Scraping**
   - 2-5 second delays between requests
   - Maximum 3 concurrent connections
   - Respect robots.txt

2. **Error Handling**
   - Retry with exponential backoff
   - Log all errors with context
   - Graceful degradation

3. **Data Quality**
   - Validate all scraped data
   - Check for anomalies
   - Score data quality

4. **Performance**
   - Use connection pooling
   - Batch database inserts
   - Cache frequently accessed data

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   - Increase delays
   - Use proxy rotation
   - Reduce concurrent requests

2. **Selector Changes**
   - Update selectors in config
   - Implement fallback selectors
   - Monitor selector success rate

3. **Memory Leaks**
   - Close browser pages properly
   - Limit concurrent browsers
   - Monitor memory usage

## Next Steps

1. Implement basic scraper class
2. Set up Redis for job queue
3. Create admin monitoring page
4. Deploy to staging environment
5. Run initial category scan
6. Monitor and optimize

## Support

For issues or questions:
- Check logs in `logs/` directory
- Monitor Supabase dashboard
- Review job queue status

---

Last updated: 2025-01-02