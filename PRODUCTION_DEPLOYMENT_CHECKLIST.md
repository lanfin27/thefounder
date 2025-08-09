# Production Deployment Checklist

## Pre-Deployment Requirements

### 1. Environment Setup
- [ ] **Node.js** version 18.x or higher installed
- [ ] **npm** version 9.x or higher installed
- [ ] **Git** installed and configured
- [ ] **Supabase** account created
- [ ] **Vercel** account created (recommended for deployment)

### 2. Database Setup
- [ ] Supabase project created
- [ ] Database schema imported (`supabase/migrations/001_initial_schema.sql`)
- [ ] RLS policies configured (`supabase/migrations/002_configure_rls.sql`)
- [ ] Service role key obtained
- [ ] Anon key obtained
- [ ] Database URL obtained

### 3. Environment Variables
Create `.env.local` with the following:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: FlareSolverr (for real scraping)
FLARESOLVERR_URL=http://localhost:8191/v1

# Monitoring Mode
MONITORING_MODE=production  # or 'mock' for testing
```

## Deployment Steps

### 1. Code Preparation
- [ ] Run `npm install` to install dependencies
- [ ] Run `npm run build` to test build process
- [ ] Fix any TypeScript errors
- [ ] Run `npm run lint` and fix any linting issues
- [ ] Test all critical features locally

### 2. Database Migration
- [ ] Backup existing data (if any)
- [ ] Run migration script: `node scripts/create-migration-session.js`
- [ ] Run data import: `node scripts/migrate-with-session.js`
- [ ] Verify data in Supabase dashboard
- [ ] Test data access from application

### 3. Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Or use CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### 4. Post-Deployment Configuration
- [ ] Update Supabase URL allowlist with production domain
- [ ] Configure CORS settings if needed
- [ ] Set up monitoring alerts
- [ ] Configure automated backups

### 5. Monitoring Setup
#### Option A: Vercel Cron Jobs (Recommended)
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/monitoring/cron",
    "schedule": "0 * * * *"
  }]
}
```

#### Option B: External Monitoring
- [ ] Set up external cron service (cron-job.org, EasyCron)
- [ ] Configure to call: `https://your-domain.vercel.app/api/monitoring/scan`
- [ ] Set hourly schedule
- [ ] Configure failure notifications

### 6. Security Checklist
- [ ] Remove all console.log statements with sensitive data
- [ ] Ensure service role key is NOT exposed to client
- [ ] Enable Supabase RLS on all tables
- [ ] Set up API rate limiting
- [ ] Configure proper CORS headers
- [ ] Enable HTTPS (automatic with Vercel)

### 7. Performance Optimization
- [ ] Enable Next.js Image Optimization
- [ ] Configure proper caching headers
- [ ] Enable Vercel Edge Functions for API routes
- [ ] Set up CDN for static assets
- [ ] Monitor Core Web Vitals

### 8. Monitoring & Analytics
- [ ] Set up Vercel Analytics
- [ ] Configure error tracking (Sentry recommended)
- [ ] Set up uptime monitoring
- [ ] Configure database query performance monitoring
- [ ] Set up log aggregation

## Testing Checklist

### 1. Functionality Tests
- [ ] Dashboard loads with correct data count
- [ ] Scraping status page shows real-time updates
- [ ] Flippa listings browser works with pagination
- [ ] Search functionality works
- [ ] Export functionality works
- [ ] All API endpoints return correct data

### 2. Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] Database queries optimized
- [ ] No memory leaks in monitoring tasks

### 3. Security Tests
- [ ] No exposed API keys in source
- [ ] RLS policies prevent unauthorized access
- [ ] API routes properly authenticated
- [ ] No SQL injection vulnerabilities
- [ ] XSS protection enabled

## Rollback Plan

### 1. Quick Rollback
```bash
# Vercel automatic rollback
vercel rollback

# Or use Vercel dashboard to promote previous deployment
```

### 2. Database Rollback
- [ ] Keep backup of previous database state
- [ ] Document migration reverse scripts
- [ ] Test rollback procedure

## Maintenance Tasks

### Daily
- [ ] Check monitoring logs
- [ ] Verify new listings are being captured
- [ ] Check for any error alerts

### Weekly
- [ ] Review performance metrics
- [ ] Check database size and optimize if needed
- [ ] Review and clean up old logs

### Monthly
- [ ] Update dependencies
- [ ] Review and optimize database queries
- [ ] Check for security updates
- [ ] Review monitoring accuracy

## Support Information

### Key Files
- Main app: `/src/app`
- API routes: `/src/app/api`
- Database scripts: `/scripts`
- Monitoring: `/src/lib/monitoring`

### Troubleshooting
1. **No data showing**: Check RLS policies and API keys
2. **Monitoring not running**: Check cron configuration
3. **Slow performance**: Check database indexes
4. **API errors**: Check service role key configuration

### Contact
- Documentation: `/docs`
- Issues: GitHub Issues
- Logs: Check Vercel Functions logs

## Sign-off
- [ ] Development team approval
- [ ] QA testing complete
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Deployment approved

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Version**: _______________