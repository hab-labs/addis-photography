"use client";

import * as React from "react";
import { Check, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsTab = "Studio Profile" | "Album Defaults" | "Uploads & Storage" | "Order & Delivery";

const tabs: SettingsTab[] = [
  "Studio Profile",
  "Album Defaults",
  "Uploads & Storage",
  "Order & Delivery",
];

function Field({
  label,
  defaultValue,
  className = "",
  type = "text",
}: {
  label: string;
  defaultValue: string | number;
  className?: string;
  type?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[10px] font-medium text-slate-600">{label}</span>
      <Input
        type={type}
        defaultValue={defaultValue}
        className="h-8 rounded-md border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
      />
    </label>
  );
}

export default function StudioSettingsPage() {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("Studio Profile");
  const [pinRequired, setPinRequired] = React.useState(true);
  const [saved, setSaved] = React.useState(false);

  const saveSettings = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e31b23]">
          Studio preferences
        </p>
        <h1 className="mt-1 text-[25px] font-semibold leading-none text-slate-900">Settings</h1>
        <p className="mt-2 text-xs text-slate-500">
          Configure studio identity, album defaults, and delivery rules.
        </p>
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
                  Information shown on customer albums and receipts.
                </p>
              </div>

              <div className="space-y-3 px-4 pb-4">
                <div className="flex items-center justify-between rounded-md bg-[#111111] px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/addis-photography-logo.png"
                      alt="Addis Photography logo"
                      className="h-8 w-8 rounded-full object-contain"
                    />
                    <div className="leading-none">
                      <p className="text-sm font-bold text-white">Addis</p>
                      <p className="mt-1 text-[5px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Photography Studio
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="h-8 gap-1.5 bg-white text-[10px] font-semibold">
                    <Upload className="h-3 w-3" />
                    Change Logo
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Studio name" defaultValue="Addis Photography Studio" />
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-slate-600">Accent color</span>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        defaultValue="#D51E25"
                        aria-label="Accent color"
                        className="h-8 w-8 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                      />
                      <Input
                        defaultValue="#D51E25"
                        className="h-8 flex-1 rounded-md border-slate-200 px-2.5 text-[11px] font-medium shadow-none"
                      />
                    </div>
                  </label>
                  <Field label="Phone number" defaultValue="+251 911 42 18 06" />
                  <Field label="Email address" defaultValue="hello@addisphoto.et" />
                </div>
                <Field label="Studio address" defaultValue="Bole Road, Addis Ababa, Ethiopia" />
              </div>
            </>
          )}

          {activeTab === "Album Defaults" && (
            <div className="space-y-4 p-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Album defaults</h2>
                <p className="mt-1 text-[10px] text-slate-400">Choose the default behavior for new client galleries.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Default album quota (MB)" defaultValue={1024} type="number" />
                <Field label="Retention expiration period (days)" defaultValue={90} type="number" />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={pinRequired}
                  onChange={(event) => setPinRequired(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#e31b23]"
                />
                Require security PIN for new client albums
              </label>
              <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-medium text-slate-600">Private album access</p>
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] font-semibold text-[#e31b23]">
                    4–6 digit numeric PIN
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-600">Calendar display</p>
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] font-semibold text-[#e31b23]">
                    Gregorian • Ethiopian
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Uploads & Storage" && (
            <div className="space-y-4 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Uploads & storage</h2>
              <p className="text-[10px] text-slate-400">Manage storage limits and upload defaults for studio albums.</p>
              <Field label="Default storage quota (MB)" defaultValue={1024} type="number" />
              <div className="rounded-md bg-slate-50 p-3 text-[10px] text-slate-500">
                Chunked uploads use automatic resume and parallel workers for reliable delivery.
              </div>
            </div>
          )}

          {activeTab === "Order & Delivery" && (
            <div className="space-y-4 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Order & delivery</h2>
              <p className="text-[10px] text-slate-400">Configure the information printed on receipts and delivery notices.</p>
              <Field
                label="Receipt footer note"
                defaultValue="Thank you for choosing Addis Photography! Please keep this receipt for order collection."
              />
            </div>
          )}

          <div className="border-t border-slate-200 px-4 py-3">
            <Button
              type="button"
              onClick={saveSettings}
              className="h-8 gap-1.5 rounded-md bg-[#e31b23] px-3.5 text-[10px] font-semibold hover:bg-[#c9151c]"
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
