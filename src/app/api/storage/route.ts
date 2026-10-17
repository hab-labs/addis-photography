import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { storageService } from "@/server/services/storage.service";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const overview = await storageService.getStorageOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return handleAuthError(error);
  }
}
