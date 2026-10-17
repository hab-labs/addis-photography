"use client";

import * as React from "react";
import { UserCheck, Plus, Shield, KeyRound, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { User } from "@/types";

function getInputType(field: string) {
  if (field === "password") return "password";
  if (field === "email") return "email";
  return "text";
}

export default function StaffUsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const [form, setForm] = React.useState({ id: "", name: "", username: "", email: "", phone: "", password: "", role: "staff" as User["role"] });

  const loadUsers = React.useCallback(async () => {
    const response = await fetch("/api/admin/operators");
    if (response.ok) setUsers((await response.json()).users);
  }, []);

  React.useEffect(() => { void loadUsers(); }, [loadUsers]);

  const openEdit = (user: User) => {
    setError("");
    setForm({ id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, password: "", role: user.role });
    setInviteOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const editing = Boolean(form.id);
    const response = await fetch("/api/admin/operators", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to save operator.");
      return;
    }
    setUsers((current) => editing ? current.map((user) => user.id === data.user.id ? data.user : user) : [data.user, ...current]);
    setForm({ id: "", name: "", username: "", email: "", phone: "", password: "", role: "staff" });
    setInviteOpen(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Users
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <UserCheck className="h-3 w-3" /> Team Access
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Manage team access, roles, and account status.
          </p>
        </div>

        <Button type="button" onClick={() => { setError(""); setForm({ id: "", name: "", username: "", email: "", phone: "", password: "", role: "staff" }); setInviteOpen(true); }} size="sm" className="h-9 gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 shadow-sm shadow-indigo-600/25">
          <Plus className="h-3.5 w-3.5" />
          <span>Invite Operator</span>
        </Button>
      </div>

      <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ">
        <Table>
          <TableHeader>
            <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-transparent">
              <TableHead className="pl-4">Staff Member</TableHead>
              <TableHead>Access Role</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="text-right pr-4">Auth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100/80 ">
            {users.map((s) => (
              <TableRow key={s.id} className="border-none hover:bg-slate-50/80  transition-colors">
                <TableCell className="pl-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-2xl ring-1 ring-slate-200/60">
                      <AvatarFallback className="rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white text-xs font-bold">
                        {s.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold text-slate-800 ">{s.name}</p>
                      <p className="text-[11px] text-slate-400">{s.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50  px-3 py-1 text-xs font-semibold text-indigo-700 ">
                    <Shield className="h-3 w-3" /> {s.role === "admin" ? "Administrator" : "Operator"}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-medium text-slate-400">{s.is_active ? "Active" : "Inactive"}</TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => openEdit(s)} className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit</button>
                    <button type="button" className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"><KeyRound className="h-3 w-3" /> Reset PIN</button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleSave} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="text-base font-bold text-slate-900">{form.id ? "Edit User" : "Invite Operator"}</h2><p className="text-xs text-slate-500">{form.id ? "Update this user’s profile and access." : "Create login credentials for a staff member."}</p></div>
              <button type="button" onClick={() => setInviteOpen(false)} aria-label="Close invite form"><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            {error && <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
            <div className="grid gap-3">
              {([
                ["name", "Full name", "Selamawit Tadesse"],
                ["username", "Username", "selamawit"],
                ["email", "Email", "selamawit@addisphotography.et"],
                ["phone", "Phone", "+251911223344"],
                ["password", form.id ? "New password (optional)" : "Temporary password", "At least 8 characters"],
              ] as const).map(([field, label, placeholder]) => (
                <label key={field} className="grid gap-1 text-xs font-semibold text-slate-700">
                  {label}
                  <input required={field !== "password" || !form.id} minLength={field === "password" ? 8 : undefined} type={getInputType(field)} placeholder={placeholder} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="h-9 rounded-md border border-slate-200 px-3 text-xs font-normal outline-none focus:border-red-400" />
                </label>
              ))}
              <label className="grid gap-1 text-xs font-semibold text-slate-700">Access role<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as User["role"] }))} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-normal"><option value="staff">Staff / Operator</option><option value="admin">Administrator</option></select></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-red-600 text-white hover:bg-red-700">{form.id ? "Save Changes" : "Create Operator"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}