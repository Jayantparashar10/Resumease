"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import {
  authApi,
  OnboardingPayload,
  ProfileUpdatePayload,
  User,
} from "@/services/api";
import { setAccessToken } from "@/lib/tokenStore";

// ── httpOnly Cookie Bridge ────────────────────────────────────────────────────
//
// Security model:
//   • The raw access token is stored ONLY in a module-level variable via
//     tokenStore.ts. It is never written to localStorage or sessionStorage —
//     both are readable by any JavaScript on the page (XSS vectors).
//   • On login the token is also sent to the Next.js Route Handler at
//     /api/auth/set-token, which writes it as an httpOnly Secure
//     SameSite=Strict cookie. This prevents interception by malicious scripts.
//
// NOTE — hard reload behaviour:
//   On a hard page reload the in-memory token (tokenStore) is reset to null.
//   The app will attempt refreshSession(), which will find no token and
//   redirect to login. The httpOnly cookie is NOT currently used as a fallback
//   auth channel for the backend (which only reads the Authorization header).
//   The cookie exists solely to protect the token at rest in the browser;
//   a future improvement would be a Next.js middleware that reads the cookie
//   and injects it as the Authorization header for server-rendered routes.
//   For now, users will need to re-authenticate after a hard reload.

async function persistTokenCookie(token: string): Promise<void> {
  try {
    await fetch("/api/auth/set-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Non-fatal: in-memory token still works for the current session
    console.warn("[auth] Failed to persist token cookie");
  }
}

async function clearTokenCookie(): Promise<void> {
  try {
    await fetch("/api/auth/clear-token", { method: "POST" });
  } catch {
    console.warn("[auth] Failed to clear token cookie");
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  getPostLoginRoute: (nextUser?: User | null) => string;
  googleLogin: (idToken: string) => Promise<User>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<User>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<User>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRestored = useRef(false);

  const getPostLoginRoute = (nextUser?: User | null) => {
    const current = nextUser ?? user;
    if (!current) return "/";
    if (!current.onboarding_completed) return "/onboarding";
    return current.role === "recruiter"
      ? "/recruiter/dashboard"
      : "/student/dashboard";
  };

  const refreshSession = useCallback(async () => {
    // In-memory token is empty on hard reload — user must re-authenticate.
    // The httpOnly cookie is not used as a backend auth channel yet.
    if (!_isTokenSet()) {
      setUser(null);
      return;
    }

    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch {
      // Token is invalid or expired — clear everything
      setAccessToken(null);
      await clearTokenCookie();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (sessionRestored.current) return;
    sessionRestored.current = true;
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const googleLogin = async (idToken: string): Promise<User> => {
    const res = await authApi.googleLogin(idToken);
    const { access_token, user: loggedInUser } = res.data;

    setAccessToken(access_token);
    await persistTokenCookie(access_token);

    setUser(loggedInUser);
    return loggedInUser;
  };

  const completeOnboarding = async (payload: OnboardingPayload): Promise<User> => {
    const res = await authApi.completeOnboarding(payload);
    setUser(res.data);
    return res.data;
  };

  const updateProfile = async (payload: ProfileUpdatePayload): Promise<User> => {
    const res = await authApi.updateProfile(payload);
    setUser(res.data);
    return res.data;
  };

  /**
   * Logout:
   *  1. Call the backend /logout endpoint to revoke the Supabase token server-side.
   *     This is best-effort — a failure is logged but does not block local cleanup.
   *  2. Clear the in-memory token and httpOnly cookie.
   *  3. Clear React state and redirect to home.
   */
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (err) {
      // Best-effort: log the failure but always clear local state so the user
      // is not stuck in a broken logged-in UI.
      console.warn("[auth] Server-side logout failed:", err);
    } finally {
      setAccessToken(null);
      await clearTokenCookie();
      setUser(null);
      window.location.href = "/";
    }
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

// ── Internal helpers ──────────────────────────────────────────────────────────

import { getAccessToken } from "@/lib/tokenStore";

function _isTokenSet(): boolean {
  return getAccessToken() !== null;
}
