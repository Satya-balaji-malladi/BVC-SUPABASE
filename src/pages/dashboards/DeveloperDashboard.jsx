import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { MessageSquare, Bug, CheckCircle, Clock } from 'lucide-react';

export default function DeveloperDashboard() {
  const [activeTab, setActiveTab] = useState('problems'); // 'problems' or 'feedback'
  const [problemFilter, setProblemFilter] = useState('unsolved'); // 'unsolved' or 'solved'
  
  const [problems, setProblems] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Problems
      const { data: probData } = await supabase
        .from('problems')
        .select('*, users(name, role, email)')
        .order('created_at', { ascending: false });
      
      if (probData) setProblems(probData);

      // Fetch Feedbacks
      const { data: feedData } = await supabase
        .from('feedback')
        .select('*, users(name, role)')
        .order('created_at', { ascending: false });

      if (feedData) setFeedbacks(feedData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProblemStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'unsolved' ? 'solved' : 'unsolved';
      const { error } = await supabase
        .from('problems')
        .update({ 
          status: newStatus,
          solved_at: newStatus === 'solved' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setProblems(problems.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient">Developer Console</h1>
        <p>Monitor system feedbacks and resolve reported issues.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'problems' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('problems')}
        >
          <Bug size={18} /> Bugs & Problems
        </button>
        <button 
          className={`btn ${activeTab === 'feedback' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('feedback')}
        >
          <MessageSquare size={18} /> User Feedbacks
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading data...</p>
      ) : activeTab === 'problems' ? (
        <div>
          {/* Problem Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button 
              style={{ background: 'transparent', border: 'none', color: problemFilter === 'unsolved' ? 'var(--error)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: problemFilter === 'unsolved' ? '600' : '400', padding: '0.5rem 0', borderBottom: problemFilter === 'unsolved' ? '2px solid var(--error)' : 'none' }}
              onClick={() => setProblemFilter('unsolved')}
            >
              Unsolved ({problems.filter(p => p.status === 'unsolved').length})
            </button>
            <button 
              style={{ background: 'transparent', border: 'none', color: problemFilter === 'solved' ? 'var(--success)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: problemFilter === 'solved' ? '600' : '400', padding: '0.5rem 0', borderBottom: problemFilter === 'solved' ? '2px solid var(--success)' : 'none' }}
              onClick={() => setProblemFilter('solved')}
            >
              Solved ({problems.filter(p => p.status === 'solved').length})
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {problems.filter(p => p.status === problemFilter).map(problem => (
              <div key={problem.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: '500' }}>{problem.users?.name || 'Unknown User'}</span>
                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: '999px', color: 'var(--text-secondary)' }}>
                      {problem.users?.role || 'User'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(problem.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-primary)' }}>{problem.description}</p>
                </div>
                
                <button 
                  className="btn" 
                  onClick={() => toggleProblemStatus(problem.id, problem.status)}
                  style={{
                    background: problem.status === 'unsolved' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)',
                    color: problem.status === 'unsolved' ? 'var(--success)' : 'var(--text-secondary)',
                    border: `1px solid ${problem.status === 'unsolved' ? 'var(--success)' : 'var(--glass-border)'}`,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {problem.status === 'unsolved' ? <><CheckCircle size={16} /> Mark as Solved</> : <><Clock size={16} /> Reopen Issue</>}
                </button>
              </div>
            ))}
            
            {problems.filter(p => p.status === problemFilter).length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No {problemFilter} problems found.</p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {feedbacks.map(fb => (
            <div key={fb.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--accent-purple)', fontWeight: '500' }}>{fb.users?.name || 'Unknown User'}</span>
                <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: '999px', color: 'var(--text-secondary)' }}>
                  {fb.users?.role || 'User'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(fb.created_at).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>{fb.description}</p>
            </div>
          ))}
          
          {feedbacks.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>No feedbacks received yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
