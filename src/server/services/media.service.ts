import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "../db/client";
import { getAlbumById } from "./album.service";
import { logAudit } from "./audit.service";

export interface MediaRecord {
  id: string;
  album_id: string;
  type: "photo" | "video";
  original_name: string;
  path_web: string;
  path_thumb: string | null;
  size_bytes: number;
  mime_type: string;
  status: "processing" | "ready" | "failed";
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  created_at: string;
}

const MEDIA_STORAGE_DIR = process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), "data/media");
const TEMP_UPLOADS_DIR = path.join(process.cwd(), "data/uploads/temp");

export function ensureStorageDirs(): void {
  if (!fs.existsSync(MEDIA_STORAGE_DIR)) {
    fs.mkdirSync(MEDIA_STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMP_UPLOADS_DIR)) {
    fs.mkdirSync(TEMP_UPLOADS_DIR, { recursive: true });
  }
}

export async function listMediaForAlbum(albumId: string): Promise<MediaRecord[]> {
  const album = await getAlbumById(albumId);
  const targetId = album ? album.id : albumId;
  const res = await db.query<MediaRecord>(
    `SELECT * FROM media WHERE album_id = $1 ORDER BY created_at ASC`,
    [targetId]
  );
  return res.rows;
}

export async function handleChunkUpload(
  uploadId: string,
  chunkIndex: number,
  chunkBuffer: Buffer
): Promise<void> {
  ensureStorageDirs();
  const uploadDir = path.join(TEMP_UPLOADS_DIR, uploadId);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const chunkPath = path.join(uploadDir, `chunk_${chunkIndex}`);
  fs.writeFileSync(chunkPath, chunkBuffer);
}

export async function finalizeChunkedUpload(
  albumId: string,
  uploadId: string,
  totalChunks: number,
  filename: string,
  totalSize: number,
  mimeType: string,
  actor: { id: string; name: string }
): Promise<MediaRecord> {
  ensureStorageDirs();

  const album = await getAlbumById(albumId);
  if (!album) throw new Error("Album not found.");

  // Check Quota
  const maxQuotaBytes = (album.quota_mb || 1024) * 1024 * 1024;
  if (album.used_bytes + totalSize > maxQuotaBytes) {
    throw new Error(
      `Upload rejected: File size (${(totalSize / (1024 * 1024)).toFixed(1)} MB) would exceed the album quota of ${album.quota_mb} MB.`
    );
  }

  // Check file type limits (Spec 3.10: max photo 25MB, max video 500MB)
  const isVideo = mimeType.startsWith("video") || filename.toLowerCase().endsWith(".mp4") || filename.toLowerCase().endsWith(".mov");
  const maxLimit = isVideo ? 500 * 1024 * 1024 : 25 * 1024 * 1024;
  if (totalSize > maxLimit) {
    throw new Error(
      `File exceeds maximum permitted size of ${isVideo ? "500 MB for video" : "25 MB for photo"}.`
    );
  }

  // Merge chunks
  const uploadDir = path.join(TEMP_UPLOADS_DIR, uploadId);
  const albumDir = path.join(MEDIA_STORAGE_DIR, album.id);
  if (!fs.existsSync(albumDir)) {
    fs.mkdirSync(albumDir, { recursive: true });
  }

  const mediaId = `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const ext = path.extname(filename).toLowerCase() || (isVideo ? ".mp4" : ".jpg");
  const destinationPath = path.join(albumDir, `${mediaId}${ext}`);

  fs.writeFileSync(destinationPath, Buffer.alloc(0));
  for (let i = 0; i < totalChunks; i++) {
    const chunkFile = path.join(uploadDir, `chunk_${i}`);
    if (!fs.existsSync(chunkFile)) {
      throw new Error(`Missing upload chunk ${i} of ${totalChunks}. Please retry upload.`);
    }
    const chunkData = fs.readFileSync(chunkFile);
    fs.appendFileSync(destinationPath, chunkData);
  }

  // Clean up temp chunks
  try {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  } catch {}

  const webUrl = `/api/media/stream/${mediaId}`;
  const thumbUrl = isVideo ? null : webUrl;

  await db.query(
    `INSERT INTO media (id, album_id, type, original_name, path_web, path_thumb, size_bytes, mime_type, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready', NOW())`,
    [
      mediaId,
      album.id,
      isVideo ? "video" : "photo",
      filename,
      webUrl,
      thumbUrl,
      totalSize,
      mimeType,
    ]
  );

  // Set album to Active if Draft
  if (album.status === "Draft") {
    await db.query(`UPDATE albums SET status = 'Active', updated_at = NOW() WHERE id = $1`, [
      album.id,
    ]);
  }

  await logAudit(actor, "MEDIA_UPLOADED", "Media", mediaId, {
    album_id: album.id,
    filename,
    size_bytes: totalSize,
  });

  const res = await db.query<MediaRecord>(`SELECT * FROM media WHERE id = $1`, [mediaId]);
  return res.rows[0];
}

