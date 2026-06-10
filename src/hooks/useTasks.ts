// BMC Command Center - useTasks Hook
// Task state management and CRUD operations

import { useState, useCallback, useEffect } from 'react';
import type { Task, TaskFilters, TaskCreateInput, TaskStatus, Priority } from '../types';
import { taskService } from '../services/taskService';
import { useAuth } from './useAuth';

interface UseTasksOptions {
  autoLoad?: boolean;
  filters?: TaskFilters;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { autoLoad = true, filters: initialFilters } = options;
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(initialFilters || {});
  const [stats, setStats] = useState({
    totalItems: 0,
    thisMonth: 0,
    live: 0,
    scheduled: 0,
    overdue: 0,
  });

  // Load tasks
  const loadTasks = useCallback(async (filtersToUse?: TaskFilters) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const tasksData = await taskService.getTasks(filtersToUse || filters);
      setTasks(tasksData);

      // Update stats
      const counts = await taskService.getTaskCountByStatus();
      const thisMonth = await taskService.getTasksThisMonth();
      setStats({
        totalItems: tasksData.length,
        thisMonth: thisMonth.length,
        live: counts.live,
        scheduled: counts.scheduled,
        overdue: counts.overdue,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load tasks';
      setError(errorMessage);
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  // Load on mount or filter change
  useEffect(() => {
    if (autoLoad && user) {
      loadTasks();
    }
  }, [user, autoLoad, loadTasks]);

  // Create task
  const createTask = useCallback(
    async (input: TaskCreateInput) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        const task = await taskService.createTask(input, user.id);
        setTasks((prev) => [task, ...prev]);
        await loadTasks(); // Refresh stats
        return task;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to create task';
        setError(errorMessage);
        throw err;
      }
    },
    [user, loadTasks]
  );

  // Update task
  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        const updated = await taskService.updateTask(taskId, updates, user.id);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        );
        await loadTasks(); // Refresh stats
        return updated;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to update task';
        setError(errorMessage);
        throw err;
      }
    },
    [user, loadTasks]
  );

  // Update task status
  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      return updateTask(taskId, { status });
    },
    [updateTask]
  );

  // Update task priority
  const updateTaskPriority = useCallback(
    async (taskId: string, priority: Priority) => {
      return updateTask(taskId, { priority });
    },
    [updateTask]
  );

  // Assign task
  const assignTask = useCallback(
    async (taskId: string, userId: string) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        const updated = await taskService.assignTask(taskId, userId, user.id);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        );
        return updated;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to assign task';
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  // Delete task
  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);
      try {
        await taskService.deleteTask(taskId, user.id);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        await loadTasks(); // Refresh stats
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to delete task';
        setError(errorMessage);
        throw err;
      }
    },
    [user, loadTasks]
  );

  // Get upcoming deadlines
  const getUpcomingDeadlines = useCallback(async () => {
    try {
      return await taskService.getUpcomingDeadlines();
    } catch (err) {
      console.error('Failed to get upcoming deadlines:', err);
      return [];
    }
  }, []);

  // Get overdue tasks
  const getOverdueTasks = useCallback(async () => {
    try {
      return await taskService.getOverdueTasks();
    } catch (err) {
      console.error('Failed to get overdue tasks:', err);
      return [];
    }
  }, []);

  // Apply filters
  const applyFilters = useCallback(
    (newFilters: TaskFilters) => {
      setFilters(newFilters);
      loadTasks(newFilters);
    },
    [loadTasks]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    loadTasks({});
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    stats,
    filters,
    loadTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    updateTaskPriority,
    assignTask,
    deleteTask,
    getUpcomingDeadlines,
    getOverdueTasks,
    applyFilters,
    clearFilters,
  };
}
