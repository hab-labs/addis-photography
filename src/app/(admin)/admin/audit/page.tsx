"use client";

import * as React from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight, ShieldCheck, User } from "lucide-react";
import { studioStore } from "@/lib/api/store";
import type { AuditLog } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const actionLabels: Record<string, string> = {
  ORDER_CREATED: "Order created",
  PAYMENT_RECORDED: "Payment recorded",
  ORDER_DELIVERED: "Order delivered",
  STATUS_UPDATED: "Status updated",
  PIN_CONFIGURED: "PIN configured",
  ALBUM_CREATED: "Album created",
  USER_INVITED: "User invited",
};

function formatTimestamp(timestamp: string) {
  try {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
  } catch {
    return { date: "—", time: "—" };
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [search, setSearch] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("All users");
  const [actionFilter, setActionFilter] = React.useState("All actions");

  // Pagination
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setLogs(studioStore.getAuditLogs());
    studioStore.syncAuditLogs().then(setLogs).catch(() => {});
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, userFilter, actionFilter]);

  const users = Array.from(new Set(logs.map((log) => log.actor_name)));
  const actions = Array.from(new Set(logs.map((log) => log.action)));

  const filteredLogs = logs.filter((log) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      log.actor_name.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      log.target_id.toLowerCase().includes(query);
    return (
      matchesSearch &&
      (userFilter === "All users" || log.actor_name === userFilter) &&
      (actionFilter === "All actions" || log.action === actionFilter)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

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
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
            Accountability & Security
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Review sensitive operator actions, financial recordings, and system access history.
          </p>
        </div>

        <span className="text-xs font-bold font-mono tracking-wider text-slate-400 dark:text-zinc-500 uppercase self-start sm:self-auto">
          {filteredLogs.length.toLocaleString()} {filteredLogs.length === 1 ? "RECORD" : "RECORDS"}
        </span>
      </div>

      {/* 2. FILTER & TABLE CARD */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] shadow-xs overflow-hidden">
        {/* Search & Filter Header Strip */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, action, or record..."
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-900/60 pl-10 pr-3 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 outline-none focus:border-red-500 transition shadow-2xs"
            />
          </div>

          {/* User Filter */}
          <div className="w-[160px] relative">
            <select
              aria-label="Filter by user"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 pr-8 text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition shadow-2xs cursor-pointer"
            >
              <option>All users</option>
              {users.map((user) => (
                <option key={user}>{user}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Action Filter */}
          <div className="w-[170px] relative">
            <select
              aria-label="Filter by action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 pr-8 text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition shadow-2xs cursor-pointer"
            >
              <option>All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {actionLabels[action] ?? action}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-3.5 px-4 w-44">Timestamp</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4 text-right">Target Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No audit records match your filters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const stamp = formatTimestamp(log.timestamp);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="block font-bold text-slate-900 dark:text-zinc-100 font-mono">
                          {stamp.date}
                        </span>
                        <span className="block text-[11px] font-mono text-slate-400">
                          {stamp.time}
                        </span>
                      </td>

                      {/* Operator Avatar & Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                              {getInitials(log.actor_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">
                            {log.actor_name}
                          </span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                          {actionLabels[log.action] ?? log.action}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 font-medium max-w-md">
                        {log.details}
                      </td>

                      {/* Target Ref */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {log.target_id || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. PAGINATION ROW */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span>
            Showing {filteredLogs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length.toLocaleString()}
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

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((pg) => (
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
    </div>
  );
}
