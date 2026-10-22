"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  FileImage,
  Video,
  QrCode,
  Copy,
  Download,
  Printer,
  ExternalLink,
  Check,
  CalendarPlus,
  HardDrive,
  Trash2,
  Image as ImageIcon,
  Play,
  Lock,
  Unlock,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { studioStore } from "@/lib/api/store";
import { formatCalendarPair } from "@/lib/date";
import {
  ChunkUploader,
  UploadItem,
  isFileSupported,
} from "@/lib/uploader/chunkUploader";
import { generateQrPng, downloadFile, printBrandedFlyer } from "@/lib/qr";
import { MediaFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AlbumDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin } = useAuth();
  const albumId = (params?.id as string) || "";

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeUploads, setActiveUploads] = useState<UploadItem[]>([]);
  const [qrPngUrl, setQrPngUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Album Deletion State for Admins
  const [deleteAlbumModalOpen, setDeleteAlbumModalOpen] = useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);

  // Access & sharing state
  const [accessMode, setAccessMode] = useState<"public" | "private">("public");
  const [allowDownload, setAllowDownload] = useState(true);
  const [accessPin, setAccessPin] = useState("");
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [newPinInput, setNewPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Media selection & actions
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [isExtending, setIsExtending] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Lightbox preview
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploaderRef = useRef<ChunkUploader | null>(null);

  const album = useMemo(() => {
    return studioStore.getAlbumById(albumId);
  }, [albumId, refreshTrigger]);

  const mediaFiles = useMemo(() => {
    return studioStore.getMediaFiles(albumId);
  }, [albumId, refreshTrigger]);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // Sync albums & media from server on mount
  useEffect(() => {
    studioStore
      .syncAlbums()
      .then(() => setRefreshTrigger((c) => c + 1))
      .catch(() => {});

    studioStore
      .syncMediaFiles(albumId)
      .then(() => setRefreshTrigger((c) => c + 1))
      .catch(() => {});
  }, [albumId]);

  // Sync component state when album loads
  useEffect(() => {
    if (album) {
      setAccessMode(album.is_locked ? "private" : "public");
      setAllowDownload(album.allow_download ?? true);
      const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/a/${album.token}`;
      generateQrPng(publicUrl).then(setQrPngUrl);

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(`addis_album_pin_${album.token}`);
        if (stored) setAccessPin(stored);
      }
    }
  }, [album]);

  // Initialize Chunked Uploader instance
  useEffect(() => {
    const uploader = new ChunkUploader((items) => {
      setActiveUploads([...items]);
      const currentFiles = studioStore.getMediaFiles(albumId);

      items.forEach((item) => {
        if (item.status === "completed" && !currentFiles.some((m) => m.filename === item.filename)) {
          const isVideo = item.filename.endsWith(".mp4") || item.filename.endsWith(".mov");
          const serverMedia = (item as any).serverMedia;
          const newMedia: MediaFile = {
            id: serverMedia?.id || `med-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            album_id: albumId,
            filename: item.filename,
            file_size: item.totalSize,
            mime_type: item.file.type || (isVideo ? "video/mp4" : "image/jpeg"),
            url: serverMedia?.path_web || serverMedia?.url || URL.createObjectURL(item.file),
            thumbnail_url: isVideo
              ? (serverMedia?.path_thumb || serverMedia?.thumbnail_url || undefined)
              : (serverMedia?.path_thumb || serverMedia?.thumbnail_url || serverMedia?.path_web || serverMedia?.url || URL.createObjectURL(item.file)),
            upload_status: "completed",
            created_at: new Date().toISOString(),
          };
          studioStore.addMediaFile(albumId, newMedia);
          setRefreshTrigger((c) => c + 1);

          // Synchronize album metrics and media from server
          studioStore.syncAlbums().catch(() => {});
          studioStore.syncMediaFiles(albumId).catch(() => {});
        }
      });
    });

    uploaderRef.current = uploader;
  }, [albumId]);

  if (!album) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Album Not Found</h2>
        <Link href="/albums">
          <Button variant="outline">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Albums
          </Button>
        </Link>
      </div>
    );
  }

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/a/${album.token}`;
  const usedMB = (album.used_bytes / (1024 * 1024)).toFixed(1);
  const totalGB = Math.max(1, Math.round(album.quota_bytes / (1024 * 1024 * 1024)));
  const percentUsed = Math.min(
    100,
    Math.round((album.used_bytes / album.quota_bytes) * 100)
  );

  const isExpired = new Date(album.expires_at).getTime() < Date.now();
  const photoCount = mediaFiles.filter((m) => !m.mime_type.startsWith("video")).length;
  const videoCount = mediaFiles.filter((m) => m.mime_type.startsWith("video")).length;

  // Handlers
  const handleDeleteAlbum = async () => {
    setIsDeletingAlbum(true);
    try {
      const ok = await studioStore.deleteAlbum(album.id);
      if (ok) {
        router.push("/albums");
      } else {
        showNotification("Failed to delete album. Please ensure administrator privileges.");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to delete album.");
    } finally {
      setIsDeletingAlbum(false);
      setDeleteAlbumModalOpen(false);
    }
  };

  const handleExtendRetention = async () => {
    setIsExtending(true);
    try {
      studioStore.extendAlbumRetention(album.id, 30);
      setRefreshTrigger((c) => c + 1);
      showNotification("Album retention extended by +30 days.");
    } catch {
      showNotification("Could not extend retention.");
    } finally {
      setIsExtending(false);
    }
  };

  const handleVisibilityChange = (mode: "public" | "private") => {
    if (mode === "private" && !album.pin_set && !accessPin) {
      setChangePinOpen(true);
      return;
    }
    try {
      studioStore.updateAlbumAccess(album.id, {
        isPrivate: mode === "private",
        pin: accessPin || undefined,
        allow_download: allowDownload,
      });
      setAccessMode(mode);
      setRefreshTrigger((c) => c + 1);
      showNotification(mode === "private" ? "Album set to Private" : "Album set to Public");
    } catch (err: any) {
      showNotification(err.message || "Failed to change visibility");
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    if (!/^\d{4,6}$/.test(newPinInput)) {
      setPinError("PIN must contain 4 to 6 numeric digits.");
      return;
    }

    try {
      studioStore.updateAlbumAccess(album.id, {
        isPrivate: true,
        pin: newPinInput,
        allow_download: allowDownload,
      });
      setAccessMode("private");
      setAccessPin(newPinInput);
      setChangePinOpen(false);
      setNewPinInput("");
      setRefreshTrigger((c) => c + 1);
      showNotification("Album PIN updated successfully.");
    } catch (err: any) {
      setPinError(err.message || "Failed to update PIN");
    }
  };

  const handleToggleDownload = (allowed: boolean) => {
    try {
      studioStore.updateAlbumAccess(album.id, {
        isPrivate: accessMode === "private",
        pin: accessPin || undefined,
        allow_download: allowed,
      });
      setAllowDownload(allowed);
      setRefreshTrigger((c) => c + 1);
      showNotification(allowed ? "Guest downloads allowed" : "Guest downloads disabled");
    } catch (err: any) {
      showNotification(err.message || "Failed to update downloads");
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    showNotification("Public gallery link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadQrPng = () => {
    if (qrPngUrl) {
      downloadFile(qrPngUrl, `${album.token}-qr.png`);
      showNotification("QR Code PNG downloaded");
    }
  };

  const printPdfFlyer = () => {
    printBrandedFlyer({
      title: album.title,
      token: album.token,
      customer_name: album.customer_name,
      event_date: album.event_date,
      pin_set: album.pin_set || Boolean(accessPin),
    });
  };

  // Media Dropzone & files
  const handleFilesChosen = (files: FileList | null) => {
    if (!files || files.length === 0 || !uploaderRef.current) return;

    const fileArray: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (isFileSupported(f)) {
        fileArray.push(f);
      } else {
        alert(`File ${f.name} is not supported. Use JPG, PNG, HEIC, MP4, or MOV.`);
      }
    }

    if (fileArray.length > 0) {
      uploaderRef.current.addFiles(fileArray, album.id, {
        title: album.title,
        token: album.token,
        customer_name: album.customer_name,
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFilesChosen(e.dataTransfer.files);
  };

  // Selection handlers
  const handleToggleSelect = (mediaId: string) => {
    setSelectedMediaIds((prev) => {
      const next = new Set(prev);
      if (next.has(mediaId)) {
        next.delete(mediaId);
      } else {
        next.add(mediaId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedMediaIds.size === mediaFiles.length) {
      setSelectedMediaIds(new Set());
    } else {
      setSelectedMediaIds(new Set(mediaFiles.map((m) => m.id)));
    }
  };

  const handleDeleteSelectedMedia = async () => {
    if (selectedMediaIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedMediaIds.size} selected item(s)?`)) return;

    setIsDeletingMedia(true);
    try {
      for (const id of Array.from(selectedMediaIds)) {
        await studioStore.deleteMediaFile(album.id, id);
      }
      setSelectedMediaIds(new Set());
      setRefreshTrigger((c) => c + 1);
      showNotification("Selected media files deleted.");
    } catch {
      showNotification("Could not delete selected media.");
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleSetCoverFromSelection = () => {
    if (selectedMediaIds.size !== 1) return;
    const mediaId = Array.from(selectedMediaIds)[0];
    const item = mediaFiles.find((m) => m.id === mediaId);
    if (!item) return;

    studioStore.setAlbumCover(album.id, item.url);
    setSelectedMediaIds(new Set());
    setRefreshTrigger((c) => c + 1);
    showNotification("Album cover image updated.");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Back link */}
      <div>
        <Link
          href="/albums"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#e21b23] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to albums</span>
        </Link>
      </div>

      {/* Wireframe 6.9 - Section 1: Album Details & Status Card */}
      <Card className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Album:
            </span>
            <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              {album.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Status:</span>
            <Badge
              className={
                isExpired
                  ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border-0 text-xs font-bold"
                  : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border-0 text-xs font-bold"
              }
            >
              {isExpired ? "Expired" : "Active"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-600 dark:text-zinc-300">
            <div>
              <span className="font-semibold text-slate-900 dark:text-zinc-100">Customer: </span>
              <span>{album.customer_name}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-zinc-100">Event: </span>
              <span>{formatCalendarPair(album.event_date).gregorian}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center sm:justify-end gap-2 text-slate-600 dark:text-zinc-300">
            <div>
              <span className="font-semibold text-slate-900 dark:text-zinc-100">Expires: </span>
              <span className="font-mono text-slate-700 dark:text-zinc-300">
                {formatCalendarPair(album.expires_at).gregorian}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExtendRetention}
              disabled={isExtending}
              className="h-7 px-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-[#e21b23] transition-colors"
            >
              <CalendarPlus className="mr-1 h-3.5 w-3.5 text-[#e21b23]" />
              {isExtending ? "Extending…" : "[Extend]"}
            </Button>

            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteAlbumModalOpen(true)}
                className="h-7 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete Album
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Wireframe 6.9 - Section 2: Visibility, Downloads, Link & QR Card */}
      <Card className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          {/* Left Column: Visibility, Downloads, Link, Export Buttons */}
          <div className="flex-1 space-y-4 w-full">
            {/* Visibility: ( ) Public  (•) Private  PIN: •••• [Change PIN] */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="font-bold text-slate-700 dark:text-zinc-300">Visibility:</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-zinc-200">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={accessMode === "public"}
                  onChange={() => handleVisibilityChange("public")}
                  className="h-3.5 w-3.5 text-[#e21b23] focus:ring-[#e21b23]"
                />
                <span>Public</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-zinc-200">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={accessMode === "private"}
                  onChange={() => handleVisibilityChange("private")}
                  className="h-3.5 w-3.5 text-[#e21b23] focus:ring-[#e21b23]"
                />
                <span>Private</span>
              </label>

              {accessMode === "private" && (
                <div className="inline-flex items-center gap-2 ml-2 pl-3 border-l border-slate-200 dark:border-zinc-700">
                  <span className="font-mono text-slate-700 dark:text-zinc-300 font-bold">
                    PIN: {album.pin_set ? "••••" : (accessPin || "••••")}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewPinInput("");
                      setPinError("");
                      setChangePinOpen(true);
                    }}
                    className="h-6 px-2 text-[11px] font-semibold text-slate-700 dark:text-zinc-200 border-slate-300 dark:border-zinc-700 hover:text-[#e21b23]"
                  >
                    [Change PIN]
                  </Button>
                </div>
              )}
            </div>

            {/* Downloads: [✓] Allowed */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Downloads:</span>
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => handleToggleDownload(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#e21b23] focus:ring-[#e21b23]"
                />
                <span>Allowed</span>
              </label>
              <span className="text-[11px] text-slate-400">
                ({allowDownload ? "Visitors can download photos/videos" : "Downloads locked for viewers"})
              </span>
            </div>

            {/* Link: https://... [Copy] */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 shrink-0">Link:</span>
              <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 truncate max-w-[260px] sm:max-w-md">
                {publicUrl}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={copyPublicLink}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                {copiedLink ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    [Copy]
                  </>
                )}
              </Button>
              <Link href={`/a/${album.token}`} target="_blank">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#e21b23] hover:text-[#c9151c]">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Preview
                </Button>
              </Link>
            </div>

            {/* Download QR: [PNG] | [PDF] */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="font-bold text-slate-700">Download QR:</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadQrPng}
                  className="h-7 px-3 text-xs font-semibold"
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  PNG
                </Button>
                <span className="text-slate-300 font-bold">|</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={printPdfFlyer}
                  className="h-7 px-3 text-xs font-semibold text-[#e21b23] border-red-200 hover:bg-red-50"
                >
                  <Printer className="mr-1 h-3.5 w-3.5" />
                  PDF (Flyer)
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Inline QR Code Box */}
          <div className="flex flex-col items-center justify-center shrink-0 self-center md:self-start rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
              {qrPngUrl ? (
                <img
                  src={qrPngUrl}
                  alt="Album QR Code"
                  className="w-32 h-32 object-contain"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                  <QrCode className="h-10 w-10 animate-pulse" />
                </div>
              )}
            </div>
            <span className="mt-1.5 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
              QR Code
            </span>
          </div>
        </div>
      </Card>

      {/* Wireframe 6.9 - Section 3: Upload Box & Progress */}
      <Card className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Upload:</span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col sm:flex-row items-center justify-center sm:justify-between rounded-xl border-2 border-dashed p-6 text-center sm:text-left transition-colors ${
            dragOver
              ? "border-[#e21b23] bg-red-50/50 dark:bg-red-950/20"
              : "border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-600 bg-slate-50/60 dark:bg-zinc-900/40"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFilesChosen(e.target.files)}
            multiple
            accept=".jpg,.jpeg,.png,.heic,.mp4,.mov"
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-[#e21b23]">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                [ Drag photos and videos here or Browse ]
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Supports JPG, PNG, HEIC, MP4, MOV. Chunked 5MB uploads with auto-resume.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-3 sm:mt-0 bg-[#e21b23] hover:bg-[#c9151c] text-white text-xs font-semibold"
          >
            Browse
          </Button>
        </div>

        {/* Live Uploads Queue: IMG_001.jpg done, VID_02.mp4 62% */}
        {activeUploads.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Live Upload Queue ({activeUploads.length})
            </p>
            {activeUploads.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-xs">
                  <div className="flex flex-col gap-0.5 truncate max-w-sm">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{item.filename}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({(item.totalSize / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                    {item.status === "error" && item.errorMessage && (
                      <span className="text-[10px] text-red-500 font-medium truncate" title={item.errorMessage}>
                        {item.errorMessage}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-72">
                    <Progress value={item.progressPercent} className="h-2 flex-1" />
                    <span className={`text-[11px] font-mono font-semibold shrink-0 ${item.status === "error" ? "text-red-600" : ""}`}>
                      {item.status === "completed"
                        ? "done"
                        : `${item.progressPercent}% (${item.status})`}
                    </span>
                    {item.status === "error" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          uploaderRef.current?.retryUpload(item.id);
                        }}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>

            ))}
          </div>
        )}
      </Card>

      {/* Wireframe 6.9 - Section 4: Storage & Files & Thumbnail Grid */}
      <Card className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-5 shadow-sm space-y-4">
        {/* Header: Storage: 412 MB of 1 GB    Files: 236 photos · 4 videos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
            <div>
              <span className="font-bold text-slate-700 dark:text-zinc-300">Storage: </span>
              <span className="font-semibold text-slate-900 dark:text-zinc-100 font-mono">
                {usedMB} MB of {totalGB} GB
              </span>
              <span className="text-slate-400 ml-1">({percentUsed}%)</span>
            </div>
            <div>
              <span className="font-bold text-slate-700 dark:text-zinc-300">Files: </span>
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                {photoCount} {photoCount === 1 ? "photo" : "photos"} · {videoCount} {videoCount === 1 ? "video" : "videos"}
              </span>
            </div>
          </div>

          {/* Actions: select, delete, set cover */}
          <div className="flex items-center gap-2">
            {selectedMediaIds.size > 0 && (
              <>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  {selectedMediaIds.size} selected
                </span>
                {selectedMediaIds.size === 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSetCoverFromSelection}
                    className="h-7 px-2.5 text-xs text-slate-700 dark:text-zinc-200 hover:text-[#e21b23] border-slate-300 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <ImageIcon className="mr-1 h-3.5 w-3.5" />
                    Set cover
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteSelectedMedia}
                  disabled={isDeletingMedia}
                  className="h-7 px-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  {isDeletingMedia ? "Deleting…" : `Delete (${selectedMediaIds.size})`}
                </Button>
              </>
            )}
            {mediaFiles.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleSelectAll}
                className="h-7 px-2 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
              >
                {selectedMediaIds.size === mediaFiles.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </div>

        {/* Storage Bar Indicator */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              percentUsed > 80 ? "bg-rose-500" : "bg-[#e21b23]"
            }`}
            style={{ width: `${Math.max(percentUsed, 1)}%` }}
          />
        </div>

        {/* Thumbnail Grid: select, delete, set cover */}
        {mediaFiles.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No media files uploaded yet. Drag files into the upload box above.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
            {mediaFiles.map((media) => {
              const isVideo = media.mime_type.startsWith("video");
              const isCover = album.cover_image_url === media.url;
              const isSelected = selectedMediaIds.has(media.id);
              const sizeMB = (media.file_size / (1024 * 1024)).toFixed(1);

              return (
                <div
                  key={media.id}
                  onClick={() => handleToggleSelect(media.id)}
                  className={`group relative rounded-xl border overflow-hidden cursor-pointer bg-white dark:bg-[#18181b] transition-all ${
                    isSelected
                      ? "border-[#e21b23] ring-2 ring-[#e21b23]/30 shadow-md"
                      : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-sm"
                  }`}
                >
                  {/* Thumbnail Image Container */}
                  <div className="relative aspect-square bg-slate-950 overflow-hidden flex items-center justify-center">
                    <img
                      src={media.thumbnail_url || media.url}
                      alt={media.filename}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.opacity = "0.3";
                      }}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {isVideo && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="h-9 w-9 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
                          <Play className="h-4 w-4 fill-slate-900 ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent onClick
                        className="h-4 w-4 rounded border-slate-300 dark:border-zinc-600 text-[#e21b23] focus:ring-[#e21b23]"
                      />
                    </div>

                    {/* Badges: Cover / Video */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                      {isCover && (
                        <Badge className="bg-[#e21b23] text-white border-0 text-[9px] px-1.5 py-0 font-bold uppercase shadow">
                          Cover
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-black/60 text-white border-0 text-[9px] px-1.5 py-0 font-bold">
                        {isVideo ? "VIDEO" : "PHOTO"}
                      </Badge>
                    </div>

                    {/* Preview Button on Hover */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewMedia(media);
                      }}
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-white"
                    >
                      <span className="text-[10px] font-medium truncate max-w-[100px]">
                        Preview
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Metadata & Quick Actions */}
                  <div className="p-2 text-xs">
                    <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate" title={media.filename}>
                      {media.filename}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span>{sizeMB} MB</span>
                      {!isCover && !isVideo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            studioStore.setAlbumCover(album.id, media.url);
                            setRefreshTrigger((c) => c + 1);
                            showNotification("Cover image set");
                          }}
                          className="hover:text-[#e21b23] font-medium"
                        >
                          Set cover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Change PIN Modal Dialog */}
      <Dialog open={changePinOpen} onOpenChange={setChangePinOpen}>
        <DialogContent className="max-w-sm bg-white dark:bg-[#141417] border-slate-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#e21b23]" />
              <span>Change Album PIN</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Set a 4 to 6 numeric digit PIN to protect "{album.title}".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePin} className="space-y-4 pt-2">
            <div>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="4 to 6 digit PIN (e.g. 1234)"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                className="text-center font-mono text-lg tracking-widest bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                autoFocus
                required
              />
              {pinError && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{pinError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangePinOpen(false)}
                className="border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#e21b23] hover:bg-[#c9151c] text-white"
              >
                Save PIN
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Media Lightbox Preview Dialog */}
      <Dialog open={Boolean(previewMedia)} onOpenChange={(open) => !open && setPreviewMedia(null)}>
        <DialogContent className="max-w-3xl p-2 bg-slate-950 border-slate-800 text-white">
          <div className="relative flex flex-col items-center justify-center">
            {previewMedia?.mime_type.startsWith("video") ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                className="max-h-[75vh] w-full rounded object-contain"
              />
            ) : (
              <img
                src={previewMedia?.url}
                alt={previewMedia?.filename || "Media preview"}
                className="max-h-[75vh] w-full rounded object-contain"
              />
            )}
            <div className="w-full flex items-center justify-between p-2 text-xs text-slate-400">
              <span className="font-semibold text-white">{previewMedia?.filename}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewMedia(null)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Album Modal Dialog for Admins */}
      <Dialog open={deleteAlbumModalOpen} onOpenChange={setDeleteAlbumModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141417] border-slate-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>Delete Album</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 pt-1">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-zinc-200">"{album.title}"</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 dark:text-zinc-400 space-y-2">
            <p>
              This will permanently remove the album record, unlock sessions, and all associated media files ({mediaFiles.length} uploaded files).
            </p>
            <p className="font-semibold text-rose-600">
              This action cannot be undone.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteAlbumModalOpen(false)}
              disabled={isDeletingAlbum}
              className="border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteAlbum}
              disabled={isDeletingAlbum}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeletingAlbum ? (
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

      {/* Floating Action Notice Banner */}
      {actionNotice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}
    </div>
  );
}
