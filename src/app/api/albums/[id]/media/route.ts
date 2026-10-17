import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { mediaService } from "@/server/services/media.service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const media = await mediaService.getAlbumMedia(params.id);
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
    const originalFilename = (formData.get("original_filename") as string) || (chunkFile as File).name || "uploaded_file";
    const mimeType = (formData.get("mime_type") as string) || chunkFile.type || "application/octet-stream";

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
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
