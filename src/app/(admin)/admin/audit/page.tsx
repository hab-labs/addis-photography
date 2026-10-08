"use client";

import * as React from "react";
import { ShieldAlert, Search, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AUDIT_LOGS = [
  { id: "log-1", time: "10:32 AM", user: "Yonas Mekonnen", action: "Order Saved", details: "Created order #AP-2026-20040 (ETB 2,400.00)", ip: "192.168.1.12" },
  { id: "log-2", time: "10:14 AM", user: "Selamawit Tadesse", action: "Status Updated", details: "Advanced #AP-2026-00101 to Ready for Pickup", ip: "192.168.1.15" },
  { id: "log-3", time: "09:45 AM", user: "Yonas Mekonnen", action: "PIN Configured", details: "Secured Album: Bethlehem Wedding with PIN", ip: "192.168.1.12" },
  { id: "log-4", time: "09:00 AM", user: "System", action: "Daily Register Opened", details: "Initial cash balance set to ETB 0.00", ip: "localhost" },
];

export default function AuditLogPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
            Security & Action Audit
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
            <ShieldAlert className="h-3 w-3" /> Tamper-Proof
          </span>
        </div>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Complete chronological record of ledger updates, order overrides, and authentication logs.
        </p>
      </div>

      <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ">
        <Table>
          <TableHeader>
            <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-transparent">
              <TableHead className="pl-4">Time</TableHead>
              <TableHead>Staff Member</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right pr-4">Host IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100/80 ">
            {AUDIT_LOGS.map((log) => (
              <TableRow key={log.id} className="border-none hover:bg-slate-50/80  transition-colors text-xs">
                <TableCell className="pl-4 py-3.5 font-mono text-slate-400">{log.time}</TableCell>
                <TableCell className="font-bold text-slate-800 ">{log.user}</TableCell>
                <TableCell>
                  <span className="rounded-full bg-slate-100  px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ">
                    {log.action}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600 ">{log.details}</TableCell>
                <TableCell className="text-right pr-4 font-mono text-slate-400">{log.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}