import { useState, useRef, useEffect } from 'react';
import BottomNav from '../components/BottomNav.jsx';
import { API_BASE } from '../utils/runtime.js';

const SYSTEM_PROMPT = `You are Kavach Assistant...`;

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Namaste! 🙏 Main Kavach Assistant hoon. Main aapki madad kar sakta hoon:\n\n• Insurance ke baare mein\n• Claims kaise file karein\n• Wallet top-up\n• Heatwave alerts\n\nKya jaanna chahte hain? (Hindi ya English mein poochh sakte hain)',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/chatbot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!response.ok) throw new Error('Chatbot API error');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      const reply = getLocalReply(text);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } finally { setLoading(false); }
  };

  const QUICK_QUESTIONS = [
    'How do I file a claim?', 'How much is the premium?', 'When will I get paid?', 'Fraud detection?'
  ];

  return (
    <div className="phone-screen" style={{ overflowY: 'hidden', height: '100dvh', minHeight: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 72 }}>
      <div style={{ padding: '24px 20px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(249,115,22,0.1)', border: '2px solid rgba(249,115,22,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
           <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>Kavach Assistant</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 6px #4ade80', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Online • AI Support</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '0 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '12px 16px', borderRadius: 20,
              fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              background: msg.role === 'user' ? '#f97316' : 'rgba(255,255,255,0.08)',
              color: '#fff',
              borderBottomRightRadius: msg.role === 'user' ? 4 : 20,
              borderBottomLeftRadius: msg.role !== 'user' ? 4 : 20,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="fade-up" style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: 20, borderBottomLeftRadius: 4, display: 'flex', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: '#f97316', borderRadius: '50%', animation: 'bounce 1s infinite' }} />
            <span style={{ width: 6, height: 6, background: '#f97316', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }} />
            <span style={{ width: 6, height: 6, background: '#f97316', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 20px', background: 'linear-gradient(to top, #0d0d14 80%, transparent)' }}>
        {messages.length <= 1 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage(input)} placeholder="Ask anything…" className="input-field" style={{ flex: 1, padding: '12px 16px', borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} disabled={loading} />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{ width: 44, height: 44, borderRadius: '50%', background: '#f97316', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            ↑
          </button>
        </div>
      </div>
      </div>
      <BottomNav />
    </div>
  );
}

function getLocalReply(text) {
  const t = text.toLowerCase();
  if (t.includes('claim') || t.includes('file')) return '📋 To file a claim:\n1. Make sure your insurance is active\n2. Open "File Claim"\n3. Kavach checks weather at your location\n4. Sentry-AI verifies hardware and location signals\n5. Approved money is processed to your selected payout route.';
  if (t.includes('premium') || t.includes('₹29')) return '💰 KavachForWork uses dynamic weekly pricing.\n\nYour premium depends on your registered state and city. The app shows your exact weekly amount before activation, and renewal works only if your wallet has enough balance.';
  if (t.includes('fraud') || t.includes('ai') || t.includes('verify')) return '🤖 Our Sentry AI checks 8 signals:\n• Battery temperature\n• Network type\n• Screen brightness\n• GPS jitter & altitude\n• Battery drain rate\n\nYou can\'t fool it from an AC room! 🌡️';
  if (t.includes('payout') || t.includes('money')) return '💸 Payouts depend on heat severity and your registered pricing slab.\n\nApproved claim money can be sent to your wallet, linked bank account, or UPI.';
  if (t.includes('wallet') || t.includes('balance')) return '💳 To top up your wallet:\n1. Go to Wallet page\n2. Choose a quick amount or enter a custom amount\n3. Complete the mock payment flow\n4. Balance updates in the app';
  return 'Namaste! Main samjha nahi. Please ek aur tarike se poochein, ya humse contact karein support@kavachforwork.in par. 🙏';
}
