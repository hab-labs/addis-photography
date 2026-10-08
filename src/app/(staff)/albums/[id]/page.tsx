"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
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
  AlertCircle,
  HardDrive,
  Trash2,
  RefreshCw,
  Play,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { studioStore } from "@/lib/api/store";
import {
  ChunkUploader,
  UploadItem,
  isFileSupported,
  SUPPORTED_EXTENSIONS,
} from "@/lib/uploader/chunkUploader";
import { generateQrPng, generateQrSvg, downloadFile, printBrandedFlyer } from "@/lib/qr";
import { MediaFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AlbumDetailsPage() {
  const params = useParams();
  const albumId = (params?.id as string) || "";
  const { t } = useI18n();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeUploads, setActiveUploads] = useState<UploadItem[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrPngUrl, setQrPngUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploaderRef = useRef<ChunkUploader | null>(null);

  const album = useMemo(() => {
    return studioStore.getAlbumById(albumId);
  }, [albumId, refreshTrigger]);

  const mediaFiles = useMemo(() => {
    return studioStore.getMediaFiles(albumId);
  }, [albumId, refreshTrigger]);

  // Initialize Chunked Uploader instance
  useEffect(() => {
    const uploader = new ChunkUploader((items) => {
      setActiveUploads([...items]);
      // If any item completed, update media in store
      items.forEach((item) => {
        if (item.status === "completed" && !mediaFiles.some((m) => m.filename === item.filename)) {
          const isVideo = item.filename.endsWith(".mp4") || item.filename.endsWith(".mov");
          const newMedia: MediaFile = {
            id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            album_id: albumId,
            filename: item.filename,
            file_size: item.totalSize,
            mime_type: isVideo ? "video/mp4" : "image/jpeg",
            url: URL.createObjectURL(item.file),
            thumbnail_url: isVideo
              ? "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=400&q=80"
              : URL.createObjectURL(item.file),
            upload_status: "completed",
            created_at: new Date().toISOString(),
          };
          studioStore.addMediaFile(albumId, newMedia);
          setRefreshTrigger((c) => c + 1);
        }
      });
    });

    uploaderRef.current = uploader;
  }, [albumId, mediaFiles]);

  // Generate QR Code data URL when album is loaded
  useEffect(() => {
    if (album) {
      const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/a/${album.token}`;
      generateQrPng(publicUrl).then(setQrPngUrl);
    }
  }, [album]);

  if (!album) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Album Not Found</h2>
        <Link href="/albums">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Albums
          </Button>
        </Link>
      </div>
    );
  }

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/a/${album.token}`;
  const usedMB = (album.used_bytes / (1024 * 1024)).toFixed(1);
  const percentUsed = Math.min(
    100,
    Math.round((album.used_bytes / album.quota_bytes) * 100)
  );

  // File handling
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
      uploaderRef.current.addFiles(fileArray, album.id);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFilesChosen(e.dataTransfer.files);
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadQrPng = () => {
    if (qrPngUrl) {
      downloadFile(qrPngUrl, `${album.token}-qr.png`);
    }
  };

  const downloadQrSvg = async () => {
    const svgString = await generateQrSvg(publicUrl);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `${album.token}-qr.svg`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/albums"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-amber-600 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Albums</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {album.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client: <strong>{album.customer_name}</strong> • Token:{" "}
            <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              /a/{album.token}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* QR Code Export Dialog Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQrDialogOpen(true)}
            className="border-slate-300"
          >
            <QrCode className="h-4 w-4 mr-1.5 text-amber-600" />
            Client QR & Share
          </Button>

          {/* Direct Public Gallery Link */}
          <Link href={`/a/${album.token}`} target="_blank">
            <Button variant="gold" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Open Gallery
            </Button>
          </Link>
        </div>
      </div>

      {/* Quota Visualizer Card */}
      <Card className="border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Album Storage Quota Visualizer
              </h3>
              <p className="text-xs text-slate-500">
                {usedMB} MB used of 1,024 MB (1 GB) limit
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-700">
              {percentUsed}% capacity
            </span>
          </div>
        </div>

        <Progress
          value={percentUsed}
          className="h-3"
          indicatorColor={percentUsed > 90 ? "bg-rose-500" : "bg-amber-600"}
        />
      </Card>

      {/* Upload Dropzone */}
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-amber-500 bg-amber-50/50"
            : "border-slate-300 hover:border-amber-400 bg-slate-50/40"
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

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-3">
          <UploadCloud className="h-8 w-8" />
        </div>

        <h3 className="text-sm font-bold text-slate-900">
          {t.albums.upload_dropzone_title}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          {t.albums.upload_dropzone_subtitle}
        </p>
        <p className="text-[11px] text-amber-700 font-semibold mt-2">
          ⚡ 3 Parallel Workers • Automatic 5MB Chunking • Auto-Resume on Network Drop
        </p>
      </Card>

      {/* Active Chunked Uploads Progress */}
      {activeUploads.length > 0 && (
        <Card className="border border-slate-200 p-4 space-y-3 bg-white shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Live Upload Queue ({activeUploads.length})</span>
            <span className="text-[10px] text-amber-600 lowercase font-mono">
              3 parallel streams
            </span>
          </h4>

          <div className="space-y-2.5">
            {activeUploads.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 truncate max-w-sm">
                    {item.filename}
                  </span>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-[11px] text-slate-500">
                      {(item.uploadedBytes / (1024 * 1024)).toFixed(1)} /{" "}
                      {(item.totalSize / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <Badge
                      variant={
                        item.status === "completed"
                          ? "paid"
                          : item.status === "error"
                          ? "destructive"
                          : "in_progress"
                      }
                      className="text-[10px]"
                    >
                      {item.status} ({item.progressPercent}%)
                    </Badge>
                  </div>
                </div>

                <Progress value={item.progressPercent} className="h-1.5" />

                {item.status === "uploading" && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      Chunks: {item.chunksUploaded} / {item.chunksTotal} (5MB slices)
                    </span>
                    <span>
                      Speed: {((item.speedBytesPerSec || 0) / (1024 * 1024)).toFixed(1)} MB/s
                    </span>
                  </div>
                )}

                {item.errorMessage && (
                  <div className="text-[11px] text-rose-600 font-semibold">
                    {item.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Uploaded Media Files Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Album Photos & Videos ({mediaFiles.length})
        </h3>

        {mediaFiles.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No media files uploaded yet. Drag files into the box above to begin chunked upload.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mediaFiles.map((media) => {
              const isVideo = media.mime_type.startsWith("video");
              const sizeMB = (media.file_size / (1024 * 1024)).toFixed(1);

              return (
                <div
                  key={media.id}
                  className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  <div className="relative aspect-square bg-slate-900 overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.thumbnail_url || media.url}
                      alt={media.filename}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {isVideo && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-lg">
                          <Play className="h-5 w-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="bg-black/60 text-white border-0 text-[10px]">
                        {isVideo ? "VIDEO" : "PHOTO"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-slate-900 truncate" title={media.filename}>
                      {media.filename}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">{sizeMB} MB</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Code & Share Export Modal */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <QrCode className="h-5 w-5 text-amber-600" />
              <span>{t.albums.qr_title}</span>
            </DialogTitle>
            <DialogDescription>
              Share digital album access directly with {album.customer_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-4 space-y-4">
            {/* QR Image Preview */}
            {qrPngUrl && (
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrPngUrl}
                  alt="Album QR Code"
                  className="w-48 h-48 mx-auto object-contain"
                />
                <span className="text-[11px] text-slate-500 font-mono mt-2 block">
                  Scan to open album
                </span>
              </div>
            )}

            {/* Direct Link Copy */}
            <div className="w-full flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-md font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyPublicLink}
                className="shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Export Buttons */}
            <div className="w-full grid grid-cols-3 gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={downloadQrPng} className="text-xs">
                <Download className="h-3.5 w-3.5 mr-1" />
                PNG
              </Button>

              <Button variant="outline" size="sm" onClick={downloadQrSvg} className="text-xs">
                <Download className="h-3.5 w-3.5 mr-1" />
                SVG
              </Button>

              <Button
                variant="gold"
                size="sm"
                onClick={() => printBrandedFlyer(album)}
                className="text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print Flyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
