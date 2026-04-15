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
      // Read JSON regardless of status — server may return { reply: '...' } even on 503
      const data = await response.json().catch(() => null);
      if (data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error('No reply from server');
      }
    } catch {
      const reply = getLocalReply(text);
      setMessages(prev => [...prev, { role: 'assistant', ...reply }]);
    } finally { setLoading(false); }
  };

  const RichCard = ({ title, content, icon }) => (
    <div style={{ padding: '4px 0' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#f97316' }}>{title}</span>
       </div>
       <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{content}</div>
    </div>
  );

  const [selectedOption, setSelectedOption] = useState(null);
  const [showHelpSheet, setShowHelpSheet] = useState(false);

  return (
    <div className="phone-screen" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
                {msg.isRich ? (
                  <RichCard title={msg.title} content={msg.content} icon={msg.icon} />
                ) : (
                  msg.content
                )}
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

        {showHelpSheet && (
          <>
            <div 
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, backdropFilter: 'blur(4px)' }} 
              onClick={() => setShowHelpSheet(false)} 
            />
            <HelpSheet 
              onClose={() => setShowHelpSheet(false)} 
              onSelect={(item) => {
                setSelectedOption(item.id);
                sendMessage(item.label);
                setShowHelpSheet(false);
              }} 
            />
          </>
        )}

        <div style={{ padding: '12px 20px', background: 'linear-gradient(to top, #0d0d14 80%, transparent)', zIndex: 1001 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
               onClick={() => setShowHelpSheet(true)}
               style={{ 
                 width: 44, height: 44, borderRadius: '50%', 
                 background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
                 color: '#f97316', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
               }}
            >
              ☰
            </button>
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
  
  if (t.includes('hello') || t.includes('hi') || t.includes('namaste')) return { content: 'Namaste! 🙏 Kavach Assistant aapki seva me hajir hai. Main aapki claims, wallet aur coverage se judi har problem solve kar sakta hoon. Kaise madad karun?' };

  if (t.includes('zero-touch') || t.includes('auto') || t.includes('1')) return { 
    isRich: true, icon: '⚡', title: 'Zero-Touch Claims Architecture',
    content: 'Kavach logic is powered by a proprietary **Zero-Touch Cron Engine**. Unlike standard insurance, you don\'t need to "file" a request after a heatwave. Our servers poll certified weather stations every 60 minutes. \n\n🔒 **Trigger Rule:** If your local temperature exceeds your state-assigned threshold for 3 consecutive readings (cumulative intensity), the system self-executes a smart contract. \n\n💸 **Instant Settlement:** Funds are dispersed to your wallet via our automated API switch within 300ms of the trigger event without any human intervention.'
  };

  if (t.includes('threshold') || t.includes('location') || t.includes('2')) return {
    isRich: true, icon: '📍', title: 'IMD-Aligned Dynamic Thresholds',
    content: 'We adhere strictly to the **India Meteorological Department (IMD)** regional classification for heatwave fairness. Fixed 45°C limits are obsolete. \n\n📍 **State Classification:**\n• **Category A (Arid):** Rajasthan/Delhi trigger at **40°C**.\n• **Category B (Coastal):** Kerala/Goa trigger at **35.1°C** (lower due to high humidity stress).\n• **Category C (Highlands):** J&K/Ladakh trigger at **30°C**.\n\nOur system calculates your threshold daily based on your current GPS state-mapping to ensure you aren\'t denied coverage just because your region is naturally cooler than others.'
  };

  if (t.includes('intensity') || t.includes('feels like') || t.includes('3')) return {
    isRich: true, icon: '🔥', title: 'Max Intensity (Apparent Temperature)',
    content: 'Temperature alone doesn\'t tell the whole story. Kavach uses the **NASA-Standard Feels Like (Apparent Temperature)** index. \n\n☁️ **Why?** High humidity prevents sweat from evaporating, making 38°C feel like 44°C. Our claim engine reads both Ambient Temp and Apparent Intensity. \n\n⚖️ **The Rule:** If Ambient is 38 but Feels Like is 42, the system uses 42°C for your claim check. This ensures fairness for workers in humid regions like Mumbai or Chennai.'
  };

  if (t.includes('cooling-off') || t.includes('waiting') || t.includes('4')) return {
    isRich: true, icon: '🛡', title: 'Anti-Fraud Policy (48h Cooling)',
    content: 'To maintain a stable insurance pool for all honest workers, we enforce a mandatory **48-Hour Waiting Period** (Parametric Cooling-off). \n\n🚫 **The Purpose:** This prevents a user from activating insurance *only after* they see a heatwave starting on the news. Coverage becomes "Locked & Active" exactly 48 hours after your first premium payment is confirmed. Any heatwave occurring before this window is not eligible for payout.'
  };

  if (t.includes('premium') || t.includes('cancellation') || t.includes('5')) return {
    isRich: true, icon: '💰', title: 'Financial Policies & No-Refund',
    content: 'KavachForWork operates on a **Non-Refundable Weekly Subscription** model. \n\n⚠️ **Deactivation Rules:**\n1. You can deactivate anytime, but the current week\'s premium will not be pro-rated or returned.\n2. Deactivation is physically blocked during active heatwave alerts for security. \n3. If your wallet balance falls below ₹24, auto-renewal will fail, and coverage will lapse instantly.'
  };

  if (t.includes('sentry') || t.includes('verify') || t.includes('6')) return {
    isRich: true, icon: '🤖', title: 'Sentry-AI (Firmware Verification)',
    content: 'Sentry-AI is our military-grade fraud detection layer. It doesn\'t just check GPS; it cross-references 8 hardware signals:\n\n• **Thermal Drift:** Checks if battery temp is rising (indicating sun exposure).\n• **Ambient Sync:** Reads light sensors to ensure you aren\'t indoors.\n• **GPS Jitter:** Detects "Mock Location" apps that simulate fake movement.\n• **Network Latency:** Verifies the ISP is a local mobile tower, not a home WiFi.\n\nAttempts to spoof these signals result in an immediate permanent ban from the Kavach network.'
  };

  if (t.includes('guide') || t.includes('state') || t.includes('7')) return {
    isRich: true, icon: '🌍', title: 'National Climate Master-List',
    content: 'Kavach dynamically maps triggers for all 28 States & 8 UTs based on IMD fairness standards:\n\n🔥 **Hyper-Heat (40-44°C):**\n• Rajasthan: 40°C | Delhi: 44°C\n• Punjab/Haryana/UP: 43°C\n• Bihar/MP/Gujarat: 42°C\n\n🌾 **Inland & Industrial (40-42°C):**\n• MH/Odisha/AP/Telangana: 40°C\n• Chhattisgarh/Jharkhand: 41°C\n\n🌴 **Coastal High-Humidity (35-38°C):**\n• Tamil Nadu/Puducherry: 38°C\n• Karnataka/Goa: 36-37°C\n• Kerala/Andaman: 35°C\n\n⛰️ **Hills & Highlands (25-32°C):**\n• Ladakh: 25°C | Sikkim: 28°C\n• HP/Uttarakhand/J&K: 30°C\n• NE States (Assam/Meghalaya): 30-37°C\n\n*Note: Your threshold updates instantly if you cross state borders.*'
  };

  if (t.includes('thanks') || t.includes('thank')) return { content: 'Shukriya! 🙏 Hum humesha aapki madad ke liye yahan hain. Stay safe, stay hydrated, and stay insured with Kavach!' };
  
  return { content: 'Main is sawal ka jawab abhi nahi de paa raha. Please select an option from the menu above to get a deep-dive technical explanation. 🙏' };
}

function HelpSheet({ onSelect }) {
  const QUICK_MENU = [
    { id: 1, label: 'Zero-Touch Claims (Auto Payout)', icon: '⚡' },
    { id: 2, label: 'Dynamic IMD Thresholds', icon: '📍' },
    { id: 3, label: 'Maximum Intensity Logic', icon: '🔥' },
    { id: 4, label: 'Anti-Fraud Cooling-off (48h)', icon: '🛡' },
    { id: 5, label: 'Premium & Cancellation', icon: '💰' },
    { id: 6, label: 'Sentry-AI Verification', icon: '🤖' },
    { id: 7, label: 'Regional Threshold Guide', icon: '🌍' },
  ];

  return (
    <div 
      className="fade-up-heavy"
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 'auto', maxHeight: '80%',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: '24px 20px 40px',
        zIndex: 2001,
        background: 'rgba(20, 20, 28, 0.98)',
        backdropFilter: 'blur(30px)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        overflowY: 'auto'
      }}
    >
      <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }} />
      <div style={{ fontSize: 13, fontWeight: 900, color: '#f97316', marginBottom: 24, letterSpacing: '0.1em', textAlign: 'center' }}>ADVANCED ACTIONS</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {QUICK_MENU.map((item) => (
          <button 
            key={item.id} 
            onClick={() => onSelect(item)}
            className="btn-secondary"
            style={{ 
              display: 'flex', alignItems: 'center', gap: 14, 
              padding: '16px 18px', borderRadius: 20, 
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff', textAlign: 'left', cursor: 'pointer',
              justifyContent: 'flex-start'
            }}
          >
            <div style={{ 
              width: 32, height: 32, borderRadius: '10px', background: 'rgba(249,115,22,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#f97316'
            }}>
              {item.id}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{item.icon} {item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
