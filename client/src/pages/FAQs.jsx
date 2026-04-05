/**
 * FAQs Page — KavachForWork (Dark Theme)
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

const FAQS = [
  {
    category: '🌡️ Coverage & Claims',
    items: [
      {
        q: 'What temperature triggers a payout?',
        a: 'When the temperature at your GPS location crosses 45°C, you become eligible to file a claim. Payout tiers:\n• 45°C → ₹150\n• 47°C → ₹300\n• 50°C+ → ₹500\nThe exact amount depends on your registered state/city pricing slab.',
      },
      {
        q: 'How does Kavach verify I\'m actually outdoors?',
        a: 'Our Sentry AI model checks 8 device signals:\n• Battery temperature (outdoor batteries heat above 42°C)\n• GPS vs WiFi network type\n• Screen brightness level\n• Battery drain rate\n• Location jitter pattern\n• Motion/movement detection\n\nYou cannot fake being outdoors from an AC room.',
      },
      {
        q: 'How quickly is the payout credited?',
        a: 'Approved claims are processed immediately after verification. Money goes to your wallet, linked bank account, or UPI. Flagged claims go to admin review — usually resolved within 24 hours.',
      },
      {
        q: 'Can I file multiple claims per day?',
        a: 'You can file up to 3 claims per day, but typically only one payout per verified heatwave event is processed.',
      },
    ],
  },
  {
    category: '💰 Insurance & Payments',
    items: [
      {
        q: 'How much does weekly coverage cost?',
        a: 'KavachForWork uses dynamic pricing. Your weekly premium is based on your registered state and city risk profile. Typical range: ₹29–₹49/week. The app shows the exact amount before activation.',
      },
      {
        q: 'What happens if I don\'t have enough wallet balance on renewal day?',
        a: 'Your insurance is automatically deactivated until you top up and activate again. There is no penalty — just top up and swipe to reactivate.',
      },
      {
        q: 'Can I get a refund on my premium?',
        a: 'Premiums are non-refundable once activated, similar to travel insurance. If there was a technical error, contact support via the chatbot.',
      },
      {
        q: 'How do I add money to my wallet?',
        a: 'Go to Wallet tab → Top Up → choose amount → pay via UPI/card. Minimum top-up is ₹24. Your ₹100 signup bonus is credited automatically on registration.',
      },
    ],
  },
  {
    category: '🤖 Technology & Security',
    items: [
      {
        q: 'How does the AI detect fraud?',
        a: 'Our Random Forest model (8 features) checks if your battery temperature, network type, screen brightness, and movement match outdoor conditions in 45°C+ heat. Someone claiming from an AC room will have:\n• Cool battery (<30°C)\n• WiFi connection instead of mobile data\n• Low screen brightness\nAll of these are fraud signals.',
      },
      {
        q: 'Which weather data source do you use?',
        a: 'We use Open-Meteo API (free, highly accurate) for real-time temperature at your GPS coordinates. This is our independent "oracle" for the payout trigger.',
      },
      {
        q: 'Does the app work on all devices?',
        a: 'Yes! The web app works on:\n• 📱 Android & iOS phones\n• 💻 Laptops and desktops\n• 📱 Tablets\nThe native battery temperature sensor (for fraud detection) requires Android for full functionality. iOS users are verified via GPS + network type.',
      },
      {
        q: 'Is my data secure?',
        a: 'All data is encrypted in transit (TLS) and at rest. We only collect your location at claim time — not continuously. JWT tokens expire after 7 days. Aadhaar/ID data is never stored in plaintext.',
      },
    ],
  },
  {
    category: '📲 Getting Started',
    items: [
      {
        q: 'How do I register?',
        a: 'Tap "Join Kavach" → fill your name, mobile number (Indian, starting 6-9), city, and state → allow location access → accept terms. You\'ll receive ₹100 signup bonus instantly!',
      },
      {
        q: 'How do I activate my insurance?',
        a: 'After login, go to Dashboard → swipe the "Swipe to Activate" slider. ₹29 (or your pricing tier) will be deducted from your wallet and your shield activates for 7 days.',
      },
      {
        q: 'I forgot my password. What do I do?',
        a: 'On the login page, tap "Forgot Password" → enter your registered mobile number → you\'ll receive a reset OTP. Enter the OTP and set a new password.',
      },
    ],
  },
];

export default function FAQs() {
  const [open, setOpen] = useState({});
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = search.trim()
    ? FAQS.map(section => ({
        ...section,
        items: section.items.filter(
          item =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : FAQS;

  return (
    <div className="phone-screen">
      <div className="page-content" style={{ paddingBottom: user ? 96 : 40 }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, cursor: 'pointer',
              flexShrink: 0,
            }}
          >←</button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>FAQs</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Frequently Asked Questions</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 20px 20px' }}>
          <input
            type="text"
            placeholder="🔍  Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              padding: '12px 16px',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        {/* FAQ sections */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
              No results for "{search}"
            </div>
          )}
          {filtered.map(section => (
            <div key={section.category}>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: '#f97316',
                letterSpacing: '0.06em',
                marginBottom: 10,
                textTransform: 'uppercase',
              }}>
                {section.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.items.map((item, i) => {
                  const key = `${section.category}-${i}`;
                  const isOpen = open[key];
                  return (
                    <div
                      key={i}
                      className="glass"
                      style={{
                        padding: '14px 16px',
                        border: isOpen ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(255,255,255,0.08)',
                        transition: 'border 0.2s, box-shadow 0.2s',
                        boxShadow: isOpen ? '0 0 20px rgba(249,115,22,0.1)' : 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggle(key)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.4, flex: 1 }}>
                          {item.q}
                        </span>
                        <span style={{
                          fontSize: 20, color: '#f97316', flexShrink: 0,
                          transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                          transition: 'transform 0.2s',
                          lineHeight: 1,
                        }}>+</span>
                      </div>
                      {isOpen && (
                        <div style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: '1px solid rgba(255,255,255,0.08)',
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.65)',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-line',
                        }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="glass" style={{
          margin: '28px 20px',
          padding: '20px',
          textAlign: 'center',
          border: '1px solid rgba(249,115,22,0.2)',
          background: 'rgba(249,115,22,0.06)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Still have questions?</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            Chat with Kavach AI in Hindi or English
          </div>
          <Link
            to="/chatbot"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              boxShadow: '0 0 20px rgba(249,115,22,0.4)',
            }}
          >
            Chat with Kavach Assistant →
          </Link>
        </div>
      </div>

      {user && <BottomNav />}
    </div>
  );
}
