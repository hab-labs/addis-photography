"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/types";

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
    try {
      setUser(readStoredUser());
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, rememberMe = false) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "studio" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (response.ok) {
      const nextUser = data.user as User;
      setUser(nextUser);
      persistUser(nextUser, rememberMe);
      return { success: true, user: nextUser };
    }

    return { success: false, error: data.error?.message || "Invalid username or password" };
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