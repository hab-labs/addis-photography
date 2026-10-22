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
  Copy,
  Check,
  ExternalLink,
  QrCode,
  FolderOpen,
  Trash2,
  Printer,
  Download,
  Camera,
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/context";
import { generateQrPng, downloadFile, printBrandedFlyer } from "@/lib/qr";
import { studioStore } from "@/lib/api/store";
import { formatCalendarPair, getEthiopianDateDetails } from "@/lib/date";
import type { Album as StoreAlbum, Customer } from "@/types";

type ClientAlbum = StoreAlbum & {
  coverUrl?: string;
  clientName: string;
  mediaCount: number;
  createdDate: string;
};

export default function ClientAlbumsPage() {

  const { isAdmin } = useAuth();
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

  // Album actions state
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);
  const [qrAlbum, setQrAlbum] = React.useState<ClientAlbum | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");
  const [deleteTargetAlbum, setDeleteTargetAlbum] = React.useState<ClientAlbum | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);

  const handleCopyLink = async (album: ClientAlbum) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/a/${album.token}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedToken(album.token);
      setActionNotice(`Copied public gallery link for "${album.title}"`);
      setTimeout(() => setCopiedToken(null), 2500);
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      // Fallback
    }
  };

  const handleOpenQr = async (album: ClientAlbum) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/a/${album.token}`;
    try {
      const url = await generateQrPng(publicUrl);
      setQrDataUrl(url);
      setQrAlbum(album);
    } catch (err) {
      console.error("QR generation error:", err);
    }
  };

  const handleExtendRetention = (album: ClientAlbum) => {
    studioStore.extendAlbumRetention(album.id, 30);
    loadAlbums();
    setActionNotice(`Extended retention for "${album.title}" by 30 days.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleDeleteAlbum = async () => {
    if (!deleteTargetAlbum) return;
    setIsDeleting(true);
    try {
      const ok = await studioStore.deleteAlbum(deleteTargetAlbum.id);
      if (ok) {
        loadAlbums();
        setActionNotice(`Album "${deleteTargetAlbum.title}" has been deleted.`);
        setTimeout(() => setActionNotice(null), 3500);
        setDeleteTargetAlbum(null);
      } else {
        setActionNotice("Could not delete album. Administrator privileges required.");
        setTimeout(() => setActionNotice(null), 3500);
      }
    } catch (err: any) {
      console.error("Failed to delete album:", err);
      setActionNotice(err?.message || "Failed to delete album.");
      setTimeout(() => setActionNotice(null), 3500);
    } finally {
      setIsDeleting(false);
    }
  };

  const loadAlbums = React.useCallback(() => {
    const refreshData = () => {
      setAlbums(
        studioStore.getAlbums().map((album: StoreAlbum) => {
          const date = formatCalendarPair(album.created_at);
          return {
            ...album,
            clientName: album.customer_name,
            coverUrl: album.cover_image_url || undefined,
            mediaCount: album.file_count,

            createdDate: `${date.gregorian}`,
          };
        })
      );
    };

    refreshData();
    studioStore.syncAlbums().then(() => refreshData()).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadAlbums();
    setCustomers(studioStore.getCustomers());
    studioStore.syncCustomers().then(setCustomers).catch(() => {});
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
        customer_id: customerId || undefined,
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
          <h1 className="mt-1 text-[25px] font-semibold leading-none text-slate-900 dark:text-zinc-100">
            Albums
          </h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
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

      <section className="flex min-h-[52px] items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] px-3 py-2 shadow-sm">
        <div className="relative min-w-[170px] flex-1">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search albums or customers"
            className="h-8 w-full rounded-md border border-slate-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 pl-8 pr-2 text-[11px] text-slate-700 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
        </div>
        <label className="relative min-w-[170px] flex-1">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-8 w-full appearance-none rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 pr-7 text-[11px] text-slate-600 dark:text-zinc-300 outline-none"
          >
            <option>All statuses</option>
            <option>Published</option>
            <option>Draft</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
        </label>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-slate-500 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={expiringOnly}
            onChange={(event) => setExpiringOnly(event.target.checked)}
            className="h-3 w-3 rounded border-slate-300 accent-[#e31b23]"
          />
          Expiring soon
        </label>
        <span className="hidden text-[10px] text-slate-400 dark:text-zinc-500 sm:block">
          {filteredAlbums.length} albums
        </span>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredAlbums.map((album) => {
          const published = album.file_count > 0;
          const eventDateStr = formatCalendarPair(album.event_date).gregorian;
          return (
            <div
              key={album.id}
              className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-[154px] overflow-hidden bg-slate-900">
                <Link href={`/albums/${album.id}`} className="block h-full w-full">
                  {album.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4 text-center">
                      <Camera className="h-8 w-8 text-slate-400 opacity-60 mb-1" />
                      <span className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase truncate max-w-[180px]">
                        {album.title}
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5">No cover photo set</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />
                </Link>


                <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5">
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

                <div className="absolute right-2.5 top-2.5 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Album actions"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 hover:bg-black/85 text-white backdrop-blur-sm transition-colors shadow-sm focus:outline-none"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#18181b] shadow-xl border border-slate-100 dark:border-zinc-800 rounded-lg p-1 text-xs">
                      <DropdownMenuItem
                        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                        onClick={() => handleCopyLink(album)}
                      >
                        {copiedToken === album.token ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
                            <span>Copy Public Link</span>
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                        onClick={() => window.open(`/a/${album.token}`, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
                        <span>Open Public Gallery</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                        onClick={() => handleOpenQr(album)}
                      >
                        <QrCode className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
                        <span>QR Code & Flyer</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href={`/albums/${album.id}`}
                          className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                        >
                          <FolderOpen className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
                          <span>Manage & Upload</span>
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                        onClick={() => handleExtendRetention(album)}
                      >
                        <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                        <span>Extend (+30 Days)</span>
                      </DropdownMenuItem>

                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                          <DropdownMenuItem
                            className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium"
                            onClick={() => setDeleteTargetAlbum(album)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            <span>Delete Album</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Link href={`/albums/${album.id}`} className="block p-2.5">
                <h2 className="truncate text-[11px] font-semibold text-slate-800 dark:text-zinc-100 hover:text-[#e31b23] dark:hover:text-[#e31b23] transition-colors">
                  {album.title}
                </h2>
                <p className="mt-1 truncate text-[9px] text-slate-400 dark:text-zinc-500">{album.clientName}</p>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-2 text-[9px] text-slate-400 dark:text-zinc-500">
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
              </Link>
            </div>
          );
        })}
      </section>

      {filteredAlbums.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] py-16 text-center text-xs text-slate-400 dark:text-zinc-500 space-y-3">
          <FolderPlus className="mx-auto h-8 w-8 text-slate-300 dark:text-zinc-600" />
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
            className="text-xs text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700"
          >
            Create New Album
          </Button>
        </div>
      )}

      {/* New Album Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[460px] dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-zinc-100">Create Client Album</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400">
              Create a private digital gallery link for customer delivery.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAlbum} className="space-y-4 py-2">
            {dialogError && (
              <div
                role="alert"
                className="rounded-md bg-red-50 dark:bg-red-950/40 p-2.5 text-xs font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
              >
                {dialogError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="alb-title" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Album Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="alb-title"
                placeholder="e.g. Bethlehem & Dawit Wedding Highlights"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alb-cust" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Client / Customer <span className="text-red-500">*</span>
              </Label>
              {customers.length > 0 && (
                <div className="mb-1.5">
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-slate-700 dark:text-zinc-200 outline-none focus:border-red-400"
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
                className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alb-date" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Event Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="alb-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                required
              />
              {eventDate && (
                <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  EC: {formatCalendarPair(eventDate).ethiopian} ({getEthiopianDateDetails(eventDate)?.textAm || ""})
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-300">
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
                  <Label htmlFor="alb-pin" className="text-[11px] text-slate-500 dark:text-zinc-400">
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
                    className="text-xs font-mono dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
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
                className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-zinc-800 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={Boolean(qrAlbum)} onOpenChange={(open) => !open && setQrAlbum(null)}>
        <DialogContent className="sm:max-w-md dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Client Gallery QR Code
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Share with {qrAlbum?.clientName} to access the online album.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center space-y-4 py-3">
            {qrDataUrl && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Image
                  src={qrDataUrl}
                  alt="Album QR Code"
                  width={220}
                  height={220}
                  className="rounded-lg"
                />
              </div>
            )}

            <div className="w-full space-y-1">
              <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Public Gallery Link</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={
                    typeof window !== "undefined" && qrAlbum
                      ? `${window.location.origin}/a/${qrAlbum.token}`
                      : ""
                  }
                  className="font-mono text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => qrAlbum && handleCopyLink(qrAlbum)}
                  className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {copiedToken === qrAlbum?.token ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (qrDataUrl && qrAlbum) {
                    downloadFile(qrDataUrl, `${qrAlbum.token}-qr.png`);
                  }
                }}
                className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (qrAlbum) {
                    printBrandedFlyer({
                      title: qrAlbum.title,
                      token: qrAlbum.token,
                      customer_name: qrAlbum.clientName,
                      event_date: qrAlbum.createdDate,
                      pin_set: qrAlbum.pin_set,
                    });
                  }
                }}
                className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Flyer
              </Button>
            </div>
            <Button size="sm" onClick={() => setQrAlbum(null)} className="dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTargetAlbum)}
        onOpenChange={(open) => !open && setDeleteTargetAlbum(null)}
      >
        <DialogContent className="sm:max-w-md dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600">
              Delete Album
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-zinc-200">"{deleteTargetAlbum?.title}"</span>? This will permanently remove the album record and any associated uploaded media.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetAlbum(null)}
              disabled={isDeleting}
              className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteAlbum}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete Album"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
