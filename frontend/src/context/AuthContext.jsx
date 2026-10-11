import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
      }
      fetchMe(savedToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextToken, nextUser) {
    if (nextToken) localStorage.setItem('token', nextToken);
    else localStorage.removeItem('token');
    if (nextUser) localStorage.setItem('user', JSON.stringify(nextUser));
    else localStorage.removeItem('user');
  }

  async function fetchMe(existingToken) {
    try {
      const res = await authAPI.me();
      const me = res.data?.user ?? res.data?.data?.user ?? res.data?.data ?? res.data;
      setUser(me);
      persist(existingToken || localStorage.getItem('token'), me);
      return me;
    } catch {
      // Stale/invalid token — clear state so ProtectedRoute redirects cleanly
      // (api interceptor also clears localStorage + hard-redirects on 401).
      setToken(null);
      setUser(null);
      persist(null, null);
      return null;
    }
  }

  async function login(email, password) {
    const res = await authAPI.login({ email, password });
    const nextToken = res.data?.token || null;
    const nextUser = res.data?.user || null;
    setToken(nextToken);
    setUser(nextUser);
    persist(nextToken, nextUser);
    return nextUser;
  }

  async function register(payload) {
    const res = await authAPI.register(payload);
    const nextToken = res.data?.token || null;
    const nextUser = res.data?.user || null;
    setToken(nextToken);
    setUser(nextUser);
    persist(nextToken, nextUser);
    return nextUser;
  }

  function logout() {
    setToken(null);
    setUser(null);
    persist(null, null);
  }

  function updateUser(nextUser) {
    setUser(nextUser);
    persist(localStorage.getItem('token'), nextUser);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, fetchMe, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
