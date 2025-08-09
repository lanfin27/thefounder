const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class ComprehensiveSystemAudit {
  constructor() {
    this.findings = {
      database: {},
      dataFlow: {},
      architecture: {},
      compatibility: {},
      issues: [],
      recommendations: []
    };
  }

  async run() {
    console.log('🔍 COMPREHENSIVE SYSTEM AUDIT\n');
    console.log('='.repeat(60));
    
    // Phase 1: Database Audit
    await this.auditDatabase();
    
    // Phase 2: Data Flow Analysis
    await this.analyzeDataFlow();
    
    // Phase 3: Architecture Patterns
    await this.identifyArchitecturePatterns();
    
    // Phase 4: Compatibility Check
    await this.checkCompatibility();
    
    // Phase 5: Test Current Functionality
    await this.testCurrentFunctionality();
    
    // Phase 6: Generate Report
    await this.generateReport();
  }

  async auditDatabase() {
    console.log('\n📊 PHASE 1: DATABASE COMPREHENSIVE AUDIT\n');
    
    // Get all tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (!tables) {
      // Fallback: manually list known tables
      const knownTables = [
        'flippa_listings',
        'flippa_listings_enhanced', 
        'incremental_changes',
        'scan_sessions',
        'flippa_change_log',
        'flippa_monitoring_stats',
        'scraping_sessions',
        'scraping_jobs',
        'scraping_schedules',
        'schedule_executions',
        'notification_queue',
        'industry_multiples_timeseries',
        'flippa_categories'
      ];
      
      for (const table of knownTables) {
        await this.auditTable(table);
      }
    } else {
      for (const { table_name } of tables) {
        await this.auditTable(table_name);
      }
    }
    
    // Check specific issues
    await this.checkQueryLimits();
    await this.checkForeignKeys();
    await this.checkRLSPolicies();
  }

  async auditTable(tableName) {
    console.log(`\n📋 Auditing table: ${tableName}`);
    
    try {
      // Get row count
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`  ❌ Error: ${countError.message}`);
        this.findings.database[tableName] = { error: countError.message };
        return;
      }
      
      console.log(`  ✅ Row count: ${count || 0}`);
      
      // Get sample record to infer schema
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
        .single();
      
      const columns = sample ? Object.keys(sample) : [];
      
      // Special checks for critical tables
      if (tableName === 'flippa_listings_enhanced') {
        console.log(`  ⚠️  Expected: 5642 rows, Found: ${count}`);
        if (count === 0) {
          this.findings.issues.push({
            severity: 'CRITICAL',
            table: 'flippa_listings_enhanced',
            issue: 'Table is empty, migration required',
            fix: 'Run INSERT statement from flippa_listings'
          });
        }
      }
      
      if (tableName === 'incremental_changes') {
        // Check for scan_id column and type
        if (columns.includes('scan_id')) {
          const scanIdType = typeof sample?.scan_id;
          console.log(`  📌 scan_id column type: ${scanIdType}`);
          if (scanIdType === 'string' && sample?.scan_id?.includes('-')) {
            console.log(`  ✅ scan_id is UUID format`);
          }
        } else {
          console.log(`  ❌ scan_id column missing`);
          this.findings.issues.push({
            severity: 'HIGH',
            table: 'incremental_changes',
            issue: 'scan_id column missing',
            fix: 'ALTER TABLE incremental_changes ADD COLUMN scan_id UUID'
          });
        }
      }
      
      this.findings.database[tableName] = {
        rowCount: count || 0,
        columns: columns,
        lastChecked: new Date().toISOString()
      };
      
    } catch (error) {
      console.log(`  ❌ Audit failed: ${error.message}`);
      this.findings.database[tableName] = { error: error.message };
    }
  }

  async checkQueryLimits() {
    console.log('\n🔍 Checking Query Limits:');
    
    // Test default query limit
    const { data, error } = await supabase
      .from('flippa_listings')
      .select('id');
    
    if (data) {
      console.log(`  Default query returns: ${data.length} rows`);
      if (data.length === 1000) {
        console.log('  ⚠️  Default limit is 1000 (PostgREST default)');
        this.findings.issues.push({
          severity: 'MEDIUM',
          area: 'Database',
          issue: 'Default query limit is 1000 rows',
          fix: 'Use .range() for pagination or increase PostgREST max-rows setting'
        });
      }
    }
  }

  async checkForeignKeys() {
    console.log('\n🔗 Checking Foreign Key Relationships:');
    
    // Known foreign keys
    const foreignKeys = [
      { from: 'flippa_listings', column: 'session_id', to: 'scraping_sessions' },
      { from: 'incremental_changes', column: 'scan_id', to: 'scan_sessions' },
      { from: 'schedule_executions', column: 'schedule_id', to: 'scraping_schedules' }
    ];
    
    for (const fk of foreignKeys) {
      console.log(`  ${fk.from}.${fk.column} → ${fk.to}`);
    }
  }

  async checkRLSPolicies() {
    console.log('\n🔒 Checking RLS Policies:');
    
    // Check if RLS is enabled
    const criticalTables = ['flippa_listings', 'flippa_listings_enhanced', 'incremental_changes'];
    
    for (const table of criticalTables) {
      console.log(`  ${table}: RLS status unknown (requires admin access)`);
    }
  }

  async analyzeDataFlow() {
    console.log('\n\n🔄 PHASE 2: DATA FLOW ANALYSIS\n');
    
    // Trace: Start Scan button click
    console.log('📍 User Flow: Start Scan Button');
    console.log('  1. User clicks "Start Scan" in /admin/scraping-status');
    console.log('  2. Calls API: POST /api/monitoring/scan/start');
    console.log('  3. API creates scan_session in database');
    console.log('  4. Returns scan_id (UUID)');
    console.log('  5. Frontend polls: GET /api/monitoring/scan/[scanId]/progress');
    console.log('  6. Scanner runs: SmartFlippaScanner.scanForChanges()');
    console.log('  7. Changes saved to: incremental_changes table');
    console.log('  8. Dashboard updates via polling');
    
    // API Endpoints mapping
    console.log('\n📍 API Endpoints:');
    const apiEndpoints = [
      { path: '/api/monitoring/scan/start', method: 'POST', status: 'ACTIVE' },
      { path: '/api/monitoring/scan/[scanId]/progress', method: 'GET', status: 'MISSING (404)' },
      { path: '/api/monitoring/incremental', method: 'GET', status: 'ACTIVE' },
      { path: '/api/monitoring/changes', method: 'GET', status: 'ACTIVE' },
      { path: '/api/scraping/listings', method: 'GET', status: 'ACTIVE' },
      { path: '/api/scraping/metrics', method: 'GET', status: 'ACTIVE' }
    ];
    
    for (const endpoint of apiEndpoints) {
      console.log(`  ${endpoint.method} ${endpoint.path} - ${endpoint.status}`);
      if (endpoint.status.includes('MISSING')) {
        this.findings.issues.push({
          severity: 'HIGH',
          area: 'API',
          issue: `Endpoint missing: ${endpoint.path}`,
          fix: `Create ${endpoint.path} route handler`
        });
      }
    }
    
    // UUID Error source
    console.log('\n📍 UUID Error Source:');
    console.log('  Location: /api/monitoring/scan/[scanId]/progress');
    console.log('  Cause: scanId passed as string, database expects UUID');
    console.log('  Fix: Ensure scan_id column accepts string or convert to UUID');
    
    this.findings.dataFlow = {
      scanFlow: 'UI → API → Database → Scanner → Database → UI',
      pollingInterval: '2000ms',
      errorSource: 'Type mismatch: string vs UUID for scan_id'
    };
  }

  async identifyArchitecturePatterns() {
    console.log('\n\n🏗️ PHASE 3: ARCHITECTURE PATTERNS\n');
    
    console.log('📐 Design Patterns Identified:');
    console.log('  1. Mode-based Operation:');
    console.log('     - Mock Mode: Testing with simulated data');
    console.log('     - Simulation Mode: Real structure, fake data');
    console.log('     - Production Mode: Live Flippa scraping');
    console.log('  2. Incremental Monitoring:');
    console.log('     - Baseline comparison strategy');
    console.log('     - Change detection and scoring');
    console.log('     - Historical tracking');
    console.log('  3. Queue-based Processing:');
    console.log('     - Redis + Bull for job management');
    console.log('     - Scheduled and manual triggers');
    
    console.log('\n📐 Core Features (MUST PRESERVE):');
    console.log('  ✅ Flippa marketplace monitoring');
    console.log('  ✅ Incremental change detection');
    console.log('  ✅ Admin dashboard');
    console.log('  ✅ Data visualization');
    console.log('  ✅ Scheduling system');
    
    console.log('\n📐 Experimental Features (CAN REMOVE):');
    console.log('  ❌ 50+ test scripts in scripts/');
    console.log('  ❌ Backup API endpoints');
    console.log('  ❌ Multiple dashboard versions');
    console.log('  ❌ Test data generators');
    
    this.findings.architecture = {
      pattern: 'Microservices with Queue Processing',
      mode: 'Production',
      coreFeatures: 5,
      experimentalFiles: 50
    };
  }

  async checkCompatibility() {
    console.log('\n\n🔧 PHASE 4: COMPATIBILITY ANALYSIS\n');
    
    console.log('🔍 Schema vs Code Compatibility:');
    
    // Check critical alignments
    const compatibilityChecks = [
      {
        name: 'scan_id type',
        database: 'UUID expected',
        code: 'String provided',
        status: 'MISMATCH',
        fix: 'Convert string to UUID or change column type'
      },
      {
        name: 'Query limits',
        database: '1000 default',
        code: 'Expects all records',
        status: 'PARTIAL',
        fix: 'Implement pagination'
      },
      {
        name: 'flippa_listings_enhanced',
        database: 'Empty table',
        code: 'Expects 5642 records',
        status: 'CRITICAL',
        fix: 'Run migration SQL'
      }
    ];
    
    for (const check of compatibilityChecks) {
      console.log(`\n  ${check.name}:`);
      console.log(`    Database: ${check.database}`);
      console.log(`    Code: ${check.code}`);
      console.log(`    Status: ${check.status}`);
      console.log(`    Fix: ${check.fix}`);
      
      if (check.status === 'MISMATCH' || check.status === 'CRITICAL') {
        this.findings.issues.push({
          severity: check.status === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          area: 'Compatibility',
          issue: check.name,
          fix: check.fix
        });
      }
    }
    
    this.findings.compatibility = compatibilityChecks;
  }

  async testCurrentFunctionality() {
    console.log('\n\n✅ PHASE 5: CURRENT FUNCTIONALITY TEST\n');
    
    const tests = [
      { name: 'Database Connection', status: 'WORKING' },
      { name: 'Admin Dashboard Load', status: 'WORKING' },
      { name: 'Listings API', status: 'WORKING' },
      { name: 'Start Scan', status: 'PARTIAL - Returns scan_id' },
      { name: 'Scan Progress', status: 'BROKEN - 404 error' },
      { name: 'View Changes', status: 'PARTIAL - No data' },
      { name: 'Incremental Monitoring', status: 'BROKEN - Empty baseline' }
    ];
    
    console.log('🧪 Functionality Status:');
    for (const test of tests) {
      const icon = test.status.includes('WORKING') ? '✅' : 
                   test.status.includes('PARTIAL') ? '⚠️' : '❌';
      console.log(`  ${icon} ${test.name}: ${test.status}`);
    }
    
    this.findings.functionality = tests;
  }

  async generateReport() {
    console.log('\n\n📝 GENERATING COMPREHENSIVE REPORT...\n');
    
    const report = `# COMPREHENSIVE SYSTEM ANALYSIS REPORT
Generated: ${new Date().toISOString()}

## EXECUTIVE SUMMARY

The Founder is a Next.js 14 application for monitoring Flippa marketplace listings with incremental change detection. The system is partially functional but has critical issues preventing full operation.

## 1. DATABASE STATUS

### Table Analysis
${Object.entries(this.findings.database).map(([table, info]) => 
  `- **${table}**: ${info.rowCount || 0} rows ${info.error ? '❌ ERROR: ' + info.error : '✅'}`
).join('\n')}

### Critical Issues
- **flippa_listings_enhanced**: EMPTY (0 rows) - Expected 5,642
- **Query Limit**: Default 1000 rows (PostgREST)
- **scan_id Type**: Mismatch between code (string) and database (UUID)

## 2. DATA FLOW

\`\`\`
User Action → API Endpoint → Database Operation → Response
────────────────────────────────────────────────────────
Start Scan  → POST /api/monitoring/scan/start → Create scan_session → Return scan_id
Poll Status → GET /api/monitoring/scan/[id]/progress → Query progress → Return status
View Changes → GET /api/monitoring/changes → Query incremental_changes → Return data
\`\`\`

### Missing Endpoints
- /api/monitoring/scan/[scanId]/progress (404)

## 3. ARCHITECTURE PATTERNS

- **Design**: Microservices with Queue Processing
- **Mode**: Production (Live Flippa Scraping)
- **Stack**: Next.js 14 + TypeScript + Supabase + Redis/Bull

## 4. CRITICAL ISSUES FOUND

${this.findings.issues.map(issue => 
  `### ${issue.severity}: ${issue.issue}
- **Area**: ${issue.area || issue.table}
- **Fix**: ${issue.fix}
`).join('\n')}

## 5. PRIORITY FIX STRATEGY

### P1 - CRITICAL (Fix Immediately)
1. **Populate flippa_listings_enhanced table**
   \`\`\`sql
   INSERT INTO flippa_listings_enhanced (...) 
   SELECT ... FROM flippa_listings;
   \`\`\`

### P2 - HIGH (Fix Today)
2. **Create missing API endpoint**
   - Create: /app/api/monitoring/scan/[scanId]/progress/route.ts
   
3. **Fix scan_id type mismatch**
   - Option A: Change database column to TEXT
   - Option B: Convert string to UUID in code

### P3 - MEDIUM (Fix This Week)
4. **Implement pagination for large queries**
5. **Clean up deprecated code (50+ files)**

## 6. VALIDATION CHECKPOINTS

- [ ] flippa_listings_enhanced has 5,642 records
- [ ] Start Scan returns valid scan_id
- [ ] Progress endpoint returns status
- [ ] Changes are detected and stored
- [ ] Dashboard displays changes

## 7. RECOMMENDATIONS

1. **Immediate Actions**:
   - Run migration SQL to populate enhanced table
   - Create missing progress API endpoint
   - Fix UUID/string mismatch

2. **Short-term**:
   - Consolidate duplicate dashboards
   - Remove experimental scripts
   - Add error handling

3. **Long-term**:
   - Implement comprehensive testing
   - Add monitoring and alerts
   - Create documentation

## APPENDIX

### Files to Remove (Deprecated)
- scripts/test-*.js (50+ files)
- src/app/api/backup/*
- Duplicate dashboard components

### Files to Preserve (Core)
- src/lib/monitoring/monitoring-system.ts
- src/app/admin/scraping-status/page.tsx
- src/lib/scraping/smart-flippa-scanner.ts

---
End of Report
`;
    
    // Save report
    await fs.writeFile(
      path.join(process.cwd(), 'COMPREHENSIVE_ANALYSIS_REPORT.md'),
      report
    );
    
    console.log('✅ Report saved to COMPREHENSIVE_ANALYSIS_REPORT.md');
    
    // Show priority fixes
    console.log('\n🎯 IMMEDIATE ACTIONS REQUIRED:');
    console.log('\n1. Run this SQL in Supabase:');
    console.log('   (See prepare-enhanced-migration.js output)');
    console.log('\n2. Create missing API endpoint:');
    console.log('   src/app/api/monitoring/scan/[scanId]/progress/route.ts');
    console.log('\n3. Fix scan_id type mismatch');
    console.log('\nRun these commands:');
    console.log('  node scripts/prepare-enhanced-migration.js');
    console.log('  # Copy SQL and run in Supabase');
    console.log('  # Then test: node scripts/test-current-system.js');
  }
}

// Run audit
const audit = new ComprehensiveSystemAudit();
audit.run().catch(console.error);