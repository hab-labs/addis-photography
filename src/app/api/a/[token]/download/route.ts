import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getAlbumByToken } from "@/server/services/album.service";
import { listMediaForAlbum } from "@/server/services/media.service";
import {
  isAlbumSessionUnlocked,
  UNLOCK_SESSION_COOKIE_PREFIX,
} from "@/server/services/public-viewer.service";
import { createZipArchive, ZipFileEntry } from "@/server/utils/zip";

const MEDIA_STORAGE_DIR =
  process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), "data/media");

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // 1. Fetch album
  const album = await getAlbumByToken(token);
  if (!album) {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  // 2. Check if expired or disabled (FR-34)
  if (
    album.status === "Expired" ||
    album.status === "Deleted" ||
    new Date(album.expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "This album has expired or is no longer available." },
      { status: 410 }
    );
  }

  // 3. Check PIN authorization if private (FR-32)
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
      return NextResponse.json(
        { error: "PIN unlock required to download this private album." },
        { status: 403 }
      );
    }
  }

  // 4. Verify download and zip permissions (FR-33)
  if (!album.allow_download) {
    return NextResponse.json(
      { error: "Downloads are disabled for this album by Addis Photography Studio." },
      { status: 403 }
    );
  }

  if (album.allow_zip === false) {
    return NextResponse.json(
      { error: "ZIP download is disabled for this album. Please download individual photos." },
      { status: 403 }
    );
  }

  // 5. Gather media files
  const mediaRecords = await listMediaForAlbum(album.id);

  if (mediaRecords.length === 0) {
    return NextResponse.json(
      { error: "No media files found in this album to download." },
      { status: 404 }
    );
  }

  // 6. Build ZIP entries
  const zipEntries: ZipFileEntry[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < mediaRecords.length; i++) {
    const media = mediaRecords[i];
    const ext =
      path.extname(media.original_name) ||
      (media.type === "video" ? ".mp4" : ".jpg");

    // Resolve physical storage location
    let fileBuffer: Buffer | null = null;
    const directPath = path.join(MEDIA_STORAGE_DIR, album.id, `${media.id}${ext}`);

    if (fs.existsSync(directPath)) {
      fileBuffer = fs.readFileSync(directPath);
    } else {
      // Check if folder contains media.id with any extension
      const albumDir = path.join(MEDIA_STORAGE_DIR, album.id);
      if (fs.existsSync(albumDir)) {
        const matches = fs.readdirSync(albumDir).filter((f) => f.startsWith(media.id));
        if (matches.length > 0) {
          fileBuffer = fs.readFileSync(path.join(albumDir, matches[0]));
        }
      }
    }

    if (!fileBuffer) {
      continue;
    }

    // Deduplicate / sanitize file name inside ZIP
    let rawName = path.basename(media.original_name || `photo_${i + 1}${ext}`);
    // Strip forbidden characters
    rawName = rawName.replace(/[\\/:*?"<>|]/g, "_");

    let finalName = rawName;
    let counter = 1;
    while (usedNames.has(finalName)) {
      const nameWithoutExt = path.basename(rawName, path.extname(rawName));
      finalName = `${nameWithoutExt}_${counter}${path.extname(rawName)}`;
      counter++;
    }
    usedNames.add(finalName);

    zipEntries.push({
      name: finalName,
      content: fileBuffer,
      date: new Date(media.created_at || Date.now()),
    });
  }

  if (zipEntries.length === 0) {
    return NextResponse.json(
      { error: "No media files could be prepared for download." },
      { status: 404 }
    );
  }

  const zipBuffer = createZipArchive(zipEntries);

  // Clean ASCII-safe title for header + UTF-8 filename* parameter
  const rawTitle = album.title || "Addis_Photography_Album";
  const safeAsciiTitle = rawTitle.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const encodedTitle = encodeURIComponent(`${rawTitle}.zip`);

  return new Response(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeAsciiTitle}.zip"; filename*=UTF-8''${encodedTitle}`,
      "Content-Length": String(zipBuffer.length),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
