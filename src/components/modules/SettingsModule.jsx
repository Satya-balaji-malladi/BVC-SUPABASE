import React, { useState, useEffect } from 'react';
import { Save, Building, Bell, Shield, Database, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import CreateDepartmentModal from '../widgets/CreateDepartmentModal';

export default function SettingsModule({ userRole, userDepartment }) {
  const normalizedRole = (userRole || '').replace(/\s+/g, '').toUpperCase();
  const isHOD = normalizedRole === 'HOD' || normalizedRole === 'DEPARTMENTADMIN';
  const effectiveDepartment = isHOD ? userDepartment : null;

  const [activeTab, setActiveTab] = useState(isHOD ? 'profile' : 'general');
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingCoordinators, setLoadingCoordinators] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Department Scoped Preferences
  const [deptProfile, setDeptProfile] = useState({
    name: effectiveDepartment || 'Department',
    code: effectiveDepartment || '',
    email: `${(effectiveDepartment || 'dept').toLowerCase()}hod@bvcgroup.in`,
    phone: '+91 94901 23456',
    location: 'Block-B, 2nd Floor, Room 204',
    description: `Department of ${effectiveDepartment || 'Engineering'} focused on academic excellence, technical workshops, and student event participation.`
  });

  const [eventPrefs, setEventPrefs] = useState({
    requireApproval: true,
    requireCoordinatorSignoff: true,
    enableAttendanceTracking: true,
    defaultCategory: 'Technical Workshop',
    defaultDuration: '1 Day'
  });

  const [attendancePrefs, setAttendancePrefs] = useState({
    lowThreshold: 75,
    allowManualAttendance: true,
    mandatoryAttendanceForCertificates: true
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    newEventAlert: true,
    registrationAlert: true,
    lowAttendanceAlert: true,
    eventCompletionAlert: true
  });

  const [reportPrefs, setReportPrefs] = useState({
    defaultAcademicYear: '2025-26',
    defaultSemester: 'All',
    defaultExportFormat: 'PDF'
  });

  useEffect(() => {
    if (activeTab === 'departments' || activeTab === 'profile') {
      fetchDepartments();
    }
    if (activeTab === 'coordinators') {
      fetchCoordinators();
    }
  }, [activeTab, userRole, userDepartment]);

  const fetchDepartments = async () => {
    setLoadingDepts(true);
    try {
      let query = supabase.from('departments').select('*').order('department_name');
      if (isHOD && effectiveDepartment) {
        query = query.or(`department_id.eq.${effectiveDepartment},department_code.eq.${effectiveDepartment}`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setDepartments(data);
        const current = data[0];
        setDeptProfile(prev => ({
          ...prev,
          name: current.department_name || prev.name,
          code: current.department_code || current.department_id || prev.code,
          email: current.contact_email || prev.email,
          location: current.location || prev.location
        }));
      } else {
        setDepartments(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDepts(false);
    }
  };

  const fetchCoordinators = async () => {
    setLoadingCoordinators(true);
    try {
      let query = supabase.from('users').select('*').ilike('role', '%coordinator%');
      if (isHOD && effectiveDepartment) {
        query = query.ilike('department', `%${effectiveDepartment}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setCoordinators(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCoordinators(false);
    }
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {isHOD ? `${effectiveDepartment || 'Department'} Settings` : 'System Settings'}
            </h1>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
              {isHOD ? `Department: ${effectiveDepartment || 'HOD'} 🔒` : 'Institution Wide'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            {isHOD 
              ? `Manage department information, event preferences, and coordinator settings for ${effectiveDepartment || 'your department'}.`
              : 'Configure platform preferences and institution defaults.'
            }
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveSuccess && (
            <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.875rem' }}>
              ✓ Saved successfully!
            </span>
          )}
          <button onClick={handleSave} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}>
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', flex: 1 }}>
        {/* Navigation Sidebar */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'fit-content' }}>
          {(isHOD ? [
            { id: 'profile', label: 'Department Profile', icon: <Building size={18} /> },
            { id: 'events', label: 'Event Preferences', icon: <Database size={18} /> },
            { id: 'attendance', label: 'Attendance Policy', icon: <Shield size={18} /> },
            { id: 'coordinators', label: 'Department Coordinators', icon: <Building size={18} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
            { id: 'reports', label: 'Report Defaults', icon: <Save size={18} /> },
          ] : [
            { id: 'general', label: 'General & Institution', icon: <Building size={18} /> },
            { id: 'departments', label: 'Academic Structure', icon: <Database size={18} /> },
            { id: 'events_config', label: 'Event Configuration', icon: <Database size={18} /> },
            { id: 'attendance_config', label: 'Attendance Rules', icon: <Shield size={18} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
            { id: 'security', label: 'Security & Audit Logs', icon: <Shield size={18} /> },
            { id: 'branding', label: 'Branding & Theme', icon: <Building size={18} /> },
            { id: 'danger', label: 'Danger Zone', icon: <Shield size={18} /> },
          ]).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                  background: isActive ? (tab.id === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
                  color: isActive ? (tab.id === 'danger' ? '#ef4444' : 'var(--accent-blue)') : (tab.id === 'danger' ? '#ef4444' : 'var(--text-secondary)'),
                  border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem'
                }}>
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* HOD DEPARTMENT PROFILE */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Department Profile</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Identity details and contact info for {effectiveDepartment} department.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Department Code 🔒</label>
                  <input type="text" className="input-field" disabled value={deptProfile.code} style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🔒 Managed by Super Admin</span>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Department Name 🔒</label>
                  <input type="text" className="input-field" disabled value={deptProfile.name} style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🔒 Managed by Super Admin</span>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Contact Email Address</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={deptProfile.email} 
                    onChange={e => setDeptProfile({ ...deptProfile, email: e.target.value })} 
                  />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Office Phone Number</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={deptProfile.phone} 
                    onChange={e => setDeptProfile({ ...deptProfile, phone: e.target.value })} 
                  />
                </div>

                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Office Location</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={deptProfile.location} 
                    onChange={e => setDeptProfile({ ...deptProfile, location: e.target.value })} 
                  />
                </div>

                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Department Description</label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    value={deptProfile.description} 
                    onChange={e => setDeptProfile({ ...deptProfile, description: e.target.value })} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* EVENT PREFERENCES */}
          {activeTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Department Event Preferences</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Workflow defaults and approval policies for {effectiveDepartment} events.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={eventPrefs.requireApproval} 
                    onChange={e => setEventPrefs({ ...eventPrefs, requireApproval: e.target.checked })} 
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>Require HOD Registration Approval</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Require explicit HOD approval before confirming student registrations.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={eventPrefs.requireCoordinatorSignoff} 
                    onChange={e => setEventPrefs({ ...eventPrefs, requireCoordinatorSignoff: e.target.checked })} 
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>Require Faculty Coordinator Event Report</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Require event completion reports from faculty before archiving events.</div>
                  </div>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Default Event Category</label>
                    <select 
                      className="input-field" 
                      value={eventPrefs.defaultCategory} 
                      onChange={e => setEventPrefs({ ...eventPrefs, defaultCategory: e.target.value })}>
                      <option value="Technical Workshop">Technical Workshop</option>
                      <option value="Hackathon">Hackathon</option>
                      <option value="Guest Lecture">Guest Lecture</option>
                      <option value="Cultural Fest">Cultural Fest</option>
                      <option value="Symposium">Symposium</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Default Event Duration</label>
                    <select 
                      className="input-field" 
                      value={eventPrefs.defaultDuration} 
                      onChange={e => setEventPrefs({ ...eventPrefs, defaultDuration: e.target.value })}>
                      <option value="Half Day">Half Day (3 Hours)</option>
                      <option value="1 Day">1 Full Day</option>
                      <option value="2 Days">2 Days Workshop</option>
                      <option value="3 Days">3 Days Bootcamp</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ATTENDANCE POLICY */}
          {activeTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Department Attendance Policy</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Attendance thresholds and certificate eligibility rules for {effectiveDepartment}.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-group" style={{ maxWidth: '300px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Low Attendance Warning Threshold (%)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    min="50" 
                    max="100" 
                    value={attendancePrefs.lowThreshold} 
                    onChange={e => setAttendancePrefs({ ...attendancePrefs, lowThreshold: parseInt(e.target.value) || 75 })} 
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Events with attendance below this % will trigger HOD alert.</span>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={attendancePrefs.allowManualAttendance} 
                    onChange={e => setAttendancePrefs({ ...attendancePrefs, allowManualAttendance: e.target.checked })} 
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>Allow Faculty Manual Attendance Override</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Permit faculty coordinators to manually mark attendance for network issues.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={attendancePrefs.mandatoryAttendanceForCertificates} 
                    onChange={e => setAttendancePrefs({ ...attendancePrefs, mandatoryAttendanceForCertificates: e.target.checked })} 
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>Mandatory Attendance for Certificate Generation</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Only issue certificates to students marked 'Present' at events.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* DEPARTMENT COORDINATORS */}
          {activeTab === 'coordinators' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{effectiveDepartment} Department Coordinators</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Faculty coordinators assigned to handle {effectiveDepartment} department events.
                </p>
              </div>

              {loadingCoordinators ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 1rem' }} />
                  Loading department coordinators...
                </div>
              ) : (
                <div className="responsive-table-wrapper" style={{ border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-tertiary)' }}>
                      <tr>
                        <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Faculty Name</th>
                        <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Email Address</th>
                        <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Role / Title</th>
                        <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coordinators.length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No coordinators found for {effectiveDepartment}</td></tr>
                      ) : (
                        coordinators.map(c => (
                          <tr key={c.user_id || c.id || Math.random()} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <td style={{ padding: '1rem', fontWeight: '600' }}>{c.full_name || c.username || 'N/A'}</td>
                            <td style={{ padding: '1rem' }}>{c.email || '--'}</td>
                            <td style={{ padding: '1rem' }}>{c.designation || c.role || 'Coordinator'}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                                {effectiveDepartment}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATION PREFERENCES */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Department Notification Preferences</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Choose which alerts and emails to receive for {effectiveDepartment} events.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={notificationPrefs.newEventAlert} 
                    onChange={e => setNotificationPrefs({ ...notificationPrefs, newEventAlert: e.target.checked })} 
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>New Department Event Alerts</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive notification when a coordinator submits a new event.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={notificationPrefs.registrationAlert} 
                    onChange={e => setNotificationPrefs({ ...notificationPrefs, registrationAlert: e.target.checked })} 
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>Student Registration Summary Alerts</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Daily email digests for student registration milestones.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={notificationPrefs.lowAttendanceAlert} 
                    onChange={e => setNotificationPrefs({ ...notificationPrefs, lowAttendanceAlert: e.target.checked })} 
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>Low Attendance Warnings</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Immediate notification when department event attendance drops below target.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* REPORT DEFAULTS */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Report Preferences</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Default export settings and parameters for {effectiveDepartment} department reports.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Default Academic Year</label>
                  <select 
                    className="input-field" 
                    value={reportPrefs.defaultAcademicYear} 
                    onChange={e => setReportPrefs({ ...reportPrefs, defaultAcademicYear: e.target.value })}>
                    <option value="2026-27">2026–27</option>
                    <option value="2025-26">2025–26</option>
                    <option value="2024-25">2024–25</option>
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Default Export Format</label>
                  <select 
                    className="input-field" 
                    value={reportPrefs.defaultExportFormat} 
                    onChange={e => setReportPrefs({ ...reportPrefs, defaultExportFormat: e.target.value })}>
                    <option value="PDF">PDF Document</option>
                    <option value="CSV">CSV Spreadsheet</option>
                    <option value="Excel">Excel Workbook</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SUPER ADMIN GENERAL INFO */}
          {!isHOD && activeTab === 'general' && (
            <>
              <div>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>General Information</h3>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div className="input-group">
                    <label>College/Institution Name</label>
                    <input type="text" className="input-field" defaultValue="BVC Engineering College" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="input-group">
                      <label>Default Academic Year</label>
                      <select className="input-field">
                        <option>2026-2027</option>
                        <option>2025-2026</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Timezone</label>
                      <select className="input-field">
                        <option>Asia/Kolkata (IST)</option>
                        <option>UTC</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SUPER ADMIN DEPARTMENTS */}
          {!isHOD && activeTab === 'departments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Manage Departments</h3>
                <button 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '36px' }}
                  onClick={() => setIsDeptModalOpen(true)}
                >
                  <Plus size={16} /> Create Department
                </button>
              </div>

              {loadingDepts ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 1rem' }} />
                  Loading departments...
                </div>
              ) : (
                <div className="responsive-table-wrapper" style={{ border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-tertiary)' }}>
                      <tr>
                        <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Code</th>
                        <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Name</th>
                        <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>HOD ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.length === 0 ? (
                        <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No departments found</td></tr>
                      ) : (
                        departments.map(d => (
                          <tr key={d.department_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <td style={{ padding: '1rem' }}>{d.department_id}</td>
                            <td style={{ padding: '1rem' }}>{d.department_name}</td>
                            <td style={{ padding: '1rem' }}>{d.hod_id || 'Unassigned'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUPER ADMIN EVENT CONFIGURATION */}
          {!isHOD && activeTab === 'events_config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Global Event Configuration</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Institution-wide approval rules, registration limits, and event categories.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} />
                  <div>
                    <div style={{ fontWeight: '600' }}>Require Principal Approval for Inter-College Events</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Require explicit Principal signoff before publishing multi-college hackathons or fests.</div>
                  </div>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Maximum Student Registrations per Event</label>
                    <input type="number" className="input-field" defaultValue={500} />
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Default Event Duration</label>
                    <select className="input-field" defaultValue="1 Day">
                      <option value="Half Day">Half Day</option>
                      <option value="1 Day">1 Day</option>
                      <option value="2 Days">2 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUPER ADMIN ATTENDANCE RULES */}
          {!isHOD && activeTab === 'attendance_config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Institutional Attendance Rules</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  College-wide QR scanning rules, duplicate prevention, and low attendance thresholds.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-group" style={{ maxWidth: '320px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>College Low Attendance Warning Threshold (%)</label>
                  <input type="number" className="input-field" defaultValue={75} min={50} max={100} />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent-blue)' }} />
                  <div>
                    <div style={{ fontWeight: '600' }}>Strict QR Code Duplicate Scan Prevention</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Prevent same student QR from being scanned twice within 5 minutes.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* SUPER ADMIN SECURITY & AUDIT LOGS */}
          {!isHOD && activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Security & Audit Logs</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Recent institutional administrative actions and system security events.
                </p>
              </div>

              <div className="responsive-table-wrapper" style={{ border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg-tertiary)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>User</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Role</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Action</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>{new Date().toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Super Admin / Principal</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>SuperAdmin</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Updated System Settings</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#22c55e', fontWeight: '600', fontSize: '0.85rem' }}>✓ Success</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUPER ADMIN BRANDING */}
          {!isHOD && activeTab === 'branding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>College Branding & Theme</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Institution logo, portal titles, and report header branding.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Portal Header Title</label>
                  <input type="text" className="input-field" defaultValue="BVC Event Management System (BVC EMS)" />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Report Footer Subtitle</label>
                  <input type="text" className="input-field" defaultValue="BVC Engineering College | Autonomous Institution" />
                </div>
              </div>
            </div>
          )}

          {/* SUPER ADMIN DANGER ZONE */}
          {!isHOD && activeTab === 'danger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #fecaca', padding: '1.5rem', borderRadius: '12px', background: '#fff5f5' }}>
              <div style={{ borderBottom: '1px solid #fca5a5', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#dc2626' }}>⚠️ Danger Zone</h3>
                <p style={{ color: '#991b1b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Sensitive administrative actions. Use extreme caution.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#991b1b' }}>Clear System Cache</div>
                  <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>Clear cached session state and reload dropdown options across modules.</div>
                </div>
                <button onClick={() => alert("System cache cleared successfully.")} className="btn btn-secondary" style={{ borderColor: '#fca5a5', color: '#dc2626' }}>
                  Clear Cache
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {isDeptModalOpen && (
        <CreateDepartmentModal 
          isOpen={isDeptModalOpen}
          onClose={() => setIsDeptModalOpen(false)}
          onDepartmentCreated={fetchDepartments}
        />
      )}
    </div>
  );
}

