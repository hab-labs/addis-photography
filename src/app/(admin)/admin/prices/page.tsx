"use client";

import * as React from "react";
import Decimal from "decimal.js";
import {
  Tags,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { studioStore } from "@/lib/api/store";
import type { PriceItem as StorePriceItem } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PriceItem = StorePriceItem;

const CATEGORIES: { label: string; value: PriceItem["category"] }[] = [
  { label: "Passport & ID", value: "passport" },
  { label: "Portrait", value: "portrait" },
  { label: "Instant Print", value: "instant" },
  { label: "Wedding Ceremony", value: "wedding" },
  { label: "Event", value: "event" },
  { label: "Commercial", value: "commercial" },
  { label: "Framing & Mounting", value: "framing" },
];

export default function PriceListPage() {
  const [search, setSearch] = React.useState("");
  const [prices, setPrices] = React.useState<PriceItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Edit Dialog State
  const [editingItem, setEditingItem] = React.useState<PriceItem | null>(null);
  const [editPriceInput, setEditPriceInput] = React.useState("");
  const [editError, setEditError] = React.useState("");

  // Add Dialog State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [addName, setAddName] = React.useState("");
  const [addCategory, setAddCategory] = React.useState<PriceItem["category"]>("portrait");
  const [addPrice, setAddPrice] = React.useState("");
  const [addTurnaround, setAddTurnaround] = React.useState("1");
  const [addDescription, setAddDescription] = React.useState("");
  const [addError, setAddError] = React.useState("");

  // Delete Dialog State
  const [deletingItem, setDeletingItem] = React.useState<PriceItem | null>(null);

  const loadPrices = React.useCallback(() => {
    try {
      setPrices(studioStore.getPrices());
      studioStore.syncPrices().then(setPrices).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  // Edit Price Submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditError("");

    const parsed = Number(editPriceInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEditError("Please enter a valid non-negative price amount.");
      return;
    }

    try {
      studioStore.updatePrice(editingItem.id, parsed.toFixed(2));
      loadPrices();
      setEditingItem(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update price.");
    }
  };

  // Add Service Submit
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const cleanName = addName.trim();
    if (!cleanName) {
      setAddError("Please enter a service name.");
      return;
    }

    const parsedPrice = Number(addPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setAddError("Please enter a positive price in ETB.");
      return;
    }

    const parsedTurnaround = parseInt(addTurnaround, 10);
    if (isNaN(parsedTurnaround) || parsedTurnaround < 0) {
      setAddError("Turnaround must be 0 or more days.");
      return;
    }

    try {
      studioStore.createPrice({
        name: cleanName,
        category: addCategory,
        standard_unit_price: parsedPrice.toFixed(2),
        turnaround_days: parsedTurnaround,
        description: addDescription.trim() || undefined,
      });

      loadPrices();
      setIsAddOpen(false);
      setAddName("");
      setAddPrice("");
      setAddTurnaround("1");
      setAddDescription("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add service item.");
    }
  };

  // Delete Service Confirm
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    try {
      studioStore.deletePrice(deletingItem.id);
      loadPrices();
      setDeletingItem(null);
    } catch {
      // fallback
    }
  };

  const filtered = prices.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
            Service Catalog & Rates
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Price List
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Manage standard studio photo packages, per-print prices, and turnaround timelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full sm:w-64 rounded-xl bg-slate-50/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 outline-none transition-all focus:border-red-500 shadow-2xs"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              setAddError("");
              setIsAddOpen(true);
            }}
            className="h-10 px-4 gap-2 rounded-xl bg-[#e21b23] hover:bg-red-700 text-white font-bold text-sm shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Service</span>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#141417] p-5 sm:p-6 shadow-xs border border-slate-200/90 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 hover:bg-transparent">
              <TableHead className="pl-4">Service Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price (ETB)</TableHead>
              <TableHead>Turnaround</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100/80 dark:divide-zinc-800/80">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400 dark:text-zinc-500">
                  Loading price catalog…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400 dark:text-zinc-500">
                  No services match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-none hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <TableCell className="pl-4 py-3.5 font-bold text-xs text-slate-900 dark:text-zinc-100">
                    <div>{item.name}</div>
                    {item.description && (
                      <div className="text-[10px] font-normal text-slate-400 dark:text-zinc-500">
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 capitalize">
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-xs text-slate-800 dark:text-zinc-200 tabular-nums">
                    ETB {Number(item.standard_unit_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-400 dark:text-zinc-400">
                    {item.turnaround_days === 0
                      ? "Same day"
                      : `${item.turnaround_days} day${item.turnaround_days === 1 ? "" : "s"}`}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditError("");
                          setEditingItem(item);
                          setEditPriceInput(item.standard_unit_price);
                        }}
                        aria-label={`Edit ${item.name} price`}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        aria-label={`Delete ${item.name}`}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[380px] dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-zinc-100">Update Price</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400">
              {editingItem?.name} ({editingItem?.category})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            {editError && (
              <div
                role="alert"
                className="rounded-md bg-red-50 dark:bg-red-950/40 p-2.5 text-xs font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
              >
                {editError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-price-input" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Standard Unit Price (ETB)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
                  ETB
                </span>
                <Input
                  id="edit-price-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPriceInput}
                  onChange={(e) => setEditPriceInput(e.target.value)}
                  className="pl-12 text-sm font-mono font-bold dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  autoFocus
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save Price
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[440px] dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-zinc-100">Add Studio Service</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400">
              Add a new photo package, session, or framing option to the catalog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAdd} className="space-y-3.5 py-2">
            {addError && (
              <div
                role="alert"
                className="rounded-md bg-red-50 dark:bg-red-950/40 p-2.5 text-xs font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
              >
                {addError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="add-name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Service Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-name"
                placeholder="e.g. Newborn Session (10 Retouched)"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-cat" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Category
                </Label>
                <select
                  id="add-cat"
                  value={addCategory}
                  onChange={(e) =>
                    setAddCategory(e.target.value as PriceItem["category"])
                  }
                  className="h-9 w-full rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-turn" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Turnaround (Days)
                </Label>
                <Input
                  id="add-turn"
                  type="number"
                  min="0"
                  value={addTurnaround}
                  onChange={(e) => setAddTurnaround(e.target.value)}
                  className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-price" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Unit Price (ETB) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
                  ETB
                </span>
                <Input
                  id="add-price"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  className="pl-12 text-xs font-mono font-bold dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-desc" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Description (Optional)
              </Label>
              <Input
                id="add-desc"
                placeholder="Includes 2 prints and high-res digital downloads"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Add Service
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="sm:max-w-[400px] dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" /> Delete Service
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400">
              Are you sure you want to remove <strong className="text-slate-800 dark:text-zinc-200">{deletingItem?.name}</strong> from the
              active pricing catalog? Existing historical orders with this item will not be
              affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingItem(null)}
              className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Keep Service
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}