import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple interval-based scheduler for Next.js compatibility
export class SimpleScheduler {
  private static intervals = new Map<string, NodeJS.Timer>();
  
  // Start a schedule with simple intervals
  static async startSchedule(schedule: any) {
    try {
      // Stop existing interval if any
      this.stopSchedule(schedule.schedule_id);
      
      // Get interval in milliseconds
      const intervalMs = this.getIntervalMs(schedule.frequency);
      if (!intervalMs) {
        console.error(`Invalid frequency for schedule ${schedule.schedule_id}`);
        return;
      }
      
      console.log(`📅 Starting schedule "${schedule.name}" every ${intervalMs}ms`);
      
      // Create interval
      const interval = setInterval(async () => {
        await this.executeSchedule(schedule);
      }, intervalMs);
      
      // Store interval reference
      this.intervals.set(schedule.schedule_id, interval);
      
      // Update next run time
      await this.updateNextRunTime(schedule.schedule_id, intervalMs);
      
    } catch (error) {
      console.error(`Error starting schedule ${schedule.schedule_id}:`, error);
    }
  }
  
  // Stop a schedule
  static stopSchedule(scheduleId: string) {
    const interval = this.intervals.get(scheduleId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(scheduleId);
      console.log(`⏹️  Stopped schedule ${scheduleId}`);
    }
  }
  
  // Get interval in milliseconds
  static getIntervalMs(frequency: string): number {
    switch (frequency) {
      case '15min':
        return 15 * 60 * 1000;
      case '30min':
        return 30 * 60 * 1000;
      case '1hour':
        return 60 * 60 * 1000;
      case '2hours':
        return 2 * 60 * 60 * 1000;
      case '6hours':
        return 6 * 60 * 60 * 1000;
      case '12hours':
        return 12 * 60 * 60 * 1000;
      case '24hours':
        return 24 * 60 * 60 * 1000;
      default:
        return 0;
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
          error_details: { error: error.toString() }
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
    }
  }
  
  // Perform the actual scan
  static async performScan(options: any) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      
      const response = await fetch(`${baseUrl}/api/monitoring/scan`, {
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
  
  // Update next run time
  static async updateNextRunTime(scheduleId: string, intervalMs: number) {
    try {
      const nextRun = new Date(Date.now() + intervalMs);
      
      await supabase
        .from('scraping_schedules')
        .update({ next_run: nextRun.toISOString() })
        .eq('schedule_id', scheduleId);
        
    } catch (error) {
      console.error('Error updating next run time:', error);
    }
  }
  
  // Initialize scheduler and load active schedules
  static async initialize() {
    console.log('🚀 Initializing simple scheduler...');
    
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