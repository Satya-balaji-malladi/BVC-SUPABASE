import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  LayoutDashboard, Calendar, Users, UserSquare2, ClipboardList, Settings, LogOut, Menu, X, UserCircle, Award, PieChart, User, Bug, Building2
} from 'lucide-react';
import FeedbackWidget from '../widgets/FeedbackWidget';
import ChangePasswordModal from '../widgets/ChangePasswordModal';
import SessionService from '../../services/SessionService';
import AuthService from '../../services/AuthService';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  // Read session to get user role
  const sessionData = SessionService.getUser();
  const userRole = sessionData?.role || 'Guest';
  const userName = sessionData?.name || 'User';

  const getNavItems = (role) => {
    const normalized = role.replace(/\s+/g, '');
    
    const adminModules = (prefix, includeDepartments = false) => {
      const items = [
        { name: 'Dashboard', path: `/${prefix}`, icon: <LayoutDashboard size={20} /> },
      ];
      
      if (includeDepartments) {
        items.push({ name: 'Departments', path: `/${prefix}/departments`, icon: <Building2 size={20} /> });
      } else {
        items.push({ name: 'Branches', path: `/${prefix}/branches`, icon: <Building2 size={20} /> });
      }
      
      items.push(
        { name: 'Events', path: `/${prefix}/events`, icon: <Calendar size={20} /> },
        { name: 'Faculty', path: `/${prefix}/faculty`, icon: <UserSquare2 size={20} /> },
        { name: 'Users', path: `/${prefix}/users`, icon: <UserCircle size={20} /> },
        { name: 'Students', path: `/${prefix}/students`, icon: <Users size={20} /> },
        { name: 'Participants', path: `/${prefix}/participants`, icon: <Award size={20} /> },
        { name: 'Reports', path: `/${prefix}/reports`, icon: <ClipboardList size={20} /> },
        { name: 'Analytics', path: `/${prefix}/analytics`, icon: <PieChart size={20} /> },
        { name: 'Settings', path: `/${prefix}/settings`, icon: <Settings size={20} /> },
        { name: 'Profile', path: `/${prefix}/profile`, icon: <User size={20} /> }
      );
      
      return items;
    };

    if (normalized === 'SuperAdmin') {
      return adminModules('super-admin', true);
    }
    if (normalized === 'HOD' || normalized === 'DepartmentAdmin') {
      return adminModules('department-admin');
    }
    if (normalized === 'EventAdmin') {
      return [
        { name: 'Dashboard', path: `/event-admin`, icon: <LayoutDashboard size={20} /> },
        { name: 'Scanner', path: `/event-admin/scanner`, icon: <LayoutDashboard size={20} /> },
        { name: 'Events', path: `/event-admin/events`, icon: <Calendar size={20} /> },
        { name: 'Users', path: `/event-admin/users`, icon: <UserCircle size={20} /> },
        { name: 'Participants', path: `/event-admin/participants`, icon: <Award size={20} /> },
        { name: 'Reports', path: `/event-admin/reports`, icon: <ClipboardList size={20} /> },
        { name: 'Analytics', path: `/event-admin/analytics`, icon: <PieChart size={20} /> },
        { name: 'Profile', path: `/event-admin/profile`, icon: <User size={20} /> }
      ];
    }
    if (normalized === 'Coordinator') {
      return [
        { name: 'Scanner', path: '/coordinator', icon: <LayoutDashboard size={20} /> }
      ];
    }
    if (normalized === 'Developer') {
      return [
        { name: 'Console', path: '/developer', icon: <Settings size={20} /> }
      ];
    }
    // Default fallback
    return [{ name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> }];
  };

  const navItems = getNavItems(userRole);

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQlFZ_2u0RaNZlfgwlsn7JNBCW34KxzENz6uT3fX7IuA&s=10" 
            alt="BVC Logo" 
            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} 
          />
          <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.25rem', whiteSpace: 'nowrap' }}>BVC EMS</h2>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '1.5rem' }}>
          <button 
            className="btn btn-secondary show-on-mobile" 
            onClick={() => {
              setSidebarOpen(false);
              if (window.openFeedbackWidget) window.openFeedbackWidget();
            }}
            style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}
          >
            <Bug size={18} />
            Report Bug
          </button>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--error)' }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        {/* Top Navbar */}
        <header style={{ 
          height: '60px', 
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1rem',
          justifyContent: 'space-between',
          background: '#fff'
        }}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <div className="hide-on-mobile" style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: '500', fontSize: '0.875rem', display: 'block' }}>{userName}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userRole}</span>
            </div>
            <button 
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <User size={20} style={{ display: 'block', margin: 'auto' }} />
            </button>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div className="glass-panel" style={{ 
                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', 
                width: 'max-content', minWidth: '200px', maxWidth: 'calc(100vw - 2rem)', padding: '0.5rem', borderRadius: '8px', zIndex: 50,
                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)'
              }}>
                <button 
                  onClick={() => { setIsPasswordModalOpen(true); setIsProfileMenuOpen(false); }}
                  style={{ 
                    width: '100%', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
                    textAlign: 'left', borderRadius: '4px'
                  }}
                >
                  <Settings size={16} /> Change Password
                </button>
                <button 
                  onClick={handleLogout}
                  style={{ 
                    width: '100%', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444',
                    textAlign: 'left', borderRadius: '4px', marginTop: '0.25rem'
                  }}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="app-content">
          <Outlet />
        </div>
      </main>

      {/* Global Floating Feedback Widget */}
      <FeedbackWidget />

      {isPasswordModalOpen && (
        <ChangePasswordModal 
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      )}

      <style>{`
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-weight: 500;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .nav-link:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .nav-link.active {
          background: rgba(37, 99, 235, 0.1);
          color: var(--accent-blue-light);
          border-right: 3px solid var(--accent-blue-light);
        }
      `}</style>
    </div>
  );
}
