// control-panel.js
// User-friendly control panel with one-click execution

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const EventEmitter = require('events');

class ControlPanel extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      port: 3000,
      
      // Quick actions
      quickActions: [
        {
          id: 'start_collection',
          name: 'Start Collection',
          icon: '▶️',
          color: 'success',
          confirmation: false,
          params: []
        },
        {
          id: 'stop_collection',
          name: 'Stop Collection',
          icon: '⏹️',
          color: 'danger',
          confirmation: true,
          params: []
        },
        {
          id: 'quick_scan',
          name: 'Quick Scan',
          icon: '🔍',
          color: 'primary',
          confirmation: false,
          params: [
            { name: 'url', type: 'text', placeholder: 'Enter URL', required: true }
          ]
        },
        {
          id: 'batch_import',
          name: 'Batch Import',
          icon: '📥',
          color: 'info',
          confirmation: false,
          params: [
            { name: 'file', type: 'file', accept: '.csv,.txt', required: true }
          ]
        },
        {
          id: 'export_data',
          name: 'Export Data',
          icon: '📤',
          color: 'secondary',
          confirmation: false,
          params: [
            { name: 'format', type: 'select', options: ['CSV', 'JSON', 'Excel'], required: true }
          ]
        },
        {
          id: 'clear_errors',
          name: 'Clear Errors',
          icon: '🧹',
          color: 'warning',
          confirmation: true,
          params: []
        }
      ],
      
      // Presets for common configurations
      presets: [
        {
          id: 'conservative',
          name: 'Conservative',
          description: 'Slow and steady, minimal detection risk',
          settings: {
            concurrency: 2,
            requestDelay: 5000,
            proxyType: 'residential',
            behaviorProfile: 'cautious'
          }
        },
        {
          id: 'balanced',
          name: 'Balanced',
          description: 'Good balance of speed and safety',
          settings: {
            concurrency: 5,
            requestDelay: 3000,
            proxyType: 'residential',
            behaviorProfile: 'normal'
          }
        },
        {
          id: 'aggressive',
          name: 'Aggressive',
          description: 'Fast collection, higher risk',
          settings: {
            concurrency: 10,
            requestDelay: 1000,
            proxyType: 'datacenter',
            behaviorProfile: 'fast'
          }
        },
        {
          id: 'custom',
          name: 'Custom',
          description: 'Configure your own settings',
          settings: {}
        }
      ],
      
      // Status indicators
      statusIndicators: {
        system: 'offline',
        database: 'disconnected',
        proxies: 'unknown',
        collection: 'stopped'
      },
      
      ...config
    };

    // Express app
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIO(this.server);
    
    // Active state
    this.state = {
      isRunning: false,
      currentPreset: 'balanced',
      activeSessions: 0,
      tasksQueue: [],
      recentActivities: [],
      systemMetrics: {}
    };
    
    // Connected clients
    this.clients = new Set();
    
    // Initialize
    this.initialize();
  }

  initialize() {
    // Setup middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Setup routes
    this.setupRoutes();
    
    // Setup WebSocket
    this.setupWebSocket();
    
    // Start server
    this.server.listen(this.config.port, () => {
      console.log(`🎮 Control Panel running at http://localhost:${this.config.port}`);
    });
  }

  setupRoutes() {
    // Main interface
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'control-panel.html'));
    });
    
    // API routes
    this.app.get('/api/status', (req, res) => {
      res.json({
        state: this.state,
        indicators: this.config.statusIndicators,
        uptime: process.uptime()
      });
    });
    
    this.app.get('/api/actions', (req, res) => {
      res.json(this.config.quickActions);
    });
    
    this.app.get('/api/presets', (req, res) => {
      res.json(this.config.presets);
    });
    
    this.app.post('/api/execute', async (req, res) => {
      const { actionId, params } = req.body;
      
      try {
        const result = await this.executeAction(actionId, params);
        res.json({ success: true, result });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
    
    this.app.post('/api/preset', (req, res) => {
      const { presetId } = req.body;
      
      try {
        this.applyPreset(presetId);
        res.json({ success: true, preset: presetId });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
    
    this.app.post('/api/settings', (req, res) => {
      const { settings } = req.body;
      
      try {
        this.updateSettings(settings);
        res.json({ success: true, settings });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
    
    this.app.get('/api/activities', (req, res) => {
      res.json(this.state.recentActivities.slice(-50));
    });
    
    this.app.get('/api/metrics', (req, res) => {
      res.json(this.state.systemMetrics);
    });
    
    this.app.post('/api/task', (req, res) => {
      const { task } = req.body;
      
      try {
        const taskId = this.queueTask(task);
        res.json({ success: true, taskId });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
    
    this.app.delete('/api/task/:taskId', (req, res) => {
      const { taskId } = req.params;
      
      try {
        this.cancelTask(taskId);
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log('🔌 Control panel client connected');
      this.clients.add(socket);
      
      // Send initial state
      socket.emit('state', this.state);
      socket.emit('indicators', this.config.statusIndicators);
      
      // Handle client requests
      socket.on('execute', async (data) => {
        try {
          const result = await this.executeAction(data.actionId, data.params);
          socket.emit('execution_result', { 
            success: true, 
            actionId: data.actionId,
            result 
          });
        } catch (error) {
          socket.emit('execution_result', { 
            success: false, 
            actionId: data.actionId,
            error: error.message 
          });
        }
      });
      
      socket.on('get_logs', async (filters) => {
        const logs = await this.getLogs(filters);
        socket.emit('logs', logs);
      });
      
      socket.on('get_results', async (filters) => {
        const results = await this.getResults(filters);
        socket.emit('results', results);
      });
      
      socket.on('disconnect', () => {
        this.clients.delete(socket);
        console.log('🔌 Control panel client disconnected');
      });
    });
  }

  async executeAction(actionId, params = {}) {
    const action = this.config.quickActions.find(a => a.id === actionId);
    if (!action) {
      throw new Error(`Unknown action: ${actionId}`);
    }
    
    // Log activity
    this.addActivity({
      type: 'action',
      action: actionId,
      params,
      timestamp: Date.now()
    });
    
    // Emit action event for system to handle
    this.emit('action', { actionId, params });
    
    // Handle built-in actions
    switch (actionId) {
      case 'start_collection':
        return await this.startCollection(params);
        
      case 'stop_collection':
        return await this.stopCollection();
        
      case 'quick_scan':
        return await this.quickScan(params);
        
      case 'batch_import':
        return await this.batchImport(params);
        
      case 'export_data':
        return await this.exportData(params);
        
      case 'clear_errors':
        return await this.clearErrors();
        
      default:
        // Custom action - emit for external handling
        return await this.handleCustomAction(actionId, params);
    }
  }

  async startCollection(params) {
    if (this.state.isRunning) {
      throw new Error('Collection already running');
    }
    
    this.state.isRunning = true;
    this.updateIndicator('collection', 'running');
    this.broadcastState();
    
    return {
      message: 'Collection started',
      preset: this.state.currentPreset
    };
  }

  async stopCollection() {
    if (!this.state.isRunning) {
      throw new Error('Collection not running');
    }
    
    this.state.isRunning = false;
    this.updateIndicator('collection', 'stopped');
    this.broadcastState();
    
    return {
      message: 'Collection stopped',
      sessionsActive: this.state.activeSessions
    };
  }

  async quickScan(params) {
    if (!params.url) {
      throw new Error('URL is required');
    }
    
    const taskId = this.queueTask({
      type: 'scan',
      url: params.url,
      priority: 'high'
    });
    
    return {
      message: 'Scan queued',
      taskId,
      url: params.url
    };
  }

  async batchImport(params) {
    if (!params.file) {
      throw new Error('File is required');
    }
    
    // Process file upload
    const urls = await this.processImportFile(params.file);
    
    const taskId = this.queueTask({
      type: 'batch',
      urls,
      priority: 'normal'
    });
    
    return {
      message: 'Batch import queued',
      taskId,
      urlCount: urls.length
    };
  }

  async exportData(params) {
    const format = params.format || 'CSV';
    
    // Trigger export
    this.emit('export', { format });
    
    return {
      message: 'Export initiated',
      format
    };
  }

  async clearErrors() {
    this.emit('clear_errors');
    
    this.addActivity({
      type: 'maintenance',
      action: 'clear_errors',
      timestamp: Date.now()
    });
    
    return {
      message: 'Errors cleared'
    };
  }

  async handleCustomAction(actionId, params) {
    // Wait for external handler
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Action timeout'));
      }, 30000);
      
      this.once(`action_result:${actionId}`, (result) => {
        clearTimeout(timeout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });
    });
  }

  applyPreset(presetId) {
    const preset = this.config.presets.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`Unknown preset: ${presetId}`);
    }
    
    this.state.currentPreset = presetId;
    
    // Apply settings
    this.emit('apply_preset', preset.settings);
    
    this.addActivity({
      type: 'config',
      action: 'apply_preset',
      preset: presetId,
      timestamp: Date.now()
    });
    
    this.broadcastState();
  }

  updateSettings(settings) {
    // Validate settings
    this.validateSettings(settings);
    
    // Apply settings
    this.emit('update_settings', settings);
    
    this.addActivity({
      type: 'config',
      action: 'update_settings',
      settings,
      timestamp: Date.now()
    });
  }

  validateSettings(settings) {
    if (settings.concurrency && (settings.concurrency < 1 || settings.concurrency > 20)) {
      throw new Error('Concurrency must be between 1 and 20');
    }
    
    if (settings.requestDelay && settings.requestDelay < 100) {
      throw new Error('Request delay must be at least 100ms');
    }
    
    // Add more validation as needed
  }

  queueTask(task) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedTask = {
      id: taskId,
      ...task,
      status: 'queued',
      queuedAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };
    
    this.state.tasksQueue.push(queuedTask);
    
    // Emit task for processing
    this.emit('task_queued', queuedTask);
    
    this.broadcastTaskUpdate(queuedTask);
    
    return taskId;
  }

  cancelTask(taskId) {
    const taskIndex = this.state.tasksQueue.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    const task = this.state.tasksQueue[taskIndex];
    
    if (task.status === 'completed' || task.status === 'failed') {
      throw new Error('Cannot cancel completed task');
    }
    
    task.status = 'cancelled';
    task.completedAt = Date.now();
    
    this.emit('task_cancelled', task);
    this.broadcastTaskUpdate(task);
  }

  updateTaskStatus(taskId, update) {
    const task = this.state.tasksQueue.find(t => t.id === taskId);
    
    if (!task) return;
    
    Object.assign(task, update);
    
    if (update.status === 'running' && !task.startedAt) {
      task.startedAt = Date.now();
    }
    
    if (['completed', 'failed'].includes(update.status) && !task.completedAt) {
      task.completedAt = Date.now();
    }
    
    this.broadcastTaskUpdate(task);
  }

  async processImportFile(fileData) {
    // Parse file and extract URLs
    // This is a placeholder - implement actual file parsing
    const urls = fileData.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('http'));
    
    return urls;
  }

  async getLogs(filters = {}) {
    // Emit request for logs
    return new Promise((resolve) => {
      this.emit('get_logs', filters);
      this.once('logs_data', resolve);
    });
  }

  async getResults(filters = {}) {
    // Emit request for results
    return new Promise((resolve) => {
      this.emit('get_results', filters);
      this.once('results_data', resolve);
    });
  }

  updateIndicator(indicator, status) {
    this.config.statusIndicators[indicator] = status;
    this.broadcastIndicators();
  }

  updateMetrics(metrics) {
    this.state.systemMetrics = {
      ...this.state.systemMetrics,
      ...metrics,
      lastUpdate: Date.now()
    };
    
    this.broadcastMetrics();
  }

  updateActiveSessions(count) {
    this.state.activeSessions = count;
    this.broadcastState();
  }

  addActivity(activity) {
    this.state.recentActivities.unshift(activity);
    
    // Keep only recent activities
    if (this.state.recentActivities.length > 100) {
      this.state.recentActivities = this.state.recentActivities.slice(0, 100);
    }
    
    this.broadcastActivity(activity);
  }

  // Broadcasting methods
  broadcastState() {
    this.broadcast('state', this.state);
  }

  broadcastIndicators() {
    this.broadcast('indicators', this.config.statusIndicators);
  }

  broadcastMetrics() {
    this.broadcast('metrics', this.state.systemMetrics);
  }

  broadcastTaskUpdate(task) {
    this.broadcast('task_update', task);
  }

  broadcastActivity(activity) {
    this.broadcast('activity', activity);
  }

  broadcast(event, data) {
    this.clients.forEach(client => {
      if (client.connected) {
        client.emit(event, data);
      }
    });
  }

  // Result handling
  handleActionResult(actionId, result) {
    this.emit(`action_result:${actionId}`, result);
  }

  // System integration
  setSystem(system) {
    this.system = system;
    
    // Update indicators based on system state
    this.updateIndicator('system', 'online');
    
    // Subscribe to system events
    if (system.on) {
      system.on('metrics', (metrics) => this.updateMetrics(metrics));
      system.on('session_update', (count) => this.updateActiveSessions(count));
      system.on('error', (error) => this.handleSystemError(error));
    }
  }

  handleSystemError(error) {
    this.addActivity({
      type: 'error',
      message: error.message,
      timestamp: Date.now()
    });
    
    // Broadcast error notification
    this.broadcast('error', {
      message: error.message,
      severity: error.severity || 'error'
    });
  }

  // Cleanup
  shutdown() {
    // Close all connections
    this.clients.forEach(client => client.disconnect());
    
    // Close server
    this.server.close();
    
    console.log('🎮 Control Panel shut down');
  }
}

module.exports = ControlPanel;