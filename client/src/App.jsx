import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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

import Splash from './components/Splash.jsx';
import { useState } from 'react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      {showSplash && <Splash onFinish={() => setShowSplash(false)} />}
      <NotificationsProvider>
        <BrowserRouter>
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

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationsProvider>
    </AuthProvider>
  );
}
