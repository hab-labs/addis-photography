"use client";

import * as React from "react";
import Link from "next/link";
import {
  KanbanSquare,
  List,
  Search,
  AlertTriangle,
  Clock,
  User,
  Phone,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
  Filter,
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
  { id: "received", label: "Received", pillColor: "bg-blue-500/10 text-blue-600 ", accentDot: "bg-blue-500" },
  { id: "in_progress", label: "In Progress", pillColor: "bg-amber-500/10 text-amber-600 ", accentDot: "bg-amber-500" },
  { id: "ready", label: "Ready", pillColor: "bg-violet-500/10 text-violet-600 ", accentDot: "bg-emerald-500" },
  { id: "delivered", label: "Delivered", pillColor: "bg-emerald-500/10 text-emerald-600 ", accentDot: "bg-emerald-500" },
];

export default function ProductionRequestsPage() {
  const [requests, setRequests] = React.useState<RequestCard[]>([]);
  const [search, setSearch] = React.useState("");
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"kanban" | "list">("kanban");
  const [isLoading, setIsLoading] = React.useState(true);

  // New Request dialog state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [reqName, setReqName] = React.useState("");
  const [reqPhone, setReqPhone] = React.useState("");
  const [reqService, setReqService] = React.useState("Studio Portrait Session (Digital)");
  const [reqDueDate, setReqDueDate] = React.useState("");
  const [reqNotes, setReqNotes] = React.useState("");
  const [dialogError, setDialogError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const packages = React.useMemo(() => {
    try {
      return studioStore.getPrices().filter((p) => p.is_active !== false);
    } catch {
      return [];
    }
  }, []);

  const loadRequests = React.useCallback(() => {
    const refreshData = () => {
      const orders = studioStore.getOrders();
      const orderById = new Map(orders.map((order) => [order.id, order]));
      const sharedRequests = studioStore.getRequests().map((request: ClientRequest) => {
        const order = request.order_id ? orderById.get(request.order_id) : undefined;
        return {
          id: request.id,
          orderNumber: order?.order_number || request.order_id || request.id,
          customerName: request.customer_name,
          phone: request.customer_phone,
          service: request.service_type,
          dueDate: formatDate(request.due_date),
          assignedStaff: request.assigned_to_name || "Unassigned",
          status: request.status,
          isOverdue: request.status !== "delivered" && isOverdue(request.due_date),
        };
      });
      setRequests(sharedRequests);
      setIsLoading(false);
    };

    refreshData();
    studioStore.syncRequests().then(() => refreshData()).catch(() => {});
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
    if (!cleanPhone) {
      setDialogError("Please enter customer phone number.");
      return;
    }
    setIsSaving(true);
    try {
      studioStore.createRequest({
        customer_name: reqName.trim(),
        customer_phone: cleanPhone,
        service_type: reqService.trim() || "Studio Photography",
        due_date: reqDueDate ? new Date(reqDueDate).toISOString() : undefined,
        notes: reqNotes.trim() || undefined,
      });
      loadRequests();
      setIsCreateOpen(false);
      setReqName("");
      setReqPhone("");
      setReqNotes("");
      setReqDueDate("");
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to create request.");
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
    <div className="mx-auto max-w-[1128px] space-y-3">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e21b23]">Studio workflow</p>
          <h1 className="mt-1 text-[25px] font-medium leading-none tracking-[-0.04em] text-slate-900 dark:text-zinc-100">Requests</h1>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400">Track customer edits, print work, and delivery requests.</p>
        </div>

        {/* View Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Controller (Apple style) */}
          <div className="flex h-8 items-center rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex h-7 items-center gap-1 rounded px-3 text-[10px] font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex h-7 items-center gap-1 rounded px-3 text-[10px] font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              <span>List</span>
            </button>
          </div>

          {/* Overdue Filter Chip */}
          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-[10px] font-semibold transition-all ${
              overdueOnly
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 shadow-sm"
                : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121214] text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            <span className={`h-3 w-3 rounded-sm border ${overdueOnly ? "border-[#e21b23] bg-[#e21b23]" : "border-slate-300 dark:border-zinc-600"}`} />
            <span>Overdue only</span>
          </button>

          <Button
            type="button"
            onClick={() => {
              setDialogError("");
              setReqName("");
              setReqPhone("");
              setReqNotes("");
              setReqDueDate("");
              setIsCreateOpen(true);
            }}
            className="h-8 rounded-md bg-[#e21b23] px-3 text-[10px] font-semibold text-white hover:bg-red-700"
          >
            <span className="mr-1">+</span> New Request
          </Button>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-2 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3 w-3 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search requests"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-40 rounded-md border border-slate-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 pl-8 pr-2 text-[10px] outline-none sm:w-44 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
        </div>
        <button className="flex h-8 flex-1 items-center justify-between rounded-md border border-slate-200 dark:border-zinc-700 dark:bg-zinc-900 px-3 text-[10px] font-semibold text-slate-700 dark:text-zinc-200">
          Open requests <span className="text-slate-400 dark:text-zinc-500">⌄</span>
        </button>
        <button className="hidden h-8 flex-1 items-center justify-between rounded-md border border-slate-200 dark:border-zinc-700 dark:bg-zinc-900 px-3 text-[10px] font-semibold text-slate-700 dark:text-zinc-200 sm:flex">
          All assignees <span className="text-slate-400 dark:text-zinc-500">⌄</span>
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] py-20 text-center text-xs font-medium text-slate-400 dark:text-zinc-500">
          Loading production requests…
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const columnItems = filteredRequests.filter((r) => r.status === col.id);

            return (
              <div
                key={col.id}
                className="flex min-h-[330px] flex-col rounded-lg bg-[#eeeeef] dark:bg-[#18181b] p-2.5"
              >
                {/* Column Top Header */}
                <div className="flex items-center justify-between px-1.5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${col.accentDot}`} />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                      {col.label}
                    </span>
                  </div>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e0e0e1] dark:bg-zinc-800 text-[9px] font-bold text-slate-600 dark:text-zinc-300">
                    {columnItems.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2 pt-1">
                  {columnItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] p-3 shadow-sm transition-all duration-200 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between text-[9px]">
                        <span className={`rounded-full px-2 py-1 font-semibold ${item.isOverdue && item.status !== "delivered" ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"}`}>
                          <span className="mr-1">•</span>{item.isOverdue && item.status !== "delivered" ? "Overdue" : item.dueDate}
                        </span>
                        <span className="text-sm font-bold tracking-widest text-slate-500 dark:text-zinc-500">•••</span>
                      </div>

                      {/* Customer & Service */}
                      <div className="mt-3">
                        <h4 className="text-[10px] font-medium leading-snug text-slate-900 dark:text-zinc-100">
                          {item.service}
                        </h4>
                        <p className="mt-3 text-[9px] text-slate-400 dark:text-zinc-500">
                          {item.customerName}
                        </p>
                      </div>

                      {/* Meta Row: Phone & Due Date */}
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-2.5 text-[9px] text-slate-400 dark:text-zinc-500">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f5dddd] dark:bg-red-950/60 text-[9px] font-bold text-[#c52b2f] dark:text-red-300">
                          {item.assignedStaff.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Due {item.dueDate}
                        </span>
                      </div>

                      {/* Bottom Footer: Advance Step */}
                      {item.status !== "delivered" && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 dark:text-zinc-500">Advance stage</span>
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(item.id)}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-[#e21b23] dark:hover:text-red-400 px-2 py-0.5 text-[9px] font-semibold text-slate-700 dark:text-zinc-200 transition-colors"
                          >
                            <span>Next</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {columnItems.length === 0 && (
                    <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-center">
                      <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">No requests in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Alternative Clean List View */
        <div className="rounded-3xl bg-white dark:bg-[#121214] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-zinc-800">
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {filteredRequests.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 px-3 rounded-2xl transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      #{item.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      {item.customerName}
                    </span>
                    {item.isOverdue && item.status !== "delivered" && (
                      <span className="rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{item.service} • Assigned to {item.assignedStaff}</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-slate-400 dark:text-zinc-500">{item.dueDate}</span>
                  <span className="text-xs font-semibold capitalize text-slate-700 dark:text-zinc-300">
                    {item.status.replace("_", " ")}
                  </span>
                  {item.status !== "delivered" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(item.id)}
                      className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-zinc-700 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-zinc-200"
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
        <DialogContent className="max-w-md dark:bg-[#18181b] dark:border-zinc-800">
          <form onSubmit={handleCreateRequest}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Create Production Request
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Track photo editing, printing, retouching, or framing jobs in the studio production pipeline.
              </DialogDescription>
            </DialogHeader>

            {dialogError && (
              <div role="alert" className="mt-3 rounded-md bg-red-50 dark:bg-red-950/40 p-2.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                {dialogError}
              </div>
            )}

            <div className="grid gap-3 py-4">
              <div className="grid gap-1">
                <Label htmlFor="req-name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Customer Name *
                </Label>
                <Input
                  id="req-name"
                  placeholder="e.g. Dawit Haile"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  className="h-9 text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="req-phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Customer Phone *
                </Label>
                <Input
                  id="req-phone"
                  type="tel"
                  placeholder="09XXXXXXXX or +2519XXXXXXXX"
                  value={reqPhone}
                  onChange={(e) => setReqPhone(e.target.value)}
                  className="h-9 text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="req-service" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Package / Service Task *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="req-service"
                    placeholder="e.g. Wedding Photo Retouching & Album Binding"
                    value={reqService}
                    onChange={(e) => setReqService(e.target.value)}
                    className="h-9 text-xs flex-1 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                    required
                  />
                  {packages.length > 0 && (
                    <select
                      aria-label="Select Package"
                      onChange={(e) => {
                        if (e.target.value) setReqService(e.target.value);
                      }}
                      className="h-9 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-slate-600 dark:text-zinc-300 max-w-[140px]"
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

              <div className="grid gap-1">
                <Label htmlFor="req-due" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Due Date (Gregorian & Ethiopian)
                </Label>
                <Input
                  id="req-due"
                  type="date"
                  value={reqDueDate}
                  onChange={(e) => setReqDueDate(e.target.value)}
                  className="h-9 text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
                {reqDueDate && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    EC: {formatCalendarPair(reqDueDate).ethiopian} ({getEthiopianDateDetails(reqDueDate)?.textAm || ""})
                  </p>
                )}
              </div>

              <div className="grid gap-1">
                <Label htmlFor="req-notes" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Instructions / Notes
                </Label>
                <Input
                  id="req-notes"
                  placeholder="e.g. Warm color tone, deliver high-res via Telegram"
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
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
                {isSaving ? "Creating..." : "Create Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}