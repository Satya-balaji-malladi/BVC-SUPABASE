import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import SessionService from '../../services/SessionService';

export default function ProtectedRoute({ children, allowedRoles }) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      // 1. Check local session fast path
      if (!SessionService.isAuthenticated()) {
        if (isMounted) {
          setIsValid(false);
          setIsVerifying(false);
        }
        return;
      }

      // 2. Validate backend session securely
      const { valid, user, networkError } = await SessionService.validateSession();
      
      if (isMounted) {
        if (valid && user) {
          setIsValid(true);
          setUserRole(user.role);
          setHasNetworkError(false);
        } else if (networkError) {
          setIsValid(false);
          setHasNetworkError(true);
        } else {
          setIsValid(false);
          setHasNetworkError(false);
        }
        setIsVerifying(false);
      }
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]); // Re-verify on navigation

  if (isVerifying) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Verifying Access...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (hasNetworkError) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📶</div>
        <h1 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Connection Lost</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
          We couldn't connect to the server to verify your session. Please check your internet connection and try again.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!isValid) {
    // Session is invalid or expired
    return <Navigate to="/login" replace state={{ from: location, message: 'Your session has expired. Please log in again.' }} />;
  }

  // 3. Check Authorization (Role Based)
  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedRole = userRole ? userRole.replace(/\s+/g, '') : '';
    
    // Check if the user's normalized role is in the allowed list
    const hasPermission = allowedRoles.some(role => {
      const normAllowed = role.replace(/\s+/g, '');
      return normAllowed === normalizedRole;
    });

    if (!hasPermission) {
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
