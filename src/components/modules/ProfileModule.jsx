import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Save, User, Mail, Briefcase, Hash, Phone, Shield, Loader2, Key, Calendar } from 'lucide-react';
import { getActiveInvolvements } from '../../services/activityService';
import SessionService from '../../services/SessionService';

export default function ProfileModule({ userRole }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activityData, setActivityData] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    phone_number: '',
    title_designation: '',
    department: '',
    employee_id: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      let cachedUser = null;
      const sessionStr = localStorage.getItem('custom_auth_session');
      if (sessionStr) {
        try {
          cachedUser = JSON.parse(sessionStr).user;
        } catch(e) {}
      }
      
      if (!cachedUser) {
        cachedUser = SessionService.getUser();
      }

      if (cachedUser) {
        const userId = cachedUser.user_id || cachedUser.id;

        let data = null;
        let activeUsersMap = new Map();

        try {
          const [{ data: uData }, { activeUsers }] = await Promise.all([
            supabase.from('users').select('*').eq('user_id', userId).single(),
            getActiveInvolvements()
          ]);
          data = uData;
          activeUsersMap = activeUsers;
        } catch (e) {
          console.warn('Direct user query failed, fallback to cached User:', e);
        }

        const userInvolvements = 
          activeUsersMap.get(userId) || 
          activeUsersMap.get(cachedUser.email_address) || 
          activeUsersMap.get(cachedUser.username) || [];

        setActivityData({
          status: userInvolvements.length > 0 ? 'Active' : 'Inactive',
          events: userInvolvements
        });
        
        let profileData = data || cachedUser || {};
        
        // Ensure robust fallbacks for system users / super admin
        profileData = {
          ...profileData,
          username: profileData.username || cachedUser.username || 'SystemAdmin',
          first_name: profileData.first_name || cachedUser.first_name || (profileData.username || cachedUser.username || 'System'),
          last_name: profileData.last_name || cachedUser.last_name || (profileData.role || cachedUser.role || 'Admin'),
          email_address: profileData.email_address || profileData.email || cachedUser.email_address || cachedUser.email || 'satyabalajim@gmail.com',
          department: profileData.department || cachedUser.department || 'Administration / All',
          employee_id: profileData.employee_id || profileData.user_id || cachedUser.employee_id || cachedUser.user_id || 'ADMIN-001',
          title_designation: profileData.title_designation || (userRole === 'Super Admin' ? 'System Administrator & Principal' : 'Faculty Member'),
          phone_number: profileData.phone_number || profileData.mobile || cachedUser.phone_number || cachedUser.mobile || ''
        };
        
        // If employee_id or department is missing, try to fetch from faculty table
        if (!profileData.employee_id || !profileData.department) {
          try {
            let query = supabase.from('faculty').select('*');
            if (profileData.email_address) {
              query = query.eq('email', profileData.email_address);
            } else {
              query = query.eq('user_id', userId);
            }
            
            const { data: facultyData } = await query.maybeSingle();
            
            if (facultyData) {
              profileData = {
                ...profileData,
                first_name: profileData.first_name || facultyData.faculty_name?.split(' ')[0] || '',
                last_name: profileData.last_name || facultyData.faculty_name?.split(' ').slice(1).join(' ') || '',
                department: profileData.department || facultyData.department_id || '',
                employee_id: profileData.employee_id || facultyData.employee_id || '',
                title_designation: profileData.title_designation || facultyData.designation || '',
                phone_number: profileData.phone_number || facultyData.mobile || ''
              };
            }
          } catch (e) {
            console.warn("Could not fetch from faculty table", e);
          }
        }
        
        setProfile(profileData);
        setFormData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email_address: profileData.email_address || '',
          phone_number: profileData.phone_number || '',
          title_designation: profileData.title_designation || '',
          department: profileData.department || 'All',
          employee_id: profileData.employee_id || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      showMessage('Failed to load profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleDetailsChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    if (!profile) return;
    
    setSavingDetails(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email_address: formData.email_address,
          phone_number: formData.phone_number,
          title_designation: formData.title_designation
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      // Update local storage session cache if name/email changed
      const sessionStr = localStorage.getItem('custom_auth_session');
      if (sessionStr) {
        const sessionData = JSON.parse(sessionStr);
        sessionData.user.name = `${formData.first_name} ${formData.last_name}`.trim();
        sessionData.user.email = formData.email_address;
        localStorage.setItem('custom_auth_session', JSON.stringify(sessionData));
      }

      setProfile({ ...profile, ...formData });
      showMessage('Profile details updated successfully', 'success');
    } catch (err) {
      console.error('Error updating details:', err);
      showMessage(err.message || 'Failed to update details', 'error');
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!profile) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      // In this system, password_hash is stored in plain text or custom hash in the 'users' table
      // First verify current password
      const { data, error: verifyError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('user_id', profile.user_id)
        .single();

      if (verifyError || !data || data.password_hash !== passwordData.currentPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: passwordData.newPassword })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      showMessage('Password updated successfully', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Error updating password:', err);
      showMessage(err.message || 'Failed to update password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>My Account Profile</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your personal information and security credentials</p>
        </div>
      </div>

      {message.text && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '8px', 
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? '#22c55e' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Column: User Summary Card */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '320px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <User size={48} />
            </div>
            {activityData && (
              <span 
                style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                  width: '16px', 
                  height: '16px', 
                  background: activityData.status === 'Active' ? '#22c55e' : '#6b7280', 
                  border: '3px solid #fff', 
                  borderRadius: '50%' 
                }} 
                title={`Activity Status: ${activityData.status}`}
              ></span>
            )}
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {profile?.first_name} {profile?.last_name}
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {profile?.title_designation || 'Faculty Member'}
            </p>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {profile?.role || userRole}
            </div>
          </div>

          <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Username</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{profile?.username || '--'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Employee ID</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontFamily: 'monospace' }}>{profile?.employee_id || '--'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Department</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{profile?.department || '--'}</span>
            </div>
          </div>

          {/* Current Events Section */}
          <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ margin: '0', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} className="text-primary" /> Current Events
            </h4>
            {activityData?.events?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activityData.events.map((e, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{e.event_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Role: {e.role || 'Involved'}</span>
                      <span style={{ color: '#22c55e' }}>🟢 Active</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                Not currently involved in any active events.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Forms */}
        <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Personal Details Form */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} className="text-primary" style={{ color: '#3b82f6' }} />
              Personal Details
            </h3>
            
            <form onSubmit={saveDetails}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="input-group">
                  <label>First Name</label>
                  <input type="text" name="first_name" className="input-field" required value={formData.first_name} onChange={handleDetailsChange} />
                </div>
                <div className="input-group">
                  <label>Last Name</label>
                  <input type="text" name="last_name" className="input-field" required value={formData.last_name} onChange={handleDetailsChange} />
                </div>
                
                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" name="email_address" className="input-field" required value={formData.email_address} onChange={handleDetailsChange} />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone_number" className="input-field" placeholder="10-digit number" value={formData.phone_number} onChange={handleDetailsChange} />
                </div>
                
                <div className="input-group">
                  <label>Title / Designation</label>
                  <input type="text" name="title_designation" className="input-field" value={formData.title_designation} onChange={handleDetailsChange} />
                </div>
                <div className="input-group">
                  <label>Department</label>
                  <input type="text" className="input-field" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }} value={formData.department} disabled title="Contact Administrator to change department" />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={savingDetails} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {savingDetails ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {savingDetails ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Credentials Form */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} className="text-warning" style={{ color: '#f59e0b' }} />
              Security Credentials
            </h3>
            
            <form onSubmit={savePassword}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="input-group">
                  <label>Current Password</label>
                  <input type="password" name="currentPassword" className="input-field" required value={passwordData.currentPassword} onChange={handlePasswordChange} />
                </div>
                <div className="input-group">
                  <label>New Password</label>
                  <input type="password" name="newPassword" className="input-field" minLength={6} required value={passwordData.newPassword} onChange={handlePasswordChange} />
                </div>
                <div className="input-group">
                  <label>Confirm New Password</label>
                  <input type="password" name="confirmPassword" className="input-field" minLength={6} required value={passwordData.confirmPassword} onChange={handlePasswordChange} />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn" disabled={savingPassword} style={{ background: '#f59e0b', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
