import React, { useState, useEffect } from 'react';
import { X, Building2, Users, Calendar, CheckCircle2, Loader2, User, BookOpen } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function ViewDepartmentModal({ isOpen, onClose, department }) {
  const [studentsCount, setStudentsCount] = useState(0);
  const [facultyCount, setFacultyCount] = useState(0);
  const [deptEvents, setDeptEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && department) {
      fetchDepartmentData();
    }
  }, [isOpen, department]);

  const fetchDepartmentData = async () => {
    setLoading(true);
    try {
      const code = department.department_code || department.department_id;
      const name = department.department_name;

      const [{ count: sCount }, { count: fCount }, { data: evts }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).or(`department_id.eq.${code},department.eq.${code}`),
        supabase.from('users').select('*', { count: 'exact', head: true }).or(`department.eq.${code},department.eq.${name}`).in('role', ['Faculty','Event Admin','HOD']),
        supabase.from('events').select('*')
      ]);

      setStudentsCount(sCount || 0);
      setFacultyCount(fCount || 0);

      const filteredEvents = (evts || []).filter(e => {
        const d = (e.departments || e.department || '').toLowerCase();
        return d.includes((code || '').toLowerCase()) || d.includes((name || '').toLowerCase());
      });

      setDeptEvents(filteredEvents);
    } catch (err) {
      console.error('Failed to load department modal details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !department) return null;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '800' }}>
                {department.department_code}
              </span>
              <h3 style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '1.35rem', fontWeight: '700' }}>
                {department.department_name}
              </h3>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '0.25rem', display: 'block' }}>
              Organizational Department Overview
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
          
          {/* DEPARTMENT HEAD & STATUS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#eff6ff', borderRadius: '8px', color: '#2563eb' }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Head of Department (HOD)</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{department.hod_name || 'Not Assigned'}</div>
                {department.hod_employee_id && <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{department.hod_employee_id}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '8px', color: '#16a34a' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Department Status</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: department.status === 'Active' ? '#16a34a' : '#ef4444' }}>
                  {department.status || 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* DEPARTMENT METRICS SUMMARY */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #dbeafe', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Enrolled Students</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1d4ed8' }}>{loading ? '--' : studentsCount}</div>
            </div>

            <div style={{ padding: '1rem', background: '#f3e8ff', borderRadius: '10px', border: '1px solid #e9d5ff', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: '600', textTransform: 'uppercase' }}>Faculty & Staff</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#7e22ce' }}>{loading ? '--' : facultyCount}</div>
            </div>

            <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600', textTransform: 'uppercase' }}>Department Events</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b45309' }}>{loading ? '--' : deptEvents.length}</div>
            </div>
          </div>

          {/* DEPARTMENT EVENTS TABLE */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Calendar size={18} color="#2563eb" />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                Department Events Log
              </h4>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#2563eb' }} />
                Loading department events...
              </div>
            ) : deptEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                No events currently associated with this department.
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Event Name</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Date & Venue</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '700' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptEvents.map(ev => {
                      const st = (ev.status || ev.event_status || 'Draft').toLowerCase();
                      return (
                        <tr key={ev.event_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#0f172a' }}>
                            {ev.event_name}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                            {ev.category || ev.event_category || 'General'}
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
