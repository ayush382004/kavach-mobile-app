/**
 * BottomNav — Phone-native bottom navigation bar with Premium Glassmorphism
 */
import { Link, useLocation } from 'react-router-dom';

const NavItem = ({ to, label, icon, activeIcon }) => {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center flex-1 relative py-2"
      style={{ textDecoration: 'none' }}
    >
      {/* Active Highlight Glow */}
      {active && (
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 blur-xl -translate-y-2" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-1 transition-all">
        <div 
          className="flex items-center justify-center transition-all duration-300"
          style={{ 
            color: active ? '#f97316' : 'rgba(255,255,255,0.4)',
            transform: active ? 'translateY(-2px)' : 'none'
          }}
        >
          {active ? activeIcon || icon : icon}
        </div>
        
        <span style={{
          fontSize: 10, 
          fontWeight: 700, 
          letterSpacing: '0.04em',
          color: active ? '#f97316' : 'rgba(255,255,255,0.3)',
          transition: 'color 0.2s',
        }}>
          {label}
        </span>

        {active && (
          <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
        )}
      </div>
    </Link>
  );
};

const IconHome = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const IconWallet = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
);
const IconClaim = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);
const IconHelp = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavItem to="/dashboard" label="Home"   icon={<IconHome />} />
      <NavItem to="/wallet"    label="Wallet" icon={<IconWallet />} />
      <NavItem to="/claim"     label="Claim"  icon={<IconClaim />} />
      <NavItem to="/chatbot"   label="Help"   icon={<IconHelp />} />
    </nav>
  );
}

