import { createClient } from '@supabase/supabase-js';

// Dynamic import for node-cron to avoid build issues
let cron: any;
const initCron = async () => {
  if (!cron) {
    cron = await import('node-cron');
  }
  return cron;
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store active cron jobs
const activeJobs = new Map<string, cron.ScheduledTask>();

// Schedule manager class
export class ScheduleManager {
  // Initialize scheduler and load active schedules
  static async initialize() {
    console.log('🚀 Initializing schedule manager...');
    
    try {
      // Load all enabled schedules from database
      const { data: schedules, error } = await supabase
        .from('scraping_schedules')
        .select('*')
        .eq('enabled', true);
      
      if (error) {
        console.error('Error loading schedules:', error);
        return;
      }
      
      // Start each enabled schedule
      for (const schedule of schedules || []) {
        await this.startSchedule(schedule);
      }
      
      console.log(`✅ Loaded ${schedules?.length || 0} active schedules`);
    } catch (error) {
      console.error('Error initializing scheduler:', error);
    }
  }
  
  // Start a schedule
  static async startSchedule(schedule: any) {
    try {
      // Stop existing job if any
      this.stopSchedule(schedule.schedule_id);
      
      // Convert frequency to cron expression
      const cronExpression = this.getCronExpression(schedule);
      if (!cronExpression) {
        console.error(`Invalid cron expression for schedule ${schedule.schedule_id}`);
        return;
      }
      
      console.log(`📅 Starting schedule "${schedule.name}" with cron: ${cronExpression}`);
      
      // Create cron job
      const cronLib = await initCron();
      const job = cronLib.schedule(cronExpression, async () => {
        await this.executeSchedule(schedule);
      }, {
        scheduled: true,
        timezone: schedule.timezone || 'UTC'
      });
      
      // Store job reference
      activeJobs.set(schedule.schedule_id, job);
      
      // Update next run time
      await this.updateNextRunTime(schedule.schedule_id, cronExpression);
      
    } catch (error) {
      console.error(`Error starting schedule ${schedule.schedule_id}:`, error);
    }
  }
  
  // Stop a schedule
  static stopSchedule(scheduleId: string) {
    const job = activeJobs.get(scheduleId);
    if (job) {
      job.stop();
      activeJobs.delete(scheduleId);
      console.log(`⏹️  Stopped schedule ${scheduleId}`);
    }
  }
  
  // Execute a scheduled scan
  static async executeSchedule(schedule: any) {
    console.log(`🔄 Executing schedule "${schedule.name}"...`);
    const startTime = Date.now();
    
    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('schedule_executions')
      .insert({
        schedule_id: schedule.schedule_id,
        status: 'running',
        triggered_by: 'schedule'
      })
      .select()
      .single();
    
    if (execError) {
      console.error('Error creating execution record:', execError);
      return;
    }
    
    try {
      // Execute the scan
      const scanResult = await this.performScan(schedule.scan_options || {});
      
      // Update execution record with results
      await supabase
        .from('schedule_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - startTime) / 1000),
          pages_scanned: scanResult.results?.pagesScanned || 0,
          listings_found: scanResult.results?.scannedListings || 0,
          new_listings: scanResult.results?.newListings || 0,
          price_changes: scanResult.results?.priceChanges || 0,
          deleted_listings: scanResult.results?.deletedListings || 0,
          scan_results: scanResult
        })
        .eq('execution_id', execution.execution_id);
      
      // Update schedule stats
      await supabase
        .from('scraping_schedules')
        .update({
          last_run: new Date().toISOString(),
          success_count: schedule.success_count + 1,
          consecutive_failures: 0,
          updated_at: new Date().toISOString()
        })
        .eq('schedule_id', schedule.schedule_id);
      
      // Send notifications if configured
      await this.sendNotifications(schedule, scanResult, execution);
      
      // Update next run time
      await this.updateNextRunTime(schedule.schedule_id, this.getCronExpression(schedule));
      
      console.log(`✅ Schedule "${schedule.name}" executed successfully`);
      
    } catch (error: any) {
      console.error(`Error executing schedule ${schedule.schedule_id}:`, error);
      
      // Update execution record with error
      await supabase
        .from('schedule_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - startTime) / 1000),
          error_message: error.message,
          error_details: { error: error.toString(), stack: error.stack }
        })
        .eq('execution_id', execution.execution_id);
      
      // Update schedule failure stats
      await supabase
        .from('scraping_schedules')
        .update({
          last_run: new Date().toISOString(),
          failure_count: schedule.failure_count + 1,
          consecutive_failures: (schedule.consecutive_failures || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('schedule_id', schedule.schedule_id);
      
      // Send failure notification if configured
      if (schedule.notification_settings?.notify_on_failure) {
        await this.sendFailureNotification(schedule, error, execution);
      }
    }
  }
  
  // Perform the actual scan
  static async performScan(options: any) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/monitoring/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manual: false,
          scheduled: true,
          options: {
            pages: options.max_pages || 2,
            ...options
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Scan API returned ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error performing scan:', error);
      throw error;
    }
  }
  
  // Convert frequency to cron expression
  static getCronExpression(schedule: any): string {
    if (schedule.custom_cron) {
      return schedule.custom_cron;
    }
    
    switch (schedule.frequency) {
      case '15min':
        return '*/15 * * * *';
      case '30min':
        return '*/30 * * * *';
      case '1hour':
        return '0 * * * *';
      case '2hours':
        return '0 */2 * * *';
      case '6hours':
        return '0 */6 * * *';
      case '12hours':
        return '0 */12 * * *';
      case '24hours':
        return '0 0 * * *';
      default:
        return '';
    }
  }
  
  // Calculate next run time
  static async updateNextRunTime(scheduleId: string, cronExpression: string) {
    try {
      const cronLib = await initCron();
      const interval = cronLib.validate(cronExpression);
      if (!interval) return;
      
      // Simple calculation for next run (could be improved)
      const now = new Date();
      let nextRun = new Date(now.getTime() + 60000); // Default to 1 minute from now
      
      // Parse cron expression for better calculation
      const parts = cronExpression.split(' ');
      if (parts[0].includes('*/')) {
        const minutes = parseInt(parts[0].replace('*/', ''));
        nextRun = new Date(now.getTime() + minutes * 60000);
      } else if (parts[1].includes('*/')) {
        const hours = parseInt(parts[1].replace('*/', ''));
        nextRun = new Date(now.getTime() + hours * 3600000);
      }
      
      await supabase
        .from('scraping_schedules')
        .update({ next_run: nextRun.toISOString() })
        .eq('schedule_id', scheduleId);
        
    } catch (error) {
      console.error('Error updating next run time:', error);
    }
  }
  
  // Send notifications
  static async sendNotifications(schedule: any, scanResult: any, execution: any) {
    const settings = schedule.notification_settings;
    if (!settings) return;
    
    const newListings = scanResult.results?.newListings || 0;
    const threshold = settings.threshold_amount || 0;
    
    // Check if we should send notification
    if (newListings === 0 && !settings.always_notify) return;
    
    // Create notification content
    const subject = `Flippa Scan Results - ${newListings} New Listings Found`;
    const content = `
Schedule: ${schedule.name}
Execution Time: ${new Date().toLocaleString()}
New Listings: ${newListings}
Price Changes: ${scanResult.results?.priceChanges || 0}
Total Scanned: ${scanResult.results?.scannedListings || 0}
    `.trim();
    
    // Queue notifications
    const notifications = [];
    
    if (settings.email_enabled && settings.email_address) {
      notifications.push({
        schedule_id: schedule.schedule_id,
        execution_id: execution.execution_id,
        type: 'email',
        recipient: settings.email_address,
        subject,
        content
      });
    }
    
    if (settings.webhook_enabled && settings.webhook_url) {
      notifications.push({
        schedule_id: schedule.schedule_id,
        execution_id: execution.execution_id,
        type: 'webhook',
        recipient: settings.webhook_url,
        subject,
        content: JSON.stringify({
          schedule: schedule.name,
          results: scanResult.results,
          timestamp: new Date().toISOString()
        })
      });
    }
    
    if (notifications.length > 0) {
      await supabase
        .from('notification_queue')
        .insert(notifications);
    }
  }
  
  // Send failure notification
  static async sendFailureNotification(schedule: any, error: Error, execution: any) {
    const settings = schedule.notification_settings;
    if (!settings || !settings.notify_on_failure) return;
    
    const subject = `Flippa Scan Failed - ${schedule.name}`;
    const content = `
Schedule: ${schedule.name}
Execution Time: ${new Date().toLocaleString()}
Error: ${error.message}
Consecutive Failures: ${schedule.consecutive_failures || 1}
    `.trim();
    
    const notifications = [];
    
    if (settings.email_enabled && settings.email_address) {
      notifications.push({
        schedule_id: schedule.schedule_id,
        execution_id: execution.execution_id,
        type: 'email',
        recipient: settings.email_address,
        subject,
        content,
        priority: 1 // High priority for failures
      });
    }
    
    if (settings.webhook_enabled && settings.webhook_url) {
      notifications.push({
        schedule_id: schedule.schedule_id,
        execution_id: execution.execution_id,
        type: 'webhook',
        recipient: settings.webhook_url,
        subject,
        content: JSON.stringify({
          type: 'failure',
          schedule: schedule.name,
          error: error.message,
          consecutive_failures: schedule.consecutive_failures || 1,
          timestamp: new Date().toISOString()
        }),
        priority: 1
      });
    }
    
    if (notifications.length > 0) {
      await supabase
        .from('notification_queue')
        .insert(notifications);
    }
  }
  
  // Reload a specific schedule
  static async reloadSchedule(scheduleId: string) {
    const { data: schedule, error } = await supabase
      .from('scraping_schedules')
      .select('*')
      .eq('schedule_id', scheduleId)
      .single();
    
    if (error || !schedule) {
      console.error('Error loading schedule:', error);
      return;
    }
    
    if (schedule.enabled) {
      await this.startSchedule(schedule);
    } else {
      this.stopSchedule(scheduleId);
    }
  }
}