import { useState } from 'react';
import { Link } from 'react-router-dom';
import { weatherAPI, claimsAPI } from '../../utils/api.js';
import { useSensors } from '../../hooks/useSensors.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import BottomNav from '../../components/BottomNav.jsx';
import { getCurrentCoordinates, reverseGeocodeIndia } from '../../utils/location.js';
import { resolvePricing } from '../../utils/pricing.js';

const STEPS = ['Check Weather', 'Sensors', 'AI Verifying', 'Result'];
const HEATWAVE_THRESHOLD = 45;

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

  const checkWeather = async () => {
    setChecking(true); setError('');
    try {
      const query = { city: user?.city || 'Jaipur', state: user?.state || '' };
      let localCoords = null;
      try {
        const coordsData = await getCurrentCoordinates();
        const place = await reverseGeocodeIndia(coordsData.latitude, coordsData.longitude).catch(() => null);
        const coords = { lat: coordsData.latitude, lng: coordsData.longitude };
        localCoords = coords;
        setSensors(prev => ({ ...prev, _coords: coords }));
        query.lat = coords.lat;
        query.lng = coords.lng;
        if (place?.city) query.city = place.city;
        if (place?.state) query.state = place.state;
      } catch { }

      try {
        const { data } = await weatherAPI.getHeatwave(query);
        setWeather(data);
        setStep(1);
      } catch {
        const fallback = await getClientWeatherFallback({
          lat: query.lat,
          lng: query.lng,
          city: query.city,
          state: query.state,
          coords: localCoords,
        });
        setWeather(fallback);
        setStep(1);
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
                <div style={{
                  padding: 24, borderRadius: 24,
                  background: weather.isHeatwave ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(249,115,22,0.15) 100%)' : 'rgba(255,255,255,0.05)',
                  border: weather.isHeatwave ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>📍 {weather.city}</div>
                      <div style={{ fontSize: 44, fontWeight: 900, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1 }}>{weather.temperature}°C</div>
                    </div>
                    {weather.weatherIcon ? <img src={weather.weatherIcon} alt="" style={{ width: 50, height: 50 }} /> : <div style={{ fontSize: 40 }}>☁️</div>}
                  </div>
                  {weather.isHeatwave ? (
                    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13, fontWeight: 500, marginTop: 16 }}>
                      🔥 Heatwave Detected! {weather.temperature}°C ≥ 45°C. Eligible Payout: ₹{weather.payoutAmount}.
                    </div>
                  ) : (
                    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 16 }}>
                      ℹ️ Temperature is {weather.temperature}°C. Claim requires ≥ 45°C.
                    </div>
                  )}
                </div>

                {weather.isHeatwave ? (
                  <div className="glass" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Verify Outdoors</h3>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, marginBottom: 16 }}>Our Sentry AI will check device sensors (temp, network, brightness) to confirm you're working outside.</p>
                    <button onClick={collectSensors} disabled={sensorLoading} className="btn-primary" style={{ width: '100%', opacity: sensorLoading ? 0.6 : 1 }}>
                      {sensorLoading ? 'Reading Sensors…' : 'Collect Data & Submit'}
                    </button>
                  </div>
                ) : <button onClick={reset} className="btn-secondary">← Try Again</button>}
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

async function getClientWeatherFallback({ lat, lng, city, state, coords }) {
  let targetLat = lat;
  let targetLng = lng;
  let resolvedCity = city || 'Jaipur';

  if (!targetLat || !targetLng) {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city || 'Jaipur')}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geocodeUrl);
    if (!geoResponse.ok) throw new Error('Weather API unavailable. Try again.');

    const geoData = await geoResponse.json();
    const match = geoData?.results?.[0];
    if (!match) throw new Error('Could not verify weather for this location.');

    targetLat = match.latitude;
    targetLng = match.longitude;
    resolvedCity = match.name || resolvedCity;
  }

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(targetLat)}` +
    `&longitude=${encodeURIComponent(targetLng)}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code' +
    '&timezone=auto&forecast_days=1';

  const weatherResponse = await fetch(forecastUrl);
  if (!weatherResponse.ok) throw new Error('Weather API unavailable. Try again.');

  const weatherData = await weatherResponse.json();
  const current = weatherData?.current;
  if (!current) throw new Error('Weather API unavailable. Try again.');

  const pricing = resolvePricing(state, resolvedCity);
  const temperature = Number(current.temperature_2m);
  const isHeatwave = temperature >= HEATWAVE_THRESHOLD;

  return {
    city: resolvedCity,
    temperature,
    feelsLike: Number(current.apparent_temperature),
    humidity: Number(current.relative_humidity_2m),
    windSpeed: Number(current.wind_speed_10m),
    precipitation: Number(current.precipitation || 0),
    condition: getWeatherCodeLabel(current.weather_code),
    weatherIcon: null,
    isHeatwave,
    payoutAmount: isHeatwave ? pricing.maxPayout : 0,
    payoutTier: isHeatwave ? 'heatwave' : 'none',
    pricing,
    source: coords ? 'Open-Meteo direct' : 'Open-Meteo fallback',
  };
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
