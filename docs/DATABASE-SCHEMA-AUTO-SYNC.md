# Automatic Database Schema Synchronization System

## Overview

The Automatic Database Schema Synchronization System provides zero-downtime, intelligent database schema management for The Founder application. It automatically detects missing columns, creates missing tables, handles schema mismatches, and provides comprehensive fallback functionality.

## 🏗️ System Architecture

### Core Components

1. **DatabaseSchemaManager** (`schema-manager.ts`)
   - Dynamic schema detection and validation
   - Column and table existence checking
   - Schema definition management

2. **DatabaseSchemaSynchronizer** (`schema-synchronizer.ts`) 
   - Multi-strategy automatic column creation
   - 5-tier fallback system for schema updates
   - Cross-environment compatibility

3. **DatabaseSchemaErrorHandler** (`schema-error-handler.ts`)
   - Comprehensive error pattern recognition
   - Automatic error classification and handling
   - Fallback operation management

4. **DatabaseSchemaInitializer** (`schema-initializer.ts`)
   - Application startup integration
   - Configuration management
   - Health monitoring and reporting

## 🚀 Key Features

### ✅ Dynamic Schema Detection
- Automatically detects missing columns when application starts
- Validates table structure against required schemas
- Identifies schema mismatches in real-time

### ✅ Automatic Column Creation
- Creates missing columns with appropriate default values
- Handles complex data types and constraints
- Preserves existing data during schema updates

### ✅ Multi-Strategy Fallback System
1. **Direct RPC Execution** (Priority 1) - Native database functions
2. **Custom Schema Functions** (Priority 2) - Supabase-specific helpers
3. **Incremental Detection** (Priority 3) - Insert-based column testing
4. **Table Recreation** (Priority 4) - Nuclear option with data preservation
5. **Manual Intervention** (Priority 5) - Logged SQL for manual execution

### ✅ Comprehensive Error Handling
- **Missing Column Errors** → Auto-add with defaults
- **Missing Table Errors** → Create with full schema  
- **Type Mismatch Errors** → Apply data transformation
- **Constraint Violations** → Review and suggest fixes

### ✅ Graceful Degradation
- Continues operation when schema updates fail
- Uses fallback values for missing columns
- Provides in-memory alternatives for missing tables
- Logs all issues for later resolution

## 📋 Required Database Schema

### scraping_sessions Table
```sql
CREATE TABLE scraping_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  method TEXT,
  status TEXT DEFAULT 'pending',
  total_listings INTEGER DEFAULT 0,
  successful_extractions INTEGER DEFAULT 0,
  failed_extractions INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  pages_visited INTEGER DEFAULT 0,
  extraction_rate NUMERIC(8,2) DEFAULT 0.0,
  stealth_level TEXT DEFAULT 'basic',
  browser_library TEXT DEFAULT 'playwright',
  session_type TEXT DEFAULT 'standard',
  -- ... additional columns
);
```

### scraped_data Table
```sql
CREATE TABLE scraped_data (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  data JSONB NOT NULL,
  source TEXT NOT NULL,
  -- ... additional columns
);
```

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 2. Import and Initialize
```typescript
import { initializeDatabaseSchema } from '@/lib/database';

// Initialize on application startup
const result = await initializeDatabaseSchema({
  enableAutoSync: true,
  enableFallbackMode: true,
  syncTimeout: 30000,
  gracefulDegradation: true
});
```

### 3. Middleware Integration (Automatic)
The system automatically initializes via Next.js middleware on first API request:

```typescript
// middleware.ts - Already configured
export async function middleware(request: NextRequest) {
  // Schema system initializes automatically for API routes
  // No additional configuration required
}
```

## 🎯 Usage Examples

### Basic Usage (Automatic)
```typescript
// No manual setup required - system initializes automatically
// when first database operation is attempted
```

### Safe Database Operations
```typescript
import { safeDbOperation } from '@/lib/database';

const result = await safeDbOperation(
  async () => {
    return await supabase
      .from('scraping_sessions')
      .insert({ 
        session_id: 'test',
        failed_extractions: 0 // This column will be auto-created if missing
      });
  },
  null, // fallback value
  { operationId: 'insert_session' } // context for error handling
);
```

### Health Monitoring
```typescript
import { performDatabaseSchemaHealthCheck } from '@/lib/database';

const health = await performDatabaseSchemaHealthCheck();
console.log('Database health:', health);
```

## ⚙️ Configuration Options

```typescript
interface InitializationConfig {
  enableAutoSync: boolean;        // Enable automatic schema synchronization
  enableFallbackMode: boolean;    // Enable fallback operations
  syncTimeout: number;            // Timeout for sync operations (ms)
  retryAttempts: number;          // Number of retry attempts
  gracefulDegradation: boolean;   // Continue with limited functionality
  skipNonCritical: boolean;       // Skip non-essential operations
}
```

### Environment-Specific Configurations

#### Production
```typescript
{
  enableAutoSync: true,
  enableFallbackMode: true,
  syncTimeout: 45000,
  retryAttempts: 5,
  gracefulDegradation: true
}
```

