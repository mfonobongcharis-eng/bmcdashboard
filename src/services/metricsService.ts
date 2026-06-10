// BMC Command Center - Metrics Service
// Social, email, and lead tracking

import type { SocialMetrics, EmailMetrics, Lead, LeadStatus } from '../types';
import { supabase } from './authService';
import { auditService } from './authService';

// ============================================================================
// SOCIAL METRICS
// ============================================================================

export const socialMetricsService = {
  /**
   * Create or update social metrics for a week
   */
  async upsertSocialMetrics(
    metrics: Omit<SocialMetrics, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<SocialMetrics> {
    // Check if metrics already exist for this week + platform
    const { data: existing } = await supabase
      .from('social_metrics')
      .select('id')
      .eq('week_of', metrics.week_of)
      .eq('platform', metrics.platform)
      .single();

    let result;
    let action = 'created';

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('social_metrics')
        .update({
          ...metrics,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update social metrics: ${error.message}`);
      }

      result = data;
      action = 'updated';
    } else {
      // Create new
      const { data, error } = await supabase
        .from('social_metrics')
        .insert([
          {
            ...metrics,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create social metrics: ${error.message}`);
      }

      result = data;
    }

    // Log to audit trail
    await auditService.logAction(userId, action, 'social_metrics', result.id, {
      platform: metrics.platform,
      week_of: metrics.week_of,
    });

    return result;
  },

  /**
   * Get social metrics for a week
   */
  async getMetricsForWeek(weekOf: string): Promise<SocialMetrics[]> {
    const { data, error } = await supabase
      .from('social_metrics')
      .select('*')
      .eq('week_of', weekOf)
      .order('platform', { ascending: true });

    if (error) {
      console.error('Failed to fetch social metrics:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get metrics for platform across weeks
   */
  async getMetricsForPlatform(
    platform: 'instagram' | 'linkedin' | 'facebook' | 'tiktok',
    weeks: number = 12
  ): Promise<SocialMetrics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const { data, error } = await supabase
      .from('social_metrics')
      .select('*')
      .eq('platform', platform)
      .gte('week_of', startDate.toISOString().split('T')[0])
      .order('week_of', { ascending: true });

    if (error) {
      console.error('Failed to fetch platform metrics:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Calculate week-over-week comparison
   */
  async getWeekOverWeekComparison(
    weekOf: string,
    platform: string
  ): Promise<{
    current: SocialMetrics | null;
    previous: SocialMetrics | null;
    percentChange: Record<string, number>;
  }> {
    // Get current week
    const { data: current } = await supabase
      .from('social_metrics')
      .select('*')
      .eq('week_of', weekOf)
      .eq('platform', platform)
      .single();

    // Get previous week
    const prevWeekDate = new Date(weekOf);
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    const previousWeekOf = prevWeekDate.toISOString().split('T')[0];

    const { data: previous } = await supabase
      .from('social_metrics')
      .select('*')
      .eq('week_of', previousWeekOf)
      .eq('platform', platform)
      .single();

    // Calculate percent change
    const percentChange: Record<string, number> = {};

    if (current && previous) {
      const metrics = [
        'total_impressions',
        'total_reach',
        'total_engagement',
        'engagement_rate',
        'new_followers',
      ];

      metrics.forEach((metric) => {
        const currentVal = (current as any)[metric] || 0;
        const previousVal = (previous as any)[metric] || 0;

        if (previousVal > 0) {
          percentChange[metric] = Math.round(
            ((currentVal - previousVal) / previousVal) * 100
          );
        } else {
          percentChange[metric] = currentVal > 0 ? 100 : 0;
        }
      });
    }

    return {
      current: current || null,
      previous: previous || null,
      percentChange,
    };
  },
};

// ============================================================================
// EMAIL METRICS
// ============================================================================

export const emailMetricsService = {
  /**
   * Create email campaign metrics
   */
  async createEmailMetrics(
    metrics: Omit<EmailMetrics, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<EmailMetrics> {
    const { data, error } = await supabase
      .from('email_metrics')
      .insert([
        {
          ...metrics,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create email metrics: ${error.message}`);
    }

    // Log to audit trail
    await auditService.logAction(userId, 'created', 'email_metrics', data.id, {
      campaign_name: metrics.campaign_name,
    });

    return data;
  },

  /**
   * Get email campaigns for a date range
   */
  async getCampaigns(startDate?: string, endDate?: string): Promise<EmailMetrics[]> {
    let query = supabase.from('email_metrics').select('*');

    if (startDate) {
      query = query.gte('send_date', startDate);
    }

    if (endDate) {
      query = query.lte('send_date', endDate);
    }

    const { data, error } = await query.order('send_date', {
      ascending: false,
    });

    if (error) {
      console.error('Failed to fetch email campaigns:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get campaign by ID
   */
  async getCampaign(id: string): Promise<EmailMetrics | null> {
    const { data, error } = await supabase
      .from('email_metrics')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch campaign:', error);
      return null;
    }

    return data;
  },

  /**
   * Calculate email statistics
   */
  async getEmailStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalCampaigns: number;
    totalSent: number;
    avgOpenRate: number;
    avgClickRate: number;
    topPerformer: EmailMetrics | null;
  }> {
    const campaigns = await this.getCampaigns(startDate, endDate);

    if (campaigns.length === 0) {
      return {
        totalCampaigns: 0,
        totalSent: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        topPerformer: null,
      };
    }

    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
    const avgOpenRate =
      campaigns.reduce((sum, c) => sum + (c.open_rate || 0), 0) / campaigns.length;
    const avgClickRate =
      campaigns.reduce((sum, c) => sum + (c.click_rate || 0), 0) / campaigns.length;

    const topPerformer = campaigns.reduce((best, current) => {
      return ((current.open_rate || 0) > (best.open_rate || 0) ? current : best);
    });

    return {
      totalCampaigns: campaigns.length,
      totalSent,
      avgOpenRate: Math.round(avgOpenRate * 100) / 100,
      avgClickRate: Math.round(avgClickRate * 100) / 100,
      topPerformer,
    };
  },
};

// ============================================================================
// LEAD TRACKING
// ============================================================================

export const leadService = {
  /**
   * Create lead
   */
  async createLead(
    lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          ...lead,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    // Log to audit trail
    await auditService.logAction(userId, 'created', 'lead', data.id, {
      lead_name: lead.lead_name,
      source: lead.source,
    });

    return data;
  },

  /**
   * Update lead
   */
  async updateLead(
    id: string,
    updates: Partial<Lead>,
    userId: string
  ): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }

    // Log to audit trail
    await auditService.logAction(userId, 'updated', 'lead', id, {
      status: updates.status,
    });

    return data;
  },

  /**
   * Update lead status
   */
  async updateStatus(
    id: string,
    status: LeadStatus,
    userId: string
  ): Promise<Lead> {
    return this.updateLead(id, { status }, userId);
  },

  /**
   * Get leads for date range
   */
  async getLeads(startDate?: string, endDate?: string): Promise<Lead[]> {
    let query = supabase.from('leads').select('*');

    if (startDate) {
      query = query.gte('date_received', startDate);
    }

    if (endDate) {
      query = query.lte('date_received', endDate);
    }

    const { data, error } = await query.order('date_received', {
      ascending: false,
    });

    if (error) {
      console.error('Failed to fetch leads:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get leads by source
   */
  async getLeadsBySource(source: string): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('source', source)
      .order('date_received', { ascending: false });

    if (error) {
      console.error('Failed to fetch leads by source:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Calculate lead statistics
   */
  async getLeadStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalLeads: number;
    bySource: Record<string, number>;
    byStatus: Record<LeadStatus, number>;
    conversionRate: number;
  }> {
    const leads = await this.getLeads(startDate, endDate);

    const bySource: Record<string, number> = {};
    const byStatus: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
    };

    leads.forEach((lead) => {
      // By source
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;

      // By status
      byStatus[lead.status]++;
    });

    const converted = byStatus.converted;
    const conversionRate = leads.length > 0 ? (converted / leads.length) * 100 : 0;

    return {
      totalLeads: leads.length,
      bySource,
      byStatus,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  },

  /**
   * Get conversion funnel
   */
  async getConversionFunnel(
    startDate?: string,
    endDate?: string
  ): Promise<{
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    lost: number;
    conversionRate: number;
  }> {
    const leads = await this.getLeads(startDate, endDate);

    const funnel = {
      new: leads.filter((l) => l.status === 'new').length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      converted: leads.filter((l) => l.status === 'converted').length,
      lost: leads.filter((l) => l.status === 'lost').length,
      conversionRate: 0,
    };

    if (leads.length > 0) {
      funnel.conversionRate = Math.round((funnel.converted / leads.length) * 100 * 100) / 100;
    }

    return funnel;
  },

  /**
   * Get source effectiveness (conversion by source)
   */
  async getSourceEffectiveness(startDate?: string, endDate?: string) {
    const leads = await this.getLeads(startDate, endDate);
    const bySource: Record<string, { total: number; converted: number; rate: number }> = {};

    leads.forEach((lead) => {
      if (!bySource[lead.source]) {
        bySource[lead.source] = { total: 0, converted: 0, rate: 0 };
      }

      bySource[lead.source].total++;

      if (lead.status === 'converted') {
        bySource[lead.source].converted++;
      }
    });

    // Calculate rates
    for (const source in bySource) {
      const { total, converted } = bySource[source];
      bySource[source].rate = total > 0 ? Math.round((converted / total) * 100 * 100) / 100 : 0;
    }

    return bySource;
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const metricsService = {
  social: socialMetricsService,
  email: emailMetricsService,
  leads: leadService,
};

export default metricsService;
