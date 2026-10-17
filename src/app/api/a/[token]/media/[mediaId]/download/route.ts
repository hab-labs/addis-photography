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

  if (!fs.existsSync(media.storage_path)) {
    return NextResponse.json({ error: "Media file not found on disk." }, { status: 404 });
  }

  const fileStream = fs.createReadStream(media.storage_path);
  const stat = fs.statSync(media.storage_path);

  // Return file stream response with download headers
  // In Next.js App Router, ReadableStream from fs readstream
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
      "Content-Disposition": `attachment; filename="${encodeURIComponent(media.original_filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
