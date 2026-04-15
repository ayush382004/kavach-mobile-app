import { useState } from 'react';
import { Link } from 'react-router-dom';
import { weatherAPI, claimsAPI } from '../../utils/api.js';
import { useSensors } from '../../hooks/useSensors.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import BottomNav from '../../components/BottomNav.jsx';
import { getCurrentCoordinates, reverseGeocodeIndia } from '../../utils/location.js';

const STEPS = ['Check Weather', 'Sensors', 'AI Verifying', 'Result'];
// Threshold is now dynamic based on location and season

export default function ClaimPage() {
  const { user, refreshUser } = useAuth();
  const { collectSensorData, loading: sensorLoading } = useSensors();

  const [step, setStep] = useState(0);
  const [weather, setWeather] = useState(null);
  const [sensors, setSensors] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isInsured = user?.isInsured && user?.premiumUntil && new Date() < new Date(user.premiumUntil);

  // India bounding box
  const isInsideIndia = (lat, lng) =>
    lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;

  // State match check (normalize comparison)
  const normalizeState = (s) => (s || '').toLowerCase().trim();

  const checkWeather = async () => {
    setChecking(true); setError('');
    try {
      const query = { city: user?.city || 'Jaipur', state: user?.state || '' };
      try {
        const coordsData = await getCurrentCoordinates();

        // ── RULE 1: Block if outside India ──
        if (!isInsideIndia(coordsData.latitude, coordsData.longitude)) {
          setError(
            '🌍 Claims can only be filed from within India. Your current GPS location is outside India. Please return to India to file a claim.'
          );
          setChecking(false);
          return;
        }

        const place = await reverseGeocodeIndia(coordsData.latitude, coordsData.longitude).catch(() => null);
        const coords = { lat: coordsData.latitude, lng: coordsData.longitude };
        setSensors(prev => ({ ...prev, _coords: coords }));
        query.lat = coords.lat;
        query.lng = coords.lng;
        if (place?.city) query.city = place.city;
        if (place?.state) query.state = place.state;

        // ── RULE 2: Detect state change ──
        if (place?.state && normalizeState(place.state) !== normalizeState(user?.state)) {
          setError(
            `📍 You appear to be in ${place.state}, but your insurance was registered for ${user?.state}. ` +
            `State-based coverage does not transfer automatically. Please go to Dashboard → Deactivate → Re-activate ` +
            `to get coverage for your new state (pricing may differ).`
          );
          setChecking(false);
          return;
        }
      } catch { /* GPS unavailable — use registered city, server-side check still applies */ }

      try {
        const { data } = await weatherAPI.getHeatwave(query);
        setWeather(data);
        setStep(1);
      } catch (err) {
        // Server is down or weather unavailable — do NOT fall back to client-side data
        // (allows fraud: user in cold room, spoof warm city weather from unrestricted API)
        const msg = err.response?.data?.error || 'Weather service unavailable. Please check your internet connection and try again.';
        setError(msg);
      }
    } catch (err) { setError(err.response?.data?.error || err.message || 'Could not fetch weather. Check internet connection.'); }
    finally { setChecking(false); }
  };

  const collectSensors = async () => {
    setError('');
    try {
      const data = await collectSensorData();
      setSensors(prev => ({ ...prev, ...data }));
      setStep(2); await submitClaim(data);
    } catch (err) { setError(err.message || 'Failed to collect sensor data'); }
  };

  const submitClaim = async (sensorData) => {
    setSubmitting(true); setError('');
    try {
      const locationData = sensorData?.location || { lat: 26.9124, lng: 75.7873 };
      const payload = {
        location: { lat: locationData.lat, lng: locationData.lng, accuracy: locationData.accuracy, city: weather?.city, state: user?.state },
        weather: { ambientTemp: weather.temperature, feelsLike: weather.feelsLike, humidity: weather.humidity, windSpeed: weather.windSpeed, condition: weather.condition, city: weather.city, weatherIcon: weather.weatherIcon },
        sensorData: { ...sensorData, collectedAt: sensorData?.collectedAt },
      };

      const { data } = await claimsAPI.submit(payload);
      setResult(data); setStep(3); await refreshUser();
    } catch (err) {
      const msg = err.response?.data?.error || 'Claim submission failed';
      setError(msg);
      if (err.response?.status === 403) setStep(0);
      else { setStep(3); setResult({ error: msg }); }
    } finally { setSubmitting(false); }
  };

  const reset = () => { setStep(0); setWeather(null); setSensors(null); setResult(null); setError(''); };

  return (
    <div className="phone-screen">
      <div className="page-content">
      <div style={{ padding: '24px 20px 10px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>File Claim</h1>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>AI verifies you're outdoors</div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {!isInsured ? (
          <div className="glass fade-up" style={{ padding: 20 }}>
             <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
             <div style={{ fontSize: 16, fontWeight: 800, color: '#f87171' }}>Insurance Not Active</div>
             <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, marginBottom: 16 }}>You need active Kavach coverage to file a claim.</div>
             <Link to="/dashboard" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>Activate Coverage →</Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ height: 4, borderRadius: 2, background: i <= step ? '#f97316' : 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: i === step ? '#f97316' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{s}</span>
                </div>
              ))}
            </div>

            {error && <div className="glass" style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>⚠ {error}</div>}

            {step === 0 && (
              <div className="glass fade-up" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>🌡️</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Check Heatwave</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, marginBottom: 20 }}>We'll verify temperature at your live location before sending the claim.</p>
                {user?.city && <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '6px 12px', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>📍 {user.city}, {user.state}</div>}
                <button onClick={checkWeather} disabled={checking} className="btn-primary" style={{ width: '100%', opacity: checking ? 0.6 : 1 }}>
                  {checking ? 'Checking…' : 'Check Weather'}
                </button>
              </div>
            )}

            {step === 1 && weather && (
              <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="glass fade-up" style={{
                    padding: '24px',
                    borderRadius: '28px',
                    background: weather.isHeatwave 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%)' 
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    border: weather.isHeatwave ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: weather.isHeatwave ? '0 8px 32px rgba(239, 68, 68, 0.2)' : '0 8px 32px rgba(0, 0, 0, 0.2)',
                    minHeight: '220px', // Prevent layout shift
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Animated background glow */}
                    <div style={{
                      position: 'absolute', top: -50, right: -50, width: 150, height: 150,
                      background: weather.isHeatwave ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.1)',
                      filter: 'blur(40px)', borderRadius: '50%', pointerEvents: 'none'
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                      <div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>📍</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>
                              {weather.city?.toUpperCase()}
                            </span>
                         </div>
                         <div style={{ fontSize: 56, fontWeight: 900, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1, letterSpacing: '-0.02em' }}>
                           {weather.temperature.toFixed(1)}°
                         </div>
                         <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 500 }}>
                           Feels like {weather.feelsLike?.toFixed(1)}° · {weather.condition}
                         </div>
                      </div>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '10px',
                        backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)',
                        width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {weather.weatherIcon ? (
                          <img 
                            src={weather.weatherIcon} 
                            alt={weather.condition} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.5))' }} 
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://openweathermap.org/img/wn/01d@4x.png'; }}
                          />
                        ) : (
                          <div style={{ fontSize: 44, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }}>
                            {weather.isHeatwave ? '🔥' : '☀️'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 24, zIndex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>INTENSITY GAUGE</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: weather.isHeatwave ? '#f87171' : '#38bdf8' }}>
                            {weather.isHeatwave ? 'CRITICAL' : 'BELOW THRESHOLD'}
                          </span>
                       </div>
                       <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min((weather.temperature / weather.heatwaveThreshold) * 100, 100)}%`,
                            background: weather.isHeatwave 
                              ? 'linear-gradient(90deg, #f97316, #ef4444)' 
                              : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                            borderRadius: 5,
                            transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }} />
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                          <span>0°C</span>
                          <span>STATE TRIGGER: {weather.heatwaveThreshold}°C</span>
                       </div>
                    </div>

                    {weather.isHeatwave ? (
                      <div className="fade-up" style={{ 
                        marginTop: 20, padding: '14px', borderRadius: '16px', 
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        display: 'flex', alignItems: 'center', gap: 12
                      }}>
                        <div style={{ fontSize: 24 }}>💸</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(239, 68, 68, 0.6)', textTransform: 'uppercase' }}>Eligible Payout</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>₹{weather.payoutAmount} <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>Immediate Credit</span></div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        marginTop: 20, padding: '14px', borderRadius: '16px', 
                        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.5
                      }}>
                         It is currently <span style={{ color: '#fff', fontWeight: 700 }}>{weather.temperature}°C</span>. 
                         Kavach protection triggers at <span style={{ color: '#fff', fontWeight: 700 }}>{weather.heatwaveThreshold}°C</span> for your state.
                      </div>
                    )}
                  </div>

                <div style={{ display: 'flex', gap: 10 }}>
                   <button onClick={reset} className="btn-secondary" style={{ flex: 1 }}>← Back to Check</button>
                </div>

                {weather.isHeatwave && (
                  <div className="glass" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Verify Outdoors</h3>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, marginBottom: 16 }}>Our Sentry AI will check device sensors (temp, network, brightness) to confirm you're working outside.</p>
                    <button onClick={collectSensors} disabled={sensorLoading} className="btn-primary" style={{ width: '100%', opacity: sensorLoading ? 0.6 : 1 }}>
                      {sensorLoading ? 'Reading Sensors…' : 'Collect Data & Submit'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="glass fade-up" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', border: '4px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Sentry AI Verifying…</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Analyzing battery temp, GPS jitter, and hardware signals.</p>
              </div>
            )}

            {step === 3 && result && (
              <div className="fade-up">
                {result.error ? (
                  <div className="glass" style={{ textAlign: 'center', padding: '40px 20px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                    <div style={{ fontSize: 50, marginBottom: 12 }}>❌</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#f87171' }}>Claim Failed</div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8, marginBottom: 20 }}>{result.error}</p>
                    <button onClick={reset} className="btn-secondary">Try Again</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{
                      textAlign: 'center', padding: '30px 20px', borderRadius: 24,
                      background: result.claim?.status === 'approved' || result.claim?.status === 'paid' ? 'rgba(74,222,128,0.1)' : result.claim?.status === 'flagged' ? 'rgba(250,204,21,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${result.claim?.status === 'approved' || result.claim?.status === 'paid' ? 'rgba(74,222,128,0.3)' : result.claim?.status === 'flagged' ? 'rgba(250,204,21,0.3)' : 'rgba(239,68,68,0.3)'}`
                    }}>
                      <div style={{ fontSize: 50, marginBottom: 12 }}>{result.claim?.status === 'approved' || result.claim?.status === 'paid' ? '✅' : result.claim?.status === 'flagged' ? '🔍' : '❌'}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Sora',sans-serif", color: result.claim?.status === 'approved' || result.claim?.status === 'paid' ? '#4ade80' : result.claim?.status === 'flagged' ? '#facc15' : '#f87171' }}>
                        {result.claim?.status === 'approved' || result.claim?.status === 'paid' ? `₹${result.claim.payoutAmount} Credited!` : result.claim?.status === 'flagged' ? 'Under Review' : 'Claim Denied'}
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>{result.message}</p>
                    </div>

                    {result.claim?.fraudScore !== undefined && (
                      <div className="glass" style={{ padding: 20 }}>
                         <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 12 }}>AI Fraud Analysis</div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                           <span style={{ color: 'rgba(255,255,255,0.5)' }}>Legitimacy Score</span>
                           <span style={{ color: '#fff', fontWeight: 800 }}>{100 - result.claim.fraudScore}%</span>
                         </div>
                         <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                           <div style={{ height: '100%', background: result.claim.fraudScore < 40 ? '#4ade80' : result.claim.fraudScore < 70 ? '#facc15' : '#f87171', width: `${100 - result.claim.fraudScore}%` }} />
                         </div>
                      </div>
                    )}
                    <button onClick={reset} className="btn-secondary">File Another</button>
                    <Link to="/wallet" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>View Wallet</Link>
                  </div>
                )}
              </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </div>
      </div>
      <BottomNav />
    </div>
  );
}


function getWeatherCodeLabel(code) {
  const labels = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Rain',
    65: 'Heavy rain',
    80: 'Rain showers',
    81: 'Rain showers',
    82: 'Heavy showers',
    95: 'Thunderstorm',
  };

  return labels[code] || 'Clear';
}
