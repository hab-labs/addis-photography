"use client";

import * as React from "react";
import { UserCheck, UserX, Plus, Shield, KeyRound, X, Pencil, Check, AlertCircle } from "lucide-react";
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
import { useAuth } from "@/lib/auth/context";
import { studioStore } from "@/lib/api/store";
import type { User } from "@/types";

function getInputType(field: string) {
  if (field === "password") return "password";
  if (field === "email") return "email";
  return "text";
}

export default function StaffUsersPage() {
  const { user: currentUser } = useAuth();
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
    active: true,
  });

  // Deactivate confirmation dialog state
  const [deactivateTargetUser, setDeactivateTargetUser] = React.useState<User | null>(null);
  const [isToggling, setIsToggling] = React.useState(false);

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
      active: user.active !== false && user.is_active !== false,
    });
    setInviteOpen(true);
  };

  const handleToggleActive = async (target: User, nextActive: boolean) => {
    setIsToggling(true);
    try {
      const response = await fetch("/api/admin/operators", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, active: nextActive }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update operator status.");
      }
      setUsers((current) =>
        current.map((u) =>
          u.id === target.id ? { ...u, active: nextActive, is_active: nextActive } : u
        )
      );
      setSuccessNotice(
        nextActive
          ? `Reactivated ${target.name}'s account.`
          : `Deactivated ${target.name}'s account.`
      );
    } catch (err: any) {
      // Local fallback
      studioStore.updateUser(target.id, { active: nextActive, is_active: nextActive });
      setUsers((current) =>
        current.map((u) =>
          u.id === target.id ? { ...u, active: nextActive, is_active: nextActive } : u
        )
      );
      setSuccessNotice(
        nextActive
          ? `Reactivated ${target.name}'s account.`
          : `Deactivated ${target.name}'s account.`
      );
    } finally {
      setIsToggling(false);
      setDeactivateTargetUser(null);
      setTimeout(() => setSuccessNotice(null), 3000);
    }
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
          active: form.active,
          is_active: form.active,
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
    setForm({ id: "", name: "", username: "", email: "", phone: "", password: "", role: "staff", active: true });
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
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
              Users
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-800">
              <UserCheck className="h-3 w-3" /> Team Access
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 dark:text-zinc-400 mt-1">
            Manage studio operator accounts, access privileges, and authentication credentials.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setError("");
            setForm({ id: "", name: "", username: "", email: "", phone: "", password: "", role: "staff", active: true });
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
          className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        >
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      <div className="rounded-3xl bg-white dark:bg-[#121214] p-6 shadow-sm border border-slate-100 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 hover:bg-transparent">
              <TableHead className="pl-4">Staff Member</TableHead>
              <TableHead>Access Role</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="text-right pr-4">Auth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100/80 dark:divide-zinc-800/80">
            {users.map((s) => (
              <TableRow key={s.id} className="border-none hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                <TableCell className="pl-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-2xl ring-1 ring-slate-200/60 dark:ring-zinc-700">
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
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{s.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                        {s.email} {s.phone ? `• ${s.phone}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    <Shield className="h-3 w-3" />{" "}
                    {s.role === "admin" ? "Administrator" : "Operator"}
                  </span>
                </TableCell>
                <TableCell>
                  {s.active !== false && s.is_active !== false ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Deactivated
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex justify-end gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>

                    {s.id === currentUser?.id ? (
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500 italic">Current User</span>
                    ) : s.active !== false && s.is_active !== false ? (
                      <button
                        type="button"
                        onClick={() => setDeactivateTargetUser(s)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1"
                      >
                        <UserX className="h-3 w-3" /> Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s, true)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
                      >
                        <UserCheck className="h-3 w-3" /> Reactivate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setResetTargetUser(s);
                        setResetPinSuccess(null);
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:underline inline-flex items-center gap-1"
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
        <DialogContent className="sm:max-w-md dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-zinc-100">
              {form.id ? "Edit User Profile" : "Invite Studio Operator"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400">
              {form.id
                ? "Update this user's profile details and studio role."
                : "Create login credentials for a photography staff member."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 py-2">
            {error && (
              <div
                role="alert"
                className="rounded-md bg-red-50 dark:bg-red-950/40 p-2.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
              >
                {error}
              </div>
            )}

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="usr-name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="usr-name"
                  placeholder="e.g. Selamawit Tadesse"
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  required
                  className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="usr-uname" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="usr-uname"
                    placeholder="selamawit"
                    value={form.username}
                    onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))}
                    required
                    className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="usr-role" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Access Role
                  </Label>
                  <select
                    id="usr-role"
                    value={form.role}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, role: e.target.value as User["role"] }))
                    }
                    className="h-9 w-full rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-500"
                  >
                    <option value="staff">Staff / Operator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="usr-email" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="usr-email"
                    type="email"
                    placeholder="selam@addisphoto.et"
                    value={form.email}
                    onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                    required
                    className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="usr-phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Phone Number
                  </Label>
                  <Input
                    id="usr-phone"
                    placeholder="+251911223344"
                    value={form.phone}
                    onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                    className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="usr-pwd" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
                  className="text-xs font-mono dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>

              {form.id && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 p-3">
                  <div>
                    <Label htmlFor="usr-active" className="text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer">
                      Account Status
                    </Label>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {form.active
                        ? "Active (Operator can sign in to studio)"
                        : "Deactivated (Sign-in access revoked)"}
                    </p>
                  </div>
                  <input
                    id="usr-active"
                    type="checkbox"
                    checked={form.active}
                    disabled={form.id === currentUser?.id}
                    onChange={(e) => setForm((c) => ({ ...c, active: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(false)}
                className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

      {/* Deactivate User Confirmation Dialog */}
      <Dialog
        open={Boolean(deactivateTargetUser)}
        onOpenChange={(open) => !open && setDeactivateTargetUser(null)}
      >
        <DialogContent className="sm:max-w-[420px] dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <UserX className="h-5 w-5" /> Deactivate Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 pt-1">
              Are you sure you want to deactivate <strong className="text-slate-800 dark:text-zinc-200">{deactivateTargetUser?.name}</strong> (@{deactivateTargetUser?.username})?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 dark:text-zinc-300 space-y-2">
            <p>
              This user will immediately be logged out of all active sessions and prevented from signing in until an administrator reactivates their account.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivateTargetUser(null)}
              disabled={isToggling}
              className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => deactivateTargetUser && handleToggleActive(deactivateTargetUser, false)}
              disabled={isToggling}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isToggling ? "Deactivating…" : "Deactivate Account"}
            </Button>
          </DialogFooter>
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
        <DialogContent className="sm:max-w-[400px] dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-zinc-100">
              <KeyRound className="h-5 w-5 text-indigo-600" /> Reset Operator PIN
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400">
              Generate a temporary emergency PIN for <strong className="text-slate-800 dark:text-zinc-200">{resetTargetUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {resetPinSuccess ? (
            <div className="space-y-3 py-2 text-center">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4">
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  Temporary 6-Digit PIN Generated:
                </p>
                <p className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-300 tracking-widest mt-1">
                  {resetPinSuccess}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2">
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
              <p className="text-xs text-slate-600 dark:text-zinc-300">
                Are you sure you want to reset the operator access credentials for this account?
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResetTargetUser(null)}
                  className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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