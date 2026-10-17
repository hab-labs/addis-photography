import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { reportService } from "@/server/services/report.service";

export async function GET(request: Request) {
  try {
    // Enforce Admin Only for financial reports (Spec FR-17 / Test Case 17)
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;

    const report = await reportService.getDailyReport(date);
    return NextResponse.json({ report });
  } catch (error) {
    return handleAuthError(error);
  }
}
