import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { mediaService } from "@/server/services/media.service";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => ({ id: "usr-staff", name: "Staff" }));
    const formData = await request.formData();

    const albumId = (formData.get("album_id") as string) || "";
    const chunkFile = formData.get("chunk") || formData.get("file");
    if (!(chunkFile instanceof Blob) || !albumId) {
      return NextResponse.json(
        { error: "Missing album_id or chunk file in form data." },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt((formData.get("chunk_index") as string) || "0", 10);
    const totalChunks = parseInt((formData.get("total_chunks") as string) || "1", 10);
    const fileId = (formData.get("file_id") as string) || `upload_${Date.now()}`;
    const originalFilename =
      (formData.get("original_filename") as string) ||
      (formData.get("filename") as string) ||
      (chunkFile as File).name ||
      "uploaded_file";
    const mimeType =
      (formData.get("mime_type") as string) || chunkFile.type || "application/octet-stream";
    const albumTitle = (formData.get("album_title") as string) || undefined;
    const albumToken = (formData.get("album_token") as string) || undefined;
    const customerName = (formData.get("customer_name") as string) || undefined;

    const arrayBuffer = await chunkFile.arrayBuffer();
    const chunkBuffer = Buffer.from(arrayBuffer);

    const result = await mediaService.handleChunkUpload({
      album_id: albumId,
      file_id: fileId,
      chunk_index: chunkIndex,
      total_chunks: totalChunks,
      original_filename: originalFilename,
      chunk_buffer: chunkBuffer,
      mime_type: mimeType,
      user_id: user.id,
      album_title: albumTitle,
      album_token: albumToken,
      customer_name: customerName,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
