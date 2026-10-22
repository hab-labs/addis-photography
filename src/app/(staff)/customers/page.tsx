"use client";

import * as React from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Users,
  Search,
  Plus,
  Phone,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Calendar,
  MoreHorizontal,
  FolderOpen,
  Sparkles,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studioStore } from "@/lib/api/store";
import type { Customer as StoreCustomer } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Customer = StoreCustomer;

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");
  const [dialogError, setDialogError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Pagination state
  const PAGE_SIZE = 8;
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    try {
      setCustomers(studioStore.getCustomers());
      studioStore.syncCustomers().then(setCustomers).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const metrics = React.useMemo(() => {
    let spent = new Decimal(0);
    let balance = new Decimal(0);

    customers.forEach((c) => {
      spent = spent.plus(new Decimal(c.total_spent));
      balance = balance.plus(new Decimal(c.balance_due));
    });

    return {
      totalClients: customers.length,
      lifetimeValue: spent.toFixed(2),
      totalBalance: balance.toFixed(2),
    };
  }, [customers]);

  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      return (
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const paginatedCustomers = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError("");
    const cleanPhone = newPhone.replace(/[\s-]/g, "");
    if (!newName.trim()) {
      setDialogError("Please enter the customer's full name.");
      return;
    }
    if (!/^(09\d{8}|\+2519\d{8})$/.test(cleanPhone)) {
      setDialogError("Please enter a valid Ethiopian phone number (09XXXXXXXX or +2519XXXXXXXX).");
      return;
    }
    setIsSaving(true);
    try {
      studioStore.createCustomer(newName.trim(), cleanPhone);
      setCustomers(studioStore.getCustomers());
      setIsCreateOpen(false);
      setNewName("");
      setNewPhone("");
      setNewNotes("");
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to create customer.");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="mx-auto max-w-[1128px] space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e21b23]">Customer directory</p>
          <h1 className="mt-1 text-[25px] font-medium leading-none tracking-[-0.04em] text-slate-900 dark:text-zinc-100">Customers</h1>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400">Manage customer profiles, orders, requests, and albums.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setDialogError("");
            setNewName("");
            setNewPhone("");
            setNewNotes("");
            setIsCreateOpen(true);
          }}
          size="sm"
          className="h-9 gap-1.5 rounded-md bg-[#e21b23] px-4 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(226,27,35,0.22)] hover:bg-red-700"
        >
          <Plus className="h-3.5 w-3.5" /> New Customer
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] shadow-sm">
        <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-800 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3 w-3 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name or phone number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 rounded-md border border-slate-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 pl-8 pr-2 text-[10px] outline-none sm:w-48 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-[#e21b23]"
            />
          </div>
          <button className="flex h-8 flex-1 items-center justify-between rounded-md border border-slate-200 dark:border-zinc-700 dark:bg-zinc-900 px-3 text-[10px] font-semibold text-slate-700 dark:text-zinc-200">
            All customers <span className="text-slate-400 dark:text-zinc-500">⌄</span>
          </button>
          <span className="hidden w-14 self-center text-[9px] leading-tight text-slate-400 dark:text-zinc-500 sm:block">{filteredCustomers.length.toLocaleString()}<br />results</span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-none bg-[#fafafa] dark:bg-[#18181b] text-[8px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-400 hover:bg-[#fafafa] dark:hover:bg-[#18181b]">
                <TableHead className="w-[58%] pl-4">Customer</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100/80 dark:divide-zinc-800/80">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-xs text-slate-400 dark:text-zinc-500">
                    Loading customer records…
                  </TableCell>
                </TableRow>
              ) : paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((cust) => {
                  const hasDue = Number(cust.balance_due) > 0;

                  return (
                    <TableRow key={cust.id} className="border-t border-slate-100 dark:border-zinc-800 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50 group cursor-pointer">
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-[#f5dddd] dark:bg-red-950/60 text-[10px] font-bold text-[#c52b2f] dark:text-red-300">
                              {getInitials(cust.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-[10px] font-bold text-slate-800 dark:text-zinc-200">{cust.name}</div>
                            <div className="text-[8px] text-slate-400 dark:text-zinc-500">{cust.phone}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-[10px] text-slate-700 dark:text-zinc-300">
                        <span className="block text-[8px] text-slate-400 dark:text-zinc-500">Orders</span>
                        <b>{cust.total_orders}</b>
                      </TableCell>

                      <TableCell>
                        <span className="block text-[8px] text-slate-400 dark:text-zinc-500">Outstanding</span>
                        {hasDue ? (
                          <span className="text-[10px] font-bold tabular-nums text-[#e21b23] dark:text-red-400">
                            ETB {Number(cust.balance_due).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            ETB 0.00
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/customers/${cust.id}`}
                          aria-label={`Open ${cust.name} profile`}
                          className="inline-flex text-lg text-slate-700 dark:text-zinc-400 transition-colors hover:text-[#e21b23]"
                        >
                          ›
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">No customers found.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-zinc-800 px-3 py-3 text-[9px] text-slate-400 dark:text-zinc-500">
          <span>
            Showing {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length.toLocaleString()} customers
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="h-6 w-6 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`h-6 w-6 rounded-md text-[10px] font-bold ${
                  currentPage === pg
                    ? "bg-[#111] dark:bg-white text-white dark:text-zinc-950"
                    : "border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              className="h-6 w-6 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Create Customer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md dark:bg-[#18181b] dark:border-zinc-800">
          <form onSubmit={handleCreateCustomer}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Register New Customer
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Add a new customer profile for portrait shoots, photo prints, or albums.
              </DialogDescription>
            </DialogHeader>

            {dialogError && (
              <div role="alert" className="mt-3 rounded-md bg-red-50 dark:bg-red-950/40 p-2.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                {dialogError}
              </div>
            )}

            <div className="grid gap-3 py-4">
              <div className="grid gap-1">
                <Label htmlFor="cust-name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Full Name *
                </Label>
                <Input
                  id="cust-name"
                  placeholder="e.g. Bethlehem Assefa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="cust-phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Phone Number *
                </Label>
                <Input
                  id="cust-phone"
                  type="tel"
                  placeholder="09XXXXXXXX or +2519XXXXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-9 text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="cust-notes" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Notes / Preferences (Optional)
                </Label>
                <Input
                  id="cust-notes"
                  placeholder="e.g. Prefers Telegram delivery, passport urgent"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="h-9 text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSaving}
                className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-[#e21b23] text-white hover:bg-red-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Create Customer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}