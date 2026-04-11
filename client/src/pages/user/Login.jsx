/**
 * Login Page — KavachForWork
 * Phone-native dark glassmorphism UI
 * Fast location grab + fixed auth flow
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function Login() {
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [locStatus, setLocStatus] = useState('idle'); // idle | grabbing | done | denied
  const [coords, setCoords] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const phoneRef = useRef(null);

  // Auto-grab location on mount for fast location verification
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocStatus('grabbing');
    const watcher = navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus('done');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    );
    return () => {};
  }, []);

  useEffect(() => { phoneRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.phone.length < 10) { setError('Enter a valid 10-digit number'); return; }
    setError('');
    setLoading(true);
    try {
      const payload = { phone: form.phone, password: form.password };
      if (coords) { payload.lat = coords.lat; payload.lng = coords.lng; }
      const { data } = await authAPI.login(payload);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Login failed. Check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const locIcon = {
    idle: '📍',
    grabbing: '🔄',
    done: '✅',
    denied: '⚠️',
  }[locStatus];
  const locText = {
    idle: 'Location pending',
    grabbing: 'Getting location…',
    done: `Location verified`,
    denied: 'Location denied (optional)',
  }[locStatus];

  return (
    <div className="phone-screen">
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
        {/* Background glows */}
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80, width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div className="fade-up" style={{ width: '100%', maxWidth: 400, margin: 'auto' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
              border: '2px solid rgba(249,115,22,0.35)',
              background: 'rgba(249,115,22,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(249,115,22,0.2)',
              overflow: 'hidden',
            }}>
              <img src="/logo.png" alt="Kavach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>
              Welcome back
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Sign in to your Kavach Shield
            </div>
          </div>

          {/* Location pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 40, padding: '8px 16px',
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 14, animation: locStatus === 'grabbing' ? 'spin 1s linear infinite' : 'none' }}>
              {locIcon}
            </span>
            <span style={{ fontSize: 12, color: locStatus === 'done' ? '#4ade80' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              {locText}
            </span>
            {locStatus === 'denied' && (
              <button
                onClick={() => {
                  setLocStatus('grabbing');
                  navigator.geolocation.getCurrentPosition(
                    pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus('done'); },
                    () => setLocStatus('denied'),
                    { timeout: 5000 }
                  );
                }}
                style={{ marginLeft: 'auto', fontSize: 11, color: '#f97316', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Retry
              </button>
            )}
          </div>

          {/* Glass Card Form */}
          <div className="glass" style={{ padding: '28px 24px' }}>
            {error && (
              <div style={{
                marginBottom: 16, padding: '12px 14px',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 14, fontSize: 13, color: '#f87171', fontWeight: 600,
              }}>
                ⚠ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Phone */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  MOBILE NUMBER
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                  }}>
                    +91
                  </span>
                  <input
                    ref={phoneRef}
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setForm(f => ({ ...f, phone: v }));
                    }}
                    placeholder="9876543210"
                    className="input-field"
                    style={{ paddingLeft: 44 }}
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter password"
                    className="input-field"
                    style={{ paddingRight: 48 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 16, opacity: 0.5,
                    }}
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading || form.phone.length < 10}
                className="btn-primary"
                style={{
                  marginTop: 8, width: '100%',
                  opacity: form.phone.length < 10 ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite', display: 'inline-block',
                    }} />
                    Signing in…
                  </>
                ) : (
                  <>Sign In →</>
                )}
              </button>
              <div style={{ textAlign: 'right', marginTop: -4 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600 }}>
                  Forgot Password?
                </Link>
              </div>
            </form>
          </div>

          {/* Register link */}
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            New to Kavach?{' '}
            <Link to="/register" style={{ color: '#f97316', fontWeight: 700, textDecoration: 'none' }}>
              Get covered →
            </Link>
          </div>

          {/* Admin link */}
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            <Link to="/admin/login" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
