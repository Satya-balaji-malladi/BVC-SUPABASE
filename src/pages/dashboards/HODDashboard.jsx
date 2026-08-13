import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Users, Calendar, UserSquare2, BookOpen, Activity, Filter, Eye, UploadCloud } from 'lucide-react';
import ImportStudentsModal from '../../components/widgets/ImportStudentsModal';

export default function HODDashboard() {
  const [stats, setStats] = useState({ events: 0, faculty: 0, students: 0, participants: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [crossDeptActivity, setCrossDeptActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState('');
  
  // Filters State
  const [filters, setFilters] = useState({
    status: 'All'
  });
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Use SessionService to get cached user data securely
      const sessionStr = localStorage.getItem('bvc_cached_user') || localStorage.getItem('custom_auth_session');
      const user = sessionStr ? JSON.parse(sessionStr) : null;
      
      const userId = user?.id || user?.user?.id || user?.user_id;

      if (!userId) {
        setLoading(false);
        return;
      }
      
      // Get HOD's department from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('department')
        .eq('user_id', userId)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching user profile:", profileError);
      }

      const departmentCode = userProfile?.department || user?.department;

      if (departmentCode) {
        const { data: dept } = await supabase.from('departments').select('department_name').eq('department_id', departmentCode).single();
        setDepartmentName(dept?.department_name || departmentCode || 'Your Department');
        
        // Fetch stats scoped to department
        const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).ilike('departments', `%${departmentCode}%`);
        const { count: facultyCount } = await supabase.from('faculty').select('*', { count: 'exact', head: true }).eq('department_id', departmentCode);
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('department_id', departmentCode);
        
        setStats({
          events: eventsCount || 0,
          faculty: facultyCount || 0,
          students: studentCount || 0,
          participants: 0 // Mocked for now
        });

        // Fetch Recent Events scoped to department
        let query = supabase.from('events').select('event_id, event_name, start_date, event_status').ilike('departments', `%${departmentCode}%`).order('created_at', { ascending: false }).limit(5);
        
        if (filters.status !== 'All') {
          query = query.eq('event_status', filters.status);
        }
        
        const { data: eventsData, error: eventsError } = await query;
        if (eventsError) console.error("Error fetching events:", eventsError);
        
        // Map to expected structure for the UI
        const mappedEvents = (eventsData || []).map(e => ({
          id: e.event_id,
          name: e.event_name,
          start_date: e.start_date,
          status: e.event_status
        }));
        
        setRecentEvents(mappedEvents);

        // Fetch cross department activity
        const rawDept = departmentCode.replace('DEPT_', '');
        const { data: deptStudents } = await supabase.from('students').select('roll_number, student_name, section, year').ilike('department_id', `%${rawDept}%`);
        
        if (deptStudents && deptStudents.length > 0) {
          const rollNumbers = deptStudents.map(s => s.roll_number);
          
          const { data: participations } = await supabase.from('event_participants')
            .select(`
              roll_number,
              created_at,
              events (
                event_name,
                departments
              )
            `)
            .in('roll_number', rollNumbers)
            .order('created_at', { ascending: false });

          if (participations) {
            const crossDept = participations.filter(p => {
              if (!p.events) return false;
              const evDepts = (p.events.departments || '').toLowerCase();
              if (evDepts === 'all' || evDepts === '') return false;
              
              const myDept = rawDept.toLowerCase();
              return !evDepts.includes(myDept);
            }).slice(0, 15);
            
            const mappedCrossDept = crossDept.map((p, idx) => {
              const student = deptStudents.find(s => s.roll_number === p.roll_number);
              return {
                id: `${p.roll_number}-${idx}`,
                roll_number: p.roll_number,
                student_name: student?.student_name || 'Unknown',
                year_section: `${student?.year || '-'}/${student?.section || '-'}`,
                event_name: p.events?.event_name || 'Unknown Event',
                event_departments: p.events?.departments || 'Other',
                date: p.created_at
              };
            });
            
            setCrossDeptActivity(mappedCrossDept);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ background: color, padding: '1rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>{title}</h4>
        <h2 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--text-primary)' }}>{value}</h2>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-gradient">{departmentName} Dashboard</h1>
          <p>Overview of your department's events, faculty, and students.</p>
        </div>
        <button onClick={() => setShowImportModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UploadCloud size={18} /> Import Students
        </button>
      </div>

      {/* Stats Row */}
      <div className="responsive-grid" style={{ marginBottom: '3rem' }}>
        <StatCard title="Dept Events" value={stats.events} icon={<Calendar color="white" />} color="var(--accent-blue)" />
        <StatCard title="Dept Faculty" value={stats.faculty} icon={<UserSquare2 color="white" />} color="var(--accent-purple)" />
        <StatCard title="Dept Students" value={stats.students} icon={<BookOpen color="white" />} color="var(--success)" />
        <StatCard title="Participants" value={stats.participants} icon={<Users color="white" />} color="var(--warning)" />
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Events Table */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} className="text-gradient" /> Department Events
            </h3>
            
            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-field" style={{ padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={14} color="var(--text-secondary)" />
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading events...</p>
          ) : recentEvents.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No events found.</p>
          ) : (
            <div className="responsive-table-wrapper">
              <table className="hide-on-mobile" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Event Name</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Date</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Status</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map(event => (
                    <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '1rem 0.75rem' }}>{event.name}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>{new Date(event.start_date).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '999px', 
                          fontSize: '0.75rem',
                          background: event.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                          color: event.status === 'Active' ? 'var(--success)' : 'var(--text-secondary)'
                        }}>
                          {event.status || 'Draft'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="show-on-mobile mobile-card-list">
                {recentEvents.map(event => (
                  <div key={event.id} className="mobile-card">
                    <div className="mobile-card-header">
                      <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{event.name}</h4>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem',
                        background: event.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: event.status === 'Active' ? 'var(--success)' : 'var(--text-secondary)'
                      }}>
                        {event.status || 'Draft'}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Date:</span>
                        <span className="mobile-card-value">{new Date(event.start_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mobile-card-actions">
                      <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                        <Eye size={14} /> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cross Department Activity Widget */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} className="text-gradient" /> Cross-Department Activity
            </h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Students from your department who participated in events hosted by other departments.
          </p>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading activity...</p>
          ) : crossDeptActivity.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No cross-department activity found.</p>
          ) : (
            <div className="responsive-table-wrapper">
              <table className="hide-on-mobile" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Student</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Roll No (Yr/Sec)</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Event Name</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Host Dept(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {crossDeptActivity.map(act => (
                    <tr key={act.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: '500' }}>{act.student_name}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        {act.roll_number} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({act.year_section})</span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--accent-blue)' }}>{act.event_name}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                          {act.event_departments}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="show-on-mobile mobile-card-list">
                {crossDeptActivity.map(act => (
                  <div key={act.id} className="mobile-card">
                    <div className="mobile-card-header">
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{act.student_name}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.roll_number} ({act.year_section})</div>
                      </div>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Event Name:</span>
                        <span className="mobile-card-value" style={{ color: 'var(--accent-blue)', fontWeight: '500' }}>{act.event_name}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Host Dept(s):</span>
                        <span className="mobile-card-value">
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                            {act.event_departments}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
      
      <ImportStudentsModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        onSuccess={() => {
          setShowImportModal(false);
          fetchDashboardData();
        }} 
      />
    </div>
  );
}
