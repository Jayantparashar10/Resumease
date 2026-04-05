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

// ── Token storage ─────────────────────────────────────────────────────────────
//
// Security model:
//   • The raw access token is stored ONLY in a React ref (module memory).
//     It is never written to localStorage or sessionStorage — both are
//     accessible to any JavaScript running on the page (XSS vectors).
//   • On login the token is also sent to the Next.js Route Handler at
//     /api/auth/set-token, which writes it as an httpOnly Secure
//     SameSite=Strict cookie. This cookie is sent automatically by the
//     browser on every request to the same origin but is not readable by JS.
//   • The axios interceptor in services/api.ts reads from the in-memory ref
//     via `getAccessToken()`, so API calls work within the session.
//   • On hard reload the in-memory ref is empty. The app calls /auth/me
//     which the backend validates via the Bearer cookie (or re-login is
//     required). The refreshSession flow handles this gracefully.
//
// This eliminates the XSS token-theft attack vector present in the previous
// localStorage-based approach.

let _inMemoryToken: string | null = null;

/** Read the in-memory token. Used by the axios interceptor in api.ts. */
export function getAccessToken(): string | null {
  return _inMemoryToken;
}

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
  // Track whether we have attempted a session restore on mount
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
    // If we have no in-memory token, there is nothing to refresh.
    // The user will need to log in again after a hard page reload.
    if (!_inMemoryToken) {
      setUser(null);
      return;
    }

    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch {
      // Token is invalid or expired — clear everything
      _inMemoryToken = null;
      await clearTokenCookie();
      setUser(null);
    }
  }, []);

  // On mount: attempt to restore session from the in-memory token.
  // (After a hard reload the token is gone and the user must re-authenticate.)
  useEffect(() => {
    if (sessionRestored.current) return;
    sessionRestored.current = true;

    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const googleLogin = async (idToken: string): Promise<User> => {
    const res = await authApi.googleLogin(idToken);
    const { access_token, user: loggedInUser } = res.data;

    // Store in memory (primary) and httpOnly cookie (persistent across reloads)
    _inMemoryToken = access_token;
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
   *  2. Clear the httpOnly cookie via the Next.js route handler.
   *  3. Clear the in-memory token and React state.
   *  4. Redirect to home.
   *
   * Even if the backend call fails we still clear local state so the user
   * is not stuck in a logged-in UI with an invalid token.
   */
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      console.warn("[auth] Server-side logout failed; proceeding with local cleanup");
    } finally {
      _inMemoryToken = null;
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
