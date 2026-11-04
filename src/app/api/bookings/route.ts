import { NextResponse } from "next/server";
import { bookingService } from "@/server/services/booking.service";
import { getAuthUser } from "@/server/auth/rbac";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");

    // If client asks for their specific reference number
    if (ref) {
      const booking = await bookingService.getBookingById(ref);
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      return NextResponse.json({ booking });
    }

    const status = searchParams.get("status") || undefined;
    const date = searchParams.get("date") || undefined;
    const search = searchParams.get("search") || undefined;

    const bookings = await bookingService.listBookings({
      status,
      date,
      search,
    });

    return NextResponse.json({ bookings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const customerName = typeof body?.customer_name === "string" ? body.customer_name.trim() : "";
    const customerPhone = typeof body?.customer_phone === "string" ? body.customer_phone.trim() : "";
    const serviceType = typeof body?.service_type === "string" ? body.service_type.trim() : "";
    const preferredDate = typeof body?.preferred_date === "string" ? body.preferred_date.trim() : "";

    if (!customerName) {
      return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
    }
    if (!customerPhone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!serviceType) {
      return NextResponse.json({ error: "Service / photo shoot type is required." }, { status: 400 });
    }
    if (!preferredDate) {
      return NextResponse.json({ error: "Preferred shoot date is required." }, { status: 400 });
    }

    // Determine source
    const user = await getAuthUser(request);
    const source = user ? "walk_in" : (body?.source || "online");

    const created = await bookingService.createBooking({
      customer_name: customerName,
      customer_phone: customerPhone,
      service_type: serviceType,
      photo_type_id: body?.photo_type_id,
      preferred_date: preferredDate,
      preferred_time_slot: body?.preferred_time_slot,
      location_preference: body?.location_preference,
      notes: body?.notes,
      status: body?.status || "pending",
      estimated_price: body?.estimated_price,
      source,
      assigned_photographer: body?.assigned_photographer,
    });

    return NextResponse.json({ booking: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to submit booking" },
      { status: 500 }
    );
  }
}
