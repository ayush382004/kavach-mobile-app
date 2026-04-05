/**
 * RiskRing — Dynamic pulsing ring that reflects current heat risk
 * Green: All clear  |  Pulsing Orange: Warning  |  Flashing Red: Payout Window Open
 */
import { useMemo } from 'react';

export default function RiskRing({ temperature, isHeatwave, children, size = 160 }) {
  const level = useMemo(() => {
    if (!temperature) return 'green';
    if (isHeatwave || temperature >= 45) return 'red';
    if (temperature >= 40) return 'orange';
    return 'green';
  }, [temperature, isHeatwave]);

  const label = {
    green: 'All Clear',
    orange: '⚠ Heat Warning',
    red: '🔴 Payout Window Open',
  }[level];

  const colors = {
    green:  { ring: '#22c55e', glow: 'rgba(34,197,94,0.4)',  text: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
    orange: { ring: '#f59e0b', glow: 'rgba(245,158,11,0.4)', text: '#fbbf24', bg: 'rgba(245,158,11,0.08)' },
    red:    { ring: '#ef4444', glow: 'rgba(239,68,68,0.5)',  text: '#f87171', bg: 'rgba(239,68,68,0.10)' },
  }[level];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`ring-${level} relative flex items-center justify-center rounded-full`}
        style={{
          width: size,
          height: size,
          background: colors.bg,
          transition: 'all 0.6s ease',
        }}
      >
        {children}
      </div>
      <span
        className="text-xs font-bold tracking-widest uppercase mt-1"
        style={{ color: colors.text }}
      >
        {label}
      </span>
    </div>
  );
}
