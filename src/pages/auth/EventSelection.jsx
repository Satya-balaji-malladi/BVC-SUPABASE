import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Calendar, ChevronDown, Loader2, ArrowRight, MapPin, LogOut, CheckCircle2, Plus } from 'lucide-react';
import SessionService from '../../services/SessionService';
import AuthService from '../../services/AuthService';
import CreateEventModal from '../../components/widgets/CreateEventModal';

export default function EventSelection() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const cachedUser = SessionService.getUser();
    if (!cachedUser) {
      navigate('/login');
      return;
    }
    const role = (cachedUser.role || '').replace(/\s+/g, '');
    setUserRole(role);
    setUserName(cachedUser.name || cachedUser.username || 'User');
    
    fetchActiveEvents();
  }, [navigate]);

  const fetchActiveEvents = async () => {
    try {
      const cachedUser = SessionService.getUser();
      const userId = cachedUser?.user_id || cachedUser?.id;
      const role = (cachedUser?.role || '').replace(/\s+/g, '');
      
      // 1. Fetch assigned event IDs from event_assignments for this user
      let assignedEventIds = [];
      if (userId) {
        const { data: assignments, error: assignErr } = await supabase
          .from('event_assignments')
          .select('event_id')
          .eq('user_id', userId)
          .eq('deletion_flag', false);
        
        if (!assignErr && assignments) {
          assignedEventIds = assignments.map(a => a.event_id).filter(Boolean);
        }
      }

      let list = [];

      if (['SuperAdmin', 'Admin', 'SuperAdmin'].includes(role)) {
        // SuperAdmin / Admin can see all active events
        const { data } = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: true });
        list = data || [];
      } else {
        // Fetch events where user is organizer/coordinator_id OR explicitly assigned in event_assignments
        const queries = [];
        
        // Query A: Direct organizer or coordinator_id match
        if (userId) {
          queries.push(
            supabase
              .from('events')
              .select('*')
              .eq('organizer', userId)
              .order('start_date', { ascending: true })
          );
        }

        // Query B: Assigned via event_assignments
        if (assignedEventIds.length > 0) {
          queries.push(
            supabase
              .from('events')
              .select('*')
              .in('event_id', assignedEventIds)
              .order('start_date', { ascending: true })
          );
        }

        const results = await Promise.all(queries);
        const map = new Map();
        results.forEach(res => {
          if (res.data) {
            res.data.forEach(ev => map.set(ev.event_id, ev));
          }
        });
        list = Array.from(map.values());
      }

      setEvents(list);

      const savedId = localStorage.getItem('selected_event_id');
      if (savedId && list.some(e => String(e.event_id) === String(savedId))) {
        setSelectedEventId(String(savedId));
      } else if (list.length > 0) {
        setSelectedEventId(String(list[0].event_id));
      } else {
        setSelectedEventId('');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = (overrideEventId = null) => {
    const targetId = overrideEventId || selectedEventId;
    const selected = events.find(e => String(e.event_id) === String(targetId));
    if (!selected) return;

    localStorage.setItem('selected_event_id', selected.event_id);
    localStorage.setItem('selected_event_name', selected.event_name);
    
    const normalized = (userRole || '').replace(/\s+/g, '');
    if (['Coordinator', 'FacultyCoordinator', 'EventCoordinator', 'Student', 'Guest', 'STUDENT', 'GUEST', 'StudentCoordinator', 'GuestCoordinator'].includes(normalized)) {
      navigate('/coordinator');
    } else {
      if (selected.event_status === 'Draft') {
        navigate('/event-admin/events?setupEvent=true');
      } else {
        navigate('/event-admin');
      }
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
      </div>
    );
  }

  const selectedEvent = events.find(e => String(e.event_id) === String(selectedEventId));

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar */}
      <header style={{ 
        padding: '0.75rem 1.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQlFZ_2u0RaNZlfgwlsn7JNBCW34KxzENz6uT3fX7IuA&s=10" 
            alt="BVC Logo" 
            style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px' }} 
          />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>BVC EMS</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Attendance Portal</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{userName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: '500' }}>{userRole}</div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.4rem 0.85rem', 
              borderRadius: '8px', 
              border: '1px solid var(--glass-border)', 
              background: 'transparent',
              color: 'var(--error)',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', padding: '1rem', alignItems: 'center' }}>
        <div 
          className="glass-panel" 
          style={{ 
            width: '100%', 
            maxWidth: '520px', 
            margin: '0 auto',
            padding: '1.5rem', 
            borderRadius: '20px', 
            boxShadow: 'var(--shadow-lg)',
            border: '2px solid rgba(59, 130, 246, 0.2)',
            background: 'var(--bg-secondary)',
            textAlign: 'center'
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '14px', 
              background: 'rgba(37, 99, 235, 0.1)', 
              color: 'var(--accent-blue)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 0.75rem auto' 
            }}>
              <Calendar size={26} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              selecting event
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Choose an active event to access the main screen.
            </p>
          </div>

          {events.length === 0 ? (
            <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <p style={{ color: 'var(--error)', margin: 0, fontWeight: '500', fontSize: '0.9rem' }}>
                No active events available at this moment. Please check with your HOD or Super Admin.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Dropdown Box matching skeleton Δ icon */}
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Select Event
                </label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="input-field"
                    style={{ 
                      width: '100%', 
                      padding: '0.85rem 2.75rem 0.85rem 1rem', 
                      fontSize: '1rem', 
                      fontWeight: '600',
                      borderRadius: '12px',
                      border: '2px solid var(--accent-blue)',
                      appearance: 'none',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)'
                    }}
                  >
                    {events.map((evt) => (
                      <option key={evt.event_id} value={evt.event_id}>
                        {evt.event_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown 
                    size={22} 
                    style={{ 
                      position: 'absolute', 
                      right: '1rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--accent-blue)', 
                      pointerEvents: 'none' 
                    }} 
                  />
                </div>
              </div>

              {/* Clickable Selected Event Card */}
              {selectedEvent && (
                <div 
                  onClick={() => handleProceed()}
                  style={{ 
                    padding: '1rem 1.25rem', 
                    borderRadius: '12px', 
                    background: 'rgba(37, 99, 235, 0.04)', 
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.2)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {selectedEvent.event_name}
                    </span>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '20px', 
                      background: 'rgba(34, 197, 94, 0.15)', 
                      color: '#16a34a', 
                      fontSize: '0.75rem', 
                      fontWeight: '700' 
                    }}>
                      Active
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} color="var(--accent-blue)" />
                      <span>{new Date(selectedEvent.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    {selectedEvent.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={14} color="var(--accent-blue)" />
                        <span>{selectedEvent.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proceed to Main Screen Button - Always Prominent */}
              <button 
                onClick={() => handleProceed()}
                className="btn btn-primary"
                disabled={!selectedEventId}
                style={{ 
                  width: '100%', 
                  padding: '0.85rem', 
                  fontSize: '1rem', 
                  fontWeight: '600',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                }}
              >
                Proceed to Main Screen
                <ArrowRight size={18} />
              </button>

              {/* Faculty Self-Service Event Creation */}
              {['Faculty', 'EventAdmin', 'SuperAdmin', 'Admin', 'HOD', 'DepartmentAdmin'].includes((userRole || '').replace(/\s+/g, '')) && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn btn-secondary"
                    style={{ 
                      padding: '0.85rem', 
                      fontSize: '1rem', 
                      fontWeight: '600',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      border: '2px dashed var(--accent-blue)',
                      background: 'transparent',
                      color: 'var(--accent-blue)',
                      width: '100%'
                    }}
                  >
                    <Plus size={20} />
                    Create New Event
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <CreateEventModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={() => {
          setIsCreateModalOpen(false);
          fetchActiveEvents();
        }}
      />

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
