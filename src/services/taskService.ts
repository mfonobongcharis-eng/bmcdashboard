// BMC Command Center - Task Service
import type { Task, TaskCreateInput, TaskFilters, TaskStatus, Lane, Priority } from '../types';
import { supabase } from './authService';
import { auditService } from './authService';
import { suggestionService } from './suggestionService';

export const taskService = {
  async createTask(input: TaskCreateInput, userId: string): Promise<Task> {
    const assignedTo = input.assigned_to || userId;
    const { data, error } = await supabase.from('tasks').insert([{ title: input.title, description: input.description, assigned_to: assignedTo, created_by: userId, lane: input.lane, touchpoint_id: input.touchpoint_id, project_id: input.project_id, priority: input.priority || 'medium', status: input.status || 'draft', due_date: input.due_date, start_date: input.start_date, tags: input.tags || [], kpi_ids: input.kpi_ids || [], links: input.links || [], notes: input.notes, is_recurring: input.is_recurring || false, recurring_rule: input.recurring_rule, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select().single();
    if (error) throw new Error(`Failed to create task: ${error.message}`);
    await auditService.logAction(userId, 'created', 'task', data.id, { title: data.title, assigned_to: assignedTo });
    if (assignedTo !== userId) await notificationService.triggerAssignmentNotification(data.id, assignedTo, userId);
    return data;
  },

  async getTask(id: string): Promise<Task> {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (error) throw new Error(`Failed to fetch task: ${error.message}`);
    return data;
  },

  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    let query = supabase.from('tasks').select('*');
    if (filters?.lane && filters.lane !== 'all') query = query.eq('lane', filters.lane);
    if (filters?.touchpoint && filters.touchpoint !== 'all') query = query.eq('touchpoint_id', filters.touchpoint);
    if (filters?.project && filters.project !== 'all') query = query.eq('project_id', filters.project);
    if (filters?.assignedTo && filters.assignedTo !== 'all') query = query.eq('assigned_to', filters.assignedTo);
    if (filters?.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.tags && filters.tags.length > 0) query = query.or(filters.tags.map((tag) => `tags.contains.[${tag}]`).join(','));
    if (filters?.searchTerm) { const s = `%${filters.searchTerm}%`; query = query.or(`title.ilike.${s},description.ilike.${s}`); }
    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false });
    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
    return data || [];
  },

  async getMyTasks(userId: string, filters?: TaskFilters): Promise<Task[]> {
    return this.getTasks({ ...filters, assignedTo: userId });
  },

  async getTasksThisMonth(): Promise<Task[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const { data, error } = await supabase.from('tasks').select('*').gte('due_date', startOfMonth.toISOString().split('T')[0]).lte('due_date', endOfMonth.toISOString().split('T')[0]);
    if (error) { console.error('Failed to fetch tasks for this month:', error); return []; }
    return data || [];
  },

  async getUpcomingDeadlines(): Promise<Task[]> {
    const now = new Date();
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase.from('tasks').select('*').gte('due_date', now.toISOString().split('T')[0]).lte('due_date', inTwoDays.toISOString().split('T')[0]).eq('status', 'scheduled').order('due_date', { ascending: true });
    if (error) { console.error('Failed to fetch upcoming deadlines:', error); return []; }
    return data || [];
  },

  async getOverdueTasks(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('tasks').select('*').lt('due_date', today).neq('status', 'complete');
    if (error) { console.error('Failed to fetch overdue tasks:', error); return []; }
    return data || [];
  },

  async updateTask(id: string, updates: Partial<Task>, userId: string): Promise<Task> {
    const original = await this.getTask(id);
    const { data, error } = await supabase.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw new Error(`Failed to update task: ${error.message}`);
    const changes: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if ((original as any)[key] !== (updates as any)[key]) changes[key] = { before: (original as any)[key], after: (updates as any)[key] };
    }
    await auditService.logAction(userId, 'updated', 'task', id, changes);
    if (updates.status === 'complete' && original.status !== 'complete') await auditService.logAction(userId, 'completed', 'task', id, { completedAt: new Date().toISOString() });
    return data;
  },

  async updateTaskStatus(id: string, status: TaskStatus, userId: string): Promise<Task> {
    return this.updateTask(id, { status, completed_at: status === 'complete' ? new Date().toISOString() : undefined }, userId);
  },

  async assignTask(id: string, userId: string, assignedBy: string): Promise<Task> {
    const updated = await this.updateTask(id, { assigned_to: userId }, assignedBy);
    await notificationService.triggerAssignmentNotification(id, userId, assignedBy);
    return updated;
  },

  async deleteTask(id: string, userId: string): Promise<void> {
    const task = await this.getTask(id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete task: ${error.message}`);
    await auditService.logAction(userId, 'deleted', 'task', id, { title: task.title, was: task });
  },

  async linkToProject(taskId: string, projectId: string, userId: string): Promise<Task> {
    return this.updateTask(taskId, { project_id: projectId }, userId);
  },

  async mapKPIs(taskId: string, kpiIds: string[], userId: string): Promise<Task> {
    return this.updateTask(taskId, { kpi_ids: kpiIds }, userId);
  },

  async addTags(taskId: string, tagIds: string[], userId: string): Promise<Task> {
    const task = await this.getTask(taskId);
    const newTags = [...new Set([...(task.tags || []), ...tagIds])];
    return this.updateTask(taskId, { tags: newTags }, userId);
  },

  async addLink(taskId: string, title: string, url: string, userId: string): Promise<Task> {
    if (!url.startsWith('http://') && !url.startsWith('https://')) throw new Error('URL must start with http:// or https://');
    const task = await this.getTask(taskId);
    return this.updateTask(taskId, { links: [...(task.links || []), { title, url }] }, userId);
  },

  async getProjectTasks(projectId: string): Promise<Task[]> {
    return this.getTasks({ project: projectId });
  },

  async getTasksByLane(lane: Lane): Promise<Task[]> {
    return this.getTasks({ lane });
  },

  async getTaskCountByStatus(): Promise<Record<TaskStatus, number>> {
    const { data, error } = await supabase.from('tasks').select('status');
    if (error) { console.error('Failed to get task counts:', error); return { draft: 0, scheduled: 0, live: 0, complete: 0, overdue: 0 }; }
    const counts: Record<TaskStatus, number> = { draft: 0, scheduled: 0, live: 0, complete: 0, overdue: 0 };
    (data || []).forEach((task: any) => { counts[task.status as TaskStatus]++; });
    return counts;
  },
};

export const notificationService = {
  async createNotification(userId: string, type: 'assigned' | 'due' | 'overdue', taskId: string, title: string, message?: string) {
    const { data, error } = await supabase.from('notifications').insert([{ user_id: userId, type, task_id: taskId, title, message, is_read: false, email_sent: false, created_at: new Date().toISOString() }]).select().single();
    if (error) { console.error('Failed to create notification:', error); return null; }
    return data;
  },

  async triggerAssignmentNotification(taskId: string, userId: string, assignedBy: string) {
    const task = await taskService.getTask(taskId);
    await this.createNotification(userId, 'assigned', taskId, `You've been assigned: ${task.title}`, task.description || '');
  },

  async getNotifications(userId: string) {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) { console.error('Failed to fetch notifications:', error); return []; }
    return data || [];
  },

  async markAsRead(notificationId: string) {
    const { data, error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).select().single();
    if (error) { console.error('Failed to mark notification as read:', error); return null; }
    return data;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (error) { console.error('Failed to mark all as read:', error); return false; }
    return true;
  },
};

export const recurringTaskService = {
  async generateRecurringInstances() {
    const { data: rules, error: rulesError } = await supabase.from('recurring_rules').select('*');
    if (rulesError) { console.error('Failed to fetch recurring rules:', rulesError); return; }
    for (const rule of rules || []) {
      await supabase.from('tasks').select('created_at').eq('parent_rule_id', rule.id).order('created_at', { ascending: false }).limit(1).single();
    }
  },
};

export default taskService;
