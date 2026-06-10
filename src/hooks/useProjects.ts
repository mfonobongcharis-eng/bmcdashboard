// BMC Command Center - useProjects Hook
// Project state management and CRUD operations

import { useState, useCallback, useEffect } from 'react';
import type { Project, Lane } from '../types';
import { projectService } from '../services/projectService';
import { useAuth } from './useAuth';

interface ProjectCreateInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  owner_id: string;
  lanes?: Lane[];
  status?: 'planning' | 'active' | 'completed' | 'on-hold';
  kpi_ids?: string[];
  goals?: Record<string, number>;
}

export function useProjects(autoLoad = true) {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all projects
  const loadProjects = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const projectsData = await projectService.getProjects(false);
      setProjects(projectsData);

      // Also load active projects separately
      const active = await projectService.getActiveProjects();
      setActiveProjects(active);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load projects';
      setError(errorMessage);
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load on mount
  useEffect(() => {
    if (autoLoad && user) {
      loadProjects();
    }
  }, [user, autoLoad, loadProjects]);

  // Create project
  const createProject = useCallback(
    async (input: ProjectCreateInput) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        const project = await projectService.createProject(input, user.id);
        setProjects((prev) => [project, ...prev]);
        setActiveProjects((prev) => [project, ...prev]);
        return project;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to create project';
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  // Update project
  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        const updated = await projectService.updateProject(projectId, updates, user.id);
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? updated : p))
        );
        setActiveProjects((prev) =>
          prev.map((p) => (p.id === projectId ? updated : p))
        );
        return updated;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to update project';
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  // Archive project
  const archiveProject = useCallback(
    async (projectId: string) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        const archived = await projectService.archiveProject(projectId, user.id);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setActiveProjects((prev) => prev.filter((p) => p.id !== projectId));
        return archived;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to archive project';
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  // Unarchive project
  const unarchiveProject = useCallback(
    async (projectId: string) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        const unarchived = await projectService.unarchiveProject(projectId, user.id);
        setProjects((prev) => [unarchived, ...prev]);
        if (unarchived.status !== 'completed') {
          setActiveProjects((prev) => [unarchived, ...prev]);
        }
        return unarchived;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to unarchive project';
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  // Delete project
  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        await projectService.deleteProject(projectId, user.id);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setActiveProjects((prev) => prev.filter((p) => p.id !== projectId));
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to delete project';
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  // Get project stats
  const getProjectStats = useCallback(async (projectId: string) => {
    try {
      return await projectService.getProjectStats(projectId);
    } catch (err) {
      console.error('Failed to get project stats:', err);
      return null;
    }
  }, []);

  // Update project status
  const updateProjectStatus = useCallback(
    async (
      projectId: string,
      status: 'planning' | 'active' | 'completed' | 'on-hold'
    ) => {
      return updateProject(projectId, { status });
    },
    [updateProject]
  );

  // Link KPIs
  const linkKPIs = useCallback(
    async (projectId: string, kpiIds: string[]) => {
      return updateProject(projectId, { kpi_ids: kpiIds });
    },
    [updateProject]
  );

  // Update goals
  const updateGoals = useCallback(
    async (projectId: string, goals: Record<string, number>) => {
      return updateProject(projectId, { goals });
    },
    [updateProject]
  );

  return {
    projects,
    activeProjects,
    isLoading,
    error,
    loadProjects,
    createProject,
    updateProject,
    archiveProject,
    unarchiveProject,
    deleteProject,
    getProjectStats,
    updateProjectStatus,
    linkKPIs,
    updateGoals,
  };
}
