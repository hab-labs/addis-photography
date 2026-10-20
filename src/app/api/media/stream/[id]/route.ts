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

  // 1. Fetch media and its album
  const res = await db.query(
    `SELECT m.*, a.visibility, a.public_token, a.expires_at
     FROM media m
     JOIN albums a ON m.album_id = a.id
     WHERE m.id = $1`,
    [mediaId]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const media = res.rows[0];

  // 2. Authorization check
  let authorized = false;

  // Check if staff/admin session
  const user = await getAuthUser(request);
  if (user) {
    authorized = true;
  } else {
    // Check if album is expired
    if (new Date(media.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Album has expired." }, { status: 410 });
    }

    // Check if public album
    if (media.visibility === "Public") {
      authorized = true;
    } else {
      // Private album: check unlock token from header or cookie
      const token = media.public_token;
      const cookieHeader = request.headers.get("cookie") || "";
      const cookieMatch = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${UNLOCK_SESSION_COOKIE_PREFIX}${token}=`));
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
  const MEDIA_STORAGE_DIR =
    process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), "data/media");

  let diskPath = media.storage_path;
  if (!diskPath || !fs.existsSync(diskPath)) {
    const ext = path.extname(media.original_name || "") || (media.type === "video" ? ".mp4" : ".jpg");
    const candidatePath = path.join(MEDIA_STORAGE_DIR, media.album_id, `${media.id}${ext}`);
    if (fs.existsSync(candidatePath)) {
      diskPath = candidatePath;
    } else {
      const albumDir = path.join(MEDIA_STORAGE_DIR, media.album_id);
      if (fs.existsSync(albumDir)) {
        const matches = fs.readdirSync(albumDir).filter((f) => f.startsWith(media.id));
        if (matches.length > 0) {
          diskPath = path.join(albumDir, matches[0]);
        }
      }
    }
  }

  if (!diskPath || !fs.existsSync(diskPath)) {
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
