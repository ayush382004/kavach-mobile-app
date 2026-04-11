import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import StatusPopup from '../../components/StatusPopup.jsx';
import TermsModal from '../../components/TermsModal.jsx';
import { INDIAN_STATES, canonicalizeState, resolvePricing } from '../../utils/pricing.js';
import { getCurrentCoordinates, reverseGeocodeIndia, statesMatch } from '../../utils/location.js';
import { useSensors } from '../../hooks/useSensors.js';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    workerType: 'delivery_driver',
    city: '',
    state: 'Rajasthan',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [deviceSynced, setDeviceSynced] = useState(false);
  const [syncingTerms, setSyncingTerms] = useState(false);
  const [termsSyncError, setTermsSyncError] = useState('');
  const [toast, setToast] = useState(null);
  const [locationVerification, setLocationVerification] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const { collectSensorData } = useSensors();
  const { login } = useAuth();
  const navigate = useNavigate();
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const pricing = useMemo(() => resolvePricing(form.state, form.city), [form.city, form.state]);
  const detectedState = locationVerification?.detectedState || '';
  const locationMatched = !!detectedState && statesMatch(form.state, detectedState);

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    window.setTimeout(() => setToast(null), 2500);
  };

  const setField = (field) => (event) => {
    let val = event.target.value;
    if (field === 'phone') val = val.replace(/\D/g, '').slice(0, 10);
    setForm((current) => ({ ...current, [field]: val }));
    if (field === 'state') {
      setTermsAccepted(false);
      setDeviceSynced(false);
      setLocationVerification(null);
    }
  };

  const runLiveVerification = async () => {
    setSyncingTerms(true);
    setTermsSyncError('');

    try {
      const coords = await getCurrentCoordinates();
      const resolved = await reverseGeocodeIndia(coords.latitude, coords.longitude);
      const supportedState = canonicalizeState(resolved.state) || canonicalizeState(form.state);
      const nextState = INDIAN_STATES.includes(supportedState) ? supportedState : form.state;
      const nextCity = (resolved.city || form.city || '').trim();

      setForm((current) => ({ ...current, state: nextState, city: nextCity }));

      setLocationVerification({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        detectedCity: nextCity,
        detectedState: supportedState,
        provider: resolved.city && resolved.state ? 'browser_geolocation' : 'browser_geolocation_manual_fallback',
        verifiedAt: new Date().toISOString(),
        formatted: resolved.formatted || [nextCity, supportedState].filter(Boolean).join(', '),
      });

      await collectSensorData({ requireLiveLocation: true });

      setDeviceSynced(true);
      showToast('Verification complete', 'Live location and device check completed.');
    } catch (err) {
      setDeviceSynced(false);
      setTermsSyncError(err.message || 'Verification failed.');
    } finally {
      setSyncingTerms(false);
    }
  };

  const submitRegistration = async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.register({
        name: form.name,
        phone: form.phone,
        password: form.password,
        workerType: form.workerType || 'delivery_driver',
        city: form.city,
        state: form.state,
        termsAccepted: true,
        locationVerification,
      });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? errs[0].msg : err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.phone.length < 10) return setError('Enter a valid 10-digit number');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (!form.city.trim()) return setError('Please enter your city.');

    // Open terms modal — live verification is encouraged but not a hard block
    // State mismatch at registration is warned about but only enforced at claim time
    if (!termsAccepted) {
      setTermsOpen(true);
      return;
    }
    await submitRegistration();
  };

  return (
    <div className="phone-screen">
      <StatusPopup toast={toast} />

      <TermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setTermsAccepted(true);
          setTermsOpen(false);
          showToast('Terms accepted', 'You can now create your account.');
          submitRegistration();
        }}
        selectedState={form.state}
        detectedLocation={locationVerification}
        locationMatched={locationMatched}
        syncing={syncingTerms}
        syncError={termsSyncError}
        onRunSync={runLiveVerification}
        syncReady={deviceSynced && !!locationVerification}
      />

      <div className="page-content">
        <div className="fade-up" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
              border: '2px solid rgba(249,115,22,0.35)',
              background: 'rgba(249,115,22,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(249,115,22,0.2)',
              overflow: 'hidden',
            }}>
              <img src="/logo.png" alt="Kavach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>
              Join Kavach
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Built for delivery and green field workers
            </div>
          </div>

          <div className="glass" style={{ padding: '24px 20px' }}>
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
              {/* Name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>FULL NAME</label>
                <input ref={nameRef} type="text" value={form.name} onChange={setField('name')} placeholder="Raju Kumar" className="input-field" required />
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>MOBILE NUMBER</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>+91</span>
                  <input type="tel" inputMode="numeric" value={form.phone} onChange={setField('phone')} placeholder="9876543210" className="input-field" style={{ paddingLeft: 44 }} maxLength={10} required />
                </div>
              </div>

              {/* City & State */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>STATE</label>
                  <select value={form.state} onChange={setField('state')} className="input-field">
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>CITY</label>
                  <input type="text" value={form.city} onChange={setField('city')} placeholder="City" className="input-field" required />
                </div>
              </div>

              {/* Dynamic Pricing Banner */}
              <div style={{
                background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 10, uppercase: true, letterSpacing: 1, color: 'rgba(255,255,255,0.4)' }}>{pricing.label} ZONE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Max Payout ₹{pricing.maxPayout}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, uppercase: true, letterSpacing: 1, color: 'rgba(255,255,255,0.4)' }}>PREMIUM</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>₹{pricing.weeklyPremium}/wk</div>
                </div>
              </div>

              {/* Passwords */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={setField('password')} placeholder="Min 6 characters" className="input-field" style={{ paddingRight: 48 }} required minLength={6} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.5 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <input type={showPass ? 'text' : 'password'} value={form.confirmPassword} onChange={setField('confirmPassword')} placeholder="Confirm password" className="input-field" required minLength={6} />
              </div>

              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                Terms are required. Live location sync is recommended before you continue.
              </div>

              <button type="submit" disabled={loading || form.phone.length < 10} className="btn-primary" style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <><span className="spinner" /> Creating…</> : <>Create Account →</>}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#f97316', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
