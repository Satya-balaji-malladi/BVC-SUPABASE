import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Bug, CheckCircle, Search, Loader2, MessageSquarePlus } from 'lucide-react';

export default function DeveloperModule() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, Unsolved, Solved
  const [typeFilter, setTypeFilter] = useState('All'); // All, Feedback, Problem/Bug

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback for missing table during dev
        console.warn('Could not fetch feedbacks, loading mock data');
        setTickets([
          { id: 1, type: 'Problem/Bug', description: 'The print button on the reports page is unresponsive.', status: 'Unsolved', created_at: new Date().toISOString(), user_role: 'Event Admin' },
          { id: 2, type: 'Feedback', description: 'Love the new dark mode design!', status: 'Solved', created_at: new Date().toISOString(), user_role: 'Student' }
        ]);
        return;
      }
      setTickets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Solved' ? 'Unsolved' : 'Solved';
    
    // Optimistic update
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    try {
      await supabase.from('feedbacks').update({ status: newStatus }).eq('id', id);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter !== 'All' && t.status !== filter) return false;
    if (typeFilter !== 'All' && t.type !== typeFilter) return false;
    return true;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>Developer Control Center</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage user feedback and application bugs</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <select className="input-field" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '200px' }}>
          <option value="All">All Statuses</option>
          <option value="Unsolved">Unsolved Issues</option>
          <option value="Solved">Solved Issues</option>
        </select>
        <select className="input-field" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: '200px' }}>
          <option value="All">All Types</option>
          <option value="Problem/Bug">Bugs & Problems</option>
          <option value="Feedback">General Feedbacks</option>
        </select>
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>Type</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>Description</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>Reported By</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>Status</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 className="animate-spin" size={24} color="#3b82f6" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No tickets found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        color: ticket.type === 'Problem/Bug' ? '#ef4444' : '#3b82f6', 
                        fontWeight: '600', fontSize: '0.875rem' 
                      }}>
                        {ticket.type === 'Problem/Bug' ? <Bug size={16} /> : <MessageSquarePlus size={16} />}
                        {ticket.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '400px' }}>
                      <div style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>{ticket.description}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {new Date(ticket.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{ticket.user_role || 'Guest'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: ticket.status === 'Solved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: ticket.status === 'Solved' ? '#22c55e' : '#ef4444'
                      }}>
                        {ticket.status || 'Unsolved'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => toggleStatus(ticket.id, ticket.status)}
                        className={`btn ${ticket.status === 'Solved' ? 'btn-secondary' : 'btn-primary'}`} 
                        style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <CheckCircle size={16} />
                        {ticket.status === 'Solved' ? 'Mark Unsolved' : 'Mark Solved'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
