"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  authApi,
  OnboardingPayload,
  ProfileUpdatePayload,
  User,
} from "@/services/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  getPostLoginRoute: (nextUser?: User | null) => string;
  googleLogin: (idToken: string) => Promise<User>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<User>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<User>;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: "student" | "recruiter";
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem("access_token");
  });

  const getPostLoginRoute = (nextUser?: User | null) => {
    const current = nextUser ?? user;
    if (!current) return "/";
    if (!current.onboarding_completed) return "/onboarding";
    return current.role === "recruiter"
      ? "/recruiter/dashboard"
      : "/student/dashboard";
  };

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const googleLogin = async (idToken: string) => {
    const res = await authApi.googleLogin(idToken);
    localStorage.setItem("access_token", res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const completeOnboarding = async (payload: OnboardingPayload) => {
    const res = await authApi.completeOnboarding(payload);
    setUser(res.data);
    return res.data;
  };

  const updateProfile = async (payload: ProfileUpdatePayload) => {
    const res = await authApi.updateProfile(payload);
    setUser(res.data);
    return res.data;
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem("access_token", res.data.access_token);
    setUser(res.data.user);
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name: string;
    role: "student" | "recruiter";
  }) => {
    const res = await authApi.register(data);
    localStorage.setItem("access_token", res.data.access_token);
    setUser(res.data.user);
  };

  const logout = () => {
    authApi.logout();
    localStorage.removeItem("access_token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        getPostLoginRoute,
        googleLogin,
        completeOnboarding,
        updateProfile,
        refreshSession,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
