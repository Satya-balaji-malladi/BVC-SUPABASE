import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function CreateUserModal({ isOpen, onClose, onUserCreated, isSuperAdmin, isHOD, userDepartment }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email_address: '',
    department: '',
    role: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      // Set defaults based on role
      if (isHOD && userDepartment) {
        setFormData(prev => ({ ...prev, department: userDepartment, role: 'Coordinator' }));
      }
    }
  }, [isOpen, isHOD, userDepartment]);

  const fetchDepartments = async () => {
    try {
      const { data } = await supabase.from('departments').select('department_name, department_code');
      if (data) setDepartments(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 1. Basic validation
      if (!formData.employee_id || !formData.email_address || !formData.role) {
        throw new Error('Please fill in all required fields.');
      }

      // Security check: HODs cannot create Super Admins or other HODs (simplified UI guard, real guard should be RLS/RPC)
      if (isHOD && (formData.role === 'Super Admin' || formData.role === 'HOD' || formData.role === 'Department Admin')) {
        throw new Error('You do not have permission to create this role.');
      }

      // 2. Duplicate check
      const { data: existingUser } = await supabase
        .from('users')
        .select('employee_id')
        .or(`employee_id.eq.${formData.employee_id},email_address.eq.${formData.email_address}`)
        .maybeSingle();
        
      if (existingUser) {
        throw new Error('A user with this Employee ID or Email already exists.');
      }

      // 3. Insert new user
      const user_id = `USR_${Date.now()}`;
      
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          user_id: user_id,
          employee_id: formData.employee_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email_address: formData.email_address,
          department: formData.department,
          role: formData.role,
          username: formData.email_address,
          status: 'Active',
          first_login: true // Forces OTP flow on first login!
        }]);
        
      if (insertError) throw insertError;

      onUserCreated();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while creating the user.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleOptions = () => {
    if (isSuperAdmin) {
      return [
        <option key="Event Admin" value="Event Admin">Event Admin</option>,
        <option key="Coordinator" value="Coordinator">Coordinator</option>,
        <option key="HOD" value="HOD">Head of Department (HOD)</option>,
        <option key="Super Admin" value="Super Admin">Super Admin</option>,
        <option key="Faculty" value="Faculty">Faculty</option>
      ];
    } else if (isHOD) {
      return [
        <option key="Coordinator" value="Coordinator">Coordinator</option>,
        <option key="Event Admin" value="Event Admin">Event Admin</option>,
        <option key="Faculty" value="Faculty">Faculty</option>
      ];
    }
    return [];
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
             <UserPlus size={20} color="var(--accent-blue)" /> Create System User
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="responsive-form-row">
            <div className="input-group">
              <label>Employee ID *</label>
              <input type="text" className="input-field" required value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} placeholder="e.g. EMP1234" />
            </div>
            <div className="input-group">
              <label>Email Address *</label>
              <input type="email" className="input-field" required value={formData.email_address} onChange={(e) => setFormData({...formData, email_address: e.target.value})} placeholder="email@bvc.edu.in" />
            </div>
          </div>

          <div className="responsive-form-row">
            <div className="input-group">
              <label>First Name</label>
              <input type="text" className="input-field" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Last Name</label>
              <input type="text" className="input-field" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
            </div>
          </div>

          <div className="responsive-form-row">
            <div className="input-group">
              <label>Role *</label>
              <select className="input-field" required value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                <option value="">Select Role</option>
                {getRoleOptions()}
              </select>
            </div>
            <div className="input-group">
              <label>Department *</label>
              <select className="input-field" required value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} disabled={isHOD}>
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d.department_code} value={d.department_code}>{d.department_name} ({d.department_code})</option>
                ))}
                {!departments.length && <option value="CSE">CSE</option>}
              </select>
            </div>
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>Note:</strong> New users will be forced to verify their email via OTP and set a password on their first login.
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Create User
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
