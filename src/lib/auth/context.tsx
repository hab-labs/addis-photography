"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/types";
import { studioStore } from "@/lib/api/store";

const AUTH_STORAGE_KEY = "addis_auth_user_v2";

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "staff",
  isAdmin: false,
  isStaff: true,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const readStoredUser = (): User | null => {
    try {
      const rememberedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (rememberedUser) {
        return JSON.parse(rememberedUser) as User;
      }

      const sessionUser = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionUser) {
        return JSON.parse(sessionUser) as User;
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }

    return null;
  };

  const persistUser = (nextUser: User | null, rememberMe: boolean) => {
    if (!nextUser) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    const serialized = JSON.stringify(nextUser);

    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, serialized);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  useEffect(() => {
    let isMounted = true;
    try {
      const stored = readStoredUser();
      if (stored) setUser(stored);
    } catch {
      setUser(null);
    }

    // Authoritative session verification with backend
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.user) {
          const activeUser = data.user as User;
          setUser(activeUser);
          studioStore.syncWithServer(activeUser.role).catch(() => {});
        } else {
          setUser(null);
          persistUser(null, false);
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/login") &&
            !window.location.pathname.startsWith("/a/")
          ) {
            void fetch("/api/auth/logout", { method: "POST", headers: { "X-Requested-With": "studio" } }).finally(() => {
              window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username: string, password: string, rememberMe = false) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "studio" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.user) {
        const nextUser = data.user as User;
        setUser(nextUser);
        persistUser(nextUser, rememberMe);
        studioStore.syncWithServer(nextUser.role).catch(() => {});
        return { success: true, user: nextUser };
      }

      const errorMsg =
        data?.error?.message ||
        data?.error ||
        (response.status === 500
          ? "Database connection failed. Please ensure DATABASE_URL is configured in your Vercel project settings."
          : "Invalid username or password");

      return { success: false, error: errorMsg };
    } catch {
      return { success: false, error: "Unable to connect to the authentication server." };
    }
  };

  const logout = () => {
    setUser(null);
    persistUser(null, false);
    void fetch("/api/auth/logout", { method: "POST", headers: { "X-Requested-With": "studio" } })
      .finally(() => {
        window.location.href = "/login";
      });
  };

  const role: UserRole = user?.role || "staff";
  const isAdmin = role === "admin";
  const isStaff = role === "staff" || role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isStaff,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}