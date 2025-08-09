
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
