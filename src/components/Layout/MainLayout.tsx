// BMC Command Center - MainLayout Component
import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TaskCreateModal from '../Tasks/TaskCreateModal';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 ml-64">
        {/* Topbar */}
        <Topbar onNewTaskClick={() => setShowCreateModal(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <TaskCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
