import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Users, Calendar, CheckCircle, Building2, Trophy, ArrowUpRight, Plus, Download, Search, Shield, Upload } from 'lucide-react';
import ImportStudentsModal from '../../components/widgets/ImportStudentsModal';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    events: 0,
    coordinators: 0,
    admins: 0,
    departments: 0,
    attendance: 0,
    completedEvents: 0,
    topEventName: 'No events today',
    topEventAttendees: 0
  });
  
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const fetchBasicStats = async () => {
      try {
        const { count: cCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'Coordinator');
        const { count: aCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'Event Admin');
        const { count: deptCount } = await supabase.from('departments').select('*', { count: 'exact', head: true });
        const { count: activeEventCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'Active');
        const { count: attCount } = await supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('attendance_status', 'Present');
        const { count: completedCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'Completed');
        
        // Fetch top event accurately via RPC
        const { data: topEventData } = await supabase.rpc('get_top_event_today');
        
        let topName = 'No events today';
        let topAttendees = 0;
        
        if (topEventData) {
           topName = topEventData.event_name;
           topAttendees = topEventData.attendee_count;
        }
        
        setStats({
          coordinators: cCount || 0,
          admins: aCount || 0,
          events: activeEventCount || 0,
          departments: deptCount || 0,
          attendance: attCount || 0,
          completedEvents: completedCount || 0,
          topEventName: topName,
          topEventAttendees: topAttendees
        });
      } catch (err) {
        console.error('Error fetching stats', err);
      }
    };
    fetchBasicStats();
  }, []);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
        
        {/* Welcome Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, #2563eb, #3b82f6)', 
        borderRadius: '12px', 
        padding: '2rem', 
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', right: '2rem', top: '1.5rem', background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(4px)' }}>
          <CheckCircle size={16} /> Role: System Admin
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '500', margin: 0, maxWidth: '60%' }}>
          Here's what's happening in the BVC Event Attendance System today.
        </h1>
      </div>

      {/* Stats Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={28} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '0.25rem' }}>Total Coordinators</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.coordinators}</div>
            <div style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}><ArrowUpRight size={12} /> Active</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={28} color="#a855f7" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '0.25rem' }}>Total Admins</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.admins}</div>
            <div style={{ fontSize: '0.75rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}><ArrowUpRight size={12} /> System</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={28} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '0.25rem' }}>Active Events</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.events}</div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}><ArrowUpRight size={12} /> Today</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={28} color="#0ea5e9" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '0.25rem' }}>Today's Attendance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.attendance}</div>
            <div style={{ fontSize: '0.75rem', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}><ArrowUpRight size={12} /> High</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={28} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '0.25rem' }}>Total Departments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.departments}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>- Stable</div>
          </div>
        </div>

      </div>

      <div style={{ height: '1px', background: 'var(--glass-border)', margin: '1rem 0' }}></div>

      {/* Stats Row 2 */}
      <div className="responsive-grid">
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '-1.5rem', top: 0, bottom: 0, width: '4px', background: 'var(--text-muted)', borderRadius: '4px' }}></div>
          <div style={{ position: 'absolute', right: '-2rem', top: 0, bottom: 0, width: '4px', background: '#3b82f6', borderRadius: '4px' }}></div>
          
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} color="var(--text-secondary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.25rem' }}>Completed Events</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.completedEvents}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
               <CheckCircle size={12} /> Total Finished
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={24} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '0.25rem' }}>Top Event Today</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.topEventName}</div>
            <div style={{ fontSize: '0.875rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
               <Users size={14} /> {stats.topEventAttendees} Attendees
            </div>
          </div>
        </div>

      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Quick Actions</h3>
        <div className="responsive-grid-sm">
          <button 
            className="glass-panel" 
            onClick={() => window.location.href = '/super-admin/departments'}
            style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '50%', color: '#3b82f6' }}><Building2 size={24} /></div>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', textAlign: 'center' }}>Manage Departments</span>
          </button>
          <button className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', border: '1px solid rgba(16, 185, 129, 0.2)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%', color: '#10b981' }}><Users size={24} /></div>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Manage Users</span>
          </button>
          <button onClick={() => setShowImportModal(true)} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', border: '1px solid rgba(14, 165, 233, 0.2)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '1rem', borderRadius: '50%', color: '#0ea5e9' }}><Upload size={24} /></div>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Import Students</span>
          </button>
          <button className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', border: '1px solid rgba(245, 158, 11, 0.2)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%', color: '#f59e0b' }}><Search size={24} /></div>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>System Logs</span>
          </button>
          <button className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', border: '1px solid rgba(168, 85, 247, 0.2)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '1rem', borderRadius: '50%', color: '#a855f7' }}><Download size={24} /></div>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Export DB</span>
          </button>
        </div>
      </div>

    </div>
    
      <ImportStudentsModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        onSuccess={() => {
          setShowImportModal(false);
        }} 
      />
    </>
  );
}
