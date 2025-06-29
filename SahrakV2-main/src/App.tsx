import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/auth/AuthForm';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Medications from './pages/Medications';
import Appointments from './pages/Appointments';
import Caregivers from './pages/Caregivers';
import Profile from './pages/Profile';
import MoodTracker from './pages/MoodTracker';
import PhysicalWellness from './pages/PhysicalWellness';
import AIAssistant from './pages/AIAssistant';
import SOS from './pages/SOS';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your health companion...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />; 
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/medications" element={<Medications />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/caregivers" element={<Caregivers />} />
        <Route path="/mood-tracker" element={<MoodTracker />} />
        <Route path="/progress" element={<PhysicalWellness />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/sos" element={<SOS />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppContent />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-color)',
                border: '1px solid #475569'
              },
            }}
          />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;