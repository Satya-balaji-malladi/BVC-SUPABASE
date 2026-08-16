import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Loader2, Trash2, Search, Plus, Save, Users, Settings, AlignLeft } from 'lucide-react';
import InlineCoordinatorModal from './InlineCoordinatorModal';

export default function ManageEventModal({ isOpen, onClose, event, onEventUpdated }) {
  const [activeTab, setActiveTab] = useState('DETAILS');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Details Tab State
  const [form, setForm] = useState({
    event_name: '',
    description: '',
    participant_eligibility: 'bvc_only',
    attendance_type: 'Fixed',
    departments: '',
    target_years: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    venue: '',
    capacity: '',
    event_status: 'Draft',
  });

  // Reg Tab State
  const [regForm, setRegForm] = useState({
    enable_registration: false,
    registration_open: '',
    registration_close: '',
    maximum_seats: '',
    allow_spot_registration: 'Yes',
    registration_fields: [],
    terms: ''
  });

  // Coordinator Tab State
  const [coordinators, setCoordinators] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Inline Coordinator Modal State
  const [showInlineModal, setShowInlineModal] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setForm({
        event_name: event.event_name || '',
        description: event.description || '',
        participant_eligibility: event.participant_eligibility || 'bvc_only',
        attendance_type: event.attendance_type || 'Fixed',
        departments: event.departments || '',
        target_years: event.years || event.target_years || '',
        start_date: event.start_date || '',
        end_date: event.end_date || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        venue: event.location || event.venue || '', // DB has location, some old payloads had venue
        capacity: event.capacity || '',
        event_status: event.event_status || 'Draft',
      });
      let parsedFields = [];
      try {
        if (event.registration_fields) {
          parsedFields = typeof event.registration_fields === 'string' ? JSON.parse(event.registration_fields) : event.registration_fields;
        }
      } catch (e) {
        console.error("Failed to parse registration_fields", e);
      }

      setRegForm({
        enable_registration: event.enable_registration === 'Yes' || event.enable_registration === true,
        registration_open: event.registration_open ? event.registration_open.substring(0, 16) : '',
        registration_close: event.registration_close ? event.registration_close.substring(0, 16) : '',
        maximum_seats: event.maximum_seats || '',
        allow_spot_registration: event.allow_spot_registration || 'Yes',
        registration_fields: parsedFields,
        terms: event.terms_and_conditions || event.terms || ''
      });
      fetchCoordinators();
      setActiveTab('DETAILS');
      setError('');
      setSuccess('');
    }
  }, [isOpen, event?.event_id]);

  const fetchCoordinators = async () => {
    if (!event) return;
    try {
      const { data, error: err } = await supabase
        .from('event_assignments')
        .select(`
          assignment_id,
          role,
          assigned_at,
          users:user_id (
            user_id,
            employee_id,
            first_name,
            last_name,
            email_address,
            username,
            role,
            department
          )
        `)
        .eq('event_id', event.event_id)
        .eq('deletion_flag', false);
        
      if (err) throw err;
      
      const mapped = (data || []).map(a => ({
        assignment_id: a.assignment_id,
        role: a.role,
        assigned_at: a.assigned_at,
        ...a.users
      }));
      setCoordinators(mapped);
    } catch (e) {
      console.error('Failed to fetch coordinators', e);
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let finalStatus = 'Active';
      if (form.start_date && form.end_date) {
        const now = new Date();
        const start = new Date(`${form.start_date}T${form.start_time || '00:00'}`);
        const end = new Date(`${form.end_date}T${form.end_time || '23:59'}`);
        
        if (now < start) finalStatus = 'Scheduled';
        else if (now >= start && now <= end) finalStatus = 'Active';
        else if (now > end) finalStatus = 'Completed';
      }

      const payload = {
        event_name: form.event_name,
        description: form.description,
        participant_eligibility: form.participant_eligibility || 'bvc_only',
        attendance_type: form.attendance_type,
        departments: form.departments,
        years: form.target_years,
        start_date: form.start_date,
        end_date: form.end_date,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.venue, // Map venue to location in DB
        capacity: form.capacity ? parseInt(form.capacity) : null,
        event_status: finalStatus,
      };

      const { error: dbError } = await supabase
        .from('events')
        .update(payload)
        .eq('event_id', event.event_id);

      if (dbError) throw dbError;
      
      setSuccess('Details updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      onEventUpdated?.();
    } catch (e) {
      setError(e.message || 'Failed to update details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRegistration = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const maxSeats = regForm.enable_registration && regForm.maximum_seats ? parseInt(regForm.maximum_seats) : null;
      const payload = {
        enable_registration: regForm.enable_registration ? 'Yes' : 'No',
        registration_open: regForm.enable_registration ? (regForm.registration_open || null) : null,
        registration_close: regForm.enable_registration ? (regForm.registration_close || null) : null,
        maximum_seats: maxSeats,
        allow_spot_registration: regForm.allow_spot_registration,
        registration_fields: regForm.enable_registration && regForm.registration_fields.length > 0 ? JSON.stringify(regForm.registration_fields) : null,
        terms_and_conditions: regForm.enable_registration ? (regForm.terms || null) : null,
      };

      if (maxSeats !== null) {
        payload.capacity = maxSeats;
        setForm(prev => ({ ...prev, capacity: maxSeats }));
      }

      const { error: dbError } = await supabase
        .from('events')
        .update(payload)
        .eq('event_id', event.event_id);

      if (dbError) throw dbError;
      
      setSuccess('Registration settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      onEventUpdated?.();
    } catch (e) {
      setError(e.message || 'Failed to update registration settings.');
    } finally {
      setSaving(false);
    }
  };

  const searchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError('');
    try {
      const q = searchQuery.trim();
      const { data, error: searchErr } = await supabase
        .from('users')
        .select('user_id, employee_id, first_name, last_name, email_address, username, role, department')
        .or(`username.ilike.%${q}%,employee_id.ilike.%${q}%,email_address.ilike.%${q}%`)
        .eq('deletion_flag', false)
        .limit(10);

      if (searchErr) throw searchErr;
      
      // Filter out users already assigned
      const existingIds = new Set(coordinators.map(c => c.user_id));
      setSearchResults((data || []).filter(u => !existingIds.has(u.user_id)));
    } catch (err) {
      setError('Search failed: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const assignCoordinator = async (user) => {
    setSaving(true);
    setError('');
    try {
      const sessionStr = localStorage.getItem('bvc_cached_user') || localStorage.getItem('custom_auth_session');
      let currentUserId = null;
      if (sessionStr) {
         try {
           const parsed = JSON.parse(sessionStr);
           currentUserId = parsed.user_id || parsed.user?.id;
         } catch(e) {}
      }

      const roleType = user.role.toLowerCase().includes('student') ? 'Student Coordinator' : 'Faculty Coordinator';
      const assignmentId = `ASG-${Date.now()}`;

      const { error: assignErr } = await supabase
        .from('event_assignments')
        .insert([{
          assignment_id: assignmentId,
          event_id: event.event_id,
          user_id: user.user_id,
          role: roleType,
          coordinator_type: roleType,
          assigned_by: currentUserId
        }]);

      if (assignErr) throw assignErr;

      // Ensure the events table also reflects this coordinator
      await supabase.from('events').update({ organizer: user.user_id }).eq('event_id', event.event_id);

      setSearchResults(prev => prev.filter(u => u.user_id !== user.user_id));
      await fetchCoordinators();
      setSuccess(`${user.first_name || ''} assigned successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      onEventUpdated?.();
    } catch (err) {
      setError('Failed to assign coordinator: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeCoordinator = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this coordinator?')) return;
    setSaving(true);
    setError('');
    try {
      const { error: delErr } = await supabase
        .from('event_assignments')
        .update({ deletion_flag: true })
        .eq('assignment_id', assignmentId);

      if (delErr) throw delErr;
      await fetchCoordinators();
      onEventUpdated?.();
    } catch (err) {
      setError('Failed to remove coordinator: ' + err.message);
    } finally {
      setSaving(false);
    }
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

      await supabase.from('faculty').insert([{
        faculty_id: `F-${Date.now()}`,
        employee_id: empId,
        user_id: userId,
        faculty_name: `${newCoordForm.first_name} ${newCoordForm.last_name}`.trim(),
        designation: 'Event Coordinator',
        department_id: newCoordForm.department,
        email: newCoordForm.email_address
      }]);

      await assignCoordinator(payload);
      setNewCoordOpen(false);
      setNewCoordForm({ first_name: '', last_name: '', email_address: '', department: 'CSE', employee_id: '' });
    } catch (e) {
      setError(e.message || 'Failed to create coordinator.');
    } finally {
      setSearching(false);
    }
  };

  const addCustomField = () => {
    setRegForm({
      ...regForm,
      registration_fields: [...regForm.registration_fields, { name: '', type: 'text', required: false }]
    });
  };

  const updateField = (index, key, value) => {
    const newFields = [...regForm.registration_fields];
    newFields[index][key] = value;
    setRegForm({ ...regForm, registration_fields: newFields });
  };

  const removeField = (index) => {
    const newFields = [...regForm.registration_fields];
    newFields.splice(index, 1);
    setRegForm({ ...regForm, registration_fields: newFields });
  };

  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  };
  const modalStyle = {
    background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '800px',
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)', overflow: 'hidden'
  };
  const labelStyle = { fontWeight: 500, fontSize: '0.9rem', marginBottom: '4px', display: 'block', color: '#343a40' };
  const inputStyle = {
    width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ced4da',
    borderRadius: '6px', fontSize: '0.9rem', color: '#343a40', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        
        {/* Header */}
        <div style={{ background: '#212529', color: '#fff', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h5 style={{ margin: 0, fontWeight: 600, color: '#fff' }}>Manage Event: {event.event_name}</h5>
            <small style={{ color: 'rgba(255,255,255,0.85)' }}>ID: {event.event_id}</small>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
          {[
            { id: 'DETAILS', label: 'Details & Status', icon: AlignLeft },
            { id: 'REGISTRATION', label: 'Registration', icon: Settings },
            { id: 'COORDINATORS', label: 'Coordinators', icon: Users }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
                style={{
                  padding: '1rem 1.5rem', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  color: isActive ? '#0d6efd' : '#6c757d',
                  borderBottom: isActive ? '3px solid #0d6efd' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '0.75rem', background: '#f8d7da', color: '#842029', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '0.75rem', background: '#d1e7dd', color: '#0f5132', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {success}
            </div>
          )}

          {activeTab === 'DETAILS' && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Event Name *</label>
                <input type="text" style={inputStyle} value={form.event_name} onChange={e => setForm({...form, event_name: e.target.value})} required />
              </div>

              {/* Participant Eligibility Radio Selection */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '0.5rem', fontSize: '0.875rem' }}>🎓 Allowed Student Participants (Select One)</div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#1e3a8a' }}>
                    <input 
                      type="radio" 
                      name="manage_participant_eligibility" 
                      value="bvc_only" 
                      checked={form.participant_eligibility === 'bvc_only'} 
                      onChange={() => setForm({ ...form, participant_eligibility: 'bvc_only' })}
                    />
                    BVC Students Only
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#1e3a8a' }}>
                    <input 
                      type="radio" 
                      name="manage_participant_eligibility" 
                      value="all_colleges" 
                      checked={form.participant_eligibility === 'all_colleges'} 
                      onChange={() => setForm({ ...form, participant_eligibility: 'all_colleges' })}
                    />
                    All College Students
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{...inputStyle, minHeight: '60px', resize: 'vertical'}} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Attendance Type</label>
                  <select style={inputStyle} value={form.attendance_type} onChange={e => setForm({...form, attendance_type: e.target.value})}>
                    <option value="Fixed">Fixed (Daily Check-in)</option>
                    <option value="Flexible">Flexible (Session-based)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Venue / Location</label>
                  <input type="text" style={inputStyle} placeholder="e.g. Seminar Hall" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Target Departments</label>
                  <input type="text" style={inputStyle} placeholder="e.g. CSE, ECE (comma separated)" value={form.departments} onChange={e => setForm({...form, departments: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Target Years</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {['1','2','3','4'].map(y => (
                       <label key={y} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                         <input 
                           type="checkbox" 
                           checked={(form.target_years || '').includes(y)}
                           onChange={e => {
                              const arr = (form.target_years || '').split(',').map(s=>s.trim()).filter(Boolean);
                              if (e.target.checked && !arr.includes(y)) arr.push(y);
                              else if (!e.target.checked) arr.splice(arr.indexOf(y), 1);
                              setForm({...form, target_years: arr.join(', ')});
                           }}
                         />
                         Year {y}
                       </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" style={inputStyle} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="date" style={inputStyle} value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Start Time</label>
                  <input type="time" style={inputStyle} value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>End Time</label>
                  <input type="time" style={inputStyle} value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Capacity</label>
                  <input type="number" style={inputStyle} placeholder="Leave blank for unlimited" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} />
                </div>
                {/* Event Status dropdown removed for automatic calculation */}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={saving}
                  style={{ padding: '0.5rem 1.5rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />} Save Details
                </button>
              </div>
            </div>
          )}

          {activeTab === 'REGISTRATION' && (
            <div>
              <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#212529' }}>
                  <input 
                    type="checkbox" 
                    checked={regForm.enable_registration} 
                    onChange={e => setRegForm({...regForm, enable_registration: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  Enable Student Registration
                </label>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#6c757d', marginLeft: '26px' }}>
                  If enabled, students can register for this event before it starts.
                </p>
              </div>

              {regForm.enable_registration && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Registration Opens At</label>
                      <input type="datetime-local" style={inputStyle} value={regForm.registration_open} onChange={e => setRegForm({...regForm, registration_open: e.target.value})} />
                    </div>
                    <div>
                      <label style={labelStyle}>Registration Closes At</label>
                      <input type="datetime-local" style={inputStyle} value={regForm.registration_close} onChange={e => setRegForm({...regForm, registration_close: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <input type="number" style={inputStyle} placeholder="Limits total registrations" value={regForm.maximum_seats} onChange={e => {
                        const val = e.target.value;
                        setRegForm(r => ({ ...r, maximum_seats: val }));
                        if (val) setForm(f => ({ ...f, capacity: val }));
                      }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Spot Registrations Allowed?</label>
                      <select style={inputStyle} value={regForm.allow_spot_registration} onChange={e => setRegForm({...regForm, allow_spot_registration: e.target.value})}>
                        <option value="Yes">Yes, allow unregistered students to scan in</option>
                        <option value="No">No, strictly registered students only</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Registration Default Fields */}
                  <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#495057', marginBottom: '0.5rem' }}>
                      📋 Default Form Fields for {form.participant_eligibility === 'bvc_only' ? 'BVC Students Only' : 'All College Students'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {form.participant_eligibility === 'bvc_only' ? (
                        [
                          'Roll Number',
                          'Student Name',
                          'Email Address',
                          'Branch (Dropdown)',
                          'Year & Section',
                          'Phone Number',
                          'College Name (BVC - Auto)'
                        ].map(f => (
                          <span key={f} style={{ background: '#2563eb', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>{f}</span>
                        ))
                      ) : (
                        [
                          'Student Name',
                          'Email Address',
                          'Department',
                          'Year & Section',
                          'Phone Number',
                          'Branch (Text Input)',
                          'College Name (Dropdown Selection)'
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
                    {regForm.registration_fields.length === 0 ? (
                      <div style={{ color: '#adb5bd', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No custom fields. Click "Add Field" to configure additional registration questions.</div>
                    ) : (
                      regForm.registration_fields.map((f, i) => (
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
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={labelStyle}>Terms & Conditions (Optional)</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} rows={2} placeholder="e.g. By submitting this form, I agree to follow the code of conduct..." value={regForm.terms} onChange={e => setRegForm({...regForm, terms: e.target.value})} />
                  </div>

                  {/* QR Code & Share Link */}
                  {event.event_id && (
                    <div style={{ display: 'flex', gap: '1.5rem', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                      <div style={{ background: '#fff', padding: '0.5rem', border: '1px solid #dee2e6', borderRadius: '8px' }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/register/' + event.event_id)}`}
                          alt="Registration QR Code"
                          width="120" height="120"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h6 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#212529' }}>Registration Portal Live!</h6>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#6c757d' }}>Students can scan the QR code or visit the link below to register for this event.</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            style={{ ...inputStyle, background: '#fff', margin: 0 }}
                            value={`${window.location.origin}/register/${event.event_id}`}
                            readOnly
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/register/${event.event_id}`);
                              setSuccess('Link copied!');
                              setTimeout(() => setSuccess(''), 2000);
                            }}
                            style={{ padding: '0 1rem', background: '#212529', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleSaveRegistration}
                  disabled={saving}
                  style={{ padding: '0.5rem 1.5rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />} Save Registration Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'COORDINATORS' && (
            <div>
              {/* Add Coordinator Header & Action */}
              <div style={{ background: '#f8f9fa', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h6 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Event Coordinators</h6>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Assign or create Student, Guest, or Faculty coordinators for this event.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInlineModal(true)}
                  style={{
                    background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px',
                    padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 4px rgba(13, 110, 253, 0.2)'
                  }}
                >
                  <Plus size={16} /> Inline Coordinator Setup
                </button>
              </div>

              <InlineCoordinatorModal
                isOpen={showInlineModal}
                onClose={() => setShowInlineModal(false)}
                eventId={event.event_id}
                onCoordinatorCreated={async () => {
                  await fetchCoordinators();
                  onEventUpdated?.();
                }}
              />

              {/* List Coordinators */}
              <h6 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9rem' }}>Assigned Coordinators ({coordinators.length})</h6>
              {coordinators.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d', border: '1px dashed #ced4da', borderRadius: '6px' }}>
                  No coordinators assigned to this event yet.
                </div>
              ) : (
                <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #dee2e6' }}>Name</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #dee2e6' }}>ID</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #dee2e6' }}>Role & Dept</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #dee2e6' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coordinators.map(c => (
                        <tr key={c.assignment_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{c.first_name} {c.last_name || ''}</div>
                            <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, fontFamily: 'monospace', marginTop: '2px' }}>
                              ID: {c.employee_id || c.username || c.user_id}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569', fontFamily: 'monospace' }}>{c.employee_id || c.username}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 500 }}>{c.role}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>{c.department || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <button 
                              onClick={() => removeCoordinator(c.assignment_id)}
                              disabled={saving}
                              style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '0.5rem' }}
                              title="Remove Coordinator"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
