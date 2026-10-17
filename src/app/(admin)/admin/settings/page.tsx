"use client";

import * as React from "react";
import { Check, Save, Upload, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studioStore } from "@/lib/api/store";
import type { StudioSettings } from "@/types";

type SettingsTab = "Studio Profile" | "Album Defaults" | "Uploads & Storage" | "Order & Delivery";

const tabs: SettingsTab[] = [
  "Studio Profile",
  "Album Defaults",
  "Uploads & Storage",
  "Order & Delivery",
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
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <section className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e31b23]">
            Studio preferences
          </p>
          <h1 className="mt-1 text-[25px] font-semibold leading-none text-slate-900">
            Settings
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Configure studio identity, album security defaults, and delivery receipt notes.
          </p>
        </div>

        {saved && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <Check className="h-3.5 w-3.5" /> Changes saved to studio storage
          </div>
        )}
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-[145px_minmax(0,552px)]">
        <nav className="space-y-1" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`w-full rounded-md px-2 py-2 text-left text-[10px] font-medium transition ${
                activeTab === tab
                  ? "bg-white font-semibold text-[#e31b23] shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {activeTab === "Studio Profile" && (
            <>
              <div className="px-4 pb-3 pt-4">
                <h2 className="text-sm font-semibold text-slate-800">Studio profile</h2>
                <p className="mt-1 text-[10px] text-slate-400">
                  Information shown on customer public albums, invoices, and collection receipts.
                </p>
              </div>

              <div className="space-y-3 px-4 pb-4">
                <div className="flex items-center justify-between rounded-md bg-[#111111] px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.logo_url || "/addis-photography-logo.png"}
                      alt="Addis Photography logo"
                      className="h-8 w-8 rounded-full object-contain"
                    />
                    <div className="leading-none">
                      <p className="text-sm font-bold text-white">
                        {settings.studio_name || "Addis Photography"}
                      </p>
                      <p className="mt-1 text-[5px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Photography Studio
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-white/10 px-2.5 py-1 rounded">
                    Official Brand
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="set-name" className="text-[10px] font-medium text-slate-600">
                      Studio name
                    </Label>
                    <Input
                      id="set-name"
                      value={settings.studio_name}
                      onChange={(e) => handleChange("studio_name", e.target.value)}
                      className="h-8 rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="set-accent" className="text-[10px] font-medium text-slate-600">
                      Accent color
                    </Label>
                    <div className="flex gap-2">
                      <input
                        id="set-accent"
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        aria-label="Accent color"
                        className="h-8 w-8 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-8 flex-1 rounded-md border-slate-200 px-2.5 text-[11px] font-medium shadow-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="set-phone" className="text-[10px] font-medium text-slate-600">
                      Phone number
                    </Label>
                    <Input
                      id="set-phone"
                      value={settings.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="h-8 rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="set-email" className="text-[10px] font-medium text-slate-600">
                      Email address
                    </Label>
                    <Input
                      id="set-email"
                      type="email"
                      value={settings.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="h-8 rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="set-addr" className="text-[10px] font-medium text-slate-600">
                    Studio physical address
                  </Label>
                  <Input
                    id="set-addr"
                    value={settings.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="h-8 rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "Album Defaults" && (
            <div className="space-y-4 p-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Album defaults</h2>
                <p className="mt-1 text-[10px] text-slate-400">
                  Choose the default storage quota and retention policy for new customer galleries.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="set-quota" className="text-[10px] font-medium text-slate-600">
                    Default album quota (MB)
                  </Label>
                  <Input
                    id="set-quota"
                    type="number"
                    value={settings.default_album_quota_mb}
                    onChange={(e) =>
                      handleChange("default_album_quota_mb", Number(e.target.value) || 1024)
                    }
                    className="h-8 rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="set-ret" className="text-[10px] font-medium text-slate-600">
                    Retention period (days)
                  </Label>
                  <Input
                    id="set-ret"
                    type="number"
                    value={settings.default_retention_days}
                    onChange={(e) =>
                      handleChange("default_retention_days", Number(e.target.value) || 90)
                    }
                    className="h-8 rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={settings.require_pin_for_albums}
                  onChange={(event) =>
                    handleChange("require_pin_for_albums", event.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#e31b23]"
                />
                Require 4–6 digit security PIN by default for new client galleries
              </label>

              <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-medium text-slate-600">Private album access</p>
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] font-semibold text-[#e31b23]">
                    4–6 digit numeric PIN with rate limit lockout
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-600">Dual calendar display</p>
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] font-semibold text-[#e31b23]">
                    Gregorian • Ethiopian (ዓ.ም)
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Uploads & Storage" && (
            <div className="space-y-4 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Uploads & storage</h2>
              <p className="text-[10px] text-slate-400">
                Manage chunked media engine limits and client file upload settings.
              </p>
              <div className="space-y-1">
                <Label htmlFor="set-up-quota" className="text-[10px] font-medium text-slate-600">
                  Default storage limit per album (MB)
                </Label>
                <Input
                  id="set-up-quota"
                  type="number"
                  value={settings.default_album_quota_mb}
                  onChange={(e) =>
                    handleChange("default_album_quota_mb", Number(e.target.value) || 1024)
                  }
                  className="h-8 max-w-xs rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700"
                />
              </div>
              <div className="rounded-md bg-slate-50 p-3 text-[10px] text-slate-500">
                Chunked uploads slice large files into 2 MB objects with SHA-256 integrity and automatic resume.
              </div>
            </div>
          )}

          {activeTab === "Order & Delivery" && (
            <div className="space-y-4 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Order & delivery</h2>
              <p className="text-[10px] text-slate-400">
                Configure the legal footer printed on customer receipts and delivery notices.
              </p>
              <div className="space-y-1">
                <Label htmlFor="set-footer" className="text-[10px] font-medium text-slate-600">
                  Receipt footer note
                </Label>
                <Input
                  id="set-footer"
                  value={settings.receipt_footer}
                  onChange={(e) => handleChange("receipt_footer", e.target.value)}
                  className="h-8 rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700"
                />
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 px-4 py-3">
            <Button
              type="button"
              onClick={saveSettings}
              className="h-8 gap-1.5 rounded-md bg-[#e31b23] px-3.5 text-[10px] font-semibold text-white hover:bg-[#c9151c]"
            >
              {saved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
              {saved ? "Saved" : "Save Changes"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
