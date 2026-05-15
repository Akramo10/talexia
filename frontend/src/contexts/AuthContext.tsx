import axios from 'axios';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../lib/api';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pathfinder_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyToken(token);
    if (!token) {
      setLoading(false);
      return;
    }
    axios.get(`${API_BASE}/auth/me`)
      .then((res) => setUser(res.data))
      .catch(() => {
        applyToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const consumeTokenResponse = (data: { access_token: string; user: User }) => {
    setToken(data.access_token);
    setUser(data.user);
    applyToken(data.access_token);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    login: async (email, password) => {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      consumeTokenResponse(res.data);
    },
    register: async (email, password, fullName) => {
      const res = await axios.post(`${API_BASE}/auth/register`, { email, password, full_name: fullName });
      consumeTokenResponse(res.data);
    },
    googleLogin: async (idToken) => {
      const res = await axios.post(`${API_BASE}/auth/google`, { id_token: idToken });
      consumeTokenResponse(res.data);
    },
    logout: () => {
      applyToken(null);
      setToken(null);
      setUser(null);
    },
  }), [loading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
