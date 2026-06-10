-- BMC COMMAND CENTER v2 - SUPABASE SCHEMA
-- Created: June 9, 2026
-- Authority: Master Build Checklist

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'internal', -- admin, internal, agency
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- 2. PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  lanes TEXT[], -- array: medusa, gravity, creditflow, brand
  status VARCHAR(20) DEFAULT 'planning', -- planning, active, completed, on-hold
  kpi_ids UUID[], -- array of KPI IDs
  goals JSONB, -- { reach: 50000, leads: 25, etc }
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  archived_at TIMESTAMP,
  CONSTRAINT valid_dates CHECK (start_date <= end_date)
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_archived ON projects(is_archived);

-- ============================================================================
-- 3. KPIs TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50), -- social, email, conversion, brand, operational
  data_type VARCHAR(20), -- number, percentage, ratio
  related_metrics TEXT[], -- array of metric field names
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- 4. TOUCHPOINTS TABLE (Fully Editable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(10), -- emoji
  description TEXT,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  archived_at TIMESTAMP
);

-- Default touchpoints (can be edited)
INSERT INTO touchpoints (name, icon, description, visible) VALUES
  ('Social Media', '📱', 'Instagram, LinkedIn, Facebook, TikTok posts', true),
  ('Email', '📧', 'Newsletters, campaigns, outreach', true),
  ('Blog', '📝', 'Articles, thought leadership', true),
  ('Events & Webinars', '🎤', 'Conferences, webinars, internal meetings', true),
  ('Press Releases', '📰', 'Media outreach, PR', true),
  ('Video', '🎥', 'Video production, YouTube, TikTok', true),
  ('Admin', '⚙️', 'Operations, vendor management', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 5. TAGS TABLE (Fully Editable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  archived_at TIMESTAMP
);

-- Default tags (can be edited)
INSERT INTO tags (name) VALUES
  ('Campaign'),
  ('External'),
  ('Thought Leadership'),
  ('Recurring'),
  ('Partners'),
  ('Social Proof'),
  ('Awareness'),
  ('Infrastructure'),
  ('SEO'),
  ('Operations'),
  ('Conversion')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. TASKS TABLE (Core)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  
  lane VARCHAR(50) NOT NULL, -- medusa, gravity, creditflow, brand
  touchpoint_id UUID REFERENCES touchpoints(id),
  project_id UUID REFERENCES projects(id),
  
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, live, complete, overdue
  
  due_date DATE,
  start_date DATE,
  
  tags UUID[], -- array of tag IDs
  kpi_ids UUID[], -- array of KPI IDs
  
  links JSONB, -- array of { title, url }
  related_metrics JSONB, -- { socialPost, email, lead }
  
  notes TEXT,
  
  is_recurring BOOLEAN DEFAULT false,
  recurring_rule JSONB, -- { type, nth, weekday, date, etc }
  parent_rule_id UUID REFERENCES recurring_rules(id),
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  
  CONSTRAINT valid_dates CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date)
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_lane ON tasks(lane);

-- ============================================================================
-- 7. RECURRING RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  touchpoint_id UUID REFERENCES touchpoints(id),
  lane VARCHAR(50),
  
  tags UUID[], -- array of tag IDs
  notes TEXT,
  
  rule JSONB NOT NULL, -- { type, nth, weekday, date, etc }
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- 8. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  type VARCHAR(50), -- assigned, due, overdue
  task_id UUID REFERENCES tasks(id),
  
  title VARCHAR(200) NOT NULL,
  message TEXT,
  
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- 9. AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  action VARCHAR(100), -- created, updated, deleted, assigned, etc
  target_type VARCHAR(50), -- task, project, kpi, user, etc
  target_id UUID,
  
  changes JSONB, -- before/after values
  
  created_at TIMESTAMP DEFAULT now(),
  
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_target (target_type, target_id)
);

-- ============================================================================
-- 10. SOCIAL METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  week_of DATE NOT NULL,
  platform VARCHAR(50), -- instagram, linkedin, facebook, tiktok
  
  posts_published INTEGER,
  total_impressions INTEGER,
  total_reach INTEGER,
  total_engagement INTEGER,
  engagement_rate DECIMAL(5,2),
  new_followers INTEGER,
  
  data JSONB, -- flexible for additional metrics
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  INDEX idx_week_of (week_of),
  INDEX idx_platform (platform)
);

