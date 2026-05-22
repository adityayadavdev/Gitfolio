import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PublicPortfolio = lazy(() => import('./pages/PublicPortfolio'));
const NotFound = lazy(() => import('./pages/NotFound'));
import UpgradeModal from './components/UpgradeModal';
import { useAuth } from './hooks/useAuth';
import { PremiumProvider } from './context/PremiumContext';
import { AuthProvider } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  useEffect(() => {
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <PremiumProvider>
          <Router>
            <UpgradeModal />
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/u/:username" element={<PublicPortfolio />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </PremiumProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
