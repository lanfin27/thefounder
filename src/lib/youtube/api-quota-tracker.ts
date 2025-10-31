/**
 * YouTube API Quota Tracker
 *
 * Tracks and manages YouTube API v3 quota usage
 *
 * YouTube API v3 Quota Information:
 * - Daily quota: 10,000 units
 * - channels.list: 1 unit
 * - search.list: 100 units per page
 * - videos.list: 1 unit
 * - playlistItems.list: 1 unit
 *
 * @module YouTubeAPIQuotaTracker
 */

import { ytSupabase } from '@/lib/youtube-supabase/client';

/**
 * Update type for tracking different kinds of operations
 */
export type UpdateType = 'single' | 'bulk_full' | 'bulk_incremental' | 'simulation';

/**
 * API usage tracking parameters
 */
export interface APIUsageParams {
  operationType: string;
  channelId?: string;
  channelName?: string;
  unitsUsed: number;
  success?: boolean;
  errorMessage?: string;
  updateType?: UpdateType;
  batchId?: string;
  durationMs?: number;
  videosProcessed?: number;
  newVideos?: number;
  apiCallsMade?: number;
  responseData?: any;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  canUpdate: boolean;
  maxChannels: number;
  remaining: number;
  usedToday: number;
  requiredUnits: number;
}

/**
 * Weekly usage data
 */
export interface WeeklyUsageData {
  date: string;
  units: number;
  percentage: number;
}

/**
 * YouTube API Quota Tracker Class
 *
 * Manages YouTube API quota tracking and monitoring
 */
export class YouTubeAPIQuotaTracker {
  private static readonly DAILY_QUOTA = 10000;

  /**
   * YouTube API call costs in units
   */
  private static readonly API_COSTS = {
    'channels.list': 1,           // Channel info lookup
    'search.list': 100,            // Video search (per page)
    'videos.list': 1,              // Video details
    'playlistItems.list': 1        // Playlist items
  };

  /**
   * Calculate total API cost for channel update
   *
   * Breakdown:
   * - channels.list: 1 unit (channel info)
   * - search.list: 5 calls × 100 units = 500 units (fetch 250 videos, 50 per page)
   * - videos.list: 5 calls × 1 unit = 5 units (video details)
   *
   * @returns Total 506 units per channel
   */
  static calculateChannelUpdateCost(): number {
    return (
      this.API_COSTS['channels.list'] +           // 1 unit
      (this.API_COSTS['search.list'] * 5) +       // 500 units (250 videos)
      (this.API_COSTS['videos.list'] * 5)         // 5 units
    );
    // Total: 506 units per channel
  }

  /**
   * Get today's total API usage
   *
   * @returns Total units used today
   */
  static async getTodayUsage(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];

      console.log(`[QuotaTracker] 📊 Fetching usage for ${today}...`);

      const { data, error } = await ytSupabase
        .from('youtube_api_usage')
        .select('units_used')
        .eq('date', today);

      if (error) {
        console.error('[QuotaTracker] ❌ Error fetching today usage:', error);
        return 0;
      }

      const totalUsed = data?.reduce((sum, row) => sum + row.units_used, 0) || 0;

      console.log(`[QuotaTracker] ✅ Today's usage: ${totalUsed} units`);

