import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest, ApiError, onUnauthorized, setAuthToken, TOKEN_STORAGE_KEY } from "../apiClient";

const ROLE_STORAGE_KEY = "fleet-drishti-role";

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  role: string;
}

interface AuthContextValue {
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// No prior auth pattern existed in this codebase, so this is a small,
// self-contained context: token/role in React state, persisted to
// localStorage only so a page refresh doesn't force a re-login during a
// demo. Every authenticated service call reads the token from this
// context (passed down as a plain function argument — see services/*.ts).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem(ROLE_STORAGE_KEY));

  useEffect(() => {
    setAuthToken(token);
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (role) {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  }, [role]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(response.accessToken);
      setRole(response.role);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.status === 401 ? "Invalid email or password." : error.message);
      }
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setRole(null);
  }, []);

  // A 401 from any authenticated request (expired/invalid token) logs the
  // user out cleanly rather than leaving the UI in a broken state.
  useEffect(() => onUnauthorized(logout), [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, role, isAuthenticated: Boolean(token), login, logout }),
    [token, role, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
