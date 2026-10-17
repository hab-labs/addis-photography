"use client";

import * as React from "react";
import { Tags, Plus, Search, Edit2, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studioStore } from "@/lib/api/store";
import type { PriceItem as StorePriceItem } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PriceItem = StorePriceItem;

export default function PriceListPage() {
  const [search, setSearch] = React.useState("");
  const [prices, setPrices] = React.useState<PriceItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      setPrices(studioStore.getPrices());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEditPrice = (item: PriceItem) => {
    const nextPrice = window.prompt(`Update ${item.name} price (ETB):`, item.standard_unit_price);
    if (nextPrice === null) return;
    const parsedPrice = Number(nextPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      window.alert("Enter a valid non-negative price.");
      return;
    }
    studioStore.updatePrice(item.id, parsedPrice.toFixed(2));
    setPrices(studioStore.getPrices());
  };

  const filtered = prices.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Price List
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <Tags className="h-3 w-3" /> Live Catalog
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Manage standard studio services and active prices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-60 rounded-full bg-white border border-slate-200/80 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
            />
          </div>
          <Button size="sm" className="h-9 gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 shadow-sm shadow-indigo-600/25">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Service</span>
          </Button>
        </div>
      </div>

      <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ">
        <Table>
          <TableHeader>
            <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-transparent">
              <TableHead className="pl-4">Service Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price (ETB)</TableHead>
              <TableHead>Turnaround</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100/80 ">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400">
                  Loading price catalog…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400">
                  No services match your search.
                </TableCell>
              </TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id} className="border-none hover:bg-slate-50/80  transition-colors">
                <TableCell className="pl-4 py-3.5 font-bold text-xs text-slate-900 ">
                  {item.name}
                </TableCell>
                <TableCell>
                  <span className="rounded-full bg-slate-100  px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ">
                    {item.category}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-xs text-slate-800  tabular-nums">
                  ETB {Number(item.standard_unit_price).toFixed(2)}
                </TableCell>
                <TableCell className="text-xs font-medium text-slate-400">
                  {item.turnaround_days === 0 ? "Same day" : `${item.turnaround_days} day${item.turnaround_days === 1 ? "" : "s"}`}
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700  ">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEditPrice(item)}
                      aria-label={`Edit ${item.name} price`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}