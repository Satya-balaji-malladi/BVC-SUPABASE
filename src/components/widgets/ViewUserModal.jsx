import React from 'react';
import { X, User, Briefcase, Building, Mail, ShieldAlert } from 'lucide-react';

export default function ViewUserModal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-blue)', fontSize: '1.5rem' }}>{user.first_name} {user.last_name}</h3>
            <span style={{ 
              display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
              background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)'
            }}>
              System User
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Employee / User ID</div>
              <div style={{ fontWeight: '500', fontFamily: 'monospace', fontSize: '1.1rem' }}>{user.employee_id || user.user_id}</div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                <Building size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Department</div>
                <div style={{ fontWeight: '500' }}>{user.department || 'N/A'}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>System Role</div>
                <div style={{ fontWeight: '500' }}>{user.role}</div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email / Username</div>
              <div style={{ fontWeight: '500' }}>{user.email_address || user.username || 'Not provided'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
