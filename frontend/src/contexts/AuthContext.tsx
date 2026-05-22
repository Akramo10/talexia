import axios from 'axios';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../lib/api';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

export interface UserSubscription {
  id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  starts_at: string;
  ends_at: string;
  plan: {
    id: string;
    name: string;
    duration_months: number;
    price_eur: string;
    is_active: boolean;
  };
}

interface AuthContextValue {
  user: User | null;
  subscription: UserSubscription | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, confirmPassword: string, fullName?: string, phone?: string, plan?: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<string>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyToken(token: string | null) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem('pathfinder_token', token);
  } else {
    delete axios.defaults.headers.common.Authorization;
    localStorage.removeItem('pathfinder_token');
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pathfinder_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyToken(token);
    if (!token) {
      setLoading(false);
      return;
    }
    axios.get(`${API_BASE}/auth/me`)
      .then(async (res) => {
        setUser(res.data);
        const subscriptionRes = await axios.get(`${API_BASE}/subscriptions/me`);
        setSubscription(subscriptionRes.data);
      })
      .catch(() => {
        applyToken(null);
        setToken(null);
        setUser(null);
        setSubscription(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const consumeTokenResponse = (data: { access_token: string; user: User }) => {
    setToken(data.access_token);
    setUser(data.user);
    applyToken(data.access_token);
  };

  const refreshSubscription = async () => {
    const res = await axios.get(`${API_BASE}/subscriptions/me`);
    setSubscription(res.data);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    subscription,
    token,
    loading,
    login: async (email, password) => {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      consumeTokenResponse(res.data);
    },
    register: async (email, password, confirmPassword, fullName, phone, plan = 'trial_3_months') => {
      const res = await axios.post(`${API_BASE}/auth/register`, { email, password, confirm_password: confirmPassword, full_name: fullName, phone: phone || null, plan });
      consumeTokenResponse(res.data);
      await refreshSubscription();
    },
    refreshSubscription,
    forgotPassword: async (email) => {
      const res = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
      return res.data.message;
    },
    resetPassword: async (token, newPassword, confirmPassword) => {
      const res = await axios.post(`${API_BASE}/auth/reset-password`, { token, new_password: newPassword, confirm_password: confirmPassword });
      return res.data.message;
    },
    googleLogin: async (idToken) => {
      const res = await axios.post(`${API_BASE}/auth/google`, { id_token: idToken });
      consumeTokenResponse(res.data);
    },
    logout: () => {
      applyToken(null);
      setToken(null);
      setUser(null);
      setSubscription(null);
    },
  }), [loading, subscription, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
