"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  CalendarDays,
  PlusCircle,
  KanbanSquare,
  Users,
  ImageIcon,
  BarChart3,
  Tags,
  UserCheck,
  HardDrive,
  Settings,
  ShieldAlert,
  LogOut,
  ChevronDown,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navOperations = [
  { title: "Overview / Ledger", href: "/today", icon: CalendarDays },
  { title: "New Walk-In", href: "/orders/new", icon: PlusCircle },
  { title: "Production Requests", href: "/requests", icon: KanbanSquare },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Client Albums", href: "/albums", icon: ImageIcon },
];

const navAdmin = [
  { title: "Sales Reports", href: "/reports", icon: BarChart3 },
  { title: "Price List", href: "/admin/prices", icon: Tags },
  { title: "Staff Users", href: "/admin/users", icon: UserCheck },
  { title: "Disk Storage", href: "/admin/storage", icon: HardDrive },
  { title: "Studio Settings", href: "/admin/settings", icon: Settings },
  { title: "Audit Log", href: "/admin/audit", icon: ShieldAlert },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const userName = user?.name ?? "Studio Staff";
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userRole = user?.role === "admin" ? "Administrator" : "Staff";

  return (
    <div className="flex min-h-screen w-full bg-black p-2 font-sans selection:bg-red-600 selection:text-white md:p-3">
      {/* Deep Navy Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between py-4 px-3 text-slate-300 md:flex">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-red-600/20">
            <img src="/addis-photography-logo.png" alt="" className="h-10 w-10 object-contain" />
            </div>
            <div>
            <h2 className="text-sm font-bold leading-tight tracking-tight text-white">Addis Photography</h2>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Management</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 space-y-6">
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu
              </p>
              <nav className="mt-2.5 space-y-1">
                {navOperations.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Admin Settings
              </p>
              <nav className="mt-2.5 space-y-1">
                {navAdmin.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="rounded-2xl bg-white/5 p-2.5 backdrop-blur-sm border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 rounded-xl ring-2 ring-indigo-500/30">
              <AvatarFallback className="rounded-xl bg-red-600 text-xs font-bold text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-white">{userName}</p>
              <p className="text-[10px] text-red-300">{userRole}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Island Window */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl  ">
        <header className="flex h-16 items-center justify-between px-4 md:px-8 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-slate-800  font-bold text-sm">
            <span className="truncate">Studio Operations</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
              Demo
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-100  px-3 py-1.5 border border-slate-200/50 ">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              <span className="hidden text-xs font-semibold text-slate-600 sm:inline">Jimma (UTC+3)</span>
            </div>
            {/* Standard Link element avoids Slot ref warnings */}
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-red-600/25 transition-all hover:bg-red-700"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Order</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>

        <nav aria-label="Mobile navigation" className="grid grid-cols-5 gap-1 border-t border-slate-200 bg-white px-2 py-2 md:hidden">
          {navOperations.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.title}
                href={item.href}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${
                  isActive ? "bg-red-50 text-red-600" : "text-slate-500"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.title.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}