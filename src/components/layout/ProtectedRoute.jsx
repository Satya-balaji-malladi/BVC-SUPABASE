import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasRole } from '../../constants/Roles';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, role, profileIncomplete } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Verifying Access...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location, message: 'Your session has expired. Please log in again.' }} />;
  }

  // If profile is incomplete, and we are not trying to access complete-profile, redirect
  if (profileIncomplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  // Check Authorization (Role Based)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasRole(role, allowedRoles)) {
      return (
        <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ color: 'var(--error)', marginBottom: '1rem' }}>403 - Access Denied</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
            You don't have permission to access this page. Please contact your system administrator if you believe this is a mistake.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/'}
          >
            Return to Dashboard
          </button>
        </div>
      );
    }
  }

  // User is authenticated and authorized
  return children;
}