-- ============================================================================
-- 11. EMAIL METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  campaign_name VARCHAR(200),
  email_type VARCHAR(50), -- internal, external, newsletter, campaign
  
  send_date DATE,
  list_size INTEGER,
  sent INTEGER,
  delivered INTEGER,
  open_count INTEGER,
  open_rate DECIMAL(5,2),
  click_count INTEGER,
  click_rate DECIMAL(5,2),
  unsubscribes INTEGER,
  bounces INTEGER,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  INDEX idx_send_date (send_date)
);

-- ============================================================================
-- 12. LEADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  source VARCHAR(100), -- email, website, instagram-dm, linkedin-dm, phone, other
  source_detail VARCHAR(255),
  
  date_received DATE,
  
  lead_name VARCHAR(200),
  company VARCHAR(200),
  
  status VARCHAR(50), -- new, contacted, qualified, converted, lost
  
  task_id UUID REFERENCES tasks(id),
  project_id UUID REFERENCES projects(id),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  INDEX idx_source (source),
  INDEX idx_status (status),
  INDEX idx_date_received (date_received)
);

-- ============================================================================
-- 13. WEEKLY REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  week_of DATE NOT NULL UNIQUE,
  
  department_summary JSONB, -- { tasksCompleted, tasksScheduled, etc }
  individual_breakdown JSONB, -- { userId: { completed, scheduled, etc } }
  kpi_impact JSONB, -- { kpiId: value, etc }
  
  generated_at TIMESTAMP DEFAULT now(),
  generated_by UUID REFERENCES users(id),
  
  html_report TEXT,
  pdf_report BYTEA,
  
  emailed_to TEXT[], -- array of recipient emails
  email_sent_at TIMESTAMP,
  
  INDEX idx_week_of (week_of)
);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- USERS: Everyone can see all users (for assignment dropdowns)
CREATE POLICY "Users can see all users"
  ON users FOR SELECT
  USING (true);

-- PROJECTS: Everyone sees all projects
CREATE POLICY "Everyone sees all projects"
  ON projects FOR SELECT
  USING (true);

-- PROJECTS: Only admin can create/edit/delete
CREATE POLICY "Admin only can modify projects"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin only can update projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin only can delete projects"
  ON projects FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- TASKS: Everyone sees all tasks
CREATE POLICY "Everyone sees all tasks"
  ON tasks FOR SELECT
  USING (true);

-- TASKS: Authenticated users can create tasks
CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- TASKS: Users can update own tasks, admin can update any
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- TASKS: Only admin can delete tasks
CREATE POLICY "Admin only can delete tasks"
  ON tasks FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- NOTIFICATIONS: Users only see their own notifications
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- NOTIFICATIONS: System inserts notifications
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- NOTIFICATIONS: Users can update own notifications (mark as read)
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- AUDIT LOG: Everyone can read audit log (for transparency)
CREATE POLICY "Everyone can read audit log"
  ON audit_log FOR SELECT
  USING (true);

-- AUDIT LOG: System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- METRICS TABLES: Everyone sees all metrics
CREATE POLICY "Everyone sees social metrics"
  ON social_metrics FOR SELECT
  USING (true);

CREATE POLICY "Everyone sees email metrics"
  ON email_metrics FOR SELECT
  USING (true);

CREATE POLICY "Everyone sees leads"
  ON leads FOR SELECT
  USING (true);

-- METRICS TABLES: Authenticated users can add metrics
CREATE POLICY "Authenticated users can add metrics"
  ON social_metrics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can add email metrics"
  ON email_metrics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can add leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- WEEKLY REPORTS: Everyone can read reports
CREATE POLICY "Everyone sees weekly reports"
  ON weekly_reports FOR SELECT
  USING (true);

-- WEEKLY REPORTS: System can insert/update reports
CREATE POLICY "System can manage weekly reports"
  ON weekly_reports FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER social_metrics_updated_at BEFORE UPDATE ON social_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER email_metrics_updated_at BEFORE UPDATE ON email_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END SCHEMA
-- ============================================================================
