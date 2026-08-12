import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

// We will import modules as we build them. For now, we will use placeholders for missing ones.
import EventsModule from '../modules/EventsModule';
import FacultyModule from '../modules/FacultyModule';
import StudentsModule from '../modules/StudentsModule';
import UsersModule from '../modules/UsersModule';
import ParticipantsModule from '../modules/ParticipantsModule';
import ReportsModule from '../modules/ReportsModule';
import AnalyticsModule from '../modules/AnalyticsModule';
import SettingsModule from '../modules/SettingsModule';
import ProfileModule from '../modules/ProfileModule';
import DeveloperModule from '../modules/DeveloperModule';
import DepartmentsModule from '../modules/DepartmentsModule';
import BranchesModule from '../modules/BranchesModule';
import CoordinatorScanner from '../../pages/dashboards/CoordinatorScanner';

function PlaceholderModule({ title }) {
  const displayTitle = title.charAt(0).toUpperCase() + title.slice(1);
  return (
    <div style={{ padding: '2rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '1rem' }}>{displayTitle} Module</h2>
        <p style={{ color: 'var(--text-secondary)' }}>This module is currently under construction.</p>
      </div>
    </div>
  );
}

export default function ModuleRouter({ userRole, baseRole }) {
  const { module } = useParams();
  
  // Get department from session
  const sessionStr = localStorage.getItem('bvc_cached_user') || localStorage.getItem('custom_auth_session');
  let userDepartment = null;
  if (sessionStr) {
    try {
      const sessionData = JSON.parse(sessionStr);
      // Fallback for different session structures
      userDepartment = sessionData?.department || sessionData?.user?.department || null;
    } catch (e) {}
  }

  // Get selected event for Event Admins / Coordinators
  const selectedEventId = localStorage.getItem('selected_event_id');

  // If no module is specified in the URL, redirect to the dashboard home
  if (!module) {
    return <Navigate to={`/${baseRole}`} replace />;
  }

  switch (module.toLowerCase()) {
    case 'departments':
      return <DepartmentsModule userRole={userRole} userDepartment={userDepartment} />;
    case 'branches':
      return <BranchesModule userRole={userRole} userDepartment={userDepartment} />;
    case 'events':
      return <EventsModule userRole={userRole} userDepartment={userDepartment} selectedEventId={selectedEventId} />;
    case 'faculty':
      return <FacultyModule userRole={userRole} userDepartment={userDepartment} selectedEventId={selectedEventId} />;
    case 'users':
      return <UsersModule userRole={userRole} userDepartment={userDepartment} selectedEventId={selectedEventId} />;
    case 'students':
      return <StudentsModule userRole={userRole} userDepartment={userDepartment} selectedEventId={selectedEventId} />;
    case 'participants':
      return <ParticipantsModule userRole={userRole} userDepartment={userDepartment} selectedEventId={selectedEventId} />;
    case 'reports':
      return <ReportsModule userRole={userRole} userDepartment={userDepartment} selectedEventId={selectedEventId} />;
    case 'analytics':
      return <AnalyticsModule userRole={userRole} userDepartment={userDepartment} />;
    case 'settings':
      return <SettingsModule userRole={userRole} userDepartment={userDepartment} />;
    case 'developer':
      return <DeveloperModule />;
    case 'profile':
      return <ProfileModule userRole={userRole} />;
    case 'scanner':
      return <CoordinatorScanner isNested={true} />;
    default:
      return <PlaceholderModule title={module} />;
  }
}
