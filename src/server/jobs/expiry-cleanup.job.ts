import { db } from "../db/client";
import { auditService } from "../services/audit.service";
import fs from "fs";
import path from "path";

export interface CleanupResult {
  expired_count: number;
  purged_albums: number;
  purged_media_files: number;
  reclaimed_bytes: number;
  stale_chunks_cleaned: number;
}

export async function runRetentionCleanupJob(actorId = "system-cron"): Promise<CleanupResult> {
  const result: CleanupResult = {
    expired_count: 0,
    purged_albums: 0,
    purged_media_files: 0,
    reclaimed_bytes: 0,
    stale_chunks_cleaned: 0,
  };

  const now = new Date();
  const gracePeriodEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Identify albums past the 7-day grace period
  const eligibleAlbums = await db.query(
    `SELECT id, title, public_token, expires_at
     FROM albums
     WHERE expires_at < $1`,
    [gracePeriodEnd]
  );

  result.expired_count = eligibleAlbums.rows.length;

  for (const album of eligibleAlbums.rows) {
    // Fetch all media files for this album
    const mediaRes = await db.query(
      `SELECT id, size_bytes FROM media WHERE album_id = $1`,
      [album.id]
    );

    let albumReclaimedBytes = 0;
    for (const file of mediaRes.rows) {
      albumReclaimedBytes += Number(file.size_bytes) || 0;
      result.purged_media_files++;
    }

    const MEDIA_STORAGE_DIR = process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), "data/media");
    const albumDir = path.join(MEDIA_STORAGE_DIR, album.id);
    if (fs.existsSync(albumDir)) {
      try {
        fs.rmSync(albumDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to delete album directory ${albumDir}:`, err);
      }
    }

    // Delete media records from DB
    await db.query(`DELETE FROM media WHERE album_id = $1`, [album.id]);

    // Delete unlock sessions
    await db.query(`DELETE FROM album_unlock_sessions WHERE album_id = $1`, [album.id]);

    // Delete album record or mark purged
    await db.query(`DELETE FROM albums WHERE id = $1`, [album.id]);

    result.purged_albums++;
    result.reclaimed_bytes += albumReclaimedBytes;

    await auditService.log({
      user_id: actorId,
      user_name: "Automated Retention Cleanup",
      action: "ALBUM_PURGED",
      entity_type: "album",
      entity_id: album.id,
      details: {
        title: album.title,
        token: album.public_token,
        reclaimed_bytes: albumReclaimedBytes,
      },
    });
  }

  // 2. Clean temporary upload chunks older than 24 hours
  const chunkBaseDir = process.env.CHUNK_UPLOAD_DIR || path.join(process.cwd(), "data", "chunks");
  if (fs.existsSync(chunkBaseDir)) {
    try {
      const dirs = fs.readdirSync(chunkBaseDir);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const d of dirs) {
        const fullDir = path.join(chunkBaseDir, d);
        const stat = fs.statSync(fullDir);
        if (stat.isDirectory() && stat.mtimeMs < oneDayAgo) {
          fs.rmSync(fullDir, { recursive: true, force: true });
          result.stale_chunks_cleaned++;
        }
      }
    } catch (err) {
      console.error("Error cleaning stale chunk directories:", err);
    }
  }

  return result;
}
