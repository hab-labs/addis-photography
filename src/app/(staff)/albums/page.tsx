"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  ImageIcon,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Loader2,
  FolderPlus,
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
import { formatCalendarPair } from "@/lib/date";
import type { Album as StoreAlbum, Customer } from "@/types";

type ClientAlbum = StoreAlbum & {
  coverUrl: string;
  clientName: string;
  mediaCount: number;
  createdDate: string;
};

const fallbackCover =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80";

export default function ClientAlbumsPage() {
  const [albums, setAlbums] = React.useState<ClientAlbum[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("All statuses");
  const [expiringOnly, setExpiringOnly] = React.useState(false);

  // New Album Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [eventDate, setEventDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [requirePin, setRequirePin] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [dialogError, setDialogError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const loadAlbums = React.useCallback(() => {
    setAlbums(
      studioStore.getAlbums().map((album: StoreAlbum) => {
        const date = formatCalendarPair(album.created_at);
        return {
          ...album,
          clientName: album.customer_name,
          coverUrl: album.cover_image_url || fallbackCover,
          mediaCount: album.file_count,
          createdDate: `${date.gregorian}`,
        };
      })
    );
  }, []);

  React.useEffect(() => {
    loadAlbums();
    setCustomers(studioStore.getCustomers());
  }, [loadAlbums]);

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
    }
  };

  const handleCreateAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError("");

    const cleanTitle = title.trim();
    const cleanCustomerName = customerName.trim();

    if (!cleanTitle) {
      setDialogError("Please enter an album title.");
      return;
    }
    if (!cleanCustomerName) {
      setDialogError("Please select or enter a client name.");
      return;
    }
    if (!eventDate) {
      setDialogError("Please select an event date.");
      return;
    }
    if (requirePin && (!pin || !/^\d{4,6}$/.test(pin))) {
      setDialogError("PIN must be 4 to 6 numeric digits.");
      return;
    }

    try {
      setIsSaving(true);
      const generatedSlug =
        cleanTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "album";
      const token = `${generatedSlug}-${Math.random().toString(36).substring(2, 6)}`;

      studioStore.createAlbum({
        title: cleanTitle,
        token,
        customer_id: customerId || `cust-${Date.now()}`,
        customer_name: cleanCustomerName,
        event_date: new Date(eventDate).toISOString(),
        pin: requirePin ? pin : undefined,
      });

      loadAlbums();
      setIsCreateOpen(false);
      setTitle("");
      setCustomerId("");
      setCustomerName("");
      setRequirePin(false);
      setPin("");
      setEventDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to create album.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAlbums = albums.filter((album) => {
    const matchesSearch =
      album.title.toLowerCase().includes(search.toLowerCase()) ||
      album.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      status === "All statuses" ||
      (status === "Published" && !album.is_locked) ||
      (status === "Draft" && album.is_locked);
    const expiresSoon =
      new Date(album.expires_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30;
    return matchesSearch && matchesStatus && (!expiringOnly || expiresSoon);
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e31b23]">
            Customer galleries
          </p>
          <h1 className="mt-1 text-[25px] font-semibold leading-none text-slate-900">
            Albums
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Create, publish, and manage private customer collections.
          </p>
        </div>
        <Button
          onClick={() => {
            setDialogError("");
            setIsCreateOpen(true);
          }}
          className="h-8 gap-1.5 rounded-md bg-[#e31b23] px-4 text-xs font-semibold shadow-sm hover:bg-[#c9151c]"
        >
          <Plus className="h-3.5 w-3.5" />
          New Album
        </Button>
      </section>

      <section className="flex min-h-[52px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="relative min-w-[170px] flex-1">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search albums or customers"
            className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-[11px] text-slate-700 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
          />
        </div>
        <label className="relative min-w-[170px] flex-1">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-8 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-7 text-[11px] text-slate-600 outline-none"
          >
            <option>All statuses</option>
            <option>Published</option>
            <option>Draft</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
        </label>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={expiringOnly}
            onChange={(event) => setExpiringOnly(event.target.checked)}
            className="h-3 w-3 rounded border-slate-300 accent-[#e31b23]"
          />
          Expiring soon
        </label>
        <span className="hidden text-[10px] text-slate-400 sm:block">
          {filteredAlbums.length} albums
        </span>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredAlbums.map((album) => {
          const published = album.file_count > 0;
          const eventDateStr = formatCalendarPair(album.event_date).gregorian;
          return (
            <Link
              key={album.id}
              href={`/albums/${album.id}`}
              className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-[154px] overflow-hidden bg-slate-100">
                <Image
                  src={album.coverUrl}
                  alt={album.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />
                <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-slate-400"}`}
                    />
                    {published ? "Published" : "Draft"}
                  </span>
                  {album.pin_set && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-sm">
                      <Lock className="h-2.5 w-2.5" /> PIN
                    </span>
                  )}
                </div>
                <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/45 text-white backdrop-blur-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              </div>
              <div className="p-2.5">
                <h2 className="truncate text-[11px] font-semibold text-slate-800">
                  {album.title}
                </h2>
                <p className="mt-1 truncate text-[9px] text-slate-400">{album.clientName}</p>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {album.mediaCount} photos
                  </span>
                  <span className="flex items-center gap-1">
                    {new Date(album.expires_at).getTime() - Date.now() <
                    1000 * 60 * 60 * 24 * 30 ? (
                      <Clock3 className="h-3 w-3 text-amber-500" />
                    ) : (
                      <CalendarDays className="h-3 w-3" />
                    )}
                    {eventDateStr}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {filteredAlbums.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center text-xs text-slate-400 space-y-3">
          <FolderPlus className="mx-auto h-8 w-8 text-slate-300" />
          <p>No albums match your search or filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatus("All statuses");
              setExpiringOnly(false);
              setIsCreateOpen(true);
            }}
            className="text-xs text-slate-700"
          >
            Create New Album
          </Button>
        </div>
      )}

      {/* New Album Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Create Client Album</DialogTitle>
            <DialogDescription>
              Create a private digital gallery link for customer delivery.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAlbum} className="space-y-4 py-2">
            {dialogError && (
              <div
                role="alert"
                className="rounded-md bg-red-50 p-2.5 text-xs font-medium text-red-700 border border-red-200"
              >
                {dialogError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="alb-title" className="text-xs font-semibold text-slate-700">
                Album Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="alb-title"
                placeholder="e.g. Bethlehem & Dawit Wedding Highlights"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alb-cust" className="text-xs font-semibold text-slate-700">
                Client / Customer <span className="text-red-500">*</span>
              </Label>
              {customers.length > 0 && (
                <div className="mb-1.5">
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-red-400"
                    value={customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                  >
                    <option value="">-- Choose Existing Client (or type below) --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Input
                id="alb-cust"
                placeholder="Enter client full name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (customerId) setCustomerId("");
                }}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alb-date" className="text-xs font-semibold text-slate-700">
                Event Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="alb-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={requirePin}
                  onChange={(e) => setRequirePin(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#e31b23]"
                />
                Protect with 4–6 Digit Security PIN
              </label>

              {requirePin && (
                <div className="space-y-1 pt-1.5">
                  <Label htmlFor="alb-pin" className="text-[11px] text-slate-500">
                    PIN Code (Client must enter this to view gallery)
                  </Label>
                  <Input
                    id="alb-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="text-xs font-mono"
                    required={requirePin}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-[#e31b23] hover:bg-[#c9151c] text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Album"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
