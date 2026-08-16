import React, { useState, useEffect } from 'react';
import { X, Building2, UserCircle2, UserPlus, CheckCircle2, Edit } from 'lucide-react';
import DepartmentService from '../../services/DepartmentService';

export default function EditDepartmentModal({ department, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  
  // Form State initialized with department data
  const [departmentData, setDepartmentData] = useState({
    name: department.department_name || '',
    code: department.department_code || '',
    allowedYears: department.allowed_years || [1, 2, 3, 4]
  });
  
  const [hodOption, setHodOption] = useState('none'); // 'none' | 'existing' | 'new'
  const [hodData, setHodData] = useState({
    id: '', 
    name: '',
    employeeId: '',
    email: ''
  });

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    const result = await DepartmentService.getFacultyList();
    if (result.success) {
      setFacultyList(result.faculty || []);
    }
  };

  const validate = () => {
    if (!departmentData.name.trim()) return "Department Name is required.";
    if (!departmentData.code.trim()) return "Department Code is required.";
    
    if (hodOption === 'existing' && !hodData.id) {
      return "Please select an existing faculty member.";
    }
    
    if (hodOption === 'new') {
      if (!hodData.name.trim()) return "HOD Name is required.";
      if (!hodData.employeeId.trim()) return "HOD Employee ID is required.";
      if (!hodData.email.trim()) return "HOD Email is required.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(hodData.email)) return "Please enter a valid email address.";
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    
    let finalHodData = { ...hodData };
    if (hodOption === 'existing') {
       const selectedUser = facultyList.find(f => f.user_id === hodData.id);
       if (selectedUser) {
           finalHodData.name = `${selectedUser.first_name} ${selectedUser.last_name}`.trim();
           finalHodData.employeeId = selectedUser.employee_id;
       }
    }

    const result = await DepartmentService.updateDepartment(
      department.department_id, 
      departmentData, 
      finalHodData, 
      hodOption, 
      department.hod_employee_id
    );
    
    if (result.success) {
      onSuccess(result.department);
    } else {
      const errorMessage = result.error || "An error occurred while updating the department.";
      setError(errorMessage);
      window.alert(errorMessage);
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
        width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
            <Edit size={24} className="text-gradient" /> Edit Department
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          
          {error && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form id="edit-dept-form" onSubmit={handleSubmit}>
            
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Department Details</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Department Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={departmentData.name}
                  onChange={e => setDepartmentData({...departmentData, name: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Department Code *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={departmentData.code}
                  onChange={e => setDepartmentData({...departmentData, code: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Allowed Student Years *</label>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4].map(year => (
                  <label key={year} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={departmentData.allowedYears.includes(year)}
                      onChange={(e) => {
                        const newYears = e.target.checked 
                          ? [...departmentData.allowedYears, year].sort()
                          : departmentData.allowedYears.filter(y => y !== year);
                        setDepartmentData({...departmentData, allowedYears: newYears});
                      }}
                      style={{ accentColor: 'var(--primary)', width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                    />
                    Year {year}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Current HOD</h4>
              {department.hod_name ? (
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {department.hod_name} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>({department.hod_employee_id})</span>
                </p>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>No HOD currently assigned.</p>
              )}
            </div>

            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Reassign Head of Department (HOD)
            </h3>
            
            {/* HOD Options Toggle */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div 
                onClick={() => setHodOption('none')}
                style={{ 
                  flex: '1 1 auto', padding: '0.75rem', border: `1px solid ${hodOption === 'none' ? 'var(--text-primary)' : 'var(--glass-border)'}`, 
                  background: hodOption === 'none' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Keep Current</div>
                </div>
                {hodOption === 'none' && <CheckCircle2 size={16} color="var(--text-primary)" style={{ marginLeft: 'auto' }} />}
              </div>

              <div 
                onClick={() => setHodOption('existing')}
                style={{ 
                  flex: '1 1 auto', padding: '0.75rem', border: `1px solid ${hodOption === 'existing' ? '#3b82f6' : 'var(--glass-border)'}`, 
                  background: hodOption === 'existing' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', color: hodOption === 'existing' ? '#3b82f6' : 'var(--text-primary)' }}>Assign Faculty</div>
                </div>
                {hodOption === 'existing' && <CheckCircle2 size={16} color="#3b82f6" style={{ marginLeft: 'auto' }} />}
              </div>
              
              <div 
                onClick={() => setHodOption('new')}
                style={{ 
                  flex: '1 1 auto', padding: '0.75rem', border: `1px solid ${hodOption === 'new' ? '#10b981' : 'var(--glass-border)'}`, 
                  background: hodOption === 'new' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', color: hodOption === 'new' ? '#10b981' : 'var(--text-primary)' }}>Create New</div>
                </div>
                {hodOption === 'new' && <CheckCircle2 size={16} color="#10b981" style={{ marginLeft: 'auto' }} />}
              </div>
            </div>

            {/* HOD Fields */}
            {hodOption !== 'none' && (
              <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                
                {hodOption === 'existing' ? (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Select HOD from Faculty *</label>
                    <select 
                      className="input-field" 
                      value={hodData.id}
                      onChange={e => setHodData({...hodData, id: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', appearance: 'auto' }}
                    >
                      <option value="">-- Select Faculty --</option>
                      {facultyList.map(f => (
                        <option key={f.user_id} value={f.user_id}>
                          {f.first_name} {f.last_name} — {f.employee_id} ({f.email_address})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>HOD Full Name *</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Dr. Ravi Kumar" 
                        value={hodData.name}
                        onChange={e => setHodData({...hodData, name: e.target.value})}
                        style={{ width: '100%', padding: '0.75rem' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Employee ID *</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. EMP1024" 
                          value={hodData.employeeId}
                          onChange={e => setHodData({...hodData, employeeId: e.target.value})}
                          style={{ width: '100%', padding: '0.75rem', textTransform: 'uppercase' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email Address *</label>
                        <input 
                          type="email" 
                          className="input-field" 
                          placeholder="e.g. ravi@bvc.edu.in" 
                          value={hodData.email}
                          onChange={e => setHodData({...hodData, email: e.target.value})}
                          style={{ width: '100%', padding: '0.75rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
            form="edit-dept-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
