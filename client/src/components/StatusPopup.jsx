export default function StatusPopup({ toast }) {
  if (!toast) return null;

  const bg = toast.type === 'error'
    ? 'rgba(239,68,68,0.15)'
    : toast.type === 'warning'
      ? 'rgba(245,158,11,0.15)'
      : 'rgba(34,197,94,0.15)';
  const border = toast.type === 'error'
    ? 'rgba(239,68,68,0.3)'
    : toast.type === 'warning'
      ? 'rgba(245,158,11,0.3)'
      : 'rgba(34,197,94,0.3)';
  const color = toast.type === 'error' ? '#f87171'
    : toast.type === 'warning' ? '#fbbf24'
    : '#4ade80';

  return (
    <div style={{
      position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9998, width: 'calc(100% - 32px)', maxWidth: 360,
      animation: 'float-up 0.3s ease',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: bg, border: `1px solid ${border}`,
        backdropFilter: 'blur(20px)', borderRadius: 16,
        padding: '12px 16px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color }}>{toast.title || 'Status updated'}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{toast.message}</div>
      </div>
      <style>{`@keyframes float-up { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}
