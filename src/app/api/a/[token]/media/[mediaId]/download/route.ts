import { NextResponse } from "next/server";
import { getAlbumByToken } from "@/server/services/album.service";
import { isAlbumSessionUnlocked, UNLOCK_SESSION_COOKIE_PREFIX } from "@/server/services/public-viewer.service";
import { db } from "@/server/db/client";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: { token: string; mediaId: string } }
) {
  const { token, mediaId } = params;

  const album = await getAlbumByToken(token);
  if (!album) {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  if (new Date(album.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Album has expired." }, { status: 410 });
  }

  // Check PIN if private
  if (album.visibility === "Private") {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookieMatch = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${UNLOCK_SESSION_COOKIE_PREFIX}${token}=`));
    const unlockCookie = cookieMatch ? cookieMatch.split("=")[1] : undefined;
    const unlockHeader = request.headers.get("x-unlock-token") || undefined;
    const unlockToken = unlockHeader || unlockCookie;

    const unlocked = await isAlbumSessionUnlocked(album.id, unlockToken);
    if (!unlocked) {
      return NextResponse.json({ error: "PIN unlock required." }, { status: 403 });
    }
  }

  // Check download permission
  if (!album.allow_download) {
    return NextResponse.json(
      { error: "Downloads are disabled for this album by Addis Photography Studio." },
      { status: 403 }
    );
  }

  // Fetch media record
  const mediaRes = await db.query(
    `SELECT * FROM media WHERE id = $1 AND album_id = $2`,
    [mediaId, album.id]
  );

  if (mediaRes.rows.length === 0) {
    return NextResponse.json({ error: "Media file not found." }, { status: 404 });
  }

  const media = mediaRes.rows[0];

  const MEDIA_STORAGE_DIR =
    process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), "data/media");

  let diskPath = media.storage_path;
  if (!diskPath || !fs.existsSync(diskPath)) {
    const ext = path.extname(media.original_name || "") || (media.type === "video" ? ".mp4" : ".jpg");
    const candidatePath = path.join(MEDIA_STORAGE_DIR, album.id, `${media.id}${ext}`);
    if (fs.existsSync(candidatePath)) {
      diskPath = candidatePath;
    } else {
      const albumDir = path.join(MEDIA_STORAGE_DIR, album.id);
      if (fs.existsSync(albumDir)) {
        const matches = fs.readdirSync(albumDir).filter((f) => f.startsWith(media.id));
        if (matches.length > 0) {
          diskPath = path.join(albumDir, matches[0]);
        }
      }
    }
  }

  if (!diskPath || !fs.existsSync(diskPath)) {
    return NextResponse.json({ error: "Media file not found on disk." }, { status: 404 });
  }

  const fileStream = fs.createReadStream(diskPath);
  const stat = fs.statSync(diskPath);
  const fileName = media.original_name || media.original_filename || `${media.id}.jpg`;
  const safeAscii = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");

  // Return file stream response with download headers
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
      "Content-Type": media.mime_type || "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
