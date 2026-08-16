import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { emailService } from '../../services/emailService';

export default function CreateFacultyModal({ isOpen, onClose, onFacultyCreated }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    department: 'CSE',
    role: 'Faculty',
    employee_id: ''
  });

  if (!isOpen) return null;

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user_id = `USR_${Date.now()}`;
      const password = generatePassword();
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          user_id: user_id,
          employee_id: formData.employee_id || `EMP_${Date.now().toString().slice(-6)}`,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email_address: formData.email_address,
          department: formData.department,
          role: formData.role,
          username: formData.email_address,
          password_hash: password, // In real app, this would be hashed
          status: 'Active'
        }]);
        
      if (error) throw error;
      
      // Trigger Apps Script to send credentials email
      emailService.sendInlineCredentials({
        email: formData.email_address,
        name: formData.first_name,
        password: password,
        eventName: 'BVC Event Attendance System'
      });

      onFacultyCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error creating faculty: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Add New Faculty</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="responsive-form-row">
            <div className="input-group">
              <label>First Name *</label>
              <input type="text" className="input-field" required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Last Name *</label>
              <input type="text" className="input-field" required value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
            </div>
          </div>

          <div className="input-group">
            <label>Email Address *</label>
            <input type="email" className="input-field" required value={formData.email_address} onChange={(e) => setFormData({...formData, email_address: e.target.value})} />
          </div>

          <div className="responsive-form-row">
            <div className="input-group">
              <label>Employee ID *</label>
              <input type="text" className="input-field" placeholder="e.g. EMP1024" required value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Role</label>
              <select className="input-field" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                <option value="Faculty">Faculty</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Department</label>
            <select className="input-field" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})}>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save & Send Invite
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
