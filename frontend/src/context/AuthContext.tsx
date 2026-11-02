import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface User {
  userId?: string;
  id?: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("cs_token");
  }, []);

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cs_token");
    if (stored) {
      axios
        .get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        })
        .then((res) => {
          setToken(stored);
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem("cs_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credential: string) => {
    const res = await axios.post(`${API_URL}/api/auth/google`, { credential });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("cs_token", newToken);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
