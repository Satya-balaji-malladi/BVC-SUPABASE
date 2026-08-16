import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/AuthService';
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await AuthService.requestOtp(identifier);
      setSuccess(response.message);
      
      if (response.masked_email) {
        setMaskedEmail(response.masked_email);
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await AuthService.resetPassword(identifier, otp, newPassword);
      setSuccess(response.message);
      setStep(4); // Success step
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' }}>
        
        <button 
          onClick={() => step > 1 && step < 4 ? setStep(step - 1) : navigate('/login')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#3b82f6' }}>
            <KeyRound size={32} />
          </div>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : step === 3 ? 'Set New Password' : 'Password Reset'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {step === 1 ? 'Enter your email or employee ID to receive a secure OTP.' : 
             step === 2 ? `Enter the OTP sent to ${maskedEmail || identifier}.` : 
             step === 3 ? 'Enter your new secure password.' : 
             'Your password has been successfully updated.'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {success && step < 4 && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {success}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} autoComplete="off">
            <div className="input-group">
              <label>Email or Employee ID</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.trim())}
                  className="input-field"
                  placeholder="Enter email or ID"
                  style={{ width: '100%', paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); if(otp.length === 6) setStep(3); else setError('Please enter a 6-digit OTP'); }} autoComplete="off">
            <div className="input-group">
              <label>6-Digit OTP</label>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                OTP sent to: <strong>{maskedEmail || identifier}</strong>
              </div>
              <input
                type="text"
                required
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="input-field"
                placeholder="000000"
                style={{ width: '100%', textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Continue
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} autoComplete="off">

            <div className="input-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="At least 8 characters"
                  style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Confirm new password"
                  style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Return to Login
            </button>
          </div>
        )}

      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
