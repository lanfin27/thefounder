// Browser configuration for different environments
module.exports = {
  development: {
    headless: false, // Show browser for debugging
    slowMo: 1000,    // Slow down for observation
    devtools: true,  // Open devtools
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox'
    ]
  },
  production: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-default-apps',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ],
    // Additional stealth settings
    ignoreDefaultArgs: ['--enable-automation'],
    // Performance optimizations
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  test: {
    headless: true,
    slowMo: 0,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  }
};