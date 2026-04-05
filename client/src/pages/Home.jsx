import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { weatherAPI } from '../utils/api.js';
import { getCurrentCoordinates, reverseGeocodeIndia } from '../utils/location.js';
import { useAuth } from '../hooks/useAuth.jsx';
import BottomNav from '../components/BottomNav.jsx';
import Splash from '../components/Splash.jsx';
import { resolvePricing } from '../utils/pricing.js';

const HEATWAVE_THRESHOLD = 45;

export default function Home() {
  const { user } = useAuth();
  const [live, setLive] = useState({
    loading: true, refreshing: false,
    locationLabel: user?.city ? `${user.city}` : 'Checking area',
    city: user?.city || '', state: user?.state || '',
    coords: null, weather: null, error: '',
  });
  const [showSplash, setShowSplash] = useState(true);
  const pricing = useMemo(
    () => resolvePricing(live.state || user?.state, live.city || user?.city),
    [live.city, live.state, user?.city, user?.state],
  );

  const loadLiveSnapshot = useCallback(async (isRefresh = false) => {
    setLive(c => ({ ...c, loading: !isRefresh, refreshing: isRefresh, error: '' }));
    let coords = null;
    let place = null;
    try {
      coords = await getCurrentCoordinates();
      place = await reverseGeocodeIndia(coords.latitude, coords.longitude);
      const { data } = await weatherAPI.getCurrent({
        lat: coords.latitude,
        lng: coords.longitude,
        city: place.city || user?.city || 'Jaipur',
        state: place.state || user?.state || '',
      });
      setLive({
        loading: false, refreshing: false,
        locationLabel: place.city || 'Current area',
        city: place.city || data.city || user?.city || '',
        state: place.state || user?.state || '',
        coords, weather: data, error: '',
      });
    } catch (err) {
      try {
        const fallback = await getClientWeatherFallback({
          lat: coords?.latitude,
          lng: coords?.longitude,
          city: place?.city || user?.city || 'Jaipur',
          state: place?.state || user?.state || '',
        });

        setLive(c => ({
          ...c,
          loading: false,
          refreshing: false,
          locationLabel: place?.city || c.locationLabel,
          city: place?.city || fallback.city || c.city,
          state: place?.state || c.state,
          coords,
          weather: fallback,
          error: '',
        }));
      } catch {
        setLive(c => ({
          ...c,
          loading: false,
          refreshing: false,
          error: err.response?.data?.error || 'Weather unavailable right now',
        }));
      }
    }
  }, [user?.city, user?.state]);

  useEffect(() => { loadLiveSnapshot().catch(() => {}); }, [loadLiveSnapshot]);

  if (showSplash && !user) {
    return <Splash onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="phone-screen" style={{ justifyContent: 'flex-start' }}>
      
      {/* Glows */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -50, left: -50, width: 250, height: 250, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div className="page-content">
      <div style={{ padding: '24px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>Kavach<span style={{ color: '#f97316' }}>ForWork</span></h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Climate Protection for Gig Workers</div>
        </div>
        <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(249,115,22,0.1)', border: '2px solid rgba(249,115,22,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
           <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      <div style={{ padding: '20px' }}>
         <div className="glass fade-up" style={{ padding: '30px 24px', textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1.2 }}>See the heat.<br /><span style={{ color: '#f97316' }}>Stay covered.</span></h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12, marginBottom: 24 }}>Hardware-backed climate protection for delivery riders and field workers.</p>
            {user ? (
              <Link to="/dashboard" className="btn-primary" style={{ display: 'block', textDecoration: 'none' }}>Go to Dashboard →</Link>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <Link to="/register" className="btn-primary" style={{ flex: 1, textDecoration: 'none' }}>Join Kavach</Link>
                <Link to="/login" className="btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>Sign In</Link>
              </div>
            )}
         </div>

         <div className="glass fade-up" style={{ padding: 20, marginBottom: 20, animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Live Area Check</div>
              <span style={{ fontSize: 10, background: 'rgba(249,115,22,0.15)', color: '#f97316', padding: '4px 8px', borderRadius: 10, fontWeight: 700 }}>{live.refreshing ? 'Scanning…' : 'Online'}</span>
            </div>
            {live.loading ? (
              <div className="heat-shimmer" style={{ height: 60, borderRadius: 12 }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{live.locationLabel}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{live.weather?.condition || 'Waiting for signal'}</div>
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#f97316' }}>
                  {live.weather?.temperature ? `${live.weather.temperature}°` : '--°'}
                </div>
              </div>
            )}
            {live.error && (
              <div style={{ marginTop: 12, fontSize: 11, color: '#fda4af' }}>{live.error}</div>
            )}
         </div>

         <div className="glass fade-up" style={{ padding: 18, marginBottom: 20, animationDelay: '0.15s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>MAX PAYOUT</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 6 }}>
                  ₹{live.weather?.payoutAmount || pricing.maxPayout}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  {live.weather?.payoutTier ? `${live.weather.payoutTier} heat tier` : pricing.category}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>WEEKLY PREMIUM</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f97316', marginTop: 6 }}>
                  ₹{live.weather?.pricing?.weeklyPremium || pricing.weeklyPremium}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  {pricing.label}
                </div>
              </div>
            </div>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[{ icon: '🌡️', title: 'Live Heat Intel' }, { icon: '🛡️', title: 'AI AI Sentry' }, { icon: '💸', title: 'Wallet Payouts' }, { icon: '🛵', title: 'For Riders' }].map((f, i) => (
              <div key={i} className="glass fade-up" style={{ padding: 16, textAlign: 'center', animationDelay: `${0.2 + i*0.1}s` }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{f.title}</div>
              </div>
            ))}
         </div>
      </div>
      
      {!user && (
         <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', paddingBottom: 100 }}>
            © 2024 KavachForWork · <Link to="/admin/login" style={{ color: 'inherit' }}>Admin Portal</Link>
         </div>
      )}
      </div>
      
      {user && <BottomNav />}
    </div>
  );
}

async function getClientWeatherFallback({ lat, lng, city, state }) {
  let targetLat = lat;
  let targetLng = lng;
  let resolvedCity = city || 'Jaipur';

  if (!targetLat || !targetLng) {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city || 'Jaipur')}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geocodeUrl);
    if (!geoResponse.ok) throw new Error('Weather lookup failed');
    const geoData = await geoResponse.json();
    const match = geoData?.results?.[0];
    if (!match) throw new Error('Weather lookup failed');
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
  if (!weatherResponse.ok) throw new Error('Weather lookup failed');
  const weatherData = await weatherResponse.json();
  const current = weatherData?.current;
  if (!current) throw new Error('Weather lookup failed');

  const pricing = resolvePricing(state, resolvedCity);
  const temperature = Number(current.temperature_2m);

  return {
    city: resolvedCity,
    temperature,
    feelsLike: Number(current.apparent_temperature),
    humidity: Number(current.relative_humidity_2m),
    windSpeed: Number(current.wind_speed_10m),
    precipitation: Number(current.precipitation || 0),
    condition: getWeatherCodeLabel(current.weather_code),
    weatherIcon: null,
    isHeatwave: temperature >= HEATWAVE_THRESHOLD,
    payoutAmount: temperature >= HEATWAVE_THRESHOLD ? pricing.maxPayout : 0,
    payoutTier: temperature >= HEATWAVE_THRESHOLD ? 'heatwave' : 'none',
    pricing,
    source: 'Open-Meteo fallback',
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
