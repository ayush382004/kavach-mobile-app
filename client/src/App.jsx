import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { NotificationsProvider } from './hooks/useNotifications.jsx';

import Home from './pages/Home.jsx';
import FAQs from './pages/FAQs.jsx';
import Chatbot from './pages/Chatbot.jsx';
import Login from './pages/user/Login.jsx';
import Register from './pages/user/Register.jsx';
import ForgotPassword from './pages/user/ForgotPassword.jsx';
import Dashboard from './pages/user/Dashboard.jsx';
import Wallet from './pages/user/Wallet.jsx';
import ClaimPage from './pages/user/ClaimPage.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kavach-warm">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-kavach-orange border-t-transparent" />
      </div>
    );
  }
  return user && user.role === 'user' ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user && user.role === 'admin' ? children : <Navigate to="/admin/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'user') return <Navigate to="/dashboard" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
}

function NativeBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined;
    }

    let removed = false;
    let listener;

    const register = async () => {
      listener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
          return;
        }

        if (location.pathname !== '/') {
          navigate(user?.role === 'admin' ? '/admin' : '/', { replace: true });
          return;
        }

        CapacitorApp.exitApp();
      });

      if (removed) {
        listener.remove();
      }
    };

    register().catch(() => {});

    return () => {
      removed = true;
      listener?.remove();
    };
  }, [location.pathname, navigate, user?.role]);

  return null;
}

export default function App() {
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  return (
    <AuthProvider>
      <NotificationsProvider>
        <Router>
          <NativeBackHandler />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/faqs" element={<FAQs />} />
            <Route path="/chatbot" element={<Chatbot />} />

            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />

            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
            <Route path="/claim" element={<PrivateRoute><ClaimPage /></PrivateRoute>} />

            <Route path="/admin/login" element={<PublicOnlyRoute><AdminLogin /></PublicOnlyRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </NotificationsProvider>
    </AuthProvider>
  );
}
