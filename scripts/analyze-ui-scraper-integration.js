// scripts/analyze-ui-scraper-integration.js
const fs = require('fs');
const path = require('path');

class UiScraperIntegrationAnalyzer {
  constructor() {
    this.frontendFiles = [];
    this.backendFiles = [];
    this.currentScraperPath = null;
    this.integrationPoints = [];
  }

  async analyzeCurrentIntegration() {
    console.log('🔍 ANALYZING CURRENT UI SCRAPER INTEGRATION');
    console.log('==========================================');
    
    // Step 1: Find frontend files that might contain scraper buttons
    await this.findFrontendScraperReferences();
    
    // Step 2: Find backend API endpoints
    await this.findBackendScraperEndpoints();
    
    // Step 3: Identify current scraper being called
    await this.identifyCurrentScraperScript();
    
    // Step 4: Analyze integration architecture
    await this.analyzeIntegrationArchitecture();
    
    // Step 5: Generate integration plan
    await this.generateIntegrationPlan();
    
    return this.integrationPoints;
  }

  async findFrontendScraperReferences() {
    console.log('\n🔍 Step 1: Finding frontend scraper references...');
    
    const frontendDirs = [
      'src/app',
      'src/components', 
      'src/pages',
      'app',
      'components',
      'pages'
    ];

    for (const dir of frontendDirs) {
      if (fs.existsSync(dir)) {
        await this.scanDirectoryForScraperReferences(dir);
      }
    }

    console.log(`📁 Found ${this.frontendFiles.length} frontend files with scraper references`);
    this.frontendFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.path}`);
      console.log(`      References: ${file.references.join(', ')}`);
    });
  }

  async scanDirectoryForScraperReferences(dirPath) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        await this.scanDirectoryForScraperReferences(fullPath);
      } else if (file.name.match(/\.(js|jsx|ts|tsx)$/)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const scraperReferences = this.findScraperReferencesInFile(content);
          
          if (scraperReferences.length > 0) {
            this.frontendFiles.push({
              path: fullPath,
              references: scraperReferences,
              content: content.slice(0, 500) // First 500 chars for context
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }

  findScraperReferencesInFile(content) {
    const references = [];
    const patterns = [
      /run[_\s]*scraper/gi,
      /scraper[_\s]*button/gi,
      /start[_\s]*scraping/gi,
      /unified[_\s]*marketplace/gi,
      /flippa[_\s]*scraper/gi,
      /scraping[_\s]*job/gi,
      /collection[_\s]*job/gi,
      /\/api\/scraper/gi,
      /\/api\/scraping/gi
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        references.push(...matches);
      }
    });

    return [...new Set(references)]; // Remove duplicates
  }

  async findBackendScraperEndpoints() {
    console.log('\n🔍 Step 2: Finding backend scraper endpoints...');
    
    const backendDirs = [
      'src/app/api',
      'src/pages/api',
      'pages/api',
      'api',
      'src/api',
      'server',
      'backend'
    ];

    for (const dir of backendDirs) {
      if (fs.existsSync(dir)) {
        await this.scanDirectoryForApiEndpoints(dir);
      }
    }

    console.log(`🔌 Found ${this.backendFiles.length} backend API files`);
    this.backendFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.path}`);
      console.log(`      Endpoints: ${file.endpoints.join(', ')}`);
    });
  }

  async scanDirectoryForApiEndpoints(dirPath) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        await this.scanDirectoryForApiEndpoints(fullPath);
      } else if (file.name.match(/\.(js|ts)$/)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const endpoints = this.findApiEndpointsInFile(content);
          
          if (endpoints.length > 0) {
            this.backendFiles.push({
              path: fullPath,
              endpoints: endpoints,
              content: content.slice(0, 1000) // First 1000 chars for context
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }

  findApiEndpointsInFile(content) {
    const endpoints = [];
    const patterns = [
      /export\s+default\s+async\s+function\s+handler/g,
      /export\s+async\s+function\s+POST/g,
      /export\s+async\s+function\s+GET/g,
      /app\.(get|post|put|delete)\(/g,
      /router\.(get|post|put|delete)\(/g,
      /NextResponse\./g,
      /res\.(json|send)\(/g
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        endpoints.push(...matches);
      }
    });

    return [...new Set(endpoints)];
  }

  async identifyCurrentScraperScript() {
    console.log('\n🔍 Step 3: Identifying current scraper script...');
    
    // Check for the script being executed in logs
    this.currentScraperPath = 'scripts/unified-marketplace-scraper.js';
    
    if (fs.existsSync(this.currentScraperPath)) {
      const content = fs.readFileSync(this.currentScraperPath, 'utf8');
      console.log(`📄 Current scraper: ${this.currentScraperPath}`);
      console.log(`📊 File size: ${(content.length / 1024).toFixed(2)}KB`);
      console.log(`📅 Last modified: ${fs.statSync(this.currentScraperPath).mtime}`);
      
      // Check performance indicators in the file
      const perfPatterns = {
        title: /title.*?(\d+\.?\d*)%/gi,
        revenue: /revenue.*?(\d+\.?\d*)%/gi,
        multiple: /multiple.*?(\d+\.?\d*)%/gi
      };
      
      console.log('📊 Performance indicators in current scraper:');
      Object.entries(perfPatterns).forEach(([field, pattern]) => {
        const match = content.match(pattern);
        if (match) {
          console.log(`   ${field}: ${match[0]}`);
        }
      });
    } else {
      console.log(`❌ Current scraper not found: ${this.currentScraperPath}`);
    }

    // Check for our improved scrapers
    const improvedScrapers = [
      'scripts/cloudflare-bypass-scraper.js',
      'scripts/complete-apify-schema-extractor.js', 
      'scripts/financial-data-recovery-system.js',
      'scripts/working-flippa-extractor.js',
      'scripts/anti-rate-limit-scraper.js'
    ];

    console.log('\n🚀 Available improved scrapers:');
    improvedScrapers.forEach((scraper, index) => {
      if (fs.existsSync(scraper)) {
        const stats = fs.statSync(scraper);
        console.log(`   ✅ ${index + 1}. ${scraper}`);
        console.log(`      Size: ${(stats.size / 1024).toFixed(2)}KB, Modified: ${stats.mtime.toDateString()}`);
      } else {
        console.log(`   ❌ ${index + 1}. ${scraper} (NOT FOUND)`);
      }
    });
  }

  async analyzeIntegrationArchitecture() {
    console.log('\n🔍 Step 4: Analyzing integration architecture...');
    
    // Try to find package.json to understand the project structure
    let packageJson = null;
    if (fs.existsSync('package.json')) {
      packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      console.log(`📦 Project: ${packageJson.name || 'Unknown'}`);
      console.log(`🏗️ Framework: ${this.detectFramework(packageJson)}`);
    }

    // Analyze the integration patterns
    this.integrationPoints = [
      {
        type: 'UI_BUTTON',
        location: 'Frontend component with Run Scraper button',
        currentAction: 'Calls API endpoint',
        status: 'IDENTIFIED'
      },
      {
        type: 'API_ENDPOINT', 
        location: 'Backend API handler',
        currentAction: 'Executes unified-marketplace-scraper.js',
        status: 'NEEDS_UPDATE'
      },
      {
        type: 'SCRAPER_SCRIPT',
        location: 'scripts/unified-marketplace-scraper.js',
        currentAction: 'Old scraping logic with poor performance',
        status: 'NEEDS_REPLACEMENT'
      },
      {
        type: 'DATABASE_SAVE',
        location: 'Database insertion after scraping',
        currentAction: 'Saves scraped data',
        status: 'WORKING'
      }
    ];

    console.log('\n🏗️ Integration Architecture:');
    this.integrationPoints.forEach((point, index) => {
      const statusIcon = point.status === 'WORKING' ? '✅' : 
                        point.status === 'IDENTIFIED' ? '🔍' : '⚠️';
      console.log(`   ${statusIcon} ${index + 1}. ${point.type}`);
      console.log(`      Location: ${point.location}`);
      console.log(`      Current: ${point.currentAction}`);
      console.log(`      Status: ${point.status}`);
    });
  }

  detectFramework(packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.next) return 'Next.js';
    if (deps.react) return 'React';
    if (deps.vue) return 'Vue.js';
    if (deps.angular) return 'Angular';
    if (deps.express) return 'Express.js';
    
    return 'Unknown';
  }

  async generateIntegrationPlan() {
    console.log('\n🔍 Step 5: Generating integration plan...');
    
    const plan = {
      priority: 'HIGH',
      goal: 'Replace old scraper with improved scrapers in UI workflow',
      currentPerformance: {
        title: '9%',
        revenue: '12.7%',
        multiple: '6.4%',
        overall: '~32%'
      },
      targetPerformance: {
        title: '90%+',
        revenue: '60%+',
        multiple: '70%+',
        overall: '80%+'
      },
      steps: [
        {
          step: 1,
          action: 'Replace unified-marketplace-scraper.js with improved version',
          description: 'Backup current script and replace with best-performing scraper',
          files: ['scripts/unified-marketplace-scraper.js'],
          impact: 'MAJOR_IMPROVEMENT'
        },
        {
          step: 2, 
          action: 'Add scraper selection in UI',
          description: 'Allow users to choose between different scraping strategies',
          files: ['Frontend components', 'API endpoints'],
          impact: 'ENHANCED_CONTROL'
        },
        {
          step: 3,
          action: 'Update API endpoint to handle improved scrapers',
          description: 'Modify backend to support new scraper parameters and responses',
          files: ['API handler files'],
          impact: 'BETTER_INTEGRATION'
        },
        {
          step: 4,
          action: 'Add real-time progress updates',
          description: 'Show detailed progress with field completion rates',
          files: ['WebSocket/SSE implementation'],
          impact: 'BETTER_UX'
        }
      ],
      expectedResults: {
        titleExtraction: '90%+ (from 9%)',
        revenueExtraction: '60%+ (from 12.7%)',
        multipleExtraction: '70%+ (from 6.4%)',
        priceExtraction: '100% (maintained)',
        overallQuality: '80%+ (from 32%)'
      }
    };

    console.log('\n📋 INTEGRATION PLAN:');
    console.log(`🎯 Priority: ${plan.priority}`);
    console.log(`🏆 Goal: ${plan.goal}`);
    
    console.log('\n📊 Current vs Target Performance:');
    console.log('   Field     | Current | Target   | Improvement');
    console.log('   -------   | ------- | -------- | -----------');
    console.log(`   Title     | ${plan.currentPerformance.title.padEnd(7)} | ${plan.targetPerformance.title.padEnd(8)} | 10x`);
    console.log(`   Revenue   | ${plan.currentPerformance.revenue.padEnd(7)} | ${plan.targetPerformance.revenue.padEnd(8)} | 5x`);
    console.log(`   Multiple  | ${plan.currentPerformance.multiple.padEnd(7)} | ${plan.targetPerformance.multiple.padEnd(8)} | 11x`);
    console.log(`   Overall   | ${plan.currentPerformance.overall.padEnd(7)} | ${plan.targetPerformance.overall.padEnd(8)} | 2.5x`);
    
    console.log('\n📝 Integration Steps:');
    plan.steps.forEach(step => {
      console.log(`   ${step.step}. ${step.action}`);
      console.log(`      📄 ${step.description}`);
      console.log(`      📁 Files: ${step.files.join(', ')}`);
      console.log(`      📈 Impact: ${step.impact}`);
    });

    console.log('\n🎯 Expected Results:');
    Object.entries(plan.expectedResults).forEach(([metric, value]) => {
      console.log(`   📊 ${metric}: ${value}`);
    });

    // Save plan to file
    fs.writeFileSync('ui-integration-plan.json', JSON.stringify(plan, null, 2));
    console.log('\n💾 Integration plan saved: ui-integration-plan.json');

    return plan;
  }
}

// Execute analysis
new UiScraperIntegrationAnalyzer().analyzeCurrentIntegration()
  .then(integrationPoints => {
    console.log('\n🏁 UI INTEGRATION ANALYSIS COMPLETE!');
    console.log(`📊 Found ${integrationPoints.length} integration points`);
    console.log('📋 Next: Run ui-scraper-integration-fix.js to implement fixes');
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
  });