"use client";

import * as React from "react";
import { SlidersHorizontal, Save, Building, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StudioSettingsPage() {
  const [pinRequired, setPinRequired] = React.useState(true);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Studio Configuration & Branding
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <SlidersHorizontal className="h-3 w-3" /> Defaults
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Global studio parameters, receipt templates, album quotas, and security defaults.
          </p>
        </div>

        <Button
          size="sm"
          className="h-9 gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 shadow-sm shadow-indigo-600/25"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Save Studio Settings</span>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Card 1: Studio Identity */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 ">
            <Building className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 ">
              Studio Identity & Receipt Information
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 ">
                Studio Name
              </label>
              <Input
                defaultValue="Addis Photography Studio"
                className="h-10 rounded-2xl bg-slate-50/80  text-xs border-slate-200/80  focus:bg-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 ">
                  Contact Phones
                </label>
                <Input
                  defaultValue="+251 91 122 3344 / +251 11 550 4433"
                  className="h-10 rounded-2xl bg-slate-50/80  text-xs border-slate-200/80  focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 ">
                  Email Address
                </label>
                <Input
                  defaultValue="contact@addisphotography.et"
                  className="h-10 rounded-2xl bg-slate-50/80  text-xs border-slate-200/80  focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 ">
                Studio Physical Address
              </label>
              <Input
                defaultValue="Tsinat Building, Jimma, Ethiopia"
                className="h-10 rounded-2xl bg-slate-50/80  text-xs border-slate-200/80  focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 ">
                Receipt Footer Note
              </label>
              <Input
                defaultValue="Thank you for choosing Addis Photography! Please keep this receipt for order collection."
                className="h-10 rounded-2xl bg-slate-50/80  text-xs border-slate-200/80  focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Album Storage & Retention Defaults */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 ">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 ">
              Client Album Storage & Retention
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 ">
                Default Album Quota (MB)
              </label>
              <Input
                type="number"
                defaultValue={1024}
                className="h-10 rounded-2xl bg-slate-50/80  text-xs font-mono border-slate-200/80  focus:bg-white"
              />
              <p className="text-[11px] text-slate-400">Standard studio limit: 1,024 MB (1 GB)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 ">
                Retention Expiration Period (Days)
              </label>
              <Input
                type="number"
                defaultValue={90}
                className="h-10 rounded-2xl bg-slate-50/80  text-xs font-mono border-slate-200/80  focus:bg-white"
              />
              <p className="text-[11px] text-slate-400">Default: 90 days before warning & archive</p>
            </div>
          </div>

          {/* Toggle pill */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pinRequired}
                onChange={(e) => setPinRequired(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-slate-700 ">
                Require security PIN for new client album creation by default
              </span>
            </label>
          </div>

          <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate-700">Private Album Access</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Client-selected access method for private galleries.
              </p>
              <label className="mt-3 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3">
                <input
                  type="radio"
                  checked
                  readOnly
                  aria-label="4 to 6 digit numeric PIN"
                  className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-indigo-700">
                  4–6 digit numeric PIN
                </span>
              </label>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700">Calendar Display</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Show both calendar systems wherever dates are presented.
              </p>
              <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs font-semibold text-indigo-700">
                Gregorian • Ethiopian (side-by-side)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}