export async function deleteMedia(
  mediaId: string,
  actor: { id: string; name: string }
): Promise<void> {
  const res = await db.query<MediaRecord>(`SELECT * FROM media WHERE id = $1`, [mediaId]);
  if (res.rows.length === 0) throw new Error("Media record not found.");
  const media = res.rows[0];

  // Remove physical file from disk
  const albumDir = path.join(MEDIA_STORAGE_DIR, media.album_id);
  const ext = path.extname(media.original_name);
  const filePath = path.join(albumDir, `${mediaId}${ext}`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  } else if (fs.existsSync(albumDir)) {
    try {
      const matches = fs.readdirSync(albumDir).filter((f) => f.startsWith(mediaId));
      for (const m of matches) {
        fs.unlinkSync(path.join(albumDir, m));
      }
    } catch {}
  }

  await db.query(`DELETE FROM media WHERE id = $1`, [mediaId]);

  await logAudit(actor, "MEDIA_DELETED", "Media", mediaId, {
    album_id: media.album_id,
    filename: media.original_name,
  });
}

export function getMediaFilePath(albumId: string, mediaId: string, ext: string): string {
  return path.join(MEDIA_STORAGE_DIR, albumId, `${mediaId}${ext}`);
}

export const mediaService = {
  getAlbumMedia: listMediaForAlbum,
  listMediaForAlbum,
  handleChunkUpload: async (params: {
    album_id: string;
    file_id: string;
    chunk_index: number;
    total_chunks: number;
    original_filename: string;
    chunk_buffer: Buffer;
    mime_type: string;
    user_id: string;
  }) => {
    await handleChunkUpload(params.file_id, params.chunk_index, params.chunk_buffer);

    const uploadDir = path.join(TEMP_UPLOADS_DIR, params.file_id);
    const files = fs.existsSync(uploadDir)
      ? fs.readdirSync(uploadDir).filter((f) => f.startsWith("chunk_"))
      : [];

    if (files.length >= params.total_chunks) {
      let totalSize = 0;
      for (const f of files) {
        totalSize += fs.statSync(path.join(uploadDir, f)).size;
      }

      const media = await finalizeChunkedUpload(
        params.album_id,
        params.file_id,
        params.total_chunks,
        params.original_filename,
        totalSize,
        params.mime_type,
        { id: params.user_id, name: "Staff" }
      );

      return { chunk_received: true, assembled: true, media };
    }

    return { chunk_received: true, assembled: false, chunk_index: params.chunk_index };
  },
  deleteMedia: async (
    albumId: string,
    mediaId: string,
    userIdOrActor?: string | { id: string; name: string }
  ) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Staff" }
        : userIdOrActor || { id: "system", name: "Staff" };
    await deleteMedia(mediaId, actor);
    return { success: true };
  },
};

