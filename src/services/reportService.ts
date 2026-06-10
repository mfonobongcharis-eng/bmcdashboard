// BMC Command Center - Weekly Report Service
// Auto-generates weekly impact reports (department summary, individual breakdown, KPI impact)

import type {
  WeeklyReport,
  DepartmentSummary,
  IndividualBreakdown,
  Task,
  Lane,
} from '../types';
import { supabase } from './authService';
import { taskService } from './taskService';
import { projectService } from './projectService';
import { metricsService } from './metricsService';
import { auditService } from './authService';

// ============================================================================
// WEEKLY REPORT GENERATION
// ============================================================================

export const reportService = {
  /**
   * Get the start of the week (Monday) for a given date
   */
  getWeekStart(date: Date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  },

  /**
   * Get the end of the week (Sunday) for a given date
   */
  getWeekEnd(date: Date = new Date()): string {
    const start = new Date(this.getWeekStart(date));
    start.setDate(start.getDate() + 6);
    return start.toISOString().split('T')[0];
  },

  /**
   * Generate department summary for a week
   */
  async generateDepartmentSummary(weekStart: string): Promise<DepartmentSummary> {
    const weekEnd = this.getWeekEnd(new Date(weekStart));

    // Get all tasks with completion dates in this week
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, projects(name)')
      .lte('completed_at', `${weekEnd}T23:59:59Z`)
      .gte('completed_at', `${weekStart}T00:00:00Z`);

    if (error) {
      console.error('Failed to fetch tasks for report:', error);
      return {
        tasksCompleted: 0,
        tasksScheduled: 0,
        tasksOverdue: 0,
        byLane: {
          medusa: { completed: 0, scheduled: 0, overdue: 0 },
          gravity: { completed: 0, scheduled: 0, overdue: 0 },
          creditflow: { completed: 0, scheduled: 0, overdue: 0 },
          brand: { completed: 0, scheduled: 0, overdue: 0 },
        },
        activeProjects: [],
      };
    }

    // Count by status and lane
    const byLane: Record<Lane, { completed: number; scheduled: number; overdue: number }> = {
      medusa: { completed: 0, scheduled: 0, overdue: 0 },
      gravity: { completed: 0, scheduled: 0, overdue: 0 },
      creditflow: { completed: 0, scheduled: 0, overdue: 0 },
      brand: { completed: 0, scheduled: 0, overdue: 0 },
    };

    let tasksCompleted = 0;
    let tasksScheduled = 0;
    let tasksOverdue = 0;

    (tasks || []).forEach((task: any) => {
      const lane = task.lane as Lane;

      if (task.status === 'complete') {
        tasksCompleted++;
        byLane[lane].completed++;
      } else if (task.status === 'overdue') {
        tasksOverdue++;
        byLane[lane].overdue++;
      } else if (task.status === 'scheduled') {
        tasksScheduled++;
        byLane[lane].scheduled++;
      }
    });

    // Get active projects with completion %
    const projects = await projectService.getActiveProjects();
    const activeProjects = [];

    for (const project of projects) {
      const stats = await projectService.getProjectStats(project.id);
      activeProjects.push({
        name: project.name,
        completed: stats.completedTasks,
        total: stats.totalTasks,
        percentComplete: stats.percentComplete,
      });
    }

    return {
      tasksCompleted,
      tasksScheduled,
      tasksOverdue,
      byLane,
      activeProjects: activeProjects.filter((p) => p.total > 0),
    };
  },

  /**
   * Generate individual breakdown for a week
   */
  async generateIndividualBreakdown(
    weekStart: string
  ): Promise<IndividualBreakdown> {
    const weekEnd = this.getWeekEnd(new Date(weekStart));

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true);

    if (usersError || !users) {
      return {};
    }

    const breakdown: IndividualBreakdown = {};

    // For each user, calculate their contributions
    for (const user of users) {
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .lte('updated_at', `${weekEnd}T23:59:59Z`)
        .gte('created_at', `${weekStart}T00:00:00Z`);

      if (!userTasks) continue;

      const tasksCompleted = userTasks.filter((t) => t.status === 'complete').length;
      const tasksScheduled = userTasks.filter((t) => t.status === 'scheduled').length;
      const tasksOverdue = userTasks.filter((t) => t.status === 'overdue').length;

      // Get unique projects they contributed to
      const projectIds = [...new Set(userTasks.map((t) => t.project_id).filter(Boolean))];
      const highlights = projectIds.length > 0 ? `Led ${projectIds.length} project(s)` : 'No active projects';

      // Get KPIs they impacted
      const allKPIIds = new Set<string>();
      userTasks.forEach((task) => {
        (task.kpi_ids || []).forEach((kpiId: string) => allKPIIds.add(kpiId));
      });

      // Determine on-track status
      let onTrackStatus: 'on-track' | 'at-risk' | 'blocked' = 'on-track';
      if (tasksOverdue > 0) {
        onTrackStatus = 'blocked';
      } else if (tasksOverdue + tasksScheduled > 5) {
        onTrackStatus = 'at-risk';
      }

      breakdown[user.id] = {
        name: user.full_name,
        tasksCompleted,
        tasksScheduled,
        tasksOverdue,
        highlight: highlights,
        kpisAdvanced: Array.from(allKPIIds),
        onTrackStatus,
      };
    }

    return breakdown;
  },

  /**
   * Calculate KPI impact for a week
   */
  async generateKPIImpact(weekStart: string) {
    // Get all KPIs
    const { data: kpis } = await supabase.from('kpis').select('*');

    if (!kpis) return {};

    const impact: Record<string, any> = {};

    for (const kpi of kpis) {
      // Get all tasks this week that map to this KPI
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .contains('kpi_ids', [kpi.id]);

      const completedCount = (tasks || []).filter((t) => t.status === 'complete').length;

      impact[kpi.id] = {
        name: kpi.name,
        category: kpi.category,
        tasksCompleted: completedCount,
        dataType: kpi.data_type,
      };
    }

    return impact;
  },

  /**
   * Generate full weekly report
   */
  async generateWeeklyReport(weekStart: string, userId: string): Promise<WeeklyReport> {
    const weekEnd = this.getWeekEnd(new Date(weekStart));

    // Generate all report sections
    const departmentSummary = await this.generateDepartmentSummary(weekStart);
    const individualBreakdown = await this.generateIndividualBreakdown(weekStart);
    const kpiImpact = await this.generateKPIImpact(weekStart);

    // Store report in database
    const { data, error } = await supabase
      .from('weekly_reports')
      .upsert(
        [
          {
            week_of: weekStart,
            department_summary: departmentSummary,
            individual_breakdown: individualBreakdown,
            kpi_impact: kpiImpact,
            generated_at: new Date().toISOString(),
            generated_by: userId,
            html_report: null, // Generated on demand
            emailed_to: [], // Configured separately
          },
        ],
        { onConflict: 'week_of' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to generate weekly report: ${error.message}`);
    }

    // Log to audit trail
    await auditService.logAction(userId, 'generated', 'weekly_report', data.id, {
      week_of: weekStart,
    });

    return data;
  },

  /**
   * Get weekly report for a specific week
   */
  async getWeeklyReport(weekStart: string): Promise<WeeklyReport | null> {
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('week_of', weekStart)
      .single();

    if (error) {
      console.error('Failed to fetch weekly report:', error);
      return null;
    }

    return data;
  },

  /**
   * Get recent weekly reports
   */
  async getRecentReports(weeks: number = 12): Promise<WeeklyReport[]> {
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('week_of', { ascending: false })
      .limit(weeks);

    if (error) {
      console.error('Failed to fetch recent reports:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Generate HTML report for web/email
   */
  generateHTMLReport(report: WeeklyReport): string {
    const { week_of, department_summary, individual_breakdown, kpi_impact } = report;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Weekly Impact Report - Week of ${'${week_of}'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: #001f3f; color: white; padding: 20px; border-radius: 4px; }
    .section { margin: 30px 0; }
    .section-title { font-size: 20px; font-weight: bold; margin: 20px 0 10px; border-bottom: 2px solid #001f3f; }
    .stat-card { display: inline-block; background: #f5f5f5; padding: 15px; margin: 10px 10px 10px 0; border-radius: 4px; min-width: 150px; }
    .stat-label { font-size: 12px; color: #666; }
    .stat-value { font-size: 24px; font-weight: bold; color: #001f3f; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .on-track { color: #28a745; }
    .at-risk { color: #ffc107; }
    .blocked { color: #dc3545; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Impact Report</h1>
      <p>Week of ${'${week_of}'}</p>
    </div>

    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div>
        <div class="stat-card">
          <div class="stat-label">Tasks Completed</div>
          <div class="stat-value">${'${department_summary.tasksCompleted}'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tasks Scheduled</div>
          <div class="stat-value">${'${department_summary.tasksScheduled}'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Overdue</div>
          <div class="stat-value">${'${department_summary.tasksOverdue}'}</div>
        </div>
      </div>
      
      <h3>By Lane</h3>
      <table>
        <tr><th>Lane</th><th>Completed</th><th>Scheduled</th><th>Overdue</th></tr>
        ${'${Object.entries(department_summary.byLane)'}
          .map(
            ([lane, stats]) =>
              `<tr><td>${'${lane}'}</td><td>${'${stats.completed}'}</td><td>${'${stats.scheduled}'}</td><td>${'${stats.overdue}'}</td></tr>`
          )
          .join('')}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Team Contributions</div>
      <table>
        <tr><th>Team Member</th><th>Completed</th><th>Scheduled</th><th>Status</th></tr>
        ${'${Object.entries(individual_breakdown)'}
          .map(
            ([userId, breakdown]) =>
              `<tr>
                <td>${'${breakdown.name}'}</td>
                <td>${'${breakdown.tasksCompleted}'}</td>
                <td>${'${breakdown.tasksScheduled}'}</td>
                <td class="${'${breakdown.onTrackStatus}'}">${'${breakdown.onTrackStatus}'}</td>
              </tr>`
          )
          .join('')}
      </table>
    </div>

    <div class="section">
      <p style="color: #666; font-size: 12px;">Report generated on ${'${new Date().toLocaleString()}'}</p>
    </div>
  </div>
</body>
</html>
    `;
  },

  /**
   * Schedule weekly report generation (Edge Function)
   * This would be called by a scheduled Edge Function every Sunday at 6 PM UTC
   */
  async scheduleWeeklyReportGeneration() {
    const weekStart = this.getWeekStart();
    const adminUserId = 'system'; // Use system user ID for automated reports

    try {
      const report = await this.generateWeeklyReport(weekStart, adminUserId);

      // TODO: Send email to configured recipients
      // const recipients = ['mfon@3line.com', 'titilola@3line.com'];
      // await emailService.sendWeeklyReport(report, recipients);

      return report;
    } catch (error) {
      console.error('Failed to generate weekly report:', error);
      throw error;
    }
  },
};

export default reportService;
