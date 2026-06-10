// BMC Command Center - Settings Page
import { useState, useEffect } from 'react';
import { supabase } from '../../services/authService';
import type { KPI } from '../../types';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'kpis' | 'touchpoints' | 'tags' | 'users'>('kpis');
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [touchpoints, setTouchpoints] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newKPI, setNewKPI] = useState({ name: '', description: '', category: '', data_type: 'number' });

  useEffect(() => { loadAllSettings(); }, []);

  const loadAllSettings = async () => {
    setIsLoading(true);
    try {
      const [kpisData, touchpointsData, tagsData, usersData] = await Promise.all([
        supabase.from('kpis').select('*'),
        supabase.from('touchpoints').select('*'),
        supabase.from('tags').select('*'),
        supabase.from('users').select('*'),
      ]);
      if (kpisData.data) setKpis(kpisData.data);
      if (touchpointsData.data) setTouchpoints(touchpointsData.data);
      if (tagsData.data) setTags(tagsData.data);
      if (usersData.data) setUsers(usersData.data);
    } catch (err) { console.error('Failed to load settings:', err); }
    finally { setIsLoading(false); }
  };

  const handleAddKPI = async () => {
    if (!newKPI.name) return;
    try {
      const { data, error: _error } = await supabase.from('kpis').insert([newKPI]).select().single();
      if (data) { setKpis([...kpis, data]); setNewKPI({ name: '', description: '', category: '', data_type: 'number' }); }
    } catch (err) { console.error('Failed to add KPI:', err); }
  };

  const handleDeleteKPI = async (id: string) => {
    try { await supabase.from('kpis').delete().eq('id', id); setKpis(kpis.filter((k) => k.id !== id)); }
    catch (err) { console.error('Failed to delete KPI:', err); }
  };

  const tabs = [
    { id: 'kpis', label: 'KPIs', icon: '🎯' },
    { id: 'touchpoints', label: 'Touchpoints', icon: '📍' },
    { id: 'tags', label: 'Tags', icon: '🏷️' },
    { id: 'users', label: 'Users', icon: '👥' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            <span className="mr-2">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="text-center py-12"><p className="text-gray-500">Loading...</p></div>
        ) : activeTab === 'kpis' ? (
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Add New KPI</h3>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="KPI name" value={newKPI.name} onChange={(e) => setNewKPI({ ...newKPI, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <select value={newKPI.category} onChange={(e) => setNewKPI({ ...newKPI, category: e.target.value })} className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select category...</option>
                  <option value="social">Social</option>
                  <option value="email">Email</option>
                  <option value="conversion">Conversion</option>
                  <option value="brand">Brand</option>
                </select>
              </div>
              <button onClick={handleAddKPI} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Add KPI</button>
            </div>
            <div className="space-y-2">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div><p className="font-medium">{kpi.name}</p><p className="text-xs text-gray-600">{kpi.category}</p></div>
                  <button onClick={() => handleDeleteKPI(kpi.id)} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'touchpoints' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Touchpoints are shown in task creation modal</p>
            {touchpoints.map((tp) => (
              <div key={tp.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                <div><p className="font-medium"><span className="mr-2">{tp.icon}</span>{tp.name}</p>{!tp.visible && <p className="text-xs text-gray-500">Hidden</p>}</div>
              </div>
            ))}
          </div>
        ) : activeTab === 'tags' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Tags are used to categorize tasks</p>
            {tags.map((tag) => (<div key={tag.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4"><p className="font-medium">{tag.name}</p></div>))}
          </div>
        ) : (
          <div className="space-y-4">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200"><tr><th className="text-left py-3 text-gray-700">Name</th><th className="text-left py-3 text-gray-700">Email</th><th className="text-left py-3 text-gray-700">Role</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (<tr key={user.id} className="hover:bg-gray-50"><td className="py-3">{user.full_name}</td><td className="py-3">{user.email}</td><td className="py-3"><span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs capitalize">{user.role}</span></td></tr>))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
