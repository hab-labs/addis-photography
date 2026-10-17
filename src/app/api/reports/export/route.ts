import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { reportService } from "@/server/services/report.service";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "daily";
    const date = searchParams.get("date") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    let csvContent = "";
    let filename = "";

    if (type === "daily") {
      csvContent = await reportService.exportDailyReportCSV(date);
      filename = `addis-daily-report-${date || new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      if (!from || !to) {
        return NextResponse.json(
          { error: "'from' and 'to' parameters are required for range export." },
          { status: 400 }
        );
      }
      csvContent = await reportService.exportRangeReportCSV(from, to);
      filename = `addis-range-report-${from}-to-${to}.csv`;
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
