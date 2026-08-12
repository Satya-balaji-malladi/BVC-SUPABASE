import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Calendar, Users, Award, Percent, Clock, AlertCircle } from 'lucide-react';
import EventAdminService from '../../services/EventAdminService';
import { useNavigate } from 'react-router-dom';

export default function EventAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await EventAdminService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#6c757d' }}>Loading dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: '#dc3545' }}>{error}</div>;
  }

  if (!stats || stats.events_count === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ffc107', marginBottom: '1rem' }} />
        <h3>No Assigned Events</h3>
        <p style={{ color: '#6c757d', maxWidth: '400px', margin: '0 auto' }}>
          You do not currently have any active events assigned to you. If you believe this is a mistake, please contact your HOD or Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ marginBottom: '0.5rem', fontWeight: 700, color: '#212529' }}>Event Dashboard</h2>
      <p style={{ color: '#6c757d', marginBottom: '2rem' }}>Overview of your assigned events and attendance.</p>
      
      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f3f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h6 style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem', fontWeight: 600 }}>Total Registrations</h6>
            <div style={{ background: 'rgba(13, 110, 253, 0.1)', color: '#0d6efd', padding: '0.5rem', borderRadius: '8px' }}><Users size={20} /></div>
          </div>
          <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{stats.total_participants}</h3>
        </div>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f3f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h6 style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem', fontWeight: 600 }}>Total Present</h6>
            <div style={{ background: 'rgba(25, 135, 84, 0.1)', color: '#198754', padding: '0.5rem', borderRadius: '8px' }}><Award size={20} /></div>
          </div>
          <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{stats.total_present}</h3>
        </div>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f3f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h6 style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem', fontWeight: 600 }}>Attendance %</h6>
            <div style={{ background: 'rgba(13, 202, 240, 0.1)', color: '#0dcaf0', padding: '0.5rem', borderRadius: '8px' }}><Percent size={20} /></div>
          </div>
          <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{stats.attendance_percentage}%</h3>
        </div>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f3f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h6 style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem', fontWeight: 600 }}>Active Events</h6>
            <div style={{ background: 'rgba(111, 66, 193, 0.1)', color: '#6f42c1', padding: '0.5rem', borderRadius: '8px' }}><Calendar size={20} /></div>
          </div>
          <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{stats.events_count}</h3>
        </div>
      </div>

      <div className="desktop-grid-2-1">
        
        {/* Recent Activity */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e9ecef', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
            <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} /> Recent Attendance Scans
            </h5>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {stats.recent_attendance?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.recent_attendance.map((att, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: idx < stats.recent_attendance.length - 1 ? '1px solid #f1f3f5' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{att.first_name} <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>({att.roll_number})</span></div>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Event ID: {att.event_id}</div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#198754', fontWeight: 500 }}>
                      {new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', padding: '2rem 0' }}>No recent scans recorded.</div>
            )}
          </div>
        </div>

        {/* Assigned Events List */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e9ecef', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
            <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Your Events</h5>
          </div>
          <div style={{ padding: '1rem' }}>
            {stats.events?.map(ev => (
              <div key={ev.event_id} style={{ padding: '1rem', border: '1px solid #f1f3f5', borderRadius: '8px', marginBottom: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => navigate('/event-admin/events')} onMouseOver={e => e.currentTarget.style.borderColor = '#0d6efd'} onMouseOut={e => e.currentTarget.style.borderColor = '#f1f3f5'}>
                <div style={{ fontWeight: 600, color: '#0d6efd', marginBottom: '0.25rem' }}>{ev.event_name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6c757d' }}>
                  <span>{new Date(ev.start_date).toLocaleDateString()}</span>
                  <span style={{ 
                    background: ev.event_status === 'Active' ? '#d1e7dd' : '#e2e3e5', 
                    color: ev.event_status === 'Active' ? '#0f5132' : '#383d41', 
                    padding: '2px 8px', borderRadius: '10px', fontWeight: 600 
                  }}>
                    {ev.event_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
