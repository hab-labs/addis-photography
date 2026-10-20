import { db } from "../db/client";
import { getAlbumByToken, AlbumRecord } from "./album.service";
import { listMediaForAlbum, MediaRecord } from "./media.service";
import { hashPin, generateRandomToken } from "../auth/crypto";
import { rateLimiter } from "../auth/rate-limiter";

export const UNLOCK_SESSION_COOKIE_PREFIX = "addis_album_unlock_";
const UNLOCK_TTL_HOURS = 24;

export interface PublicAlbumPayload {
  status: "active" | "locked" | "expired" | "not_found";
  album?: {
    id: string;
    title: string;
    token?: string;
    customer_name: string;
    event_date: string;
    visibility: "Public" | "Private";
    allow_download: boolean;
    allow_zip: boolean;
    cover_url: string | null;
    cover_image_url?: string | null;
    expires_at: string;
    media_count: number;
    status?: string;
  };
  media?: any[];
  requiresPin?: boolean;
  message?: string;
}

export async function getPublicAlbumView(
  token: string,
  unlockToken?: string,
  ipAddress?: string
): Promise<PublicAlbumPayload> {
  const album = await getAlbumByToken(token);
  if (!album) {
    return { status: "not_found", message: "Album not found or link is invalid." };
  }

  // Check expiration or disabled (Spec 3.10 & FR-34)
  if (
    album.status === "Expired" ||
    album.status === "Deleted" ||
    new Date(album.expires_at).getTime() < Date.now()
  ) {
    return {
      status: "expired",
      message: "This gallery has expired or is no longer available. Please contact Addis Photography Studio for assistance.",
      album: {
        id: album.id,
        title: album.title,
        token: album.token,
        customer_name: album.customer_name,
        event_date: album.event_date,
        visibility: album.visibility,
        allow_download: false,
        allow_zip: false,
        cover_url: album.cover_url,
        cover_image_url: album.cover_url,
        expires_at: album.expires_at,
        media_count: album.file_count,
        status: "Expired",
      },
    };
  }

  const formatMediaList = (mediaList: MediaRecord[]) =>
    mediaList.map((m) => ({
      id: m.id,
      album_id: m.album_id,
      filename: m.original_name,
      file_size: Number(m.size_bytes),
      mime_type: m.mime_type,
      url: m.path_web,
      thumbnail_url: m.path_thumb || m.path_web,
      width: m.width,
      height: m.height,
      duration_seconds: m.duration_seconds,
      upload_status: m.status === "ready" ? ("completed" as const) : ("pending" as const),
      created_at: m.created_at,
    }));

  // If Public, return full media
  if (album.visibility === "Public") {
    const rawMedia = await listMediaForAlbum(album.id);
    const media = formatMediaList(rawMedia);
    return {
      status: "active",
      album: {
        id: album.id,
        title: album.title,
        token: album.token,
        customer_name: album.customer_name,
        event_date: album.event_date,
        visibility: album.visibility,
        allow_download: album.allow_download,
        allow_zip: album.allow_zip,
        cover_url: album.cover_url,
        cover_image_url: album.cover_url,
        expires_at: album.expires_at,
        media_count: media.length,
        status: album.status,
      },
      media: media as any,
      requiresPin: false,
    };
  }

  // Private Album: Check if unlocked via valid 24-hr session
  const isUnlocked = await isAlbumSessionUnlocked(album.id, unlockToken);
  if (isUnlocked) {
    const rawMedia = await listMediaForAlbum(album.id);
    const media = formatMediaList(rawMedia);
    return {
      status: "active",
      album: {
        id: album.id,
        title: album.title,
        token: album.token,
        customer_name: album.customer_name,
        event_date: album.event_date,
        visibility: album.visibility,
        allow_download: album.allow_download,
        allow_zip: album.allow_zip,
        cover_url: album.cover_url,
        cover_image_url: album.cover_url,
        expires_at: album.expires_at,
        media_count: media.length,
        status: album.status,
      },
      media: media as any,
      requiresPin: false,
    };
  }

  // Private Album locked: Do NOT send media list
  return {
    status: "locked",
    album: {
      id: album.id,
      title: album.title,
      token: album.token,
      customer_name: album.customer_name,
      event_date: album.event_date,
      visibility: "Private",
      allow_download: false,
      allow_zip: false,
      cover_url: album.cover_url,
      cover_image_url: album.cover_url,
      expires_at: album.expires_at,
      media_count: album.file_count,
      status: album.status,
    },
    requiresPin: true,
  };
}

export async function unlockPrivateAlbum(
  token: string,
  pin: string,
  ipAddress: string
): Promise<{ success: boolean; unlockToken?: string; error?: string; retryAfterSeconds?: number }> {
  const rateLimitKey = `pin:${ipAddress}:${token}`;
  const lockStatus = rateLimiter.isLocked(rateLimitKey);
  if (lockStatus.locked) {
    return {
      success: false,
      error: `Too many incorrect PIN attempts. Rate limit active. Please wait ${lockStatus.retryAfterSeconds} seconds.`,
      retryAfterSeconds: lockStatus.retryAfterSeconds,
    };
  }

  const album = await getAlbumByToken(token);
  if (!album) {
    return { success: false, error: "Album not found." };
  }

  // Verify PIN
  const incomingHash = hashPin(pin);
  const albumRes = await db.query(`SELECT pin_hash FROM albums WHERE id = $1`, [album.id]);
  const storedHash = albumRes.rows[0]?.pin_hash;

  if (!storedHash || incomingHash !== storedHash) {
    const attempt = rateLimiter.recordFailure(rateLimitKey, 5, 900); // 5 attempts, 15 min (900s)
    if (attempt.locked) {
      return {
        success: false,
        error: "Too many incorrect PIN attempts. Security lockout active for 15 minutes.",
        retryAfterSeconds: attempt.retryAfterSeconds,
      };
    }
    return {
      success: false,
      error: `Incorrect PIN. ${attempt.remainingAttempts} attempts remaining.`,
    };
  }

  // PIN correct: Clear rate limit & create 24-hr unlock session
  rateLimiter.recordSuccess(rateLimitKey);

  const unlockToken = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + UNLOCK_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await db.query(
    `INSERT INTO album_unlock_sessions (id, album_id, token, expires_at, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [`unlock-${Date.now()}`, album.id, unlockToken, expiresAt, ipAddress]
  );

  return { success: true, unlockToken };
}

export async function isAlbumSessionUnlocked(
  albumId: string,
  unlockToken?: string
): Promise<boolean> {
  if (!unlockToken) return false;

  const res = await db.query(
    `SELECT expires_at FROM album_unlock_sessions WHERE album_id = $1 AND token = $2`,
    [albumId, unlockToken]
  );

  if (res.rows.length === 0) return false;

  const expTime = new Date(res.rows[0].expires_at).getTime();
  if (expTime < Date.now()) {
    await db.query(`DELETE FROM album_unlock_sessions WHERE token = $1`, [unlockToken]);
    return false;
  }

  return true;
}
