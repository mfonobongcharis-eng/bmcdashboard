// BMC Command Center - Projects List
import { useProjects } from '../../hooks/useProjects';

export default function ProjectList() {
  const { projects, isLoading } = useProjects();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No projects yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              <p className="text-sm text-gray-600 mt-2">{project.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
