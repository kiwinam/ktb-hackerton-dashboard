import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import Header from './components/Header';
import ProjectList from './components/ProjectList';
import RegisterModal from './components/RegisterModal';
import PasswordModal from './components/PasswordModal';
import ProjectDetailModal from './components/ProjectDetailModal';
import Toast from './components/Toast';
import { subscribeToProjects } from './lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';

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

      {/* Scroll to Top */}
      <ScrollToTop />
    </div>
  );
}

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-kakao-black text-white rounded-full shadow-2xl hover:bg-gray-800 transition-colors border border-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up"><path d="m18 15-6-6-6 6" /><path d="m12 21 12-12 12 12" /></svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default App;
