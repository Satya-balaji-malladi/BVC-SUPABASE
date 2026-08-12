import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function CreateDepartmentModal({ isOpen, onClose, onDepartmentCreated }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    department_id: '',
    department_name: '',
    hod_id: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('departments')
        .insert([{
          department_id: formData.department_id,
          department_name: formData.department_name,
          hod_id: formData.hod_id || null,
        }]);
        
      if (error) throw error;
      
      if (onDepartmentCreated) {
        onDepartmentCreated();
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error creating department: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Create Department</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Department Code (ID) *</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. CSE, ECE"
              required 
              value={formData.department_id} 
              onChange={(e) => setFormData({...formData, department_id: e.target.value})} 
            />
          </div>
          
          <div className="input-group">
            <label>Department Name *</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Computer Science and Engineering"
              required 
              value={formData.department_name} 
              onChange={(e) => setFormData({...formData, department_name: e.target.value})} 
            />
          </div>

          <div className="input-group">
            <label>HOD ID (Optional)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. USR_12345"
              value={formData.hod_id} 
              onChange={(e) => setFormData({...formData, hod_id: e.target.value})} 
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Department
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
