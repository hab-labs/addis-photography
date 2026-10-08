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
  login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      setUser(stored ? JSON.parse(stored) : null);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "studio" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (response.ok) {
      setUser(data.user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
      return { success: true, user: data.user };
    }

    return { success: false, error: data.error?.message || "Invalid username or password" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
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