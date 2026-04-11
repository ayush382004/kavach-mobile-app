import { useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Enable admin scrolling mode before paint
  useLayoutEffect(() => {
    document.documentElement.classList.add('admin-mode');
    return () => document.documentElement.classList.remove('admin-mode');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.adminLogin(form);
      login(data.token, data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-kavach-warm font-body flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-kavach-orange to-red-600 rounded-2xl flex items-center justify-center shadow-kavach mx-auto mb-4">
            <span className="text-white text-2xl">⚙️</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-kavach-dark">Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-1">KavachForWork Operations Dashboard</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Email</label>
              <input
                type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@kavachforwork.in"
                className="input-field" required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Admin password" className="input-field" required
              />
            </div>

            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <p className="text-xs text-orange-700 font-medium">
                Demo: admin@kavachforwork.in / Admin@Kavach2024<br/>
                (Seed the DB first with npm run seed)
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : 'Access Admin Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
