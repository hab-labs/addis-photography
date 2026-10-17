import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { auditService } from "@/server/services/audit.service";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("user_id") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const logs = await auditService.getLogs({
      user_id: userId,
      action,
      limit,
      offset,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return handleAuthError(error);
  }
}
