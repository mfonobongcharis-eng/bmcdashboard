// BMC Command Center - Metrics Service
import type { SocialMetrics, EmailMetrics, Lead, LeadStatus } from '../types';
import { supabase } from './authService';
import { auditService } from './authService';

export const socialMetricsService = {
  async upsertSocialMetrics(metrics: Omit<SocialMetrics, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<SocialMetrics> {
    const { data: existing } = await supabase.from('social_metrics').select('id').eq('week_of', metrics.week_of).eq('platform', metrics.platform).single();
    let result; let action = 'created';
    if (existing) {
      const { data, error } = await supabase.from('social_metrics').update({ ...metrics, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
      if (error) throw new Error(`Failed to update social metrics: ${error.message}`);
      result = data; action = 'updated';
    } else {
      const { data, error } = await supabase.from('social_metrics').insert([{ ...metrics, created_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select().single();
      if (error) throw new Error(`Failed to create social metrics: ${error.message}`);
      result = data;
    }
    await auditService.logAction(userId, action, 'social_metrics', result.id, { platform: metrics.platform, week_of: metrics.week_of });
    return result;
  },

  async getMetricsForWeek(weekOf: string): Promise<SocialMetrics[]> {
    const { data, error } = await supabase.from('social_metrics').select('*').eq('week_of', weekOf).order('platform', { ascending: true });
    if (error) { console.error('Failed to fetch social metrics:', error); return []; }
    return data || [];
  },

  async getMetricsForPlatform(platform: 'instagram' | 'linkedin' | 'facebook' | 'tiktok', weeks: number = 12): Promise<SocialMetrics[]> {
    const startDate = new Date(); startDate.setDate(startDate.getDate() - weeks * 7);
    const { data, error } = await supabase.from('social_metrics').select('*').eq('platform', platform).gte('week_of', startDate.toISOString().split('T')[0]).order('week_of', { ascending: true });
    if (error) { console.error('Failed to fetch platform metrics:', error); return []; }
    return data || [];
  },

  async getWeekOverWeekComparison(weekOf: string, platform: string) {
    const { data: current } = await supabase.from('social_metrics').select('*').eq('week_of', weekOf).eq('platform', platform).single();
    const prevWeekDate = new Date(weekOf); prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    const { data: previous } = await supabase.from('social_metrics').select('*').eq('week_of', prevWeekDate.toISOString().split('T')[0]).eq('platform', platform).single();
    const percentChange: Record<string, number> = {};
    if (current && previous) {
      ['total_impressions', 'total_reach', 'total_engagement', 'engagement_rate', 'new_followers'].forEach((metric) => {
        const cur = (current as any)[metric] || 0; const prev = (previous as any)[metric] || 0;
        percentChange[metric] = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0);
      });
    }
    return { current: current || null, previous: previous || null, percentChange };
  },
};

export const emailMetricsService = {
  async createEmailMetrics(metrics: Omit<EmailMetrics, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<EmailMetrics> {
    const { data, error } = await supabase.from('email_metrics').insert([{ ...metrics, created_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select().single();
    if (error) throw new Error(`Failed to create email metrics: ${error.message}`);
    await auditService.logAction(userId, 'created', 'email_metrics', data.id, { campaign_name: metrics.campaign_name });
    return data;
  },

  async getCampaigns(startDate?: string, endDate?: string): Promise<EmailMetrics[]> {
    let query = supabase.from('email_metrics').select('*');
    if (startDate) query = query.gte('send_date', startDate);
    if (endDate) query = query.lte('send_date', endDate);
    const { data, error } = await query.order('send_date', { ascending: false });
    if (error) { console.error('Failed to fetch email campaigns:', error); return []; }
    return data || [];
  },

  async getEmailStats(startDate?: string, endDate?: string) {
    const campaigns = await this.getCampaigns(startDate, endDate);
    if (campaigns.length === 0) return { totalCampaigns: 0, totalSent: 0, avgOpenRate: 0, avgClickRate: 0, topPerformer: null };
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
    const avgOpenRate = campaigns.reduce((sum, c) => sum + (c.open_rate || 0), 0) / campaigns.length;
    const avgClickRate = campaigns.reduce((sum, c) => sum + (c.click_rate || 0), 0) / campaigns.length;
    const topPerformer = campaigns.reduce((best, current) => ((current.open_rate || 0) > (best.open_rate || 0) ? current : best));
    return { totalCampaigns: campaigns.length, totalSent, avgOpenRate: Math.round(avgOpenRate * 100) / 100, avgClickRate: Math.round(avgClickRate * 100) / 100, topPerformer };
  },
};

export const leadService = {
  async createLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<Lead> {
    const { data, error } = await supabase.from('leads').insert([{ ...lead, created_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select().single();
    if (error) throw new Error(`Failed to create lead: ${error.message}`);
    await auditService.logAction(userId, 'created', 'lead', data.id, { lead_name: lead.lead_name, source: lead.source });
    return data;
  },

  async updateLead(id: string, updates: Partial<Lead>, userId: string): Promise<Lead> {
    const { data, error } = await supabase.from('leads').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw new Error(`Failed to update lead: ${error.message}`);
    await auditService.logAction(userId, 'updated', 'lead', id, { status: updates.status });
    return data;
  },

  async updateStatus(id: string, status: LeadStatus, userId: string): Promise<Lead> {
    return this.updateLead(id, { status }, userId);
  },

  async getLeads(startDate?: string, endDate?: string): Promise<Lead[]> {
    let query = supabase.from('leads').select('*');
    if (startDate) query = query.gte('date_received', startDate);
    if (endDate) query = query.lte('date_received', endDate);
    const { data, error } = await query.order('date_received', { ascending: false });
    if (error) { console.error('Failed to fetch leads:', error); return []; }
    return data || [];
  },

  async getLeadStats(startDate?: string, endDate?: string) {
    const leads = await this.getLeads(startDate, endDate);
    const bySource: Record<string, number> = {};
    const byStatus: Record<LeadStatus, number> = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
    leads.forEach((lead) => { bySource[lead.source] = (bySource[lead.source] || 0) + 1; byStatus[lead.status]++; });
    const conversionRate = leads.length > 0 ? (byStatus.converted / leads.length) * 100 : 0;
    return { totalLeads: leads.length, bySource, byStatus, conversionRate: Math.round(conversionRate * 100) / 100 };
  },

  async getConversionFunnel(startDate?: string, endDate?: string) {
    const leads = await this.getLeads(startDate, endDate);
    const funnel = { new: leads.filter((l) => l.status === 'new').length, contacted: leads.filter((l) => l.status === 'contacted').length, qualified: leads.filter((l) => l.status === 'qualified').length, converted: leads.filter((l) => l.status === 'converted').length, lost: leads.filter((l) => l.status === 'lost').length, conversionRate: 0 };
    if (leads.length > 0) funnel.conversionRate = Math.round((funnel.converted / leads.length) * 100 * 100) / 100;
    return funnel;
  },

  async getSourceEffectiveness(startDate?: string, endDate?: string) {
    const leads = await this.getLeads(startDate, endDate);
    const bySource: Record<string, { total: number; converted: number; rate: number }> = {};
    leads.forEach((lead) => {
      if (!bySource[lead.source]) bySource[lead.source] = { total: 0, converted: 0, rate: 0 };
      bySource[lead.source].total++;
      if (lead.status === 'converted') bySource[lead.source].converted++;
    });
    for (const source in bySource) {
      const { total, converted } = bySource[source];
      bySource[source].rate = total > 0 ? Math.round((converted / total) * 100 * 100) / 100 : 0;
    }
    return bySource;
  },
};

export const metricsService = { social: socialMetricsService, email: emailMetricsService, leads: leadService };
export default metricsService;
