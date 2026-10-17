"use client";

import * as React from "react";
import { UserCircle } from "lucide-react";
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
    <div className="mx-auto max-w-2xl space-y-5">
      <div><div className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-red-600" /><h1 className="text-xl font-bold text-slate-900">Account overview</h1></div><p className="mt-1 text-xs text-slate-500">Manage your profile and account credentials.</p></div>
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {!isAdmin && <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">Your profile is managed by an administrator.</p>}
        {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{message}</p>}
        <div className="grid gap-3">
          {([
            ["name", "Full name"],
            ["username", "Username"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["password", "New password (optional)"],
          ] as const).map(([field, label]) => (
            <label key={field} className="grid gap-1 text-xs font-semibold text-slate-700">{label}<input disabled={!isAdmin} type={getInputType(field)} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="h-9 rounded-md border border-slate-200 px-3 text-xs font-normal disabled:bg-slate-50" /></label>
          ))}
        </div>
        <div className="mt-5 flex justify-end"><Button disabled={!isAdmin} type="submit" className="bg-red-600 text-white hover:bg-red-700">Save Profile</Button></div>
      </form>
    </div>
  );
}
