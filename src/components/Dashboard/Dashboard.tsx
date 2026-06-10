// BMC Command Center - Dashboard Component
import { useEffect, useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import type { Task } from '../../types';

export default function Dashboard() {
  const { stats, getUpcomingDeadlines } = useTasks();
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);

  useEffect(() => {
    getUpcomingDeadlines().then(setUpcomingDeadlines);
  }, [getUpcomingDeadlines]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatsCard label="Total Items" value={stats.totalItems} />
        <StatsCard label="This Month" value={stats.thisMonth} />
        <StatsCard label="Live" value={stats.live} color="blue" />
        <StatsCard label="Scheduled" value={stats.scheduled} color="amber" />
        <StatsCard label="Overdue" value={stats.overdue} color="red" />
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h2>
        {upcomingDeadlines.length === 0 ? (
          <p className="text-gray-500">No upcoming deadlines</p>
        ) : (
          <div className="space-y-2">
            {(upcomingDeadlines as any[]).map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700">{task.title}</span>
                <span className="text-xs text-gray-500">{task.due_date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ label, value, color = 'gray' }: { label: string; value: number; color?: string }) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-900',
    blue: 'bg-blue-50 text-blue-900',
    amber: 'bg-amber-50 text-amber-900',
    red: 'bg-red-50 text-red-900',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-6`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
