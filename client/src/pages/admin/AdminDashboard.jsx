import { useCallback, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminAPI, claimsAPI } from '../../utils/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { SOCKET_URL } from '../../utils/runtime.js';

const STATUS_COLORS = {
  pending: 'badge-warning',
  approved: 'badge-active',
  paid: 'badge-active',
  rejected: 'badge-danger',
  flagged: 'badge-danger',
};

const CHART_COLORS = {
  premiums: '#F97316',
  payouts: '#EF4444',
  profit: '#22C55E',
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [claims, setClaims] = useState([]);
  const [fraudStats, setFraudStats] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);
  const [claimsFilter, setClaimsFilter] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);

  // Enable admin scrolling mode before paint
  useLayoutEffect(() => {
    document.documentElement.classList.add('admin-mode');
    return () => document.documentElement.classList.remove('admin-mode');
  }, []);

  // Check AI model health
  const checkAiStatus = useCallback(async () => {
    try {
      const { data } = await claimsAPI.getAiStatus();
      setAiStatus(data);
      // Store in localStorage as cache
      const cacheEntry = { data, ts: Date.now() };
      localStorage.setItem('kfw_ai_status_cache', JSON.stringify(cacheEntry));
    } catch {
      // Try cache
      const cached = localStorage.getItem('kfw_ai_status_cache');
      if (cached) {
        try { setAiStatus(JSON.parse(cached).data); } catch {}
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, revRes, claimsRes, fraudRes, workersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getRevenue(8),
        adminAPI.getClaims({ limit: 20 }),
        adminAPI.getFraudStats(),
        adminAPI.getWorkerMap(),
      ]);

      setStats(statsRes.data);
      setRevenue(revRes.data.chartData || []);
      setClaims(claimsRes.data.claims || []);
      setFraudStats(fraudRes.data);
      setWorkers(workersRes.data.workers || []);

      // Store admin stats cache in localStorage
      const adminCache = {
        ts: Date.now(),
        stats: statsRes.data,
        fraudStats: fraudRes.data,
      };
      localStorage.setItem('kfw_admin_cache', JSON.stringify(adminCache));
      setCacheStats({ lastUpdated: new Date(), source: 'live' });
    } catch (err) {
      console.error('[Admin] Load error:', err);
      // Try to use cached admin data
      const cached = localStorage.getItem('kfw_admin_cache');
      if (cached) {
        try {
          const { stats: cachedStats, fraudStats: cachedFraud, ts } = JSON.parse(cached);
          if (cachedStats) setStats(cachedStats);
          if (cachedFraud) setFraudStats(cachedFraud);
          setCacheStats({ lastUpdated: new Date(ts), source: 'cache' });
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.emit('join_admin');

    socket.on('new_claim', (data) => {
      setLiveEvents((prev) => [{ ...data, eventType: 'new_claim', ts: new Date() }, ...prev.slice(0, 9)]);
      loadData();
    });

    socket.on('claim_updated', () => loadData());
    socket.on('cron_complete', (data) => {
      setLiveEvents((prev) => [{ ...data, eventType: 'cron', ts: new Date() }, ...prev.slice(0, 9)]);
      loadData();
    });

    return () => socket.disconnect();
  }, [loadData]);

  useEffect(() => {
    loadData();
    checkAiStatus();
  }, [loadData, checkAiStatus]);

  // Refresh AI status every 30 seconds
  useEffect(() => {
    const t = setInterval(checkAiStatus, 30_000);
    return () => clearInterval(t);
  }, [checkAiStatus]);

  const handleClaim = async (id, action, note = '') => {
    setReviewingId(id);
    try {
      await adminAPI.updateClaim(id, { action, adminNote: note });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setReviewingId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    navigate('/admin/login');
    return null;
  }

  const filteredClaims = claims.filter((claim) => !claimsFilter || claim.status === claimsFilter);
  const fraudPieData = fraudStats
    ? [
        { name: 'Legitimate', value: fraudStats.legitimate || 0, color: '#22C55E' },
        { name: 'Suspected', value: fraudStats.suspectedFraud || 0, color: '#F59E0B' },
        { name: 'Flagged', value: fraudStats.flaggedFraud || 0, color: '#EF4444' },
      ]
    : [];

  return (
    <div className="admin-layout">
      <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-kavach-orange to-red-600">
              <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </div>
            <span className="font-display font-bold text-kavach-dark">
              KavachForWork <span className="font-body text-xs font-normal text-gray-400">Admin</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* AI Model Status Badge */}
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${
              aiStatus === null ? 'bg-gray-50' :
              aiStatus.online && aiStatus.fraudModelReady ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                aiStatus === null ? 'bg-gray-400' :
                aiStatus.online && aiStatus.fraudModelReady ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`} />
              <span className={`text-xs font-medium ${
                aiStatus === null ? 'text-gray-500' :
                aiStatus.online && aiStatus.fraudModelReady ? 'text-green-700' : 'text-red-600'
              }`}>
                AI: {aiStatus === null ? '...' : aiStatus.online && aiStatus.fraudModelReady ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              <span className="text-xs font-medium text-green-700">Live</span>
            </div>
            {cacheStats && (
              <div className="hidden md:flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1">
                <span className="text-xs text-blue-600">
                  {cacheStats.source === 'cache' ? '📦 Cached' : '🔄 Live'}
                </span>
              </div>
            )}
            <button onClick={() => { logout(); navigate('/'); }} className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-500">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex w-fit gap-1 rounded-xl border border-orange-100 bg-white p-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'claims', label: 'Claims' },
            { id: 'fraud', label: 'Fraud AI' },
            { id: 'map', label: 'Worker Map' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'bg-kavach-orange text-white shadow-kavach' : 'text-gray-500 hover:text-kavach-orange'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="heat-shimmer h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <KPICard label="Total Users" value={stats?.overview?.totalUsers || 0} />
                  <KPICard label="Active Insured" value={stats?.overview?.activeInsured || 0} />
                  <KPICard label="Total Revenue" value={`₹${stats?.overview?.totalRevenue || 0}`} />
                  <KPICard label="Net Profit" value={`₹${stats?.overview?.netProfit || 0}`} />
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <KPICard label="Total Claims" value={stats?.overview?.totalClaims || 0} />
                  <KPICard label="Approved" value={stats?.overview?.approvedClaims || 0} />
                  <KPICard label="Flagged Fraud" value={stats?.overview?.flaggedClaims || 0} />
                  <KPICard label="Total Payouts" value={`₹${stats?.overview?.totalPayouts || 0}`} />
                </div>

                <div className="card">
                  <h2 className="mb-4 font-display font-bold text-kavach-dark">Revenue vs Payouts</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={revenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="premiums" stroke={CHART_COLORS.premiums} fill="#FED7AA" strokeWidth={2} />
                      <Area type="monotone" dataKey="payouts" stroke={CHART_COLORS.payouts} fill="#FECACA" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="card">
                    <h2 className="mb-4 font-display font-bold text-kavach-dark">Weekly Profit</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={revenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="profit" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-display font-bold text-kavach-dark">Live Events</h2>
                      <span className="badge-active">Live</span>
                    </div>
                    {liveEvents.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">Waiting for events...</div>
                    ) : (
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {liveEvents.map((event, index) => (
                          <div key={index} className="rounded-lg bg-gray-50 p-2 text-xs">
                            <div className="font-semibold text-kavach-dark">
                              {event.eventType === 'new_claim' ? `New claim: ${event.userName}` : `Cron event: ${event.type}`}
                            </div>
                            {event.fraudScore != null && <div className="text-gray-500">Fraud score: {event.fraudScore}</div>}
                            <div className="text-gray-400">{new Date(event.ts).toLocaleTimeString('en-IN')}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <h2 className="mb-4 font-display font-bold text-kavach-dark">Recent Claims</h2>
                  <ClaimsTable claims={stats?.recentActivity || []} onAction={handleClaim} reviewingId={reviewingId} compact />
                </div>
              </div>
            )}

            {activeTab === 'claims' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {['', 'pending', 'approved', 'paid', 'flagged', 'rejected'].map((status) => (
                    <button
                      key={status || 'all'}
                      onClick={() => setClaimsFilter(status)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                        claimsFilter === status
                          ? 'bg-kavach-orange text-white'
                          : 'border border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      {status || 'All'}
                    </button>
                  ))}
                </div>
                <div className="card">
                  <ClaimsTable claims={filteredClaims} onAction={handleClaim} reviewingId={reviewingId} />
                </div>
              </div>
            )}

            {activeTab === 'fraud' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <KPICard label="Total Analyzed" value={fraudStats?.totalAnalyzed || 0} />
                  <KPICard label="Legitimate" value={fraudStats?.legitimate || 0} />
                  <KPICard label="Flagged Fraud" value={fraudStats?.flaggedFraud || 0} />
                  <KPICard label="Money Saved" value={`₹${Math.round(fraudStats?.moneySaved || 0)}`} />
                </div>

                {/* AI Model Status Panel */}
                <div className="card">
                  <h2 className="mb-4 font-display font-bold text-kavach-dark">AI Fraud Model Status</h2>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div className={`rounded-xl p-4 border ${
                      aiStatus?.online ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className={`text-2xl font-bold ${ aiStatus?.online ? 'text-green-600' : 'text-red-600'}`}>
                        {aiStatus === null ? '...' : aiStatus.online ? '✓ Online' : '✗ Offline'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">AI Service</div>
                    </div>
                    <div className={`rounded-xl p-4 border ${
                      aiStatus?.fraudModelReady ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                    }`}>
                      <div className={`text-2xl font-bold ${ aiStatus?.fraudModelReady ? 'text-green-600' : 'text-amber-600'}`}>
                        {aiStatus === null ? '...' : aiStatus.fraudModelReady ? '✓ Loaded' : '✗ Not Ready'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Sentry Fraud Model (RF)</div>
                    </div>
                    <div className={`rounded-xl p-4 border ${
                      aiStatus?.weatherModelReady ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                    }`}>
                      <div className={`text-2xl font-bold ${ aiStatus?.weatherModelReady ? 'text-green-600' : 'text-amber-600'}`}>
                        {aiStatus === null ? '...' : aiStatus.weatherModelReady ? '✓ Loaded' : '✗ Not Ready'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Weather Oracle Model</div>
                    </div>
                  </div>
                  {aiStatus && (
                    <div className="mt-3 text-xs text-gray-400">
                      Service URL: <code className="bg-gray-100 px-1 rounded">{aiStatus.serviceUrl}</code>
                      {' · '}Status: <span className={aiStatus.online ? 'text-green-600' : 'text-red-500'}>{aiStatus.status}</span>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="card">
                    <h2 className="mb-4 font-display font-bold text-kavach-dark">Claim Distribution</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={fraudPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                          {fraudPieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card">
                    <h2 className="mb-4 font-display font-bold text-kavach-dark">Review Guidance</h2>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div>Green: under 20, usually safe for auto-payout.</div>
                      <div>Yellow: 20 to 49, verify location and sensor proof.</div>
                      <div>Red: 50+, payout should stay blocked unless evidence is corrected outside the cycle.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'map' && (
              <div className="card">
                <h2 className="mb-4 font-display font-bold text-kavach-dark">Live Worker Map ({workers.length} tracked)</h2>
                <WorkerMap workers={workers} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4">
      <div className="font-display text-xl font-bold text-kavach-dark">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}

function ClaimsTable({ claims, onAction, reviewingId, compact }) {
  if (!claims || claims.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400">No claims found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['Worker', 'Temp', 'Fraud Score', 'Status', 'Review Reason', 'Payout', 'Date', !compact && 'Actions']
              .filter(Boolean)
              .map((heading) => (
                <th key={heading} className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {heading}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => (
            <tr key={claim._id} className="border-b border-gray-50 hover:bg-orange-50/30">
              <td className="px-2 py-3">
                <div className="font-medium text-kavach-dark">{claim.user?.name || '-'}</div>
                <div className="text-xs text-gray-400">{claim.user?.city || claim.weather?.city || '-'}</div>
              </td>
              <td className="px-2 py-3">
                <span className={`font-mono font-bold ${(claim.weather?.ambientTemp || 0) >= 45 ? 'text-red-500' : 'text-gray-600'}`}>
                  {claim.weather?.ambientTemp}C
                </span>
              </td>
              <td className="px-2 py-3">
                <FraudScoreBadge score={claim.fraudAnalysis?.fraudScore} />
              </td>
              <td className="px-2 py-3">
                <span className={STATUS_COLORS[claim.status] || 'badge-inactive'}>{claim.status}</span>
              </td>
              <td className="px-2 py-3">
                <ReviewReason claim={claim} />
              </td>
              <td className="px-2 py-3 font-semibold text-green-600">
                {claim.payoutAmount > 0 ? `₹${claim.payoutAmount}` : '-'}
              </td>
              <td className="px-2 py-3 text-xs text-gray-400">
                {new Date(claim.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              {!compact && (
                <td className="px-2 py-3">
                  {(claim.status === 'pending' || claim.status === 'flagged') && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onAction(claim._id, 'approve')}
                        disabled={reviewingId === claim._id}
                        className="rounded-lg bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onAction(claim._id, 'reject', 'Rejected by admin')}
                        disabled={reviewingId === claim._id}
                        className="rounded-lg bg-red-400 px-2 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FraudScoreBadge({ score }) {
  if (score == null) return <span className="text-gray-300">-</span>;
  const color = score < 20 ? 'bg-green-50 text-green-600' : score < 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{score}</span>;
}

function ReviewReason({ claim }) {
  const reasons = [];

  if (claim.status === 'flagged') reasons.push('Suspected claim, verify manually');
  if (claim.sensorData?.isMockLocation) reasons.push('Mock location detected');
  if (claim.sensorData?.locationVerified === false) reasons.push('Live location verification failed');
  if (claim.sensorData?.hardwareHeartbeat === false) reasons.push('Hardware heartbeat missing');
  if (claim.sensorData?.batteryTempStatic) reasons.push('Battery temperature looked static');
  if (claim.sensorData?.motionIdle) reasons.push('No motion detected');
  if (claim.weatherOracle?.isHeatwave === false) reasons.push('Weather trigger not confirmed');
  if (claim.rejectionReason) reasons.push(claim.rejectionReason);

  const signals = claim.fraudAnalysis?.signals || {};
  if (signals.mockLocationSafe === false) reasons.push('AI location spoof risk');
  if (signals.hardwareHeartbeat === false) reasons.push('AI missing hardware proof');
  if (signals.movementDetected === false) reasons.push('AI saw idle-device pattern');

  const uniqueReasons = [...new Set(reasons)].filter(Boolean);

  if (uniqueReasons.length === 0) {
    if ((claim.fraudAnalysis?.fraudScore || 0) >= 20) {
      return <span className="text-xs text-amber-700">Elevated fraud score, please verify</span>;
    }
    return <span className="text-xs text-gray-400">No review note</span>;
  }

  return (
    <div className="max-w-[15rem] space-y-1">
      {uniqueReasons.slice(0, 3).map((reason) => (
        <div key={reason} className="text-xs text-gray-600">
          • {reason}
        </div>
      ))}
    </div>
  );
}

function WorkerMap({ workers }) {
  const [MapComponent, setMapComponent] = useState(null);

  useEffect(() => {
    import('react-leaflet')
      .then(({ CircleMarker, MapContainer, Popup, TileLayer }) => {
        const Map = () => (
          <MapContainer center={[22.9734, 78.6569]} zoom={5} style={{ height: '400px', width: '100%' }} className="rounded-xl">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {workers.map((worker) =>
              worker.lastLocation?.lat ? (
                <CircleMarker
                  key={worker._id}
                  center={[worker.lastLocation.lat, worker.lastLocation.lng]}
                  radius={8}
                  fillColor={worker.isInsured ? '#22C55E' : '#F97316'}
                  color="white"
                  weight={2}
                  fillOpacity={0.8}
                >
                  <Popup>
                    <div className="p-1 text-sm">
                      <div className="font-bold">{worker.name}</div>
                      <div className="text-gray-500">Gig worker</div>
                      <div className="mt-1 text-xs">{worker.lastLocation.city}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null
            )}
          </MapContainer>
        );

        setMapComponent(() => Map);
      })
      .catch(console.error);
  }, [workers]);

  if (!MapComponent) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
        <div className="text-center text-gray-400">
          <div className="mb-2 text-4xl">Map</div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return <MapComponent />;
}
