# 🥷 Stealth-Mode Data Collection Architecture

A sophisticated, undetectable web data collection system featuring multi-layer proxy rotation, headless browser optimization, intelligent extraction, error recovery, and real-time adaptation algorithms.

## 🚀 Key Features

### 1. **Multi-Layer Proxy Rotation System**
- **4 Major Providers**: Luminati, SmartProxy, Oxylabs, GeoSurf
- **Geographic Distribution**: Natural user demographics across 7+ countries
- **Proxy Types**: Residential (60%), Datacenter (30%), Mobile (10%)
- **Health Monitoring**: Real-time latency and success rate tracking
- **Smart Rotation**: Based on detection events and performance metrics
- **Sticky Sessions**: Maintain consistency when needed

### 2. **Headless Browser Optimization**
- **Stealth Plugins**: Puppeteer-extra-plugin-stealth integration
- **CAPTCHA Solving**: ReCaptcha v2/v3, hCaptcha, Cloudflare
- **Resource Blocking**: Selective loading for performance
- **JavaScript Execution**: Full JS support with stealth modifications
- **WebDriver Detection**: Override automation indicators
- **Fingerprint Spoofing**: Dynamic browser characteristics

### 3. **Intelligent Data Extraction**
- **Human Reading Patterns**: F-pattern, Z-pattern, layer-cake scanning
- **Visual Attention**: Heatmap generation and focus simulation
- **Natural Timing**: Reading speed variations (250 WPM average)
- **Semantic Understanding**: NLP-based content comprehension
- **Adaptive Selectors**: Self-healing selector mechanisms
- **Quality Validation**: Multi-level data verification

### 4. **Advanced Error Handling & Recovery**
- **Detection Response**: Graceful handling of anti-bot measures
- **Circuit Breakers**: Prevent cascading failures
- **Recovery Strategies**: 10+ automated recovery mechanisms
- **Pattern Learning**: Remember successful resolutions
- **Adaptation Triggers**: Real-time behavior adjustments
- **Fallback Options**: Alternative data sources and methods

### 5. **Real-Time Adaptation Algorithms**
- **Machine Learning**: Learn from successful/failed interactions
- **Pattern Recognition**: Temporal, behavioral, and navigation patterns
- **Performance Models**: Optimize based on historical data
- **Detection Avoidance**: Proactive anti-detection measures
- **Strategy Evolution**: Continuous improvement of techniques
- **Persistent Learning**: Save and load learned behaviors

## 📦 Installation

```bash
# Install dependencies
npm install playwright puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
npm install puppeteer-extra-plugin-recaptcha puppeteer-extra-plugin-adblocker
npm install axios socks-proxy-agent https-proxy-agent
npm install natural opencv4nodejs geoip-lite

# Additional system requirements
# Windows: Install Visual Studio Build Tools
# macOS: brew install cmake
# Linux: sudo apt-get install cmake build-essential
```

## 🚀 Quick Start

```javascript
const StealthModeCollectionSystem = require('./stealth-mode-collection');

// Initialize the system
const collector = new StealthModeCollectionSystem({
  maxConcurrentSessions: 5,
  geoDistribution: {
    'US': 0.45,
    'CA': 0.10,
    'GB': 0.15,
    'AU': 0.10,
    'DE': 0.05,
    'FR': 0.05,
    'JP': 0.05,
    'OTHER': 0.05
  }
});

// Create a stealth session
const session = await collector.createStealthSession({
  targetCountry: 'US',
  optimizationStrategy: 'balanced'
});

// Collect data
const result = await collector.collectDataStealthily(
  session.id,
  'https://flippa.com/websites',
  { dataType: 'listing' }
);

// Process results
console.log('Extracted items:', result.data.length);
console.log('Confidence:', result.metadata.confidence.overall);

// Close session
await collector.closeSession(session.id);
```

## 🔧 Advanced Configuration

### Proxy Configuration
```javascript
{
  providers: ['luminati', 'smartproxy', 'oxylabs', 'geosurf'],
  minProxies: 100,
  rotationInterval: 50, // requests per proxy
  healthCheckInterval: 300000, // 5 minutes
  geoDistribution: {
    'US': 0.45,
    'CA': 0.10,
    'GB': 0.15,
    // ... more countries
  }
}
```

### Browser Optimization
```javascript
{
  headless: true,
  jsEnabled: true,
  imagesEnabled: false,
  captchaSolving: {
    enabled: true,
    providers: ['2captcha', 'anticaptcha'],
    maxAttempts: 3
  },
  performance: {
    cacheEnabled: true,
    resourceBlocking: ['font', 'media'],
    parallelRequests: 6
  }
}
```

### Data Extraction
```javascript
{
  extractionStrategy: 'human-like',
  readingSpeed: 250, // WPM
  scanPattern: 'F-pattern',
  focusPriority: ['price', 'title', 'key-metrics'],
  visualAnalysis: true,
  semanticUnderstanding: true,
  confidenceThreshold: 0.8
}
```

