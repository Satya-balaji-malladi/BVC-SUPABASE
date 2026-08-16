import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Edit } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function EditStudentModal({ isOpen, onClose, onSuccess, userRole, userDepartment, student }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    roll_number: '',
    student_name: '',
    email_address: '',
    phone_number: '',
    department_id: '',
    branch_id: '',
    section: '',
    year: '',
    gender: '',
    college: 'BVC Engineering College'
  });

  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen, userDepartment]);

  useEffect(() => {
    if (student) {
      setFormData({
        roll_number: student.roll_number || '',
        student_name: student.student_name || '',
        email_address: student.email_address || '',
        phone_number: student.phone_number || '',
        department_id: student.department_id || '',
        branch_id: student.branch_id || '',
        section: student.section || '',
        year: student.year || '',
        gender: student.gender || '',
        college: student.college || 'BVC Engineering College'
      });
    }
  }, [student]);

  const fetchDropdownData = async () => {
    try {
      const { data: deps } = await supabase.from('departments').select('*');
      if (deps) {
        setDepartments(deps);
        if (userDepartment && !student?.department_id) {
          const matched = deps.find(d => d.department_code === userDepartment || d.department_name === userDepartment || d.department_id === userDepartment);
          if (matched) {
            setFormData(prev => ({ ...prev, department_id: matched.department_id }));
          }
        }
      }
      
      const { data: brs } = await supabase.from('branches').select('*');
      if (brs) setBranches(brs);

      const { data: secs } = await supabase.from('sections').select('*');
      if (secs) setSections(secs);
    } catch (e) {
      console.warn('Failed to fetch dropdown data', e);
    }
  };

  if (!isOpen || !student) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.roll_number || !formData.student_name || !formData.department_id || !formData.year) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const cleanRoll = formData.roll_number.trim().toUpperCase();

      // Check if another student already has this roll number
      if (cleanRoll !== student.roll_number) {
        const { data: existing } = await supabase
          .from('students')
          .select('roll_number')
          .eq('roll_number', cleanRoll)
          .single();

        if (existing) {
          setError(`Student with roll number ${cleanRoll} already exists.`);
          setLoading(false);
          return;
        }
      }

      const { data, error: updateErr } = await supabase
        .from('students')
        .update({
          roll_number: cleanRoll,
          student_name: formData.student_name.trim(),
          email_address: formData.email_address.trim(),
          phone_number: formData.phone_number.trim(),
          department_id: formData.department_id,
          branch_id: formData.branch_id || null,
          section: formData.section,
          year: parseInt(formData.year) || 1,
          gender: formData.gender,
          college: formData.college
        })
        .eq('student_id', student.student_id)
        .select();

      if (updateErr) throw updateErr;

      onSuccess(data[0]);
    } catch (err) {
      console.error("Error updating student:", err);
      setError(err.message || "Failed to update student. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isHOD = (userRole || '').replace(/\s+/g, '').toUpperCase() === 'HOD';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        background: '#fff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', color: '#0f172a' }}>
            <Edit size={24} color="#3b82f6" /> Edit Student
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {error && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form id="edit-student-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="responsive-form-row">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Roll Number *</label>
                <input required type="text" name="roll_number" className="input-field" placeholder="e.g. 20B81A0501" value={formData.roll_number} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Full Name *</label>
                <input required type="text" name="student_name" className="input-field" placeholder="e.g. Ravi Kumar" value={formData.student_name} onChange={handleChange} style={{ width: '100%', padding: '0.75rem' }} />
              </div>
            </div>

            <div className="responsive-form-row">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Email Address</label>
                <input type="email" name="email_address" className="input-field" placeholder="e.g. ravi@bvc.edu" value={formData.email_address} onChange={handleChange} style={{ width: '100%', padding: '0.75rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Phone Number</label>
                <input type="text" name="phone_number" className="input-field" placeholder="e.g. 9876543210" value={formData.phone_number} onChange={handleChange} style={{ width: '100%', padding: '0.75rem' }} />
              </div>
            </div>

            <div className="responsive-form-row">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Department *</label>
                <select required name="department_id" className="input-field" value={formData.department_id} onChange={handleChange} style={{ width: '100%', padding: '0.75rem' }} disabled={isHOD && userDepartment}>
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name || d.department_code || d.department_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Branch</label>
                <select name="branch_id" className="input-field" value={formData.branch_id} onChange={handleChange} style={{ width: '100%', padding: '0.75rem' }}>
                  <option value="">Select Branch</option>
                  {branches.filter(b => {
                    if (!formData.department_id) return true;
                    return b.department_id === formData.department_id;
                  }).map(b => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.branch_name || b.branch_code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Year *</label>
                <select required name="year" className="input-field" value={formData.year} onChange={handleChange} style={{ width: '100%', padding: '0.75rem' }}>
                  <option value="">Select</option>
                  {(() => {
                    const selectedDept = departments.find(d => d.department_id === formData.department_id);
                    const allowedYears = selectedDept?.allowed_years || [1, 2, 3, 4];
                    return allowedYears.sort((a, b) => a - b).map(y => (
                      <option key={y} value={y}>{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year</option>
                    ));
                  })()}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Section</label>
                <select name="section" className="input-field" value={formData.section} onChange={handleChange} style={{ width: '100%', padding: '0.75rem' }}>
                  <option value="">Select</option>
                  {(() => {
                    let filtered = sections;
                    if (formData.branch_id) {
                      filtered = sections.filter(s => s.branch_id === formData.branch_id);
                    }
                    
                    if (filtered.length === 0) {
                      return <option value="" disabled>No sections created yet</option>;
                    }
                    
                    return filtered.map(s => (
                      <option key={s.section_id} value={s.section_code || s.section_name.substring(0,5)}>
                        {s.section_name} {s.branch_code ? `(${s.branch_code})` : ''}
                      </option>
                    ));
                  })()}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>Gender</label>
                <select name="gender" className="input-field" value={formData.gender} onChange={handleChange} style={{ width: '100%', padding: '0.75rem' }}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', background: '#fff' }}>
            Cancel
          </button>
          <button type="submit" form="edit-student-form" disabled={loading} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
