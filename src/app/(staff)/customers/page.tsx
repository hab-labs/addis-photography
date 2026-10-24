"use client";

import * as React from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studioStore } from "@/lib/api/store";
import type { Customer as StoreCustomer } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");
  const [dialogError, setDialogError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Pagination state (matches 5-10 rows laptop view)
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
  }, [search, statusFilter]);

  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);

      const hasBalance = Number(c.balance_due || 0) > 0;
      const hasOrders = Number(c.total_orders || 0) > 0;

      let matchesFilter = true;
      if (statusFilter === "with_balance") {
        matchesFilter = hasBalance;
      } else if (statusFilter === "cleared") {
        matchesFilter = !hasBalance;
      } else if (statusFilter === "with_orders") {
        matchesFilter = hasOrders;
      }

      return matchesSearch && matchesFilter;
    });
  }, [customers, search, statusFilter]);

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
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      {/* 1. PAGE HEADER (MATCHES MACBOOK MOCKUP) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
            Customer directory
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Customers
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Manage customer profiles, orders, requests, and albums.
          </p>
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
          className="h-10 px-4 rounded-xl bg-[#e21b23] hover:bg-red-700 text-white font-bold text-sm shadow-sm gap-2 self-start sm:self-auto transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Customer</span>
        </Button>
      </div>

      {/* 2. CUSTOMER LIST CARD (MATCHES MACBOOK DESIGN) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] shadow-xs overflow-hidden">
        {/* Search & Filter Header Strip */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name or phone num..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-900/60 pl-10 pr-3 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 outline-none focus:border-red-500 transition shadow-2xs"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="w-[150px] shrink-0">
              <select
                aria-label="Filter customers"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition shadow-2xs cursor-pointer"
              >
                <option value="all">All customers</option>
                <option value="with_balance">With balance</option>
                <option value="cleared">Cleared balance</option>
                <option value="with_orders">With orders</option>
              </select>
            </div>
          </div>

          {/* Customer Total Count on Far Right */}
          <span className="text-xs font-bold font-mono tracking-wider text-slate-400 dark:text-zinc-500 uppercase self-end sm:self-center shrink-0">
            {filteredCustomers.length.toLocaleString()} {filteredCustomers.length === 1 ? "CUSTOMER" : "CUSTOMERS"}
          </span>
        </div>

        {/* Customer List Rows */}
        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400 dark:text-zinc-500">
              Loading customer records…
            </div>
          ) : paginatedCustomers.length > 0 ? (
            paginatedCustomers.map((cust) => {
              const hasDue = Number(cust.balance_due || 0) > 0;

              return (
                <Link
                  key={cust.id}
                  href={`/customers/${cust.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                >
                  {/* Left Column: Avatar + Name + Phone */}
                  <div className="flex items-center gap-3.5 min-w-[240px] flex-1">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-[#fce8e8] dark:bg-red-950/60 text-xs font-bold text-[#b82727] dark:text-red-400">
                        {getInitials(cust.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#e21b23] transition-colors truncate">
                        {cust.name}
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                        {cust.phone}
                      </div>
                    </div>
                  </div>

                  {/* Orders Count Column */}
                  <div className="hidden sm:block text-left w-24 shrink-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Orders
                    </span>
                    <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-zinc-100">
                      {cust.total_orders || 0}
                    </span>
                  </div>

                  {/* Outstanding Balance Column */}
                  <div className="hidden md:block text-left w-36 shrink-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Outstanding
                    </span>
                    {hasDue ? (
                      <span className="text-sm font-bold font-mono tabular-nums text-[#e21b23] dark:text-red-400">
                        ETB {Number(cust.balance_due).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ETB 0.00
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  {/* Right Chevron Arrow */}
                  <div className="shrink-0 text-slate-300 dark:text-zinc-600 group-hover:text-[#e21b23] group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">No customers found</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                {search ? "Try adjusting your search or filter." : "Get started by adding your first customer."}
              </p>
            </div>
          )}
        </div>

        {/* 3. PAGINATION ROW (MATCHES MACBOOK MOCKUP) */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span>
            Showing {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length.toLocaleString()}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                  currentPage === pg
                    ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                    : "border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
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
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Customer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md dark:bg-[#18181b] dark:border-zinc-800 rounded-2xl">
          <form onSubmit={handleCreateCustomer}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                Register New Customer
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Add a new customer profile for portrait shoots, photo prints, or albums.
              </DialogDescription>
            </DialogHeader>

            {dialogError && (
              <div role="alert" className="mt-3 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                {dialogError}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cust-name" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Full Name *
                </Label>
                <Input
                  id="cust-name"
                  placeholder="e.g. Bethlehem Assefa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cust-phone" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Phone Number *
                </Label>
                <Input
                  id="cust-phone"
                  type="tel"
                  placeholder="09XXXXXXXX or +2519XXXXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cust-notes" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Notes / Preferences (Optional)
                </Label>
                <Input
                  id="cust-notes"
                  placeholder="e.g. Prefers Telegram delivery, passport urgent"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSaving}
                className="h-10 px-4 rounded-xl dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="h-10 px-4 rounded-xl bg-[#e21b23] text-white hover:bg-red-700 font-bold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
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
