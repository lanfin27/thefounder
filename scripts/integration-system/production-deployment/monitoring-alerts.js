// monitoring-alerts.js
// Monitoring and alerting system for production deployment

const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const axios = require('axios');

class MonitoringAlerts extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Alert channels configuration
      channels: {
        email: {
          enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
          smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          },
          from: process.env.ALERT_FROM_EMAIL || 'alerts@stealth-collection.com',
          to: process.env.ALERT_TO_EMAILS?.split(',') || []
        },
        
        slack: {
          enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: 'Stealth Collection Alerts',
          iconEmoji: ':warning:'
        },
        
        webhook: {
          enabled: process.env.WEBHOOK_ALERTS_ENABLED === 'true',
          endpoints: process.env.WEBHOOK_URLS?.split(',') || [],
          headers: {
            'Content-Type': 'application/json',
            'X-Alert-Source': 'stealth-collection'
          },
          timeout: 5000
        },
        
        pagerduty: {
          enabled: process.env.PAGERDUTY_ENABLED === 'true',
          integrationKey: process.env.PAGERDUTY_KEY,
          serviceId: process.env.PAGERDUTY_SERVICE_ID
        }
      },
      
      // Alert rules
      rules: [
        // System alerts
        {
          id: 'high_cpu',
          name: 'High CPU Usage',
          metric: 'cpu',
          operator: '>',
          threshold: 80,
          duration: 300000, // 5 minutes
          severity: 'warning',
          cooldown: 900000 // 15 minutes
        },
        {
          id: 'critical_cpu',
          name: 'Critical CPU Usage',
          metric: 'cpu',
          operator: '>',
          threshold: 95,
          duration: 60000, // 1 minute
          severity: 'critical',
          cooldown: 300000 // 5 minutes
        },
        {
          id: 'high_memory',
          name: 'High Memory Usage',
          metric: 'memory',
          operator: '>',
          threshold: 85,
          duration: 300000,
          severity: 'warning',
          cooldown: 900000
        },
        {
          id: 'critical_memory',
          name: 'Critical Memory Usage',
          metric: 'memory',
          operator: '>',
          threshold: 95,
          duration: 60000,
          severity: 'critical',
          cooldown: 300000
        },
        
        // Application alerts
        {
          id: 'high_error_rate',
          name: 'High Error Rate',
          metric: 'errorRate',
          operator: '>',
          threshold: 0.05, // 5%
          duration: 300000,
          severity: 'warning',
          cooldown: 600000
        },
        {
          id: 'critical_error_rate',
          name: 'Critical Error Rate',
          metric: 'errorRate',
          operator: '>',
          threshold: 0.15, // 15%
          duration: 60000,
          severity: 'critical',
          cooldown: 300000
        },
        {
          id: 'slow_response',
          name: 'Slow Response Time',
          metric: 'responseTime',
          operator: '>',
          threshold: 5000, // 5 seconds
          duration: 300000,
          severity: 'warning',
          cooldown: 600000
        },
        
        // Health alerts
        {
          id: 'service_unhealthy',
          name: 'Service Unhealthy',
          metric: 'health',
          operator: '==',
          threshold: 'unhealthy',
          duration: 180000, // 3 minutes
          severity: 'critical',
          cooldown: 600000
        },
        {
          id: 'database_down',
          name: 'Database Connection Failed',
          metric: 'database_health',
          operator: '==',
          threshold: 'unhealthy',
          duration: 60000,
          severity: 'critical',
          cooldown: 300000
        },
        
        // Worker alerts
        {
          id: 'worker_crash',
          name: 'Worker Process Crashed',
          metric: 'worker_crashes',
          operator: '>',
          threshold: 3,
          duration: 300000,
          severity: 'warning',
          cooldown: 600000
        },
        {
          id: 'scaling_failure',
          name: 'Auto-scaling Failure',
          metric: 'scaling_failures',
          operator: '>',
          threshold: 2,
          duration: 600000,
          severity: 'warning',
          cooldown: 1800000
        }
      ],
      
      // Alert aggregation
      aggregation: {
        enabled: true,
        window: 300000, // 5 minutes
        maxAlerts: 10
      },
      
      // Alert formatting
      formatting: {
        includeMetrics: true,
        includeTimestamp: true,
        includeHostInfo: true,
        includeRecommendations: true
      },
      
      ...config
    };

    // Alert state tracking
    this.alertState = new Map();
    this.alertHistory = [];
    this.aggregationBuffer = [];
    
    // Email transporter
    this.emailTransporter = null;
    
    // Initialize
    this.initialize();
  }

  async initialize() {
    console.log('🚨 Initializing monitoring alerts system');
    
    // Initialize email if enabled
    if (this.config.channels.email.enabled) {
      this.initializeEmail();
    }
    
    // Start aggregation timer if enabled
    if (this.config.aggregation.enabled) {
      this.startAggregation();
    }
    
    // Validate alert rules
    this.validateRules();
  }

  initializeEmail() {
    try {
      this.emailTransporter = nodemailer.createTransport(this.config.channels.email.smtp);
      console.log('✅ Email alerts initialized');
    } catch (error) {
      console.error('Failed to initialize email alerts:', error);
    }
  }

  validateRules() {
    const validOperators = ['>', '<', '>=', '<=', '==', '!='];
    
    for (const rule of this.config.rules) {
      if (!validOperators.includes(rule.operator)) {
        throw new Error(`Invalid operator in rule ${rule.id}: ${rule.operator}`);
      }
      
      // Initialize rule state
      this.alertState.set(rule.id, {
        triggered: false,
        firstTriggered: null,
        lastTriggered: null,
        cooldownUntil: null,
        currentValue: null
      });
    }
  }

  startAggregation() {
    this.aggregationInterval = setInterval(() => {
      this.flushAggregationBuffer();
    }, this.config.aggregation.window);
  }

  // Check metrics against alert rules
  async checkMetrics(metrics) {
    const triggeredAlerts = [];
    
    for (const rule of this.config.rules) {
      const value = this.getMetricValue(metrics, rule.metric);
      if (value === undefined) continue;
      
      const state = this.alertState.get(rule.id);
      const triggered = this.evaluateRule(rule, value);
      
      // Update current value
      state.currentValue = value;
      
      if (triggered) {
        if (!state.triggered) {
          // New alert
          state.firstTriggered = Date.now();
          state.triggered = true;
        }
        
        // Check if duration threshold is met
        const duration = Date.now() - state.firstTriggered;
        if (duration >= rule.duration) {
          // Check cooldown
          if (!state.cooldownUntil || Date.now() >= state.cooldownUntil) {
            triggeredAlerts.push({
              rule,
              value,
              duration,
              timestamp: Date.now()
            });
            
            state.lastTriggered = Date.now();
            state.cooldownUntil = Date.now() + rule.cooldown;
          }
        }
      } else {
        // Alert condition cleared
        if (state.triggered) {
          state.triggered = false;
          state.firstTriggered = null;
          
          // Send recovery notification
          this.sendRecoveryNotification(rule, value);
        }
      }
    }
    
    // Process triggered alerts
    for (const alert of triggeredAlerts) {
      await this.processAlert(alert);
    }
  }

  getMetricValue(metrics, metricPath) {
    const parts = metricPath.split('.');
    let value = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  evaluateRule(rule, value) {
    switch (rule.operator) {
      case '>': return value > rule.threshold;
      case '<': return value < rule.threshold;
      case '>=': return value >= rule.threshold;
      case '<=': return value <= rule.threshold;
      case '==': return value === rule.threshold;
      case '!=': return value !== rule.threshold;
      default: return false;
    }
  }

  async processAlert(alert) {
    // Add to history
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(0, 1000);
    }
    
    // Format alert
    const formattedAlert = this.formatAlert(alert);
    
    // Add to aggregation buffer or send immediately
    if (this.config.aggregation.enabled) {
      this.aggregationBuffer.push(formattedAlert);
      
      if (this.aggregationBuffer.length >= this.config.aggregation.maxAlerts) {
        await this.flushAggregationBuffer();
      }
    } else {
      await this.sendAlert(formattedAlert);
    }
    
    // Emit alert event
    this.emit('alert', formattedAlert);
  }

  formatAlert(alert) {
    const { rule, value, duration, timestamp } = alert;
    
    const formatted = {
      id: `${rule.id}_${timestamp}`,
      timestamp: new Date(timestamp).toISOString(),
      severity: rule.severity,
      rule: {
        id: rule.id,
        name: rule.name
      },
      message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.operator} ${rule.threshold})`,
      details: {
        metric: rule.metric,
        currentValue: value,
        threshold: rule.threshold,
        operator: rule.operator,
        duration: Math.round(duration / 1000) + ' seconds'
      }
    };
    
    // Add optional information
    if (this.config.formatting.includeHostInfo) {
      formatted.host = this.getHostInfo();
    }
    
    if (this.config.formatting.includeRecommendations) {
      formatted.recommendations = this.getRecommendations(rule, value);
    }
    
    return formatted;
  }

  getHostInfo() {
    const os = require('os');
    
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      uptime: os.uptime(),
      loadavg: os.loadavg()
    };
  }

  getRecommendations(rule, value) {
    const recommendations = [];
    
    switch (rule.id) {
      case 'high_cpu':
      case 'critical_cpu':
        recommendations.push('Consider scaling up worker processes');
        recommendations.push('Check for CPU-intensive operations');
        recommendations.push('Review recent code changes');
        break;
        
      case 'high_memory':
      case 'critical_memory':
        recommendations.push('Check for memory leaks');
        recommendations.push('Review large data processing operations');
        recommendations.push('Consider increasing memory limits');
        break;
        
      case 'high_error_rate':
      case 'critical_error_rate':
        recommendations.push('Check application logs for error details');
        recommendations.push('Review recent deployments');
        recommendations.push('Verify external service dependencies');
        break;
        
      case 'slow_response':
        recommendations.push('Check database query performance');
        recommendations.push('Review API endpoint efficiency');
        recommendations.push('Consider implementing caching');
        break;
        
      case 'service_unhealthy':
        recommendations.push('Check health endpoint details');
        recommendations.push('Verify all dependencies are accessible');
        recommendations.push('Review system resources');
        break;
        
      case 'database_down':
        recommendations.push('Check database server status');
        recommendations.push('Verify network connectivity');
        recommendations.push('Review database credentials');
        break;
    }
    
    return recommendations;
  }

  async flushAggregationBuffer() {
    if (this.aggregationBuffer.length === 0) return;
    
    const alerts = [...this.aggregationBuffer];
    this.aggregationBuffer = [];
    
    // Group by severity
    const grouped = alerts.reduce((acc, alert) => {
      const severity = alert.severity;
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(alert);
      return acc;
    }, {});
    
    // Send aggregated alert
    const aggregatedAlert = {
      id: `aggregated_${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: this.getHighestSeverity(Object.keys(grouped)),
      message: `${alerts.length} alerts triggered`,
      summary: Object.entries(grouped).map(([severity, items]) => ({
        severity,
        count: items.length,
        alerts: items.map(a => a.message)
      })),
      alerts
    };
    
    await this.sendAlert(aggregatedAlert);
  }

  getHighestSeverity(severities) {
    const order = ['critical', 'warning', 'info'];
    for (const severity of order) {
      if (severities.includes(severity)) return severity;
    }
    return 'info';
  }

  async sendAlert(alert) {
    const promises = [];
    
    // Send to email
    if (this.config.channels.email.enabled) {
      promises.push(this.sendEmailAlert(alert));
    }
    
    // Send to Slack
    if (this.config.channels.slack.enabled) {
      promises.push(this.sendSlackAlert(alert));
    }
    
    // Send to webhooks
    if (this.config.channels.webhook.enabled) {
      promises.push(this.sendWebhookAlert(alert));
    }
    
    // Send to PagerDuty
    if (this.config.channels.pagerduty.enabled && alert.severity === 'critical') {
      promises.push(this.sendPagerDutyAlert(alert));
    }
    
    // Wait for all channels
    const results = await Promise.allSettled(promises);
    
    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send alert to channel ${index}:`, result.reason);
      }
    });
  }

  async sendEmailAlert(alert) {
    if (!this.emailTransporter || this.config.channels.email.to.length === 0) {
      return;
    }
    
    const subject = `[${alert.severity.toUpperCase()}] ${alert.message}`;
    
    const html = `
      <h2>Alert: ${alert.message}</h2>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Time:</strong> ${alert.timestamp}</p>
      
      ${alert.details ? `
        <h3>Details</h3>
        <pre>${JSON.stringify(alert.details, null, 2)}</pre>
      ` : ''}
      
      ${alert.recommendations ? `
        <h3>Recommendations</h3>
        <ul>
          ${alert.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
      
      ${alert.host ? `
        <h3>Host Information</h3>
        <pre>${JSON.stringify(alert.host, null, 2)}</pre>
      ` : ''}
    `;
    
    try {
      await this.emailTransporter.sendMail({
        from: this.config.channels.email.from,
        to: this.config.channels.email.to.join(','),
        subject,
        html
      });
    } catch (error) {
      throw new Error(`Email send failed: ${error.message}`);
    }
  }

  async sendSlackAlert(alert) {
    if (!this.config.channels.slack.webhookUrl) return;
    
    const color = {
      critical: 'danger',
      warning: 'warning',
      info: 'good'
    }[alert.severity] || 'warning';
    
    const payload = {
      channel: this.config.channels.slack.channel,
      username: this.config.channels.slack.username,
      icon_emoji: this.config.channels.slack.iconEmoji,
      attachments: [{
        color,
        title: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity,
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp,
            short: true
          }
        ],
        footer: 'Stealth Collection Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    if (alert.details) {
      payload.attachments[0].fields.push({
        title: 'Details',
        value: Object.entries(alert.details)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n'),
        short: false
      });
    }
    
    if (alert.recommendations) {
      payload.attachments[0].fields.push({
        title: 'Recommendations',
        value: alert.recommendations.join('\n'),
        short: false
      });
    }
    
    try {
      await axios.post(this.config.channels.slack.webhookUrl, payload, {
        timeout: this.config.channels.webhook.timeout
      });
    } catch (error) {
      throw new Error(`Slack send failed: ${error.message}`);
    }
  }

  async sendWebhookAlert(alert) {
    const promises = this.config.channels.webhook.endpoints.map(async (endpoint) => {
      try {
        await axios.post(endpoint, alert, {
          headers: this.config.channels.webhook.headers,
          timeout: this.config.channels.webhook.timeout
        });
      } catch (error) {
        throw new Error(`Webhook send failed to ${endpoint}: ${error.message}`);
      }
    });
    
    await Promise.all(promises);
  }

  async sendPagerDutyAlert(alert) {
    if (!this.config.channels.pagerduty.integrationKey) return;
    
    const event = {
      routing_key: this.config.channels.pagerduty.integrationKey,
      event_action: 'trigger',
      dedup_key: alert.rule?.id || alert.id,
      payload: {
        summary: alert.message,
        source: 'stealth-collection',
        severity: alert.severity === 'critical' ? 'error' : 'warning',
        timestamp: alert.timestamp,
        custom_details: {
          ...alert.details,
          recommendations: alert.recommendations,
          host: alert.host
        }
      }
    };
    
    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', event, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
    } catch (error) {
      throw new Error(`PagerDuty send failed: ${error.message}`);
    }
  }

  async sendRecoveryNotification(rule, value) {
    const recovery = {
      id: `recovery_${rule.id}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: 'info',
      message: `Recovery: ${rule.name} - ${rule.metric} is now ${value}`,
      details: {
        metric: rule.metric,
        currentValue: value,
        threshold: rule.threshold,
        operator: rule.operator
      }
    };
    
    // Send recovery notification
    await this.sendAlert(recovery);
    
    // Send PagerDuty recovery if it was critical
    if (rule.severity === 'critical' && this.config.channels.pagerduty.enabled) {
      await this.sendPagerDutyRecovery(rule);
    }
  }

  async sendPagerDutyRecovery(rule) {
    if (!this.config.channels.pagerduty.integrationKey) return;
    
    const event = {
      routing_key: this.config.channels.pagerduty.integrationKey,
      event_action: 'resolve',
      dedup_key: rule.id
    };
    
    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', event, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
    } catch (error) {
      console.error('Failed to send PagerDuty recovery:', error);
    }
  }

  // Test alert functionality
  async testAlert(severity = 'warning') {
    const testAlert = {
      id: `test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity,
      message: 'Test Alert - This is a test of the alert system',
      details: {
        type: 'test',
        triggered_by: 'manual'
      },
      recommendations: ['This is a test alert', 'No action required']
    };
    
    await this.sendAlert(testAlert);
  }

  // Get alert statistics
  getStatistics() {
    const stats = {
      total: this.alertHistory.length,
      bySeverity: {},
      byRule: {},
      recent: this.alertHistory.slice(0, 10)
    };
    
    // Count by severity
    for (const alert of this.alertHistory) {
      const severity = alert.rule?.severity || 'unknown';
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
      
      const ruleId = alert.rule?.id || 'unknown';
      stats.byRule[ruleId] = (stats.byRule[ruleId] || 0) + 1;
    }
    
    return stats;
  }

  // Get current alert states
  getAlertStates() {
    const states = [];
    
    for (const [ruleId, state] of this.alertState) {
      const rule = this.config.rules.find(r => r.id === ruleId);
      if (!rule) continue;
      
      states.push({
        rule: {
          id: rule.id,
          name: rule.name,
          severity: rule.severity
        },
        triggered: state.triggered,
        currentValue: state.currentValue,
        lastTriggered: state.lastTriggered,
        cooldownUntil: state.cooldownUntil
      });
    }
    
    return states;
  }

  // Update alert configuration
  updateConfiguration(config) {
    Object.assign(this.config, config);
    
    // Reinitialize if needed
    if (config.channels?.email && this.config.channels.email.enabled) {
      this.initializeEmail();
    }
    
    // Revalidate rules if updated
    if (config.rules) {
      this.validateRules();
    }
  }

  // Cleanup
  shutdown() {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    
    // Flush any remaining alerts
    this.flushAggregationBuffer();
  }
}

module.exports = MonitoringAlerts;