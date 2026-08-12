import React, { useState, useEffect } from 'react';
import { X, User, BookOpen, Building, Mail, Phone, Hash, Calendar, CheckCircle2, XCircle, Clock, Loader2, Award } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function ViewStudentModal({ isOpen, onClose, student }) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (isOpen && student?.roll_number) {
      fetchStudentEvents(student.roll_number);
    }
  }, [isOpen, student]);

  const fetchStudentEvents = async (rollNumber) => {
    setLoadingEvents(true);
    try {
      // Fetch participant records along with joined events data
      const { data, error } = await supabase
        .from('event_participants')
        .select('*, events(*)')
        .eq('roll_number', rollNumber);

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load student events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  if (!isOpen || !student) return null;

  const displayName = student.student_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student Profile';
  const totalEvents = events.length;
  const presentEvents = events.filter(e => e.attendance_status === 'Present').length;
  const attendanceRate = totalEvents > 0 ? Math.round((presentEvents / totalEvents) * 100) : 0;

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
              Roll Number: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{student.roll_number}</strong>
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
              justifyContent: 'center',
              cursor: 'pointer', 
              color: 'var(--text-secondary)' 
            }}>
            <X size={20} />
          </button>
        </div>

        {/* SCROLLABLE BODY AREA */}
        <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* STUDENT INFO GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#eff6ff', borderRadius: '8px', color: '#2563eb' }}>
                <BookOpen size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Department & Year</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>
                  {student.department_id || student.department || '--'} • Year {student.year || '--'} {student.section ? `(Sec ${student.section})` : ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '8px', color: '#16a34a' }}>
                <Building size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>College</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{student.college || student.college_name || 'BVC Engineering College'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '8px', color: '#d97706' }}>
                <Mail size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Email Address</div>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0f172a', wordBreak: 'break-all' }}>{student.email_address || 'Not provided'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#f3e8ff', borderRadius: '8px', color: '#9333ea' }}>
                <Phone size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Mobile Number</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{student.phone_number || student.mobile || 'Not provided'}</div>
              </div>
            </div>
          </div>

          {/* PARTICIPATION STATS BADGES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #dbeafe', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Registered Events</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1d4ed8' }}>{loadingEvents ? '--' : totalEvents}</div>
            </div>

            <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600', textTransform: 'uppercase' }}>Present (Attended)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#15803d' }}>{loadingEvents ? '--' : presentEvents}</div>
            </div>

            <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600', textTransform: 'uppercase' }}>Attendance Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b45309' }}>{loadingEvents ? '--' : `${attendanceRate}%`}</div>
            </div>
          </div>

          {/* EVENTS PARTICIPATED LIST */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Calendar size={18} color="#2563eb" />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                Events Participated History
              </h4>
            </div>

            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#2563eb' }} />
                Loading event participation history...
              </div>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                No registered events found for this student.
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Event Name</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Date & Venue</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Reg Status</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(item => {
                      const ev = item.events || {};
                      const isPresent = item.attendance_status === 'Present';
                      return (
                        <tr key={item.participant_id || item.event_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#0f172a' }}>
                            {ev.event_name || item.event_id || '--'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                            <div>{ev.start_date || '--'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{ev.venue || ev.location || '--'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                              {item.registration_status || 'Registered'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              background: isPresent ? '#f0fdf4' : '#fef2f2', 
                              color: isPresent ? '#16a34a' : '#ef4444', 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '999px', 
                              fontSize: '0.75rem', 
                              fontWeight: '700' 
                            }}>
                              {isPresent ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                              {item.attendance_status || 'Absent'}
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
