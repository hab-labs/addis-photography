"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";
import { studioStore } from "@/lib/api/store";
import type { AuditLog } from "@/types";

const actionLabels: Record<string, string> = {
  ORDER_CREATED: "Order created",
  PAYMENT_RECORDED: "Payment recorded",
  ORDER_DELIVERED: "Order delivered",
  STATUS_UPDATED: "Status updated",
  PIN_CONFIGURED: "PIN configured",
};

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}


export default function AuditLogPage() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [search, setSearch] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("All users");
  const [actionFilter, setActionFilter] = React.useState("All actions");

  React.useEffect(() => {
    setLogs(studioStore.getAuditLogs());
    studioStore.syncAuditLogs().then(setLogs).catch(() => {});
  }, []);

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

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e31b23]">
          Accountability
        </p>
        <h1 className="mt-1 text-[25px] font-semibold leading-none text-slate-900">Audit Log</h1>
        <p className="mt-2 text-xs text-slate-500">
          Review sensitive actions and operational changes.
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-2">
          <div className="relative min-w-[170px] flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action or record"
              className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-[10px] text-slate-700 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
            />
          </div>
          <label className="relative min-w-[150px] flex-1">
            <select
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              className="h-8 w-full appearance-none rounded-md border border-slate-200 bg-white px-2.5 pr-7 text-[10px] text-slate-600 outline-none"
            >
              <option>All users</option>
              {users.map((user) => <option key={user}>{user}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
          </label>
          <label className="relative min-w-[150px] flex-1">
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="h-8 w-full appearance-none rounded-md border border-slate-200 bg-white px-2.5 pr-7 text-[10px] text-slate-600 outline-none"
            >
              <option>All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {actionLabels[action] ?? action}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
          </label>
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Date range
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2.5">Timestamp</th>
                <th className="px-2 py-2.5">User</th>
                <th className="px-2 py-2.5">Action</th>
                <th className="px-2 py-2.5">Affected record</th>
                <th className="px-2 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const timestamp = formatTimestamp(log.timestamp);
                return (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-2 py-3 text-[10px] font-semibold text-slate-700">
                      {timestamp.date}, {timestamp.time}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-[10px] text-slate-600">{log.actor_name}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-[10px] text-slate-600">
                      {actionLabels[log.action] ?? log.action}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-[10px] text-slate-600">
                      {log.target_id}
                    </td>
                    <td className="px-2 py-3 text-[10px] text-slate-500">{log.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="border-t border-slate-100 py-10 text-center text-xs text-slate-400">
            No audit records match your filters.
          </div>
        )}
      </section>
    </div>
  );
}
