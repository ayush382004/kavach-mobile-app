import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getCurrentCoordinates, reverseGeocodeIndia } from '../utils/location.js';
import { useAuth } from '../hooks/useAuth.jsx';
import BottomNav from '../components/BottomNav.jsx';
import Splash from '../components/Splash.jsx';
import { resolvePricing } from '../utils/pricing.js';

const HEATWAVE_THRESHOLD = 45;

export default function Home() {
  const { user } = useAuth();
  const fallbackCity = user?.city || 'Jaipur';
  const fallbackState = user?.state || 'Rajasthan';
  const [live, setLive] = useState({
    loading: true,
    refreshing: false,
    locationLabel: formatLocationLabel(fallbackCity, fallbackState) || 'Checking area',
    city: fallbackCity,
    state: fallbackState,
    coords: null,
    weather: null,
    error: '',
  });
  const [showSplash, setShowSplash] = useState(true);
  const [localHour, setLocalHour] = useState(() => new Date().getHours());

  // Update hour every minute so emoji changes live without refresh
  useEffect(() => {
    const t = setInterval(() => setLocalHour(new Date().getHours()), 60000);
    return () => clearInterval(t);
  }, []);

  const pricing = useMemo(
    () => resolvePricing(live.state || fallbackState, live.city || fallbackCity),
    [fallbackCity, fallbackState, live.city, live.state],
  );

  const loadLiveSnapshot = useCallback(async (isRefresh = false) => {
    setLive((current) => ({
      ...current,
      loading: !isRefresh,
      refreshing: isRefresh,
      error: '',
    }));

    let coords = null;
    let place = null;
    const defaultLocation = {
      city: user?.city || 'Jaipur',
      state: user?.state || 'Rajasthan',
    };

    try {
      try { coords = await getCurrentCoordinates(); } catch { coords = null; }
      if (coords) {
        try { place = await reverseGeocodeIndia(coords.latitude, coords.longitude); } catch { place = null; }
      }

      // Always call Open-Meteo directly from browser — free, no server needed
      const weatherData = await getClientWeatherFallback({
        lat: coords?.latitude,
        lng: coords?.longitude,
        city: place?.city || defaultLocation.city,
        state: place?.state || defaultLocation.state,
      });

      const resolvedCity = place?.city || weatherData.city || defaultLocation.city;
      const resolvedState = place?.state || weatherData.state || defaultLocation.state;

      setLive({
        loading: false,
        refreshing: false,
        locationLabel: formatLocationLabel(resolvedCity, resolvedState) || 'Current area',
        city: resolvedCity,
        state: resolvedState,
        coords,
        weather: weatherData,
        error: '',
      });
    } catch (err) {
      setLive((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        locationLabel:
          formatLocationLabel(current.city || defaultLocation.city, current.state || defaultLocation.state) ||
          current.locationLabel,
        error: 'Weather unavailable. Check your connection.',
      }));
    }
  }, [user?.city, user?.state]);

  useEffect(() => {
    loadLiveSnapshot().catch(() => {});
  }, [loadLiveSnapshot]);

  if (showSplash && !user) {
    return <Splash onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="phone-screen" style={{ justifyContent: 'flex-start' }}>
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 250,
          height: 250,
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div className="page-content">
        <div style={{ padding: '24px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>
              Kavach<span style={{ color: '#f97316' }}>ForWork</span>
            </h1>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Climate Protection for Gig Workers
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(249,115,22,0.1)',
              border: '2px solid rgba(249,115,22,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div className="glass fade-up" style={{ padding: '30px 24px', textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1.2 }}>
              See the heat.
              <br />
              <span style={{ color: '#f97316' }}>Stay covered.</span>
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12, marginBottom: 24 }}>
              Hardware-backed climate protection for delivery riders and field workers.
            </p>
            {user ? (
              <Link to="/dashboard" className="btn-primary" style={{ display: 'block', textDecoration: 'none' }}>
                Open Dashboard
              </Link>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <Link to="/register" className="btn-primary" style={{ flex: 1, textDecoration: 'none' }}>
                  Join Kavach
                </Link>
                <Link to="/login" className="btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
                  Sign In
                </Link>
              </div>
            )}
          </div>

          <div className="glass fade-up" style={{ padding: 20, marginBottom: 20, animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Live Area Check</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    background: 'rgba(249,115,22,0.15)',
                    color: '#f97316',
                    padding: '4px 8px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  {live.refreshing ? 'Scanning...' : 'Online'}
                </span>
                <button
                  type="button"
                  onClick={() => loadLiveSnapshot(true).catch(() => {})}
                  disabled={live.refreshing}
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: live.refreshing ? 'default' : 'pointer',
                    opacity: live.refreshing ? 0.6 : 1,
                  }}
                >
                  Retry
                </button>
              </div>
            </div>

            {live.loading ? (
              <div className="heat-shimmer" style={{ height: 60, borderRadius: 12 }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{live.locationLabel}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {getWeatherEmoji(live.weather?.condition, localHour)} {live.weather?.condition || 'Waiting for signal'}
                  </div>
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#f97316', whiteSpace: 'nowrap' }}>
                  {Number.isFinite(Number(live.weather?.temperature)) ? `${live.weather.temperature}°` : '--°'}
                </div>
              </div>
            )}

            {live.error && <div style={{ marginTop: 12, fontSize: 11, color: '#fda4af' }}>{live.error}</div>}
          </div>

          <div className="glass fade-up" style={{ padding: 18, marginBottom: 20, animationDelay: '0.15s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>
                  {live.weather && Number.isFinite(live.weather.temperature) && live.weather.temperature >= 45 ? 'HEATWAVE PAYOUT' : 'MAX POSSIBLE PAYOUT'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: live.weather?.payoutAmount > 0 ? '#4ade80' : '#fff', marginTop: 6 }}>
                  {live.loading ? '...' : `₹${live.weather?.payoutAmount ?? pricing.maxPayout}`}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  {live.weather?.temperature >= 45 ? `🔥 ${live.weather.temperature}°C — Heatwave active!` : live.weather?.temperature ? `${live.weather.temperature}°C — No heatwave yet` : pricing.category}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>WEEKLY PREMIUM</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f97316', marginTop: 6 }}>
                  ₹{live.weather?.pricing?.weeklyPremium ?? pricing.weeklyPremium}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{pricing.label}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '🌡️', title: 'Live Heat Intel' },
              { icon: '🛡️', title: 'AI Sentry' },
              { icon: '💸', title: 'Wallet Payouts' },
              { icon: '🛵', title: 'For Riders' },
            ].map((feature, index) => (
              <div
                key={index}
                className="glass fade-up"
                style={{ padding: 16, textAlign: 'center', animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{feature.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{feature.title}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>Live Sentry Feed</span>
              <span style={{ color: '#ef4444', animation: 'pulse 2s infinite' }}>● Live</span>
            </div>
            
            {user?.totalPayoutsReceived > 0 && (
              <div className="glass fade-up" style={{ padding: 16, marginBottom: 16, border: '1px solid rgba(74, 222, 128, 0.3)', background: 'rgba(74, 222, 128, 0.05)' }}>
                <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 800 }}>YOUR TOTAL HEAT PAYOUTS</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4 }}>₹{user.totalPayoutsReceived}</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="glass fade-up" style={{ padding: 14, borderLeft: '3px solid #4ade80' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Approved: Delivery Rider</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#4ade80' }}>+ ₹300</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Jaipur • 46°C verified • Payout issued to UPI</div>
              </div>
              <div className="glass fade-up" style={{ padding: 14, borderLeft: '3px solid #f97316', animationDelay: '0.1s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Suspicious Activity</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f97316' }}>Review</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Mumbai • AC room detected by Sentry AI 🥶 (Device temp low)</div>
              </div>
              <div className="glass fade-up" style={{ padding: 14, borderLeft: '3px solid #ef4444', animationDelay: '0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Flagged Claim</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>Denied</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Delhi • GPS Spoofing detected (Altitude varying randomly)</div>
              </div>
            </div>
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
    const geocodeUrl =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city || 'Jaipur')}` +
      '&count=1&language=en&format=json';
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
    state,
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

function formatLocationLabel(city, state) {
  return [city, state].filter(Boolean).join(', ');
}

function getWeatherEmoji(condition, hour) {
  const h = hour !== undefined ? hour : new Date().getHours();
  const isNight = h < 6 || h >= 20;
  const isDawn = h >= 5 && h < 7;
  const isDusk = h >= 18 && h < 20;

  if (!condition) return isNight ? '🌙' : '☀️';

  const c = condition.toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('heavy rain') || c.includes('heavy shower')) return '🌧️';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return isNight ? '🌧️' : '🌦️';
  if (c.includes('snow') || c.includes('blizzard')) return '❄️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  if (c.includes('overcast')) return '☁️';
  if (c.includes('cloudy') || c.includes('partly')) return isNight ? '🌙' : '⛅';
  if (c.includes('mainly clear')) return isNight ? '🌙' : isDawn ? '🌅' : isDusk ? '🌇' : '🌤️';
  if (c.includes('clear')) return isNight ? '🌙' : isDawn ? '🌅' : isDusk ? '🌇' : '☀️';
  return isNight ? '🌙' : isDawn ? '🌅' : isDusk ? '🌇' : '☀️';
}
