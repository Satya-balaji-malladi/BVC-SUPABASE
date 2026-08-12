import React, { useState } from 'react';
import { X, Save, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (formData.new_password !== formData.confirm_password) {
      setErrorMsg('New passwords do not match');
      return;
    }

    if (formData.new_password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // In Supabase, the updateUser endpoint allows updating the password directly
      // provided the user is logged in (session is active).
      const { error } = await supabase.auth.updateUser({
        password: formData.new_password
      });
      
      if (error) throw error;
      
      setSuccessMsg('Password updated successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <KeyRound size={20} color="var(--accent-blue)" /> Change Password
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        
        {errorMsg && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {successMsg}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Note: Current Password is not always strictly required by Supabase updateUser API if the session is active, but we can include it for UI consistency */}
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label>New Password</label>
            <input 
              type="password" 
              className="input-field" 
              required 
              value={formData.new_password} 
              onChange={(e) => setFormData({...formData, new_password: e.target.value})} 
            />
          </div>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label>Confirm New Password</label>
            <input 
              type="password" 
              className="input-field" 
              required 
              value={formData.confirm_password} 
              onChange={(e) => setFormData({...formData, confirm_password: e.target.value})} 
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Update Password
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
