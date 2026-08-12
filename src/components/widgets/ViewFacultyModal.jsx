import React, { useState, useEffect } from 'react';
import { X, User, BookOpen, Building, Mail, ShieldAlert, Calendar, Loader2, CheckCircle2, Clock, Phone } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function ViewFacultyModal({ isOpen, onClose, faculty }) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (isOpen && faculty) {
      fetchFacultyManagedEvents();
    }
  }, [isOpen, faculty]);

  const fetchFacultyManagedEvents = async () => {
    setLoadingEvents(true);
    try {
      // Fetch events hosted/managed or assigned to this faculty/user
      const facultyId = faculty.user_id || faculty.employee_id || faculty.id;
      const facultyEmail = faculty.email_address || faculty.email;

      const [{ data: hostedEvts }, { data: assignedEvts }] = await Promise.all([
        supabase.from('events').select('*').or(`organizer.eq.${facultyId},created_by.eq.${facultyId}`),
        supabase.from('event_assignments').select('*, events(*)').eq('user_id', facultyId)
      ]);

      const eventMap = new Map();
      (hostedEvts || []).forEach(e => {
        eventMap.set(e.event_id, {
          ...e,
          assignment_role: 'Organizer / Host'
        });
      });

      (assignedEvts || []).forEach(a => {
        if (a.events && !eventMap.has(a.event_id)) {
          eventMap.set(a.event_id, {
            ...a.events,
            assignment_role: a.role || 'Assigned Staff'
          });
        }
      });

      setEvents(Array.from(eventMap.values()));
    } catch (err) {
      console.error('Failed to fetch faculty events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  if (!isOpen || !faculty) return null;

  const displayName = faculty.first_name ? `${faculty.first_name} ${faculty.last_name || ''}`.trim() : (faculty.username || 'Faculty Profile');
  const totalManaged = events.length;
  const activeEventsCount = events.filter(e => (e.status || e.event_status || '').toLowerCase() === 'active').length;
  const completedEventsCount = events.filter(e => (e.status || e.event_status || '').toLowerCase() === 'completed').length;

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(15, 23, 42, 0.6)', 
      backdropFilter: 'blur(4px)', 
      zIndex: 9999, 
      display: 'flex', 
      alignItems: 'center', 
      justify: 'center', 
      padding: '1.5rem' 
    }}>
      <div 
        className="glass-panel" 
        style={{ 
          width: '100%', 
          maxWidth: '650px', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--bg-secondary)', 
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
        
        {/* MODAL HEADER (Fixed) */}
        <div style={{ 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center', 
          padding: '1.5rem 2rem', 
          borderBottom: '1px solid var(--glass-border)',
          background: 'var(--bg-tertiary)'
        }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '1.35rem', fontWeight: '700' }}>
              {displayName}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Employee / User ID: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{faculty.employee_id || faculty.user_id || '--'}</strong>
            </span>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: '#f1f5f9', 
              border: 'none', 
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              cursor: 'pointer', 
              color: 'var(--text-secondary)' 
            }}>
            <X size={20} />
          </button>
        </div>

        {/* SCROLLABLE BODY AREA */}
        <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* FACULTY INFO GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#eff6ff', borderRadius: '8px', color: '#2563eb' }}>
                <Building size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Department</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{faculty.department || 'N/A'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#f3e8ff', borderRadius: '8px', color: '#9333ea' }}>
                <ShieldAlert size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>System Role</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{faculty.role || 'Faculty'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '8px', color: '#d97706' }}>
                <Mail size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Email Address</div>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0f172a', wordBreak: 'break-all' }}>{faculty.email_address || faculty.email || 'Not provided'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '8px', color: '#16a34a' }}>
                <Phone size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Phone / Mobile</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{faculty.mobile || faculty.phone_number || 'Not provided'}</div>
              </div>
            </div>
          </div>

          {/* FACULTY EVENT STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #dbeafe', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Managed Events</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1d4ed8' }}>{loadingEvents ? '--' : totalManaged}</div>
            </div>

            <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600', textTransform: 'uppercase' }}>Active Events</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#15803d' }}>{loadingEvents ? '--' : activeEventsCount}</div>
            </div>

            <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600', textTransform: 'uppercase' }}>Completed Events</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b45309' }}>{loadingEvents ? '--' : completedEventsCount}</div>
            </div>
          </div>

          {/* FACULTY MANAGED EVENTS TABLE */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Calendar size={18} color="#2563eb" />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                Events Managed & Assigned History
              </h4>
            </div>

            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#2563eb' }} />
                Loading faculty event management logs...
              </div>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                No events currently assigned or hosted by this faculty member.
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Event Name</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Role</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Date & Venue</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => {
                      const st = (ev.status || ev.event_status || 'Draft').toLowerCase();
                      return (
                        <tr key={ev.event_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#0f172a' }}>
                            {ev.event_name || ev.event_id}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                              {ev.assignment_role || 'Staff'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                            <div>{ev.start_date || '--'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{ev.venue || ev.location || '--'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ 
                              padding: '0.20rem 0.6rem', 
                              borderRadius: '999px', 
                              fontSize: '0.75rem', 
                              fontWeight: '700',
                              background: st === 'active' ? '#f0fdf4' : st === 'completed' ? '#eff6ff' : '#f8fafc',
                              color: st === 'active' ? '#16a34a' : st === 'completed' ? '#2563eb' : '#64748b',
                              textTransform: 'uppercase'
                            }}>
                              {ev.status || ev.event_status || 'Draft'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ padding: '0.5rem 1.5rem' }}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
