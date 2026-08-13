import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Layouts & Widgets
import AppShell from './components/layout/AppShell';
import FeedbackWidget from './components/widgets/FeedbackWidget';
import ProtectedRoute from './components/layout/ProtectedRoute';
import SessionService from './services/SessionService';

// Auth Pages
import Login from './pages/auth/Login';
import CompleteProfile from './pages/auth/CompleteProfile';
import EventSelection from './pages/auth/EventSelection';
import ForgotPassword from './pages/auth/ForgotPassword';

// Dashboards (Placeholders for now)
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';
import HODDashboard from './pages/dashboards/HODDashboard';
import EventAdminDashboard from './pages/dashboards/EventAdminDashboard';
import DeveloperDashboard from './pages/dashboards/DeveloperDashboard';
import CoordinatorScanner from './pages/dashboards/CoordinatorScanner';
import PublicRegistration from './pages/public/PublicRegistration';
import ModuleRouter from './components/layout/ModuleRouter';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      // Fast check first
      if (!SessionService.isAuthenticated()) {
        setSession(null);
        setUserRole(null);
        setLoading(false);
        return;
      }
      
      const cachedUser = SessionService.getUser();
      setSession(true);
      setUserRole(cachedUser?.role);
      
      // We don't block the initial render on backend validation here 
      // because ProtectedRoute handles the secure validation.
      checkUserProfile(cachedUser?.id, cachedUser);
    };

    loadSession();

    // Listen for custom login/logout events
    window.addEventListener('auth_state_changed', loadSession);
    
    return () => window.removeEventListener('auth_state_changed', loadSession);
  }, []);

  const checkUserProfile = async (userId, cachedUser) => {
    try {
      // With custom auth, we might just trust the cached role to save a query, 
      // but let's query to ensure it's up to date.
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId) // legacy schema usually has user_id
        .single();

      let activeProfile = userProfile;
      
      // Fallback to id if user_id fails
      if (error && error.code === 'PGRST116') {
         const { data: fallbackProfile } = await supabase.from('users').select('*').eq('id', userId).single();
         activeProfile = fallbackProfile;
      }

      if (!activeProfile && !cachedUser) {
        setProfileIncomplete(true);
      } else if (activeProfile || cachedUser) {
        const finalProfile = activeProfile || cachedUser;
        
        // Check account expiry
        if (finalProfile.account_expires_at && new Date(finalProfile.account_expires_at) < new Date()) {
          alert('Your account has expired.');
          SessionService.clearSession();
          window.dispatchEvent(new Event('auth_state_changed'));
          return;
        }

        // Check if mandatory fields are missing or if first_login is true
        const normalizedRole = finalProfile.role ? finalProfile.role.replace(/\s+/g, '') : '';
        const isSuperOrDev = normalizedRole === 'SuperAdmin' || normalizedRole === 'Developer';
        const hasName = finalProfile.name || finalProfile.first_name;
        const hasDept = finalProfile.department_code || finalProfile.department;
        const isFirstLogin = finalProfile.first_login === true || finalProfile.first_login === 'true';
        
        if (!isSuperOrDev && (isFirstLogin || !hasName || !hasDept)) {
          setProfileIncomplete(true);
        } else {
          setProfileIncomplete(false);
        }
        
        setUserRole(finalProfile.role);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // Fallback to cached role if DB fails so we don't get stuck in a login loop
      if (cachedUser && cachedUser.role) {
        setUserRole(cachedUser.role);
      }
    } finally {
      setLoading(false);
    }
  };

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
    if (!session) return '/login';
    if (profileIncomplete) return '/complete-profile';
    if (!userRole) return '/select-event';
    const normalized = userRole.replace(/\s+/g, '');
    if (normalized === 'SuperAdmin') return '/super-admin';
    if (normalized === 'HOD' || normalized === 'DepartmentAdmin') return '/department-admin';
    if (normalized === 'Developer') return '/developer';
    
    if (['Coordinator', 'FacultyCoordinator', 'EventCoordinator', 'Student', 'Guest', 'STUDENT', 'GUEST', 'StudentCoordinator', 'GuestCoordinator'].includes(normalized)) {
      if (localStorage.getItem('selected_event_id')) {
        return '/coordinator';
      }
      return '/select-event';
    }
    
    if (['Faculty', 'EventAdmin'].includes(normalized)) {
      return '/select-event';
    }
    
    return '/select-event';
  };

  return (
    <BrowserRouter basename="/BVC-SUPABASE">
      <Routes>
        <Route path="/register/:eventId" element={<PublicRegistration />} />

        {/* Public / Auth */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to={getDashboardRoute()} replace />} />
        <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to={getDashboardRoute()} replace />} />
        
        {/* Full-screen Standalone Routes */}
        <Route 
          path="/complete-profile" 
          element={
            session ? (
              <CompleteProfile onComplete={() => setProfileIncomplete(false)} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/select-event" 
          element={
            session && profileIncomplete ? (
              <Navigate to="/complete-profile" replace />
            ) : session ? (
              <ProtectedRoute allowedRoles={['Faculty', 'Event Admin', 'Coordinator', 'Faculty Coordinator', 'Event Coordinator', 'Student', 'Guest', 'STUDENT', 'GUEST', 'Student Coordinator', 'Guest Coordinator']}>
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
            session && profileIncomplete ? (
              <Navigate to="/complete-profile" replace />
            ) : session ? (
              <ProtectedRoute allowedRoles={['Coordinator', 'Faculty Coordinator', 'Event Coordinator', 'Student', 'Guest', 'STUDENT', 'GUEST', 'Student Coordinator', 'Guest Coordinator']}>
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
            session && profileIncomplete ? (
              <Navigate to="/complete-profile" replace />
            ) : session ? (
              <AppShell />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to={getDashboardRoute()} replace />} />
          
          <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['Super Admin', 'Developer']}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/super-admin/:module" element={<ProtectedRoute allowedRoles={['Super Admin', 'Developer']}><ModuleRouter userRole={userRole} baseRole="super-admin" /></ProtectedRoute>} />

          <Route path="/department-admin" element={<ProtectedRoute allowedRoles={['HOD', 'Department Admin']}><HODDashboard /></ProtectedRoute>} />
          <Route path="/department-admin/:module" element={<ProtectedRoute allowedRoles={['HOD', 'Department Admin']}><ModuleRouter userRole={userRole} baseRole="department-admin" /></ProtectedRoute>} />
          
          <Route path="/event-admin" element={<ProtectedRoute allowedRoles={['Event Admin', 'Student', 'Guest', 'Faculty Coordinator', 'Event Coordinator']}><EventAdminDashboard /></ProtectedRoute>} />
          <Route path="/event-admin/:module" element={<ProtectedRoute allowedRoles={['Event Admin', 'Student', 'Guest', 'Faculty Coordinator', 'Event Coordinator']}><ModuleRouter userRole={userRole} baseRole="event-admin" /></ProtectedRoute>} />
          
          <Route path="developer/*" element={<ProtectedRoute allowedRoles={['Developer', 'Super Admin']}><DeveloperDashboard /></ProtectedRoute>} />
        </Route>
      </Routes>
      
      {session && !profileIncomplete && <FeedbackWidget />}
    </BrowserRouter>
  );
}

export default App;
