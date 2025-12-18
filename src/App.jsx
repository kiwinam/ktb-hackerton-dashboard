import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ProjectList from './components/ProjectList';
import RegisterModal from './components/RegisterModal';
import PasswordModal from './components/PasswordModal';
import ProjectDetailModal from './components/ProjectDetailModal';
import Toast from './components/Toast';
import { subscribeToProjects } from './lib/firebase';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [pendingEditProject, setPendingEditProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null); // For detail modal
  const [projects, setProjects] = useState([]);
  // Initialize from localStorage or default to 'latest'
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('project_sort_order') || 'latest');
  const [loading, setLoading] = useState(true);

  // Save sort preference when changed
  useEffect(() => {
    localStorage.setItem('project_sort_order', sortBy);
  }, [sortBy]);
  const [toastMessage, setToastMessage] = useState('');

  // Generate Session ID for Likes if not exists
  useEffect(() => {
    if (!localStorage.getItem('hackathon_session_id')) {
      localStorage.setItem('hackathon_session_id', Math.random().toString(36).substring(2, 15));
    }
  }, []);

  useEffect(() => {
    // Subscribe to realtime updates
    const unsubscribe = subscribeToProjects(
      (data) => {
        setProjects(data);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load projects:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleEditClick = (project) => {
    setPendingEditProject(project);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordVerified = (inputPassword) => {
    if (pendingEditProject && inputPassword === pendingEditProject.password) {
      setEditingProject(pendingEditProject);
      setIsModalOpen(true);
      return true;
    }
    return false;
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortBy === 'likes') {
      const likesA = a.likes || 0;
      const likesB = b.likes || 0;
      if (likesA !== likesB) return likesB - likesA;
    }
    // Default to latest (createdAt)
    const dateA = a.createdAt?.seconds || 0;
    const dateB = b.createdAt?.seconds || 0;
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header onRegister={() => setIsModalOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-6">
          <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex shadow-sm">
            <button
              onClick={() => setSortBy('latest')}
              className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${sortBy === 'latest'
                ? 'bg-kakao-yellow text-kakao-black shadow-sm'
                : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              등록순
            </button>
            <button
              onClick={() => setSortBy('likes')}
              className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${sortBy === 'likes'
                ? 'bg-kakao-yellow text-kakao-black shadow-sm'
                : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              좋아요순
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kakao-yellow"></div>
          </div>
        ) : (
          <ProjectList
            projects={sortedProjects}
            onEdit={handleEditClick}
            onCardClick={setSelectedProject}
          />
        )}
      </main>

      {/* Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      <RegisterModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={editingProject}
        onSuccess={(msg) => showToast(msg)}
      />

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onVerify={handlePasswordVerified}
      />

      <AnimatePresence>
        {toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage('')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
