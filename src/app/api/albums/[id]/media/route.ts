import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { mediaService } from "@/server/services/media.service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const rawMedia = await mediaService.getAlbumMedia(params.id);
    const media = rawMedia.map((m) => ({
      id: m.id,
      album_id: m.album_id,
      original_name: m.original_name,
      filename: m.original_name,
      original_filename: m.original_name,
      size_bytes: Number(m.size_bytes),
      file_size: Number(m.size_bytes),
      file_size_bytes: Number(m.size_bytes),
      mime_type: m.mime_type,
      path_web: m.path_web,
      url: m.path_web,
      path_thumb: m.path_thumb,
      thumbnail_url: m.path_thumb || m.path_web,
      data_url: (m as any).data_url || undefined,
      type: m.type,
      status: m.status,
      upload_status: "completed" as const,
      created_at: m.created_at,
    }));

    return NextResponse.json({ media });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const formData = await request.formData();

    const chunkFile = formData.get("chunk") || formData.get("file");
    if (!(chunkFile instanceof Blob)) {
      return NextResponse.json({ error: "Missing chunk file in form data." }, { status: 400 });
    }

    const chunkIndex = parseInt(formData.get("chunk_index") as string || "0", 10);
    const totalChunks = parseInt(formData.get("total_chunks") as string || "1", 10);
    const fileId = (formData.get("file_id") as string) || `upload_${Date.now()}`;
    const originalFilename =
      (formData.get("original_filename") as string) ||
      (formData.get("filename") as string) ||
      (chunkFile as File).name ||
      "uploaded_file";
    const mimeType = (formData.get("mime_type") as string) || chunkFile.type || "application/octet-stream";
    const albumTitle = (formData.get("album_title") as string) || undefined;
    const albumToken = (formData.get("album_token") as string) || undefined;
    const customerName = (formData.get("customer_name") as string) || undefined;

    const arrayBuffer = await chunkFile.arrayBuffer();
    const chunkBuffer = Buffer.from(arrayBuffer);

    const result = await mediaService.handleChunkUpload({
      album_id: params.id,
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
