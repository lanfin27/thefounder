// deployment-config.js
// Production deployment configuration and orchestration

const path = require('path');
const fs = require('fs').promises;

class DeploymentConfig {
  constructor(environment = 'production') {
    this.environment = environment;
    this.config = this.loadEnvironmentConfig(environment);
  }

  loadEnvironmentConfig(env) {
    const configs = {
      development: {
        name: 'Development',
        
        // Server configuration
        server: {
          port: 3000,
          host: 'localhost',
          protocol: 'http'
        },
        
        // Database configuration
        database: {
          host: 'localhost',
          port: 5432,
          name: 'stealth_dev',
          user: 'dev_user',
          password: process.env.DB_PASSWORD || 'dev_password',
          pool: {
            min: 2,
            max: 10
          }
        },
        
        // Redis configuration
        redis: {
          host: 'localhost',
          port: 6379,
          password: process.env.REDIS_PASSWORD,
          db: 0
        },
        
        // Logging configuration
        logging: {
          level: 'debug',
          outputs: {
            console: true,
            file: true,
            elasticsearch: false
          }
        },
        
        // Deployment settings
        deployment: {
          strategy: 'direct',
          healthCheckInterval: 30000,
          gracefulShutdownTimeout: 10000
        },
        
        // Resource limits
        resources: {
          maxMemory: '512M',
          maxCpu: '50%',
          maxConnections: 100
        },
        
        // Features
        features: {
          clustering: false,
          autoScaling: false,
          monitoring: true,
          alerting: false
        }
      },
      
      staging: {
        name: 'Staging',
        
        server: {
          port: process.env.PORT || 3000,
          host: '0.0.0.0',
          protocol: 'https'
        },
        
        database: {
          host: process.env.DB_HOST || 'staging-db.example.com',
          port: process.env.DB_PORT || 5432,
          name: process.env.DB_NAME || 'stealth_staging',
          user: process.env.DB_USER || 'staging_user',
          password: process.env.DB_PASSWORD,
          pool: {
            min: 5,
            max: 20
          },
          ssl: {
            rejectUnauthorized: false
          }
        },
        
        redis: {
          host: process.env.REDIS_HOST || 'staging-redis.example.com',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: 0,
          tls: {}
        },
        
        logging: {
          level: 'info',
          outputs: {
            console: true,
            file: true,
            elasticsearch: true
          },
          elasticsearch: {
            node: process.env.ELASTIC_URL || 'https://staging-elastic.example.com'
          }
        },
        
        deployment: {
          strategy: 'rolling',
          healthCheckInterval: 60000,
          gracefulShutdownTimeout: 30000,
          rollbackOnFailure: true
        },
        
        resources: {
          maxMemory: '1G',
          maxCpu: '75%',
          maxConnections: 500
        },
        
        features: {
          clustering: true,
          autoScaling: false,
          monitoring: true,
          alerting: true
        },
        
        monitoring: {
          alerts: {
            channels: ['email', 'slack']
          }
        }
      },
      
      production: {
        name: 'Production',
        
        server: {
          port: process.env.PORT || 443,
          host: '0.0.0.0',
          protocol: 'https',
          ssl: {
            cert: process.env.SSL_CERT_PATH || '/etc/ssl/certs/server.crt',
            key: process.env.SSL_KEY_PATH || '/etc/ssl/private/server.key',
            ca: process.env.SSL_CA_PATH
          }
        },
        
        database: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT || 5432,
          name: process.env.DB_NAME || 'stealth_production',
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          pool: {
            min: 10,
            max: 50
          },
          ssl: {
            rejectUnauthorized: true,
            ca: process.env.DB_CA_CERT
          },
          // Read replicas for load distribution
          replicas: process.env.DB_REPLICAS?.split(',') || []
        },
        
        redis: {
          // Redis Sentinel for high availability
          sentinels: process.env.REDIS_SENTINELS?.split(',').map(s => {
            const [host, port] = s.split(':');
            return { host, port: parseInt(port) || 26379 };
          }) || [
            { host: 'redis-sentinel-1', port: 26379 },
            { host: 'redis-sentinel-2', port: 26379 },
            { host: 'redis-sentinel-3', port: 26379 }
          ],
          name: 'mymaster',
          password: process.env.REDIS_PASSWORD,
          db: 0,
          tls: {
            rejectUnauthorized: true
          }
        },
        
        logging: {
          level: process.env.LOG_LEVEL || 'warn',
          outputs: {
            console: false,
            file: true,
            elasticsearch: true,
            syslog: true
          },
          elasticsearch: {
            node: process.env.ELASTIC_URL,
            apiKey: process.env.ELASTIC_API_KEY,
            index: 'stealth-production'
          },
          syslog: {
            host: process.env.SYSLOG_HOST || 'syslog.example.com',
            port: process.env.SYSLOG_PORT || 514,
            protocol: 'tls'
          }
        },
        
        deployment: {
          strategy: process.env.DEPLOYMENT_STRATEGY || 'blue-green',
          healthCheckInterval: 30000,
          gracefulShutdownTimeout: 60000,
          rollbackOnFailure: true,
          canary: {
            percentage: 10,
            duration: 900000, // 15 minutes
            metrics: ['errorRate', 'responseTime']
          }
        },
        
        resources: {
          maxMemory: process.env.MAX_MEMORY || '4G',
          maxCpu: process.env.MAX_CPU || '100%',
          maxConnections: 10000,
          requestTimeout: 300000
        },
        
        features: {
          clustering: true,
          autoScaling: true,
          monitoring: true,
          alerting: true,
          rateLimit: true,
          ddosProtection: true
        },
        
        clustering: {
          workers: process.env.WORKER_COUNT || 'auto',
          autoRestart: true,
          maxRestarts: 10
        },
        
        autoScaling: {
          enabled: true,
          minWorkers: 4,
          maxWorkers: 16,
          targetCpuUtilization: 70,
          targetMemoryUtilization: 80,
          scaleUpCooldown: 300000,
          scaleDownCooldown: 600000
        },
        
        monitoring: {
          metrics: {
            interval: 60000,
            retention: 30 * 24 * 60 * 60 * 1000 // 30 days
          },
          alerts: {
            channels: ['email', 'slack', 'pagerduty', 'webhook'],
            email: {
              to: process.env.ALERT_EMAILS?.split(',') || []
            },
            slack: {
              webhookUrl: process.env.SLACK_WEBHOOK_URL,
              channel: '#production-alerts'
            },
            pagerduty: {
              integrationKey: process.env.PAGERDUTY_KEY,
              serviceId: process.env.PAGERDUTY_SERVICE_ID
            }
          },
          healthChecks: {
            endpoints: [
              { path: '/health', timeout: 5000 },
              { path: '/ready', timeout: 5000 }
            ]
          }
        },
        
        security: {
          rateLimit: {
            windowMs: 60000, // 1 minute
            max: 100,
            keyGenerator: 'ip'
          },
          ddos: {
            burst: 20,
            rate: 10,
            maxEventLoopDelay: 100
          },
          cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || [],
            credentials: true
          },
          helmet: {
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:']
              }
            }
          }
        },
        
        backup: {
          enabled: true,
          schedule: '0 2 * * *', // 2 AM daily
          retention: 7, // days
          destinations: ['s3', 'local'],
          s3: {
            bucket: process.env.BACKUP_S3_BUCKET,
            region: process.env.AWS_REGION || 'us-east-1'
          }
        },
        
        cdn: {
          enabled: true,
          provider: 'cloudflare',
          zones: process.env.CDN_ZONES?.split(',') || []
        }
      }
    };
    
    return configs[env] || configs.production;
  }

  // Get specific configuration section
  get(section) {
    return this.config[section];
  }

  // Get all configuration
  getAll() {
    return this.config;
  }

  // Validate configuration
  async validate() {
    const errors = [];
    const warnings = [];
    
    // Check required environment variables
    const requiredEnvVars = this.getRequiredEnvVars();
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }
    
    // Validate database connection
    if (this.config.database) {
      if (!this.config.database.host) {
        errors.push('Database host not configured');
      }
      if (!this.config.database.password && this.environment === 'production') {
        errors.push('Database password not set for production');
      }
    }
    
    // Validate Redis configuration
    if (this.config.redis) {
      if (this.environment === 'production' && !this.config.redis.sentinels?.length) {
        warnings.push('Redis Sentinel not configured for production');
      }
    }
    
    // Validate SSL configuration for production
    if (this.environment === 'production') {
      if (!this.config.server.ssl?.cert || !this.config.server.ssl?.key) {
        errors.push('SSL certificate and key required for production');
      }
    }
    
    // Validate monitoring configuration
    if (this.config.features?.monitoring && this.config.monitoring) {
      if (!this.config.monitoring.alerts?.channels?.length) {
        warnings.push('No alert channels configured');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  getRequiredEnvVars() {
    const base = [];
    
    if (this.environment === 'production') {
      base.push(
        'DB_HOST',
        'DB_USER',
        'DB_PASSWORD',
        'REDIS_PASSWORD',
        'ELASTIC_URL',
        'ELASTIC_API_KEY',
        'SSL_CERT_PATH',
        'SSL_KEY_PATH'
      );
      
      if (this.config.monitoring?.alerts?.channels?.includes('email')) {
        base.push('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'ALERT_EMAILS');
      }
      
      if (this.config.monitoring?.alerts?.channels?.includes('slack')) {
        base.push('SLACK_WEBHOOK_URL');
      }
      
      if (this.config.monitoring?.alerts?.channels?.includes('pagerduty')) {
        base.push('PAGERDUTY_KEY');
      }
    }
    
    return base;
  }

  // Generate environment template
  async generateEnvTemplate() {
    const template = [];
    
    template.push('# Stealth Collection Environment Configuration');
    template.push(`# Environment: ${this.environment}`);
    template.push('# Generated: ' + new Date().toISOString());
    template.push('');
    
    // Server configuration
    template.push('# Server Configuration');
    template.push('PORT=3000');
    template.push('NODE_ENV=' + this.environment);
    template.push('');
    
    // Database configuration
    template.push('# Database Configuration');
    template.push('DB_HOST=localhost');
    template.push('DB_PORT=5432');
    template.push('DB_NAME=stealth_' + this.environment);
    template.push('DB_USER=stealth_user');
    template.push('DB_PASSWORD=your_secure_password');
    template.push('DB_REPLICAS=replica1.example.com,replica2.example.com');
    template.push('');
    
    // Redis configuration
    template.push('# Redis Configuration');
    template.push('REDIS_HOST=localhost');
    template.push('REDIS_PORT=6379');
    template.push('REDIS_PASSWORD=your_redis_password');
    template.push('REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379');
    template.push('');
    
    // Elasticsearch configuration
    template.push('# Elasticsearch Configuration');
    template.push('ELASTIC_URL=https://elastic.example.com');
    template.push('ELASTIC_API_KEY=your_api_key');
    template.push('');
    
    // SSL configuration
    template.push('# SSL Configuration');
    template.push('SSL_CERT_PATH=/etc/ssl/certs/server.crt');
    template.push('SSL_KEY_PATH=/etc/ssl/private/server.key');
    template.push('SSL_CA_PATH=/etc/ssl/certs/ca.crt');
    template.push('');
    
    // Monitoring configuration
    template.push('# Monitoring & Alerting');
    template.push('ALERT_EMAILS=ops@example.com,dev@example.com');
    template.push('SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL');
    template.push('PAGERDUTY_KEY=your_pagerduty_integration_key');
    template.push('PAGERDUTY_SERVICE_ID=your_service_id');
    template.push('');
    
    // Email configuration
    template.push('# Email Configuration');
    template.push('SMTP_HOST=smtp.example.com');
    template.push('SMTP_PORT=587');
    template.push('SMTP_SECURE=false');
    template.push('SMTP_USER=alerts@example.com');
    template.push('SMTP_PASS=your_smtp_password');
    template.push('');
    
    // Performance configuration
    template.push('# Performance Configuration');
    template.push('WORKER_COUNT=auto');
    template.push('MAX_MEMORY=4G');
    template.push('MAX_CPU=100%');
    template.push('');
    
    // Feature flags
    template.push('# Feature Flags');
    template.push('ENABLE_CLUSTERING=true');
    template.push('ENABLE_AUTO_SCALING=true');
    template.push('ENABLE_MONITORING=true');
    template.push('ENABLE_ALERTING=true');
    template.push('');
    
    // Backup configuration
    template.push('# Backup Configuration');
    template.push('BACKUP_S3_BUCKET=stealth-backups');
    template.push('AWS_REGION=us-east-1');
    template.push('');
    
    // CDN configuration
    template.push('# CDN Configuration');
    template.push('CDN_ZONES=zone1.example.com,zone2.example.com');
    template.push('');
    
    // Security configuration
    template.push('# Security Configuration');
    template.push('CORS_ORIGIN=https://app.example.com,https://admin.example.com');
    template.push('SESSION_SECRET=your_session_secret');
    template.push('');
    
    // Deployment configuration
    template.push('# Deployment Configuration');
    template.push('DEPLOYMENT_STRATEGY=blue-green');
    template.push('APP_VERSION=1.0.0');
    
    return template.join('\n');
  }

  // Export configuration for different deployment targets
  exportForDocker() {
    const dockerConfig = {
      version: '3.8',
      services: {
        app: {
          image: 'stealth-collection:latest',
          environment: this.flattenConfig(),
          ports: [`${this.config.server.port}:${this.config.server.port}`],
          deploy: {
            replicas: this.config.clustering?.workers || 4,
            resources: {
              limits: {
                cpus: '2.0',
                memory: this.config.resources.maxMemory
              },
              reservations: {
                cpus: '0.5',
                memory: '512M'
              }
            },
            restart_policy: {
              condition: 'on-failure',
              delay: '5s',
              max_attempts: 3
            }
          },
          healthcheck: {
            test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
            interval: '30s',
            timeout: '10s',
            retries: 3
          }
        }
      }
    };
    
    return dockerConfig;
  }

  exportForKubernetes() {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'stealth-collection',
        labels: {
          app: 'stealth-collection',
          environment: this.environment
        }
      },
      spec: {
        replicas: this.config.clustering?.workers || 4,
        selector: {
          matchLabels: {
            app: 'stealth-collection'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'stealth-collection'
            }
          },
          spec: {
            containers: [{
              name: 'app',
              image: 'stealth-collection:latest',
              ports: [{
                containerPort: this.config.server.port
              }],
              env: this.getKubernetesEnv(),
              resources: {
                limits: {
                  cpu: '2000m',
                  memory: this.config.resources.maxMemory
                },
                requests: {
                  cpu: '500m',
                  memory: '512Mi'
                }
              },
              livenessProbe: {
                httpGet: {
                  path: '/health',
                  port: this.config.server.port
                },
                initialDelaySeconds: 30,
                periodSeconds: 30
              },
              readinessProbe: {
                httpGet: {
                  path: '/ready',
                  port: this.config.server.port
                },
                initialDelaySeconds: 10,
                periodSeconds: 10
              }
            }]
          }
        }
      }
    };
  }

  flattenConfig(prefix = '') {
    const flattened = {};
    
    const flatten = (obj, currentPrefix) => {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = currentPrefix ? `${currentPrefix}_${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey);
        } else {
          flattened[newKey.toUpperCase()] = value;
        }
      }
    };
    
    flatten(this.config, prefix);
    return flattened;
  }

  getKubernetesEnv() {
    const env = [];
    const flattened = this.flattenConfig();
    
    for (const [key, value] of Object.entries(flattened)) {
      if (value !== undefined && value !== null) {
        env.push({
          name: key,
          value: String(value)
        });
      }
    }
    
    return env;
  }
}

module.exports = DeploymentConfig;