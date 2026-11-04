import { NextResponse } from "next/server";
import { bookingService } from "@/server/services/booking.service";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await bookingService.getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const body = await request.json().catch(() => null);

    const updated = await bookingService.updateBooking(params.id, body || {});
    if (!updated) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ booking: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    await bookingService.deleteBooking(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
