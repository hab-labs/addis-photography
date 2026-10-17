import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { migrateExcelBookings, ExcelRowInput } from "@/server/services/migration.service";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const contentType = request.headers.get("content-type") || "";

    let rows: ExcelRowInput[] = [];

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (!body || !Array.isArray(body.rows)) {
        return NextResponse.json(
          { error: "Expected JSON with a 'rows' array of Excel bookings." },
          { status: 400 }
        );
      }
      rows = body.rows;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (file instanceof Blob) {
        const text = await file.text();
        // Parse CSV if text/csv
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        // Header on row 1 or row 7
        let startIdx = 1;
        if (lines.length > 7 && lines[0].toLowerCase().includes("addis")) {
          startIdx = 7; // Excel template header is row 7, data starts row 8
        }

        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          if (cols.length >= 5) {
            rows.push({
              row_number: i + 1,
              date: cols[0],
              booking_no: cols[1],
              customer_name: cols[2],
              phone: cols[3],
              photo_type: cols[4],
              quantity: cols[5] || 1,
              unit_price: cols[6],
              paid: cols[7],
              payment_method: cols[8],
              notes: cols[9],
            });
          }
        }
      }
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No rows found to migrate. Please provide valid rows." },
        { status: 400 }
      );
    }

    const summary = await migrateExcelBookings(rows, {
      id: admin.id,
      name: admin.name,
      role: admin.role,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    return handleAuthError(error);
  }
}
