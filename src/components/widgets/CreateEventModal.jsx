import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import InlineCoordinatorModal from './InlineCoordinatorModal';
import SessionService from '../../services/SessionService';

const DEPTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML'];
const YEARS = ['1', '2', '3', '4'];

const defaultForm = {
  // Step 1
  event_name: '',
  description: '',
  participant_eligibility: 'bvc_only', // 'bvc_only' | 'all_colleges'
  coordinator_id: '',
  attendance_type: 'Fixed',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  venue: '',
  departments: [],
  target_years: [],
  capacity: '',
  access_restriction_type: 'ALL_COORDINATORS',
  allow_spot_registration: 'Yes',
  status: 'Draft',
  // Step 2
  enable_registration: false,
  registration_open: '',
  registration_close: '',
  maximum_seats: '',
  allow_spot_reg_form: 'Yes',
  registration_fields: [],
  terms: '',
};

export default function CreateEventModal({ isOpen, onClose, onEventCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [coordinators, setCoordinators] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [deptOpen, setDeptOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const deptRef = useRef(null);
  const yearRef = useRef(null);
  
  // Inline Coordinator Modal State
  const [showInlineModal, setShowInlineModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      
      const currentUser = SessionService.getUser();
      const currentRole = (currentUser?.role || '').replace(/\s+/g, '');
      const shouldDefaultCoord = ['Faculty', 'EventAdmin', 'HOD', 'DepartmentAdmin'].includes(currentRole);
      
      setForm({
        ...defaultForm,
        coordinator_id: shouldDefaultCoord && currentUser?.user_id ? currentUser.user_id : ''
      });
      
      setError('');
      loadCoordinators();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClick = (e) => {
      if (deptRef.current && !deptRef.current.contains(e.target)) setDeptOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadCoordinators = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, employee_id, role, department')
        .in('role', ['Event Admin', 'Faculty', 'SuperAdmin', 'STUDENT', 'GUEST', 'Student Coordinator', 'Guest Coordinator', 'Coordinator', 'Faculty Coordinator', 'Event Coordinator'])
        .eq('status', 'Active')
        .order('first_name');
      setCoordinators(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleDept = (d) => {
    setForm(f => ({
      ...f,
      departments: f.departments.includes(d) ? f.departments.filter(x => x !== d) : [...f.departments, d]
    }));
  };
  const toggleYear = (y) => {
    setForm(f => ({
      ...f,
      target_years: f.target_years.includes(y) ? f.target_years.filter(x => x !== y) : [...f.target_years, y]
    }));
  };

  const filteredDepts = DEPTS.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()));

  const addCustomField = () => {
    setForm(f => ({ ...f, registration_fields: [...f.registration_fields, { name: '', type: 'text', required: false }] }));
  };
  const updateField = (i, key, val) => {
    setForm(f => {
      const fields = [...f.registration_fields];
      fields[i] = { ...fields[i], [key]: val };
      return { ...f, registration_fields: fields };
    });
  };
  const removeField = (i) => {
    setForm(f => ({ ...f, registration_fields: f.registration_fields.filter((_, idx) => idx !== i) }));
  };

  const validateStep1 = () => {
    if (!form.event_name.trim()) return 'Event Name is required.';
    if (!form.coordinator_id) return 'Please assign an Event Admin / Coordinator.';
    if (!form.start_date) return 'Start Date is required.';
    if (!form.end_date) return 'End Date is required.';
    if (!form.start_time) return 'Start Time is required.';
    if (!form.end_time) return 'End Time is required.';
    if (!form.venue.trim()) return 'Venue is required.';
    if (form.departments.length === 0) return 'At least one Department is required.';
    return null;
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    setStep(s => s + 1);
  };

  const handleCreateCoordinator = async () => {
    if (!newCoordForm.first_name || !newCoordForm.email_address || !newCoordForm.department) {
      setError('First Name, Email, and Department are required.');
      return;
    }
    setSavingCoord(true);
    setError('');
    try {
      const userId = `U-${Date.now()}`;
      const empId = newCoordForm.employee_id || `EMP-${Date.now().toString().slice(-6)}`;
      const defaultPassword = 'Bvc@123';
      
      const payload = {
        user_id: userId,
        username: newCoordForm.email_address.split('@')[0] + Math.floor(Math.random() * 100),
        email_address: newCoordForm.email_address,
        first_name: newCoordForm.first_name,
        last_name: newCoordForm.last_name,
        department: newCoordForm.department,
        employee_id: empId,
        role: 'Coordinator',
        password_hash: defaultPassword,
        salt: 'temp_salt',
        status: 'Active'
      };

      const { error: dbError } = await supabase.from('users').insert([payload]);
      if (dbError) throw dbError;

      // also insert to faculty
      await supabase.from('faculty').insert([{
        faculty_id: `F-${Date.now()}`,
        employee_id: empId,
        user_id: userId,
        faculty_name: `${newCoordForm.first_name} ${newCoordForm.last_name}`.trim(),
        designation: 'Event Coordinator',
        department_id: newCoordForm.department,
        email: newCoordForm.email_address
      }]);

      await loadCoordinators();
      setForm(f => ({ ...f, coordinator_id: userId }));
      setNewCoordOpen(false);
      setNewCoordForm({ first_name: '', last_name: '', email_address: '', department: 'CSE', employee_id: '' });
    } catch (e) {
      setError(e.message || 'Failed to create coordinator.');
    } finally {
      setSavingCoord(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const currentUser = SessionService.getUser();
      if (!currentUser) throw new Error('Unauthorized: You must be logged in.');
      
      const role = (currentUser.role || '').replace(/\s+/g, '');
      const allowedRoles = ['Faculty', 'EventAdmin', 'SuperAdmin', 'Admin', 'HOD', 'DepartmentAdmin'];
      if (!allowedRoles.includes(role)) {
        throw new Error('Unauthorized: You do not have permission to create events.');
      }

      let finalStatus = form.status;
      if (finalStatus !== 'Draft' && finalStatus !== 'Cancelled' && form.start_date && form.end_date) {
        const now = new Date();
        const start = new Date(`${form.start_date}T${form.start_time || '00:00'}`);
        const end = new Date(`${form.end_date}T${form.end_time || '23:59'}`);
        
        if (now < start) finalStatus = 'Scheduled';
        else if (now >= start && now <= end) finalStatus = 'Active';
        else if (now > end) finalStatus = 'Completed';
      }

      const eventId = `EVT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const maxSeats = form.enable_registration && form.maximum_seats ? parseInt(form.maximum_seats) : null;
      const finalCapacity = maxSeats !== null ? maxSeats : (form.capacity ? parseInt(form.capacity) : null);

      const payload = {
        event_id: eventId,
        event_name: form.event_name,
        description: form.description,
        organizer: form.coordinator_id, // we might need to map it, but coordinator_id holds user_id in the dropdown
        participant_eligibility: form.participant_eligibility || 'bvc_only',
        attendance_type: form.attendance_type,
        start_date: form.start_date,
        end_date: form.end_date,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.venue, // Fix: Map venue to location because DB schema uses location
        departments: form.departments.join(', '),
        years: form.target_years.join(', '),
        capacity: finalCapacity,
        access_restriction_type: form.access_restriction_type,
        allow_spot_registration: form.allow_spot_registration,
        event_status: finalStatus,
        enable_registration: form.enable_registration ? 'Yes' : 'No',
        registration_open: form.enable_registration ? form.registration_open : null,
        registration_close: form.enable_registration ? form.registration_close : null,
        maximum_seats: maxSeats,
        allow_spot_registration_form: form.enable_registration ? form.allow_spot_reg_form : 'No',
        registration_fields: form.registration_fields.length > 0 ? JSON.stringify(form.registration_fields) : null,
        terms_and_conditions: form.terms || null,
      };

      const { error: dbError } = await supabase.from('events').insert([payload]);
      if (dbError) throw dbError;

      onEventCreated?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  };
  const modalStyle = {
    background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '750px',
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  };
  const label = (text, required) => (
    <label style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '4px', display: 'block', color: '#343a40' }}>
      {text} {required && <span style={{ color: '#dc3545' }}>*</span>}
    </label>
  );
  const inputStyle = {
    width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #ced4da',
    borderRadius: '6px', fontSize: '0.9rem', color: '#343a40', outline: 'none',
    boxSizing: 'border-box',
  };
  const fieldGroup = (content, col = '100%') => (
    <div style={{ width: col }}>{content}</div>
  );
  const row = (...children) => (
    <div className="responsive-form-row" style={{ marginBottom: '1rem' }}>
      {children.map((child, idx) => React.cloneElement(child, { 
        key: idx, 
        style: { ...(child.props.style || {}), flex: 1, width: '100%' }
      }))}
    </div>
  );

  const stepDone = (n) => step > n;
  const stepActive = (n) => step === n;

  const reviewRow = (label, value) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontWeight: 600, color: '#212529' }}>{value || '--'}</div>
    </div>
  );

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h5 style={{ margin: 0, fontWeight: 700 }}>Create Event</h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6c757d', lineHeight: 1 }}>×</button>
        </div>

        {/* Stepper Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', padding: '0.75rem 1.5rem', gap: '1rem', background: '#f8f9fa' }}>
          {[
            { n: 1, label: 'Details' },
            { n: 2, label: 'Registration' },
            { n: 3, label: 'Review' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: stepActive(s.n) ? 700 : 500, color: stepActive(s.n) ? '#0d6efd' : stepDone(s.n) ? '#198754' : '#6c757d', cursor: stepDone(s.n) ? 'pointer' : 'default' }}
              onClick={() => stepDone(s.n) && setStep(s.n)}>
              <span style={{
                width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                background: stepActive(s.n) ? '#0d6efd' : stepDone(s.n) ? '#198754' : '#adb5bd',
                color: '#fff',
              }}>
                {stepDone(s.n) ? '✓' : s.n}
              </span>
              {s.label}
              {s.n < 3 && <span style={{ color: '#adb5bd', margin: '0 0.25rem' }}>›</span>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          {error && (
            <div style={{ background: '#f8d7da', color: '#842029', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #f5c2c7' }}>
              ⚠️ {error}
            </div>
          )}

          {/* ─── STEP 1: Event Details ─── */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                {label('Event Name', true)}
                <input style={inputStyle} placeholder="e.g. Tech Symposium 2026" value={form.event_name} onChange={e => set('event_name', e.target.value)} />
              </div>

              {/* Participant Eligibility Radio Selection */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>🎓 Allowed Student Participants (Select One)</div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: '#1e3a8a' }}>
                    <input 
                      type="radio" 
                      name="participant_eligibility" 
                      value="bvc_only" 
                      checked={form.participant_eligibility === 'bvc_only'} 
                      onChange={() => set('participant_eligibility', 'bvc_only')} 
                      style={{ accentColor: '#2563eb' }}
                    />
                    BVC Students Only
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: '#1e3a8a' }}>
                    <input 
                      type="radio" 
                      name="participant_eligibility" 
                      value="all_colleges" 
                      checked={form.participant_eligibility === 'all_colleges'} 
                      onChange={() => set('participant_eligibility', 'all_colleges')} 
                      style={{ accentColor: '#2563eb' }}
                    />
                    All College Students (Open Inter-College)
                  </label>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '0.4rem' }}>
                  {form.participant_eligibility === 'bvc_only' 
                    ? '• For BVC Students: Collects Roll Number, Student Name, Email Address, Branch (Dropdown), Year & Section, Phone Number (College defaults to BVC).'
                    : '• For All College Students: Collects Student Name, Email Address, Department, Year & Section, Phone Number, Branch (Text input), College Name (Dropdown selection).'
                  }
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                {label('Description')}
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '64px' }} rows={2} placeholder="Brief description..." value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
                  {label('Faculty Event Admin / Coordinator', true)}
                  <button type="button" onClick={() => setShowInlineModal(true)} style={{ background: 'none', border: 'none', color: '#0d6efd', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                    + Inline Setup (Student/Guest/Faculty)
                  </button>
                </div>
                
                <select style={inputStyle} value={form.coordinator_id} onChange={e => set('coordinator_id', e.target.value)}>
                  <option value="">Select Faculty / Coordinator</option>
                  {coordinators.map(c => (
                    <option key={c.user_id} value={c.user_id}>
                      {c.first_name} {c.last_name || ''} ({c.role}) — {c.department || 'N/A'}
                    </option>
                  ))}
                </select>

                <InlineCoordinatorModal
                  isOpen={showInlineModal}
                  onClose={() => setShowInlineModal(false)}
                  onCoordinatorCreated={async (newCoord) => {
                    await loadCoordinators();
                    if (newCoord?.user_id) {
                      set('coordinator_id', newCoord.user_id);
                    }
                  }}
                />
              </div>

              <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#0d6efd', marginBottom: '0.75rem', fontSize: '0.9rem' }}>📅 Event Schedule</div>
                {row(
                  <div>
                    {label('Start Date', true)}
                    <input type="date" style={inputStyle} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                  </div>,
                  <div>
                    {label('End Date', true)}
                    <input type="date" style={inputStyle} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                  </div>
                )}
                {row(
                  <div>
                    {label('Start Time', true)}
                    <input type="time" style={inputStyle} value={form.start_time} onChange={e => set('start_time', e.target.value)} />
                  </div>,
                  <div>
                    {label('End Time', true)}
                    <input type="time" style={inputStyle} value={form.end_time} onChange={e => set('end_time', e.target.value)} />
                  </div>
                )}
                {row(
                  <div>
                    {label('Venue', true)}
                    <input style={inputStyle} placeholder="e.g. Seminar Hall, Block A" value={form.venue} onChange={e => set('venue', e.target.value)} />
                  </div>,
                  <div>
                    {label('Maximum Capacity')}
                    <input type="number" style={inputStyle} min="1" placeholder="Leave blank for Unlimited" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
                  </div>
                )}
              </div>

              {/* Departments Multi-Select */}
              {row(
                <div ref={deptRef} style={{ position: 'relative' }}>
                  {label('Target Departments', true)}
                  <button type="button" onClick={() => setDeptOpen(!deptOpen)} style={{ ...inputStyle, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: form.departments.length ? '#343a40' : '#adb5bd' }}>
                      {form.departments.length ? form.departments.join(', ') : 'Select Departments'}
                    </span>
                    <span>▾</span>
                  </button>
                  {deptOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #dee2e6', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, padding: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                      <input autoFocus style={{ ...inputStyle, marginBottom: '0.5rem' }} placeholder="Search departments..." value={deptSearch} onChange={e => setDeptSearch(e.target.value)} />
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.5rem' }}>
                        <button type="button" onClick={() => setForm(f => ({ ...f, departments: [...DEPTS] }))} style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>Select All</button>
                        <button type="button" onClick={() => setForm(f => ({ ...f, departments: [] }))} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>Clear All</button>
                      </div>
                      {filteredDepts.map(d => (
                        <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input type="checkbox" checked={form.departments.includes(d)} onChange={() => toggleDept(d)} />
                          {d}
                        </label>
                      ))}
                    </div>
                  )}
                </div>,
                <div ref={yearRef} style={{ position: 'relative' }}>
                  {label('Target Years')}
                  <button type="button" onClick={() => setYearOpen(!yearOpen)} style={{ ...inputStyle, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: form.target_years.length ? '#343a40' : '#adb5bd' }}>
                      {form.target_years.length ? `Year ${form.target_years.join(', ')}` : 'Select Years'}
                    </span>
                    <span>▾</span>
                  </button>
                  {yearOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #dee2e6', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.5rem' }}>
                        <button type="button" onClick={() => setForm(f => ({ ...f, target_years: [...YEARS] }))} style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>Select All</button>
                        <button type="button" onClick={() => setForm(f => ({ ...f, target_years: [] }))} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>Clear All</button>
                      </div>
                      {YEARS.map(y => (
                        <label key={y} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input type="checkbox" checked={form.target_years.includes(y)} onChange={() => toggleYear(y)} />
                          Year {y}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attendance Type */}
              <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#0d6efd', marginBottom: '0.75rem', fontSize: '0.9rem' }}>🎯 Attendance Type</div>
                {['Fixed', 'Open'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="radio" name="att_type" value={t} checked={form.attendance_type === t} onChange={() => set('attendance_type', t)} />
                    <strong>{t}</strong>
                    <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                      {t === 'Fixed' ? '— Only registered/specified groups can attend.' : '— Any active student can scan and attend on the spot.'}
                    </span>
                  </label>
                ))}
              </div>

              {/* Access Restriction */}
              <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#0d6efd', marginBottom: '0.5rem', fontSize: '0.9rem' }}>🔒 Attendance Access Restriction</div>
                <div style={{ color: '#6c757d', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Control which coordinators can record attendance for this event.</div>
                {[
                  { value: 'ALL_COORDINATORS', label: 'All Coordinators' },
                  { value: 'SPECIFIC_COORDINATORS', label: 'Specific Coordinators Only' },
                  { value: 'DEPT_ONLY', label: 'Department Coordinators Only' },
                ].map(r => (
                  <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="radio" name="access_type" value={r.value} checked={form.access_restriction_type === r.value} onChange={() => set('access_restriction_type', r.value)} />
                    {r.label}
                  </label>
                ))}
              </div>

              {row(
                <div style={{ background: '#f0f8ff', border: '1px solid #b8d4f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={form.allow_spot_registration === 'Yes'} onChange={e => set('allow_spot_registration', e.target.checked ? 'Yes' : 'No')} style={{ width: '18px', height: '18px' }} />
                    🙋 Enable Spot Registrations
                  </label>
                  <div style={{ color: '#6c757d', fontSize: '0.8rem', marginTop: '0.25rem', marginLeft: '26px' }}>Allows unregistered students to register on-the-spot during attendance.</div>
                </div>,
                <div>
                  {label('Action / Status', true)}
                  <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="Upcoming">Create Now (Upcoming)</option>
                    <option value="Draft">Schedule (Draft)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 2: Registration Settings ─── */}
          {step === 2 && (
            <div>
              <div style={{ background: '#f0f8ff', border: '1px solid #b8d4f0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '1.05rem' }}>
                  <input type="checkbox" checked={form.enable_registration} onChange={e => set('enable_registration', e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  Enable Student Self-Registration
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.8rem', marginTop: '0.25rem', marginLeft: '28px' }}>Allow students to register online for this event via a registration link.</div>
              </div>

              {form.enable_registration && (
                <div>
                  {row(
                    <div>
                      {label('Registration Open Date & Time', true)}
                      <input type="datetime-local" style={inputStyle} value={form.registration_open} onChange={e => set('registration_open', e.target.value)} />
                    </div>,
                    <div>
                      {label('Registration Close Date & Time', true)}
                      <input type="datetime-local" style={inputStyle} value={form.registration_close} onChange={e => set('registration_close', e.target.value)} />
                    </div>
                  )}
                  {row(
                    <div>
                      <input type="number" style={inputStyle} min="1" placeholder="e.g. 120" value={form.maximum_seats} onChange={e => {
                        const val = e.target.value;
                        setForm(f => ({ ...f, maximum_seats: val, capacity: val || f.capacity }));
                      }} />
                    </div>,
                    <div style={{ paddingTop: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="checkbox" checked={form.allow_spot_reg_form === 'Yes'} onChange={e => set('allow_spot_reg_form', e.target.checked ? 'Yes' : 'No')} />
                        Allow Spot Registration via Form
                      </label>
                      <div style={{ color: '#6c757d', fontSize: '0.8rem', marginTop: '0.25rem' }}>Allows students not in system to register as guests.</div>
                    </div>
                  )}

                  {/* Dynamic Registration Fields Preview */}
                  <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#495057', marginBottom: '0.5rem' }}>
                      📋 Default Form Fields for {form.participant_eligibility === 'bvc_only' ? 'BVC Students Only' : 'All College Students'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {form.participant_eligibility === 'bvc_only' ? (
                        [
                          'Roll Number *',
                          'Student Name *',
                          'Email Address *',
                          'Branch (Dropdown) *',
                          'Year & Section *',
                          'Phone Number *',
                          'College Name (BVC - Auto)'
                        ].map(f => (
                          <span key={f} style={{ background: '#2563eb', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>{f}</span>
                        ))
                      ) : (
                        [
                          'Student Name *',
                          'Email Address *',
                          'Department *',
                          'Year & Section *',
                          'Phone Number *',
                          'Branch (Text Input) *',
                          'College Name (Dropdown Selection) *'
                        ].map(f => (
                          <span key={f} style={{ background: '#059669', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>{f}</span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Custom Fields Builder */}
                  <div style={{ border: '1px solid #b8d4f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0d6efd' }}>⚙️ Custom Form Fields</div>
                      <button type="button" onClick={addCustomField} style={{ padding: '0.3rem 0.75rem', background: 'transparent', border: '1px solid #0d6efd', color: '#0d6efd', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                        + Add Field
                      </button>
                    </div>
                    {form.registration_fields.length === 0 ? (
                      <div style={{ color: '#adb5bd', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No custom fields. Click "Add Field" to configure additional registration questions.</div>
                    ) : (
                      form.registration_fields.map((f, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <input style={inputStyle} placeholder={`Field ${i + 1} name`} value={f.name} onChange={e => updateField(i, 'name', e.target.value)} />
                          <select style={inputStyle} value={f.type} onChange={e => updateField(i, 'type', e.target.value)}>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="email">Email</option>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                            <input type="checkbox" checked={f.required} onChange={e => updateField(i, 'required', e.target.checked)} />
                            Required
                          </label>
                          <button type="button" onClick={() => removeField(i)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}>🗑</button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Terms & Conditions */}
                  <div style={{ marginBottom: '1rem' }}>
                    {label('Terms & Conditions (Optional)')}
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} rows={2} placeholder="e.g. By submitting this form, I agree to follow the code of conduct..." value={form.terms} onChange={e => set('terms', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 3: Review ─── */}
          {step === 3 && (
            <div>
              <div style={{ background: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#0c5460' }}>
                ℹ️ Please review the event and registration details before finalizing.
              </div>

              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
                <h5 style={{ color: '#0d6efd', fontWeight: 700, borderBottom: '1px solid #dee2e6', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  {form.event_name || 'Event Name'}
                </h5>

                <div className="responsive-form-row">
                  {reviewRow('Start Date & Time', `${form.start_date} ${form.start_time}`)}
                  {reviewRow('End Date & Time', `${form.end_date} ${form.end_time}`)}
                  {reviewRow('Venue / Location', form.venue)}
                  {reviewRow('Coordinator', form.coordinator_id)}
                  {reviewRow('Target Departments', form.departments.join(', '))}
                  {reviewRow('Target Years', form.target_years.length ? `Year ${form.target_years.join(', ')}` : 'All Years')}
                  {reviewRow('Capacity Limit', form.capacity || 'Unlimited')}
                  {reviewRow('Attendance Type', form.attendance_type)}
                  {reviewRow('Access Restriction', form.access_restriction_type.replace('_', ' '))}
                  {reviewRow('Spot Registration', form.allow_spot_registration)}
                  {reviewRow('Initial Status', form.status)}
                </div>

                <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h6 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Registration Form Configuration</h6>
                  <div className="responsive-form-row">
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Registration Status</div>
                      <span style={{ background: form.enable_registration ? '#198754' : '#6c757d', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {form.enable_registration ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {form.enable_registration && (
                      <>
                        {reviewRow('Registration Window', `${form.registration_open} to ${form.registration_close}`)}
                        {reviewRow('Maximum Seats', form.maximum_seats || 'Unlimited')}
                        {reviewRow('Allow Spot Reg (Form)', form.allow_spot_reg_form)}
                      </>
                    )}
                    {form.registration_fields.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Custom Fields</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {form.registration_fields.map((f, i) => (
                            <span key={i} style={{ background: '#0d6efd', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem' }}>
                              {f.name} ({f.type}){f.required ? '*' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid #dee2e6', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 8px 8px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '0.45rem 1.5rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            Close
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {step > 1 && (
              <button onClick={() => { setError(''); setStep(s => s - 1); }} style={{ padding: '0.45rem 1.5rem', background: 'transparent', border: '1px solid #adb5bd', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#495057' }}>
                ← Previous
              </button>
            )}
            {step < 3 ? (
              <button onClick={handleNext} style={{ padding: '0.45rem 1.75rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 6px rgba(13,110,253,0.35)' }}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} style={{ padding: '0.45rem 1.75rem', background: '#198754', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, boxShadow: '0 2px 6px rgba(25,135,84,0.35)', opacity: saving ? 0.75 : 1 }}>
                {saving ? '⏳ Creating...' : '✓ Create Event'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
