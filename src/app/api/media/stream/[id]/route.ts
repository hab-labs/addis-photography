import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getAuthUser } from "@/server/auth/rbac";
import { isAlbumSessionUnlocked, UNLOCK_SESSION_COOKIE_PREFIX } from "@/server/services/public-viewer.service";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const mediaId = params.id;

  // 1. Fetch media
  const mediaRes = await db.query(
    `SELECT * FROM media WHERE id = $1 LIMIT 1`,
    [mediaId]
  );

  if (mediaRes.rows.length === 0) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const media = mediaRes.rows[0];

  // Fetch associated album
  const albumRes = await db.query(
    `SELECT * FROM albums WHERE id = $1 LIMIT 1`,
    [media.album_id]
  );
  const album = albumRes.rows[0] || {};
  const visibility = album.visibility || "Public";
  const publicToken = album.token || album.public_token || "";
  const expiresAt = album.expires_at || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  // 2. Authorization check
  let authorized = false;

  // Check if staff/admin session
  const user = await getAuthUser(request);
  if (user) {
    authorized = true;
  } else {
    // Check if album is expired
    if (new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Album has expired." }, { status: 410 });
    }

    // Check if public album
    if (visibility === "Public" || visibility === "public") {
      authorized = true;
    } else {
      // Private album: check unlock token from header or cookie
      const cookieHeader = request.headers.get("cookie") || "";
      const cookieMatch = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${UNLOCK_SESSION_COOKIE_PREFIX}${publicToken}=`));
      const unlockCookie = cookieMatch ? cookieMatch.split("=")[1] : undefined;
      const unlockHeader = request.headers.get("x-unlock-token") || undefined;
      const unlockToken = unlockHeader || unlockCookie;

      authorized = await isAlbumSessionUnlocked(media.album_id, unlockToken);
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized access to media." }, { status: 403 });
  }

  // 3. Verify physical file
  const ext = path.extname(media.original_name || "") || (media.type === "video" ? ".mp4" : ".jpg");
  const { findMediaFilePath, getMediaStorageDir } = await import("@/server/storage");
  let diskPath = findMediaFilePath(media.album_id, media.id, ext);

  if (!diskPath || !fs.existsSync(diskPath)) {
    // If physical file is missing (e.g. serverless container rebooted or fresh instance on Vercel),
    // restore it from the stored data_url
    if (media.data_url && typeof media.data_url === "string" && media.data_url.startsWith("data:")) {
      try {
        const commaIdx = media.data_url.indexOf(",");
        if (commaIdx !== -1) {
          const base64Data = media.data_url.substring(commaIdx + 1);
          const buf = Buffer.from(base64Data, "base64");
          const mediaDir = getMediaStorageDir();
          const albumDir = path.join(mediaDir, media.album_id);
          if (!fs.existsSync(albumDir)) {
            fs.mkdirSync(albumDir, { recursive: true });
          }
          const restoredPath = path.join(albumDir, `${media.id}${ext}`);
          try {
            fs.writeFileSync(restoredPath, buf);
            diskPath = restoredPath;
          } catch {}

          return new Response(buf, {
            status: 200,
            headers: {
              "Content-Length": String(buf.length),
              "Content-Type": media.mime_type || "image/jpeg",
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }
      } catch (err) {
        console.error("Error restoring media from data_url:", err);
      }
    }

    return NextResponse.json({ error: "Physical file not found." }, { status: 404 });
  }



  const stat = fs.statSync(diskPath);
  const fileSize = stat.size;
  const mimeType = media.mime_type || "application/octet-stream";

  // 4. Handle HTTP Range header (crucial for video scrubbing and progressive image display)
  const range = request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(diskPath, { start, end });

    const readable = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new Response(readable, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunksize),
        "Content-Type": mimeType,
      },
    });
  }

  // Full file streaming
  const fileStream = fs.createReadStream(diskPath);
  const readable = new ReadableStream({
    start(controller) {
      fileStream.on("data", (chunk) => controller.enqueue(chunk));
      fileStream.on("end", () => controller.close());
      fileStream.on("error", (err) => controller.error(err));
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Length": String(fileSize),
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
