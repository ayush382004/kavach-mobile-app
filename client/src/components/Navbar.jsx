import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-kavach-orange to-orange-600 shadow-kavach">
            <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-kavach-dark">
            Kavach<span className="text-kavach-orange">ForWork</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" active={isActive('/')}>Home</NavLink>
          <NavLink to="/faqs" active={isActive('/faqs')}>FAQs</NavLink>
          <NavLink to="/chatbot" active={isActive('/chatbot')}>Chatbot</NavLink>

          {user ? (
            <>
              <NavLink to="/dashboard" active={isActive('/dashboard')}>Dashboard</NavLink>
              <NavLink to="/wallet" active={isActive('/wallet')}>Wallet</NavLink>
              <NavLink to="/claim" active={isActive('/claim')}>File Claim</NavLink>
              {user.role === 'user' && <NotificationBell />}
              <button onClick={handleLogout} className="ml-2 px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:text-red-500">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ml-2 btn-secondary px-4 py-2 text-sm">Login</Link>
              <Link to="/register" className="btn-primary px-4 py-2 text-sm">Get Covered</Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 transition-colors hover:bg-orange-50 md:hidden"
          aria-label="Toggle menu"
        >
          <div className="w-5 space-y-1.5">
            <span className={`block h-0.5 bg-kavach-dark transition-transform ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 bg-kavach-dark transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-kavach-dark transition-transform ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </div>
        </button>
      </div>

      {mobileOpen && (
        <div className="animate-fade-in border-t border-orange-100 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            <MobileLink to="/" onClick={() => setMobileOpen(false)}>Home</MobileLink>
            <MobileLink to="/faqs" onClick={() => setMobileOpen(false)}>FAQs</MobileLink>
            <MobileLink to="/chatbot" onClick={() => setMobileOpen(false)}>Chatbot</MobileLink>
            {user ? (
              <>
                <MobileLink to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</MobileLink>
                <MobileLink to="/wallet" onClick={() => setMobileOpen(false)}>Wallet</MobileLink>
                <MobileLink to="/claim" onClick={() => setMobileOpen(false)}>File Claim</MobileLink>
                <button onClick={handleLogout} className="w-full px-3 py-2.5 text-left text-sm font-semibold text-red-500">
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link to="/login" className="btn-secondary flex-1 py-2.5 text-center text-sm" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="btn-primary flex-1 py-2.5 text-center text-sm" onClick={() => setMobileOpen(false)}>
                  Get Covered
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-orange-50 text-kavach-orange' : 'text-gray-600 hover:bg-orange-50 hover:text-kavach-orange'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileLink({ to, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-orange-50 hover:text-kavach-orange"
    >
      {children}
    </Link>
  );
}
