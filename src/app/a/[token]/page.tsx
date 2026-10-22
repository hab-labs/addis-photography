"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Lock,
  Share2,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Camera,
  Eye,
  ShieldAlert,
  Check,
  Globe,
  Download,
  Phone,
  MapPin,
} from "lucide-react";
import { studioStore } from "@/lib/api/store";
import { formatCalendarPair } from "@/lib/date";
import { useI18n } from "@/lib/i18n/context";
import { MediaFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PublicAlbumViewerPage() {

  const params = useParams();
  const token = (params?.token as string) || "";
  const { locale, setLocale, t } = useI18n();

  const [album, setAlbum] = useState<any>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // PIN Lock & Rate Limiting state
  const [pinInput, setPinInput] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [pinError, setPinError] = useState("");

  // Lightbox viewer state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch album from server with local store fallback
  const fetchAlbumData = useCallback(async () => {
    try {
      const res = await fetch(`/api/a/${token}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "unlocked" || data.status === "active") {
          setAlbum(data.album);
          setMediaFiles(data.media || []);
          setIsUnlocked(true);
          return;
        } else if (data.status === "locked") {
          setAlbum(data.album);
          setIsUnlocked(false);
          return;
        } else if (data.status === "expired") {
          setAlbum({ ...(data.album || {}), status: "Expired", is_expired: true });
          setIsUnlocked(false);
          return;
        }
      }
    } catch {
      // Network or SSR fallback
    }

    // Fallback to store
    const alb = studioStore.getAlbumByToken(token);
    if (alb) {
      setAlbum(alb);
      setMediaFiles(studioStore.getMediaFiles(alb.id));

      const unlockedSession = typeof window !== "undefined" ? sessionStorage.getItem(`album_unlocked_${alb.token}`) : null;
      if (!alb.is_locked || unlockedSession === "true") {
        setIsUnlocked(true);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchAlbumData().finally(() => setIsLoading(false));
  }, [fetchAlbumData]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  // Handle PIN Unlock via server-authoritative API
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setPinError("");
    if (!/^\d{4,6}$/.test(pinInput)) {
      setPinError("PIN must contain 4 to 6 digits.");
      return;
    }

    try {
      const res = await fetch(`/api/a/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsUnlocked(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`album_unlocked_${token}`, "true");
        }
        setPinInput("");
        await fetchAlbumData();
        return;
      }

      if (data.retryAfterSeconds) {
        setLockoutSeconds(data.retryAfterSeconds);
        setPinError(`Too many incorrect attempts. Please wait ${data.retryAfterSeconds} seconds.`);
        setPinInput("");
        return;
      }

      if (data.error) {
        setPinError(data.error);
        setPinInput("");
        return;
      }
    } catch {
      // Fallback to local check
    }

    const storedPin = typeof window !== "undefined" ? localStorage.getItem(`addis_album_pin_${album?.token}`) : null;

    if (storedPin && pinInput === storedPin) {
      setIsUnlocked(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`album_unlocked_${album?.token}`, "true");
      }
      setFailedAttempts(0);
    } else {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      if (nextFailures >= 5) {
        setLockoutSeconds(900); // 15 minutes lockout per Section 7
        setPinError("Too many incorrect attempts. Locked out for 15 minutes.");
      } else {
        setPinError(`Incorrect PIN. ${5 - nextFailures} attempts remaining.`);
      }
      setPinInput("");
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const prevPhoto = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const nextPhoto = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null && prev < mediaFiles.length - 1 ? prev + 1 : prev
    );
  }, [mediaFiles.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        prevPhoto();
      } else if (e.key === "ArrowRight") {
        nextPhoto();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto]);

  // Share gallery
  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: album?.title || "Addis Photography Gallery",
          url: window.location.href,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // User cancelled share dialog or clipboard error
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-center text-slate-400">
        <div className="space-y-3">
          <Camera className="mx-auto h-10 w-10 animate-pulse text-amber-500" />
          <p className="text-sm">Loading your private gallery…</p>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-center text-white">
        <div className="space-y-3">
          <Camera className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="text-xl font-bold">Album Not Found</h2>
          <p className="text-xs text-slate-400">
            This album link might have expired or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const isExpired =
    album &&
    (album.status === "Expired" ||
      album.status === "Deleted" ||
      album.is_expired ||
      (album.expires_at && new Date(album.expires_at).getTime() < Date.now()));

  if (isExpired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-black">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur text-center space-y-6">
          {/* Studio Logo */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0b0b0b] p-2 shadow-xl ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/addis-photography-logo.png"
              alt="Addis Photography logo"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Gallery Expired</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {t.public_viewer?.expired_title || "This Gallery is No Longer Available"}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {t.public_viewer?.expired_desc ||
                "This private gallery has reached its retention expiry date or has been archived by Addis Photography Studio."}
            </p>
            <p className="text-xs text-slate-400">
              {t.public_viewer?.expired_contact ||
                "If you are the client and need to retrieve your photos or request an extension, please contact our studio desk."}
            </p>
          </div>

          {/* Contact Details Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left space-y-3 text-xs">
            <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
              Studio Contact Information
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <Phone className="h-4 w-4 text-amber-500 shrink-0" />
              <a
                href="tel:+251973679744"
                className="font-mono hover:text-amber-400 transition"
              >
                +251 973 679 744
              </a>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Tsinat Building, Jimma, Ethiopia</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
            {t.public_viewer?.studio_brand || "Captured with love by Addis Photography Studio"}
          </div>
        </div>
      </div>
    );
  }

  // 1. PIN Lock Screen View
  if (!isUnlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-black">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur text-center space-y-5">
          {/* Wireframe 6.10: [Studio logo] */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0b0b0b] p-2 shadow-xl ring-1 ring-white/10">
            <img
              src="/addis-photography-logo.png"
              alt="Addis Photography logo"
              className="h-full w-full object-contain"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">{album.title}</h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              This album is private
            </p>
          </div>

          {pinError && (
            <div
              role="alert"
              className="rounded-lg bg-red-950/70 border border-red-500/40 p-3 text-xs text-red-300"
            >
              {pinError}
            </div>
          )}

          {lockoutSeconds > 0 ? (
            <div className="py-4 space-y-2">
              <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto animate-pulse" />
              <p className="text-xs text-amber-400 font-semibold">
                Rate Limit Active: Try again in {lockoutSeconds}s
              </p>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="text-center font-mono text-lg tracking-widest bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-[#e21b23] focus-visible:border-[#e21b23] h-11"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-bold bg-[#e21b23] hover:bg-[#c9151c] text-white shadow-lg transition-all active:scale-[0.98]"
              >
                Open
              </Button>
            </form>
          )}

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
            PIN provided by Addis Photography Studio.
          </div>
        </div>
      </div>
    );
  }

  // 2. Unlocked Public Album Gallery View
  const currentMedia = lightboxIndex !== null ? mediaFiles[lightboxIndex] : null;
  const eventDate = formatCalendarPair(album.event_date);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-12">
      {/* Cover Banner */}
      <header className="relative w-full h-80 sm:h-96 bg-slate-900 overflow-hidden flex items-end">
        {album.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.cover_image_url}
            alt={album.title}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}

            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-amber-950" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* Studio Brand Watermark */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/addis-photography-logo.png"
            alt=""
            className="h-5 w-5 rounded object-contain"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Addis Photography
          </span>
        </div>

        {/* Top Right Actions: Language Switcher + Share */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "am" : "en")}
            className="inline-flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-slate-200 transition"
            aria-label="Switch language"
          >
            <Globe className="h-3.5 w-3.5 text-amber-400" />
            <span>{locale === "en" ? "አማርኛ" : "English"}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-slate-200 transition"
            aria-label="Share album"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>

        {/* Album Meta */}
        <div className="relative z-10 w-full p-6 sm:p-10 max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              {album.title}
            </h1>
            <p className="text-sm sm:text-base font-medium text-amber-400 mt-1">
              {album.customer_name} • {eventDate.gregorian} • {eventDate.ethiopian} EC
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {mediaFiles.length} Photos & Videos
            </p>
          </div>

          {album.allow_download ? (
            <div className="flex flex-wrap items-center gap-2">
              {(album.allow_zip ?? true) && (
                <a
                  href={`/api/a/${album.token || token}/download`}
                  download={`${(album.title || "Addis_Photography_Album").replace(/[^a-zA-Z0-9_\-]/g, "_")}.zip`}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="h-4 w-4" />
                  <span>{t.public_viewer?.download_all_zip || "Download All Photos (ZIP)"}</span>
                </a>
              )}
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-300">
                <Check className="h-4 w-4 text-emerald-400" />
                {album.allow_zip ? "Downloads enabled" : "Single photo downloads enabled"}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-slate-300">
              <Eye className="h-4 w-4 text-amber-400" />
              View only · Downloads disabled
            </span>
          )}
        </div>
      </header>

      {/* Media Grid (Lazy-Loaded, Mobile-First) */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8">
        {mediaFiles.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            Photos are currently being processed by the studio. Please check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {mediaFiles.map((media, idx) => {
              const mime = media?.mime_type || "";
              const fn = media?.filename || "";
              const isVideo = mime.startsWith("video") || fn.toLowerCase().endsWith(".mp4") || fn.toLowerCase().endsWith(".mov");

              return (
                <div
                  key={media.id}
                  onClick={() => openLightbox(idx)}
                  className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden cursor-pointer ring-1 ring-white/10 hover:ring-amber-500/50 transition-all duration-300"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.thumbnail_url || media.url}
                    alt={media.filename}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {isVideo && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                        <Play className="h-6 w-6 fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 text-xs">
                    <span className="truncate text-slate-200 max-w-[65%]">{media.filename}</span>
                    <div className="flex items-center gap-1.5">
                      {album.allow_download && (
                        <a
                          href={`/api/a/${album.token || token}/media/${media.id}/download`}
                          download={media.filename}
                          onClick={(e) => e.stopPropagation()}
                          title="Download photo"
                          className="p-1.5 rounded-full bg-black/60 hover:bg-emerald-600 text-white transition backdrop-blur shadow"
                          aria-label={`Download ${media.filename}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <div className="p-1.5 rounded-full bg-black/60 text-amber-400 backdrop-blur shadow">
                        <Eye className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox Swipe / Fullscreen Modal */}
      {lightboxIndex !== null && currentMedia && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between z-20 text-white">
            <span className="text-xs font-mono text-slate-400">
              {lightboxIndex + 1} / {mediaFiles.length}
            </span>

            <div className="flex items-center space-x-3">
              {album.allow_download && (
                <a
                  href={`/api/a/${album.token || token}/media/${currentMedia.id}/download`}
                  download={currentMedia.filename}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white transition inline-flex items-center gap-1.5 text-xs font-semibold shadow-lg shadow-emerald-950/40"
                  aria-label="Download media"
                >
                  <Download className="h-4 w-4 text-white" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              )}
              <button
                type="button"
                onClick={closeLightbox}
                aria-label="Close photo viewer"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Center Image / Video Viewer */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
            {((currentMedia?.mime_type || "")).startsWith("video") || (currentMedia?.filename || "").toLowerCase().endsWith(".mp4") ? (
              <video
                src={currentMedia.url}
                controls
                autoPlay
                playsInline
                poster={currentMedia.thumbnail_url}
                className="max-h-full max-w-full rounded-lg shadow-2xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentMedia.url}
                alt={currentMedia.filename}
                onError={(e) => {
                  e.currentTarget.style.opacity = "0.5";
                }}
                className="max-h-full max-w-full object-contain select-none shadow-2xl"
              />
            )}

            {/* Navigation Arrows */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={prevPhoto}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition backdrop-blur z-20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {lightboxIndex < mediaFiles.length - 1 && (
              <button
                type="button"
                onClick={nextPhoto}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition backdrop-blur z-20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom Info */}
          <div className="text-center text-xs text-slate-400 py-2 flex items-center justify-center gap-4">
            <span>{currentMedia.filename}</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-500">
              Use arrow keys or Esc to navigate
            </span>
          </div>
        </div>
      )}

      {/* Studio Branding Footer */}
      <footer className="mt-12 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">
          Captured with love by Addis Photography Studio
        </p>
        <p className="text-[11px]">
          Tsinat Building, Jimma • Tel: +251 973 679 744
        </p>
      </footer>
    </div>
  );
}
