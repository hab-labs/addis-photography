"use client";

import * as React from "react";
import { UserCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";

function getInputType(field: string) {
  if (field === "password") return "password";
  if (field === "email") return "email";
  return "text";
}

export default function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const [form, setForm] = React.useState({ name: "", username: "", email: "", phone: "", password: "" });
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (user) setForm({ name: user.name, username: user.username, email: user.email, phone: user.phone, password: "" });
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!isAdmin) {
      setError("Only administrators can edit account profiles.");
      return;
    }
    const response = await fetch("/api/admin/operators", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: user.id, role: user.role }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to update profile.");
      return;
    }
    localStorage.setItem("addis_auth_user_v2", JSON.stringify(data.user));
    setMessage("Profile updated. Sign in again if you changed your username or password.");
    window.location.reload();
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      {/* 1. PAGE HEADER */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
          My Account
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
          Account Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Manage your personal operator account, credentials, and contact details.
        </p>
      </div>

      {/* 2. PROFILE FORM CARD */}
      <div className="max-w-2xl rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAdmin && (
            <p className="rounded-xl bg-slate-50 dark:bg-zinc-800/60 p-3.5 text-xs text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              Your account profile is managed by an administrator. Contact an administrator to update privileges.
            </p>
          )}

          {error && (
            <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          {message && (
            <div role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {message}
            </div>
          )}

          <div className="grid gap-4">
            {([
              ["name", "Full Name"],
              ["username", "Username"],
              ["email", "Email Address"],
              ["phone", "Phone Number"],
              ["password", "New Password (optional)"],
            ] as const).map(([field, label]) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {label}
                </label>
                <input
                  disabled={!isAdmin}
                  type={getInputType(field)}
                  value={form[field]}
                  onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 dark:bg-zinc-900 px-3.5 text-sm font-medium text-slate-900 dark:text-zinc-100 disabled:bg-slate-50 disabled:text-slate-500 disabled:dark:bg-zinc-800/40 disabled:dark:text-zinc-500 outline-none focus:border-red-500 transition shadow-2xs"
                />
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              disabled={!isAdmin}
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#e21b23] hover:bg-red-700 text-white font-bold text-sm shadow-sm disabled:opacity-50 transition-all"
            >
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
