import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { reportService } from "@/server/services/report.service";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Query parameters 'from' and 'to' (YYYY-MM-DD) are required." },
        { status: 400 }
      );
    }

    const report = await reportService.getRangeReport(from, to);
    return NextResponse.json({ report });
  } catch (error) {
    return handleAuthError(error);
  }
}
