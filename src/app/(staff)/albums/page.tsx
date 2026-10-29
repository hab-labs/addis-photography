"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImageIcon,
  Lock,
  Unlock,
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
  Share2,
  Sparkles,
  ArrowLeft,
  Users,
  ShieldCheck,
  SlidersHorizontal,
  Eye,
  X,
  Play,
  Upload,
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
import { formatCalendarPair } from "@/lib/date";
import type { Album as StoreAlbum, Customer, PublicPortfolioItem } from "@/types";

type ClientAlbum = StoreAlbum & {
  coverUrl?: string;
  clientName: string;
  mediaCount: number;
  createdDate: string;
  categoryName: string;
  accessPersonsCount: number;
};

const CATEGORY_OPTIONS = [
  "WEDDING COLLECTION",
  "MILESTONE PORTRAITS",
  "FAMILY PORTRAITS",
  "CELEBRATIONS & EVENTS",
  "EDITORIAL & COMMERCIAL",
];

const PORTFOLIO_CATEGORIES = [
  "ALL",
  "PORTRAITS",
  "WEDDINGS",
  "CELEBRATIONS",
  "EDITORIAL",
] as const;

export default function ClientAlbumsPage() {
  const { isAdmin } = useAuth();

  // Mode: "management" (Staff/Admin studio dashboard) vs "public_portfolio" (Public Showcase View)
  const [activeView, setActiveView] = React.useState<"management" | "public_portfolio">("management");

  // Albums & Customers State
  const [albums, setAlbums] = React.useState<ClientAlbum[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("All statuses");
  const [categoryFilter, setCategoryFilter] = React.useState("All categories");

  // Public Portfolio State
  const [portfolioItems, setPortfolioItems] = React.useState<PublicPortfolioItem[]>([]);
  const [portfolioFilter, setPortfolioFilter] = React.useState<string>("ALL");
  const [portfolioQrUrl, setPortfolioQrUrl] = React.useState<string>("");
  const [lightboxItem, setLightboxItem] = React.useState<PublicPortfolioItem | null>(null);

  // Manage Public Album Modal State
  const [isManagePublicOpen, setIsManagePublicOpen] = React.useState(false);
  const [newPostTitle, setNewPostTitle] = React.useState("");
  const [newPostCategory, setNewPostCategory] = React.useState<"PORTRAITS" | "WEDDINGS" | "CELEBRATIONS" | "EDITORIAL">("WEDDINGS");
  const [newPostImageUrl, setNewPostImageUrl] = React.useState("");
  const [newPostCaption, setNewPostCaption] = React.useState("");
  const [selectedFileMeta, setSelectedFileMeta] = React.useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isSavingPost, setIsSavingPost] = React.useState(false);
  const [isPostSuccess, setIsPostSuccess] = React.useState(false);
  const [publicModalNotice, setPublicModalNotice] = React.useState<string | null>(null);
  const [manageTab, setManageTab] = React.useState<"list" | "new">("list");
  const publicFileInputRef = React.useRef<HTMLInputElement>(null);

  // Dedicated Private Album Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("WEDDING COLLECTION");
  const [accessPersons, setAccessPersons] = React.useState<number>(2);
  const [customerId, setCustomerId] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [eventDate, setEventDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [requirePin, setRequirePin] = React.useState(true);
  const [pin, setPin] = React.useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [allowDownload, setAllowDownload] = React.useState(true);
  const [allowZip, setAllowZip] = React.useState(true);
  const [dialogError, setDialogError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Album actions state
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);
  const [copiedPortfolioLink, setCopiedPortfolioLink] = React.useState(false);
  const [qrAlbum, setQrAlbum] = React.useState<ClientAlbum | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");
  const [deleteTargetAlbum, setDeleteTargetAlbum] = React.useState<ClientAlbum | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);

  // Load albums & portfolio data
  const loadAlbums = React.useCallback(() => {
    const rawAlbums = studioStore.getAlbums();
    const mapped: ClientAlbum[] = rawAlbums.map((album: StoreAlbum) => {
      const date = formatCalendarPair(album.created_at || album.event_date);
      const actualMedia = studioStore.getMediaFiles(album.id);
      const count = actualMedia.length > 0 ? actualMedia.length : (album.file_count || 0);

      return {
        ...album,
        clientName: album.customer_name || "Private Client",
        coverUrl: album.cover_image_url || undefined,
        mediaCount: count,
        createdDate: `${date.gregorian}`,
        categoryName: album.category || "WEDDING COLLECTION",
        accessPersonsCount: album.access_persons || 2,
      };
    });
    setAlbums(mapped);
  }, []);

  const loadPortfolio = React.useCallback(async () => {
    try {
      const live = await studioStore.syncPublicPortfolio();
      if (live && live.length > 0) {
        setPortfolioItems(live);
        return;
      }
    } catch {}
    const items = studioStore.getPublicPortfolio();
    setPortfolioItems(items);
  }, []);

  React.useEffect(() => {
    loadAlbums();
    loadPortfolio();
    setCustomers(studioStore.getCustomers());
    studioStore.syncCustomers().then(setCustomers).catch(() => {});
    studioStore.syncAlbums().then(() => loadAlbums()).catch(() => {});
    studioStore.syncPublicPortfolio().then(() => loadPortfolio()).catch(() => {});

    // Generate public showcase QR
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const showcaseUrl = `${origin}/a/portfolio`;
    generateQrPng(showcaseUrl).then(setPortfolioQrUrl).catch(() => {});
  }, [loadAlbums, loadPortfolio]);

  const handleCopyLink = async (album: ClientAlbum) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/a/${album.token}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedToken(album.token);
      setActionNotice(`Copied private gallery link for "${album.title}"`);
      setTimeout(() => setCopiedToken(null), 2500);
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      // Fallback
    }
  };

  const handleCopyPortfolioLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const showcaseUrl = `${origin}/a/portfolio`;
    try {
      await navigator.clipboard.writeText(showcaseUrl);
      setCopiedPortfolioLink(true);
      setActionNotice("Public portfolio link copied to clipboard");
      setTimeout(() => setCopiedPortfolioLink(false), 2500);
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      // Fallback
    }
  };

  const handleOpenQr = async (album: ClientAlbum) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/a/${album.token}`;
    try {
      const dataUrl = await generateQrPng(publicUrl);
      setQrDataUrl(dataUrl);
      setQrAlbum(album);
    } catch (err) {
      console.error("QR generation failed", err);
    }
  };

  const handleExtendRetention = (album: ClientAlbum) => {
    try {
      studioStore.extendAlbumRetention(album.id, 30);
      loadAlbums();
      setActionNotice(`Extended retention for "${album.title}" by +30 days.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      setActionNotice("Could not extend retention.");
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!deleteTargetAlbum) return;
    setIsDeleting(true);
    try {
      const ok = await studioStore.deleteAlbum(deleteTargetAlbum.id);
      if (ok) {
        setAlbums((prev) => prev.filter((a) => a.id !== deleteTargetAlbum.id));
        setDeleteTargetAlbum(null);
        setActionNotice(`Album "${deleteTargetAlbum.title}" deleted.`);
        setTimeout(() => setActionNotice(null), 3500);
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

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || "");
    }
  };

  const handleCreatePrivateGallery = (e: React.FormEvent) => {
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
      setDialogError("Private galleries require a 4 to 6 digit numeric PIN.");
      return;
    }

    try {
      setIsSaving(true);
      const generatedSlug =
        cleanTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "gallery";
      const token = `${generatedSlug}-${Math.random().toString(36).substring(2, 6)}`;

      const created = studioStore.createAlbum({
        title: cleanTitle,
        token,
        customer_id: customerId || undefined,
        customer_name: cleanCustomerName,
        category,
        access_persons: accessPersons,
        cover_image_url:
          coverImageUrl.trim() ||
          "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
        event_date: new Date(eventDate).toISOString(),
        pin: requirePin ? pin : undefined,
        allow_download: allowDownload,
        allow_zip: allowZip,
      });

      loadAlbums();
      setIsCreateOpen(false);
      setTitle("");
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      setCoverImageUrl("");
      setAccessPersons(2);
      setRequirePin(true);
      setPin(Math.floor(1000 + Math.random() * 9000).toString());
      setEventDate(new Date().toISOString().slice(0, 10));

      setActionNotice(`Private Gallery "${created.title}" successfully created.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to create album.");
    } finally {
      setIsSaving(false);
    }
  };

  const processUploadedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPG, PNG, WEBP, or HEIC).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setNewPostImageUrl(compressedDataUrl);
        } else {
          setNewPostImageUrl(rawDataUrl);
        }
        setSelectedFileMeta({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        });
      };
      img.onerror = () => {
        setNewPostImageUrl(rawDataUrl);
        setSelectedFileMeta({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handlePublicFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handlePublicFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleAddPublicPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim()) {
      alert("Please enter a title for the showcase photograph.");
      return;
    }
    if (!newPostImageUrl.trim()) {
      alert("Please upload a photograph for the public showcase.");
      return;
    }

    const postTitle = newPostTitle.trim();
    const tempItem: PublicPortfolioItem = {
      id: `port-${Date.now()}`,
      title: postTitle,
      category: newPostCategory,
      image_url: newPostImageUrl.trim(),
      caption: newPostCaption.trim() || undefined,
      aspect_ratio: "portrait",
      featured: true,
      created_at: new Date().toISOString(),
    };

    // 1. Optimistically update local state immediately so showcase and stats update instantaneously (0ms)
    setPortfolioItems((prev) => [tempItem, ...prev]);

    try {
      setIsSavingPost(true);
      const savedItem = await studioStore.addPublicPortfolioItem({
        title: postTitle,
        category: newPostCategory,
        image_url: newPostImageUrl.trim(),
        caption: newPostCaption.trim() || undefined,
        aspect_ratio: "portrait",
        featured: true,
      });

      // Synchronize with server canonical item
      setPortfolioItems((prev) => [
        savedItem,
        ...prev.filter((p) => p.id !== tempItem.id && p.id !== savedItem.id),
      ]);

      // 2. Show clear confirmation message both on the button and at the top of the dialog
      setIsPostSuccess(true);
      setPublicModalNotice(`"${postTitle}" published successfully to public showcase!`);
      setActionNotice(`"${postTitle}" published live to showcase.`);

      // 3. Clear inputs
      setNewPostTitle("");
      setNewPostImageUrl("");
      setNewPostCaption("");
      setSelectedFileMeta(null);

      // 4. Smoothly switch to showcase list tab after brief visual feedback
      setTimeout(() => {
        setIsPostSuccess(false);
        setManageTab("list");
      }, 700);

      setTimeout(() => {
        setPublicModalNotice(null);
        setActionNotice(null);
      }, 5000);
    } catch {
      // Revert optimistic addition if server fails
      setPortfolioItems((prev) => prev.filter((p) => p.id !== tempItem.id));
      alert("Failed to publish photograph.");
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePublicPost = async (id: string, postTitle: string) => {
    if (!confirm(`Remove "${postTitle}" from the public showcase?`)) return;
    setPortfolioItems((prev) => prev.filter((p) => p.id !== id));
    await studioStore.deletePublicPortfolioItem(id);
    setPublicModalNotice(`Removed "${postTitle}" from public showcase.`);
    setActionNotice(`Removed "${postTitle}" from public showcase.`);
    setTimeout(() => {
      setPublicModalNotice(null);
      setActionNotice(null);
    }, 4000);
  };

  // Filtered Private Albums
  const filteredAlbums = albums.filter((album) => {
    const matchesSearch =
      album.title.toLowerCase().includes(search.toLowerCase()) ||
      album.clientName.toLowerCase().includes(search.toLowerCase()) ||
      album.categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      status === "All statuses" ||
      (status === "Published" && !album.is_locked) ||
      (status === "Private" && album.is_locked);
    const matchesCategory =
      categoryFilter === "All categories" || album.categoryName === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Filtered Portfolio items
  const filteredPortfolio = portfolioItems.filter((item) => {
    if (portfolioFilter === "ALL") return true;
    return item.category === portfolioFilter;
  });

  // Lightbox Navigation
  const lightboxIndex = lightboxItem
    ? filteredPortfolio.findIndex((item) => item.id === lightboxItem.id)
    : -1;

  const handlePrevPhoto = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (filteredPortfolio.length === 0) return;
      const currentIdx = lightboxItem
        ? filteredPortfolio.findIndex((item) => item.id === lightboxItem.id)
        : -1;
      const prevIdx =
        currentIdx <= 0 ? filteredPortfolio.length - 1 : currentIdx - 1;
      setLightboxItem(filteredPortfolio[prevIdx]);
    },
    [filteredPortfolio, lightboxItem]
  );

  const handleNextPhoto = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (filteredPortfolio.length === 0) return;
      const currentIdx = lightboxItem
        ? filteredPortfolio.findIndex((item) => item.id === lightboxItem.id)
        : -1;
      const nextIdx =
        currentIdx === -1 || currentIdx >= filteredPortfolio.length - 1
          ? 0
          : currentIdx + 1;
      setLightboxItem(filteredPortfolio[nextIdx]);
    },
    [filteredPortfolio, lightboxItem]
  );

  React.useEffect(() => {
    if (!lightboxItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevPhoto();
      } else if (e.key === "ArrowRight") {
        handleNextPhoto();
      } else if (e.key === "Escape") {
        setLightboxItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxItem, handlePrevPhoto, handleNextPhoto]);

  // Generate Initials Avatar
  const getInitials = (name: string): string => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || "AP").toUpperCase();
  };

  // =========================================================================
  // VIEW: PUBLIC PORTFOLIO SHOWCASE (Aligned with Dashboard Layout)
  // =========================================================================
  if (activeView === "public_portfolio") {
    return (
      <div className="w-full max-w-[1440px] mx-auto space-y-8 pb-12">
        {/* Page Header aligned like Reports & Albums */}
        <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e21b23] font-mono">
                ADDIS PHOTOGRAPHY STUDIO · PUBLIC SHOWCASE
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Portfolio
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
              Public Portfolio Showcase
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-light">
              Live public showcase of curated client photography and studio portfolio.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPortfolioLink}
              className="border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs h-9 px-3.5 gap-1.5 rounded-xl font-medium"
            >
              {copiedPortfolioLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => setActiveView("management")}
              className="bg-[#e21b23] hover:bg-[#c4161d] text-white text-xs font-semibold h-9 px-4 gap-1.5 rounded-xl shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Studio</span>
            </Button>
          </div>
        </section>

        {/* Hero Section (Screenshot 3) */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-[#121214] via-[#0d0d0f] to-[#09090b] p-6 sm:p-12 lg:p-14 min-h-[440px] flex flex-col justify-between shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="inline-block text-[11px] font-bold tracking-[0.25em] text-[#e21b23] uppercase">
              ADDIS PHOTOGRAPHY STUDIO · PUBLIC SHOWCASE
            </span>

            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal text-white leading-[1.05] tracking-tight">
              Stories shaped <br />
              <span className="italic font-light text-zinc-300">by light.</span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-400 font-light leading-relaxed max-w-xl">
              A living collection of portraits, celebrations, and honest moments from Addis Ababa. Curated with artistic vision and master craft.
            </p>

            <div className="pt-4 flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-serif font-bold text-white tracking-tight">
                {portfolioItems.length}
              </span>
              <span className="text-xs text-zinc-400 font-mono tracking-wider uppercase">
                Curated Photographs
              </span>
            </div>
          </div>

          {/* Featured Image overlay */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 lg:w-3/5 overflow-hidden pointer-events-none opacity-40 sm:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85"
              alt="Featured Story"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121214] via-[#121214]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
          </div>
        </section>

        {/* Share Section (Screenshot 4) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#121214] p-8 sm:p-12 shadow-xl">
          <div className="lg:col-span-7 space-y-5">
            <span className="text-[11px] font-bold tracking-[0.25em] text-slate-500 dark:text-zinc-400 uppercase block font-mono">
              SHARE THE EXPERIENCE
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 dark:text-white tracking-tight font-medium">
              Scan. Discover. Remember.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed font-light">
              Invite customers and guests to explore the studio's public portfolio instantly. No account or PIN is required for this showcase.
            </p>

            <div className="pt-2 max-w-lg">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/90 p-1.5 pl-3.5">
                <span className="text-xs font-mono text-slate-600 dark:text-zinc-400 truncate flex-1">
                  {typeof window !== "undefined" ? `${window.location.origin}/a/portfolio` : "https://addisphotography.et/a/portfolio"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyPortfolioLink}
                  className="h-8 px-3 text-xs text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                <span>Only photos approved for public viewing appear here.</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-xs rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#18181b] p-6 text-center shadow-2xl space-y-4">
              {portfolioQrUrl ? (
                <div className="rounded-xl bg-white p-4 mx-auto w-fit shadow-md">
                  <Image
                    src={portfolioQrUrl}
                    alt="Showcase QR"
                    width={180}
                    height={180}
                    className="rounded"
                  />
                </div>
              ) : (
                <div className="h-44 w-44 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse mx-auto" />
              )}

              <div>
                <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">Scan to view the album</h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Point any phone camera at the QR code</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => portfolioQrUrl && downloadFile(portfolioQrUrl, "addis-studio-portfolio-qr.png")}
                className="w-full border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs h-9 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download QR Code</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Selected Work Masonry Grid (Screenshot 5) */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-zinc-800/80 pb-6">
            <div>
              <span className="text-[11px] font-bold tracking-[0.25em] text-slate-500 dark:text-zinc-400 uppercase block font-mono">
                SELECTED WORK
              </span>
              <h2 className="text-3xl sm:text-5xl font-serif text-slate-900 dark:text-white tracking-tight mt-1 font-medium">
                Made to be felt.
              </h2>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
              {PORTFOLIO_CATEGORIES.map((cat) => {
                const active = portfolioFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setPortfolioFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-[#e21b23] text-white shadow-sm"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Masonry Columns Grid - displays each photo naturally based on its original aspect ratio */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
            {filteredPortfolio.map((item) => (
              <div
                key={item.id}
                onClick={() => setLightboxItem(item)}
                className="mb-6 break-inside-avoid group relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300 hover:border-slate-300 dark:hover:border-zinc-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-auto block object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />

                {/* Dark gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />

                {/* Hover content */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform duration-300 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e21b23]">
                    {item.category}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-medium text-white leading-snug">
                    {item.title}
                  </h3>
                  {item.caption && (
                    <p className="text-xs text-zinc-300 font-light opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lightbox Modal with Forward / Backward Navigation */}
        {lightboxItem && (
          <div
            onClick={() => setLightboxItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in duration-200 select-none"
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxItem(null)}
              aria-label="Close"
              className="absolute top-5 right-5 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Previous Photo Button */}
            {filteredPortfolio.length > 1 && (
              <button
                onClick={handlePrevPhoto}
                aria-label="Previous photograph"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 h-11 w-11 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-2xl"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next Photo Button */}
            {filteredPortfolio.length > 1 && (
              <button
                onClick={handleNextPhoto}
                aria-label="Next photograph"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-50 h-11 w-11 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-2xl"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Center Image Container */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl max-h-[90vh] flex flex-col items-center space-y-3 px-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxItem.image_url}
                alt={lightboxItem.title}
                className="max-h-[78vh] max-w-[85vw] w-auto h-auto rounded-xl object-contain shadow-2xl"
              />
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e21b23]">
                    {lightboxItem.category}
                  </span>
                  {lightboxIndex >= 0 && (
                    <span className="text-[10px] font-mono text-zinc-400 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                      {lightboxIndex + 1} / {filteredPortfolio.length}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-medium text-white">{lightboxItem.title}</h3>
                {lightboxItem.caption && (
                  <p className="text-xs text-zinc-400 max-w-lg mx-auto">{lightboxItem.caption}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: STUDIO ALBUM MANAGEMENT (Screenshots 1 & 2)
  // =========================================================================
  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-10 pb-12">
      {/* Header & Page Title (Screenshot 1) */}
      <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e21b23] font-mono block">
            ALBUM MANAGEMENT
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-slate-900 dark:text-white">
            Stories, curated with intention.
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl font-light">
            One intelligent showcase for your best public work. Private, protected spaces for everyone else.
          </p>
        </div>

        {/* Dedicated Create Private Gallery Button (Red / White / Black format) */}
        <Button
          onClick={() => {
            setDialogError("");
            setIsCreateOpen(true);
          }}
          className="h-11 px-5 gap-2 rounded-xl bg-[#e21b23] hover:bg-[#c4161d] text-white font-semibold text-sm shadow-md transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ Create Private Gallery</span>
        </Button>
      </section>

      {/* Hero Showcase Banner Card (Screenshot 1) */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-[#121214] p-6 sm:p-10 lg:p-12 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left info */}
          <div className="lg:col-span-7 space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e21b23]/15 border border-[#e21b23]/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#e21b23]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>PUBLIC SHOWCASE ALBUM</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif text-white tracking-tight leading-tight font-medium">
              Your living portfolio, <br />
              <span className="italic font-light text-zinc-300">always beautifully current.</span>
            </h2>

            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-light max-w-xl">
              Approved, non-restricted client photographs are gathered automatically into one evolving showcase of your studio's craft.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <span className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
                {portfolioItems.length}
              </span>
              <div className="border-l border-zinc-700 pl-4 space-y-0.5">
                <span className="text-xs text-zinc-300 font-semibold block">Photos in Portfolio</span>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live sync active
                </span>
              </div>
            </div>

            {/* Action Buttons: Red, White, Black (No Golden color!) */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Button
                onClick={() => setActiveView("public_portfolio")}
                className="h-10 px-5 gap-2 rounded-xl bg-[#e21b23] hover:bg-[#c4161d] text-white font-semibold text-xs sm:text-sm shadow-md transition-all"
              >
                <Eye className="h-4 w-4" />
                <span>View Public Portfolio</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsManagePublicOpen(true)}
                className="h-10 px-5 gap-2 rounded-xl border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm transition-all"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Manage Public Album</span>
              </Button>
            </div>
          </div>

          {/* Right Collage Visual (Screenshots 1 & 2) */}
          <div className="lg:col-span-5 relative h-72 sm:h-80 flex items-center justify-center">
            {/* Tilted Layered Cards */}
            <div className="relative w-full max-w-sm h-full flex items-center justify-center">
              {/* Back Card 1 */}
              <div className="absolute w-44 h-56 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700/60 rotate-[-12deg] -translate-x-14 -translate-y-4 transition-transform hover:rotate-[-6deg]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80"
                  alt="Wedding Couple"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Back Card 2 */}
              <div className="absolute w-44 h-56 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700/60 rotate-[14deg] translate-x-16 -translate-y-2 transition-transform hover:rotate-[8deg]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
                  alt="Bridal Cyan"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Center Main Card */}
              <div className="relative z-10 w-52 h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-600 rotate-[-2deg] transition-transform hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80"
                  alt="Bride Veil Black White"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-md text-[10px] font-bold text-white px-2 py-0.5 rounded-full border border-white/10">
                  Featured this week
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Private Galleries Section Header & Filter Bar (Screenshot 2) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e21b23]/10 border border-[#e21b23]/25 text-[#e21b23]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e21b23] font-mono block">
                INVITATION ONLY
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white">
                Private Galleries
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Secure client spaces with intentional, person-level access.
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search private galleries..."
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] pl-10 pr-3 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 outline-none focus:border-[#e21b23] transition"
              />
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] px-3.5 pr-8 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-[#e21b23] transition cursor-pointer"
              >
                <option>All categories</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("All statuses");
                setCategoryFilter("All categories");
              }}
              className="h-10 rounded-xl border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter ({filteredAlbums.length})</span>
            </Button>
          </div>
        </div>

        {/* Private Galleries Grid (Screenshot 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map((album) => {
            const initials = getInitials(album.clientName);
            const personsCount = album.accessPersonsCount || 2;

            return (
              <div
                key={album.id}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800/90 bg-white dark:bg-[#141417] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700"
              >
                {/* Cover Image Container */}
                <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-zinc-950">
                  <Link href={`/albums/${album.id}`} className="block h-full w-full">
                    {album.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 p-4 text-center">
                        <Camera className="h-8 w-8 text-zinc-600 mb-1" />
                        <span className="text-xs text-zinc-400">No cover photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </Link>

                  {/* Badges on Cover Image */}
                  <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#e21b23]" />
                      PRIVATE
                    </span>
                  </div>

                  <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white">
                      <Lock className="h-3.5 w-3.5" />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Album actions"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-colors shadow-sm focus:outline-none"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-800 text-xs"
                      >
                        <DropdownMenuItem
                          className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                          onClick={() => handleCopyLink(album)}
                        >
                          <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
                          <span>{copiedToken === album.token ? "Link Copied!" : "Copy Private Link"}</span>
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

                {/* Card Info Body */}
                <div className="p-5 space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e21b23] block">
                      {album.categoryName}
                    </span>
                    <Link href={`/albums/${album.id}`} className="block">
                      <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white truncate hover:text-[#e21b23] transition-colors">
                        {album.title}
                      </h3>
                    </Link>
                  </div>

                  {/* Restricted Access Avatar Pill (Screenshot 2) */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/80 p-2.5 flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 border-2 border-white dark:border-zinc-900 text-[10px] font-bold text-white shadow-xs">
                        {initials}
                      </div>
                      {personsCount > 1 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e21b23] border-2 border-white dark:border-zinc-900 text-[10px] font-bold text-white shadow-xs">
                          {personsCount > 2 ? `+${personsCount - 1}` : "YA"}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase block">
                        RESTRICTED ACCESS
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        Created for {personsCount} {personsCount === 1 ? "Person" : "Persons"}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom Metadata */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                      {album.mediaCount} {album.mediaCount === 1 ? "photo" : "photos"}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                      {album.createdDate}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAlbums.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] py-16 text-center text-xs text-slate-400 dark:text-zinc-500 space-y-3">
            <FolderPlus className="mx-auto h-8 w-8 text-slate-300 dark:text-zinc-600" />
            <p>No private galleries match your search.</p>
          </div>
        )}
      </section>

      {/* =========================================================================
          MODAL: DEDICATED CREATE PRIVATE GALLERY (Red / White / Black format)
          ========================================================================= */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl dark:bg-[#121214] dark:border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#e21b23]">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">PRIVATE GALLERY SETTINGS</span>
            </div>
            <DialogTitle className="text-xl font-serif font-bold text-slate-900 dark:text-white">
              Create Private Gallery
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Configure a dedicated, password-protected gallery for your client with restricted access controls.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePrivateGallery} className="space-y-4 py-2">
            {dialogError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs font-semibold text-red-500">
                {dialogError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Gallery Title <span className="text-[#e21b23]">*</span>
              </Label>
              <Input
                placeholder="e.g. Liya & Yared Wedding Collection"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 text-xs dark:bg-zinc-900 dark:border-zinc-800 dark:text-white focus-visible:ring-[#e21b23]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Collection Category
                </Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-[#e21b23]"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Created for Persons
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={accessPersons}
                    onChange={(e) => setAccessPersons(Number(e.target.value) || 1)}
                    className="h-10 text-xs dark:bg-zinc-900 dark:border-zinc-800 dark:text-white"
                  />
                  <span className="text-xs text-zinc-400 whitespace-nowrap">Person(s)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Client / Customer Name <span className="text-[#e21b23]">*</span>
                </Label>
                {customers.length > 0 ? (
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-[#e21b23]"
                  >
                    <option value="">-- Choose registered customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || "No phone"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="e.g. Liya Kebede"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 text-xs dark:bg-zinc-900 dark:border-zinc-800 dark:text-white"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Event / Session Date
                </Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="h-10 text-xs dark:bg-zinc-900 dark:border-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* PIN Protection Setting */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#e21b23]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">4-Digit Security PIN</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePin}
                    onChange={(e) => setRequirePin(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e21b23]"></div>
                </label>
              </div>

              {requirePin && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    maxLength={6}
                    placeholder="Enter 4-6 digit numeric PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="h-10 text-xs font-mono tracking-widest text-center bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPin(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="h-10 text-xs border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0"
                  >
                    Randomize
                  </Button>
                </div>
              )}
            </div>

            {/* Download & Zip Access toggles */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 accent-[#e21b23]"
                />
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Allow photo downloads</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowZip}
                  onChange={(e) => setAllowZip(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 accent-[#e21b23]"
                />
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Allow ZIP archive</span>
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSaving}
                className="border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-[#e21b23] hover:bg-[#c4161d] text-white font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Creating Gallery…
                  </>
                ) : (
                  "Create Private Gallery"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: MANAGE PUBLIC ALBUM (Add/Delete Posts for Staff & Admin)
          ========================================================================= */}
      <Dialog open={isManagePublicOpen} onOpenChange={setIsManagePublicOpen}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-[#121214] border-slate-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#e21b23]">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">PUBLIC PORTFOLIO CURATION</span>
            </div>
            <DialogTitle className="text-xl font-serif font-bold text-slate-900 dark:text-white">
              Manage Public Album
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Staff and administrators can curate the living public portfolio showcase by adding or removing photographs.
            </DialogDescription>
          </DialogHeader>

          {/* Manage Tabs */}
          <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 gap-2 pt-2">
            <button
              onClick={() => setManageTab("list")}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                manageTab === "list"
                  ? "border-[#e21b23] text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Current Showcase ({portfolioItems.length})
            </button>
            <button
              onClick={() => setManageTab("new")}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                manageTab === "new"
                  ? "border-[#e21b23] text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              + Add New Photograph
            </button>
          </div>

          {/* In-Modal Success/Action Notification */}
          {publicModalNotice && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-400 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{publicModalNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setPublicModalNotice(null)}
                className="text-emerald-400/70 hover:text-emerald-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {manageTab === "list" ? (
            <div className="space-y-3 py-3">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-[#e21b23] uppercase">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.title}</h4>
                      {item.caption && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-sm">{item.caption}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePublicPost(item.id, item.title)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                    title="Remove from public showcase"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleAddPublicPost} className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Photograph Title *</Label>
                <Input
                  placeholder="e.g. Royal Reception at Sheraton Addis"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="h-10 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Category *</Label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value as any)}
                  className="h-10 w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#e21b23]"
                >
                  <option value="WEDDINGS">WEDDINGS</option>
                  <option value="PORTRAITS">PORTRAITS</option>
                  <option value="CELEBRATIONS">CELEBRATIONS</option>
                  <option value="EDITORIAL">EDITORIAL</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Upload Photograph <span className="text-[#e21b23]">*</span>
                  </Label>
                  {selectedFileMeta && (
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                      {selectedFileMeta.name} ({selectedFileMeta.size})
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={publicFileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handlePublicFileChange}
                  className="hidden"
                />

                {!newPostImageUrl ? (
                  <div
                    onClick={() => publicFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handlePublicFileDrop}
                    className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-2.5 ${
                      isDragging
                        ? "border-[#e21b23] bg-[#e21b23]/10"
                        : "border-slate-300 dark:border-zinc-700 hover:border-[#e21b23] bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e21b23]/15 border border-[#e21b23]/30 text-[#e21b23]">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Click to upload or drag & drop photograph
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        Supports high-resolution JPG, PNG, WEBP, or HEIC (up to 25MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-zinc-950 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newPostImageUrl}
                      alt="Uploaded photograph preview"
                      className="h-52 w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-3.5">
                      <div className="flex justify-between items-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Check className="h-3 w-3" />
                          Ready to Publish
                        </span>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNewPostImageUrl("");
                            setSelectedFileMeta(null);
                          }}
                          className="h-7 w-7 p-0 rounded-full bg-black/60 hover:bg-black/90 text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-300 font-mono truncate max-w-[200px]">
                          {selectedFileMeta?.name || "Uploaded photo"}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => publicFileInputRef.current?.click()}
                          className="h-7 text-xs border-zinc-600 bg-black/60 text-white hover:bg-black/80"
                        >
                          Change Photo
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Caption / Notes</Label>
                <Input
                  placeholder="e.g. Captured with prime 85mm portrait lighting"
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  className="h-10 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManageTab("list")}
                  className="border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingPost || isPostSuccess}
                  className={`font-semibold transition-all ${
                    isPostSuccess
                      ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                      : "bg-[#e21b23] hover:bg-[#c4161d] text-white"
                  }`}
                >
                  {isSavingPost ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Publishing...
                    </span>
                  ) : isPostSuccess ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Published Live!
                    </span>
                  ) : (
                    "Publish to Showcase"
                  )}
                </Button>
              </div>
            </form>
          )}

          <DialogFooter className="pt-3 border-t border-slate-200 dark:border-zinc-800">
            <Button
              size="sm"
              onClick={() => setIsManagePublicOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-medium"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
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
