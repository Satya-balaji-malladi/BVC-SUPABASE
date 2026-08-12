import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { emailService } from '../../services/emailService';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('Feedback');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    window.openFeedbackWidget = () => setIsOpen(true);
    return () => { delete window.openFeedbackWidget; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      // In a real app, you would also trigger the Apps Script endpoint for email notifications here.
      // E.g., await fetch('https://script.google.com/...', { method: 'POST', body: JSON.stringify({ type, description }) });
      
      const sessionStr = localStorage.getItem('custom_auth_session');
      const sessionData = sessionStr ? JSON.parse(sessionStr) : null;
      
      const { error } = await supabase
        .from('feedbacks')
        .insert([{
          type: type,
          description: description,
          user_id: sessionData?.user?.id || null,
          user_role: sessionData?.user?.role || 'Guest',
          status: 'Unsolved'
        }]);
        
      if (error) throw error;
      
      // Attempt to send email to developer asynchronously
      let role = 'Unknown Role';
      try { role = sessionData?.user?.role || role; } catch(e) {}
      
      emailService.sendFeedbackAlert({
        type: type,
        description: description,
        userRole: role
      });
      
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setDescription('');
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'rgba(37, 99, 235, 0.9)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'transform 0.2s',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquarePlus size={24} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '5.5rem',
          right: '1rem',
          width: 'calc(100vw - 2rem)',
          maxWidth: '320px',
          zIndex: 9999,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Report Issue</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>
            
            {success ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: '#22c55e' }}>
                <div style={{ marginBottom: '0.5rem' }}>✅ Submitted successfully!</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Thank you for your feedback.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Type</label>
                  <select 
                    className="input-field" 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="Feedback">General Feedback</option>
                    <option value="Problem/Bug">Problem / Bug</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Description</label>
                  <textarea 
                    className="input-field" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened..."
                    style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                    required
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  disabled={loading || !description.trim()}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {loading ? 'Submitting...' : 'Submit to Developer'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
