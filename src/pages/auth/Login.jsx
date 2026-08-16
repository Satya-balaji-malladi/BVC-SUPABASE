import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthService from '../../services/AuthService';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';

export default function Login() {
  const [step, setStep] = useState(1); // 1: Identifier, 2: Password, 3: First Login OTP
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Show message if redirected due to expiry
  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
    }
  }, [location]);

  // Handle OTP cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCheckStatus = async (e) => {
    e.preventDefault();
    if (!identifier) return;
    
    setLoading(true);
    setError(null);
    try {
      const status = await AuthService.checkUserStatus(identifier);
      if (!status.exists) {
        throw new Error('User not found. Please check your Employee ID or Email.');
      }
      
      if (status.first_login) {
        setMaskedEmail(status.email);
        
        // Wait for OTP request
        const res = await AuthService.requestOtp(identifier);
        
        if (res.masked_email) {
          setMaskedEmail(res.masked_email);
        }
        
        setResendCooldown(60); // 60 seconds cooldown
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (err) {
      setError(err.message || 'Failed to verify user');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await AuthService.login(identifier, password);
      
      // Navigate to the originally requested URL, or dashboard
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });

    } catch (err) {
      setError(err.message || 'Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }
    
    setLoading(true);
    setError(null);
    try {
      // 1. Reset password via OTP. 
      // With the updated RPC, this now automatically returns a valid session token and logs the user in.
      await AuthService.resetPassword(identifier, otp, password);
      
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to setup password or invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQlFZ_2u0RaNZlfgwlsn7JNBCW34KxzENz6uT3fX7IuA&s=10" 
            alt="BVC Logo" 
            style={{ width: '70px', height: '70px', objectFit: 'contain', marginBottom: '0.75rem', borderRadius: '8px' }} 
          />
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            BVC EMS
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {step === 1 && "Sign in to access your dashboard"}
            {step === 2 && `Welcome back, ${identifier}`}
            {step === 3 && "First time setup"}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* STEP 1: IDENTIFIER */}
        {step === 1 && (
          <form onSubmit={handleCheckStatus} autoComplete="off">
            <div className="input-group">
              <label>Employee ID or Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.trim())}
                  className="input-field"
                  placeholder="Enter Employee ID (Roll No) or Email"
                  style={{ width: '100%', paddingLeft: '2.75rem' }}
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !identifier}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: PASSWORD LOGIN */}
        {step === 2 && (
          <form onSubmit={handleLogin} autoComplete="off">
            <div className="input-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Password</span>
                <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }} style={{ color: 'var(--accent-blue)', fontSize: '0.875rem', textDecoration: 'none' }}>Forgot password?</a>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your password"
                  style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                  autoComplete="new-password"
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !password}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button 
                type="button" 
                onClick={() => { setStep(1); setPassword(''); setError(null); setIdentifier(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
              >
                Sign in with a different account
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: FIRST LOGIN OTP & SETUP */}
        {step === 3 && (
          <form onSubmit={handleSetupPassword} autoComplete="off">
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <ShieldCheck size={20} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-blue)', fontSize: '0.875rem' }}>First Login Verification</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  We've sent a 6-digit OTP to <strong>{maskedEmail}</strong>. Please enter it below to verify your identity and set your password.
                </p>
              </div>
            </div>

            <div className="input-group">
              <label>Enter OTP</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  className="input-field"
                  placeholder="000000"
                  style={{ width: '100%', paddingLeft: '2.75rem', letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 'bold' }}
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group">
              <label>Set New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="At least 6 characters"
                  style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                  autoComplete="new-password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="input-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Re-enter your password"
                  style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !otp || !password || !confirmPassword}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  Set Password & Login
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button 
                type="button" 
                disabled={resendCooldown > 0}
                onClick={async () => {
                  try {
                    const res = await AuthService.requestOtp(identifier);
                    setError(null);
                    setResendCooldown(60);
                  } catch(e) {
                    setError(e.message || "Failed to resend OTP");
                  }
                }}
                style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-blue)', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
              <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>|</span>
              <button 
                type="button" 
                onClick={() => { setStep(1); setPassword(''); setConfirmPassword(''); setOtp(''); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
              >
                Back
              </button>
            </div>
          </form>
        )}
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
