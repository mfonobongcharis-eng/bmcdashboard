// BMC Command Center - Analytics Dashboard (4 TABS)
import { useState, useEffect } from 'react';
import { metricsService } from '../../services/metricsService';

type Tab = 'social' | 'email' | 'leads' | 'summary';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('social');
  const [isLoading, setIsLoading] = useState(false);
  const [socialMetrics, setSocialMetrics] = useState<any>([]);
  const [emailMetrics, setEmailMetrics] = useState<any>([]);
  const [leadStats, setLeadStats] = useState<any>({});
  const [weekStart, setWeekStart] = useState(
    new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1))
      .toISOString()
      .split('T')[0]
  );

  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      try {
        const [social, email, leads] = await Promise.all([
          metricsService.social.getMetricsForWeek(weekStart),
          metricsService.email.getCampaigns(),
          metricsService.leads.getLeadStats(),
        ]);
        setSocialMetrics(social);
        setEmailMetrics(email);
        setLeadStats(leads);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMetrics();
  }, [weekStart]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'social', label: 'Social Media', icon: '📱' },
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'leads', label: 'Leads', icon: '🎯' },
    { id: 'summary', label: 'Summary', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>

      {/* Week Selector */}
      <div className="flex items-center gap-4">
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <span className="text-sm text-gray-600">Week of {weekStart}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="text-center py-12"><p className="text-gray-500">Loading metrics...</p></div>
        ) : activeTab === 'social' ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Social Media Metrics</h2>
            {socialMetrics.length === 0 ? (
              <p className="text-gray-500">No social metrics recorded for this week</p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {socialMetrics.map((metric: any) => (
                  <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">{metric.platform}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Posts Published</span>
                        <span className="font-medium">{metric.posts_published || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Impressions</span>
                        <span className="font-medium">{(metric.total_impressions || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Engagement</span>
                        <span className="font-medium">{metric.total_engagement || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">New Followers</span>
                        <span className="font-medium text-green-600">+{metric.new_followers || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'email' ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Email Campaigns</h2>
            {emailMetrics.length === 0 ? (
              <p className="text-gray-500">No email campaigns recorded</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 text-gray-700">Campaign</th>
                    <th className="text-left py-3 text-gray-700">Sent</th>
                    <th className="text-left py-3 text-gray-700">Open Rate</th>
                    <th className="text-left py-3 text-gray-700">Click Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {emailMetrics.map((campaign: any) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="py-3">{campaign.campaign_name}</td>
                      <td className="py-3">{campaign.sent || 0}</td>
                      <td className="py-3">{campaign.open_rate || 0}%</td>
                      <td className="py-3">{campaign.click_rate || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'leads' ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Lead Conversion</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{leadStats.totalLeads || 0}</p>
                <p className="text-sm text-gray-600">Total Leads</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{leadStats.byStatus?.contacted || 0}</p>
                <p className="text-sm text-gray-600">Contacted</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{leadStats.byStatus?.converted || 0}</p>
                <p className="text-sm text-gray-600">Converted</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{leadStats.conversionRate || 0}%</p>
                <p className="text-sm text-gray-600">Conversion Rate</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-4">By Source</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(leadStats.bySource || {}).map(([source, count]: [string, any]) => (
                  <div key={source} className="flex justify-between">
                    <span className="capitalize text-gray-600">{source}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Weekly Summary</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Total Social Posts</p>
                <p className="text-3xl font-bold text-gray-900">{socialMetrics.reduce((sum: number, m: any) => sum + (m.posts_published || 0), 0)}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Total Email Sent</p>
                <p className="text-3xl font-bold text-gray-900">{emailMetrics.reduce((sum: number, c: any) => sum + (c.sent || 0), 0)}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Total Leads Generated</p>
                <p className="text-3xl font-bold text-gray-900">{leadStats.totalLeads || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
