import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { User, Building, Hash, Phone, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import SessionService from '../../services/SessionService';

export default function CompleteProfile({ onComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [empId, setEmpId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedDeptCode, setSelectedDeptCode] = useState('');
  const [titleDesignation, setTitleDesignation] = useState('');

  const lookupDetailsByEmpId = async (targetId) => {
    if (!targetId || targetId.trim().length < 3) return;
    const cleanId = targetId.trim();

    try {
      // 1. Search students table
      const { data: stu } = await supabase
        .from('students')
        .select('*')
        .ilike('roll_number', cleanId)
        .limit(1)
        .maybeSingle();

      if (stu) {
        if (stu.student_name) setFullName(stu.student_name);
        if (stu.department_id) setSelectedDeptCode(stu.department_id);
        if (stu.phone_number) setPhoneNumber(stu.phone_number);
        setTitleDesignation('Student');
        return;
      }

      // 2. Search users table
      const { data: usr } = await supabase
        .from('users')
        .select('*')
        .or(`employee_id.ilike.${cleanId},username.ilike.${cleanId},user_id.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (usr) {
        const uName = `${usr.first_name || ''} ${usr.last_name || ''}`.trim() || usr.name;
        if (uName) setFullName(uName);
        if (usr.phone_number) setPhoneNumber(usr.phone_number);
        if (usr.department || usr.department_code) setSelectedDeptCode(usr.department || usr.department_code);
        if (usr.title_designation || usr.role) setTitleDesignation(usr.title_designation || usr.role);
        return;
      }

      // 3. Search faculty table
      const { data: fac } = await supabase
        .from('faculty')
        .select('*')
        .or(`employee_id.ilike.${cleanId},faculty_name.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (fac) {
        if (fac.faculty_name || fac.name) setFullName(fac.faculty_name || fac.name);
        if (fac.phone_number || fac.mobile) setPhoneNumber(fac.phone_number || fac.mobile);
        if (fac.department_id || fac.department) setSelectedDeptCode(fac.department_id || fac.department);
        if (fac.designation) setTitleDesignation(fac.designation);
        return;
      }
    } catch (err) {
      console.warn('Auto-lookup warning:', err);
    }
  };

  useEffect(() => {
    const cachedUser = SessionService.getUser();
    const userId = cachedUser?.id || cachedUser?.user_id;

    const loadProfileData = async () => {
      let initialEmpId = cachedUser?.employee_id || cachedUser?.emp_id || cachedUser?.username || cachedUser?.identifier || '';
      let initialName = cachedUser?.name || cachedUser?.first_name || '';
      let initialPhone = cachedUser?.phone_number || '';
      let initialDept = cachedUser?.department || cachedUser?.department_code || '';
      let initialTitle = cachedUser?.title_designation || cachedUser?.role || '';

      if (userId) {
        try {
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();

          if (dbUser) {
            if (dbUser.employee_id || dbUser.username || dbUser.user_id) {
              initialEmpId = dbUser.employee_id || dbUser.username || dbUser.user_id;
            }
            if (dbUser.first_name || dbUser.last_name) {
              initialName = `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim();
            }
            if (dbUser.phone_number) initialPhone = dbUser.phone_number;
            if (dbUser.department) initialDept = dbUser.department;
            if (dbUser.title_designation) initialTitle = dbUser.title_designation;
          }
        } catch (err) {
          console.error('Error fetching dbUser in CompleteProfile:', err);
        }
      }

      setEmpId(initialEmpId);
      if (initialName) setFullName(initialName);
      if (initialPhone) setPhoneNumber(initialPhone);
      if (initialDept) setSelectedDeptCode(initialDept);
      if (initialTitle) setTitleDesignation(initialTitle);

      // Also trigger auto lookup if ID is available
      if (initialEmpId) {
        lookupDetailsByEmpId(initialEmpId);
      }
    };

    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('department_id, department_code, department_name, short_name')
          .order('department_name', { ascending: true });
        
        if (!error && data && data.length > 0) {
          setDepartments(data);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };

    loadProfileData();
    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = SessionService.getUser();
      if (!user) throw new Error("No active user session found. Please login again.");

      const userId = user.id || user.user_id;

      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || fullName.trim();
      const lastName = nameParts.slice(1).join(' ') || '';

      // Update Supabase Users Table using exact schema columns
      const updatePayload = {
        first_name: firstName,
        last_name: lastName,
        employee_id: empId.trim(),
        phone_number: phoneNumber.trim(),
        department: selectedDeptCode,
        title_designation: titleDesignation.trim(),
        first_login: false
      };

      let { error: updateErr } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('user_id', userId);

      if (updateErr) {
        const { error: empErr } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('username', user.username || empId);
        if (empErr) throw empErr;
      }

      // Update Local Cached User Session
      const updatedUser = {
        ...user,
        name: fullName.trim(),
        first_name: fullName.trim(),
        employee_id: empId.trim(),
        phone_number: phoneNumber.trim(),
        department: selectedDeptCode,
        title_designation: titleDesignation.trim(),
        first_login: false
      };
      
      const token = SessionService.getToken();
      SessionService.setSession(token, updatedUser);

      window.dispatchEvent(new Event('auth_state_changed'));
      if (onComplete) onComplete();
      
      const normalizedRole = (updatedUser.role || '').replace(/\s+/g, '');
      if (normalizedRole === 'SuperAdmin') {
        navigate('/super-admin', { replace: true });
      } else if (normalizedRole === 'HOD' || normalizedRole === 'DepartmentAdmin') {
        navigate('/department-admin', { replace: true });
      } else {
        navigate('/select-event', { replace: true });
      }

    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-primary)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem 1rem' 
    }}>
      <div 
        className="glass-panel" 
        style={{ 
          width: '100%', 
          maxWidth: '520px', 
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '2rem 1.75rem', 
          borderRadius: '20px', 
          boxShadow: 'var(--shadow-lg)',
          border: '2px solid rgba(59, 130, 246, 0.2)',
          background: 'var(--bg-secondary)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '16px', 
            background: 'rgba(37, 99, 235, 0.1)', 
            color: 'var(--accent-blue)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1rem auto' 
          }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            First-Time Profile Setup
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Welcome to BVC EMS! Please complete your details to continue to your workspace.
          </p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--error)', 
            padding: '0.75rem 1rem', 
            borderRadius: '10px', 
            marginBottom: '1.5rem', 
            fontSize: '0.875rem',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Enter your full name"
                style={{ width: '100%', paddingLeft: '2.75rem', borderRadius: '12px', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {/* Employee / Roll / ID Number - Auto Fetched & Read Only */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Employee ID / Roll Number *
            </label>
            <div style={{ position: 'relative' }}>
              <Hash size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                value={empId}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmpId(val);
                  lookupDetailsByEmpId(val);
                }}
                className="input-field"
                placeholder="Enter Employee ID / Roll Number"
                style={{ width: '100%', paddingLeft: '2.75rem', borderRadius: '12px', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Phone Number *
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input-field"
                placeholder="10-digit mobile number"
                style={{ width: '100%', paddingLeft: '2.75rem', borderRadius: '12px', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {/* Department - Database Only Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Department *
            </label>
            <div style={{ position: 'relative' }}>
              <Building size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
              <select
                required
                value={selectedDeptCode}
                onChange={(e) => setSelectedDeptCode(e.target.value)}
                className="input-field"
                style={{ width: '100%', paddingLeft: '2.75rem', borderRadius: '12px', fontSize: '0.95rem', appearance: 'none', backgroundColor: 'var(--bg-primary)' }}
              >
                <option value="" disabled>Select Department</option>
                {departments.map((dept, idx) => {
                  const dName = dept.department_name || dept.name || dept.short_name || dept.department_code || dept.code || `Department ${idx + 1}`;
                  const dCode = dept.department_code || dept.code || dept.short_name || '';
                  return (
                    <option key={dept.department_id || dept.id || idx} value={dCode || dName}>
                      {dName}{dCode && dCode !== dName ? ` (${dCode})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Designation / Role */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Designation / Title *
            </label>
            <input
              type="text"
              required
              value={titleDesignation}
              onChange={(e) => setTitleDesignation(e.target.value)}
              className="input-field"
              placeholder="e.g. Faculty Coordinator / Assistant Professor / Principal / Guest"
              style={{ width: '100%', borderRadius: '12px', fontSize: '0.95rem' }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '0.9rem', 
              fontSize: '1rem', 
              fontWeight: '600',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Save & Continue
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
