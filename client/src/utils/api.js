/**
 * API utility — KavachForWork
 * Axios instance with JWT auth header
 */
import axios from 'axios';
import { API_BASE } from './runtime.js';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kfw_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally (token expired → logout)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('kfw_token');
      localStorage.removeItem('kfw_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (phone) => api.post('/auth/forgot-password', { phone }),
  verifyReset: (data) => api.post('/auth/verify-reset', data),
};

// User
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  activateInsurance: () => api.post('/user/activate-insurance'),
  getTransactions: (params) => api.get('/user/transactions', { params }),
};

// Claims
export const claimsAPI = {
  submit: (data) => api.post('/claims/submit', data),
  getMyClaims: (params) => api.get('/claims/my', { params }),
  getClaim: (id) => api.get(`/claims/${id}`),
  getAiStatus: () => api.get('/claims/ai-status'),
};

// Weather
export const weatherAPI = {
  getHeatwave: (params) => api.get('/weather/heatwave', { params }),
  getCurrent: (city) => api.get('/weather/current', { params: { city } }),
  getAQI: (params) => api.get('/weather/aqi', { params }),
};

// Wallet
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  topUp: (data) => api.post('/wallet/topup', data),
  withdrawToBank: (data) => api.post('/wallet/withdraw-bank', data),
  withdrawToUpi: (data) => api.post('/wallet/withdraw-upi', data),
};

export const payoutsAPI = {
  getMethods: () => api.get('/payouts/methods'),
  configureBankAccount: (data) => api.post('/payouts/bank-account/configure', data),
  configureUpi: (data) => api.post('/payouts/upi/configure', data),
  setDefaultMethod: (data) => api.post('/payouts/default', data),
  getHistory: (params) => api.get('/payouts/history', { params }),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getRevenue: (weeks) => api.get('/admin/revenue', { params: { weeks } }),
  getClaims: (params) => api.get('/admin/claims', { params }),
  updateClaim: (id, data) => api.put(`/admin/claims/${id}`, data),
  getWorkerMap: () => api.get('/admin/workers/map'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getFraudStats: () => api.get('/admin/fraud-stats'),
};

export default api;
