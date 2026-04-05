/**
 * Splash — Fast 1.2s intro with dark glassmorphism
 */
import { useEffect, useState } from 'react';

export default function Splash({ onFinish }) {
  const [phase, setPhase] = useState('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 200);
    const t2 = setTimeout(() => setPhase('out'), 1000);
    const t3 = setTimeout(() => onFinish(), 1350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #0d0d14 0%, #131320 60%, #1a0d24 100%)',
        transition: 'opacity 0.35s ease',
        opacity: phase === 'out' ? 0 : 1,
      }}
    >
      {/* Glow blob */}
      <div style={{
        position: 'absolute', width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{
        transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
        transform: phase === 'in' ? 'scale(0.5)' : 'scale(1)',
        opacity: phase === 'in' ? 0 : 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative',
      }}>
        {/* Ring around logo */}
        <div style={{
          width: 148, height: 148,
          borderRadius: '50%',
          border: '2px solid rgba(249,115,22,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(249,115,22,0.25), inset 0 0 20px rgba(249,115,22,0.05)',
          background: 'rgba(249,115,22,0.05)',
          overflow: 'hidden',
        }}>
          <img
            src="/logo.png"
            alt="Kavach"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{
          marginTop: 20, fontSize: 26, fontWeight: 800,
          fontFamily: "'Sora', sans-serif",
          color: '#fff', letterSpacing: '-0.5px',
        }}>
          Kavach<span style={{ color: '#f97316' }}>ForWork</span>
        </div>
        <div style={{
          marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)',
          letterSpacing: 4, textTransform: 'uppercase',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          Guildwire · Climate Protection
        </div>
      </div>

      {/* Bottom bar */}
      {phase !== 'in' && (
        <div style={{
          position: 'absolute', bottom: 52,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 36, height: 36,
            border: '2.5px solid rgba(249,115,22,0.2)',
            borderTop: '2.5px solid #f97316',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
          }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>SECURING</span>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
