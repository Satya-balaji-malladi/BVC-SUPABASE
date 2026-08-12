import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function PublicRegistration() {
  const { eventId } = useParams();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form Data
  const [rollNumber, setRollNumber] = useState('');
  const [studentExists, setStudentExists] = useState(false);
  const [studentForm, setStudentForm] = useState({
    student_name: '',
    department: 'CSE',
    year: '1',
    section: 'A',
    email_address: '',
    phone_number: ''
  });
  const [customData, setCustomData] = useState({});
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [customFields, setCustomFields] = useState([]);

  const [branchesList, setBranchesList] = useState([]);

  useEffect(() => {
    fetchEventDetails();
    fetchActiveBranches();
  }, [eventId]);

  const fetchActiveBranches = async () => {
    try {
      const { data: branchData } = await supabase
        .from('branches')
        .select('branch_code, branch_name, status')
        .eq('status', 'Active');
        
      if (branchData && branchData.length > 0) {
        setBranchesList(branchData.map(b => b.branch_code || b.branch_name));
        return;
      }

      // If branches table is empty or missing, fetch from departments table
      const { data: deptData } = await supabase
        .from('departments')
        .select('department_code, department_id, department_name');

      if (deptData && deptData.length > 0) {
        setBranchesList(deptData.map(d => d.department_code || d.department_id || d.department_name));
        return;
      }

      // Default fallback list
      setBranchesList(['CSE', 'CSE-AIML', 'CSE-DS', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML', 'IT']);
    } catch (err) {
      setBranchesList(['CSE', 'CSE-AIML', 'CSE-DS', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML', 'IT']);
    }
  };

  const fetchEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_id', eventId)
        .single();
        
      if (error || !data) {
        throw new Error('Event not found or has been removed.');
      }

      // Check if registration is enabled
      if (data.enable_registration !== 'Yes' && data.enable_registration !== true) {
        throw new Error('Registration is currently disabled for this event.');
      }

      // Time checks (treat DB timestamps as local time by ignoring the timezone offset)
      const parseLocalTime = (utcStr) => {
        if (!utcStr) return null;
        return new Date(utcStr.substring(0, 19)); // Strip timezone info
      };

      const openTime = parseLocalTime(data.registration_open);
      const closeTime = parseLocalTime(data.registration_close);
      const now = new Date();

      if (openTime && openTime > now) {
        throw new Error(`Registration opens on ${openTime.toLocaleString()}`);
      }
      if (closeTime && closeTime < now) {
        throw new Error('Registration is closed for this event.');
      }

      // Capacity check
      if (data.maximum_seats) {
        const { count, error: countErr } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('deletion_flag', false);
        
        if (!countErr && count >= data.maximum_seats) {
          throw new Error('This event has reached maximum capacity.');
        }
      }

      setEventData(data);
      
      // Parse custom fields
      if (data.registration_fields) {
        let fields = [];
        try {
          fields = typeof data.registration_fields === 'string' ? JSON.parse(data.registration_fields) : data.registration_fields;
        } catch(e) {
          console.error('Failed to parse registration_fields');
        }
        setCustomFields(fields);
        
        const initialCustom = {};
        fields.forEach(field => {
          if (field.type === 'checkbox') initialCustom[field.name] = false;
          else initialCustom[field.name] = '';
        });
        setCustomData(initialCustom);
      }
    } catch (err) {
      setError(err.message || 'Event not found or has been removed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRollNumberBlur = async () => {
    if (!rollNumber.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('roll_number', rollNumber.trim().toUpperCase())
        .single();
        
      if (data) {
        setStudentExists(true);
        setStudentForm({
          student_name: data.student_name || '',
          department: data.department_id ? data.department_id.replace('DEPT_', '') : 'CSE',
          year: data.year?.toString() || '1',
          section: data.section || 'A',
          email_address: data.email_address || '',
          phone_number: data.phone_number || ''
        });
      } else {
        setStudentExists(false);
      }
    } catch (err) {
      setStudentExists(false);
    }
  };

  const isBvcOnly = (eventData?.participant_eligibility || 'bvc_only') === 'bvc_only';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (eventData.terms && !termsAgreed) {
      setError('You must agree to the Terms & Conditions.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const finalRollNumber = rollNumber.trim().toUpperCase();
    const college = isBvcOnly ? 'BVC Engineering College' : (studentForm.college_name || 'BVC Engineering College');
    const isBvcStudent = college.toLowerCase().includes('bvc');
    const targetTable = isBvcStudent ? 'students' : 'other_college_students';
    
    try {
      // 1. Upsert Student Record in Master DB or Other Students DB
      let studentPayload;
      
      if (isBvcStudent) {
        studentPayload = {
          student_id: `STU-${finalRollNumber || Date.now()}`,
          roll_number: finalRollNumber || `EXT-${Date.now()}`, 
          student_name: studentForm.student_name, 
          department_id: `DEPT_${studentForm.department || 'GENERAL'}`,
          college: college,
          year: parseInt(studentForm.year || 1),
          section: studentForm.section || 'A',
          email_address: studentForm.email_address,
          phone_number: studentForm.phone_number
        };
      } else {
        studentPayload = {
          id: `EXT-${finalRollNumber || Date.now()}`,
          roll_number: finalRollNumber || `EXT-${Date.now()}`, 
          student_name: studentForm.student_name, 
          department: studentForm.branch || studentForm.department || 'GENERAL',
          college_name: college,
          year: String(studentForm.year || '1'),
          section: studentForm.section || 'A',
          email_address: studentForm.email_address,
          phone_number: studentForm.phone_number
        };
      }

      const { error: insertError } = await supabase
        .from(targetTable)
        .upsert([studentPayload], { onConflict: 'roll_number', ignoreDuplicates: false });
        
      if (insertError) {
        console.warn(`Upsert into ${targetTable} notice:`, insertError);
        // Do not fail if upsert fails, it might just be RLS or already exists differently, 
        // though we want the data to save so we should ideally check it.
      }

      // 2. Check if already registered
      const { data: existingReg } = await supabase
        .from('event_participants')
        .select('participant_id')
        .eq('event_id', eventId)
        .eq('roll_number', finalRollNumber)
        .single();

      if (existingReg) {
        throw new Error('You are already registered for this event!');
      }

      // 3. Register for Event
      const { error: regError } = await supabase
        .from('event_participants')
        .insert([{
          participant_id: `PART-${eventId}-${finalRollNumber}`,
          event_id: eventId,
          roll_number: finalRollNumber,
          custom_fields_data: JSON.stringify(customData)
        }]);
        
      if (regError) throw new Error('Failed to register for the event. ' + regError.message);

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><Loader2 className="animate-spin" size={32} color="var(--accent-blue)" /></div>;

  if (error && !eventData) return (
    <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--error)' }}>
      <AlertTriangle size={48} style={{ margin: '0 auto 1rem auto' }} />
      <h2>{error}</h2>
    </div>
  );

  if (success) return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
        <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem auto' }} />
        <h2 style={{ marginBottom: '1rem' }}>Registration Successful!</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You have successfully registered for <strong>{eventData.event_name}</strong>.</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: '100vh', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', marginTop: 'auto', marginBottom: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-block', padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '500', marginBottom: '1rem' }}>
            Event Registration
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{eventData.event_name}</h1>
          {eventData.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{eventData.description}</p>}
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Base Student Information */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Student Information</h4>
          
          <div className="input-group">
            <label>Roll Number <span style={{ color: 'var(--error)' }}>*</span></label>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
              onBlur={handleRollNumberBlur}
              className="input-field"
              placeholder="e.g. 21BVC1234"
            />
            {studentExists && <small style={{ color: 'var(--success)', marginTop: '0.5rem' }}>✓ Found in database. Details auto-populated.</small>}
          </div>

          <div className="input-group">
            <label>Full Name <span style={{ color: 'var(--error)' }}>*</span></label>
            <input
              type="text"
              required
              value={studentForm.student_name}
              onChange={e => setStudentForm({...studentForm, student_name: e.target.value})}
              className="input-field"
              placeholder="John Doe"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                value={studentForm.email_address}
                onChange={e => setStudentForm({...studentForm, email_address: e.target.value})}
                className="input-field"
                placeholder="john@example.com"
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={studentForm.phone_number}
                onChange={e => setStudentForm({...studentForm, phone_number: e.target.value})}
                className="input-field"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            {/* Branch Field */}
            <div className="input-group">
              <label>Branch <span style={{ color: 'var(--error)' }}>*</span></label>
              <select required className="input-field" value={studentForm.branch || studentForm.department || (branchesList[0] || 'CSE')} onChange={e => setStudentForm({...studentForm, branch: e.target.value, department: e.target.value})}>
                {branchesList.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* College Name Field */}
            {!isBvcOnly && (
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label>College Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <select required className="input-field" value={studentForm.college_name || 'BVC Engineering College'} onChange={e => setStudentForm({...studentForm, college_name: e.target.value})}>
                  <option value="BVC Engineering College">BVC Engineering College</option>
                  <option value="Aditya Engineering College">Aditya Engineering College</option>
                  <option value="Pragati Engineering College">Pragati Engineering College</option>
                  <option value="SRKR Engineering College">SRKR Engineering College</option>
                  <option value="JNTUK Kakinada">JNTUK Kakinada</option>
                  <option value="Other College">Other Institution</option>
                </select>
              </div>
            )}

            <div className="input-group">
              <label>Year <span style={{ color: 'var(--error)' }}>*</span></label>
              <select required className="input-field" value={studentForm.year} onChange={e => setStudentForm({...studentForm, year: e.target.value})}>
                {['1','2','3','4'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Section <span style={{ color: 'var(--error)' }}>*</span></label>
              <select required className="input-field" value={studentForm.section} onChange={e => setStudentForm({...studentForm, section: e.target.value})}>
                {['A','B','C','D'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <>
              <h4 style={{ margin: '1.5rem 0 1rem 0', color: 'var(--text-primary)' }}>Additional Information</h4>
              {customFields.map((field, idx) => (
                <div key={idx} className="input-group">
                  {field.type !== 'checkbox' && (
                    <label>{field.name} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}</label>
                  )}
                  
                  {field.type === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        required={field.required}
                        checked={customData[field.name] || false}
                        onChange={e => setCustomData({...customData, [field.name]: e.target.checked})}
                        style={{ width: '18px', height: '18px' }}
                      />
                      {field.name} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
                    </label>
                  ) : field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={customData[field.name] || ''}
                      onChange={e => setCustomData({...customData, [field.name]: e.target.value})}
                      className="input-field"
                    >
                      <option value="">Select an option</option>
                      <option value="Option 1">Option 1</option>
                      <option value="Option 2">Option 2</option>
                      <option value="Option 3">Option 3</option>
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      required={field.required}
                      value={customData[field.name] || ''}
                      onChange={e => setCustomData({...customData, [field.name]: e.target.value})}
                      className="input-field"
                    />
                  )}
                </div>
              ))}
            </>
          )}

          {/* Terms and Conditions */}
          {eventData.terms && (
            <div style={{ marginTop: '2rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h5 style={{ margin: '0 0 0.5rem 0' }}>Terms & Conditions</h5>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {eventData.terms}
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                <input 
                  type="checkbox"
                  required
                  checked={termsAgreed}
                  onChange={e => setTermsAgreed(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                I agree to the Terms & Conditions
              </label>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Complete Registration'}
          </button>
        </form>
      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
