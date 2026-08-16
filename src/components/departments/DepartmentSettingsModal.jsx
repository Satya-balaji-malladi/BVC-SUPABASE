import React, { useState } from 'react';
import { X, Settings, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function DepartmentSettingsModal({ isOpen, onClose, departmentId, currentYears, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allowedYears, setAllowedYears] = useState(currentYears || [1, 2, 3, 4]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (allowedYears.length === 0) {
        throw new Error("You must select at least one year.");
      }

      const { error: updateError } = await supabase
        .from('departments')
        .update({ allowed_years: allowedYears })
        .eq('department_id', departmentId);

      if (updateError) throw updateError;
      
      onSuccess(allowedYears);
    } catch (err) {
      console.error("Error saving department settings:", err);
      setError(err.message || "Failed to update settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '400px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
            <Settings size={20} className="text-gradient" /> Department Settings
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form id="dept-settings-form" onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Allowed Student Years
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3, 4].map(year => (
                <label key={year} style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', 
                  padding: '0.75rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <input 
                    type="checkbox"
                    checked={allowedYears.includes(year)}
                    onChange={(e) => {
                      const newYears = e.target.checked 
                        ? [...allowedYears, year].sort()
                        : allowedYears.filter(y => y !== year);
                      setAllowedYears(newYears);
                    }}
                    style={{ accentColor: 'var(--primary)', width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                  />
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Year {year}</span>
                </label>
              ))}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="dept-settings-form"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? 'Saving...' : <><CheckCircle2 size={16} /> Save Changes</>}
          </button>
        </div>

      </div>
    </div>
  );
}
