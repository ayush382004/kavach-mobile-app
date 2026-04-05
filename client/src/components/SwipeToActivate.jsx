/**
 * SwipeToActivate — Premium swipe-to-confirm slider
 * Feels expensive and secure compared to a plain button tap.
 */
import { useRef, useState, useCallback } from 'react';

export default function SwipeToActivate({ onConfirm, label = 'Swipe to Activate', color = '#f97316', disabled = false, loading = false }) {
  const trackRef = useRef(null);
  const [progress, setProgress] = useState(0); // 0–1
  const [done, setDone] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);

  const getTrackWidth = () => trackRef.current?.offsetWidth ?? 300;
  const thumbSize = 60;

  const toProgress = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const max = rect.width - thumbSize - 12;
    const rel = clientX - rect.left - thumbSize / 2;
    return Math.max(0, Math.min(1, rel / max));
  }, []);

  const onStart = useCallback((clientX) => {
    if (disabled || loading || done) return;
    dragging.current = true;
    startX.current = clientX;
  }, [disabled, loading, done]);

  const onMove = useCallback((clientX) => {
    if (!dragging.current) return;
    setProgress(toProgress(clientX));
  }, [toProgress]);

  const onEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setProgress(p => {
      if (p > 0.85) {
        setDone(true);
        onConfirm?.();
        return 1;
      }
      return 0; // snap back
    });
  }, [onConfirm]);

  // Touch events
  const onTouchStart = (e) => onStart(e.touches[0].clientX);
  const onTouchMove = (e) => { e.preventDefault(); onMove(e.touches[0].clientX); };
  const onTouchEnd = () => onEnd();

  // Mouse events (for browser testing)
  const onMouseDown = (e) => onStart(e.clientX);
  const onMouseMove = (e) => { if (dragging.current) onMove(e.clientX); };
  const onMouseUp = () => onEnd();

  const thumbLeft = progress * (getTrackWidth() - thumbSize - 12);
  const fillWidth = thumbLeft + thumbSize / 2 + 6;

  return (
    <div
      ref={trackRef}
      className="swipe-track select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{ opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    >
      {/* Fill */}
      <div
        className="swipe-fill"
        style={{
          width: `${fillWidth}px`,
          background: done
            ? `linear-gradient(90deg, rgba(34,197,94,0.4), rgba(34,197,94,0.2))`
            : `linear-gradient(90deg, ${color}55, ${color}22)`,
        }}
      />

      {/* Label (fades as thumb moves right) */}
      <span
        className="swipe-label"
        style={{ color: 'rgba(255,255,255,0.4)', opacity: done ? 0 : Math.max(0, 1 - progress * 2.5) }}
      >
        {loading ? 'Processing…' : label}
      </span>

      {/* Thumb */}
      <div
        className="swipe-thumb"
        style={{
          left: `${6 + thumbLeft}px`,
          background: done ? '#22c55e' : color,
          boxShadow: done
            ? `0 0 20px rgba(34,197,94,0.7)`
            : `0 0 20px ${color}99`,
          transition: dragging.current ? 'none' : 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.3s, box-shadow 0.3s',
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {done ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-6 h-6">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : loading ? (
          <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </svg>
        )}
      </div>
    </div>
  );
}
