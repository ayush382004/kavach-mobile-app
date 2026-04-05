/**
 * BottomNav — Phone-native bottom navigation bar
 */
import { Link, useLocation } from 'react-router-dom';

const NavItem = ({ to, label, icon }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center flex-1 gap-0.5 transition-all active:scale-90"
      style={{ textDecoration: 'none' }}
    >
      <span style={{ color: active ? '#f97316' : 'rgba(255,255,255,0.35)', fontSize: 22, transition: 'color 0.2s' }}>
        {icon}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
        color: active ? '#f97316' : 'rgba(255,255,255,0.3)',
        transition: 'color 0.2s',
      }}>
        {label}
      </span>
      {active && (
        <span style={{
          width: 4, height: 4, borderRadius: '50%',
          background: '#f97316', marginTop: 2,
          boxShadow: '0 0 6px #f97316',
        }} />
      )}
    </Link>
  );
};

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavItem to="/dashboard" label="Home" icon="🏠" />
      <NavItem to="/wallet"    label="Wallet" icon="💰" />
      <NavItem to="/claim"     label="Claim"  icon="📋" />
      <NavItem to="/chatbot"   label="Help"   icon="💬" />
    </nav>
  );
}
