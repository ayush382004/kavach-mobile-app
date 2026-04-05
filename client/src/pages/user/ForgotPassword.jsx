import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api.js';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = phone, 2 = otp & new password
  const [form, setForm] = useState({ phone: '', otp: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mockOtp, setMockOtp] = useState(null);
  
  const phoneRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { phoneRef.current?.focus(); }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (form.phone.length < 10) return setError('Enter a valid 10-digit number');
    setError(''); setLoading(true);
    try {
      const { data } = await authAPI.forgotPassword(form.phone);
      if (data.mock) setMockOtp(data._mock_otp);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (form.otp.length < 6) return setError('Enter a valid 6-digit OTP');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setError(''); setLoading(true);
    try {
      await authAPI.verifyReset({ phone: form.phone, otp: form.otp, password: form.password });
      alert('Password reset successfully! You can now login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-screen" style={{ justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ position: 'fixed', top: -100, right: -100, width: 350, height: 350, background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      
      <div className="fade-up" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px', border: '2px solid rgba(249,115,22,0.35)',
            background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(249,115,22,0.2)', overflow: 'hidden'
          }}>
            <img src="/logo.png" alt="Kavach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>Reset Password</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Recover access to your Kavach Shield</div>
        </div>

        <div className="glass" style={{ padding: '28px 24px' }}>
          {error && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, fontSize: 13, color: '#f87171', fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>MOBILE NUMBER</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>+91</span>
                  <input ref={phoneRef} type="tel" inputMode="numeric" value={form.phone} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setForm(f => ({ ...f, phone: v })); }} placeholder="9876543210" className="input-field" style={{ paddingLeft: 44 }} maxLength={10} required />
                </div>
              </div>
              <button type="submit" disabled={loading || form.phone.length < 10} className="btn-primary" style={{ marginTop: 8, width: '100%', opacity: form.phone.length < 10 ? 0.5 : 1 }}>
                {loading ? 'Sending OTP…' : 'Send OTP via SMS →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mockOtp && (
                <div style={{ padding: 12, background: 'rgba(249,115,22,0.1)', color: '#f97316', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  [Mock Mode] Use OTP: {mockOtp}
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>ENTER 6-DIGIT OTP</label>
                <input type="tel" inputMode="numeric" value={form.otp} onChange={e => setForm(f => ({ ...f, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="123456" className="input-field" maxLength={6} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>NEW PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="New password (min 6)" className="input-field" style={{ paddingRight: 48 }} required minLength={6} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.5 }}>{showPass ? '🙈' : '👁'}</button>
                </div>
              </div>
              <button type="submit" disabled={loading || form.otp.length < 6 || form.password.length < 6} className="btn-primary" style={{ marginTop: 8, width: '100%' }}>
                {loading ? 'Processing…' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="btn-secondary" style={{ width: '100%' }}>← Back</button>
            </form>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
          Remember your password? <Link to="/login" style={{ color: '#f97316', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
        </div>
      </div>
    </div>
  );
}
