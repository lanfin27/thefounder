// browser-fingerprint-randomizer.js
// Advanced browser fingerprint randomization with real device profiles

const fs = require('fs');
const path = require('path');

class BrowserFingerprintRandomizer {
  constructor() {
    // Real device profiles collected from actual users
    this.deviceProfiles = {
      desktop: {
        windows: this.generateWindowsProfiles(),
        mac: this.generateMacProfiles(),
        linux: this.generateLinuxProfiles()
      },
      mobile: {
        android: this.generateAndroidProfiles(),
        ios: this.generateIOSProfiles()
      }
    };

    // Geographic locations with appropriate timezone/language combinations
    this.geoProfiles = this.generateGeoProfiles();
    
    // Browser-specific quirks and features
    this.browserQuirks = this.generateBrowserQuirks();
  }

  generateWindowsProfiles() {
    return [
      {
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
        viewport: { width: 1920, height: 937 },
        cores: 8,
        memory: 16,
        webgl: {
          vendor: 'Google Inc. (NVIDIA)',
          renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
        },
        fonts: ['Arial', 'Calibri', 'Cambria', 'Consolas', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Verdana'],
        plugins: ['PDF Viewer', 'Chrome PDF Viewer', 'Native Client'],
        canvas: { noise: 0.00123456 }, // Unique but consistent noise
        audio: { noise: 0.00098765 }
      },
      {
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        screen: { width: 2560, height: 1440, colorDepth: 32, pixelRatio: 1.25 },
        viewport: { width: 2048, height: 1086 },
        cores: 12,
        memory: 32,
        webgl: {
          vendor: 'Google Inc. (AMD)',
          renderer: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'
        },
        fonts: ['Arial', 'Georgia', 'Impact', 'Lucida Console', 'Microsoft Sans Serif', 'Palatino Linotype'],
        plugins: ['PDF Viewer', 'Chrome PDF Viewer'],
        canvas: { noise: 0.00234567 },
        audio: { noise: 0.00187654 }
      },
      {
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76',
        screen: { width: 1366, height: 768, colorDepth: 24, pixelRatio: 1 },
        viewport: { width: 1366, height: 625 },
        cores: 4,
        memory: 8,
        webgl: {
          vendor: 'Google Inc. (Intel)',
          renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)'
        },
        fonts: ['Arial', 'Courier New', 'Georgia', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'],
        plugins: ['PDF Viewer', 'Chrome PDF Viewer', 'Microsoft Edge PDF Viewer'],
        canvas: { noise: 0.00345678 },
        audio: { noise: 0.00276543 }
      }
    ];
  }

  generateMacProfiles() {
    return [
      {
        platform: 'MacIntel',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        screen: { width: 2880, height: 1800, colorDepth: 30, pixelRatio: 2 },
        viewport: { width: 1440, height: 817 },
        cores: 10,
        memory: 16,
        webgl: {
          vendor: 'Apple Inc.',
          renderer: 'Apple M1 Pro'
        },
        fonts: ['Helvetica', 'Helvetica Neue', 'Arial', 'Times', 'Courier', 'Georgia', 'Verdana', 'Monaco'],
        plugins: ['PDF Viewer', 'Chrome PDF Viewer'],
        canvas: { noise: 0.00456789 },
        audio: { noise: 0.00365432 }
      },
      {
        platform: 'MacIntel', 
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        screen: { width: 3024, height: 1964, colorDepth: 30, pixelRatio: 2 },
        viewport: { width: 1512, height: 892 },
        cores: 8,
        memory: 32,
        webgl: {
          vendor: 'Apple Inc.',
          renderer: 'Apple M2'
        },
        fonts: ['Helvetica', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Trebuchet MS', 'Verdana'],
        plugins: [],
        canvas: { noise: 0.00567890 },
        audio: { noise: 0.00454321 }
      }
    ];
  }

  generateLinuxProfiles() {
    return [
      {
        platform: 'Linux x86_64',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
        viewport: { width: 1920, height: 991 },
        cores: 8,
        memory: 16,
        webgl: {
          vendor: 'Mesa/X.org',
          renderer: 'Mesa Intel(R) UHD Graphics (CML GT2)'
        },
        fonts: ['DejaVu Sans', 'Liberation Sans', 'Noto Sans', 'Ubuntu', 'Droid Sans', 'FreeSans'],
        plugins: ['PDF Viewer'],
        canvas: { noise: 0.00678901 },
        audio: { noise: 0.00543210 }
      }
    ];
  }

  generateAndroidProfiles() {
    return [
      {
        platform: 'Linux armv81',
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
        screen: { width: 412, height: 915, colorDepth: 32, pixelRatio: 2.625 },
        viewport: { width: 412, height: 819 },
        cores: 8,
        memory: 8,
        webgl: {
          vendor: 'Qualcomm',
          renderer: 'Adreno (TM) 740'
        },
        fonts: ['Roboto', 'Droid Sans', 'Noto Sans'],
        plugins: [],
        canvas: { noise: 0.00789012 },
        audio: { noise: 0.00632109 }
      }
    ];
  }

  generateIOSProfiles() {
    return [
      {
        platform: 'iPhone',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        screen: { width: 393, height: 852, colorDepth: 32, pixelRatio: 3 },
        viewport: { width: 393, height: 659 },
        cores: 6,
        memory: 6,
        webgl: {
          vendor: 'Apple Inc.',
          renderer: 'Apple GPU'
        },
        fonts: ['Helvetica', 'Arial', '.SF UI Text', '.SF UI Display'],
        plugins: [],
        canvas: { noise: 0.00890123 },
        audio: { noise: 0.00721098 }
      }
    ];
  }

  generateGeoProfiles() {
    return [
      // United States profiles
      {
        country: 'US',
        city: 'New York',
        timezone: 'America/New_York',
        language: 'en-US',
        languages: ['en-US', 'en'],
        locale: 'en-US',
        ip_ranges: ['72.229.28.0/24', '74.125.0.0/16'],
        connection: { rtt: 50, downlink: 10, effectiveType: '4g' }
      },
      {
        country: 'US',
        city: 'Los Angeles',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
        languages: ['en-US', 'en', 'es'],
        locale: 'en-US',
        ip_ranges: ['173.252.0.0/16', '204.15.20.0/22'],
        connection: { rtt: 60, downlink: 15, effectiveType: '4g' }
      },
      {
        country: 'US',
        city: 'Chicago',
        timezone: 'America/Chicago',
        language: 'en-US',
        languages: ['en-US', 'en'],
        locale: 'en-US',
        ip_ranges: ['23.0.0.0/12', '65.52.0.0/14'],
        connection: { rtt: 45, downlink: 20, effectiveType: '4g' }
      },
      // International profiles
      {
        country: 'GB',
        city: 'London',
        timezone: 'Europe/London',
        language: 'en-GB',
        languages: ['en-GB', 'en'],
        locale: 'en-GB',
        ip_ranges: ['81.2.69.0/24', '217.64.0.0/16'],
        connection: { rtt: 30, downlink: 25, effectiveType: '4g' }
      },
      {
        country: 'AU',
        city: 'Sydney',
        timezone: 'Australia/Sydney',
        language: 'en-AU',
        languages: ['en-AU', 'en'],
        locale: 'en-AU',
        ip_ranges: ['1.128.0.0/11', '14.0.0.0/16'],
        connection: { rtt: 100, downlink: 8, effectiveType: '4g' }
      },
      {
        country: 'CA',
        city: 'Toronto',
        timezone: 'America/Toronto',
        language: 'en-CA',
        languages: ['en-CA', 'en', 'fr'],
        locale: 'en-CA',
        ip_ranges: ['99.224.0.0/11', '184.144.0.0/12'],
        connection: { rtt: 40, downlink: 18, effectiveType: '4g' }
      }
    ];
  }

  generateBrowserQuirks() {
    return {
      chrome: {
        permissions: {
          notifications: 'default',
          geolocation: 'prompt',
          camera: 'prompt',
          microphone: 'prompt',
          midi: 'prompt',
          pointerLock: 'prompt',
          fullscreen: 'prompt',
          openExternal: 'prompt'
        },
        chrome_object: true,
        webrtc_ip_handling: 'default',
        battery_api: true,
        gamepad_api: true,
        webgl_metadata: {
          UNMASKED_VENDOR_WEBGL: true,
          UNMASKED_RENDERER_WEBGL: true,
          MAX_TEXTURE_SIZE: 16384,
          MAX_VIEWPORT_DIMS: [32767, 32767]
        }
      },
      firefox: {
        permissions: {
          'geo': 'prompt',
          'desktop-notification': 'default',
          'camera': 'prompt',
          'microphone': 'prompt'
        },
        firefox_object: true,
        privacy_resistFingerprinting: false,
        webgl_metadata: {
          UNMASKED_VENDOR_WEBGL: false,
          UNMASKED_RENDERER_WEBGL: false,
          MAX_TEXTURE_SIZE: 16384,
          MAX_VIEWPORT_DIMS: [32767, 32767]
        }
      },
      safari: {
        permissions: {
          geolocation: 0,
          notifications: 0,
          camera: 0,
          microphone: 0
        },
        safari_object: true,
        webrtc_ip_handling: 'disable_non_proxied_udp',
        battery_api: false,
        gamepad_api: false
      }
    };
  }

  generateFingerprint(options = {}) {
    const {
      deviceType = 'desktop',
      os = 'windows',
      location = 'US',
      browserType = 'chrome'
    } = options;

    // Select appropriate profiles
    const deviceProfile = this.selectRandomProfile(this.deviceProfiles[deviceType][os]);
    const geoProfile = this.selectGeoProfile(location);
    const browserQuirk = this.browserQuirks[browserType];

    // Generate unique but consistent identifiers
    const sessionId = this.generateSessionId();
    const canvasNoise = this.generateCanvasNoise(sessionId);
    const audioNoise = this.generateAudioNoise(sessionId);
    const webglNoise = this.generateWebGLNoise(sessionId);

    return {
      // Device characteristics
      platform: deviceProfile.platform,
      userAgent: this.modifyUserAgent(deviceProfile.userAgent, browserType),
      screen: {
        ...deviceProfile.screen,
        availWidth: deviceProfile.screen.width - this.randomInt(0, 100),
        availHeight: deviceProfile.screen.height - this.randomInt(40, 120),
        orientation: { angle: 0, type: 'landscape-primary' }
      },
      viewport: deviceProfile.viewport,
      hardwareConcurrency: deviceProfile.cores,
      deviceMemory: deviceProfile.memory,
      
      // WebGL fingerprint
      webgl: {
        ...deviceProfile.webgl,
        extensions: this.generateWebGLExtensions(),
        parameters: this.generateWebGLParameters(deviceProfile.webgl),
        noise: webglNoise
      },
      
      // Canvas fingerprint
      canvas: {
        ...deviceProfile.canvas,
        toDataURL: this.generateCanvasDataURL(canvasNoise),
        getContext: this.generateCanvasContext(canvasNoise)
      },
      
      // Audio fingerprint
      audio: {
        ...deviceProfile.audio,
        context: this.generateAudioContext(audioNoise),
        oscillator: this.generateOscillatorFingerprint(audioNoise)
      },
      
      // Fonts with realistic variations
      fonts: this.shuffleArray(deviceProfile.fonts).slice(0, deviceProfile.fonts.length - this.randomInt(0, 3)),
      
      // Plugins (decreasing in modern browsers)
      plugins: this.generatePlugins(deviceProfile.plugins, browserType),
      
      // Geographic and network
      timezone: geoProfile.timezone,
      language: geoProfile.language,
      languages: geoProfile.languages,
      locale: geoProfile.locale,
      connection: {
        ...geoProfile.connection,
        saveData: false,
        rtt: geoProfile.connection.rtt + this.randomInt(-10, 10)
      },
      
      // Browser-specific
      permissions: browserQuirk.permissions,
      browserFeatures: this.generateBrowserFeatures(browserQuirk),
      
      // Behavioral hints
      behavioral: {
        mouseMovementPattern: this.generateMousePattern(),
        typingPattern: this.generateTypingPattern(),
        scrollingPattern: this.generateScrollingPattern()
      },
      
      // Session consistency
      sessionId: sessionId,
      createdAt: new Date().toISOString(),
      consistency: {
        canvasHash: this.hashData(canvasNoise),
        audioHash: this.hashData(audioNoise),
        webglHash: this.hashData(webglNoise)
      }
    };
  }

  selectRandomProfile(profiles) {
    return profiles[Math.floor(Math.random() * profiles.length)];
  }

  selectGeoProfile(location) {
    const profiles = this.geoProfiles.filter(p => p.country === location);
    return profiles.length > 0 
      ? profiles[Math.floor(Math.random() * profiles.length)]
      : this.geoProfiles[0];
  }

  modifyUserAgent(baseUA, browserType) {
    // Add minor variations to user agent
    const variations = {
      chrome: [
        'AppleWebKit/537.36',
        'AppleWebKit/537.36 (KHTML, like Gecko)',
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome'
      ],
      firefox: [
        'Gecko/20100101',
        'Gecko/20100101 Firefox'
      ],
      safari: [
        'Version/17.1',
        'Safari/605.1.15'
      ]
    };

    // Sometimes add compatibility tokens
    if (Math.random() < 0.1) {
      baseUA += ' Edg/120.0.0.0';
    }

    return baseUA;
  }

  generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateCanvasNoise(seed) {
    // Generate consistent but unique canvas noise based on seed
    const noise = this.seedRandom(seed);
    return {
      r: Math.floor(noise() * 5),
      g: Math.floor(noise() * 5),
      b: Math.floor(noise() * 5),
      a: 0.1 + noise() * 0.05
    };
  }

  generateAudioNoise(seed) {
    const noise = this.seedRandom(seed);
    return {
      oscillator: -0.0001 + noise() * 0.0002,
      compressor: -0.0001 + noise() * 0.0002,
      hybrid: -0.0001 + noise() * 0.0002
    };
  }

  generateWebGLNoise(seed) {
    const noise = this.seedRandom(seed);
    return {
      precision: noise() * 0.0001,
      extensions: Math.floor(noise() * 3)
    };
  }

  generateWebGLExtensions() {
    const allExtensions = [
      'ANGLE_instanced_arrays',
      'EXT_blend_minmax',
      'EXT_color_buffer_half_float',
      'EXT_disjoint_timer_query',
      'EXT_float_blend',
      'EXT_frag_depth',
      'EXT_shader_texture_lod',
      'EXT_texture_compression_bptc',
      'EXT_texture_compression_rgtc',
      'EXT_texture_filter_anisotropic',
      'EXT_sRGB',
      'KHR_parallel_shader_compile',
      'OES_element_index_uint',
      'OES_fbo_render_mipmap',
      'OES_standard_derivatives',
      'OES_texture_float',
      'OES_texture_float_linear',
      'OES_texture_half_float',
      'OES_texture_half_float_linear',
      'OES_vertex_array_object',
      'WEBGL_color_buffer_float',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_s3tc_srgb',
      'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders',
      'WEBGL_depth_texture',
      'WEBGL_draw_buffers',
      'WEBGL_lose_context',
      'WEBGL_multi_draw'
    ];

    // Return a realistic subset
    const count = 20 + Math.floor(Math.random() * 8);
    return this.shuffleArray(allExtensions).slice(0, count);
  }

  generateWebGLParameters(webgl) {
    return {
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32,
      MAX_CUBE_MAP_TEXTURE_SIZE: 16384,
      MAX_FRAGMENT_UNIFORM_VECTORS: 1024,
      MAX_RENDERBUFFER_SIZE: 16384,
      MAX_TEXTURE_IMAGE_UNITS: 16,
      MAX_TEXTURE_SIZE: 16384,
      MAX_VARYING_VECTORS: 30,
      MAX_VERTEX_ATTRIBS: 16,
      MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16,
      MAX_VERTEX_UNIFORM_VECTORS: 4096,
      MAX_VIEWPORT_DIMS: [32767, 32767],
      RENDERER: webgl.renderer,
      SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 1.0',
      VENDOR: webgl.vendor,
      VERSION: 'WebGL 1.0'
    };
  }

  generateCanvasDataURL(noise) {
    // Simulate canvas.toDataURL() with consistent noise
    const baseString = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return baseString.substring(0, baseString.length - 10) + this.hashData(noise).substring(0, 10);
  }

  generateCanvasContext(noise) {
    return {
      fillStyle: `rgba(${noise.r}, ${noise.g}, ${noise.b}, ${noise.a})`,
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over'
    };
  }

  generateAudioContext(noise) {
    return {
      sampleRate: 48000,
      channelCount: 2,
      channelCountMode: 'max',
      channelInterpretation: 'speakers',
      maxChannelCount: 2,
      numberOfInputs: 1,
      numberOfOutputs: 1,
      dynamicsCompressor: noise.compressor,
      oscillator: noise.oscillator,
      analyser: noise.hybrid
    };
  }

  generateOscillatorFingerprint(noise) {
    return {
      frequency: 1000 + noise.oscillator * 1000,
      detune: 0,
      type: 'sine',
      channelCount: 2,
      channelCountMode: 'max',
      channelInterpretation: 'speakers'
    };
  }

  generatePlugins(basePlugins, browserType) {
    if (browserType === 'chrome' || browserType === 'edge') {
      // Modern Chrome/Edge have minimal plugins
      return Math.random() < 0.7 ? [] : basePlugins.slice(0, 2);
    } else if (browserType === 'firefox') {
      return [];
    } else if (browserType === 'safari') {
      return [];
    }
    return basePlugins;
  }

  generateBrowserFeatures(quirk) {
    const features = {
      webrtc: true,
      websocket: true,
      webworker: true,
      serviceworker: true,
      sharedworker: Math.random() > 0.3,
      indexeddb: true,
      websql: false, // Deprecated
      localstorage: true,
      sessionstorage: true,
      notifications: true,
      pushapi: true,
      webaudio: true,
      webgl: true,
      webgl2: Math.random() > 0.2,
      webvr: false, // Deprecated
      webxr: Math.random() > 0.5,
      gamepad: quirk.gamepad_api !== false,
      battery: quirk.battery_api !== false,
      mediadevices: true,
      speechapi: Math.random() > 0.4,
      credentials: true,
      payments: Math.random() > 0.6
    };

    return features;
  }

  generateMousePattern() {
    return {
      curveComplexity: 0.6 + Math.random() * 0.3, // 0.6-0.9
      averageSpeed: 300 + Math.random() * 200, // 300-500 px/s
      accelerationPattern: 'ease-in-out',
      jitterAmount: 2 + Math.random() * 3, // 2-5 pixels
      pauseFrequency: 0.1 + Math.random() * 0.2 // 10-30% of movements
    };
  }

  generateTypingPattern() {
    return {
      averageWPM: 40 + Math.random() * 40, // 40-80 WPM
      keystrokeVariation: 50 + Math.random() * 100, // 50-150ms variation
      mistakeRate: 0.01 + Math.random() * 0.03, // 1-4% mistakes
      pauseBetweenWords: 100 + Math.random() * 200, // 100-300ms
      capitalShiftDelay: 20 + Math.random() * 30 // 20-50ms
    };
  }

  generateScrollingPattern() {
    return {
      scrollSpeed: 50 + Math.random() * 150, // 50-200 px per wheel event
      smoothness: 0.7 + Math.random() * 0.25, // 0.7-0.95
      readingPauses: true,
      pauseDuration: 500 + Math.random() * 2000, // 0.5-2.5s pauses
      directionChanges: 0.05 + Math.random() * 0.1 // 5-15% up scrolls
    };
  }

  seedRandom(seed) {
    // Simple seedable random number generator
    let s = this.hashCode(seed);
    return function() {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  hashData(data) {
    return require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Apply fingerprint to page
  async applyFingerprint(page, fingerprint) {
    // Override navigator properties
    await page.evaluateOnNewDocument((fp) => {
      // Platform
      Object.defineProperty(navigator, 'platform', {
        get: () => fp.platform
      });

      // User agent
      Object.defineProperty(navigator, 'userAgent', {
        get: () => fp.userAgent
      });

      // Hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => fp.hardwareConcurrency
      });

      // Device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => fp.deviceMemory
      });

      // Languages
      Object.defineProperty(navigator, 'language', {
        get: () => fp.language
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => fp.languages
      });

      // Connection
      if (navigator.connection) {
        Object.defineProperty(navigator.connection, 'rtt', {
          get: () => fp.connection.rtt
        });
        Object.defineProperty(navigator.connection, 'downlink', {
          get: () => fp.connection.downlink
        });
        Object.defineProperty(navigator.connection, 'effectiveType', {
          get: () => fp.connection.effectiveType
        });
      }

      // WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return fp.webgl.vendor;
        if (parameter === 37446) return fp.webgl.renderer;
        return getParameter.apply(this, arguments);
      };

      // Canvas
      const toDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        const result = toDataURL.apply(this, arguments);
        // Add noise to canvas
        return result.substring(0, result.length - 10) + fp.canvas.toDataURL.substring(fp.canvas.toDataURL.length - 10);
      };

      // Permissions
      if (navigator.permissions && navigator.permissions.query) {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = async function(descriptor) {
          if (fp.permissions[descriptor.name]) {
            return { state: fp.permissions[descriptor.name] };
          }
          return originalQuery.apply(this, arguments);
        };
      }

      // Screen
      Object.defineProperty(screen, 'width', {
        get: () => fp.screen.width
      });
      Object.defineProperty(screen, 'height', {
        get: () => fp.screen.height
      });
      Object.defineProperty(screen, 'colorDepth', {
        get: () => fp.screen.colorDepth
      });
      Object.defineProperty(screen, 'pixelDepth', {
        get: () => fp.screen.colorDepth
      });
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => fp.screen.pixelRatio
      });

      // Remove automation indicators
      delete navigator.__proto__.webdriver;
      delete window.chrome.csi;
      delete window.chrome.loadTimes;

      // Battery API (if specified)
      if (!fp.browserFeatures.battery) {
        delete navigator.getBattery;
      }

      // Timezone
      const DateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(...args) {
        args[1] = { ...args[1], timeZone: fp.timezone };
        return new DateTimeFormat(...args);
      };

      // Console warning removal
      const consoleWarn = console.warn;
      console.warn = function(...args) {
        if (args[0] && args[0].includes('Permissions policy')) return;
        return consoleWarn.apply(console, args);
      };

    }, fingerprint);

    // Set viewport
    await page.setViewportSize(fingerprint.viewport);

    // Set user agent
    await page.setUserAgent(fingerprint.userAgent);

    // Set locale
    await page.setLocale(fingerprint.locale);

    // Set timezone
    await page.setTimezone(fingerprint.timezone);

    // Set geolocation (if needed)
    await page.setGeolocation({
      latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
      longitude: -74.0060 + (Math.random() - 0.5) * 0.1
    });

    return fingerprint;
  }
}

module.exports = BrowserFingerprintRandomizer;