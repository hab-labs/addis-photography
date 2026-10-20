import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let resolvedMediaDir: string | null = null;
let resolvedTempDir: string | null = null;

function testWritable(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const testFile = path.join(dirPath, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a guaranteed writable directory for media files.
 * Prefers process.env.MEDIA_STORAGE_PATH, then <cwd>/data/media,
 * and falls back to os.tmpdir()/addis_media on read-only environments (e.g. Vercel / AWS Lambda).
 */
export function getMediaStorageDir(): string {
  if (resolvedMediaDir) return resolvedMediaDir;

  if (process.env.MEDIA_STORAGE_PATH && testWritable(process.env.MEDIA_STORAGE_PATH)) {
    resolvedMediaDir = process.env.MEDIA_STORAGE_PATH;
    return resolvedMediaDir;
  }

  const localDir = path.join(process.cwd(), "data/media");
  if (testWritable(localDir)) {
    resolvedMediaDir = localDir;
    return resolvedMediaDir;
  }

  // Fallback for serverless / read-only filesystem (Vercel, AWS Lambda, Docker)
  const tmpDir = path.join(os.tmpdir(), "addis_media");
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  } catch {}
  resolvedMediaDir = tmpDir;
  return resolvedMediaDir;
}

/**
 * Returns a guaranteed writable directory for temporary upload chunks.
 */
export function getTempUploadsDir(): string {
  if (resolvedTempDir) return resolvedTempDir;

  if (process.env.TEMP_UPLOADS_PATH && testWritable(process.env.TEMP_UPLOADS_PATH)) {
    resolvedTempDir = process.env.TEMP_UPLOADS_PATH;
    return resolvedTempDir;
  }

  const localDir = path.join(process.cwd(), "data/uploads/temp");
  if (testWritable(localDir)) {
    resolvedTempDir = localDir;
    return resolvedTempDir;
  }

  const tmpDir = path.join(os.tmpdir(), "addis_uploads_temp");
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  } catch {}
  resolvedTempDir = tmpDir;
  return resolvedTempDir;
}

export function ensureStorageDirs(): void {
  const mediaDir = getMediaStorageDir();
  const tempDir = getTempUploadsDir();
  try {
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
  } catch {}
  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  } catch {}
}

/**
 * Resolves a physical media file path across active storage and potential fallback locations.
 */
export function findMediaFilePath(albumId: string, mediaId: string, ext?: string): string | null {
  const candidateDirs = [
    getMediaStorageDir(),
    path.join(process.cwd(), "data/media"),
    path.join(os.tmpdir(), "addis_media"),
  ];

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;

    if (ext) {
      const p = path.join(dir, albumId, `${mediaId}${ext}`);
      if (fs.existsSync(p)) return p;
    }

    const albumDir = path.join(dir, albumId);
    if (fs.existsSync(albumDir)) {
      try {
        const matches = fs.readdirSync(albumDir).filter((f) => f.startsWith(mediaId));
        if (matches.length > 0) {
          return path.join(albumDir, matches[0]);
        }
      } catch {}
    }
  }

  return null;
}
