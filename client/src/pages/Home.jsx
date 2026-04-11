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
    loadLiveSnapshot().catch(() => { });
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
        {/* Header */}
        <div className="px-5 pt-8 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Kavach<span className="text-orange-500">ForWork</span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-white/40 mt-0.5">
              Climate Protection for Gig Workers
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(249,115,22,0.2)]">
            <img src="/logo.png" alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Hero Section */}
          <div className="glass-strong fade-up p-8 text-center mb-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              See the heat.<br />
              <span className="text-orange-500">Stay covered.</span>
            </h2>
            <p className="text-xs text-white/50 mb-8 max-w-[240px] mx-auto leading-relaxed">
              AI-powered climate insurance for delivery riders and outdoor field workers.
            </p>
            {user ? (
              <Link to="/dashboard" className="btn-primary inline-block w-full no-underline">
                Open Dashboard
              </Link>
            ) : (
              <div className="flex gap-3">
                <Link to="/register" className="btn-primary flex-1 no-underline">Join Kavach</Link>
                <Link to="/login" className="btn-secondary flex-1 no-underline">Sign In</Link>
              </div>
            )}
          </div>

          {/* Live Area Check */}
          <div className="glass fade-up p-5 mb-5" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-center mb-5">
              <span className="text-xs font-black text-white uppercase tracking-wider">Live Area Check</span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-500 text-[10px] font-bold">
                  {live.refreshing ? 'Scanning...' : 'Online'}
                </span>
                <button
                  type="button"
                  onClick={() => loadLiveSnapshot(true).catch(() => { })}
                  disabled={live.refreshing}
                  className="bg-white/5 border border-white/10 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold active:bg-white/10 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>

            {live.loading ? (
              <div className="heat-shimmer h-[60px]" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-extrabold text-white truncate">{live.locationLabel}</div>
                  <div className="text-xs text-white/40 mt-1 flex items-center gap-1.5">
                    <span className="text-lg">{getWeatherEmoji(live.weather?.condition, localHour)}</span>
                    {live.weather?.condition || 'Waiting for signal'}
                  </div>
                </div>
                <div className="text-4xl font-black text-orange-500">
                  {Number.isFinite(Number(live.weather?.temperature)) ? `${live.weather.temperature}°` : '--°'}
                </div>
              </div>
            )}
            {live.error && <div className="mt-3 text-[10px] text-red-400 font-medium">{live.error}</div>}
          </div>

          {/* Payout Stats */}
          <div className="glass fade-up p-5 mb-5" style={{ animationDelay: '0.15s' }}>
            <div className="flex justify-between gap-4">
              <div className="flex-1">
                <div className="text-[10px] font-bold tracking-[0.1em] text-white/40 uppercase">
                  {live.weather && Number.isFinite(live.weather.temperature) && live.weather.temperature >= 45 ? 'Instant Payout' : 'Max Coverage'}
                </div>
                <div className={`text-2xl font-black mt-1 ${live.weather?.payoutAmount > 0 ? 'text-green-400' : 'text-white'}`}>
                  {live.loading ? '...' : `₹${live.weather?.payoutAmount ?? pricing.maxPayout}`}
                </div>
                <div className="text-[10px] text-white/40 mt-1.5 font-medium">
                  {live.weather?.temperature >= 45 ? `🔥 ${live.weather.temperature}°C — Threshold met!` : live.weather?.temperature ? `${live.weather.temperature}°C — Below threshold` : pricing.category}
                </div>
              </div>
              <div className="w-px bg-white/10"></div>
              <div className="flex-1 text-right">
                <div className="text-[10px] font-bold tracking-[0.1em] text-white/40 uppercase">Weekly Premium</div>
                <div className="text-2xl font-black text-orange-500 mt-1">
                  ₹{live.weather?.pricing?.weeklyPremium ?? pricing.weeklyPremium}
                </div>
                <div className="text-[10px] text-white/40 mt-1.5 font-medium">{pricing.label}</div>
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

      <BottomNav />
    </div>
  );
}

async function getClientWeatherFallback({ lat, lng, city, state }) {
  // Use the server API which has WeatherStack (more accurate real-time data)
  // and fallback logic configured correctly.
  const query = lat && lng ? { lat, lng } : { city: city || 'Jaipur' };
  if (state) query.state = state;

  try {
    const { weatherAPI } = await import('../utils/api.js');
    const response = await weatherAPI.getCurrent(query);
    return response.data;
  } catch (error) {
    console.error('Weather fallback to server failed', error);
    throw new Error('Weather lookup failed');
  }
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
