import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { mediaService } from "@/server/services/media.service";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const user = await requireAuth(request);
    const result = await mediaService.deleteMedia(params.id, params.mediaId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
