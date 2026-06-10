// BMC Command Center - TaskCreateModal Component (FULL 5-STEP)
import { useState, useEffect } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { suggestionService } from '../../services/suggestionService';
import type { KPI, Project } from '../../types';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskCreateModal({ isOpen, onClose }: TaskCreateModalProps) {
  const { createTask } = useTasks();
  const { projects } = useProjects();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '', description: '', lane: 'medusa' as const, touchpoint_id: '', project_id: '',
    due_date: '', start_date: '', priority: 'medium' as const, tags: [] as string[],
    kpi_ids: [] as string[], links: [] as { title: string; url: string }[], notes: '', is_recurring: false,
  });

  const [suggestedProject, setSuggestedProject] = useState<{ projectId: string; name: string; confidence: number } | null>(null);
  const [suggestedKPIs, setSuggestedKPIs] = useState<KPI[]>([]);
  const [kpiOptions, setKpiOptions] = useState<KPI[]>([]);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadKPIs = async () => {
      try {
        const { data } = await (window as any).supabase.from('kpis').select('*');
        if (data) setKpiOptions(data);
      } catch (err) { console.error('Failed to load KPIs:', err); }
    };
    loadKPIs();
  }, []);

  useEffect(() => {
    if (formData.title.length > 3) {
      const suggest = async () => {
        try {
          const result = await suggestionService.suggestProject(formData.title, formData.description);
          setSuggestedProject(result);
        } catch (err) { console.error('Project suggestion failed:', err); }
      };
      suggest();
    }
  }, [formData.title, formData.description]);

  useEffect(() => {
    if (step === 4 && formData.title && kpiOptions.length > 0) {
      const suggestKPIs = async () => {
        setIsLoadingKPIs(true);
        try {
          const results = await suggestionService.suggestKPIs(formData.title, formData.description, projects.find((p) => p.id === formData.project_id) || undefined, formData.touchpoint_id, formData.lane, kpiOptions);
          setSuggestedKPIs(results.map((r) => kpiOptions.find((k) => k.id === r.kpiId)!).filter(Boolean));
        } catch (err) { console.error('KPI suggestion failed:', err); }
        finally { setIsLoadingKPIs(false); }
      };
      suggestKPIs();
    }
  }, [step, formData.title, formData.description, formData.project_id, formData.touchpoint_id, formData.lane, kpiOptions, projects]);

  const handleNext = () => {
    if (step === 2 && !formData.title) { setError('Title is required'); return; }
    if (step === 3 && !formData.due_date) { setError('Due date is required'); return; }
    setError(null); setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.due_date) { setError('Title and due date are required'); return; }
    setIsSubmitting(true); setError(null);
    try {
      await createTask({ title: formData.title, description: formData.description, lane: formData.lane, touchpoint_id: formData.touchpoint_id, project_id: formData.project_id, due_date: formData.due_date, start_date: formData.start_date, priority: formData.priority, tags: formData.tags, kpi_ids: formData.kpi_ids, links: formData.links, notes: formData.notes, is_recurring: formData.is_recurring, status: 'draft' });
      setFormData({ title: '', description: '', lane: 'medusa', touchpoint_id: '', project_id: '', due_date: '', start_date: '', priority: 'medium', tags: [], kpi_ids: [], links: [], notes: '', is_recurring: false });
      setStep(1); onClose();
    } catch (err: any) { setError(err?.message || 'Failed to create task'); }
    finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Task</h2>
            <p className="text-sm text-gray-600 mt-1">Step {step} of 5</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <div className="h-1 bg-gray-200"><div className="h-full bg-blue-600 transition-all" style={{ width: `${(step / 5) * 100}%` }}></div></div>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                <input type="text" value={formData.title} onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setSuggestedProject(null); }} placeholder="What needs to be done?" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Add more context..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lane *</label>
                <select value={formData.lane} onChange={(e) => setFormData({ ...formData, lane: e.target.value as any })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="medusa">Medusa</option>
                  <option value="gravity">Gravity</option>
                  <option value="creditflow">CreditFlow</option>
                  <option value="brand">Brand</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Touchpoint *</label>
                <input type="text" placeholder="e.g., Social Media, Email, Blog" value={formData.touchpoint_id} onChange={(e) => setFormData({ ...formData, touchpoint_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project (optional)</label>
                <select value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Choose a project...</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
                {suggestedProject && !formData.project_id && (
                  <button type="button" onClick={() => setFormData({ ...formData, project_id: suggestedProject.projectId })} className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                    ✓ Use suggested: {suggestedProject.name}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date (optional)</label>
                <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="flex gap-4">
                  {['low', 'medium', 'high'].map((p) => (
                    <label key={p} className="flex items-center">
                      <input type="radio" name="priority" value={p} checked={formData.priority === p} onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })} className="mr-2" />
                      <span className="capitalize">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">KPIs (optional)</label>
                {isLoadingKPIs ? (
                  <p className="text-sm text-gray-500">Loading suggestions...</p>
                ) : (
                  <div className="space-y-2">
                    {suggestedKPIs.length > 0 && (<div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-700">{suggestedKPIs.length} suggested KPIs</div>)}
                    {kpiOptions.map((kpi) => (
                      <label key={kpi.id} className="flex items-center">
                        <input type="checkbox" checked={formData.kpi_ids.includes(kpi.id)} onChange={(e) => { if (e.target.checked) { setFormData({ ...formData, kpi_ids: [...formData.kpi_ids, kpi.id] }); } else { setFormData({ ...formData, kpi_ids: formData.kpi_ids.filter((id) => id !== kpi.id) }); } }} className="mr-2" />
                        <span className="text-sm">{kpi.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (optional)</label>
                <input type="text" placeholder="Add comma-separated tags" value={formData.tags.join(', ')} onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Internal notes..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} />
              </div>
              <div>
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.is_recurring} onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })} className="mr-2" />
                  <span className="text-sm">This is a recurring task</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            {step > 1 && (<button type="button" onClick={handleBack} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">← Back</button>)}
            {step < 5 && (<button type="button" onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Next →</button>)}
            {step === 5 && (<button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors">{isSubmitting ? 'Creating...' : 'Create Task'}</button>)}
          </div>
        </form>
      </div>
    </div>
  );
}
