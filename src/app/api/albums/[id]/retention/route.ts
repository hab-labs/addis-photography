import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { albumService } from "@/server/services/album.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    const days = typeof body?.days === "number" ? body.days : 30;

    const album = await albumService.extendRetention(params.id, days, user.id);
    return NextResponse.json({ album });
  } catch (error) {
    return handleAuthError(error);
  }
}
