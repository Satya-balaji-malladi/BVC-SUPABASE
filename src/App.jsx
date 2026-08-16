import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth Context & Roles
import { useAuth } from './context/AuthContext';
import { ROLES, getDashboardBasePathForRole } from './constants/Roles';

// Layouts & Widgets
import AppShell from './components/layout/AppShell';
import FeedbackWidget from './components/widgets/FeedbackWidget';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import CompleteProfile from './pages/auth/CompleteProfile';
import EventSelection from './pages/auth/EventSelection';
import ForgotPassword from './pages/auth/ForgotPassword';

// Dashboards
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';
import HODDashboard from './pages/dashboards/HODDashboard';
import EventAdminDashboard from './pages/dashboards/EventAdminDashboard';
import DeveloperDashboard from './pages/dashboards/DeveloperDashboard';
import CoordinatorScanner from './pages/dashboards/CoordinatorScanner';
import PublicRegistration from './pages/public/PublicRegistration';
import ModuleRouter from './components/layout/ModuleRouter';

function App() {
  const { isAuthenticated, loading, profileIncomplete, role } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading App...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const getDashboardRoute = () => {
    if (!isAuthenticated) return '/login';
    if (profileIncomplete) return '/complete-profile';
    if (!role) return '/select-event';
    
    const basePath = getDashboardBasePathForRole(role);
    if (basePath === '/select-event') {
       if (localStorage.getItem('selected_event_id')) {
          const isCoordOrParticipant = [
            ROLES.COORDINATOR, ROLES.FACULTY_COORDINATOR, ROLES.EVENT_COORDINATOR, 
            ROLES.STUDENT_COORDINATOR, ROLES.GUEST_COORDINATOR, ROLES.STUDENT, ROLES.GUEST
          ].includes(role);
          if (isCoordOrParticipant) return '/coordinator';
          return '/event-admin'; // Admin/Faculty go to event-admin
       }
    }
    return basePath;
  };

  return (
    <BrowserRouter basename="/BVC-SUPABASE">
      <Routes>
        <Route path="/register/:eventId" element={<PublicRegistration />} />

        {/* Public / Auth */}
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={getDashboardRoute()} replace />} />
        <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to={getDashboardRoute()} replace />} />
        
        {/* Full-screen Standalone Routes */}
        <Route 
          path="/complete-profile" 
          element={
            isAuthenticated ? (
              <CompleteProfile />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/select-event" 
          element={
            isAuthenticated && profileIncomplete ? (
              <Navigate to="/complete-profile" replace />
            ) : isAuthenticated ? (
              <ProtectedRoute allowedRoles={[
                ROLES.FACULTY, ROLES.EVENT_ADMIN, ROLES.COORDINATOR, ROLES.FACULTY_COORDINATOR, 
                ROLES.EVENT_COORDINATOR, ROLES.STUDENT_COORDINATOR, ROLES.GUEST_COORDINATOR, 
                ROLES.STUDENT, ROLES.GUEST
              ]}>
                <EventSelection />
              </ProtectedRoute>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/coordinator/*" 
          element={
            isAuthenticated && profileIncomplete ? (
              <Navigate to="/complete-profile" replace />
            ) : isAuthenticated ? (
              <ProtectedRoute allowedRoles={[
                ROLES.COORDINATOR, ROLES.FACULTY_COORDINATOR, ROLES.EVENT_COORDINATOR, 
                ROLES.STUDENT_COORDINATOR, ROLES.GUEST_COORDINATOR, ROLES.STUDENT, ROLES.GUEST
              ]}>
                <CoordinatorScanner />
              </ProtectedRoute>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Protected Dashboard Routes (AppShell) */}
        <Route 
          path="/" 
          element={
            isAuthenticated && profileIncomplete ? (
              <Navigate to="/complete-profile" replace />
            ) : isAuthenticated ? (
              <AppShell />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to={getDashboardRoute()} replace />} />
          
          <Route path="/super-admin" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.DEVELOPER]}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/super-admin/:module" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.DEVELOPER]}><ModuleRouter baseRole="super-admin" /></ProtectedRoute>} />

          <Route path="/department-admin" element={<ProtectedRoute allowedRoles={[ROLES.HOD, ROLES.DEPARTMENT_ADMIN]}><HODDashboard /></ProtectedRoute>} />
          <Route path="/department-admin/:module" element={<ProtectedRoute allowedRoles={[ROLES.HOD, ROLES.DEPARTMENT_ADMIN]}><ModuleRouter baseRole="department-admin" /></ProtectedRoute>} />
          
          <Route path="/event-admin" element={<ProtectedRoute allowedRoles={[ROLES.EVENT_ADMIN, ROLES.FACULTY, ROLES.COORDINATOR, ROLES.FACULTY_COORDINATOR, ROLES.EVENT_COORDINATOR, ROLES.STUDENT, ROLES.GUEST]}><EventAdminDashboard /></ProtectedRoute>} />
          <Route path="/event-admin/:module" element={<ProtectedRoute allowedRoles={[ROLES.EVENT_ADMIN, ROLES.FACULTY, ROLES.COORDINATOR, ROLES.FACULTY_COORDINATOR, ROLES.EVENT_COORDINATOR, ROLES.STUDENT, ROLES.GUEST]}><ModuleRouter baseRole="event-admin" /></ProtectedRoute>} />
          
          <Route path="developer/*" element={<ProtectedRoute allowedRoles={[ROLES.DEVELOPER, ROLES.SUPER_ADMIN]}><DeveloperDashboard /></ProtectedRoute>} />
        </Route>
      </Routes>
      
      {isAuthenticated && !profileIncomplete && <FeedbackWidget />}
    </BrowserRouter>
  );
}

export default App;
