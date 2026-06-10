// BMC Command Center - Weekly Reports Page
import { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import type { WeeklyReport } from '../../types';

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      try {
        const recentReports = await reportService.getRecentReports(12);
        setReports(recentReports);
        if (recentReports.length > 0) setSelectedReport(recentReports[0]);
      } catch (err) { console.error('Failed to load reports:', err); }
      finally { setIsLoading(false); }
    };
    loadReports();
  }, []);

  const handleExportPDF = async () => {
    if (!selectedReport) return;
    const html = reportService.generateHTMLReport(selectedReport);
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); printWindow.print(); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Weekly Reports</h1>
      {isLoading ? (
        <div className="text-center py-12"><p className="text-gray-500">Loading reports...</p></div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1 bg-white rounded-lg shadow p-4 h-fit">
            <h2 className="font-semibold mb-4">Recent Reports</h2>
            <div className="space-y-2">
              {reports.map((report) => (
                <button key={report.id} onClick={() => setSelectedReport(report)} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedReport?.id === report.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-900'}`}>
                  <p className="text-sm font-medium">Week of {report.week_of}</p>
                  <p className="text-xs opacity-75">{new Date(report.generated_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-3">
            {selectedReport ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Week of {selectedReport.week_of}</h2>
                    <button onClick={handleExportPDF} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">📥 Export PDF</button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="border border-gray-200 rounded-lg p-3 text-center"><p className="text-sm text-gray-600">Completed</p><p className="text-2xl font-bold">{selectedReport.department_summary.tasksCompleted}</p></div>
                    <div className="border border-gray-200 rounded-lg p-3 text-center"><p className="text-sm text-gray-600">Scheduled</p><p className="text-2xl font-bold">{selectedReport.department_summary.tasksScheduled}</p></div>
                    <div className="border border-gray-200 rounded-lg p-3 text-center"><p className="text-sm text-gray-600">Overdue</p><p className="text-2xl font-bold text-red-600">{selectedReport.department_summary.tasksOverdue}</p></div>
                    <div className="border border-gray-200 rounded-lg p-3 text-center"><p className="text-sm text-gray-600">Active Projects</p><p className="text-2xl font-bold">{selectedReport.department_summary.activeProjects.length}</p></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold mb-4">By Lane</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(selectedReport.department_summary.byLane).map(([lane, stats]: [string, any]) => (
                      <div key={lane} className="border border-gray-200 rounded-lg p-4">
                        <p className="font-medium capitalize mb-3">{lane}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">✓ Complete</span><span className="font-medium">{stats.completed}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">→ Scheduled</span><span className="font-medium">{stats.scheduled}</span></div>
                          <div className="flex justify-between"><span className="text-red-600">⚠ Overdue</span><span className="font-medium text-red-600">{stats.overdue}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedReport.department_summary.activeProjects.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold mb-4">Project Progress</h3>
                    <div className="space-y-4">
                      {selectedReport.department_summary.activeProjects.map((project: any) => (
                        <div key={project.name} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2"><p className="font-medium">{project.name}</p><p className="text-sm text-gray-600">{project.percentComplete}%</p></div>
                          <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.percentComplete}%` }}></div></div>
                          <p className="text-xs text-gray-600 mt-2">{project.completed} of {project.total} tasks completed</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(selectedReport.individual_breakdown).length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold mb-4">Team Contributions</h3>
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200"><tr><th className="text-left py-2 text-gray-700">Name</th><th className="text-left py-2 text-gray-700">Completed</th><th className="text-left py-2 text-gray-700">Status</th></tr></thead>
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(selectedReport.individual_breakdown).map(([uid, member]: [string, any]) => (
                          <tr key={uid} className="hover:bg-gray-50">
                            <td className="py-3">{member.name}</td>
                            <td className="py-3">{member.tasksCompleted}</td>
                            <td className="py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${member.onTrackStatus === 'on-track' ? 'bg-green-100 text-green-800' : member.onTrackStatus === 'at-risk' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{member.onTrackStatus}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center"><p className="text-gray-500">No reports available</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
