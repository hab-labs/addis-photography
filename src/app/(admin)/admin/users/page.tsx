"use client";

import * as React from "react";
import { UserCheck, Plus, Search, Shield, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STAFF = [
  { id: "u1", name: "Yonas Mekonnen", email: "yonas@addisphoto.com", role: "Administrator", lastActive: "Active Now", initials: "YM" },
  { id: "u2", name: "Selamawit Tadesse", email: "selam@addisphoto.com", role: "Desk Cashier & Intake", lastActive: "15 mins ago", initials: "ST" },
  { id: "u3", name: "Dawit Haile", email: "dawit@addisphoto.com", role: "Retoucher & Lab Tech", lastActive: "1 hour ago", initials: "DH" },
];

export default function StaffUsersPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Studio Staff Accounts
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <UserCheck className="h-3 w-3" /> Team Access
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Manage credentials, operator roles, and counter permissions.
          </p>
        </div>

        <Button size="sm" className="h-9 gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 shadow-sm shadow-indigo-600/25">
          <Plus className="h-3.5 w-3.5" />
          <span>Invite Operator</span>
        </Button>
      </div>

      <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ">
        <Table>
          <TableHeader>
            <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-transparent">
              <TableHead className="pl-4">Staff Member</TableHead>
              <TableHead>Access Role</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="text-right pr-4">Auth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100/80 ">
            {STAFF.map((s) => (
              <TableRow key={s.id} className="border-none hover:bg-slate-50/80  transition-colors">
                <TableCell className="pl-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-2xl ring-1 ring-slate-200/60">
                      <AvatarFallback className="rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white text-xs font-bold">
                        {s.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold text-slate-800 ">{s.name}</p>
                      <p className="text-[11px] text-slate-400">{s.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50  px-3 py-1 text-xs font-semibold text-indigo-700 ">
                    <Shield className="h-3 w-3" /> {s.role}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-medium text-slate-400">{s.lastActive}</TableCell>
                <TableCell className="text-right pr-4">
                  <button className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1">
                    <KeyRound className="h-3 w-3" /> Reset PIN
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}