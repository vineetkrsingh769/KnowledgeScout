import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HeroPage from './pages/HeroPage';
import DocsPage from './pages/DocsPage';
import AskPage from './pages/AskPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex justify-center items-center">
        <LoadingSpinner size="lg" text="Loading KnowledgeScout..." />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/docs" />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HeroPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/docs" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
                <Navbar />
                <DocsPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/ask" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
                <Navbar />
                <AskPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly={true}>
              <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
                <Navbar />
                <AdminPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
