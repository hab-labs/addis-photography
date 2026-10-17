import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { requestService } from "@/server/services/request.service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const reqItem = await requestService.getRequestById(params.id);
    if (!reqItem) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    return NextResponse.json({ request: reqItem });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    const updated = await requestService.updateRequest(
      params.id,
      {
        title: typeof body?.title === "string" ? body.title.trim() : undefined,
        description: typeof body?.description === "string" ? body.description.trim() : undefined,
        status: body?.status,
        priority: body?.priority,
        due_date: body?.due_date,
        assigned_to: body?.assigned_to,
        resolution_notes: typeof body?.resolution_notes === "string" ? body.resolution_notes.trim() : undefined,
      },
      user.id
    );

    return NextResponse.json({ request: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const result = await requestService.deleteRequest(params.id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
