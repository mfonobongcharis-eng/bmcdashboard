// BMC Command Center - Project Service
import type { Project, Lane } from '../types';
import { supabase } from './authService';
import { auditService } from './authService';
import { taskService } from './taskService';

export const projectService = {
  async createProject(input: { name: string; description?: string; start_date: string; end_date: string; owner_id: string; lanes?: Lane[]; status?: 'planning' | 'active' | 'completed' | 'on-hold'; kpi_ids?: string[]; goals?: Record<string, number> }, userId: string): Promise<Project> {
    const { data, error } = await supabase.from('projects').insert([{ name: input.name, description: input.description, start_date: input.start_date, end_date: input.end_date, owner_id: input.owner_id, lanes: input.lanes || [], status: input.status || 'planning', kpi_ids: input.kpi_ids || [], goals: input.goals || {}, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select().single();
    if (error) throw new Error(`Failed to create project: ${error.message}`);
    await auditService.logAction(userId, 'created', 'project', data.id, { name: data.name, owner_id: input.owner_id });
    return data;
  },

  async getProject(id: string): Promise<Project> {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    if (error) throw new Error(`Failed to fetch project: ${error.message}`);
    return data;
  },

  async getProjects(includeArchived: boolean = false): Promise<Project[]> {
    let query = supabase.from('projects').select('*');
    if (!includeArchived) query = query.eq('is_archived', false);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
    return data || [];
  },

  async getActiveProjects(): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select('*').eq('is_archived', false).in('status', ['planning', 'active']).order('created_at', { ascending: false });
    if (error) { console.error('Failed to fetch active projects:', error); return []; }
    return data || [];
  },

  async updateProject(id: string, updates: Partial<Project>, userId: string): Promise<Project> {
    const original = await this.getProject(id);
    const { data, error } = await supabase.from('projects').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw new Error(`Failed to update project: ${error.message}`);
    const changes: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if ((original as any)[key] !== (updates as any)[key]) changes[key] = { before: (original as any)[key], after: (updates as any)[key] };
    }
    await auditService.logAction(userId, 'updated', 'project', id, changes);
    return data;
  },

  async archiveProject(id: string, userId: string): Promise<Project> {
    return this.updateProject(id, { is_archived: true, archived_at: new Date().toISOString() }, userId);
  },

  async unarchiveProject(id: string, userId: string): Promise<Project> {
    return this.updateProject(id, { is_archived: false, archived_at: undefined }, userId);
  },

  async deleteProject(id: string, userId: string): Promise<void> {
    const project = await this.getProject(id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete project: ${error.message}`);
    await auditService.logAction(userId, 'deleted', 'project', id, { name: project.name });
  },

  async getProjectTasks(projectId: string) {
    return taskService.getTasks({ project: projectId });
  },

  async calculateProjectProgress(projectId: string): Promise<number> {
    const tasks = await this.getProjectTasks(projectId);
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === 'complete').length;
    return Math.round((completed / tasks.length) * 100);
  },

  async getProjectStats(projectId: string) {
    const tasks = await this.getProjectTasks(projectId);
    const progress = await this.calculateProjectProgress(projectId);
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'complete').length,
      scheduledTasks: tasks.filter((t) => t.status === 'scheduled').length,
      liveTask: tasks.filter((t) => t.status === 'live').length,
      overdueTasks: tasks.filter((t) => t.status === 'overdue').length,
      percentComplete: progress,
    };
  },

  async updateProjectStatus(id: string, status: 'planning' | 'active' | 'completed' | 'on-hold', userId: string): Promise<Project> {
    return this.updateProject(id, { status }, userId);
  },

  async linkKPIs(projectId: string, kpiIds: string[], userId: string): Promise<Project> {
    return this.updateProject(projectId, { kpi_ids: kpiIds }, userId);
  },

  async updateGoals(projectId: string, goals: Record<string, number>, userId: string): Promise<Project> {
    return this.updateProject(projectId, { goals }, userId);
  },

  async getProjectsByOwner(ownerId: string): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select('*').eq('owner_id', ownerId).eq('is_archived', false).order('created_at', { ascending: false });
    if (error) { console.error('Failed to fetch projects by owner:', error); return []; }
    return data || [];
  },

  async getProjectsByLane(lane: Lane): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select('*').contains('lanes', [lane]).eq('is_archived', false).order('created_at', { ascending: false });
    if (error) { console.error('Failed to fetch projects by lane:', error); return []; }
    return data || [];
  },

  async getPredefinedProjects(): Promise<Project[]> {
    const predefinedNames = ['Medusa Loan Campaign', 'IWD 2026', 'Agency Banking Launch'];
    const { data, error } = await supabase.from('projects').select('*').in('name', predefinedNames).eq('is_archived', false);
    if (error) { console.error('Failed to fetch predefined projects:', error); return []; }
    return data || [];
  },
};

export default projectService;
