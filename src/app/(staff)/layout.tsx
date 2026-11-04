"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  CalendarDays,
  CalendarCheck,
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
  Sun,
  Moon,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { studioStore } from "@/lib/api/store";
import { api } from "@/lib/api/client";

const navOperations = [
  { title: "Today", href: "/today", icon: CalendarDays },
  { title: "Bookings", href: "/bookings", icon: CalendarCheck },
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
  const { theme, resolvedTheme, toggleTheme } = useTheme();
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
  const [pendingRequests, setPendingRequests] = React.useState(0);
  const [pendingBookings, setPendingBookings] = React.useState(0);
  const [storageInfo, setStorageInfo] = React.useState({
    percent: 0,
    text: "0.0 MB of 500 GB used",
  });

  React.useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    try {
      const reqs = studioStore.getRequests();
      setPendingRequests(reqs.filter((r) => r.status !== "delivered").length);

      const bookings = studioStore.getBookings();
      setPendingBookings(bookings.filter((b) => b.status === "pending").length);

      api.get<{ bookings: any[] }>("/api/bookings")
        .then((res) => {
          if (res?.bookings && Array.isArray(res.bookings)) {
            setPendingBookings(res.bookings.filter((b) => b.status === "pending").length);
          }
        })
        .catch(() => {});

      const albums = studioStore.getAlbums();
      let usedBytes = 0;
      albums.forEach((a) => {
        usedBytes += Number(a.used_bytes || 0);
      });
      const totalGb = 500;
      const totalBytes = totalGb * 1024 * 1024 * 1024;
      const pct = Math.min(100, Math.round((usedBytes / totalBytes) * 100));
      const usedMb = usedBytes / (1024 * 1024);
      const usedText =
        usedMb >= 1024
          ? `${(usedMb / 1024).toFixed(1)} GB of ${totalGb} GB used`
          : `${usedMb.toFixed(1)} MB of ${totalGb} GB used`;
      setStorageInfo({
        percent: pct,
        text: usedText,
      });
    } catch {}
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f5] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 font-sans selection:bg-red-600 selection:text-white transition-colors duration-150">
      <aside className="sticky top-0 h-screen hidden w-60 shrink-0 flex-col justify-between bg-[#101010] px-4 py-5 text-slate-300 md:flex overflow-y-auto z-40">
        <div>
          <div className="flex items-center gap-3.5 border-b border-[#262626] px-2 pb-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0b0b0b] p-1 shadow-[0_0_0_2px_rgba(255,255,255,0.03)]">
              <img
                src="/addis-photography-logo.png"
                alt="Addis Photography logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-none">
              <h2 className="text-xl font-black tracking-tight text-white">Addis</h2>
              <p className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-slate-400">PHOTOGRAPHY STUDIO</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6">
            <div>
              <nav className="space-y-1.5">
                {navOperations.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={`group flex h-11 items-center gap-3.5 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-[#e21b23] text-white shadow-sm"
                          : "text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon className={`h-5 w-5 shrink-0 stroke-[1.8] transition-transform group-hover:scale-105 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.title}</span>
                      {item.title === "Requests" && pendingRequests > 0 && (
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-white/20 text-white" : "bg-[#2a2a2d] text-slate-300"}`}>
                          {pendingRequests}
                        </span>
                      )}
                      {item.title === "Bookings" && pendingBookings > 0 && (
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                          {pendingBookings}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {isAdmin && (
              <nav className="mt-2.5 space-y-1.5 pt-2 border-t border-[#262626]/60">
                {visibleAdminNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={`group flex h-11 items-center gap-3.5 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-[#e21b23] text-white shadow-sm"
                          : "text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon className={`h-5 w-5 shrink-0 stroke-[1.8] transition-transform group-hover:scale-105 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#262626]/60">
          <div className="rounded-xl bg-[#18181b] p-3.5 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Storage</span>
              <span className="text-white font-mono font-bold">{storageInfo.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#27272a]">
              <div
                className="h-full rounded-full bg-[#e21b23] transition-all"
                style={{ width: `${Math.max(storageInfo.percent, 2)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{storageInfo.text}</p>
          </div>
          <div className="flex items-center gap-3 px-1 text-slate-400">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222225] text-slate-300 shrink-0">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-bold text-white">Need help?</div>
              <div className="text-[11px] text-slate-400">View studio guide</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Island Window */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f5f5f5] dark:bg-[#09090b]">
        <header className="sticky top-0 z-30 flex min-h-[56px] sm:min-h-[64px] items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3.5 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-links"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1f] text-slate-700 dark:text-zinc-200 shadow-xs md:hidden active:scale-95 transition-all"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium tracking-[0.02em] text-slate-400 dark:text-zinc-500 truncate hidden xs:block">
                Workspace / {(pathname.split("/").filter(Boolean).pop()?.replace("admin-", "") ?? "Today").replace(/^\w/, c => c.toUpperCase())}
              </p>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 truncate">
                {pathname === "/today" ? "Today" : pathname.includes("admin/") ? pathname.split("/").pop()?.replace(/^\w/, c => c.toUpperCase()) : pathname.slice(1).replace(/^\w/, c => c.toUpperCase())}
              </h1>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "am" : "en")}
              aria-label={`Switch language to ${locale === "en" ? "Amharic" : "English"}`}
              className="flex h-8 sm:h-10 items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1f] px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-200 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
              <span>{locale === "en" ? "አማርኛ" : "EN"}</span>
            </button>

            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
              className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1f] text-slate-700 dark:text-zinc-200 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-600" />
              )}
            </button>

            <button aria-label="Notifications" className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1f] text-slate-600 dark:text-zinc-300 shadow-xs">
              <Bell className="h-3.5 w-3.5" />
            </button>

            {/* Top Navbar [+ New Order] button near account name */}
            <Link
              href="/orders/new"
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-[#e21b23] hover:bg-[#c9151c] text-white px-2.5 sm:px-4 h-8 sm:h-10 text-xs sm:text-sm font-bold shadow-xs transition-all hover:shadow active:scale-95"
            >
              <PlusCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline">+ New Order</span>
              <span className="xs:hidden">New</span>
            </Link>

            <div className="relative">
              <button
                type="button"
                aria-label="Open account menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="flex items-center gap-1.5 sm:gap-2.5 rounded-xl px-1 sm:px-2 py-1 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarFallback className="bg-[#f3d7d7] dark:bg-red-950/60 text-[10px] sm:text-xs font-bold text-[#b82727] dark:text-red-400">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden leading-tight sm:block">
                  <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">{userName}</div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400">{userRole}</div>
                </div>
                <ChevronRight className={`h-3.5 w-3.5 text-slate-500 transition-transform ${accountMenuOpen ? "rotate-90" : ""}`} />
              </button>

              {accountMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close account menu"
                    onClick={() => setAccountMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-2 text-left shadow-xl dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60 px-3 py-2.5">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-[#f3d7d7] dark:bg-red-950/60 text-xs font-bold text-[#b82727] dark:text-red-400">{userInitials}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-zinc-100">{userName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400">{userRole}</p>
                        <p className="truncate text-[10px] text-slate-400 dark:text-zinc-500">{user?.username || "Signed-in account"}</p>
                      </div>
                    </div>
                    <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
                    <Link href="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/80">
                      <UserCircle className="h-4 w-4" />
                      Account overview
                    </Link>
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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

        <main className="min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          {children}
        </main>

        {/* Mobile Navigation Drawer - Matches exact mockup from user */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Left slide-out drawer matching the dark mockup */}
            <div className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col justify-between bg-[#101010] p-4 text-slate-300 shadow-2xl animate-in slide-in-from-left duration-250">
              <div className="space-y-5 overflow-y-auto">
                {/* Drawer Header with Logo & Close */}
                <div className="flex items-center justify-between border-b border-[#262626] pb-4 px-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0b0b0b] p-1 shadow-[0_0_0_2px_rgba(255,255,255,0.03)]">
                      <img
                        src="/addis-photography-logo.png"
                        alt="Addis Photography logo"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="leading-none">
                      <h2 className="text-lg font-black tracking-tight text-white">Addis</h2>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">PHOTOGRAPHY STUDIO</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Operations Navigation */}
                <nav className="space-y-1">
                  {navOperations.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex h-11 items-center gap-3.5 rounded-xl px-4 text-sm font-semibold transition-all duration-150 ${
                          isActive
                            ? "bg-[#e21b23] text-white shadow-sm"
                            : "text-slate-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <item.icon className={`h-5 w-5 shrink-0 stroke-[1.8] ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span>{item.title}</span>
                        {item.title === "Requests" && pendingRequests > 0 && (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-white/20 text-white" : "bg-[#2a2a2d] text-slate-300"}`}>
                            {pendingRequests}
                          </span>
                        )}
                        {item.title === "Bookings" && pendingBookings > 0 && (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                            {pendingBookings}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {/* Admin Navigation (if Admin) */}
                {isAdmin && (
                  <div className="pt-2 border-t border-[#262626]/80">
                    <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Administration
                    </p>
                    <nav className="space-y-1">
                      {visibleAdminNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.title}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`group flex h-10 items-center gap-3.5 rounded-xl px-4 text-sm font-semibold transition-all duration-150 ${
                              isActive
                                ? "bg-[#e21b23] text-white shadow-sm"
                                : "text-slate-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <item.icon className={`h-4.5 w-4.5 shrink-0 stroke-[1.8] ${isActive ? "text-white" : "text-slate-400"}`} />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                )}
              </div>

              {/* Bottom Storage & Help Widget (matching user mockup) */}
              <div className="space-y-3 pt-3 border-t border-[#262626]/80">
                <div className="rounded-xl bg-[#18181b] p-3 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Storage</span>
                    <span className="text-white font-mono font-bold">{storageInfo.percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#27272a]">
                    <div
                      className="h-full rounded-full bg-[#e21b23] transition-all"
                      style={{ width: `${Math.max(storageInfo.percent, 2)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">{storageInfo.text}</p>
                </div>

                <div className="flex items-center gap-3 px-1 text-slate-400">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#222225] text-slate-300 shrink-0">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-bold text-white">Need help?</div>
                    <div className="text-[10px] text-slate-400">View studio guide</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}