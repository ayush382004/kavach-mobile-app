/**
 * Dashboard — KavachForWork Phone-Native UI
 * Dynamic Risk Ring + Telemetry Waveform + Swipe-to-Activate + FAB + Glass Cards
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { userAPI, walletAPI, weatherAPI } from '../../utils/api.js';
import RiskRing from '../../components/RiskRing.jsx';
import TelemetryWaveform from '../../components/TelemetryWaveform.jsx';
import SwipeToActivate from '../../components/SwipeToActivate.jsx';
import BottomNav from '../../components/BottomNav.jsx';
import StatusPopup from '../../components/StatusPopup.jsx';

export default function Dashboard() {
  const { user, refreshUser, logout } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [activating, setActivating] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    window.setTimeout(() => setToast(null), 2800);
  };

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.allSettled([
        walletAPI.getBalance(),
        userAPI.getTransactions({ limit: 5 }),
      ]);
      if (balRes.status === 'fulfilled') setBalance(balRes.value.data);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.data.transactions || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      const city = user?.city || 'Jaipur';
      const { data } = await weatherAPI.getCurrent(city);
      setWeather(data);
    } catch {}
  }, [user?.city]);

  useEffect(() => { loadData(); loadWeather(); }, [loadData, loadWeather]);
  // Refresh weather every 3 min
  useEffect(() => {
    const t = setInterval(loadWeather, 180_000);
    return () => clearInterval(t);
  }, [loadWeather]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const { data } = await userAPI.activateInsurance();
      showToast('🛡 Kavach Activated!', data.message || 'Coverage is now live');
      await Promise.all([loadData(), refreshUser()]);
    } catch (err) {
      showToast('Activation failed', err.response?.data?.error || 'Try again', 'error');
    } finally {
      setActivating(false);
    }
  };

  const isActive = balance?.isInsuranceActive;
  const premium = balance?.weeklyPremium || user?.weeklyPremium || 29;
  const bal = balance?.balance ?? 0;
  const expiryDate = balance?.premiumUntil
    ? new Date(balance.premiumUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null;

  const temp = weather?.temperature;
  const isHeatwave = weather?.isHeatwave;
  const riskColor = isHeatwave ? '#ef4444' : temp >= 40 ? '#f59e0b' : '#22c55e';

  return (
    <div className="phone-screen">
      <StatusPopup toast={toast} />
      <div className="page-content">

      {/* ── Status Bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px 8px',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <img src="/logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          {user?.city || 'India'}
        </span>
      </div>

      {/* ── Greeting ── */}
      <div style={{ padding: '0 20px 16px', animation: 'float-up 0.5s ease' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>
          Namaste, {user?.name?.split(' ')[0] || 'Worker'} 👋
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* ── Risk Ring + Weather Hero ── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 20px 20px' }}>
        <RiskRing temperature={temp} isHeatwave={isHeatwave} size={168}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1 }}>
              {temp != null ? `${temp}°` : '--°'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {weather?.condition || 'Loading…'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {weather?.city || user?.city || 'Jaipur'}
            </div>
          </div>
        </RiskRing>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard
            label="Wallet Balance"
            value={`₹${bal}`}
            icon="💰"
            color="#f97316"
            link="/wallet"
            loading={loading}
          />
          <StatCard
            label="Coverage"
            value={isActive ? `Active` : 'Inactive'}
            icon={isActive ? '🛡' : '⚠️'}
            color={isActive ? '#22c55e' : '#f59e0b'}
            loading={loading}
          />
          <StatCard
            label="Claims Filed"
            value={user?.totalClaimsSubmitted ?? 0}
            icon="📋"
            color="#a78bfa"
            link="/claim"
          />
          <StatCard
            label="Payouts"
            value={`₹${user?.totalPayoutsReceived ?? 0}`}
            icon="💸"
            color="#38bdf8"
          />
        </div>

        {/* ── Shield Card / Swipe to Activate ── */}
        <div className="glass" style={{ padding: '20px' }}>
          {isActive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                border: '2px solid rgba(34,197,94,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, boxShadow: '0 0 20px rgba(34,197,94,0.3)',
              }} className="shield-active">
                🛡
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#4ade80' }}>
                  Kavach Shield Active
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  Protected until {expiryDate} • ₹{premium}/week
                </div>
              </div>
              <Link
                to="/claim"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#4ade80', padding: '8px 14px',
                  borderRadius: 12, fontSize: 12, fontWeight: 700,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                Claim →
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                  Activate Kavach Shield
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  {bal >= premium
                    ? `₹${premium} from your wallet · 7-day heat protection`
                    : `Insufficient balance (₹${bal}). `}
                  {bal < premium && (
                    <Link to="/wallet" style={{ color: '#f97316', fontWeight: 700 }}>Top up →</Link>
                  )}
                </div>
              </div>
              <SwipeToActivate
                onConfirm={handleActivate}
                label={`Swipe to Activate — ₹${premium}`}
                disabled={bal < premium}
                loading={activating}
              />
            </div>
          )}
        </div>

        {/* ── Live Telemetry Waveform ── */}
        <TelemetryWaveform color={riskColor} height={52} />

        {/* ── Weather Detail Strip ── */}
        {weather && (
          <div className="glass" style={{ padding: '14px 16px', display: 'flex', gap: 0 }}>
            {[
              { label: 'Feels Like', value: `${weather.feelsLike ?? '--'}°` },
              { label: 'Humidity', value: `${weather.humidity ?? '--'}%` },
              { label: 'Heatwave', value: isHeatwave ? 'YES 🔴' : 'No ✅' },
            ].map((item, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                padding: '0 8px',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{item.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Recent Transactions ── */}
        <div className="glass" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Recent Activity</span>
            <Link to="/wallet" style={{ fontSize: 12, color: '#f97316', fontWeight: 700, textDecoration: 'none' }}>
              View all
            </Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} className="heat-shimmer" style={{ height: 48, borderRadius: 12 }} />)}
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
              No transactions yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {transactions.map(tx => <TxRow key={tx._id} tx={tx} />)}
            </div>
          )}
        </div>

      </div>{/* end scroll */}
      </div>

      {/* ── FAB ── */}
      <div style={{ position: 'fixed', bottom: 90, right: 20, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        {fabOpen && (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            {[
              { to: '/claim',   label: '📋 File Claim',  color: '#a78bfa', action: null },
              { to: '/wallet',  label: '💰 Wallet',       color: '#38bdf8', action: null },
              { to: '/chatbot', label: '💬 Help',          color: '#f97316', action: null },
              { to: '#', label: '🚪 Logout', color: '#ef4444', action: () => { logout(); } }
            ].map((item, idx) => (
              <Link
                key={idx}
                to={item.to}
                onClick={(e) => {
                  setFabOpen(false);
                  if (item.action) {
                    e.preventDefault();
                    item.action();
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 28, padding: '10px 18px',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  boxShadow: `0 0 20px ${item.color}44`,
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
        <button
          onClick={() => setFabOpen(o => !o)}
          className="fab-ping"
          style={{
            width: 58, height: 58, borderRadius: '50%',
            background: fabOpen ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#f97316,#ea580c)',
            border: '2px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: fabOpen ? '0 4px 20px rgba(0,0,0,0.4)' : '0 0 30px rgba(249,115,22,0.5)',
            transition: 'all 0.3s ease',
            transform: fabOpen ? 'rotate(45deg)' : 'rotate(0)',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {fabOpen ? '✕' : '+'}
        </button>
      </div>

      {/* Bottom Nav */}
      <BottomNav />

      <style>{`
        @keyframes float-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: float-up 0.4s ease forwards; }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, icon, color, link, loading }) {
  const inner = (
    <div className="glass" style={{
      padding: '14px', display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      {loading ? (
        <div className="heat-shimmer" style={{ height: 20, width: '70%', borderRadius: 6 }} />
      ) : (
        <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1.2 }}>
          {value}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{label}</div>
      <div style={{ height: 2, borderRadius: 2, background: color, opacity: 0.5, marginTop: 2 }} />
    </div>
  );
  return link ? <Link to={link} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function TxRow({ tx }) {
  const isCredit = tx.amount > 0;
  const label = {
    premium_deduction: '🛡 Weekly Premium',
    payout: '💸 Claim Payout',
    claim_payout: '💸 Claim Payout',
    topup: '➕ Wallet Top-up',
    bank_withdrawal: '🏦 Sent to Bank',
    refund: '↩ Refund',
  }[tx.type] || tx.type;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 8px', borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: isCredit ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
      }}>
        {isCredit ? '⬆' : '⬇'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
          {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
      </div>
      <div style={{
        fontSize: 14, fontWeight: 900, flexShrink: 0,
        color: isCredit ? '#4ade80' : '#fb923c',
      }}>
        {isCredit ? '+' : '-'}₹{Math.abs(tx.amount)}
      </div>
    </div>
  );
}
