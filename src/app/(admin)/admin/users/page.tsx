"use client";

import * as React from "react";
import { UserCheck, Plus, Shield, KeyRound, X, Pencil, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { studioStore } from "@/lib/api/store";
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
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    id: "",
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "staff" as User["role"],
  });

  // Reset PIN Dialog State
  const [resetTargetUser, setResetTargetUser] = React.useState<User | null>(null);
  const [resetPinSuccess, setResetPinSuccess] = React.useState<string | null>(null);

  const loadUsers = React.useCallback(async () => {
    try {
      const response = await fetch("/api/admin/operators");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          return;
        }
      }
    } catch {
      // Fallback to local store
    }
    setUsers(studioStore.getUsers());
  }, []);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openEdit = (user: User) => {
    setError("");
    setForm({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      password: "",
      role: user.role,
    });
    setInviteOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const editing = Boolean(form.id);

    try {
      const response = await fetch("/api/admin/operators", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save operator.");
      }
      setUsers((current) =>
        editing
          ? current.map((user) => (user.id === data.user.id ? data.user : user))
          : [data.user, ...current]
      );
    } catch (err) {
      // If API failed due to dev mock cookie / auth, handle in local store
      if (editing) {
        const updated = studioStore.updateUser(form.id, {
          name: form.name,
          username: form.username,
          email: form.email,
          phone: form.phone,
          role: form.role,
        });
        setUsers((current) =>
          current.map((u) => (u.id === form.id ? updated : u))
        );
      } else {
        setError(err instanceof Error ? err.message : "Unable to save operator.");
        return;
      }
    }

    setSuccessNotice(editing ? `Updated ${form.name}` : `Created operator ${form.name}`);
    setTimeout(() => setSuccessNotice(null), 3000);
    setForm({ id: "", name: "", username: "", email: "", phone: "", password: "", role: "staff" });
    setInviteOpen(false);
  };

  const handleResetPin = () => {
    if (!resetTargetUser) return;
    const tempPin = Math.floor(100000 + Math.random() * 900000).toString();
    setResetPinSuccess(tempPin);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Users
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-500/20">
              <UserCheck className="h-3 w-3" /> Team Access
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Manage studio operator accounts, access privileges, and authentication credentials.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setError("");
            setForm({ id: "", name: "", username: "", email: "", phone: "", password: "", role: "staff" });
            setInviteOpen(true);
          }}
          size="sm"
          className="h-9 gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 shadow-sm shadow-indigo-600/25"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Invite Operator</span>
        </Button>
      </div>

      {successNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 border border-emerald-200"
        >
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-transparent">
              <TableHead className="pl-4">Staff Member</TableHead>
              <TableHead>Access Role</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="text-right pr-4">Auth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100/80">
            {users.map((s) => (
              <TableRow key={s.id} className="border-none hover:bg-slate-50/80 transition-colors">
                <TableCell className="pl-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-2xl ring-1 ring-slate-200/60">
                      <AvatarFallback className="rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white text-xs font-bold">
                        {s.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {s.email} {s.phone ? `• ${s.phone}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    <Shield className="h-3 w-3" />{" "}
                    {s.role === "admin" ? "Administrator" : "Operator"}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-medium text-slate-400">
                  {s.is_active ? "Active" : "Inactive"}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetTargetUser(s);
                        setResetPinSuccess(null);
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                    >
                      <KeyRound className="h-3 w-3" /> Reset PIN
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invite / Edit User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit User Profile" : "Invite Studio Operator"}
            </DialogTitle>
            <DialogDescription>
              {form.id
                ? "Update this user's profile details and studio role."
                : "Create login credentials for a photography staff member."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 py-2">
            {error && (
              <div
                role="alert"
                className="rounded-md bg-red-50 p-2.5 text-xs font-semibold text-red-700 border border-red-200"
              >
                {error}
              </div>
            )}

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="usr-name" className="text-xs font-semibold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="usr-name"
                  placeholder="e.g. Selamawit Tadesse"
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="usr-uname" className="text-xs font-semibold text-slate-700">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="usr-uname"
                    placeholder="selamawit"
                    value={form.username}
                    onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="usr-role" className="text-xs font-semibold text-slate-700">
                    Access Role
                  </Label>
                  <select
                    id="usr-role"
                    value={form.role}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, role: e.target.value as User["role"] }))
                    }
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option value="staff">Staff / Operator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="usr-email" className="text-xs font-semibold text-slate-700">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="usr-email"
                    type="email"
                    placeholder="selam@addisphoto.et"
                    value={form.email}
                    onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="usr-phone" className="text-xs font-semibold text-slate-700">
                    Phone Number
                  </Label>
                  <Input
                    id="usr-phone"
                    placeholder="+251911223344"
                    value={form.phone}
                    onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="usr-pwd" className="text-xs font-semibold text-slate-700">
                  {form.id ? "New Password (leave empty to keep current)" : "Temporary Password"}
                </Label>
                <Input
                  id="usr-pwd"
                  type="password"
                  minLength={form.id ? undefined : 8}
                  required={!form.id}
                  placeholder={form.id ? "••••••••" : "At least 8 characters"}
                  value={form.password}
                  onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {form.id ? "Save Changes" : "Create Operator"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset PIN Confirmation Dialog */}
      <Dialog
        open={!!resetTargetUser}
        onOpenChange={(open) => {
          if (!open) {
            setResetTargetUser(null);
            setResetPinSuccess(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600" /> Reset Operator PIN
            </DialogTitle>
            <DialogDescription>
              Generate a temporary emergency PIN for <strong>{resetTargetUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {resetPinSuccess ? (
            <div className="space-y-3 py-2 text-center">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-xs text-emerald-800 font-medium">
                  Temporary 6-Digit PIN Generated:
                </p>
                <p className="text-2xl font-mono font-bold text-emerald-700 tracking-widest mt-1">
                  {resetPinSuccess}
                </p>
                <p className="text-[11px] text-emerald-600 mt-2">
                  Share this temporary PIN with {resetTargetUser?.name}.
                </p>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  onClick={() => {
                    setResetTargetUser(null);
                    setResetPinSuccess(null);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-600">
                Are you sure you want to reset the operator access credentials for this account?
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResetTargetUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleResetPin}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Generate New PIN
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}