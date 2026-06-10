// BMC Command Center v2 - TypeScript Types
// Source: Master Build Checklist

export type UserRole = 'admin' | 'internal' | 'agency';
export type Lane = 'medusa' | 'gravity' | 'creditflow' | 'brand';
export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'draft' | 'scheduled' | 'live' | 'complete' | 'overdue';
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on-hold';
export type NotificationType = 'assigned' | 'due' | 'overdue';
export type KPICategory = 'social' | 'email' | 'conversion' | 'brand' | 'operational';
export type KPIDataType = 'number' | 'percentage' | 'ratio';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type LeadSource = 'email' | 'website' | 'instagram-dm' | 'linkedin-dm' | 'phone' | 'other';
export type RecurrenceType = 'monthly_nth_day' | 'monthly_fixed_date' | 'monthly_end_of_month' | 'bimonthly_fixed_dates' | 'weekly';

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  owner_id: string;
  lanes?: Lane[];
  status: ProjectStatus;
  kpi_ids?: string[];
  goals?: Record<string, number>;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

// ============================================================================
// KPI TYPES
// ============================================================================

export interface KPI {
  id: string;
  name: string;
  description?: string;
  category: KPICategory;
  data_type: KPIDataType;
  related_metrics?: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TOUCHPOINT TYPES
// ============================================================================

export interface Touchpoint {
  id: string;
  name: string;
  icon: string; // emoji
  description?: string;
  visible: boolean;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

// ============================================================================
// TAG TYPES
// ============================================================================

export interface Tag {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

// ============================================================================
// TASK TYPES
// ============================================================================

export interface TaskLink {
  title?: string;
  url: string;
}

export interface RelatedMetrics {
  socialPost?: {
    platform?: string;
    url?: string;
  };
  email?: string; // email metric ID
  lead?: string; // lead ID
}

export interface RecurringRule {
  type: RecurrenceType;
  nth?: number; // 1-4 for nth weekday
  weekday?: number; // 0-6
  date?: number; // 1-28
  date1?: number; // for bimonthly
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string; // user ID
  created_by: string; // user ID
  
  lane: Lane;
  touchpoint_id?: string;
  project_id?: string;
  
  priority: Priority;
  status: TaskStatus;
  
  due_date?: string; // YYYY-MM-DD
  start_date?: string;
  
  tags?: string[]; // tag IDs
  kpi_ids?: string[];
  
  links?: TaskLink[];
  related_metrics?: RelatedMetrics;
  
  notes?: string;
  
  is_recurring: boolean;
  recurring_rule?: RecurringRule;
  parent_rule_id?: string;
  
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  assigned_to?: string;
  lane: Lane;
  touchpoint_id?: string;
  project_id?: string;
  priority?: Priority;
  status?: TaskStatus;
  due_date: string;
  start_date?: string;
  tags?: string[];
  kpi_ids?: string[];
  links?: TaskLink[];
  notes?: string;
  is_recurring?: boolean;
  recurring_rule?: RecurringRule;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  task_id?: string;
  title: string;
  message?: string;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  action: string;
  target_type: string;
  target_id?: string;
  changes?: Record<string, any>;
  created_at: string;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface SocialMetrics {
  id: string;
  week_of: string; // YYYY-MM-DD
  platform: 'instagram' | 'linkedin' | 'facebook' | 'tiktok';
  posts_published?: number;
  total_impressions?: number;
  total_reach?: number;
  total_engagement?: number;
  engagement_rate?: number;
  new_followers?: number;
  data?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailMetrics {
  id: string;
  campaign_name?: string;
  email_type?: 'internal' | 'external' | 'newsletter' | 'campaign';
  send_date?: string; // YYYY-MM-DD
  list_size?: number;
  sent?: number;
  delivered?: number;
  open_count?: number;
  open_rate?: number;
  click_count?: number;
  click_rate?: number;
  unsubscribes?: number;
  bounces?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  source: LeadSource;
  source_detail?: string;
  date_received?: string; // YYYY-MM-DD
  lead_name?: string;
  company?: string;
  status: LeadStatus;
  task_id?: string;
  project_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WEEKLY REPORT TYPES
// ============================================================================

export interface DepartmentSummary {
  tasksCompleted: number;
  tasksScheduled: number;
  tasksOverdue: number;
  byLane: Record<Lane, {
    completed: number;
    scheduled: number;
    overdue: number;
  }>;
  activeProjects: Array<{
    name: string;
    completed: number;
    total: number;
    percentComplete: number;
  }>;
}

export interface IndividualBreakdown {
  [userId: string]: {
    name: string;
    tasksCompleted: number;
    tasksScheduled: number;
    tasksOverdue: number;
    highlight: string;
    kpisAdvanced: string[];
    onTrackStatus: 'on-track' | 'at-risk' | 'blocked';
  };
}

export interface WeeklyReport {
  id: string;
  week_of: string; // YYYY-MM-DD (Monday of that week)
  department_summary: DepartmentSummary;
  individual_breakdown: IndividualBreakdown;
  kpi_impact?: Record<string, any>;
  generated_at: string;
  generated_by?: string;
  html_report?: string;
  pdf_report?: Blob;
  emailed_to?: string[];
  email_sent_at?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// KPI SUGGESTION TYPES
// ============================================================================

export interface KPISuggestion {
  kpiId: string;
  name: string;
  confidence: number; // 0-100
  reason?: string;
}

export interface ProjectSuggestion {
  projectId: string;
  name: string;
  confidence: number; // 0-100
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalItems: number;
  thisMonth: number;
  live: number;
  scheduled: number;
  overdue: number;
}

export interface UpcomingDeadline {
  taskId: string;
  title: string;
  priority: Priority;
  dueDate: string;
  assignedTo: string;
  assignedToName: string;
}

export interface RecentActivity {
  userId: string;
  userName: string;
  action: string; // "completed", "assigned", "created"
  taskTitle: string;
  taskId: string;
  timestamp: string;
  timeAgo: string; // "2h ago"
}

export interface ThisWeekImpact {
  tasksCompleted: number;
  socialReach?: number;
  leadsGenerated?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  upcomingDeadlines: UpcomingDeadline[];
  recentActivity: RecentActivity[];
  thisWeekImpact: ThisWeekImpact;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface TaskFilters {
  lane?: Lane | 'all';
  touchpoint?: string | 'all';
  project?: string | 'all';
  assignedTo?: string | 'all';
  priority?: Priority | 'all';
  status?: TaskStatus | 'all';
  tags?: string[]; // selected tag IDs
  myTasksOnly?: boolean;
  searchTerm?: string;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface InviteLink {
  token: string;
  email: string;
  expiresAt: string;
  role: UserRole;
}

// ============================================================================
// END TYPES
// ============================================================================
