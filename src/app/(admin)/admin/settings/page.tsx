"use client";

import * as React from "react";
import { Check, Save, ShieldCheck, Sparkles, Sliders, Palette, HardDrive, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studioStore } from "@/lib/api/store";
import type { StudioSettings } from "@/types";

type SettingsTab = "Studio Profile" | "Album Defaults" | "Uploads & Storage" | "Order & Delivery";

const tabs: { label: SettingsTab; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Studio Profile", icon: Palette },
  { label: "Album Defaults", icon: Sliders },
  { label: "Uploads & Storage", icon: HardDrive },
  { label: "Order & Delivery", icon: Receipt },
];

export default function StudioSettingsPage() {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("Studio Profile");
  const [settings, setSettings] = React.useState<StudioSettings>(() => studioStore.getSettings());
  const [saved, setSaved] = React.useState(false);
  const [accentColor, setAccentColor] = React.useState("#D51E25");

  React.useEffect(() => {
    setSettings(studioStore.getSettings());
    studioStore.syncSettings().then(setSettings).catch(() => {});
  }, []);

  const handleChange = <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    studioStore.updateSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
            Studio Preferences
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Configure studio brand identity, client gallery security defaults, and delivery receipt notes.
          </p>
        </div>

        {saved && (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs animate-in fade-in">
            <Check className="h-4 w-4" />
            <span>Changes saved to studio storage</span>
          </div>
        )}
      </div>

      {/* 2. MAIN 2-COLUMN SETTINGS SECTION */}
      <div className="grid items-start gap-6 lg:grid-cols-[240px_1fr]">
        {/* Navigation Sidebar Tabs */}
        <nav className="space-y-1.5" aria-label="Settings navigation">
          {tabs.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveTab(label)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all ${
                activeTab === label
                  ? "bg-white dark:bg-[#141417] text-[#e21b23] dark:text-red-400 shadow-xs border border-slate-200/90 dark:border-zinc-800"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/40 hover:text-slate-900 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Form Content Card */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] shadow-xs overflow-hidden">
          {activeTab === "Studio Profile" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Studio Profile</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Information shown on customer public albums, invoices, and collection receipts.
                </p>
              </div>

              {/* Brand Card Preview */}
              <div className="flex items-center justify-between rounded-2xl bg-[#101010] p-4 text-white">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full overflow-hidden border border-white/10 bg-[#0b0b0b] p-1">
                    <img
                      src={settings.logo_url || "/addis-photography-logo.png"}
                      alt="Addis Photography logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-white">
                      {settings.studio_name || "Addis Photography"}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Photography Studio • Addis Ababa
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                  Official Brand
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-name" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Studio Name *
                  </Label>
                  <Input
                    id="set-name"
                    value={settings.studio_name}
                    onChange={(e) => handleChange("studio_name", e.target.value)}
                    className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="set-accent" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Accent Color
                  </Label>
                  <div className="flex gap-2">
                    <input
                      id="set-accent"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      aria-label="Accent color"
                      className="h-10 w-10 cursor-pointer rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 flex-1 font-mono text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="set-phone" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Studio Phone Number
                  </Label>
                  <Input
                    id="set-phone"
                    value={settings.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="set-email" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Studio Email Address
                  </Label>
                  <Input
                    id="set-email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="set-addr" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Studio Physical Address
                </Label>
                <Input
                  id="set-addr"
                  value={settings.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="e.g. Bole Medhanialem, Edna Mall Area, Addis Ababa"
                />
              </div>
            </div>
          )}

          {activeTab === "Album Defaults" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Album Defaults</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Choose default storage quotas, retention grace periods, and PIN protection rules.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-quota" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Default Album Quota (MB)
                  </Label>
                  <Input
                    id="set-quota"
                    type="number"
                    value={settings.default_album_quota_mb}
                    onChange={(e) =>
                      handleChange("default_album_quota_mb", Number(e.target.value) || 1024)
                    }
                    className="h-10 text-sm font-mono rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="set-ret" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Retention Period (Days)
                  </Label>
                  <Input
                    id="set-ret"
                    type="number"
                    value={settings.default_retention_days}
                    onChange={(e) =>
                      handleChange("default_retention_days", Number(e.target.value) || 90)
                    }
                    className="h-10 text-sm font-mono rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-zinc-700 p-3.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={settings.require_pin_for_albums}
                  onChange={(event) =>
                    handleChange("require_pin_for_albums", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-[#e21b23]"
                />
                <span>Require 4–6 digit security PIN by default for new client galleries</span>
              </label>

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-xl border border-red-200/60 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 p-4">
                  <p className="text-xs font-bold text-[#e21b23] dark:text-red-400">Private Album Security</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
                    4–6 digit numeric PIN with 15-minute lockout protection after 5 failed attempts.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 p-4">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Dual Calendar Display</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
                    Gregorian (dd/mm/yyyy) and Ethiopian (ዓ.ም) calendars active across all receipts and albums.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Uploads & Storage" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Uploads & Storage Engine</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Manage chunked media engine limits and client file upload settings.
                </p>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <Label htmlFor="set-up-quota" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Default Storage Limit Per Album (MB)
                </Label>
                <Input
                  id="set-up-quota"
                  type="number"
                  value={settings.default_album_quota_mb}
                  onChange={(e) =>
                    handleChange("default_album_quota_mb", Number(e.target.value) || 1024)
                  }
                  className="h-10 text-sm font-mono rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 p-4 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Chunked uploads slice large files into 2 MB objects with SHA-256 integrity verification, pause/resume support, and automatic background transcode to 720p H.264.
              </div>
            </div>
          )}

          {activeTab === "Order & Delivery" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Order & Delivery Preferences</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Configure the legal notes printed on customer receipts and pickup notices.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="set-footer" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Receipt Footer Note
                </Label>
                <Input
                  id="set-footer"
                  value={settings.receipt_footer}
                  onChange={(e) => handleChange("receipt_footer", e.target.value)}
                  className="h-10 text-sm rounded-xl dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="e.g. Thank you for choosing Addis Photography Studio. All sales final."
                />
              </div>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end">
            <Button
              type="button"
              onClick={saveSettings}
              className="h-10 px-5 gap-2 rounded-xl bg-[#e21b23] text-white font-bold text-sm shadow-sm hover:bg-red-700 transition-all"
            >
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{saved ? "Saved" : "Save Changes"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
