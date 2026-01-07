import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API methods
export const explorerApi = {
  getStats: () => api.get('/explorer/stats'),
  getAddress: (address: string) => api.get(`/explorer/address/${address}`),
  getMining: (days: number = 30) => api.get(`/explorer/mining?days=${days}`),
  getRichList: (limit: number = 10) => api.get(`/explorer/richlist?limit=${limit}`),
};

export const stakingApi = {
  getStats: () => api.get('/staking/stats'),
  getLeaderboard: (limit: number = 10) => api.get(`/staking/leaderboard?limit=${limit}`),
  getAddressStakes: (address: string) => api.get(`/staking/address/${address}`),
};

export const walletApi = {
  getInfo: () => api.get('/wallet/info'),
  getWallets: () => api.get('/wallet'),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, username: string, password: string) =>
    api.post('/auth/register', { email, username, password }),
};

export default api;
