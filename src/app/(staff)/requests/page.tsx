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
import { studioStore } from "@/lib/api/store";
import { formatDate, isOverdue } from "@/lib/date";
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
  { id: "ready", label: "Ready for Pickup", pillColor: "bg-violet-500/10 text-violet-600 ", accentDot: "bg-violet-500" },
  { id: "delivered", label: "Delivered", pillColor: "bg-emerald-500/10 text-emerald-600 ", accentDot: "bg-emerald-500" },
];

export default function ProductionRequestsPage() {
  const [requests, setRequests] = React.useState<RequestCard[]>([]);
  const [search, setSearch] = React.useState("");
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"kanban" | "list">("kanban");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
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
  }, []);

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Production Requests
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <Layers className="h-3 w-3" /> Live Pipeline
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Track client shoot edits, laboratory print batches, and studio pickup readiness.
          </p>
        </div>

        {/* View Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Controller (Apple style) */}
          <div className="flex items-center rounded-full bg-slate-200/60  p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-sm  "
                  : "text-slate-500 hover:text-slate-900 "
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm  "
                  : "text-slate-500 hover:text-slate-900 "
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
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border ${
              overdueOnly
                ? "bg-rose-50 border-rose-300 text-rose-700    shadow-sm"
                : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50   "
            }`}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${overdueOnly ? "text-rose-500" : "text-slate-400"}`} />
            <span>Overdue Only</span>
          </button>

          {/* Search Pill */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-52 rounded-full bg-white border border-slate-200/80 pl-9 pr-3 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board Canvas */}
      {isLoading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center text-xs font-medium text-slate-400">
          Loading production requests…
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-start">
          {COLUMNS.map((col) => {
            const columnItems = filteredRequests.filter((r) => r.status === col.id);

            return (
              <div
                key={col.id}
                className="flex flex-col rounded-3xl bg-slate-100/70  p-4 border border-slate-200/50  min-h-[550px]"
              >
                {/* Column Top Header */}
                <div className="flex items-center justify-between pb-3.5 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.accentDot}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 ">
                      {col.label}
                    </span>
                  </div>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white  text-[11px] font-bold text-slate-600  shadow-2xs">
                    {columnItems.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 pt-1">
                  {columnItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-2xl bg-white  p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100  hover:shadow-md hover:border-slate-200  transition-all duration-200"
                    >
                      {/* Top Row: Overdue Tag & Order ID */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-indigo-600 ">
                          #{item.orderNumber.replace("AP-2026-", "")}
                        </span>

                        {item.isOverdue && item.status !== "delivered" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600   border border-rose-200/60 ">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Overdue
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-[10px]">On Track</span>
                        )}
                      </div>

                      {/* Customer & Service */}
                      <div className="mt-2.5">
                        <h4 className="text-xs font-bold text-slate-900  leading-snug">
                          {item.customerName}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500  mt-0.5 truncate">
                          {item.service}
                        </p>
                      </div>

                      {/* Meta Row: Phone & Due Date */}
                      <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-slate-400 pt-2.5 border-t border-slate-100 ">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {item.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {item.dueDate}
                        </span>
                      </div>

                      {/* Bottom Footer: Staff & Advance Step */}
                      <div className="mt-3 flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100  text-[10px] font-bold text-slate-600 ">
                            {item.assignedStaff[0]}
                          </div>
                          <span className="text-[11px] font-medium text-slate-600 ">
                            {item.assignedStaff.split(" ")[0]}
                          </span>
                        </div>

                        {item.status !== "delivered" ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(item.id)}
                            className="flex items-center gap-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600    px-2 py-1 text-[10px] font-semibold text-slate-600  transition-colors"
                          >
                            <span>Advance</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 ">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnItems.length === 0 && (
                    <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200  text-center">
                      <p className="text-[11px] font-medium text-slate-400">No requests in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Alternative Clean List View */
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ">
          <div className="divide-y divide-slate-100 ">
            {filteredRequests.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/50  px-3 rounded-2xl transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 ">
                      #{item.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900 ">
                      {item.customerName}
                    </span>
                    {item.isOverdue && item.status !== "delivered" && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-600 border border-rose-200">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{item.service} • Assigned to {item.assignedStaff}</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-slate-400">{item.dueDate}</span>
                  <span className="text-xs font-semibold capitalize text-slate-700 ">
                    {item.status.replace("_", " ")}
                  </span>
                  {item.status !== "delivered" && (
                    <button
                      onClick={() => handleAdvanceStatus(item.id)}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600"
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
    </div>
  );
}