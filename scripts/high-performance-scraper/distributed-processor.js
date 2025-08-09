// scripts/high-performance-scraper/distributed-processor.js
// High-Performance Distributed Processing System

const { Worker } = require('worker_threads');
const os = require('os');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class DistributedProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxWorkers: Math.min(os.cpus().length * 4, 32), // Increased to 32 workers
      maxConcurrencyPerWorker: 15, // Increased concurrency
      taskTimeout: 30000,
      retryAttempts: 3,
      adaptiveConcurrency: true,
      memoryThreshold: 0.85, // 85% memory usage threshold
      cpuThreshold: 0.9, // 90% CPU usage threshold
      ...config
    };
    
    this.workers = [];
    this.taskQueue = [];
    this.activeJobs = new Map();
    this.completedJobs = 0;
    this.failedJobs = 0;
    this.performanceMetrics = new Map();
    
    this.isRunning = false;
    this.startTime = null;
  }

  async initialize() {
    console.log('🚀 Initializing Distributed Processing System');
    console.log(`💻 CPU Cores: ${os.cpus().length}`);
    console.log(`👷 Max Workers: ${this.config.maxWorkers}`);
    console.log(`⚡ Max Concurrency per Worker: ${this.config.maxConcurrencyPerWorker}`);
    console.log('');
    
    // Create worker script
    await this.createWorkerScript();
    
    // Initialize workers
    for (let i = 0; i < this.config.maxWorkers; i++) {
      await this.createWorker(i);
    }
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    // Start monitoring
    this.startPerformanceMonitoring();
  }

  async createWorker(workerId) {
    const worker = new Worker(path.join(__dirname, 'worker-script.js'), {
      workerData: {
        workerId,
        config: this.config
      }
    });
    
    worker.on('message', (message) => this.handleWorkerMessage(workerId, message));
    worker.on('error', (error) => this.handleWorkerError(workerId, error));
    worker.on('exit', (code) => this.handleWorkerExit(workerId, code));
    
    this.workers[workerId] = {
      worker,
      status: 'idle',
      currentTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      lastActivity: Date.now()
    };
    
    // Initialize performance metrics for this worker
    this.performanceMetrics.set(workerId, {
      totalTasks: 0,
      totalTime: 0,
      avgResponseTime: 0,
      successRate: 100
    });
  }

  async createWorkerScript() {
    const workerScript = `
const { parentPort, workerData } = require('worker_threads');
const HybridScrapingStrategy = require('./hybrid-scraping-strategy');

const scraper = new HybridScrapingStrategy(workerData.config);

parentPort.on('message', async (task) => {
  const startTime = Date.now();
  
  try {
    // Process the scraping task
    const result = await scraper.scrapeWithOptimalStrategy(task.target);
    
    parentPort.postMessage({
      type: 'task_complete',
      taskId: task.id,
      result,
      executionTime: Date.now() - startTime
    });
  } catch (error) {
    parentPort.postMessage({
      type: 'task_error',
      taskId: task.id,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
});

// Send ready signal
parentPort.postMessage({ type: 'worker_ready' });
`;
    
    await fs.writeFile(
      path.join(__dirname, 'worker-script.js'),
      workerScript
    );
  }

  async processBatch(targets) {
    if (!this.isRunning) {
      await this.initialize();
    }
    
    console.log(`\n📦 Processing batch of ${targets.length} targets`);
    
    // Create tasks from targets
    const tasks = targets.map((target, index) => ({
      id: `task_${Date.now()}_${index}`,
      target,
      priority: target.priority || 1,
      retries: 0,
      status: 'pending'
    }));
    
    // Add tasks to queue
    this.taskQueue.push(...tasks);
    
    // Sort by priority
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    // Process queue
    await this.processQueue();
    
    // Wait for all tasks to complete
    await this.waitForCompletion(tasks);
    
    return this.getResults(tasks.map(t => t.id));
  }

  async processQueue() {
    while (this.taskQueue.length > 0) {
      // Find available worker
      const availableWorker = this.findAvailableWorker();
      
      if (!availableWorker) {
        // No workers available, wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // Get next task
      const task = this.taskQueue.shift();
      if (!task) break;
      
      // Assign task to worker
      this.assignTaskToWorker(availableWorker.id, task);
    }
  }

  findAvailableWorker() {
    // Find worker with least load
    let bestWorker = null;
    let minLoad = Infinity;
    
    for (let i = 0; i < this.workers.length; i++) {
      const worker = this.workers[i];
      
      if (worker.status === 'idle' || 
          (worker.status === 'working' && 
           worker.currentTasks < this.config.maxConcurrencyPerWorker)) {
        
        if (worker.currentTasks < minLoad) {
          minLoad = worker.currentTasks;
          bestWorker = { id: i, worker };
        }
      }
    }
    
    return bestWorker;
  }

  assignTaskToWorker(workerId, task) {
    const workerInfo = this.workers[workerId];
    
    // Update worker status
    workerInfo.status = 'working';
    workerInfo.currentTasks++;
    workerInfo.lastActivity = Date.now();
    
    // Track active job
    this.activeJobs.set(task.id, {
      workerId,
      task,
      startTime: Date.now()
    });
    
    // Send task to worker
    workerInfo.worker.postMessage(task);
    
    // Set timeout for task
    setTimeout(() => {
      if (this.activeJobs.has(task.id)) {
        this.handleTaskTimeout(task.id);
      }
    }, this.config.taskTimeout);
  }

  handleWorkerMessage(workerId, message) {
    const workerInfo = this.workers[workerId];
    
    switch (message.type) {
      case 'worker_ready':
        console.log(`✅ Worker ${workerId} ready`);
        break;
        
      case 'task_complete':
        this.handleTaskComplete(workerId, message);
        break;
        
      case 'task_error':
        this.handleTaskError(workerId, message);
        break;
        
      case 'performance_update':
        this.updatePerformanceMetrics(workerId, message.metrics);
        break;
    }
  }

  handleTaskComplete(workerId, message) {
    const { taskId, result, executionTime } = message;
    const jobInfo = this.activeJobs.get(taskId);
    
    if (!jobInfo) return;
    
    // Update worker stats
    const workerInfo = this.workers[workerId];
    workerInfo.currentTasks--;
    workerInfo.completedTasks++;
    
    if (workerInfo.currentTasks === 0) {
      workerInfo.status = 'idle';
    }
    
    // Update performance metrics
    const metrics = this.performanceMetrics.get(workerId);
    metrics.totalTasks++;
    metrics.totalTime += executionTime;
    metrics.avgResponseTime = metrics.totalTime / metrics.totalTasks;
    
    // Store result
    jobInfo.result = result;
    jobInfo.status = 'completed';
    jobInfo.executionTime = executionTime;
    
    // Clean up
    this.activeJobs.delete(taskId);
    this.completedJobs++;
    
    // Emit progress event
    this.emitProgress();
    
    // Process more tasks if available
    if (this.taskQueue.length > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  handleTaskError(workerId, message) {
    const { taskId, error } = message;
    const jobInfo = this.activeJobs.get(taskId);
    
    if (!jobInfo) return;
    
    // Update worker stats
    const workerInfo = this.workers[workerId];
    workerInfo.currentTasks--;
    workerInfo.failedTasks++;
    
    if (workerInfo.currentTasks === 0) {
      workerInfo.status = 'idle';
    }
    
    // Handle retry logic
    if (jobInfo.task.retries < this.config.retryAttempts) {
      jobInfo.task.retries++;
      console.log(`🔄 Retrying task ${taskId} (attempt ${jobInfo.task.retries})`);
      
      // Re-queue task
      this.taskQueue.unshift(jobInfo.task);
      this.activeJobs.delete(taskId);
      
      // Process queue
      setImmediate(() => this.processQueue());
    } else {
      // Max retries reached
      jobInfo.result = { error, success: false };
      jobInfo.status = 'failed';
      
      this.activeJobs.delete(taskId);
      this.failedJobs++;
      
      // Update performance metrics
      const metrics = this.performanceMetrics.get(workerId);
      metrics.successRate = (metrics.totalTasks - workerInfo.failedTasks) / metrics.totalTasks * 100;
    }
    
    this.emitProgress();
  }

  handleTaskTimeout(taskId) {
    const jobInfo = this.activeJobs.get(taskId);
    if (!jobInfo) return;
    
    console.log(`⏱️ Task ${taskId} timed out`);
    
    // Treat as error
    this.handleTaskError(jobInfo.workerId, {
      taskId,
      error: 'Task timeout'
    });
  }

  handleWorkerError(workerId, error) {
    console.error(`❌ Worker ${workerId} error:`, error);
    
    // Restart worker
    this.restartWorker(workerId);
  }

  handleWorkerExit(workerId, code) {
    if (code !== 0) {
      console.error(`⚠️ Worker ${workerId} exited with code ${code}`);
      this.restartWorker(workerId);
    }
  }

  async restartWorker(workerId) {
    console.log(`🔄 Restarting worker ${workerId}`);
    
    // Terminate existing worker
    const workerInfo = this.workers[workerId];
    if (workerInfo && workerInfo.worker) {
      await workerInfo.worker.terminate();
    }
    
    // Create new worker
    await this.createWorker(workerId);
  }

  startPerformanceMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkSystemResources();
      this.adjustConcurrency();
      this.reportPerformance();
    }, 5000); // Check every 5 seconds
  }

  checkSystemResources() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = 1 - (freeMemory / totalMemory);
    
    if (memoryUsage > this.config.memoryThreshold) {
      console.warn(`⚠️ High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);
      
      // Reduce concurrency
      this.config.maxConcurrencyPerWorker = Math.max(1, 
        Math.floor(this.config.maxConcurrencyPerWorker * 0.8)
      );
    }
  }

  adjustConcurrency() {
    if (!this.config.adaptiveConcurrency) return;
    
    // Calculate average response time across all workers
    let totalAvgTime = 0;
    let activeWorkers = 0;
    
    for (const [workerId, metrics] of this.performanceMetrics) {
      if (metrics.totalTasks > 0) {
        totalAvgTime += metrics.avgResponseTime;
        activeWorkers++;
      }
    }
    
    if (activeWorkers === 0) return;
    
    const overallAvgTime = totalAvgTime / activeWorkers;
    
    // Adjust concurrency based on performance
    if (overallAvgTime < 1000) {
      // Very fast responses, increase concurrency
      this.config.maxConcurrencyPerWorker = Math.min(
        this.config.maxConcurrencyPerWorker + 1,
        20
      );
    } else if (overallAvgTime > 5000) {
      // Slow responses, decrease concurrency
      this.config.maxConcurrencyPerWorker = Math.max(
        this.config.maxConcurrencyPerWorker - 1,
        1
      );
    }
  }

  reportPerformance() {
    const runtime = (Date.now() - this.startTime) / 1000;
    const throughput = this.completedJobs / runtime;
    
    console.log(`\n📊 Performance Update:`);
    console.log(`   Runtime: ${runtime.toFixed(1)}s`);
    console.log(`   Completed: ${this.completedJobs}`);
    console.log(`   Failed: ${this.failedJobs}`);
    console.log(`   Throughput: ${throughput.toFixed(1)} jobs/sec`);
    console.log(`   Queue Size: ${this.taskQueue.length}`);
    console.log(`   Active Jobs: ${this.activeJobs.size}`);
    
    // Worker performance
    console.log(`\n   Worker Performance:`);
    for (let i = 0; i < this.workers.length; i++) {
      const worker = this.workers[i];
      const metrics = this.performanceMetrics.get(i);
      
      console.log(`     Worker ${i}: ${worker.status} | Tasks: ${worker.currentTasks}/${this.config.maxConcurrencyPerWorker} | Completed: ${worker.completedTasks} | Avg Time: ${metrics.avgResponseTime.toFixed(0)}ms`);
    }
  }

  emitProgress() {
    const totalTasks = this.completedJobs + this.failedJobs + this.activeJobs.size + this.taskQueue.length;
    const progress = totalTasks > 0 ? (this.completedJobs / totalTasks) * 100 : 0;
    
    this.emit('progress', {
      completed: this.completedJobs,
      failed: this.failedJobs,
      active: this.activeJobs.size,
      queued: this.taskQueue.length,
      progress: progress.toFixed(1)
    });
  }

  async waitForCompletion(tasks) {
    const taskIds = new Set(tasks.map(t => t.id));
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Check if all tasks are complete
        let allComplete = true;
        
        for (const taskId of taskIds) {
          if (this.activeJobs.has(taskId) || 
              this.taskQueue.some(t => t.id === taskId)) {
            allComplete = false;
            break;
          }
        }
        
        if (allComplete) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  getResults(taskIds) {
    const results = [];
    
    // Retrieve results from completed jobs
    // Note: In production, implement proper result storage
    
    return results;
  }

  async shutdown() {
    console.log('\n🛑 Shutting down distributed processor...');
    
    this.isRunning = false;
    
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Terminate all workers
    await Promise.all(this.workers.map((w, id) => 
      w.worker ? w.worker.terminate() : Promise.resolve()
    ));
    
    console.log('✅ Shutdown complete');
  }

  // Performance optimization methods
  async optimizeForSpeed() {
    console.log('⚡ Optimizing for speed...');
    
    this.config.maxConcurrencyPerWorker = 20;
    this.config.taskTimeout = 10000;
    this.config.retryAttempts = 1;
  }

  async optimizeForReliability() {
    console.log('🛡️ Optimizing for reliability...');
    
    this.config.maxConcurrencyPerWorker = 5;
    this.config.taskTimeout = 60000;
    this.config.retryAttempts = 5;
  }

  async optimizeForMemory() {
    console.log('💾 Optimizing for memory efficiency...');
    
    this.config.maxWorkers = Math.min(os.cpus().length, 4);
    this.config.maxConcurrencyPerWorker = 3;
  }
}

module.exports = DistributedProcessor;