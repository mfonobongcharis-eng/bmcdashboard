// BMC Command Center - Authentication Service
import { createClient } from '@supabase/supabase-js';
import type { User, SignUpData, SignInData } from '../types';

const supabaseUrl = import.meta.env.REACT_APP_SUPABASE_URL as string;
const supabaseKey = import.meta.env.REACT_APP_SUPABASE_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const authService = {
  async signUp(data: SignUpData): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (authError || !authData.user) throw new Error(`Sign up failed: ${authError?.message}`);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{ id: authData.user.id, email: data.email, full_name: data.full_name, role: data.role || 'internal', is_active: true }])
      .select().single();
    if (userError) throw new Error(`User profile creation failed: ${userError.message}`);
    return userData;
  },

  async signIn(data: SignInData): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (authError || !authData.user) throw new Error(`Sign in failed: ${authError?.message}`);
    const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
    if (userError) throw new Error(`Failed to fetch user: ${userError.message}`);
    return userData;
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Sign out failed: ${error.message}`);
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;
    const { data, error } = await supabase.from('users').select('*').eq('id', authUser.id).single();
    if (error) return null;
    return data;
  },

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw new Error(`Password reset failed: ${error.message}`);
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(`Password update failed: ${error.message}`);
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  },
};

export const userManagementService = {
  async generateInviteLink(email: string, role: 'internal' | 'agency') {
    const inviteToken = Buffer.from(`${email}:${role}`).toString('base64');
    const inviteUrl = `${window.location.origin}/join?token=${inviteToken}`;
    return { token: inviteToken, email, inviteUrl, role, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
  },

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch users: ${error.message}`);
    return data || [];
  },

  async updateUserRole(userId: string, role: 'admin' | 'internal' | 'agency') {
    const { data, error } = await supabase.from('users').update({ role }).eq('id', userId).select().single();
    if (error) throw new Error(`Failed to update user role: ${error.message}`);
    return data;
  },

  async deactivateUser(userId: string) {
    const { data, error } = await supabase.from('users').update({ is_active: false }).eq('id', userId).select().single();
    if (error) throw new Error(`Failed to deactivate user: ${error.message}`);
    return data;
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();
    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return data;
  },
};

export const auditService = {
  async logAction(userId: string, action: string, targetType: string, targetId?: string, changes?: Record<string, any>) {
    const { error } = await supabase.from('audit_log').insert([{ user_id: userId, action, target_type: targetType, target_id: targetId, changes, created_at: new Date().toISOString() }]);
    if (error) console.error('Audit logging failed:', error.message);
  },

  async getAuditTrail(targetType: string, targetId: string) {
    const { data, error } = await supabase.from('audit_log').select('*').eq('target_type', targetType).eq('target_id', targetId).order('created_at', { ascending: false });
    if (error) { console.error('Failed to fetch audit trail:', error.message); return []; }
    return data || [];
  },
};