      return totalUsed;
    } catch (error) {
      console.error('[QuotaTracker] ❌ Exception in getTodayUsage:', error);
      return 0;
    }
  }

  /**
   * Get remaining quota for today
   *
   * @returns Remaining units
   */
  static async getRemainingQuota(): Promise<number> {
    const usedToday = await this.getTodayUsage();
    const remaining = this.DAILY_QUOTA - usedToday;

    console.log(`[QuotaTracker] 📊 Remaining quota: ${remaining} / ${this.DAILY_QUOTA} units`);

    return Math.max(0, remaining); // Prevent negative values
  }

  /**
   * Track API usage
   *
   * Records API usage in the database with extended metadata
   *
   * @param params Usage tracking parameters
   */
  static async trackUsage(params: APIUsageParams): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      console.log(`[QuotaTracker] 💾 Recording usage:`, {
        date: today,
        operation: params.operationType,
        updateType: params.updateType || 'single',
        channel: params.channelName || params.channelId || 'N/A',
        units: params.unitsUsed,
        success: params.success ?? true
      });

      // Prepare metadata with api_calls_made included
      const metadata = {
        ...(params.metadata || {}),
        ...(params.apiCallsMade ? { api_calls_made: params.apiCallsMade } : {})
      };

      const { error } = await ytSupabase
        .from('youtube_api_usage')
        .insert({
          date: today,
          operation_type: params.operationType,
          channel_id: params.channelId || null,
          channel_name: params.channelName || null,
          units_used: params.unitsUsed,
          success: params.success ?? true,
          error_message: params.errorMessage || null,
          update_type: params.updateType || 'single',
          batch_id: params.batchId || null,
          duration_ms: params.durationMs || null,
          videos_processed: params.videosProcessed || 0,
          new_videos: params.newVideos || 0,
          response_data: params.responseData || null,
          user_id: params.userId || null,
          metadata: metadata
        });

      if (error) {
        console.error('[QuotaTracker] ❌ Error tracking usage:', error);
        throw error;
      }

      console.log(`[QuotaTracker] ✅ Tracked ${params.unitsUsed} units for ${params.operationType}`);

      // Log updated total
      const newTotal = await this.getTodayUsage();
      const percentage = ((newTotal / this.DAILY_QUOTA) * 100).toFixed(1);
      console.log(`[QuotaTracker] 📊 Total usage now: ${newTotal}/${this.DAILY_QUOTA} (${percentage}%)`);

    } catch (error) {
      console.error('[QuotaTracker] ❌ Failed to track usage:', error);
      // Don't throw error - tracking failure shouldn't break the main flow
    }
  }

  /**
   * Check if channels can be updated
   *
   * Verifies if sufficient quota exists for bulk update
   *
   * @param channelsCount Number of channels to update
   * @returns Quota check result with detailed information
   */
  static async canUpdate(channelsCount: number): Promise<QuotaCheckResult> {
    try {
      console.log(`[QuotaTracker] 🔍 Checking quota for ${channelsCount} channels...`);

      const remaining = await this.getRemainingQuota();
      const usedToday = await this.getTodayUsage();
      const costPerChannel = this.calculateChannelUpdateCost();
      const requiredUnits = channelsCount * costPerChannel;
      const maxChannels = Math.floor(remaining / costPerChannel);

      const result: QuotaCheckResult = {
        canUpdate: requiredUnits <= remaining,
        maxChannels,
        remaining,
        usedToday,
        requiredUnits
      };

      console.log(`[QuotaTracker] 📊 Quota check result:`, {
        canUpdate: result.canUpdate,
        maxChannels: result.maxChannels,
        remaining: result.remaining,
        usedToday: result.usedToday,
        requiredUnits: result.requiredUnits
      });

      if (!result.canUpdate) {
        console.warn(`[QuotaTracker] ⚠️  Insufficient quota!`);
        console.warn(`[QuotaTracker] Required: ${requiredUnits}, Available: ${remaining}`);
        console.warn(`[QuotaTracker] Maximum channels today: ${maxChannels}`);
      }

      return result;

    } catch (error) {
      console.error('[QuotaTracker] ❌ Error in canUpdate:', error);

      // Return conservative result on error
      return {
        canUpdate: false,
        maxChannels: 0,
        remaining: 0,
        usedToday: this.DAILY_QUOTA,
        requiredUnits: channelsCount * this.calculateChannelUpdateCost()
      };
    }
  }

  /**
   * Get weekly usage statistics
   *
   * Returns last 7 days of API usage
   *
   * @returns Array of daily usage data
   */
  static async getWeeklyUsage(): Promise<WeeklyUsageData[]> {
    try {
      console.log('[QuotaTracker] 📊 Fetching weekly usage...');

      const { data, error } = await ytSupabase
        .from('daily_api_usage')
        .select('*')
        .order('date', { ascending: false })
        .limit(7);

      if (error) {
        console.error('[QuotaTracker] ❌ Error fetching weekly usage:', error);
        return [];
      }

      const weeklyData = (data || []).map(row => ({
        date: row.date,
        units: row.total_units,
        percentage: (row.total_units / this.DAILY_QUOTA) * 100
      }));

      console.log(`[QuotaTracker] ✅ Weekly usage retrieved: ${weeklyData.length} days`);

      return weeklyData;

    } catch (error) {
      console.error('[QuotaTracker] ❌ Exception in getWeeklyUsage:', error);
      return [];
    }
  }

  /**
   * Get quota status message
   *
   * Returns human-readable quota status
   *
   * @returns Status message
   */
  static async getQuotaStatus(): Promise<string> {
    const remaining = await this.getRemainingQuota();
    const usedToday = await this.getTodayUsage();
    const percentage = (usedToday / this.DAILY_QUOTA) * 100;

    if (percentage >= 90) {
      return `🔴 Critical: ${remaining} units remaining (${percentage.toFixed(1)}% used)`;
    } else if (percentage >= 70) {
      return `🟡 Warning: ${remaining} units remaining (${percentage.toFixed(1)}% used)`;
    } else {
      return `🟢 Healthy: ${remaining} units remaining (${percentage.toFixed(1)}% used)`;
    }
  }

  /**
   * Log quota summary
   *
   * Prints detailed quota information to console
   */
  static async logQuotaSummary(): Promise<void> {
    try {
      const usedToday = await this.getTodayUsage();
      const remaining = await this.getRemainingQuota();
      const percentage = (usedToday / this.DAILY_QUOTA) * 100;
      const costPerChannel = this.calculateChannelUpdateCost();
      const maxChannels = Math.floor(remaining / costPerChannel);

      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 YouTube API Quota Summary');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
      console.log(`📈 Used Today: ${usedToday.toLocaleString()} units`);
      console.log(`📉 Remaining: ${remaining.toLocaleString()} units`);
      console.log(`📊 Percentage: ${percentage.toFixed(1)}%`);
      console.log(`🎯 Daily Quota: ${this.DAILY_QUOTA.toLocaleString()} units`);
      console.log(`📺 Max Channels: ${maxChannels} channels`);
      console.log(`💰 Cost/Channel: ${costPerChannel} units`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    } catch (error) {
      console.error('[QuotaTracker] ❌ Error logging quota summary:', error);
    }
  }

  /**
   * Calculate incremental update cost
   *
   * Incremental updates only fetch new videos since last update
   * Cost breakdown:
   * - channels.list: 1 unit
   * - search.list: 1 call × 100 units = 100 units (fetch only recent videos)
   * - videos.list: 1 call × 1 unit = 1 unit (for new videos)
   *
   * @returns Average 102 units per channel (80% savings vs full update)
   */
  static calculateIncrementalUpdateCost(): number {
    return (
      this.API_COSTS['channels.list'] +     // 1 unit
      this.API_COSTS['search.list'] +       // 100 units (1 page only)
      this.API_COSTS['videos.list']         // 1 unit
    );
    // Total: 102 units per channel (vs 506 for full update)
  }

  /**
   * Simulate batch update
   *
   * Calculate estimated costs for batch operations
   *
   * @param channelIds Array of channel IDs
   * @param updateType Type of update ('bulk_full' or 'bulk_incremental')
   * @returns Simulation result with cost breakdown
   */
  static async simulateBatchUpdate(
    channelIds: string[],
    updateType: 'bulk_full' | 'bulk_incremental' = 'bulk_full'
  ): Promise<{
    totalChannels: number;
    estimatedTotalCost: number;
    estimatedFullCost: number;
    estimatedIncrementalCost: number;
    potentialSavings: number;
    potentialSavingsPercentage: number;
    canExecute: boolean;
    remainingQuota: number;
  }> {
    const totalChannels = channelIds.length;
    const fullCostPerChannel = this.calculateChannelUpdateCost();
    const incrementalCostPerChannel = this.calculateIncrementalUpdateCost();

    const estimatedFullCost = totalChannels * fullCostPerChannel;
    const estimatedIncrementalCost = totalChannels * incrementalCostPerChannel;

    const estimatedTotalCost =
      updateType === 'bulk_full' ? estimatedFullCost : estimatedIncrementalCost;

    const potentialSavings = estimatedFullCost - estimatedIncrementalCost;
    const potentialSavingsPercentage =
      (potentialSavings / estimatedFullCost) * 100;

    const remainingQuota = await this.getRemainingQuota();
    const canExecute = estimatedTotalCost <= remainingQuota;

    console.log('[QuotaTracker] 🎯 Simulation Result:', {
      totalChannels,
      updateType,
      estimatedTotalCost,
      remainingQuota,
      canExecute,
      savings: `${potentialSavingsPercentage.toFixed(1)}%`
    });

    return {
      totalChannels,
      estimatedTotalCost,
      estimatedFullCost,
      estimatedIncrementalCost,
      potentialSavings,
      potentialSavingsPercentage: Math.round(potentialSavingsPercentage * 100) / 100,
      canExecute,
      remainingQuota
    };
  }

  /**
   * Simulate single channel update
   *
   * @param channelId Channel ID
   * @param updateType Update type
   * @returns Simulation result
   */
  static async simulateSingleUpdate(
    channelId: string,
    updateType: 'single' | 'bulk_incremental' = 'single'
  ): Promise<{
    channelId: string;
    estimatedCost: number;
    canExecute: boolean;
    remainingQuota: number;
  }> {
    const estimatedCost =
      updateType === 'single'
        ? this.calculateChannelUpdateCost()
        : this.calculateIncrementalUpdateCost();

    const remainingQuota = await this.getRemainingQuota();
    const canExecute = estimatedCost <= remainingQuota;

    console.log('[QuotaTracker] 🎯 Single Channel Simulation:', {
      channelId,
      updateType,
      estimatedCost,
      remainingQuota,
      canExecute
    });

    return {
      channelId,
      estimatedCost,
      canExecute,
      remainingQuota
    };
  }

  /**
   * Get cost comparison between full and incremental updates
   *
   * @returns Cost comparison data
   */
  static getCostComparison(): {
    fullUpdateCost: number;
    incrementalUpdateCost: number;
    savings: number;
    savingsPercentage: number;
  } {
    const fullUpdateCost = this.calculateChannelUpdateCost();
    const incrementalUpdateCost = this.calculateIncrementalUpdateCost();
    const savings = fullUpdateCost - incrementalUpdateCost;
    const savingsPercentage = (savings / fullUpdateCost) * 100;

    return {
      fullUpdateCost,
      incrementalUpdateCost,
      savings,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100
    };
  }
}
