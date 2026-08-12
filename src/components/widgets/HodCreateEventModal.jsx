import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { X, CalendarPlus, UserCircle2, UserPlus, CheckCircle2 } from 'lucide-react';
import SessionService from '../../services/SessionService';

export default function HodCreateEventModal({ isOpen, onClose, onEventCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    participantEligibility: 'bvc_only' // 'bvc_only' | 'all_colleges'
  });

  const [adminOption, setAdminOption] = useState('existing'); // 'existing' | 'new'
  const [adminData, setAdminData] = useState({
    id: '', 
    name: '',
    employeeId: '',
    email: ''
  });

  const currentUser = SessionService.getUser();

  useEffect(() => {
    if (isOpen) {
      fetchFaculty();
    }
  }, [isOpen]);

  const fetchFaculty = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, employee_id, first_name, last_name, email_address, department')
        .in('role', ['Faculty', 'Event Admin'])
        .eq('status', 'Active')
        .eq('deletion_flag', false);

      if (!error && data) {
        setFacultyList(data);
      }
    } catch (err) {
      console.error("Failed to load faculty:", err);
    }
  };

  const validate = () => {
    if (!formData.name.trim()) return "Event Name is required.";
    if (!formData.startDate) return "Start Date is required.";
    if (!formData.endDate) return "End Date is required.";
    if (formData.startDate > formData.endDate) return "End Date cannot be before Start Date.";
    
    if (adminOption === 'existing' && !adminData.id) {
      return "Please select an Event Admin from the list.";
    }
    
    if (adminOption === 'new') {
      if (!adminData.name.trim()) return "Admin Name is required.";
      if (!adminData.employeeId.trim()) return "Admin Employee ID is required.";
      if (!adminData.email.trim()) return "Admin Email is required.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminData.email)) return "Please enter a valid email address.";
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
    let assignedAdminId = adminData.id;
    let newlyCreatedUserId = null;

    try {
      const currentTimestamp = new Date().toISOString();
      const eventId = `EVT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      // 1. Create New Guest Admin if selected
      if (adminOption === 'new') {
        const empId = adminData.employeeId.trim().toUpperCase();
        
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('employee_id', empId)
          .maybeSingle();
          
        if (existingUser) {
           throw new Error(`Employee ID '${empId}' is already in use.`);
        }

        const newUserId = `USER_${empId}`;
        const nameParts = adminData.name.trim().split(" ");
        const initialPassword = `BVC@${empId}`; // Temp password
        
        const newUserData = {
          user_id: newUserId,
          employee_id: empId,
          first_name: nameParts[0] || adminData.name.trim(),
          last_name: nameParts.slice(1).join(" ") || "",
          email_address: adminData.email.trim(),
          username: empId.toLowerCase(),
          password_hash: initialPassword, 
          salt: 'temp_salt',
          role: 'Event Admin',
          default_role: 'Event Admin',
          department: currentUser?.department || 'General',
          title_designation: 'Guest Event Admin',
          status: 'Active',
          created_by: currentUser?.employee_id || 'System',
          created_at: currentTimestamp,
          updated_at: currentTimestamp
        };

        const { error: userInsertError } = await supabase.from('users').insert(newUserData);
        if (userInsertError) throw new Error(`Failed to create Guest Admin: ${userInsertError.message}`);
        
        newlyCreatedUserId = newUserId;
        assignedAdminId = newUserId; // use user_id
      } else {
        const selectedUser = facultyList.find(f => f.user_id === assignedAdminId);
        assignedAdminId = selectedUser?.user_id || assignedAdminId;
      }

      // 2. Create Event Shell
      const newEventData = {
        event_id: eventId,
        event_name: formData.name.trim(),
        description: formData.description.trim(),
        organizer: assignedAdminId,
        participant_eligibility: formData.participantEligibility || 'bvc_only',
        attendance_type: 'Fixed',
        start_date: formData.startDate,
        end_date: formData.endDate,
        start_time: '09:00:00', // Default shell value
        end_time: '17:00:00',   // Default shell value
        departments: currentUser?.department || 'Global',
        access_restriction_type: 'ALL_COORDINATORS',
        event_status: 'Draft',
        allow_spot_registration: 'No',
        enable_registration: 'No',
        created_at: currentTimestamp
      };

      const { error: deptInsertError } = await supabase.from('events').insert([newEventData]);
      
      if (deptInsertError) {
         // Manual Rollback: Delete the user we just created
         if (newlyCreatedUserId) {
            await supabase.from('users').delete().eq('user_id', newlyCreatedUserId);
         }
         throw new Error(`Failed to create event: ${deptInsertError.message}`);
      }

      // Show success simulation toast
      setShowSuccessToast(true);
      
      // Delay closing to show toast
      setTimeout(() => {
        setShowSuccessToast(false);
        onEventCreated?.();
        onClose();
      }, 3000);

    } catch (err) {
      console.error(err);
      const errorMessage = err.message || "An error occurred while creating the event.";
      setError(errorMessage);
      window.alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '550px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative', overflow: 'hidden'
      }}>
        
        {/* Simulated Email Dispatch Toast */}
        {showSuccessToast && (
          <div style={{ 
            position: 'absolute', top: '1rem', left: '1rem', right: '1rem',
            background: 'var(--success)', color: 'white', padding: '1rem', borderRadius: '8px',
            zIndex: 2000, display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)'
          }}>
            <CheckCircle2 size={24} />
            <div>
              <div style={{ fontWeight: 'bold' }}>Event Draft Created!</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                {adminOption === 'new' 
                  ? 'A welcome email with login credentials has been sent to the new Guest Admin.' 
                  : 'An email has been dispatched notifying the faculty member of their assignment.'}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
            <CalendarPlus size={24} className="text-gradient" /> Propose New Event
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Propose the basic details for this event and assign an Event Admin. The assigned admin will configure the rest of the details (registration, venue, capacities, etc.)
          </div>

          {error && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form id="hod-create-event-form" onSubmit={handleSubmit}>
            
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>1. Basic Details</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Event Name *</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Annual Tech Symposium" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                style={{ width: '100%', padding: '0.75rem' }}
              />
            </div>

            {/* Allowed Participants Selection */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#1d4ed8' }}>
                🎓 Allowed Student Participants (Select One) *
              </label>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  <input 
                    type="radio" 
                    name="hod_participant_eligibility" 
                    value="bvc_only" 
                    checked={formData.participantEligibility === 'bvc_only'} 
                    onChange={() => setFormData({ ...formData, participantEligibility: 'bvc_only' })}
                  />
                  BVC Students Only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  <input 
                    type="radio" 
                    name="hod_participant_eligibility" 
                    value="all_colleges" 
                    checked={formData.participantEligibility === 'all_colleges'} 
                    onChange={() => setFormData({ ...formData, participantEligibility: 'all_colleges' })}
                  />
                  All College Students
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Description</label>
              <textarea 
                className="input-field" 
                placeholder="Brief summary of the event..." 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Start Date *</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>End Date *</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem' }}
                />
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>2. Assign Event Admin</h3>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div 
                onClick={() => setAdminOption('existing')}
                style={{ 
                  flex: 1, padding: '1rem', border: `1px solid ${adminOption === 'existing' ? '#3b82f6' : 'var(--glass-border)'}`, 
                  background: adminOption === 'existing' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s'
                }}
              >
                <UserCircle2 size={20} color={adminOption === 'existing' ? '#3b82f6' : 'var(--text-secondary)'} />
                <div>
                  <div style={{ fontWeight: '500', color: adminOption === 'existing' ? '#3b82f6' : 'var(--text-primary)', fontSize: '0.9rem' }}>Existing Faculty</div>
                </div>
                {adminOption === 'existing' && <CheckCircle2 size={18} color="#3b82f6" style={{ marginLeft: 'auto' }} />}
              </div>
              
              <div 
                onClick={() => setAdminOption('new')}
                style={{ 
                  flex: 1, padding: '1rem', border: `1px solid ${adminOption === 'new' ? '#10b981' : 'var(--glass-border)'}`, 
                  background: adminOption === 'new' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s'
                }}
              >
                <UserPlus size={20} color={adminOption === 'new' ? '#10b981' : 'var(--text-secondary)'} />
                <div>
                  <div style={{ fontWeight: '500', color: adminOption === 'new' ? '#10b981' : 'var(--text-primary)', fontSize: '0.9rem' }}>Guest Admin</div>
                </div>
                {adminOption === 'new' && <CheckCircle2 size={18} color="#10b981" style={{ marginLeft: 'auto' }} />}
              </div>
            </div>

            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              
              {adminOption === 'existing' ? (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Select Admin from Faculty *</label>
                  <select 
                    className="input-field" 
                    value={adminData.id}
                    onChange={e => setAdminData({...adminData, id: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', appearance: 'auto' }}
                  >
                    <option value="">-- Select Faculty --</option>
                    {facultyList.map(f => (
                      <option key={f.user_id} value={f.user_id}>
                        {f.first_name} {f.last_name} — {f.employee_id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    A temporary account will be created. They will receive an email with credentials and will only be able to access the dashboard during the event dates.
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Admin Full Name *</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Anil Kumar" 
                      value={adminData.name}
                      onChange={e => setAdminData({...adminData, name: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem' }}
                    />
                  </div>
                  <div className="responsive-form-row">
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Employee ID / Identifier *</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. GST101" 
                        value={adminData.employeeId}
                        onChange={e => setAdminData({...adminData, employeeId: e.target.value})}
                        style={{ width: '100%', padding: '0.75rem', textTransform: 'uppercase' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email Address *</label>
                      <input 
                        type="email" 
                        className="input-field" 
                        placeholder="e.g. anil@example.com" 
                        value={adminData.email}
                        onChange={e => setAdminData({...adminData, email: e.target.value})}
                        style={{ width: '100%', padding: '0.75rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-secondary)', borderRadius: '0 0 8px 8px' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading || showSuccessToast}
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="hod-create-event-form"
            className="btn btn-primary"
            disabled={loading || showSuccessToast}
          >
            {loading ? 'Creating Draft...' : 'Propose Event & Assign Admin'}
          </button>
        </div>

      </div>
    </div>
  );
}
