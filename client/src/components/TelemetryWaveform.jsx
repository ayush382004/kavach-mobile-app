/**
 * TelemetryWaveform — Live accelerometer waveform canvas
 * Squiggly line at the bottom of the screen. When you shake the phone, the line spikes.
 * Proves the app is physically connected to hardware sensors.
 */
import { useEffect, useRef, useCallback } from 'react';

const HISTORY_LEN = 80;

export default function TelemetryWaveform({ color = '#f97316', height = 56 }) {
  const canvasRef = useRef(null);
  const historyRef = useRef(Array(HISTORY_LEN).fill(0));
  const lastAccRef = useRef({ x: 0, y: 0, z: 0 });
  const motionGranted = useRef(false);

  const pushSample = useCallback((magnitude) => {
    historyRef.current.push(magnitude);
    if (historyRef.current.length > HISTORY_LEN) historyRef.current.shift();
  }, []);

  // Request permission on iOS 13+
  useEffect(() => {
    const requestMotion = async () => {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const res = await DeviceMotionEvent.requestPermission();
          motionGranted.current = res === 'granted';
        } catch { /* ignore */ }
      } else {
        motionGranted.current = true;
      }
    };
    requestMotion();
  }, []);

  useEffect(() => {
    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const dx = Math.abs(x - lastAccRef.current.x);
      const dy = Math.abs(y - lastAccRef.current.y);
      const dz = Math.abs(z - lastAccRef.current.z);
      lastAccRef.current = { x, y, z };
      const shake = Math.min((dx + dy + dz) / 3, 1);
      pushSample(shake);
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [pushSample]);

  // Idle animation when no motion data
  const idlePhase = useRef(0);
  useEffect(() => {
    const idleTimer = window.setInterval(() => {
      const hasMotion = historyRef.current.some(v => v > 0.02);
      if (!hasMotion) {
        idlePhase.current += 0.06;
        const val = (Math.sin(idlePhase.current) * 0.5 + 0.5) * 0.08;
        pushSample(val);
      }
    }, 120);
    return () => window.clearInterval(idleTimer);
  }, [pushSample]);

  // Draw waveform
  useEffect(() => {
    let drawTimer;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const data = historyRef.current;
      const step = W / (HISTORY_LEN - 1);
      const mid = H / 2;

      // Gradient fill under curve
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, color + '44');
      grad.addColorStop(1, color + '00');

      ctx.beginPath();
      ctx.moveTo(0, mid);
      data.forEach((v, i) => {
        const x = i * step;
        const y = mid - v * (H * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(W, mid);
      ctx.lineTo(0, mid);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = i * step;
        const y = mid - v * (H * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.stroke();
    };

    draw();
    drawTimer = window.setInterval(draw, 80);
    return () => window.clearInterval(drawTimer);
  }, [color]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="glass rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#f97316', opacity: 0.8 }}>
          Live Telemetry
        </span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Shake to spike ↑</span>
      </div>
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        style={{ height: `${height}px`, width: '100%', display: 'block' }}
      />
    </div>
  );
}
