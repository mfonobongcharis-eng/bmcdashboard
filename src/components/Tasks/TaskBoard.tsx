import { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import type { TaskFilters, Lane, Priority, TaskStatus } from '../../types';

export default function TaskBoard() {
  const { tasks, isLoading, applyFilters, clearFilters, updateTaskStatus } = useTasks();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const handleFilterChange = (newFilters: TaskFilters) => {
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    setMyTasksOnly(false);
    clearFilters();
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      live: 'bg-green-100 text-green-800',
      complete: 'bg-purple-100 text-purple-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: Priority) => {
    const colors: Record<Priority, string> = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-red-600',
    };
    return colors[priority];
  };

  const filteredTasks = tasks;
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (myTasksOnly ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        {activeFilterCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Clear {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Lane</label>
            <select
              value={filters.lane || 'all'}
              onChange={(e) => handleFilterChange({ ...filters, lane: e.target.value === 'all' ? undefined : (e.target.value as Lane) })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All</option>
              <option value="medusa">Medusa</option>
              <option value="gravity">Gravity</option>
              <option value="creditflow">CreditFlow</option>
              <option value="brand">Brand</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority || 'all'}
              onChange={(e) => handleFilterChange({ ...filters, priority: e.target.value === 'all' ? undefined : (e.target.value as Priority) })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange({ ...filters, status: e.target.value === 'all' ? undefined : (e.target.value as TaskStatus) })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="complete">Complete</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search tasks..."
              onChange={(e) => handleFilterChange({ ...filters, searchTerm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={myTasksOnly}
                onChange={(e) => setMyTasksOnly(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">My Tasks</span>
            </label>
          </div>

          <div className="flex items-end">
            <span className="text-sm text-gray-600">{filteredTasks.length} tasks</span>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <div className="text-center py-12"><p className="text-gray-500">Loading...</p></div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center"><p className="text-gray-500">No tasks found</p></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Lane</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{task.lane}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{task.due_date}</td>
                  <td className={`px-6 py-4 text-sm font-medium capitalize ${getPriorityColor(task.priority)}`}>{task.priority}</td>
                  <td className="px-6 py-4">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getStatusColor(task.status)}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="live">Live</option>
                      <option value="complete">Complete</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