#### Development
```typescript
{
  enableAutoSync: true,
  enableFallbackMode: true,
  syncTimeout: 15000,
  retryAttempts: 3,
  gracefulDegradation: true
}
```

#### Read-Only/CI
```typescript
{
  enableAutoSync: false,
  enableFallbackMode: true,
  gracefulDegradation: true
}
```

## 🔍 Monitoring & Debugging

### Schema Status
```typescript
import { getDatabaseSchemaStatus } from '@/lib/database';

const status = getDatabaseSchemaStatus();
console.log('Schema status:', status);
```

### Error Statistics
```typescript
import { getDatabaseErrorStats } from '@/lib/database';

const stats = getDatabaseErrorStats();
console.log('Error stats:', stats);
```

### Health Check API
```http
GET /api/health/schema
```

## 🚨 Error Handling

### Automatic Error Recovery
The system automatically handles common schema errors:

1. **Missing Column** → Adds column with appropriate default
2. **Missing Table** → Creates table with full schema
3. **Type Mismatch** → Applies data transformation or uses fallback
4. **Connection Issues** → Enables fallback mode

### Manual Intervention
When automatic repair fails, the system generates manual SQL:

```sql
-- Generated SQL for manual execution
ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS failed_extractions INTEGER DEFAULT 0;
ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS stealth_level TEXT DEFAULT 'basic';
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_status ON scraping_sessions(status);
```

## 🔄 Fallback Strategies

### Column-Level Fallbacks
- Missing columns → Use default values
- Type mismatches → Apply transformations
- Constraint violations → Skip problematic data

### Table-Level Fallbacks  
- Missing tables → Use in-memory storage
- Connection failures → Cache operations locally
- Permission issues → Enable read-only mode

### Application-Level Fallbacks
- Schema unavailable → Continue with core functionality
- All operations fail → Enable maintenance mode
- Critical errors → Generate alerts and notifications

## 📊 Performance Considerations

### Initialization Performance
- Schema validation: ~100-500ms
- Column creation: ~200-1000ms per column
- Table creation: ~500-2000ms per table
- Index creation: ~100-500ms per index

### Runtime Performance
- Safe operations add ~10-50ms overhead
- Error handling: ~50-200ms for recovery
- Fallback mode: Minimal performance impact

### Memory Usage
- Schema definitions: ~1-5MB
- Error history: ~100KB-1MB
- Fallback cache: ~10-100MB depending on usage

## 🛠️ Troubleshooting

### Common Issues

#### 1. Schema Initialization Timeout
```typescript
// Increase timeout in configuration
{
  syncTimeout: 60000, // 60 seconds
  retryAttempts: 5
}
```

#### 2. Permission Errors
```sql
-- Grant necessary permissions in Supabase
GRANT CREATE ON SCHEMA public TO service_role;
GRANT ALTER ON ALL TABLES IN SCHEMA public TO service_role;
```

#### 3. Manual SQL Execution Required
1. Go to Supabase Dashboard → SQL Editor
2. Execute generated SQL from console logs
3. Restart application to re-validate schema

#### 4. Fallback Mode Stuck
```typescript
import { emergencyDatabaseSchemaReset } from '@/lib/database';

// Reset and reinitialize
await emergencyDatabaseSchemaReset();
await initializeDatabaseSchema();
```

### Debug Logging
Enable detailed logging by setting:
```bash
LOG_LEVEL=debug
```

## 📈 Best Practices

### Development
1. Run schema validation before deployment
2. Test with empty database to verify table creation
3. Monitor initialization logs for warnings
4. Use development configuration for faster iteration

### Production
1. Use production configuration with longer timeouts
2. Monitor schema health via API endpoints
3. Set up alerts for manual intervention requirements
4. Regularly review error statistics and patterns

### Deployment
1. Test schema changes in staging environment
2. Have manual SQL ready for complex migrations
3. Monitor application startup for schema issues
4. Plan for gradual rollout of schema changes

## 🔗 Integration Points

### API Routes
All API routes automatically benefit from schema synchronization via middleware.

### Supabase Client
Works seamlessly with existing Supabase client code.

### Error Monitoring
Integrates with application error monitoring and logging systems.

### Health Checks
Provides detailed health information for monitoring dashboards.

## 📝 Maintenance

### Regular Tasks
1. Review error statistics weekly
2. Clean up error history monthly
3. Update schema definitions as needed
4. Monitor performance metrics

### Version Updates
1. Test schema compatibility with new versions
2. Update fallback strategies if needed
3. Review and update configuration settings
4. Validate integration points after updates

---

## 🎯 Quick Start Checklist

- [ ] System is automatically installed via middleware
- [ ] Database connection configured in environment
- [ ] First API request triggers initialization
- [ ] Monitor console for schema synchronization logs
- [ ] Test Standard Scraper button functionality
- [ ] Check `/api/health/schema` endpoint
- [ ] Review any manual intervention requirements

The Automatic Database Schema Synchronization System provides robust, intelligent database management that keeps your application running smoothly while handling schema evolution transparently.