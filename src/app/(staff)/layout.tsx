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
  Bell,
  ChevronRight,
  HelpCircle,
  Menu,
  X,
  LogOut,
  UserCircle,
  Globe,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navOperations = [
  { title: "Today", href: "/today", icon: CalendarDays },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Requests", href: "/requests", icon: KanbanSquare },
  { title: "Albums", href: "/albums", icon: ImageIcon },
];

const navAdmin = [
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Price List", href: "/admin/prices", icon: Tags },
  { title: "Users", href: "/admin/users", icon: UserCheck },
  { title: "Settings", href: "/admin/settings", icon: Settings },
  { title: "Storage", href: "/admin/storage", icon: HardDrive },
  { title: "Audit Log", href: "/admin/audit", icon: ShieldAlert },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const visibleAdminNav = isAdmin ? navAdmin : [];
  const mobileNavItems = [
    ...navOperations,
    ...visibleAdminNav,
    { title: "New Order", href: "/orders/new", icon: PlusCircle },
  ];
  const userName = user?.name ?? "Studio Staff";
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userRole = user?.role === "admin" ? "Administrator" : "Staff";

  React.useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f5] font-sans selection:bg-red-600 selection:text-white">
      <aside className="hidden w-[200px] shrink-0 flex-col justify-between bg-[#101010] px-3 py-4 text-slate-300 md:flex">
        <div>
          <div className="flex items-center gap-3 border-b border-[#262626] px-2 pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0b0b0b] p-1 shadow-[0_0_0_2px_rgba(255,255,255,0.03)]">
              <img
                src="/addis-photography-logo.png"
                alt="Addis Photography logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-none">
              <h2 className="text-[1.05rem] font-black tracking-[-0.04em] text-white">Addis</h2>
              <p className="mt-1 text-[7px] font-semibold uppercase tracking-[0.22em] text-slate-400">PHOTOGRAPHY STUDIO</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-5">
            <div>
              <nav className="space-y-1">
                {navOperations.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={`group flex h-10 items-center gap-3 rounded-md px-3.5 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-[#e21b23] text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.title}</span>
                      {item.title === "Requests" && (
                        <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] ${isActive ? "bg-white/20 text-white" : "bg-[#343434] text-slate-300"}`}>7</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {isAdmin && (
              <nav className="mt-2 space-y-1">
                {visibleAdminNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={`group flex h-10 items-center gap-3 rounded-md px-3.5 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-[#e21b23] text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <Link
            href="/orders/new"
            className="mt-4 flex h-9 items-center justify-center gap-2 rounded-md bg-[#e21b23] px-3 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(226,27,35,0.18)] transition-colors hover:bg-red-700"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Order
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-[#1b1b1b] p-3">
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-300">
              <span>Storage</span>
              <span className="text-white">62%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#363636]">
              <div className="h-full w-[62%] rounded-full bg-[#e21b23]" />
            </div>
            <p className="mt-2 text-[10px] text-slate-500">124 GB of 200 GB used</p>
          </div>
          <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1f1f1f] text-slate-300">
              <HelpCircle className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="font-semibold text-white">Need help?</div>
              <div>View studio guide</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Island Window */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f5f5f5]">
        <header className="relative z-30 flex min-h-[61px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-nowrap sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-[0.02em] text-slate-400">Workspace / {(pathname.split("/").filter(Boolean).pop()?.replace("admin-", "") ?? "Today").replace(/^\w/, c => c.toUpperCase())}</p>
            <p className="mt-0.5 text-[1.05rem] font-bold tracking-[-0.04em] text-slate-900">{pathname === "/today" ? "Today" : pathname.includes("admin/") ? pathname.split("/").pop()?.replace(/^\w/, c => c.toUpperCase()) : pathname.slice(1).replace(/^\w/, c => c.toUpperCase())}</p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-links"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm md:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "am" : "en")}
              aria-label={`Switch language to ${locale === "en" ? "Amharic" : "English"}`}
              className="flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              <span>{locale === "en" ? "አማርኛ" : "EN"}</span>
            </button>

            <button aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm">
              <Bell className="h-4 w-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                aria-label="Open account menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-slate-50"
              >
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-[#f3d7d7] text-[10px] font-bold text-[#b82727]">{userInitials}</AvatarFallback></Avatar>
                <div className="hidden leading-tight sm:block">
                  <div className="text-xs font-semibold text-slate-900">{userName}</div>
                  <div className="text-[10px] text-slate-500">{userRole}</div>
                </div>
                <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${accountMenuOpen ? "rotate-90" : ""}`} />
              </button>

              {accountMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close account menu"
                    onClick={() => setAccountMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-lg border border-slate-200 bg-white p-2 text-left shadow-[0_8px_24px_rgba(15,23,42,0.16)]">
                    <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-[#f3d7d7] text-xs font-bold text-[#b82727]">{userInitials}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{userName}</p>
                        <p className="text-[10px] text-slate-500">{userRole}</p>
                        <p className="truncate text-[10px] text-slate-400">{user?.username || "Signed-in account"}</p>
                      </div>
                    </div>
                    <div className="my-1 border-t border-slate-100" />
                    <Link href="/profile" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <UserCircle className="h-4 w-4" />
                      Account overview
                    </Link>
                    {isAdmin && (
                      <Link href="/admin/settings" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        <Settings className="h-4 w-4" />
                        Account settings
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 pb-6 sm:p-6 md:p-6">
          {children}
        </main>

        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
          />
        )}

        {mobileMenuOpen && (
          <nav
            id="mobile-navigation-links"
            aria-label="Mobile navigation"
            className="fixed right-3 top-[66px] z-50 w-[min(280px,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.16)] md:hidden"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {mobileNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-semibold ${
                      isActive ? "bg-red-50 text-red-600" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}