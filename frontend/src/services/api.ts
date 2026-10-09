import axios from 'axios';
import {
  Transaction,
  DashboardSummary,
  RiskTrendItem,
  RiskDistributionBucket,
  HumanReviewCase,
  SystemHealth,
  User
} from '../types';

const API_BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentinel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ access_token: string; user: User }> => {
    const res = await apiClient.post('/auth/login', { username, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  // Transactions
  analyzeTransaction: async (payload: Partial<Transaction>): Promise<Transaction> => {
    const res = await apiClient.post('/transactions/analyze', payload);
    return res.data;
  },
  getTransactions: async (params?: {
    status?: string;
    type?: string;
    min_risk?: number;
    search?: string;
    limit?: number;
  }): Promise<Transaction[]> => {
    const res = await apiClient.get('/transactions', { params });
    return res.data;
  },
  getTransactionDetail: async (id: string): Promise<Transaction> => {
    const res = await apiClient.get(`/transactions/${id}`);
    return res.data;
  },
  requestOTP: async (transaction_id: string, channel: string = 'SMS') => {
    const res = await apiClient.post('/transactions/otp/request', { transaction_id, channel });
    return res.data;
  },
  verifyOTP: async (transaction_id: string, otp_code: string) => {
    const res = await apiClient.post('/transactions/otp/verify', { transaction_id, otp_code });
    return res.data;
  },

  // Dashboard & Metrics
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get('/dashboard/summary');
    return res.data;
  },
  getDashboardTrends: async (): Promise<RiskTrendItem[]> => {
    const res = await apiClient.get('/dashboard/trends');
    return res.data;
  },
  getRiskDistribution: async (): Promise<RiskDistributionBucket[]> => {
    const res = await apiClient.get('/dashboard/risk-distribution');
    return res.data;
  },

  // Analytics
  getRiskAnalytics: async () => {
    const res = await apiClient.get('/analytics/risk');
    return res.data;
  },

  // Model Performance
  getModelPerformance: async () => {
    const res = await apiClient.get('/models/performance');
    return res.data;
  },

  // Investigations & Case Management
  getReviewCases: async (status: string = 'PENDING'): Promise<HumanReviewCase[]> => {
    const res = await apiClient.get('/investigations', { params: { status } });
    return res.data;
  },
  submitReview: async (case_id: string, action: 'APPROVE' | 'REJECT', notes: string) => {
    const res = await apiClient.post(`/investigations/${case_id}/review`, { action, notes });
    return res.data;
  },

  // System & Health
  getHealth: async (): Promise<SystemHealth> => {
    const res = await apiClient.get('/system/health');
    return res.data;
  },
  getSettings: async () => {
    const res = await apiClient.get('/system/settings');
    return res.data;
  },
  updateSettings: async (settings: any) => {
    const res = await apiClient.post('/system/settings', settings);
    return res.data;
  },
};
