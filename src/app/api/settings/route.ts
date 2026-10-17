import { NextResponse } from "next/server";
import { requireAuth, requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { settingsService } from "@/server/services/settings.service";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const settings = await settingsService.getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
    }

    const updated = await settingsService.updateSettings(body, user.id);
    return NextResponse.json({ settings: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}