### Error Recovery
```javascript
{
  maxRetries: 3,
  backoffMultiplier: 1.5,
  detectionThreshold: 5,
  recoveryStrategies: ['delay', 'rotate', 'adapt', 'fallback'],
  learningEnabled: true
}
```

### Adaptive Learning
```javascript
{
  learningRate: 0.1,
  memorySize: 10000,
  adaptationThreshold: 0.8,
  persistenceEnabled: true,
  explorationRate: 0.1
}
```

## 🛡️ Anti-Detection Features

### 1. Browser Fingerprinting
- Randomized WebGL parameters
- Canvas noise injection
- Audio context variations
- Plugin enumeration spoofing
- Font list randomization
- Screen resolution diversity

### 2. Behavioral Patterns
- Natural mouse movements with Bezier curves
- Variable typing speeds with mistakes
- Reading simulation with backtracking
- Random micro-pauses and distractions
- Tab switching behavior
- Scroll momentum and overshooting

### 3. Network Patterns
- Referrer chain simulation
- Cookie acceptance patterns
- Session persistence
- Bandwidth throttling
- Request timing variations
- Geographic consistency

### 4. Recovery Mechanisms
- Exponential backoff with jitter
- Identity rotation (proxy + fingerprint)
- Behavioral noise injection
- Selector adaptation
- CAPTCHA solving
- Fallback data sources

## 📊 Metrics & Monitoring

The system provides comprehensive metrics:

```javascript
const metrics = collector.getMetrics();

// Output:
{
  runtime: "45m 23s",
  sessions: {
    created: 150,
    active: 5
  },
  data: {
    itemsExtracted: 2847,
    extractionRate: "63.27/min"
  },
  reliability: {
    errorsRecovered: 23,
    adaptationsMade: 45
  },
  subsystems: {
    proxy: { healthy: 95, blocked: 5 },
    browser: { captchasSolved: 12 },
    errorHandler: { successRate: "87.3%" },
    learning: { knownPatterns: 234 }
  }
}
```

## 🔄 Batch Processing

Process multiple URLs efficiently:

```javascript
const urls = [
  'https://flippa.com/websites?page=1',
  'https://flippa.com/websites?page=2',
  // ... more URLs
];

const results = await collector.runBatchCollection(urls, {
  targetCountry: 'US',
  extractionConfig: { dataType: 'listing' }
});

// Results include success status and extracted data for each URL
```

## 🧠 Learning System

The adaptive learning system continuously improves:

1. **Pattern Recognition**: Identifies successful strategies
2. **Error Analysis**: Learns from failures
3. **Performance Optimization**: Adapts timing and resources
4. **Detection Avoidance**: Evolves anti-detection techniques
5. **Strategy Selection**: Chooses best approach per context

## ⚠️ Error Handling

Comprehensive error handling with recovery:

```javascript
// Automatic handling of:
- Rate limiting (429 errors)
- CAPTCHA challenges
- Selector changes
- Network timeouts
- Browser crashes
- Detection events
- Resource exhaustion
```

## 🚨 Detection Response

When detection is suspected:

1. **Immediate Response**: Pause and assess
2. **Identity Rotation**: New proxy and fingerprint
3. **Behavior Enhancement**: More human-like patterns
4. **Timing Adjustment**: Slower, more variable actions
5. **Strategy Change**: Different extraction approach

## 📈 Performance Optimization

- **Resource Management**: CPU and memory monitoring
- **Concurrent Sessions**: Dynamic adjustment based on load
- **Caching**: Smart caching of static resources
- **Batch Processing**: Efficient multi-URL handling
- **Circuit Breakers**: Prevent system overload

## 🔐 Best Practices

1. **Start Conservative**: Begin with fewer sessions and increase gradually
2. **Monitor Metrics**: Watch success rates and detection events
3. **Rotate Regularly**: Don't overuse single proxies or patterns
4. **Learn and Adapt**: Let the system learn from successes
5. **Handle Failures**: Implement proper error handling
6. **Respect Limits**: Follow robots.txt and rate limits

## 🤝 Ethical Considerations

This system is designed for legitimate data collection:
- Respect website terms of service
- Implement reasonable rate limits
- Use for authorized purposes only
- Protect user privacy
- Follow local regulations

## 🔧 Troubleshooting

### Common Issues

1. **High Detection Rate**
   - Reduce session concurrency
   - Increase delays between actions
   - Enable more behavioral noise

2. **Low Success Rate**
   - Check proxy health
   - Update selectors
   - Verify CAPTCHA solver credits

3. **Performance Issues**
   - Reduce concurrent sessions
   - Enable resource blocking
   - Increase system resources

## 📝 License

This system is for educational and authorized commercial use only. Users are responsible for compliance with all applicable laws and website terms of service.

---

**Note**: This is an advanced web scraping system. Always ensure you have permission to collect data from target websites and respect their terms of service and rate limits.