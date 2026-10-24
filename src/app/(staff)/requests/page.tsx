"use client";

import * as React from "react";
import Link from "next/link";
import {
  KanbanSquare,
  List,
  Search,
  AlertTriangle,
  Clock,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Filter,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { studioStore } from "@/lib/api/store";
import { formatDate, isOverdue, formatCalendarPair, getEthiopianDateDetails } from "@/lib/date";
import type { ClientRequest } from "@/types";

interface RequestCard {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  service: string;
  dueDate: string;
  assignedStaff: string;
  status: "received" | "in_progress" | "ready" | "delivered";
  isOverdue?: boolean;
}

const COLUMNS: {
  id: RequestCard["status"];
  label: string;
  pillColor: string;
  accentDot: string;
}[] = [
  { id: "received", label: "Received", pillColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", accentDot: "bg-blue-500" },
  { id: "in_progress", label: "In Progress", pillColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", accentDot: "bg-amber-500" },
  { id: "ready", label: "Ready", pillColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400", accentDot: "bg-purple-500" },
  { id: "delivered", label: "Delivered", pillColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", accentDot: "bg-emerald-500" },
];

export default function RequestsPage() {
  const [requests, setRequests] = React.useState<RequestCard[]>([]);
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"kanban" | "list">("kanban");
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // New Request Dialog state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [reqName, setReqName] = React.useState("");
  const [reqPhone, setReqPhone] = React.useState("");
  const [reqService, setReqService] = React.useState("");
  const [reqDueDate, setReqDueDate] = React.useState("");
  const [reqNotes, setReqNotes] = React.useState("");
  const [dialogError, setDialogError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [packages, setPackages] = React.useState<Array<{ id: string; name: string }>>([]);

  const loadRequests = React.useCallback(() => {
    try {
      const storeReqs = studioStore.getRequests();
      const mapped: RequestCard[] = storeReqs.map((r) => {
        const d = r.due_date ? new Date(r.due_date) : new Date();
        const cal = formatCalendarPair(d);
        return {
          id: r.id,
          orderNumber: r.order_id || r.id.slice(0, 6).toUpperCase(),
          customerName: r.customer_name || "Customer",
          phone: r.customer_phone || "—",
          service: r.service_type || r.notes || "Photo Retouch & Print",
          dueDate: cal.gregorian,
          assignedStaff: r.assigned_to_name || "Studio Staff",
          status: (r.status as RequestCard["status"]) || "received",
          isOverdue: isOverdue(r.due_date),
        };
      });
      setRequests(mapped);

      // Load standard package names
      try {
        const prices = studioStore.getPrices();
        setPackages(prices.map((p) => ({ id: p.id, name: p.name })));
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError("");
    const cleanPhone = reqPhone.replace(/[\s-]/g, "");
    if (!reqName.trim()) {
      setDialogError("Please enter customer name.");
      return;
    }
    if (!/^(09\d{8}|\+2519\d{8})$/.test(cleanPhone)) {
      setDialogError("Please enter a valid Ethiopian phone number (09XXXXXXXX).");
      return;
    }
    if (!reqService.trim()) {
      setDialogError("Please specify the service / task requested.");
      return;
    }

    setIsSaving(true);
    try {
      studioStore.createRequest({
        customer_name: reqName.trim(),
        customer_phone: cleanPhone,
        service_type: reqService.trim(),
        notes: reqNotes.trim() ? `${reqService.trim()} — ${reqNotes.trim()}` : reqService.trim(),
        due_date: reqDueDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
      });

      loadRequests();
      setIsCreateOpen(false);
      setReqName("");
      setReqPhone("");
      setReqService("");
      setReqDueDate("");
      setReqNotes("");
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to record request.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRequests = React.useMemo(() => {
    return requests.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.customerName.toLowerCase().includes(q) ||
        r.orderNumber.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.phone.includes(q);

      const matchesOverdue = !overdueOnly || r.isOverdue;
      return matchesSearch && matchesOverdue;
    });
  }, [requests, search, overdueOnly]);

  const handleAdvanceStatus = (id: string) => {
    const sequence: RequestCard["status"][] = ["received", "in_progress", "ready", "delivered"];
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const currentIndex = sequence.indexOf(r.status);
        const nextIndex = Math.min(currentIndex + 1, sequence.length - 1);
        const updated = {
          ...r,
          status: sequence[nextIndex],
          isOverdue: sequence[nextIndex] === "delivered" ? false : r.isOverdue,
        };
        studioStore.updateRequestStatus(id, updated.status);
        return updated;
      })
    );
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      {/* 1. TOP HEADER & WORKFLOW CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
            Studio Production Pipeline
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Requests
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Track customer photo edits, print jobs, framing requests, and delivery status.
          </p>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Controller (Board / List) */}
          <div className="flex h-10 items-center rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Overdue Filter Chip */}
          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all shadow-xs ${
              overdueOnly
                ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                : "border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${overdueOnly ? "border-red-600 bg-[#e21b23] text-white" : "border-slate-300 dark:border-zinc-600"}`}>
              {overdueOnly && <span className="text-[10px]">✓</span>}
            </span>
            <span>Overdue only</span>
          </button>

          {/* New Request Button */}
          <Button
            type="button"
            onClick={() => {
              setDialogError("");
              setReqName("");
              setReqPhone("");
              setReqService("");
              setReqDueDate("");
              setReqNotes("");
              setIsCreateOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-[#e21b23] hover:bg-red-700 text-white font-bold text-sm shadow-sm gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Request</span>
          </Button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER STRIP */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-3.5 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search by customer, phone, order #, or service task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-900/60 pl-10 pr-3 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 outline-none focus:border-red-500 transition shadow-2xs"
          />
        </div>

        <span className="text-xs font-bold font-mono text-slate-400 dark:text-zinc-500 uppercase self-end sm:self-center shrink-0 pr-1">
          {filteredRequests.length} {filteredRequests.length === 1 ? "REQUEST" : "REQUESTS"}
        </span>
      </div>

      {/* 3. KANBAN BOARD VIEW */}
      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] py-24 text-center text-sm font-semibold text-slate-400 dark:text-zinc-500">
          Loading production requests…
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const columnItems = filteredRequests.filter((r) => r.status === col.id);

            return (
              <div
                key={col.id}
                className="flex min-h-[420px] flex-col rounded-2xl bg-slate-100/70 dark:bg-[#18181b] p-3.5 border border-slate-200/60 dark:border-zinc-800/60"
              >
                {/* Column Top Header */}
                <div className="flex items-center justify-between px-1.5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.accentDot}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                      {col.label}
                    </span>
                  </div>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-zinc-800 text-[11px] font-bold text-slate-700 dark:text-zinc-300 shadow-2xs">
                    {columnItems.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 pt-1">
                  {columnItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-4 shadow-xs transition-all duration-200 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.isOverdue && item.status !== "delivered"
                            ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                        }`}>
                          {item.isOverdue && item.status !== "delivered" ? "Overdue" : `Due ${item.dueDate}`}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          #{item.orderNumber}
                        </span>
                      </div>

                      {/* Customer & Service */}
                      <div className="mt-3">
                        <h4 className="text-sm font-bold leading-snug text-slate-900 dark:text-zinc-100">
                          {item.service}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                          {item.customerName} • {item.phone}
                        </p>
                      </div>

                      {/* Bottom Footer: Advance Step */}
                      {item.status !== "delivered" && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                            Staff: {item.assignedStaff}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-[#e21b23] dark:hover:text-red-400 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-zinc-200 transition-colors shadow-2xs"
                          >
                            <span>Advance</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {columnItems.length === 0 && (
                    <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center">
                      <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">
                        No requests in this stage
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Alternative Clean List View */
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {filteredRequests.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 px-3 rounded-xl transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#e21b23]">
                      #{item.orderNumber}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      {item.customerName}
                    </span>
                    {item.isOverdue && item.status !== "delivered" && (
                      <span className="rounded-full bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {item.service} • Assigned to {item.assignedStaff} • {item.phone}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono font-medium text-slate-400 dark:text-zinc-500">{item.dueDate}</span>
                  <span className="text-xs font-bold capitalize text-slate-700 dark:text-zinc-300">
                    {item.status.replace("_", " ")}
                  </span>
                  {item.status !== "delivered" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(item.id)}
                      className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold hover:border-red-500 hover:text-[#e21b23] text-slate-700 dark:text-zinc-200 transition shadow-2xs"
                    >
                      Advance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md dark:bg-[#18181b] dark:border-zinc-800 rounded-2xl">
          <form onSubmit={handleCreateRequest}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                Create Production Request
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Track photo editing, printing, retouching, or framing jobs in the studio production pipeline.
              </DialogDescription>
            </DialogHeader>

            {dialogError && (
              <div role="alert" className="mt-3 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                {dialogError}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="req-name" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Customer Name *
                </Label>
                <Input
                  id="req-name"
                  placeholder="e.g. Dawit Haile"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="req-phone" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Customer Phone *
                </Label>
                <Input
                  id="req-phone"
                  type="tel"
                  placeholder="09XXXXXXXX or +2519XXXXXXXX"
                  value={reqPhone}
                  onChange={(e) => setReqPhone(e.target.value)}
                  className="h-10 text-sm font-mono rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="req-service" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Package / Service Task *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="req-service"
                    placeholder="e.g. Wedding Photo Retouching & Album Binding"
                    value={reqService}
                    onChange={(e) => setReqService(e.target.value)}
                    className="h-10 text-sm flex-1 rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                    required
                  />
                  {packages.length > 0 && (
                    <select
                      aria-label="Select Package"
                      onChange={(e) => {
                        if (e.target.value) setReqService(e.target.value);
                      }}
                      className="h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-700 dark:text-zinc-300 max-w-[140px] cursor-pointer"
                    >
                      <option value="">Packages...</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="req-due" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Due Date (Gregorian & Ethiopian)
                </Label>
                <Input
                  id="req-due"
                  type="date"
                  value={reqDueDate}
                  onChange={(e) => setReqDueDate(e.target.value)}
                  className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
                {reqDueDate && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    EC: {formatCalendarPair(reqDueDate).ethiopian} ({getEthiopianDateDetails(reqDueDate)?.textAm || ""})
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="req-notes" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Instructions / Notes
                </Label>
                <Input
                  id="req-notes"
                  placeholder="e.g. Warm color tone, deliver high-res via Telegram"
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
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
                {isSaving ? "Creating..." : "Create Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
